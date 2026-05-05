import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyFormbody from '@fastify/formbody';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import ws from 'ws'; // <--- CORRECCIÓN: Importación necesaria para Node < 22

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fastify = Fastify({ logger: true });

// ── Supabase ──────────────────────────────────────────────────────────────────
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Faltan variables de entorno de Supabase');
}

// CORRECCIÓN: Se añade el transport 'ws' para evitar el crash en Node 20
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false
  },
  realtime: {
    transport: ws,
  }
});

// ── Plugins ───────────────────────────────────────────────────────────────────
fastify.register(fastifyFormbody);

// Servir la carpeta /public como raíz estática
fastify.register(fastifyStatic, {
  root: path.join(__dirname, 'public'),
  prefix: '/',
  decorateReply: true,
});

// ── Ruta raíz → inicio.html ───────────────────────────────────────────────────
fastify.get('/', (req, reply) => {
  return reply.sendFile('inicio.html');
});

// ── Rutas de páginas HTML (para URLs sin extensión) ───────────────────────────
const htmlPages = [
  'inicio',
  'nueva-historia',
  'mis-historias',
  'borradores',
  'estadisticas',
  'login',
  'leer'
];

htmlPages.forEach((page) => {
  fastify.get(`/${page}`, (req, reply) => {
    let fileName = `${page}.html`;
    if (page === 'estadisticas') fileName = 'estadísticas.html';
    return reply.sendFile(fileName);
  });
});

// Redirigir studio-peliprex a nueva-historia.html
fastify.get('/studio-peliprex', (req, reply) => reply.sendFile('nueva-historia.html'));

// Alias /estadísticas (con tilde) → estadísticas.html
fastify.get('/estadísticas', (req, reply) => reply.sendFile('estadísticas.html'));

// ── API: Historias publicadas (Público) ───────────────────────────────────────
fastify.get('/api/historias', async (request, reply) => {
  const { categoria, nombre, autora } = request.query;
  let query = supabase
    .from('historias')
    .select('*')
    .eq('estado', 'publicado');

  if (categoria) query = query.ilike('categoria', `%${categoria}%`);
  if (nombre)    query = query.ilike('titulo',    `%${nombre}%`);
  if (autora)    query = query.ilike('autora_nombre', `%${autora}%`);

  const { data, error } = await query.order('fecha_publicacion', { ascending: false });
  return error ? reply.code(500).send({ error: error.message }) : data;
});

// ── Configuración pública (solo URL y Anon Key) ──────────────────────────────
fastify.get('/api/config', async (request, reply) => {
  return {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY
  };
});

// ── Health check ──────────────────────────────────────────────────────────────
fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

// ── Manejo de errores 404 para la API ─────────────────────────────────────────
fastify.setNotFoundHandler((request, reply) => {
  if (request.raw.url.startsWith('/api/') || request.raw.url === '/guardar') {
    reply.code(404).send({
      message: `Route ${request.method}:${request.raw.url} not found`,
      error: "Not Found",
      statusCode: 404
    });
  } else {
    reply.sendFile('inicio.html'); // Redirigir a inicio si no es API
  }
});

// ── Arrancar servidor ─────────────────────────────────────────────────────────
fastify.listen({ port: 8080, host: '0.0.0.0' }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});

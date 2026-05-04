import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyFormbody from '@fastify/formbody';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fastify = Fastify({ logger: true });

// ── Supabase ──────────────────────────────────────────────────────────────────
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Faltan variables de entorno de Supabase');
}

// Usamos Service Role Key para operaciones administrativas si es necesario, 
// pero la mayoría de las operaciones ahora se delegan al cliente con RLS.
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false
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
];

htmlPages.forEach((page) => {
  fastify.get(`/${page}`, (req, reply) => {
    const fileName = page === 'estadisticas' ? 'estadísticas.html' : `${page}.html`;
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

// ── Arrancar servidor ─────────────────────────────────────────────────────────
fastify.listen({ port: 8080, host: '0.0.0.0' }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});

import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyFormbody from '@fastify/formbody';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fastify = Fastify({ logger: true });

// ── Supabase ──────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

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
  'studio-peliprex',
];

htmlPages.forEach((page) => {
  fastify.get(`/${page}`, (req, reply) => {
    // Intentar con y sin tilde (estadísticas / estadisticas)
    const fileName = page === 'estadisticas' ? 'estadísticas.html' : `${page}.html`;
    return reply.sendFile(fileName);
  });
});

// Alias /estadísticas (con tilde) → estadísticas.html
fastify.get('/estadísticas', (req, reply) => reply.sendFile('estadísticas.html'));

// ── API: Historias publicadas ─────────────────────────────────────────────────
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

// API: Borradores
fastify.get('/api/borradores', async (request, reply) => {
  const { data, error } = await supabase
    .from('historias')
    .select('*')
    .eq('estado', 'borrador')
    .order('created_at', { ascending: false });
  return error ? reply.code(500).send({ error: error.message }) : data;
});

// API: Solo publicadas (alias)
fastify.get('/api/historias/publicadas', async (request, reply) => {
  const { data, error } = await supabase
    .from('historias')
    .select('*')
    .eq('estado', 'publicado')
    .order('fecha_publicacion', { ascending: false });
  return error ? reply.code(500).send({ error: error.message }) : data;
});

// API: Una historia por ID
fastify.get('/api/historias/:id', async (request, reply) => {
  const { id } = request.params;
  const { data, error } = await supabase
    .from('historias')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return reply.code(404).send({ error: 'Historia no encontrada' });

  // Incrementar vistas
  await supabase
    .from('historias')
    .update({ vistas: (data.vistas || 0) + 1 })
    .eq('id', id);

  return data;
});

// ── Guardar historia / borrador ───────────────────────────────────────────────
fastify.post('/guardar', async (request, reply) => {
  const body = request.body;
  const password = body.password || body.token;

  if (password !== process.env.ADMIN_PASSWORD) {
    return reply.code(401).send({ error: 'Token de acceso incorrecto' });
  }

  const {
    password: _p, token: _t,
    // Campos del formulario
    autora_nombre, autora_perfil_url, autora_email,
    idioma, titulo, categoria, orden_indice,
    publico, tiempo_lectura, poster_url,
    sinopsis, tags, nota_autora,
    contenido, contenido_html,
    derechos, estado,
  } = body;

  const historia = {
    autora_nombre,
    autora_perfil_url: autora_perfil_url || null,
    autora_email: autora_email || null,
    idioma: idioma || 'es',
    titulo,
    categoria,
    orden_indice: orden_indice || 0,
    publico: publico || 'todos',
    tiempo_lectura: tiempo_lectura || null,
    poster_url,
    sinopsis: sinopsis || null,
    tags: tags || null,
    nota_autora: nota_autora || null,
    contenido_html: contenido_html || contenido || '',
    derechos: derechos || 'todos',
    estado: estado || 'publicado',
  };

  if (historia.estado === 'publicado') {
    historia.fecha_publicacion = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('historias')
    .insert([historia])
    .select();

  if (error) return reply.code(400).send({ error: error.message });

  return { message: '¡Historia guardada con éxito!', data: data[0] };
});

// ── Actualizar historia ───────────────────────────────────────────────────────
fastify.put('/actualizar/:id', async (request, reply) => {
  const { id } = request.params;
  const { password, ...updates } = request.body;

  if (password !== process.env.ADMIN_PASSWORD) {
    return reply.code(401).send({ error: 'Token de acceso incorrecto' });
  }

  if (updates.estado === 'publicado' && !updates.fecha_publicacion) {
    updates.fecha_publicacion = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('historias')
    .update(updates)
    .eq('id', id)
    .select();

  if (error) return reply.code(400).send({ error: error.message });
  return { message: '¡Actualizado con éxito!', data: data[0] };
});

// ── Eliminar historia ─────────────────────────────────────────────────────────
fastify.delete('/eliminar/:id', async (request, reply) => {
  const { id } = request.params;
  const { password } = request.query;

  if (password !== process.env.ADMIN_PASSWORD) {
    return reply.code(401).send({ error: 'Token de acceso incorrecto' });
  }

  const { error } = await supabase.from('historias').delete().eq('id', id);
  if (error) return reply.code(400).send({ error: error.message });
  return { message: '¡Eliminado con éxito!' };
});

// ── Incrementar vistas (app externa) ─────────────────────────────────────────
fastify.post('/api/historias/:id/vista', async (request, reply) => {
  const { id } = request.params;
  const { data: historia } = await supabase
    .from('historias')
    .select('vistas')
    .eq('id', id)
    .single();
  if (!historia) return reply.code(404).send({ error: 'No encontrada' });

  await supabase
    .from('historias')
    .update({ vistas: (historia.vistas || 0) + 1 })
    .eq('id', id);

  return { ok: true };
});

// ── Estadísticas globales ─────────────────────────────────────────────────────
fastify.get('/api/estadisticas', async (request, reply) => {
  const { data, error } = await supabase
    .from('historias')
    .select('id, titulo, vistas, categoria, estado, autora_nombre')
    .eq('estado', 'publicado')
    .order('vistas', { ascending: false });

  if (error) return reply.code(500).send({ error: error.message });

  const totalVistas = data.reduce((sum, h) => sum + (h.vistas || 0), 0);
  const totalHistorias = data.length;

  return { totalHistorias, totalVistas, topHistorias: data.slice(0, 10) };
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

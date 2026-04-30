import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyFormbody from '@fastify/formbody';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fastify = Fastify({ logger: true });

// Configuración de Supabase (Usa tus variables de entorno en Fly.io)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

fastify.register(fastifyFormbody);
fastify.register(fastifyStatic, { root: __dirname });

// 1. ENDPOINT PARA LA APP (JSON)
fastify.get('/api/historias', async (request, reply) => {
  const { categoria, nombre, autora } = request.query;
  let query = supabase.from('historias').select('*');

  if (categoria) query = query.ilike('categoria', `%${categoria}%`);
  if (nombre) query = query.ilike('titulo', `%${nombre}%`);
  if (autora) query = query.ilike('autora', `%${autora}%`);

  const { data, error } = await query.order('fecha_publicacion', { ascending: false });
  return error ? { error: error.message } : data;
});

fastify.get('/api/borradores', async (request, reply) => {
  const { data, error } = await supabase
    .from('historias')
    .select('*')
    .eq('estado', 'borrador')
    .order('created_at', { ascending: false });
  return error ? { error: error.message } : data;
});

fastify.get('/api/historias/publicadas', async (request, reply) => {
  const { data, error } = await supabase
    .from('historias')
    .select('*')
    .eq('estado', 'publicado')
    .order('fecha_publicacion', { ascending: false });
  return error ? { error: error.message } : data;
});

// 2. PANEL DE CONTROL (Frontend)
fastify.get('/panel', (req, reply) => reply.sendFile('index.html'));

// 3. GUARDAR HISTORIA (Desde el panel)
fastify.post('/guardar', async (request, reply) => {
  const { password, ...historia } = request.body;
  
  // Seguridad simple
  if (password !== process.env.ADMIN_PASSWORD) {
    reply.code(401);
    return { error: "Contraseña incorrecta" };
  }

  // Si se publica, añadir fecha
  if (historia.estado === 'publicado') {
    historia.fecha_publicacion = new Date().toISOString();
  }

  const { data, error } = await supabase.from('historias').insert([historia]).select();
  
  if (error) {
    reply.code(400);
    return { error: error.message };
  }
  
  return { message: "¡Historia guardada con éxito!", data: data[0] };
});

// Actualizar historia o borrador
fastify.put('/actualizar/:id', async (request, reply) => {
  const { id } = request.params;
  const { password, ...updates } = request.body;

  if (password !== process.env.ADMIN_PASSWORD) {
    reply.code(401);
    return { error: "Contraseña incorrecta" };
  }

  if (updates.estado === 'publicado' && !updates.fecha_publicacion) {
    updates.fecha_publicacion = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('historias')
    .update(updates)
    .eq('id', id)
    .select();

  if (error) {
    reply.code(400);
    return { error: error.message };
  }

  return { message: "¡Actualizado con éxito!", data: data[0] };
});

// Eliminar historia o borrador
fastify.delete('/eliminar/:id', async (request, reply) => {
  const { id } = request.params;
  const { password } = request.query;

  if (password !== process.env.ADMIN_PASSWORD) {
    reply.code(401);
    return { error: "Contraseña incorrecta" };
  }

  const { error } = await supabase
    .from('historias')
    .delete()
    .eq('id', id);

  if (error) {
    reply.code(400);
    return { error: error.message };
  }

  return { message: "¡Eliminado con éxito!" };
});

fastify.listen({ port: 8080, host: '0.0.0.0' });

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
  const { data, error } = await supabase
    .from('historias')
    .select('*')
    .order('fecha_publicacion', { ascending: false });
  return error ? { error: error.message } : data;
});

// 2. PANEL DE CONTROL (Frontend)
fastify.get('/panel', (req, reply) => reply.sendFile('index.html'));

// 3. GUARDAR HISTORIA (Desde el panel)
fastify.post('/guardar', async (request, reply) => {
  const { password, ...historia } = request.body;
  
  // Seguridad simple para que solo tú/tu esposa suban contenido
  if (password !== process.env.ADMIN_PASSWORD) return "Contraseña incorrecta";

  const { data, error } = await supabase.from('historias').insert([historia]);
  return error ? `Error: ${error.message}` : "¡Historia subida con éxito!";
});

fastify.listen({ port: 8080, host: '0.0.0.0' });

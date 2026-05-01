# Studio PeliPREX — Libros & Historias

Plataforma literaria de **Masitaprex** para publicar y gestionar historias, novelas y cuentos. Desplegada en [Fly.io](https://fly.io) con backend [Fastify](https://fastify.dev/) y base de datos [Supabase](https://supabase.com).

🌐 **URL producción:** https://historias.fly.dev

---

## Estructura del proyecto

```
libros-historias/
├── public/                   ← Todas las páginas HTML (servidas como web)
│   ├── inicio.html           → https://historias.fly.dev/
│   ├── nueva-historia.html   → https://historias.fly.dev/nueva-historia
│   ├── mis-historias.html    → https://historias.fly.dev/mis-historias
│   ├── borradores.html       → https://historias.fly.dev/borradores
│   ├── estadísticas.html     → https://historias.fly.dev/estadisticas
│   └── returnConfig.js
├── server.mjs                ← Servidor Fastify + API REST
├── package.json
├── Dockerfile
└── fly.toml
```

---

## URLs disponibles

| URL | Descripción |
|-----|-------------|
| `https://historias.fly.dev/` | Página de inicio (inicio.html) |
| `https://historias.fly.dev/nueva-historia` | Crear / publicar historia |
| `https://historias.fly.dev/mis-historias` | Ver historias publicadas |
| `https://historias.fly.dev/borradores` | Gestionar borradores |
| `https://historias.fly.dev/estadisticas` | Panel de estadísticas |
| `https://historias.fly.dev/health` | Health check del servidor |

### API REST

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/historias` | Listar historias publicadas |
| `GET` | `/api/historias/:id` | Obtener historia por ID |
| `GET` | `/api/borradores` | Listar borradores |
| `GET` | `/api/estadisticas` | Estadísticas globales |
| `POST` | `/guardar` | Crear historia o borrador |
| `PUT` | `/actualizar/:id` | Actualizar historia |
| `DELETE` | `/eliminar/:id?password=TOKEN` | Eliminar historia |
| `POST` | `/api/historias/:id/vista` | Incrementar contador de vistas |

---

## Variables de entorno (Fly.io)

```bash
fly secrets set SUPABASE_URL="https://xxxx.supabase.co"
fly secrets set SUPABASE_KEY="eyJ..."
fly secrets set ADMIN_PASSWORD="tu-token-secreto"
```

---

## Base de datos Supabase — SQL completo

Ejecuta todo este SQL en el **SQL Editor** de tu proyecto Supabase.

```sql
-- ══════════════════════════════════════════════════════════════════════════════
-- TABLA PRINCIPAL: historias
-- Almacena novelas, cuentos, capítulos y borradores
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS historias (
  id                 UUID        DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Datos de la obra
  titulo             TEXT        NOT NULL,
  sinopsis           TEXT,
  contenido_html     TEXT        NOT NULL DEFAULT '',
  categoria          TEXT,                         -- Fantasía, Romance, Misterio…
  tags               TEXT,                         -- Palabras clave separadas por coma
  nota_autora        TEXT,                         -- Mensaje al lector

  -- Clasificación
  publico            TEXT        DEFAULT 'todos',  -- infantil | juvenil | adulto | todos
  idioma             TEXT        DEFAULT 'es',     -- es | en | pt | fr
  orden_indice       INTEGER     DEFAULT 0,        -- 0 = obra completa, 1-N = capítulo
  derechos           TEXT        DEFAULT 'todos',  -- todos | cc-by | cc-by-sa | cc-by-nc
  estado             TEXT        DEFAULT 'publicado', -- publicado | borrador

  -- Autoría
  autora_nombre      TEXT        NOT NULL,
  autora_perfil_url  TEXT,
  autora_email       TEXT,

  -- Media
  poster_url         TEXT        NOT NULL DEFAULT '',
  tiempo_lectura     TEXT,                         -- "45 minutos", "2 horas"

  -- Métricas
  vistas             INTEGER     DEFAULT 0,
  valoracion_promedio NUMERIC(3,2) DEFAULT 0.00,
  total_valoraciones INTEGER     DEFAULT 0,

  -- Timestamps
  fecha_publicacion  TIMESTAMPTZ DEFAULT NOW(),
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLA: valoraciones
-- Calificaciones de lectores por historia (1 a 5 estrellas)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS valoraciones (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  historia_id  UUID        NOT NULL REFERENCES historias(id) ON DELETE CASCADE,
  lector_alias TEXT        NOT NULL DEFAULT 'Anónimo',
  puntuacion   SMALLINT    NOT NULL CHECK (puntuacion BETWEEN 1 AND 5),
  comentario   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLA: comentarios
-- Comentarios de lectores en las historias
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS comentarios (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  historia_id  UUID        NOT NULL REFERENCES historias(id) ON DELETE CASCADE,
  autor        TEXT        NOT NULL DEFAULT 'Anónimo',
  contenido    TEXT        NOT NULL,
  aprobado     BOOLEAN     DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLA: visitas_diarias
-- Registro de vistas por día para gráficas de estadísticas
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS visitas_diarias (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  historia_id  UUID        REFERENCES historias(id) ON DELETE CASCADE,
  fecha        DATE        NOT NULL DEFAULT CURRENT_DATE,
  visitas      INTEGER     DEFAULT 1,
  UNIQUE (historia_id, fecha)
);

-- ══════════════════════════════════════════════════════════════════════════════
-- ÍNDICES para mejorar rendimiento de búsquedas
-- ══════════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_historias_estado
  ON historias (estado);

CREATE INDEX IF NOT EXISTS idx_historias_categoria
  ON historias (categoria);

CREATE INDEX IF NOT EXISTS idx_historias_fecha
  ON historias (fecha_publicacion DESC);

CREATE INDEX IF NOT EXISTS idx_historias_titulo
  ON historias USING gin (to_tsvector('spanish', titulo));

CREATE INDEX IF NOT EXISTS idx_valoraciones_historia
  ON valoraciones (historia_id);

CREATE INDEX IF NOT EXISTS idx_comentarios_historia
  ON comentarios (historia_id);

CREATE INDEX IF NOT EXISTS idx_visitas_fecha
  ON visitas_diarias (fecha DESC);

-- ══════════════════════════════════════════════════════════════════════════════
-- FUNCIÓN: actualizar updated_at automáticamente
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_historias_updated_at
  BEFORE UPDATE ON historias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ══════════════════════════════════════════════════════════════════════════════
-- FUNCIÓN: recalcular valoración promedio al insertar una valoración
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION recalcular_valoracion()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE historias
  SET
    valoracion_promedio  = (
      SELECT ROUND(AVG(puntuacion)::NUMERIC, 2)
      FROM valoraciones
      WHERE historia_id = NEW.historia_id
    ),
    total_valoraciones = (
      SELECT COUNT(*)
      FROM valoraciones
      WHERE historia_id = NEW.historia_id
    )
  WHERE id = NEW.historia_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recalcular_valoracion
  AFTER INSERT OR UPDATE OR DELETE ON valoraciones
  FOR EACH ROW EXECUTE FUNCTION recalcular_valoracion();

-- ══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- Lectura pública, escritura protegida por service_role key
-- ══════════════════════════════════════════════════════════════════════════════

-- historias
ALTER TABLE historias     ENABLE ROW LEVEL SECURITY;
ALTER TABLE valoraciones  ENABLE ROW LEVEL SECURITY;
ALTER TABLE comentarios   ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitas_diarias ENABLE ROW LEVEL SECURITY;

-- Lectura pública de historias PUBLICADAS
CREATE POLICY "Lectura pública de historias publicadas"
  ON historias FOR SELECT
  USING (estado = 'publicado');

-- El service_role (backend) puede hacer todo
CREATE POLICY "Backend gestiona historias"
  ON historias FOR ALL
  USING (true)
  WITH CHECK (true);

-- Lectura pública de valoraciones y comentarios
CREATE POLICY "Lectura pública de valoraciones"
  ON valoraciones FOR SELECT USING (true);

CREATE POLICY "Lectura pública de comentarios aprobados"
  ON comentarios FOR SELECT USING (aprobado = true);

-- Backend puede gestionar todo
CREATE POLICY "Backend gestiona valoraciones"
  ON valoraciones FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Backend gestiona comentarios"
  ON comentarios FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Backend gestiona visitas"
  ON visitas_diarias FOR ALL USING (true) WITH CHECK (true);

-- ══════════════════════════════════════════════════════════════════════════════
-- DATOS DE PRUEBA (opcional — eliminar en producción)
-- ══════════════════════════════════════════════════════════════════════════════
/*
INSERT INTO historias (
  titulo, sinopsis, contenido_html, categoria, tags,
  publico, idioma, orden_indice, estado,
  autora_nombre, autora_email, poster_url, tiempo_lectura
) VALUES (
  'Las Crónicas del Tiempo',
  'Una aventura épica a través de los siglos donde el amor y el destino se entrelazan.',
  '<p>Había una vez, en un reino muy lejano...</p>',
  'Fantasía',
  'fantasía, aventura, amor, magia',
  'adulto', 'es', 0, 'publicado',
  'María Escritora', 'maria@ejemplo.com',
  'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=600&fit=crop',
  '2 horas'
);
*/
```

---

## Deploy en Fly.io

```bash
# 1. Instalar flyctl
curl -L https://fly.io/install.sh | sh

# 2. Login
fly auth login

# 3. Crear la app (primera vez)
fly launch

# 4. Configurar secretos
fly secrets set SUPABASE_URL="https://xxxx.supabase.co"
fly secrets set SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
fly secrets set ADMIN_PASSWORD="tu-password-secreto"

# 5. Desplegar
fly deploy

# 6. Ver logs en tiempo real
fly logs
```

---

## Desarrollo local

```bash
# Clonar
git clone https://github.com/juanfu7467v/libros-historias.git
cd libros-historias

# Instalar dependencias
npm install

# Crear .env local
echo "SUPABASE_URL=https://xxxx.supabase.co" >> .env
echo "SUPABASE_KEY=eyJ..." >> .env
echo "ADMIN_PASSWORD=mi-password" >> .env

# Correr en local
node server.mjs
# → Abre http://localhost:8080
```

---

## Stack tecnológico

| Componente | Tecnología |
|-----------|------------|
| Backend | [Fastify](https://fastify.dev/) v4 |
| Base de datos | [Supabase](https://supabase.com) (PostgreSQL) |
| Deploy | [Fly.io](https://fly.io) |
| Frontend | HTML5 + Tailwind CSS + Vanilla JS |
| Editor de texto | [Quill.js](https://quilljs.com/) |
| Íconos | Font Awesome 6 + Lucide |
| Fuentes | Google Fonts (Outfit, Space Grotesk, Cormorant Garamond) |

---

## Masitaprex · Infraestructura Tecnológica LATAM

© 2026 — Cajamarca, Perú  
Representante: **José René Cubas Pérez** | RUC: 10736224351

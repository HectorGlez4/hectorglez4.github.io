-- Migración 0001 — las columnas del vocabulario de la v8 (AD-13, AD-14, Historia 23.2).
--
-- Solo `ALTER TABLE … ADD COLUMN`, porque `ADD COLUMN` no es idempotente y no admite
-- `IF NOT EXISTS`: por eso va aparte de la 0000, y por eso `npm run medicion -- desplegar` mira
-- antes el estado de la tabla y se para si no es ni la de partida ni la migrada.
--
-- Cada columna es `TEXT`, nula fuera de los eventos que la llevan, sin `CHECK`, sin JSON y sin
-- hora: el conjunto cerrado de cada una lo coteja el receptor, desde `src/lib/vocabulario.ts`.

-- La Marca de difusión, `?via=`: por qué destino se compartió la visita. Con las vistas y la lectura.
ALTER TABLE eventos ADD COLUMN via TEXT;

-- La Zona de una salida interna: desde qué parte de la página salió el enlace.
ALTER TABLE eventos ADD COLUMN zona TEXT;

-- El tramo del total de una búsqueda asentada: 0, 1-9, 10-29 o 30+. Nunca el texto buscado.
ALTER TABLE eventos ADD COLUMN tramo TEXT;

-- La combinación de filtros de una búsqueda asentada; «ninguno» hasta que haya filtros.
ALTER TABLE eventos ADD COLUMN filtros TEXT;

-- La marca de una vista de Obra: indexable o no-indexable, lo que la página servida declaraba.
ALTER TABLE eventos ADD COLUMN indexable TEXT;

-- Si la acción es la primera de su métrica en su carga (si/no): copiado, descarga y comparticiones.
ALTER TABLE eventos ADD COLUMN primera TEXT;

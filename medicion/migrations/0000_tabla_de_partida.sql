-- Migración 0000 — la tabla de partida (AD-14, Historia 23.2).
--
-- Es la tabla de producción tal como está antes de la v8: las seis columnas y los dos índices
-- del `esquema.sql` de la v7.1, todo con `IF NOT EXISTS`. En la base de producción no hace
-- nada —la tabla ya existe— y solo deja anotado en `d1_migrations` que es la línea de partida;
-- en una base nueva, local o recreada, la crea. No es la tabla del primer commit: es la que hay.
--
-- Las migraciones son solo aditivas y nunca se revierten. Esta no se edita jamás: cualquier
-- cambio del esquema va en una migración nueva, con el número siguiente.
CREATE TABLE IF NOT EXISTS eventos (
  jornada  TEXT NOT NULL,
  evento   TEXT NOT NULL,
  ruta     TEXT NOT NULL,
  origen   TEXT,
  destino  TEXT,
  consulta TEXT
);

CREATE INDEX IF NOT EXISTS eventos_por_jornada ON eventos (jornada, evento);

CREATE INDEX IF NOT EXISTS eventos_por_origen ON eventos (origen, jornada);

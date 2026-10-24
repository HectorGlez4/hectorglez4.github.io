-- Almacén de la medición — LC-4, AD-14.
--
-- Referencia: es el estado acumulado de `migrations/`, no lo que crea una base. Una base nueva
-- —local, de pruebas o recreada— se crea aplicando las migraciones con
-- `npx --yes wrangler@4.151.1 d1 migrations apply medicion --local|--remote`, nunca con este
-- fichero: así la base que se crea y la de producción tienen el mismo `d1_migrations`, y la
-- siguiente migración se aplica igual en las dos. `tests/unit/migraciones.test.ts` exige que las
-- columnas de aquí sean, en orden, las de `0000` más las de `0001`.
--
-- No hay columna de visitante porque no hay visitante que guardar: lo que no se recoge no hay
-- que anonimizarlo después ni explicarlo en un aviso. Cada columna después de `ruta` es de unos
-- eventos y llega NULL en el resto; el conjunto de cada una lo declara src/lib/vocabulario.ts.
CREATE TABLE IF NOT EXISTS eventos (
  jornada   TEXT NOT NULL,  -- AAAA-MM-DD en UTC. La unidad en la que se leen las métricas.
  evento    TEXT NOT NULL,  -- Del vocabulario cerrado de src/lib/vocabulario.ts.
  ruta      TEXT NOT NULL,  -- Ruta de la página, sin origen ni parámetros.
  origen    TEXT,           -- Marca de origen, la cuenta propia de la que vino la visita (FR-22).
  destino   TEXT,           -- Adónde salió una compartición (FR-20); «opaco» en la hoja del sistema.
  consulta  TEXT,           -- Solo en busqueda-sin-resultados (FR-8). NULL en el resto.
  via       TEXT,           -- Marca de difusión, por qué destino se compartió la visita. Desde la 0001.
  zona      TEXT,           -- Zona de una salida interna (FR-56). Desde la 0001.
  tramo     TEXT,           -- Tramo del total de una búsqueda asentada. Desde la 0001.
  filtros   TEXT,           -- Filtros usados en una búsqueda asentada. Desde la 0001.
  indexable TEXT,           -- Marca de una vista de Obra (FR-52). Desde la 0001.
  primera   TEXT            -- Primera acción de su métrica en la carga (SM-5, SM-7). Desde la 0001.
);

-- Casi todas las consultas del PRD agrupan por jornada y evento.
CREATE INDEX IF NOT EXISTS eventos_por_jornada ON eventos (jornada, evento);

-- SM-8 pregunta cuál de las cinco redes trae visitas, por jornada.
CREATE INDEX IF NOT EXISTS eventos_por_origen ON eventos (origen, jornada);

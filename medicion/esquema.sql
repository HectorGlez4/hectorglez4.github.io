-- Almacén de la medición — LC-4.
--
-- Cuatro columnas y ninguna más. No hay columna de visitante porque no hay visitante que
-- guardar: lo que no se recoge no hay que anonimizarlo después ni explicarlo en un aviso.
CREATE TABLE IF NOT EXISTS eventos (
  jornada  TEXT NOT NULL,  -- AAAA-MM-DD en UTC. La unidad en la que se leen las métricas.
  evento   TEXT NOT NULL,  -- Del vocabulario cerrado de src/lib/medicion.ts.
  ruta     TEXT NOT NULL,  -- Ruta de la página, sin origen ni parámetros.
  origen   TEXT,            -- Cuenta propia de la que vino la visita (FR-22). NULL si ninguna.
  destino  TEXT,            -- Adónde salió una compartición (FR-20); «opaco» en la hoja del sistema.
  consulta TEXT            -- Solo en busqueda-sin-resultados (FR-8). NULL en el resto.
);

-- Casi todas las consultas del PRD agrupan por jornada y evento.
CREATE INDEX IF NOT EXISTS eventos_por_jornada ON eventos (jornada, evento);

-- SM-8 pregunta cuál de las cinco redes trae visitas, por jornada.
CREATE INDEX IF NOT EXISTS eventos_por_origen ON eventos (origen, jornada);

---
title: 'Historia 20.2 — La serie de tráfico orgánico se versiona desde Search Console'
type: 'feature'
created: '2026-10-09'
status: 'done'
baseline_revision: '3de13cde0dd46d0f3f9ef6f0f6c3585919b74abc'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-20-context.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Cuando la Épica 22 publique /obra/, sus clics caerán en fueraDelCenso sin aviso hasta que la familia Obra entre en FAMILIAS.
    evidence: |-
      La familia sale del censo de tools/lib/indexacion.ts, que hoy tiene cuatro familias; nada avisa de una ruta de producto nueva que no esté en ninguna.
    location: >-
      tools/lib/trafico.ts
    severity: low
---

<intent-contract>

## Intent

**Problem:** SM-2 no tiene cifra propia: el tráfico orgánico solo se ve en el panel de Search Console, que no se versiona ni se compara en el tiempo, y los Umbrales no tienen contra qué medirse.

**Approach:** Una orden hermana de `npm run indexacion`. `tools/trafico.ts` es la cáscara: hace las peticiones a `searchconsole.searchanalytics.query`. `tools/lib/trafico.ts` es puro y se prueba con respuestas fijas. La orden lee por mes los clics, las impresiones, el CTR y la posición, en total y por familia, e informa sin escribir. Con `--registrar` escribe `corpus/serie-de-trafico.yml`: una entrada por mes, que reemplaza a la del mismo mes.

## Boundaries & Constraints

**Always:**
- Misma credencial que la indexación (`VARIABLE_DE_CREDENCIALES`, `credencialDe`), mismo alcance `webmasters.readonly` y misma propiedad: `propiedadDeDominio(DOMINIO)`, que sale de `public/CNAME`.
- La red solo vive en `tools/trafico.ts`, inyectada como en `principal(argumentos, hacerConsulta, entorno)` de `tools/indexacion.ts`.
- **Familia:** sale del **censo** (`censoPorFamilia(conjuntoDelCorpus)`). La clave `page` de Search Analytics se pasa a ruta con `rutaNormalizada` y se compara contra el censo normalizado igual. Nunca sale del prefijo de ruta.
- Lo que no casa con ninguna familia (`/`, formas que el censo no reconoce, páginas 2+, Citas retiradas) se suma en `fueraDelCenso`, se declara en el informe y **nunca se descarta en silencio**.
- **Ausencia antes que cero:**
  - una familia sin filas legibles por fallo va a `sinLeer` con su motivo (`motivoDeFallo`);
  - un mes cuya consulta falla no se escribe, se conserva la entrada anterior de ese mes si la había, y el mes sale nombrado en el `sinLeer` del informe;
  - jamás se escribe `0` por un fallo.
  - Una familia con lectura correcta y sin filas sí es un cero real, y se escribe.
- `dataState: 'final'`. El mes en curso lleva `parcial: true`.
- Por omisión se leen los **16 meses** que conserva la fuente, incluido el actual; `--meses N` (1–16) los acota.
- Códigos de salida:
  - **2**: falta la credencial, una bandera desconocida o un `--meses` mal formado;
  - **1**: no se pudo leer ningún mes, o falla la escritura;
  - **0**: el resto.
  En el caso 1 no se escribe nada.
- Banderas: `--json`, `--corpus <dir>`, `--registrar`, `--meses <n>`, `--ayuda`. Scripts: `npm run trafico` y `npm run trafico:registrar`.
- Cabecera del YAML: qué mide, que la cifra son clics de Search Console y **no** las sesiones de SM-2, por qué reemplaza por mes, la regla «ausencia antes que cero», `fueraDelCenso`, `dataState` y AD-24 (ningún `src/lib/` lo lee).
- Sección nueva en AGENTS.md, «Leer el tráfico orgánico», después de la de indexación.

**Block If:** la API de Search Analytics del SDK instalado (`googleapis` 178) no expone `searchanalytics.query`.

**Never:**
- Importar la serie o la orden desde `src/`.
- Hacer de la serie una colección de `src/content.config.ts`.
- Agregar por consulta.
- Contar la familia Obra.
- Ejecutar la orden contra la API real: no hay credencial en este equipo.
- Hacer peticiones desde `tools/lib/trafico.ts`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Sin credencial | variable ausente, con o sin `--registrar` | stderr nombra la variable y `DESPLIEGUE.md §5`; no crea fichero | código 2 |
| Consulta | credencial y respuestas fijas de 2 meses | informe por mes: total y las 4 familias (clics, impresiones, CTR, posición), `fueraDelCenso` y «no se ha escrito nada» | código 0, sin fichero |
| Registrar | ídem con `--registrar` | fichero con cabecera y `lecturas:` con 2 entradas `mes: "AAAA-MM"`, `leidoEl` y `parcial: true` solo en el mes en curso | — |
| Mismo mes dos veces | serie con 2026-09; nueva lectura de 2026-09 | una sola entrada 2026-09, la nueva; las de otros meses intactas | — |
| Mes que falla | la consulta de 2026-08 lanza 500 | 2026-08 no se escribe y su entrada previa se conserva; el informe lo nombra en `sinLeer` con su motivo | código 0 si otro mes se leyó |
| Familia sin leer | la consulta por página de un mes falla y la total no | la entrada lleva el total, `familias` vacío y `sinLeer` con las 4 familias y su motivo | — |
| Nada legible | todas las consultas fallan | no se escribe nada | código 1 |
| Fuera del censo | fila `page` `https://dominio/` o `/autor/x` sin barra que no casa | se suma en `fueraDelCenso` y no en una familia | — |
| Bandera mala | `--mezes 3` o `--meses 0` | uso por stderr | código 2 |

</intent-contract>

## Code Map

- `tools/indexacion.ts` -- plantilla de la cáscara:
  - `principal` (l.365): orden de pasos, `motivosDeArgumentosNoReconocidos` y su `USO`;
  - `inspectorDeSearchConsole` (l.173): `GoogleAuth` con el alcance y `google.searchconsole({version:'v1'})` con import dinámico;
  - `credencialesEnLinea` (l.153): privada, se copia o se exporta;
  - `conjuntoDelCorpus` (l.207);
  - el arranque (l.497).
- `tools/lib/indexacion.ts` -- se reutiliza sin copiar:
  - `Familia`, `FAMILIAS` y `NOMBRE_DE_FAMILIA` (l.53–59);
  - `propiedadDeDominio` (l.193) y `censoPorFamilia` (l.213);
  - `motivoDeFallo` y `claseDeFallo` (l.494–518);
  - `VARIABLE_DE_CREDENCIALES`, `SALIDA_SIN_CREDENCIALES` y `credencialDe` (l.690–736).
  - `MOTIVOS_SIN_CREDENCIALES` habla de indexación: se redacta un equivalente para el tráfico en `tools/lib/trafico.ts`.
- `tools/lib/rastreo.ts:288` -- `familiaDeRuta(censo, ruta)` compara exacto contra el censo, con barra final. Normaliza los dos lados con `rutaNormalizada` (`src/lib/superficies.ts:268`, que acepta una URL completa).
- `tools/lib/cli.ts` -- `opcion` (l.6), `raizDeCorpusDe` (l.13) y `motivosDeArgumentosNoReconocidos` (l.56).
- `tools/lib/corpus.ts`:
  - `FICHERO_DE_INDEXACION` (l.58) y `Rutas.serieDeIndexacion` (l.177/232): se añaden `FICHERO_DE_TRAFICO` y `Rutas.serieDeTrafico`;
  - `aYaml` (l.468) y `fechaLocal`/`horaLocal` (l.863/868);
  - `CABECERA_DE_INDEXACION` (l.1102);
  - `analizarSerie` (l.1187), `bloqueDeLectura` (l.1263) y `registrarLecturaDeIndexacion` (l.1281). Es la plantilla de reemplazo por clave: creación `wx`, cabecera conservada del fichero, re-análisis, verificación posterior y `rename` atómico. Para el tráfico la clave es `mes`. Se escribe en ese mismo fichero `registrarLecturaDeTrafico` y `CABECERA_DE_TRAFICO`, sin duplicar `aYaml` ni `analizarSerie`: se generalizan por parámetro si hace falta.
- SDK -- `node_modules/googleapis/build/src/apis/searchconsole/v1.d.ts`:
  - `requestBody` (l.407–439): `startDate`, `endDate`, `dimensions`, `dataState`, `rowLimit` y `startRow`;
  - las filas (l.128): `keys`, `clicks`, `impressions`, `ctr` y `position`.
- `tests/unit/indexacion.test.ts` -- patrones:
  - `capturarSalida` (l.741) y `CREDENCIAL` (l.754);
  - subproceso sin credencial (l.975);
  - pruebas de cabecera, de AGENTS.md y de `package.json` (l.586–601);
  - aislamiento con `git grep` (l.1113).
- `package.json:29-30` -- junto a los de indexación.
- `AGENTS.md:90-123` -- la sección de indexación, que es el modelo.

## Tasks & Acceptance

**Execution:**
- `tools/lib/trafico.ts` -- puro:
  - `mesesALeer(hoy, n)`: los rangos `desde`/`hasta` de cada mes, con el actual hasta hoy;
  - `peticionDeTotal(mes)` y `peticionPorPagina(mes, startRow)`: `dimensions: ['page']`, `rowLimit: 25000` y `dataState: 'final'`;
  - `agregarPorFamilia(filas, censo)`: clics e impresiones sumados; CTR = clics/impresiones; posición = media ponderada por impresiones, con 1 decimal; `fueraDelCenso`;
  - `componerLecturaDeTrafico(...)`, que se niega a una familia a la vez leída y sin leer, y a un motivo vacío;
  - `lineasDeTrafico` y `MOTIVOS_SIN_CREDENCIALES_DE_TRAFICO`.
- `tools/trafico.ts` -- cáscara:
  - `principal(argumentos, hacerConsulta, entorno)`;
  - pagina con `startRow` hasta recibir menos de `rowLimit`;
  - registra la orden de los pasos.
- `tools/lib/corpus.ts` -- `FICHERO_DE_TRAFICO`, `Rutas.serieDeTrafico`, `CABECERA_DE_TRAFICO` y `registrarLecturaDeTrafico(rutas, lectura)`, que reemplaza por `mes`.
- `corpus/serie-de-trafico.yml` -- se versiona con la cabecera y `lecturas:` vacío (la orden la crearía igual).
- `package.json` -- `trafico` y `trafico:registrar`.
- `AGENTS.md` -- sección «Leer el tráfico orgánico», con las órdenes, el reemplazo por mes, «ausencia antes que cero», la credencial con su **código 2**, `fueraDelCenso`, `dataState` y la advertencia de que no son sesiones.
- `DESPLIEGUE.md` §5 -- un párrafo: la misma credencial sirve para `npm run trafico`.
- `tests/unit/trafico.test.ts` -- cada fila de la matriz con respuestas fijas; la cabecera; que AGENTS.md y `package.json` las nombran; que `content.config.ts` no apunta a la serie; aislamiento con `git grep -E 'trafico|serie-de-trafico'` sobre `src integraciones astro.config.mjs`, que no debe dar nada; y el subproceso sin credencial.

**Acceptance Criteria:**
- Given `npx vitest run tests/unit/trafico.test.ts tests/unit/indexacion.test.ts`, when corre, then pasa en verde.
- Given `npx astro check`, when corre, then da 0 errores.
- Given `npm run trafico` sin credencial, when se ejecuta, then sale con código 2 y no escribe nada.

## Spec Change Log

## Review Triage Log

### 2026-10-09 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 16 (high 1, medium 4, low 11)
- defer: 1 (low 1)
- reject: 6
- addressed_findings:
  - `[high]` `[patch]` Un mes sin filas (sin datos definitivos) se escribía como cero → va a sinLeer y no se escribe.
  - `[medium]` `[patch]` El mes anterior dentro del retardo final se guardaba cerrado → `parcial` también dentro de los 3 días de retardo.
  - `[medium]` `[patch]` Un fallo por página machacaba familias ya leídas → se conserva la entrada previa.
  - `[medium]` `[patch]` La prueba «fichero exactamente la cabecera» se rompía con la primera lectura real → «empieza por la cabecera».
  - `[medium]` `[patch]` Hosts ajenos (www., http:) contados como canónicos → a fueraDelCenso.
  - `[low]` `[patch]` posición nula; try/catch en principal; type web y byPage; familias sin publicar omitidas; validación de `mes` y duplicados; verificación de fueraDelCenso y parcial; texto de propietaria; textos de SM-2, total frente a suma, reatribución y cuándo registrar; pruebas de la línea «sin leer», de la serie corrupta y de --ayuda.

## Design Notes

Clave de reemplazo `mes` (`AAAA-MM`), y no la fecha de lectura: la serie mide meses, y releer agosto en septiembre tiene que corregir agosto, no añadir otra fila de agosto. Leer los 16 meses en cada pasada hace que la primera lectura rellene el pasado sin una orden aparte. Para el total se usa la consulta **sin dimensiones**, porque la suma por página omite filas anonimizadas: así total ≠ Σ familias + `fueraDelCenso`, y la diferencia es real y se documenta en la cabecera.

Forma de la entrada:
```yaml
  - mes: "2026-09"
    leidoEl: "2026-10-09"
    propiedad: "sc-domain:sabiduriadebolsillo.net"
    total: { clics: 12, impresiones: 3400, ctr: 0.0035, posicion: 41.2 }
    familias: { cita: {…}, autor: {…}, tema: {…}, coleccion: {…} }
    fueraDelCenso: { clics: 1, impresiones: 220 }
    sinLeer: { tema: "…" }   # solo si hay
```

## Verification

**Commands:**
- `npx vitest run tests/unit/trafico.test.ts tests/unit/indexacion.test.ts` -- expected: verde
- `npx astro check` -- expected: 0 errores
- `npm run trafico; echo $?` (sin credencial) -- expected: 2 y ningún fichero escrito

## Auto Run Result

Status: done

**Resumen:** `npm run trafico` y `npm run trafico:registrar` leen de Search Analytics, mes a mes, los clics, impresiones, CTR y posición en total y por familia del censo, y escriben `corpus/serie-de-trafico.yml` reemplazando por mes. Nunca escriben un cero por un fallo. El código 2 es para la falta de credencial y la forma de la invocación; el 1, para cuando no se lee nada o falla la escritura.

**Ficheros:** `tools/lib/trafico.ts` (puro); `tools/trafico.ts` (cáscara con red); `tools/lib/corpus.ts` (serie de tráfico; `analizarSerie` parametrizado por clave y escritura atómica compartida con la indexación); `corpus/serie-de-trafico.yml` (cabecera); `package.json`; `AGENTS.md` («Leer el tráfico orgánico»); `DESPLIEGUE.md` §5; `tests/unit/trafico.test.ts` (38 pruebas); `tests/unit/andamiaje.test.ts` (séptima excepción de red, AD-22).

**Revisión:** 16 parches aplicados, 1 diferido y 6 rechazados (cerrojo de escritura concurrente; punto de entrada con `pathToFileURL`, patrón ya existente; grep de aislamiento amplio; reescritura completa en cada pasada; el mes fallido solo en el informe, que es decisión del spec; una sola consulta por página). Seguimiento: high 1 → true.

**Verificación:** vitest de trafico, indexacion y andamiaje 141/141; suite completa, astro check y build antes del commit; `env -u SEARCH_CONSOLE_CREDENCIALES npm run trafico` → 2, sin escribir.

**Riesgo residual:** la orden no se ha corrido contra la API real (no hay credencial en este equipo); la primera lectura es de Héctor (20.4).

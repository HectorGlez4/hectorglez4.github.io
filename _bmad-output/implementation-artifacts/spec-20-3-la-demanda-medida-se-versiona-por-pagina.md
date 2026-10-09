---
title: 'Historia 20.3 — La demanda medida se versiona por página'
type: 'feature'
created: '2026-10-09'
status: 'in-progress'
baseline_revision: '74f13a8ec4af8a74ef2c4e7ddd8478b7f39f5155'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-20-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-20-2-la-serie-de-trafico-organico-se-versiona.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** FR-49 prioriza el sembrado por demanda, pero no hay ningún dato versionado de qué Autores y qué Citas reciben impresiones y clics. Hoy se lee a ojo en el panel de Search Console.

**Approach:** Una orden hermana de `npm run trafico`: `tools/demanda.ts` es la cáscara con red y `tools/lib/demanda.ts` es puro. La orden lee la dimensión `page` por ventanas y agrega por Autor (las rutas de Cita, atribuidas por el prefijo de Autor más largo), por Cita y por familia. Con `--registrar` escribe `corpus/serie-de-demanda.yml`.

## Boundaries & Constraints

**Always:**

- **Forma de la serie** (hueco 1 de la readiness, fijado aquí):
  - una entrada por ventana, con `desde`, `hasta`, `leidoEl` y `clase: "28-dias" | "mes"`;
  - la clave de reemplazo es el par `desde`–`hasta`;
  - `hasta` de la ventana de 28 días es el último día con datos definitivos (hoy − `RETARDO_DE_DATOS_FINALES_EN_DIAS` de la 20.2), y `desde` = `hasta` − 27;
  - **primera lectura** = la serie no tiene ninguna entrada `clase: "mes"`. Entonces se leen además los meses **cerrados** de los 16 que conserva la fuente, sin el mes en curso y sin un mes dentro del retardo;
  - dos lecturas el mismo día dan la misma ventana de 28 días y se reemplazan: eso es «idempotente por fecha».
- **Atribución:**
  - una ruta es de Cita si, tras `rutaNormalizada`, tiene la forma `/cita/<slug>`, esté publicada o retirada;
  - su Autor es el slug de `corpus/autores/` que sea **prefijo más largo** de `<slug>-`;
  - la función se extrae de `esDelAutor` (`tools/lib/gestion.ts:519`) a un dueño compartido, `tools/lib/autoria.ts`, que usan `gestion.ts` y la demanda;
  - una ruta de Cita sin prefijo de Autor va a `sinAutor` (clics, impresiones y número de rutas), y el informe la nombra.
- **Umbral:**
  - una fila de Cita con menos de `MIN_IMPRESIONES_POR_FILA = 5` impresiones no se versiona en `citas`; se suma en `resto` (filas, clics e impresiones);
  - los totales por Autor sí incluyen todas sus filas.
- **Reparto por familia:** se reutiliza `agregarPorFamilia` de la 20.2, censo, host canónico y `fueraDelCenso` incluidos.
- **Reutilizado de la 20.2:**
  - credencial, códigos y mensajes;
  - `type: 'web'`, `aggregationType: 'byPage'` y `dataState: 'final'`;
  - la paginación por `startRow` y el cliente.
  
  Se reutiliza y no se copia: si hace falta exportar algo de `tools/trafico.ts`, se exporta.
- **Ausencia antes que cero:**
  - una ventana cuya consulta falla no se escribe (se conserva la previa) y va al `sinLeer` del informe con su motivo;
  - una ventana con cero filas va a `sinLeer` con el motivo de datos no definitivos.
- **Códigos:** 2 si falta la credencial o la forma de la invocación es mala; 1 si no se lee ninguna ventana o falla la escritura (y no se escribe nada); 0 en el resto.
- **Informe:** Autores por impresiones descendentes, Citas con al menos un clic, reparto por familia, `sinAutor`, `resto` y `sinLeer`.
- **Banderas:** `--json`, `--corpus`, `--registrar`, `--ayuda`. Scripts: `demanda` y `demanda:registrar`.
- Sección «Leer la demanda por página» en AGENTS.md, tras la de tráfico. Párrafo en `DESPLIEGUE.md` §5.

**Block If:** nada; todo lo necesario está en el repositorio.

**Never:**
- Tocar `src/lib/objetivo.ts` o `npm run huecos`.
- Importar la serie desde `src/`.
- Agregar por consulta.
- Correr contra la API real.
- Peticiones fuera de `tools/demanda.ts`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Sin credencial | variable ausente | nombra la variable y DESPLIEGUE §5; no escribe | código 2 |
| Primera lectura | serie vacía; respuestas fijas | ventana de 28 días + meses cerrados (16 menos los abiertos), cada uno una entrada | — |
| Lectura siguiente | serie con entradas `mes` | solo la ventana de 28 días | — |
| Mismo día dos veces | dos `--registrar` con el mismo `hoy` | una sola entrada de 28 días con esa ventana | — |
| Prefijo más largo | autores `seneca` y `seneca-el-viejo`; ruta `/cita/seneca-el-viejo-la-fortuna/` | atribuida a `seneca-el-viejo` | — |
| Sin Autor | `/cita/desconocido-algo/` | en `sinAutor`, nombrada en el informe | — |
| Fila pequeña | Cita con 3 impresiones | fuera de `citas` y sumada en `resto`; sí cuenta en su Autor | — |
| Cita retirada | `/cita/seneca-x/` que no publica el censo | atribuida a `seneca`; en el reparto, a `fueraDelCenso` | — |
| Ventana que falla | la consulta de un mes lanza 500 | no se escribe; `sinLeer` con motivo | 0 si otra se leyó |
| Nada legible | todas fallan | nada escrito | código 1 |
| Aislamiento | `src/` | ningún fichero menciona `serie-de-demanda` ni importa la orden | — |

</intent-contract>

## Code Map

- `tools/trafico.ts` -- se reutilizan `Consultar` (l.88), `clienteDeSearchAnalytics` (l.94) y `filasPorPagina` (l.129, privada: se exporta), y `principal` (l.227) es la plantilla de los pasos y códigos.
- `tools/lib/trafico.ts` -- se reutilizan:
  - `RETARDO_DE_DATOS_FINALES_EN_DIAS` (l.68), `MOTIVO_SIN_DATOS_DEFINITIVOS` (l.71), `mesesALeer` (l.111) y `jornadaLocal` (l.100);
  - `peticionPorPagina` (l.170): se generaliza a un rango `desde`/`hasta` si hace falta, sin romper la 20.2;
  - `FilaDeTrafico` (l.184), `agregarPorFamilia` (l.330), `familiasPublicadas` (l.317) y `MOTIVOS_SIN_CREDENCIALES_DE_TRAFICO` (l.516). Este último se generaliza o tiene su par de demanda.
- `tools/lib/gestion.ts:519` -- `esDelAutor`, donde vive la regla del prefijo más largo, que pasa a `tools/lib/autoria.ts`. `gestion.ts` la importa y su comportamiento no cambia (lo cubren las pruebas de `tests/unit/autor*.test.ts`).
- `tools/lib/corpus.ts` -- `FICHERO_DE_TRAFICO`, `Rutas.serieDeTrafico`, `analizarSerie` parametrizado por clave, `cabeceraDeSerie`, `escribirSerieAtomica` y `registrarLecturaDeTrafico`, que es la plantilla de `registrarLecturaDeDemanda`. La clave aquí es compuesta (`desde`+`hasta`): `analizarSerie` se extiende con lo mínimo necesario.
- `tests/unit/trafico.test.ts` -- patrones de `fuente()`, `capturarSalida`, la credencial, el subproceso sin credencial, la cabecera, `package.json`, AGENTS.md y el aislamiento.
- `tests/unit/andamiaje.test.ts` -- la lista cerrada de ficheros con red: se añade `tools/demanda.ts` con su motivo.
- `src/lib/objetivo.ts` -- solo lectura: no se toca.

## Tasks & Acceptance

**Execution:**
- `tools/lib/autoria.ts` -- `autorPorPrefijo(slugDeCita, slugsDeAutores): string | undefined`; `gestion.ts` lo usa.
- `tools/lib/demanda.ts` -- puro:
  - `ventanasALeer(hoy, primeraLectura)`;
  - `agregarDemanda(filas, {slugsDeAutores, censo, dominio})`, que devuelve `autores`, `citas`, `sinAutor`, `resto`, `familias` y `fueraDelCenso`;
  - `componerLecturaDeDemanda`, `lineasDeDemanda` y `MIN_IMPRESIONES_POR_FILA`.
- `tools/demanda.ts` -- cáscara: `principal(argumentos, hacerConsulta, entorno, momento?)` y `leerDemanda`.
- `tools/lib/corpus.ts` -- `FICHERO_DE_DEMANDA`, `Rutas.serieDeDemanda`, `CABECERA_DE_DEMANDA`, `leerSerieDeDemanda` y `registrarLecturaDeDemanda`.
- `corpus/serie-de-demanda.yml` -- cabecera y `lecturas:` vacío. La cabecera cuenta:
  - qué mide;
  - por qué se agrega por página y no por consulta (anonimización);
  - la regla del prefijo;
  - `resto` y `sinAutor`;
  - la clave de reemplazo y la primera lectura;
  - ausencia antes que cero;
  - AD-24.
- `package.json`, `AGENTS.md` y `DESPLIEGUE.md` §5 -- lo dicho arriba.
- `tests/unit/demanda.test.ts` -- cada fila de la matriz más la cabecera, `package.json`, AGENTS.md, `content.config.ts` y el aislamiento de `src/`, con prueba explícita de que `src/lib/objetivo.ts` no menciona la serie.
- `tests/unit/andamiaje.test.ts` -- la excepción de red.

**Acceptance Criteria:**
- Given `npx vitest run tests/unit/demanda.test.ts tests/unit/trafico.test.ts tests/unit/andamiaje.test.ts` y las pruebas de la orden de Autor, when corren, then pasan en verde.
- Given `npx astro check`, when corre, then da 0 errores.
- Given `env -u SEARCH_CONSOLE_CREDENCIALES npm run demanda`, when se ejecuta, then sale con 2 y no escribe nada.

## Spec Change Log

## Review Triage Log

## Design Notes

Entrada:
```yaml
  - desde: "2026-09-08"
    hasta: "2026-10-06"
    clase: "28-dias"
    leidoEl: "2026-10-09"
    propiedad: "sc-domain:…"
    autores:   # por impresiones descendentes
      - { autor: seneca, clics: 3, impresiones: 410 }
    citas:     # solo filas ≥5 impresiones
      - { cita: seneca-no-es-que-tengamos-poco-tiempo, clics: 1, impresiones: 90 }
    sinAutor: { rutas: 1, clics: 0, impresiones: 7 }
    resto: { filas: 52, clics: 0, impresiones: 118 }
    familias: { cita: {…}, autor: {…}, … }
    fueraDelCenso: { clics: 0, impresiones: 30 }
```

## Verification

**Commands:**
- `npx vitest run tests/unit/demanda.test.ts tests/unit/trafico.test.ts tests/unit/andamiaje.test.ts` -- expected: verde
- `npx astro check` -- expected: 0 errores
- `env -u SEARCH_CONSOLE_CREDENCIALES npm run demanda; echo $?` -- expected: 2

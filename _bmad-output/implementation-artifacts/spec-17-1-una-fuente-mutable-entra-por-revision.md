---
title: 'Historia 17.1 — Una Fuente mutable entra por revisión, y su documento no comparte espacio con las obras'
type: 'feature'
created: '2026-10-10'
status: 'in-progress'
baseline_revision: '6a5942ef4834748f6891eebdeed6379cb0194b50'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-17-context.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** La semblanza de un Autor (17.2) saldrá de Wikipedia, una Fuente cuyo contenido cambia. Hoy el conjunto cerrado de Fuentes solo conoce fuentes fijas. `recuperar` descarga la página viva y renderizada. Los documentos no llevan revisión. Y el cotejo casa documentos solo por nombre en todo `corpus/fuentes/`, así que una biografía podría acabar cotejando una Cita.

**Approach:**
- Wikipedia en español entra en el conjunto cerrado como Fuente **mutable**, admitida solo por revisión (`oldid`).
- `recuperar` la descarga por el origen de esa revisión (`action=raw&oldid=N`) y la versiona como **documento de biografía** en `corpus/biografias/`, un espacio aparte que el cotejo de Citas no lee, con la revisión en su nombre y en su cabecera.
- El Autor declara el documento y la revisión que lo sostienen, y el build rompe si no coinciden.
- De paso, la reutilización de un documento de obra compara la obra de la cabecera con la pedida.

## Boundaries & Constraints

**Always:**
- **Fuentes** (`tools/lib/fuentes.ts`): `Fuente` gana `mutable?: true` y la noción de direccionamiento por revisión. Nueva entrada `wikipedia-es`:
  - `nombre: 'Wikipedia en español'`;
  - `licencia: 'CC BY-SA 4.0'`;
  - `anfitriones: ['es.wikipedia.org']`;
  - `permiteReutilizacion: true`;
  - `mutable: true`.
  
  Una invariante probada: toda Fuente mutable declara cómo se extrae la revisión de su URL; si no, no entra en el conjunto.
- **Entrada por revisión:** para una Fuente mutable, `recuperar` exige una URL con `oldid=<entero>` (`/w/index.php?title=…&oldid=N` o `/wiki/T?oldid=N`). Sin `oldid`, se niega con código 1 y dice cómo obtener el enlace permanente. Descarga **solo** `https://es.wikipedia.org/w/index.php?oldid=N&action=raw`: nunca la página renderizada ni la dirección viva. La redirección se sigue con las mismas comprobaciones de anfitrión de `descargar`.
- **Extracción propia** (`tools/lib/documento.ts`): un lector para `wikipedia-es` que no depende de las plantillas de encabezado de Wikisource. Del wikitexto en bruto saca:
  - el **título del artículo**, de la URL pedida (`title`) o, si no viene, de la redirección o respuesta, y si no puede, se niega;
  - el cuerpo en texto plano, con un despojado básico de marcado (plantillas `{{…}}`, referencias `<ref…>…</ref>`, enlaces `[[a|b]]` → `b`, negritas y cursivas, tablas y encabezados `==`).
  
  La declaración guarda la línea del título.
- **Documento de biografía:**
  - **Nombre:** `corpus/biografias/{fuente}--{slug-del-titulo}--r{oldid}.txt`. La revisión forma parte de su identidad: dos revisiones son dos documentos.
  - **Cabecera:** `fuente`, `clase: biografia`, `titulo`, `revision`, `url` (el enlace permanente) y `recuperado`.
  - `analizarDocumento` lee `clase` y `revision`. Un documento de obra existente, sin `clase`, sigue analizándose igual.
- **Reutilizar una biografía:** si el fichero de esa revisión ya existe, «Ya versionado». Otra revisión del mismo artículo es otro documento y no reemplaza al anterior (AD-2).
- **Separación del cotejo:** `leerDocumentosDeFuente` y todo el cotejo de Citas leen solo `corpus/fuentes/`. Una Cita jamás casa con un documento de biografía, ni por prefijo ni por nombre exacto. Además, si un documento de `corpus/fuentes/` declara `clase: biografia`, `documentosDeCita` lo excluye: así una obra cuyo identificador coincida con el slug de un Autor no se traga su biografía. Las dos cosas llevan prueba.
- **El Autor declara su biografía** (`autorAdmisible`): campo opcional y estricto `biografia: { documento: <nombre sin .txt>, revision: <entero> }`. Si no tiene valor se omite. La 17.2 decidirá qué se publica con él; esta historia no cambia ninguna página.
- **Puerta del build:** nueva integración, o ampliación de una existente, al patrón de `integraciones/cotejo.ts` (detalle al registro, titular corto en el Error). Rompe cuando un Autor declara `biografia` y:
  - el documento no existe en `corpus/biografias/`;
  - la `revision` de su cabecera no es la declarada;
  - el documento no es de una Fuente mutable.
  
  El mensaje nombra el fichero de Autor, el documento y las dos revisiones.
- **Reutilización de obras** (`tools/recuperar.ts:~298`): la comparación de nombre colisionado incluye la **obra declarada en la cabecera** del documento existente (`cabecera.obra`), además de la derivada. Si difiere de la obra pedida, rechaza la reutilización en vez de contestar «ya versionado». Prueba con dos obras que truncan igual y cabeceras distintas.
- **Docs:** `corpus/biografias/` se versiona con `.gitkeep`. AGENTS.md añade a «Una sesión de sembrado» un párrafo sobre las biografías: la orden, el `oldid` obligatorio y que el cotejo no las lee.

**Block If:** nada.

**Never:**
- Descargar ninguna biografía real.
- Escribir ninguna semblanza.
- Cambiar ninguna página del sitio (`dist/` idéntico).
- Descargar la página renderizada de una Fuente mutable.
- Hacer peticiones de red fuera de `tools/recuperar.ts`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Wikipedia sin oldid | `recuperar https://es.wikipedia.org/wiki/Séneca` | se niega y explica el enlace permanente | código 1 |
| Wikipedia con oldid | `…/w/index.php?title=Séneca&oldid=123` | pide **solo** `?oldid=123&action=raw` y escribe `corpus/biografias/wikipedia-es--seneca--r123.txt` con `clase` y `revision` | 0 |
| Ya versionada | la misma revisión otra vez | «Ya versionado», sin descargar | 0 |
| Otra revisión | `oldid=124` | documento nuevo; el de 123 sigue | 0 |
| Cotejo | Cita de Fuente `wikipedia-es` con obra «Séneca» | no casa con la biografía | el cotejo la trata como sin documento |
| Biografía mal colocada | `corpus/fuentes/x.txt` con `clase: biografia` | `documentosDeCita` la excluye | — |
| Revisión distinta | Autor declara `r124`; el documento es `r123` | el build rompe nombrando las dos | código ≠ 0 |
| Documento inexistente | Autor declara un documento que no está | el build rompe | código ≠ 0 |
| Truncado de obra | obra B que trunca igual que la A versionada | rechaza «comparten nombre» y no dice «ya versionado» | código 1 |
| Documento de obra antiguo | sin `clase` | se analiza como antes | — |

</intent-contract>

## Code Map

- `tools/lib/fuentes.ts:18-95` -- `interface Fuente`, `FUENTES` (`wikisource-es`, `gutenberg`, `cervantes-virtual`), `fuenteDe` y `fuenteDeUrl`.
- `tools/recuperar.ts`:
  - la admisión (l.106-118) y `descargar` (l.663-767), con redirecciones y anfitriones;
  - `ENCABEZADO_EN_EL_ORIGEN` (l.93) y `encabezadoDeOrigen` (l.483), que dan la forma de pedir `action=raw`;
  - la reutilización por URL (l.130-137, `documentoConUrl`) y por nombre (l.268-329, que compara la obra derivada en l.294-298);
  - la escritura (l.332-352).
  
  Las biografías van por una rama propia de `principal`.
- `tools/lib/documento.ts` -- `LectorDeFuente` (l.1200), `LECTORES_POR_FUENTE` (l.1491), `derivarDeLaDeclaracion` (l.1889), `derivarDocumento` (l.2015), `CabeceraDeDocumento` (l.2101), `componerDocumento` (l.2145), `analizarDocumento` (l.2171) y `nombreDeDocumento` (l.2298).
- `tools/lib/cotejo.ts:199-232` -- `documentoDeCita` y `documentosDeCita`, que casan por nombre exacto y por prefijo `{corto}--`. `cotejar` en l.334.
- `tools/lib/corpus.ts` -- `rutasDelCorpus` (l.334-339, `fuentes` y `fuentesRetiradas`), donde se añade `biografias`. También `leerDocumentosDeFuente` (l.952) y `leerDocumentosDeclarados` (l.969).
- `src/lib/admision.ts:230-259` -- `semblanza` y `autorAdmisible`, que gana `biografia`. `src/content.config.ts:75-86` -- la colección `autores`.
- `integraciones/cotejo.ts` -- la plantilla de la puerta. `astro.config.mjs` -- el registro de integraciones.
- Pruebas:
  - `tests/unit/recuperar-cli.test.ts`: el servidor local de pruebas; truncado en l.481; reutilización en l.238 y l.838;
  - `tests/unit/cotejo.test.ts:563` (prefijo);
  - `tests/unit/documento.test.ts:896` (zonas) y l.1164 (antiguos);
  - `tests/unit/extraccion.test.ts:154` (invariantes de `FUENTES`);
  - `tests/unit/andamiaje.test.ts` (red solo en `recuperar`).

## Tasks & Acceptance

**Execution:**
- `tools/lib/fuentes.ts` -- la Fuente mutable y su revisión.
- `tools/lib/documento.ts` -- el lector de Wikipedia, la cabecera con `clase` y `revision`, y `nombreDeBiografia`.
- `tools/recuperar.ts` -- la rama de biografía y la comparación con `cabecera.obra`.
- `tools/lib/cotejo.ts` -- la exclusión de `clase: biografia`.
- `tools/lib/corpus.ts` -- la ruta de biografías y su lectura.
- `src/lib/admision.ts` -- el campo `biografia`.
- La integración de la revisión en el build.
- `corpus/biografias/.gitkeep`.
- `AGENTS.md`.
- Pruebas de cada fila de la matriz.

**Acceptance Criteria:**
- Given `npx vitest run` sobre los ficheros tocados, `npx astro check` y `npm run build`, when corren, then pasan y `dist/` no cambia.

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `npx vitest run tests/unit/recuperar-cli.test.ts tests/unit/cotejo.test.ts tests/unit/documento.test.ts tests/unit/extraccion.test.ts tests/unit/andamiaje.test.ts tests/unit/puerta-de-admision.test.ts` (y los ficheros nuevos) -- expected: verde
- `npx astro check` -- expected: 0 errores
- `npm run build` -- expected: código 0

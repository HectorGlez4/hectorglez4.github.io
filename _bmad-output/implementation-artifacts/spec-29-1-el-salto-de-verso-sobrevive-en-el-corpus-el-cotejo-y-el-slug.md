---
title: 'Historia 29.1 — El salto de verso sobrevive en el Corpus, el cotejo y el slug'
type: 'feature'
created: '2026-11-07'
status: 'ready-for-dev'
baseline_revision: 'bcd8a3a3917aea5d9c4b2de534a25381ef2df6a5'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-29-context.md'
warnings: [oversized]
deferred: []
---

<intent-contract>

## Intent

**Problem:** El `texto` de una Cita no puede guardar los saltos de verso: lo escrito sale de corrido, y un salto de documento no dice por sí solo que haya verso (Gutenberg parte a ~72 columnas —y *Orígenes de la novela* II y III a ~40—, y cerca de 143 documentos de Wikisource ponen una línea en blanco entre versos). Sin una sola regla de qué es un salto, quién lo escribe y qué lo respalda, la 29.2 no tiene qué restituir y la 29.3 nada que pintar, y Héctor no tiene las cifras para decidir la Tarjeta Social del verso.

**Approach:** Un módulo nuevo, `tools/lib/lineas.ts`, con `FORMAS_DE_LINEAS`, `formaDeLasLineas` (forma del documento, conservadora) y `textoConSaltos` (el escritor único del `texto`); `tramoEnCrudo` en `tools/lib/cotejo.ts`; el esquema de `texto` admite un U+000A y nada más; el cotejo del build rompe ante un salto sin respaldo; `recuperar` declara `lineas:` en los documentos nuevos; y una orden de solo lectura, `npx tsx tools/lineas.ts`, da el reparto por forma y las cifras de la Tarjeta Social, que la historia anota en este spec sin escribir en `corpus/`.

## Boundaries & Constraints

**Always:**
- El salto es un único `\n` dentro de la cadena entre comillas dobles de `aYaml` (`JSON.stringify` ya lo escapa); nunca `\r`, dos seguidos, al principio o al final, pegado a espacio o tabulador, `<br` ni « / ».
- `formaDeLasLineas` juzga solo el cuerpo, sin red, y es conservadora: ante la duda, `indeterminada`; nunca `verso` ni `verso-espaciado` un documento ajustado a ancho fijo. La cabecera `lineas:` válida manda sobre el cálculo.
- `textoConSaltos` solo toca el espacio en blanco: cada racha de espacio del texto queda en `' '` o, si la racha correspondiente del crudo contiene un salto, en un `\n` (también al cruzar estrofa: uno, nunca dos). Saltos solo de un documento `verso` o `verso-espaciado` en que el texto se localiza; si no, una línea. Lo escrito colapsa (`colapsarEspacios`) a lo mismo que lo recibido (NFR-12) y los saltos tecleados no sobreviven: se cuentan en `descartados` y el parte lo dice.
- Slug, huella (`huellaDeTexto`), forma canónica (`normalizar`), veredicto del cotejo y `tramoDe` son los mismos con saltos que sin ellos; ningún slug se recalcula (AD-4).
- La Tarjeta Social (`src/lib/tarjeta.ts`), `src/lib/lienzo.ts`, `src/lib/tramos.ts`, `public/islas/imagen.js`, `src/lib/vocabulario.ts` y `src/lib/superficies.ts` quedan como están: el cálculo de las cifras vive en `tools/`.
- Ningún documento versionado de `corpus/fuentes/` se reescribe ni gana `lineas:`; `git diff --stat corpus/` sale vacío al cerrar.

**Block If:**
- El reparto real contradice por mucho la espina (Gutenberg casi todo `prosa-ajustada`; ~143 `verso-espaciado` en Wikisource) y no se sabe ajustar la función sin volverla menos conservadora: anotar las cifras y bloquear para Héctor.
- Hacer pasar el build exigiría escribir en `corpus/` o tocar la Tarjeta Social o `tramos.ts`.

**Never:**
- Restituir saltos en Citas publicadas (es la 29.2, acto de Héctor), pintar el verso en ninguna superficie (29.3), mover `parecidoDeTextos`/`contenidaEn` (29.4).
- Que otro módulo interprete un salto de documento, ni un segundo localizador ni una segunda cuenta de posiciones en crudo.
- Usar la Fuente (`gutenberg`, `wikisource-es`) para decidir la forma: la decide el cuerpo.
- Decidir la Tarjeta Social del verso: solo se dan las cifras.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Verso | «Yo vengo de todas partes, Y hacia…monte soy.» + *Versos sencillos* I (`verso`) | `"Yo vengo de todas partes,\nY hacia todas partes voy:\nArte soy entre las artes,\nEn los montes, monte soy."`; slug, huella y forma canónica iguales | — |
| Cruza estrofa | texto de dos estrofas en un documento `verso` o `verso-espaciado` | un `\n` en la línea en blanco, nunca dos | — |
| Prosa | texto en un documento `prosa-ajustada` / `prosa-por-lineas` / `indeterminada`, o sin documento | una línea | — |
| Salto tecleado | `--texto`, lote del alta o semilla con `\n` en sitio que el documento no respalda | ese salto pasa a espacio; `descartados ≥ 1` | el parte lo nombra; no falla |
| Esquema | `\r`, `\n\n`, `\n` inicial/final, ` \n`/`\t\n`/`\n `, `<br`, « / » | rechazo con la ruta del fichero y la regla | build roto |
| Puerta, sin verso | Cita con `\n` cuyo texto solo se localiza en documentos de prosa | rompe nombrando el fichero y la regla 1 | build roto |
| Puerta, salto suelto | `\n` sobre una racha del crudo sin salto | rompe con la regla 2 | build roto |
| Puerta, censo | Cita del censo (sin documento) con `\n` | rompe con la regla 3 | build roto |
| `lineas:` inválida | cabecera `lineas: poesia` | el build rompe nombrando `corpus/fuentes/<n>.txt` aunque ninguna Cita lo use; `formaDeLasLineas` da `indeterminada` | build roto |
| Crudo | espacios invisibles, U+00A0, `\n`, `\n\n`, astral (U+1D11E) | `colapsarEspacios(crudo.slice(a,b)) === colapsado.slice(inicio,fin)` | — |

</intent-contract>

## Code Map

- `src/lib/admision.ts:129` -- `texto` (zod): añadir los `refine` de AD-29, mensajes «Regla incumplida: …». `citaAdmisible` (`:356`) lo cablea; `src/content.config.ts` también. El Corpus real no tiene hoy ningún `\n`, `\r`, `<br` ni « / » en `texto` (comprobado sobre los 4.424 ficheros): el esquema nuevo no rompe nada.
- `tools/lib/corpus.ts:802` -- `aYaml`/`escalar` (`JSON.stringify`): ya escribe `"…\n…"`; solo pruebas. `:1066` `leerDocumentosDeFuente` (cuerpo por nombre; lo usan `posiciones.ts`, `alcance.ts`, `integraciones/cotejo.ts`) y `:1172` `leerDocumentosDeclarados` (lo usa la restitución de traducciones): añadir `lineas?` al segundo y una lectura para el cotejo que dé, **en la misma pasada**, cuerpos y `lineas:` declaradas en crudo.
- `tools/lib/documento.ts:2142` -- `CabeceraDeDocumento`: `lineas?: string` (en crudo; se valida en `lineas.ts` para no crear el ciclo documento→lineas→cotejo→documento). `componerDocumento` (`:2201`) escribe `lineas:` tras `añoDeTraduccion`/antes de `url` cuando consta; `analizarDocumento` (`:2261`) lo lee.
- `tools/lib/cotejo.ts:52` -- `colapsarEspacios`, `localizar` (`:78`), `huellaDeTexto` (`:97`), `documentosDeCita` (`:242`), `cotejar` (`:381`; el bucle por Cita termina en `cotejadas += 1`, `:556`). Aquí entran `tramoEnCrudo` y la puerta del salto; `EntradaDeCotejo` gana `lineasDeclaradas?`. `cotejo.ts` y `lineas.ts` se importan mutuamente: ninguno usa en lo alto del módulo un valor del otro.
- `integraciones/cotejo.ts:72` -- `cotejarElCorpus`: pasa las `lineas:` declaradas a `cotejar`.
- `tools/recuperar.ts:423` -- la única llamada a `componerDocumento`; la reutilización de un documento ya versionado (`:333`, `terminar` antes) no escribe nada.
- `tools/extraer.ts:199,373,462` -- `analizarDocumento`; el `DocumentoDeFuente` de la extracción; el `aYaml` de cada candidata (`texto: candidata.texto`). Las candidatas salen de `sentencias` de `tools/lib/extraccion.ts:518`, que ya colapsa en una línea y parte por párrafos: no es lectura del salto de verso y se queda como está.
- `tools/alta.ts:236,285,362` -- el texto del lote, la `candidata`, `escribirCita`. Hoy no lee documentos: necesita los candidatos de `documentosDeCita(entrada.fuente, entrada.procedencia.obra, …)` con cuerpo y `lineas:`. `tools/sembrar.ts` pasa por `darDeAltaLote`.
- `tools/lib/documentacion.ts:244,520,714` -- `leerDocumento`, `textoFinal` (`--texto`), `escribirCita`.
- `tools/lib/revision.ts`, `tools/revisar.ts` -- `--aprobar` conserva el `texto` de la candidata; no se toca.
- `src/lib/tarjeta.ts:61` -- `svgDeTarjeta`: `MARGEN = 80` (privado), `ANCHO`/`ALTO` exportados; bloque = `líneas × round(cuerpo·1,3) + 40 + (24 + 34 + 30 si hay procedencia)`, centrado con `max(MARGEN, (ALTO − bloque)/2)`. Sin Imagen (`tramo.admiteImagen` falso) la Tarjeta no lleva texto. `src/lib/lienzo.ts:97` `repartirEnLineas` (parte por `\s+`). `src/lib/tramos.ts:61` tabla (`pixelesEnTarjeta` 56/46/38/32; `MAX_CARACTERES_IMAGEN` = 300). `src/pages/tarjeta/[slug].png.ts` compone `procedenciaCompuesta(cita)`: toda Cita con documento declara obra, así que lleva procedencia.
- `corpus/fuentes/` -- 267 de Gutenberg y 1.155 `.txt` de Wikisource (y cuatro `.indice.yml`, que no son documentos). Trampas vistas al planificar: `gutenberg--origenes-de-la-novela-tomo-ii.txt`/`-iii.txt` (ajustados a ~40 columnas en buena parte: un umbral de ancho medio los da por verso); el pie de licencia de Wikisource («Esta obra se encuentra en dominio público…», ~211 caracteres, y «Public domain…») al final de casi todo cuerpo de Wikisource; sonetos en minúscula y con encabalgamiento (`a-una-nariz`, Góngora); índices de una entrada por línea (`en-torno-al-casticismo`, `maria--maria-isaacs`) y cartas cortas (`carta-a-jose-marti-y-zayas-bazan`), que no son verso.
- Pruebas: `tests/unit/puerta-de-admision.test.ts`, `cotejo.test.ts`, `cotejo-build.test.ts`, `normalizar-y-slug.test.ts`, `recuperar-cli.test.ts`, `extraer-cli.test.ts`, `alta.test.ts`, `documentar-cli.test.ts`; ayudas en `tests/unit/ayuda/construir.ts` (`construirConCorpus`, `citaValida`).

## Tasks & Acceptance

**Execution:**
- `tools/lib/lineas.ts` (nuevo) -- `FORMAS_DE_LINEAS` (`verso`, `verso-espaciado`, `prosa-por-lineas`, `prosa-ajustada`, `indeterminada`), `type FormaDeLineas`, `esFormaDeLineas`; `formaDeLasLineas({ cuerpo, lineas? })`: declarada válida manda, inválida da `indeterminada`; `textoConSaltos(texto, documento?: { cuerpo, forma }) → { texto, descartados }`; `documentoParaLosSaltos(texto, candidatos)`: el primero, en el orden de `documentosDeCita`, de forma `verso`/`verso-espaciado` donde el texto se localiza -- dueño único de la forma y del escritor (AD-29).
- `tools/lib/cotejo.ts` -- `tramoEnCrudo(crudo, inicio, fin)` junto a `colapsarEspacios` (desplazamientos UTF-16 sobre el crudo; la correspondencia colapsado→crudo se calcula en un ayudante privado del mismo módulo); en `cotejar`, tras localizar: las tres reglas del salto (abajo) con un mensaje que nombra el fichero y la regla, y un fallo por cada `lineas:` declarada fuera de `FORMAS_DE_LINEAS` con la ruta del documento -- la puerta del build.
- `tools/lib/documento.ts` -- `lineas?` en `CabeceraDeDocumento`, escrita por `componerDocumento` y leída por `analizarDocumento` -- la cabecera manda desde la v9.
- `tools/lib/corpus.ts` + `integraciones/cotejo.ts` -- lectura única de cuerpos y `lineas:` para el cotejo; `lineas?` en `leerDocumentosDeclarados` -- sin segunda pasada por los 1.422 documentos.
- `tools/recuperar.ts` -- en el documento nuevo, `lineas: formaDeLasLineas({ cuerpo: derivado.cuerpo.trim() })` (lo mismo que se escribe); nunca un valor fuera del conjunto -- los documentos de la v9 declaran su forma.
- `tools/extraer.ts`, `tools/alta.ts`, `tools/lib/documentacion.ts` -- componer el `texto` que escriben con `textoConSaltos` (extraer: su documento; alta y documentar: `documentoParaLosSaltos` sobre los candidatos, con `--texto` también) y decir en el parte los saltos descartados -- escritor único.
- `src/lib/admision.ts` -- reglas de AD-29 en `texto` -- el salto solo como U+000A.
- `tools/lib/tarjetaDelVerso.ts` (nuevo, puro) -- `lineasDeTarjetaEnVerso(texto, cuerpo)`: `repartirEnLineas` de cada verso por separado, «» en el primero y el último; `altoDeTarjeta(texto, conProcedencia)`: `2·80 + líneas·round(cuerpo·1,3) + 40 + 24 + 34 + (30)` con el `cuerpo` de `tramoDe`; `undefined` si no admite Imagen -- la geometría de `svgDeTarjeta` sin tocar `src/`.
- `tools/lineas.ts` (nuevo, solo lectura) -- `formas`: reparto de `corpus/fuentes/` por Fuente y forma, y si es declarada o calculada; `tarjeta`: Citas publicadas que ganarían saltos (`documentosDeCita` + `documentoParaLosSaltos` + `textoConSaltos`), por forma; cuántas admiten Imagen; para cada una slug, caracteres, versos, líneas, alto de hoy (sin saltos) y alto con saltos; lista de las que pasan de 630 y su recuento. No escribe nada; 2 por invocación mala, 1 si el Corpus no se deja leer -- reproducible para Héctor.
- `tests/unit/ayuda/lineas/` (nuevo) -- copias de documentos reales: `wikisource-es--versos-sencillos--versos-sencillos-i.txt` (`verso`), `gutenberg--a-flor-de-piel-frases.txt` (10 KB, `prosa-ajustada`), un `verso-espaciado` con su pie de licencia (p. ej. `wikisource-es--a-un-avariento.txt`), un `prosa-por-lineas` (p. ej. `wikisource-es--plenitud--plenitud-liv-la-libertad.txt`) y uno que mezcla (p. ej. `wikisource-es--el-perro-fiel-fedro.txt`), más un tramo de `gutenberg--origenes-de-la-novela-tomo-ii.txt` (cabecera + unas 200 líneas a ~40 columnas, que debe dar `prosa-ajustada` o `indeterminada`) -- fixtures de forma.
- `tests/unit/lineas.test.ts` (nuevo) -- forma de cada fixture; `textoConSaltos` con la matriz (verso, estrofa, prosa, sin documento, tecleado) y la propiedad «colapsa a lo mismo» sobre todos los fixtures; `tramoEnCrudo` con la matriz «Crudo» y la propiedad; la guarda de dueños (abajo); `altoDeTarjeta` contrastado con `svgDeTarjeta` real para un texto sin saltos de cada tramo (el `y` del primer `<text>` implica el mismo bloque); los cinco valores de `FORMAS_DE_LINEAS`.
- `tests/unit/puerta-de-admision.test.ts`, `cotejo.test.ts`, `cotejo-build.test.ts`, `normalizar-y-slug.test.ts`, `recuperar-cli.test.ts`, `extraer-cli.test.ts`, `alta.test.ts`, `documentar-cli.test.ts` -- lo que cada AC de abajo nombra.
- `AGENTS.md` -- «Una sesión de sembrado»: `extraer` y `recuperar` conservan el verso (forma de líneas, `lineas:` en los documentos nuevos, un salto nunca se teclea; `npx tsx tools/lineas.ts formas|tarjeta`); «Documentar una Cita ya publicada»: `--texto` toma los saltos del documento, no de lo tecleado.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` -- los comentarios de la 29.2, la 29.3 y la 29.4 ya dicen que no empiezan sin la decisión de Héctor: comprobar que siguen; tocar solo la línea de la 29.1.
- Este spec -- rellenar «Reparto de los documentos por forma», «Cifras para la decisión de la Tarjeta Social» y «Tiempo de construcción y `dist/`».

**Acceptance Criteria:**
- Given el esquema, when un `texto` de dos versos se escribe con `aYaml` y se construye, then el fichero dice `"…partes,\nY hacia…"`, la construcción pasa (con su documento de verso en el Corpus de la prueba) y lo leído da el mismo U+000A; y cada forma rechazada de la matriz falla con la regla (`citaAdmisible.safeParse`) y, una de ellas, en un build que nombra el fichero (`puerta-de-admision.test.ts`).
- Given «Yo vengo de todas partes,\nY hacia todas partes voy:\nArte soy entre las artes,\nEn los montes, monte soy.» y la misma en una línea, when se cotejan contra *Versos sencillos* I, se normalizan, se les calcula `huellaDeTexto`, `slugDeCita` y `tramoDe`, then todo coincide (`normalizar-y-slug.test.ts`, `cotejo.test.ts`).
- Given la puerta del cotejo, when se construyen una Cita con saltos sin documento de verso, una con un `\n` sin salto del crudo debajo, una del censo con `\n` y una con saltos respaldados, then las tres primeras rompen nombrando su fichero y la regla incumplida y la cuarta construye; basta un documento del conjunto que cumpla (`cotejo-build.test.ts`). Un documento con `lineas:` fuera del conjunto rompe el build nombrándolo (`cotejo.test.ts`, puro).
- Given `recuperar` con la respuesta de la Fuente fijada, when versiona un documento de verso y uno de prosa, then la cabecera lleva `lineas: verso` y `lineas: prosa-ajustada` o `prosa-por-lineas` según el cuerpo, y recuperar uno ya versionado no lo reescribe (`recuperar-cli.test.ts`).
- Given un documento de verso y uno de prosa, when `extraer`, el alta (lote y `sembrar` por la misma función) y `documentar` (con y sin `--texto`, también con un `\n` tecleado) escriben una Cita de cada uno, then de verso sale con sus saltos y de prosa en una línea, y un salto tecleado sin respaldo se descarta y el parte lo dice (`extraer-cli.test.ts`, `alta.test.ts`, `documentar-cli.test.ts`).
- Given la guarda de dueños, when se recorren `tools/`, `src/`, `integraciones/` y `public/islas/`, then `formaDeLasLineas`, `textoConSaltos`, `documentoParaLosSaltos` y `FORMAS_DE_LINEAS` solo se definen en `tools/lib/lineas.ts` y `tramoEnCrudo` solo en `tools/lib/cotejo.ts`; los nombres de las cinco formas como literal de cadena (`'verso'`, `"prosa-ajustada"`…) solo aparecen en `tools/lib/lineas.ts` (hoy no aparecen en ningún otro fichero de esos cuatro árboles); y los módulos que importan esas funciones son exactamente una lista declarada en la prueba (`tools/lib/cotejo.ts`, `tools/recuperar.ts`, `tools/extraer.ts`, `tools/alta.ts`, `tools/lib/documentacion.ts` y `tools/lineas.ts`; `documento.ts` y `corpus.ts` llevan `lineas:` en crudo y no la interpretan), que la 31.1 y la 32.3 amplían en su diff.
- Given el Corpus real, when se corre `npx tsx tools/lineas.ts formas`, then el spec anota el reparto por Fuente y forma y lo compara con la espina (Gutenberg ~263/267 `prosa-ajustada`; Wikisource ~143 `verso-espaciado`); ningún documento de Gutenberg sale `verso` ni `verso-espaciado`, ni los índices y la carta de la «Code Map».
- Given el Corpus real y sin escribir en `corpus/`, when se corre `npx tsx tools/lineas.ts tarjeta`, then el spec anota cuántas Citas ganarían saltos por forma, cuántas admiten Imagen, el alto de la Tarjeta de cada una con y sin saltos, y nombra con slug y alto cada una que pasa de 630 px y cuántas son (o que no hay ninguna).
- Given `npm run build` sobre el Corpus real con `FECHA_JORNADA` fija, when se construye antes (en `baseline_revision`) y después, then los dos pasan, el spec anota los dos tiempos, y ningún `.html` de `dist/` difiere; `git diff --stat corpus/` sale vacío.

## Design Notes

**Las tres reglas de la puerta** (en el orden en que se informan): 1) la Cita tiene `\n` y su texto no se localiza en ningún documento suyo de forma `verso`/`verso-espaciado`; 2) se localiza, pero en cada uno de esos documentos algún `\n` cae —por `tramoEnCrudo` sobre la primera aparición— en una racha del crudo sin salto; 3) la Cita no tiene documento (censo) y lleva `\n`. La puerta no exige todos los saltos del documento; eso lo hace el escritor (y, desde la 29.2, la puerta de la restitución). Solo se calcula la forma de los documentos que cotejan una Cita con saltos (memoizada por nombre): hoy ninguna, así que el coste es la lectura de `lineas:`.

**Correspondencia de rachas.** El texto se recorre por rachas de espacio (`/\s+/`): la k-ésima racha del texto corresponde al k-ésimo espacio del texto colapsado dentro del tramo localizado, y ese espacio a una racha del crudo (con invisibles en medio, si los hay); hay salto si esa racha del crudo contiene `\n`. Invisibles y letras del texto no se tocan.

**Un clasificador que se probó al planificar** (un prototipo fuera del repositorio; aquí su receta). Bloques = líneas no vacías entre líneas en blanco. *Ajuste*: sobre las líneas internas de bloques de ≥ 3 líneas, la fracción que a la vez (a) no cabe con la primera palabra de la siguiente en el máximo del bloque, (b) no acaba en signo y (c) va seguida de minúscula; ≥ 0,5 con ≥ 30 líneas → `prosa-ajustada`, ≥ 0,5 con menos → `indeterminada`. *Verso*: tolerando solo las líneas largas (> 90) del final —el pie de licencia—, mediana ≤ 55 y p90 ≤ 75; ≥ 90 % de bloques de una línea (y ≥ 4) → `verso-espaciado`; ≥ 90 % de líneas en bloques de varias → `verso`. *Prosa por líneas*: ≥ 90 % de bloques de una línea y mediana ≥ 100. Lo demás, `indeterminada`. Dio Gutenberg 267/267 `prosa-ajustada`; Wikisource 115 `verso-espaciado`, 58 `verso`, 19 `prosa-ajustada`, 527 `prosa-por-lineas`, 436 `indeterminada`; ~75 Citas ganarían saltos, la más alta de Calderón con 7 versos (~631 px). Falsos positivos que corregir: la tolerancia de líneas largas en cualquier sitio dejó como `verso-espaciado` una carta corta y un índice; `maria--maria-isaacs` (índice) salió `verso`. Es punto de partida, no contrato: el contrato son los fixtures y las AC del reparto.

## Verification

**Commands:**
- `npx vitest run tests/unit/lineas.test.ts` -- en verde.
- `npx vitest run tests/unit/<cada fichero de la lista>` -- uno por uno, en verde.
- `npx astro check` -- sin errores (abarca `tools/` y las pruebas).
- `npx tsx tools/lineas.ts formas` y `npx tsx tools/lineas.ts tarjeta` -- salen con 0 y no tocan `git status`.
- `npm run build` antes y después (por `correr.sh`), `diff -rq` de los `.html` -- iguales; `git diff --stat corpus/` vacío.
- `npm test` entero (por `correr.sh`) -- en verde.

## Reparto de los documentos por forma

_Lo rellena la implementación con la salida de `npx tsx tools/lineas.ts formas` y la comparación con la espina._

## Cifras para la decisión de la Tarjeta Social

_Lo rellena la implementación con la salida de `npx tsx tools/lineas.ts tarjeta`: Citas que ganarían saltos por forma; cuántas admiten Imagen; tabla slug · caracteres · versos · alto sin saltos · alto con saltos; las que pasan de 630 px y cuántas son. La decisión es de Héctor y se anota aquí antes de abrir la 29.2 o la 29.3._

## Tiempo de construcción y `dist/`

_Lo rellena la implementación: tiempo de `npm run build` en `baseline_revision` y al cerrar, y el resultado de comparar los `.html`._

## Spec Change Log

## Review Triage Log

## Auto Run Result

Status: ready-for-dev
Blocking condition: ninguna. Planificación terminada (Halt after planning); la implementación rellena las tres secciones de cifras, y la decisión de la Tarjeta Social es de Héctor.

---
title: 'Historia 29.1 — El salto de verso sobrevive en el Corpus, el cotejo y el slug'
type: 'feature'
created: '2026-11-07'
status: 'done'
baseline_revision: '6b58bb0429112a579348170e3ea741df9f854370'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-29-context.md'
warnings: [oversized]
deferred:
  - summary: >-
      Los saltos y la regla 2 de la puerta se juzgan sobre la primera aparición del texto en el documento de verso; un estribillo o una nota editorial que cite el verso en una línea antes del poema dejarían a la Cita sin saltos.
    evidence: |-
      textoConSaltos y reglaDelSalto usan localizar (indexOf) y por tanto la primera aparición. El resultado es conservador —la Cita queda en una línea, como hoy, y el escritor y la puerta coinciden—, pero la restitución de la 29.2 puede perder saltos válidos en un poema con estribillo. Ninguna prueba lo cubre.
    location: >-
      tools/lib/lineas.ts (textoConSaltos), tools/lib/cotejo.ts (reglaDelSalto)
    severity: low
  - summary: >-
      revisar --aprobar (que conserva el texto de la candidata) y tools/sembrar.ts (que pasa por darDeAltaLote) no tienen prueba propia con un texto con saltos.
    evidence: |-
      Hoy se cumple por construcción: revisión copia el fichero de la candidata sin recomponer el texto y sembrar llama a darDeAltaLote, que sí está probado en alta.test.ts. Una prueba de cada orden con una candidata o una semilla con \n lo fijaría frente a cambios futuros.
    location: >-
      tools/lib/revision.ts, tools/sembrar.ts
    severity: low
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

Salida de `npx tsx tools/lineas.ts formas` sobre el Corpus real de la rama (HEAD `6b58bb0429`, 1.422 documentos `.txt` de `corpus/fuentes/`; los cuatro `.indice.yml` no son documentos). Sale con 0 y no toca `git status`. Ningún documento declara aún `lineas:` (todos son anteriores a la v9), así que todo es calculado:

```
gutenberg (267):
  prosa-ajustada       267   (declarada 0, calculada 267)

wikisource-es (1155):
  verso                 57   (declarada 0, calculada 57)
  verso-espaciado       96   (declarada 0, calculada 96)
  prosa-por-lineas     513   (declarada 0, calculada 513)
  prosa-ajustada        19   (declarada 0, calculada 19)
  indeterminada        470   (declarada 0, calculada 470)
```

`npx tsx tools/lineas.ts formas --detalle` añade la lista nominal de los 153 documentos de verso.

**Comparación con la espina.** Gutenberg: 267/267 `prosa-ajustada` (la espina decía ~263/267); ninguno sale `verso` ni `verso-espaciado`, tampoco `gutenberg--origenes-de-la-novela-tomo-ii.txt`/`-iii.txt`. Wikisource: 96 `verso-espaciado` frente a los ~143 de la espina, más 57 `verso` (153 documentos de verso en total). La diferencia con la espina no es una forma perdida: el prototipo de la planificación daba 115 `verso-espaciado` con falsos positivos conocidos, y al cerrarlos cayeron índices de una entrada por línea (`maria--maria-isaacs`, `en-torno-al-casticismo`, `campos-de-castilla`, `la-hermana-de-la-caridad`, `el-primer-loco`, el índice de *Las tres musas últimas castellanas*), páginas de unas pocas líneas cortas seguidas de prosa larga, que una tolerancia sin límite de las líneas largas del final daba por verso (`influencia-de-la-vida-del-campo-en-la-familia-rosario-de`, la portada y la lista de ediciones de `viaje-del-parnaso`; ahora se tolera una sola línea larga en cada extremo), y la carta corta (`carta-a-jose-marti-y-zayas-bazan`) nunca entró. Lo que queda en `indeterminada` con bloques de una línea y líneas cortas se revisó a mano (83 documentos): son prosa dialogada (Platón, Terencio en prosa, Cervantes en prosa), cartas y notas, no verso. Las piezas en verso con acotaciones (*La elección de los alcaldes de Daganzo*, *El rufián viudo*, *La vida es sueño*, *Los empeños de una casa*) entran porque se toleran unas pocas líneas largas (≤ 1 %) en documentos de 100 líneas o más. Juicio: el reparto no contradice la espina **por mucho** en el sentido del «Block If» —Gutenberg casa, y la cifra de Wikisource baja por los falsos positivos que la propia espina pedía corregir—, así que no se bloquea; la cifra queda aquí para Héctor.

Trampas de la «Code Map», todas fuera del verso: `gutenberg--origenes-de-la-novela-tomo-ii.txt` y `-iii.txt` → `prosa-ajustada`; `maria--maria-isaacs`, `en-torno-al-casticismo` y `carta-a-jose-marti-y-zayas-bazan` → `indeterminada`; el pie de licencia de Wikisource se retira antes de juzgar. `a-una-nariz` (Góngora) sale `verso`, que es lo que es.

## Cifras para la decisión de la Tarjeta Social

Salida de `npx tsx tools/lineas.ts tarjeta` sobre el Corpus real (sale con 0; no escribe nada en `corpus/`; `git status` igual antes y después). Para cada Cita publicada con Fuente: los candidatos de `documentosDeCita`, el documento de los saltos de `documentoParaLosSaltos` y el texto de `textoConSaltos`; cuenta las que ganarían al menos un salto. El alto es el de `altoDeTarjeta` (`tools/lib/tarjetaDelVerso.ts`: 2·80 + líneas·round(cuerpo·1,3) + 40 + 24 + 34 + 30 con procedencia, el cuerpo de `tramoDe`, cada verso repartido por separado con `repartirEnLineas`), contrastado en `tests/unit/lineas.test.ts` con el `y` de `svgDeTarjeta` real para un texto sin saltos de cada tramo. Todas llevan procedencia.

- **Citas que ganarían saltos: 75** — de documento `verso`: 65; de documento `verso-espaciado`: 10.
- **Admiten Imagen (Tarjeta con texto): 75** de 75.
- **Pasan de 630 px con saltos: 3**, las tres de Calderón, de 7 versos, con 631 px (484 px sin saltos):
  - `pedro-calderon-de-la-barca-contra-vosotros-naciendo-aunque-si-naci-ya` · 631 px
  - `pedro-calderon-de-la-barca-entre-las-flores-se-quiebra-cuando-musico` · 631 px
  - `pedro-calderon-de-la-barca-ni-que-pueda-preguntarte-solo-dire-que` · 631 px

La siguiente es de 582 px (las de 6 versos: Quevedo, Góngora, Sor Juana).

| slug | caracteres | versos | líneas en la Tarjeta | alto sin saltos (px) | alto con saltos (px) |
|---|---|---|---|---|---|
| pedro-calderon-de-la-barca-contra-vosotros-naciendo-aunque-si-naci-ya | 178 | 7 | 7 | 484 | 631 |
| pedro-calderon-de-la-barca-entre-las-flores-se-quiebra-cuando-musico | 177 | 7 | 7 | 484 | 631 |
| pedro-calderon-de-la-barca-ni-que-pueda-preguntarte-solo-dire-que | 179 | 7 | 7 | 484 | 631 |
| francisco-de-quevedo-alma-a-quien-todo-un-dios-prision | 221 | 6 | 6 | 533 | 582 |
| francisco-de-quevedo-entre-en-mi-casa-vi-que-amancillada | 218 | 6 | 6 | 533 | 582 |
| francisco-de-quevedo-llevada-de-enganoso-pensamiento-y-de-esperanza | 214 | 6 | 6 | 533 | 582 |
| luis-de-gongora-goza-cuello-cabello-labio-y-frente-antes | 235 | 6 | 6 | 533 | 582 |
| sor-juana-ines-de-la-cruz-es-un-vano-artificio-del-cuidado-es | 210 | 6 | 6 | 533 | 582 |
| sor-juana-ines-de-la-cruz-si-a-este-pago-padece-mi-deseo | 220 | 6 | 6 | 533 | 582 |
| sor-juana-ines-de-la-cruz-sigan-tu-sombra-en-busca-de-tu | 211 | 6 | 6 | 533 | 582 |
| antonio-machado-quien-prefiere-lo-vivo-a-lo-pintado | 75 | 2 | 4 | 507 | 580 |
| antonio-machado-al-andar-se-hace-camino-y-al | 101 | 4 | 4 | 468 | 528 |
| antonio-machado-como-no-sabeis-la-hora-en-que | 99 | 4 | 4 | 468 | 528 |
| antonio-machado-el-bueno-es-el-que-guarda-cual | 103 | 2 | 4 | 468 | 528 |
| gonzalo-de-berceo-quanto-aqui-vivimos-en-ageno-moramos-la | 151 | 4 | 4 | 528 | 528 |
| jose-marti-con-los-pobres-de-la-tierra-quiero-2 | 105 | 4 | 4 | 468 | 528 |
| jose-marti-cultivo-una-rosa-blanca-en-julio-como | 92 | 4 | 4 | 468 | 528 |
| jose-marti-denle-al-vano-el-oro-tierno-que | 114 | 4 | 4 | 468 | 528 |
| jose-marti-oculto-en-mi-pecho-bravo-la-pena | 106 | 4 | 4 | 468 | 528 |
| jose-marti-rapida-como-un-reflejo-dos-veces-vi | 106 | 4 | 4 | 468 | 528 |
| jose-marti-si-dicen-que-del-joyero-tome-la | 94 | 4 | 4 | 468 | 528 |
| jose-marti-todo-es-hermoso-y-constante-todo-es | 103 | 4 | 4 | 468 | 528 |
| jose-marti-y-para-el-cruel-que-me-arranca | 104 | 4 | 4 | 468 | 528 |
| jose-marti-yo-he-visto-al-aguila-herida-volar | 94 | 4 | 4 | 468 | 528 |
| jose-marti-yo-he-visto-el-oro-hecho-tierra | 110 | 4 | 4 | 468 | 528 |
| jose-marti-yo-se-que-el-necio-se-entierra | 121 | 4 | 4 | 468 | 528 |
| jose-marti-yo-vengo-de-todas-partes-y-hacia | 103 | 4 | 4 | 468 | 528 |
| luis-de-gongora-cosas-celalba-mia-he-visto-extranas-cascarse | 144 | 4 | 4 | 528 | 528 |
| luis-de-gongora-duelete-de-esa-puente-manzanares-mira-que | 141 | 4 | 4 | 528 | 528 |
| pedro-calderon-de-la-barca-negandose-a-la-piedad-del-nido-que | 96 | 4 | 4 | 468 | 528 |
| sor-juana-ines-de-la-cruz-detente-sombra-de-mi-bien-esquivo-imagen | 145 | 4 | 4 | 528 | 528 |
| sor-juana-ines-de-la-cruz-en-perseguirme-mundo-que-interesas-en-que | 151 | 4 | 4 | 528 | 528 |
| sor-juana-ines-de-la-cruz-feliciano-me-adora-y-le-aborrezco-lizardo | 148 | 4 | 4 | 528 | 528 |
| sor-juana-ines-de-la-cruz-hombres-necios-que-acusais-a-la-mujer | 102 | 4 | 4 | 468 | 528 |
| sor-juana-ines-de-la-cruz-yo-no-estimo-tesoros-ni-riquezas-y | 142 | 4 | 4 | 528 | 528 |
| antonio-machado-ah-cuando-yo-era-nino-sonaba-con | 59 | 2 | 3 | 434 | 507 |
| antonio-machado-confiemos-en-que-no-sera-verdad-nada | 55 | 3 | 3 | 434 | 507 |
| antonio-machado-despacito-y-buena-letra-el-hacer-las | 77 | 3 | 3 | 507 | 507 |
| antonio-machado-en-mi-soledad-he-visto-cosas-muy | 59 | 3 | 3 | 434 | 507 |
| antonio-machado-la-verdad-es-lo-que-es-y | 72 | 3 | 3 | 507 | 507 |
| antonio-machado-no-te-importe-con-el-barro-de | 80 | 3 | 3 | 507 | 507 |
| antonio-machado-solo-si-viene-un-corazon-al-mundo | 75 | 2 | 3 | 507 | 507 |
| antonio-machado-vereis-como-el-poeta-admira-y-calla | 62 | 2 | 3 | 434 | 507 |
| francisco-de-quevedo-que-sin-poder-saber-como-ni-adonde | 70 | 2 | 3 | 507 | 507 |
| antonio-machado-virtud-es-fortaleza-ser-bueno-es-ser | 187 | 4 | 4 | 484 | 484 |
| gonzalo-de-berceo-sennores-e-amigos-lo-que-dicho-avemos | 165 | 4 | 4 | 484 | 484 |
| gonzalo-de-berceo-todos-quantos-vevimos-que-en-piedes-andamos | 171 | 4 | 4 | 484 | 484 |
| andres-bello-cuanto-el-valor-y-el-patriotismo-pueden | 94 | 3 | 3 | 468 | 468 |
| antonio-machado-responde-al-hachazo-ha-dicho-el-buda | 83 | 3 | 3 | 408 | 468 |
| jose-manuel-de-navarrete-oh-mexico-sin-duda-yo-gozara-del | 103 | 3 | 3 | 468 | 468 |
| jose-manuel-de-navarrete-todo-el-mundo-se-llena-de-alegria | 109 | 3 | 3 | 468 | 468 |
| antonio-machado-buen-cazador-de-si-mismo-siempre-en | 44 | 2 | 2 | 434 | 434 |
| antonio-machado-caminante-no-hay-camino-sino-estelas-en | 49 | 2 | 2 | 434 | 434 |
| antonio-machado-con-el-puno-en-la-mejilla-todo | 49 | 2 | 2 | 434 | 434 |
| antonio-machado-cuando-cielo-y-tierra-pasen-mi-palabra | 48 | 2 | 2 | 434 | 434 |
| antonio-machado-en-suenos-lucha-con-dios-y-despierto | 50 | 2 | 2 | 434 | 434 |
| antonio-machado-espanolito-que-vienes-al-mundo-te-guarde | 47 | 2 | 2 | 434 | 434 |
| antonio-machado-haz-tu-copa-y-no-te-importe | 54 | 2 | 2 | 434 | 434 |
| antonio-machado-mancebo-llena-tu-jarro-que-ya-te | 44 | 2 | 2 | 434 | 434 |
| antonio-machado-ni-aunque-te-elogie-un-bruto-ha | 47 | 2 | 2 | 434 | 434 |
| antonio-machado-nunca-extraneis-que-un-bruto-se-descuerne | 63 | 2 | 2 | 434 | 434 |
| antonio-machado-todas-tus-palabras-fueron-una-palabra-velad | 45 | 2 | 2 | 434 | 434 |
| antonio-machado-todo-el-que-camina-anda-como-jesus | 50 | 2 | 2 | 434 | 434 |
| antonio-machado-todo-necio-confunde-valor-y-precio | 35 | 2 | 2 | 434 | 434 |
| antonio-machado-un-hombre-a-tientas-camina-lleva-a | 56 | 2 | 2 | 434 | 434 |
| antonio-machado-una-de-las-dos-espanas-ha-de | 48 | 2 | 2 | 434 | 434 |
| antonio-machado-volvamos-a-la-verdad-vanidad-de-vanidades | 43 | 2 | 2 | 434 | 434 |
| antonio-machado-yo-vivo-en-paz-con-los-hombres | 60 | 2 | 2 | 434 | 434 |
| fernan-gonzalez-de-eslava-por-que-mi-dios-me-soltais-y | 54 | 2 | 2 | 434 | 434 |
| jose-marti-cultivo-una-rosa-blanca-en-junio-como | 43 | 2 | 2 | 434 | 434 |
| pedro-calderon-de-la-barca-soy-un-hombre-de-las-fieras-y | 56 | 2 | 2 | 434 | 434 |
| pedro-calderon-de-la-barca-viendo-que-el-ver-me-da-muerte | 55 | 2 | 2 | 434 | 434 |
| teresa-de-jesus-la-paciencia-todo-lo-alcanza | 29 | 2 | 2 | 361 | 434 |
| teresa-de-jesus-quien-a-dios-tiene-nada-le-falta | 34 | 2 | 2 | 434 | 434 |
| antonio-machado-el-mas-truhan-se-lleva-la-mano | 83 | 2 | 2 | 408 | 408 |

**Margen de error de estas cifras, dicho para la decisión** (revisión de la 29.1, primera pasada externa). El veredicto «tres pasan» depende de 1 px (631 frente a 630), así que conviene separar qué es exacto y qué es modelo:

- **Lo vertical es aritmética entera, no estimación.** `altoDeTarjeta` repite la cuenta de `svgDeTarjeta` —renglón `round(cuerpo·1,3)`, 40 hasta el filete, 24 + 34 + 30 de la atribución, márgenes de 80— y `tests/unit/lineas.test.ts` la contrasta con el `y` real de `svgDeTarjeta` para un texto sin saltos de cada tramo. La única hipótesis añadida es la que la propia AC fija: **un salto abre un renglón nuevo del mismo alto**. Con 7 renglones de 49 px (cuerpo 38, tramo `md`) el bloque es 7·49 + 128 = 471 px y el hueco entre márgenes 470: de ahí el 631.
- **El número de renglones tampoco es estimación en estas tres.** Cada verso se reparte con el mismo `repartirEnLineas` que usa la Tarjeta real, y aquí ninguno se acerca al ancho útil (1.040 px): renderizado, el verso más ancho de las tres llega a x = 578. Cada verso es un renglón con más de 450 px de holgura, así que un error de la estimación de anchos de `lienzo.ts` no cambia el 7.
- **Se comprobó contra un renderizado real**, sin tocar `src/`: un guion de la revisión (fuera del repositorio) compuso el SVG del verso con la misma estructura que `svgDeTarjeta` —los renglones de `lineasDeTarjetaEnVerso` en lugar de los del texto corrido— y lo rasterizó con `sharp`, como `src/pages/tarjeta/[slug].png.ts`. Las tintas medidas casan con el modelo: primer verso desde y ≈ 89 (línea base 118), filete en 456–457, Autor hasta 496, procedencia («La vida es sueño», sin descendentes) hasta 532 y la marca del pie desde 535 (la tilde de «SABIDURÍA»; su línea base, fija, en 558).
- **Qué significa pasar de 630 aquí.** El alto incluye los dos márgenes de 80: con 631 **nada sale del lienzo ni se corta**; el bloque se come 1 px del margen inferior, que es donde vive la marca. El efecto visible es que entre la procedencia y la marca quedan unos 2 px de aire (frente a unos 3 en una Tarjeta que llenara justo los 630, y unos 28 en las de 582 px). Una procedencia con descendentes («g», «p», «y») sí tocaría la marca; la de estas tres no los tiene. La Tarjeta de hoy, sin saltos, de esas tres Citas mide 484 px y no se acerca.
- **Confianza.** Que con saltos esas tres miden 631 px según la geometría de `svgDeTarjeta` es seguro (aritmética contrastada y renderizado que la confirma); que la siguiente es 582 y no hay ninguna entre 583 y 630, también. Lo que **no** es seguro es cómo pintará la 29.3 el verso —si mantiene renglón y atribución tal cual—: estas cifras valen para «la geometría de hoy con un renglón por salto», que es lo que la AC pide medir.

**Decisión de Héctor** (cambiar el reparto de `src/lib/tramos.ts` o componer sin texto la Tarjeta de estas tres, u otra): _pendiente; se anota aquí antes de abrir la 29.2 o la 29.3._

## Tiempo de construcción y `dist/`

`npm run build` con `FECHA_JORNADA=2026-11-07`, por `correr.sh`, sobre el Corpus real de la rama:

- **Antes** (HEAD `6b58bb0429`, el `baseline_revision`, que solo difiere de `bcd8a3a391` en este spec): **142 s**, `EXIT:0`; «4403 Citas cotejadas contra su documento; 21 pendientes de cotejo de un tope de 38». La construcción arrancó con el árbol limpio, pero la primera edición de la historia (el esquema de `texto` en `src/lib/admision.ts`, que solo rechaza y no cambia ninguna salida) cayó durante ella: esa línea base está contaminada y no vale como medida limpia.
- **Después** (con la 29.1, antes del commit de la historia): **108 s**, `EXIT:0`; el mismo «4403 Citas cotejadas… 21 pendientes».
- Una corrida de cada lado no sostiene ninguna afirmación sobre el coste: la diferencia es del orden del ruido de la máquina (la primera pasada calentó cachés). Lo que sí se puede decir del código es que el cotejo solo añade leer `lineas:` en la misma pasada y no calcula ninguna forma, porque ninguna Cita tiene hoy un salto. Las corridas repetidas de la revisión están abajo.
- **`dist/`**: `diff -rq` de los 5.295 `.html` de antes y de después: **sin ninguna diferencia**. El peso total se movió 30 bytes (508.852.717 → 508.852.687), todos en `pagefind/filter/` (52.636 → 52.607 bytes), que Pagefind no compone byte a byte igual entre dos construcciones; ninguna página cambia. De esa primera comparación no quedó registro en `logs/`; la de la revisión, sí (abajo).
- `git diff --stat corpus/`: vacío.

**Repetido en la revisión** (HEAD `27215bee79`, con los parches de la primera pasada externa), cuatro construcciones seguidas con `FECHA_JORNADA=2026-11-07` y el árbol limpio, alternando el código de la historia y el de `6b58bb0429` (los nueve ficheros de código que la historia cambia, puestos con `git checkout` y restaurados al terminar), registradas en `.claude/v9-ralph/logs/s-29/triage-29.1-1-builds.log`:

| construcción | código | segundos | cotejo |
|---|---|---|---|
| 1 | después (HEAD) | 112 | 4403 cotejadas; 21 pendientes de un tope de 38 |
| 2 | antes (`6b58bb0429`) | 110 | ídem |
| 3 | después | 109 | ídem |
| 4 | antes | 108 | ídem |

Media de 110,5 s después y 109 s antes: una diferencia de 1,5 s, dentro de lo que varía una misma versión entre dos corridas (3 s la de después, 2 s la de antes). No se ve coste. `diff -rq` de los 5.295 `.html` de la construcción 1 frente a la 2: **sin diferencias**.

## Spec Change Log

## Review Triage Log

### 2026-11-07 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

Esta entrada se escribió en la pasada de implementación, antes de que corrieran las cinco capas externas (blind-hunter, edge-case-hunter, verification-gap, intent-alignment, ac-auditor) del bucle v9-ralph: «sin hallazgos» quería decir que esa pasada no los tenía, no que las capas los hubieran descartado. Sus hallazgos se triaron en la entrada siguiente.

### 2026-11-07 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 17 (high 0, medium 4, low 13)
- defer: 2 (high 0, medium 0, low 2)
- reject: 14 (high 0, medium 0, low 14)
- addressed_findings:
  - `[medium]` `[patch]` U+FEFF casa con `\s` pero `colapsarEspacios` lo retira: la correspondencia con el crudo contaba una racha de solo marcas como espacio y desplazaba todo lo de detrás, y `textoConSaltos` insertaba un espacio (NFR-12). Las rachas las recorre ahora una sola función de `tools/lib/cotejo.ts`, `rachasDeEspacio`, con `UN_INVISIBLE` derivado de `INVISIBLES`; la usan `tramoEnCrudo` y `textoConSaltos`. Pruebas con U+FEFF en la matriz «Crudo» y en el escritor.
  - `[medium]` `[patch]` El esquema de `texto` rechaza también U+2028, U+2029, U+0085, `\v` y `\f`, y cualquier espacio (duro, fino) pegado a un salto, no solo el normal y el tabulador; U+FEFF junto al salto se admite porque el escritor lo conserva. Filas nuevas en `puerta-de-admision.test.ts`.
  - `[medium]` `[patch]` `tools/lineas.ts` gana `tests/unit/lineas-cli.test.ts` (execFile sobre un Corpus temporal): códigos 2 y 1, el filtro de `tarjeta` (solo las que ganan un salto), el orden, el alto sin y con saltos y la lista de las que pasan de 630. `--detalle` se lee de `argumentos`, es solo de `formas`, y una bandera repetida sale con 2.
  - `[medium]` `[patch]` El veredicto 631/630: el spec dice en «Cifras para la decisión de la Tarjeta Social» qué es aritmética exacta y qué es modelo, que el alto incluye los márgenes (nada se sale ni se corta: el bloque se come 1 px del margen inferior, donde vive la marca) y lo comprueba contra un renderizado real con `sharp` del SVG del verso, sin tocar `src/`.
  - `[low]` `[patch]` El conjunto de invisibles ya no se escribe tres veces: lo que quedaba en `lineas.ts` se va, y la guarda de dueños fija `rachasDeEspacio` en `cotejo.ts`.
  - `[low]` `[patch]` `conEspacio.includes(racha)` (cuadrático) y `Math.max(...)` sobre listas largas se cambian por la marca de la racha y por `reduce`.
  - `[low]` `[patch]` El comentario huérfano de `ACABA_EN_SIGNO` vuelve a su constante.
  - `[low]` `[patch]` La regla 1 de la puerta ya no dice «no lo son» de documentos que pueden ser de verso sin el texto dentro.
  - `[low]` `[patch]` `formas` cuenta aparte la `lineas:` no válida («declaración no válida»), la lista, y dice cuántos `.txt` de `corpus/fuentes/` no entran en el reparto.
  - `[low]` `[patch]` `tools/alta.ts`: un `texto` o una `procedencia.obra` que no son cadena llegan al esquema en vez de lanzar en el escritor.
  - `[low]` `[patch]` `documentar` dice los saltos que la Cita gana o pierde frente a lo publicado, no todos los que acaba teniendo.
  - `[low]` `[patch]` `documentar` se niega con un motivo, sin escribir, si `corpus/fuentes/` no se deja leer, en vez de salir por una excepción.
  - `[low]` `[patch]` `extraer` avisa en el parte de una `lineas:` fuera del conjunto, que el build rechazará.
  - `[low]` `[patch]` Una cabecera `lineas:` vacía ya no se da por ausente: `analizarDocumento` la entrega y el cotejo la rechaza nombrando el documento (prueba en `cotejo.test.ts`).
  - `[low]` `[patch]` La guarda de dueños fija además quién importa `tramoEnCrudo` y `rachasDeEspacio` de `cotejo.ts` (hoy solo `tools/lib/lineas.ts`).
  - `[low]` `[patch]` `AGENTS.md`: las candidatas de `corpus/_revision/` anteriores a la 29.1 se publican en una línea salvo que se regeneren con `extraer`; `documentar` lee las cabeceras de todo `corpus/fuentes/` (2–3 s) y se niega con 1 si alguna no se deja leer.
  - `[low]` `[patch]` El spec ya no da por buenos sin matiz el estado `done` previo, el tiempo de una sola construcción con la línea base contaminada ni el `dist/` idéntico sin registro: lo dice, y la revisión repite las construcciones alternando antes y después, con su `diff -rq` en `logs/s-29/triage-29.1-1-builds.log`.

Rechazado con motivo, porque la orquestación lo señaló: que `documentar` escriba los saltos de verso en una Cita del censo ya publicada **no contradice** el «Never» de la 29.2. La AC de la épica pide que `documentar` —«también con `--texto`»— componga el texto con `textoConSaltos` y que `AGENTS.md` diga que `--texto` toma los saltos del documento; documentar ya reescribe esa Cita (la saca del censo, compone su Procedencia y puede corregir su texto), y lo hace de una en una y por un acto de quien documenta. Lo que el «Never» reserva a la 29.2 es la restitución en bloque de lo publicado, acto de Héctor. Tampoco llega un `\n` a ninguna superficie en vivo antes de la 29.3: la unidad de fusión es la épica, que entra con la 29.3 pintando el verso, y la siembra de la principal no corre `documentar` en esta rama. Los demás rechazos: `localizar` no normaliza (es `indexOf` sobre colapsados); los 30 px fijos de la procedencia son los de `svgDeTarjeta`, que la compone en una línea; el informe del alta no se duplica (cada `recorrer` lleva el suyo); la caché de un mapa; `\r` suelto (ningún documento de `corpus/fuentes/` lo trae); que el estado del Corpus real solo conste en pasadas anotadas, los fixtures trampa con dos valores, la regla 2 por el escritor, el «basta uno» solo en la prueba pura y el esquema con ruta en un solo build (lo que la AC pide); `lineas:` permanente desde `recuperar` (la AC: «manda desde entonces»); el ciclo `cotejo`↔`lineas` (un uso en lo alto fallaría al importar en cualquier prueba); y « / » en prosa (lo manda AD-29).

## Auto Run Result

Status: done
Blocking condition: ninguna. Queda una decisión de Héctor, que no bloquea esta historia y sí abre la 29.2 y la 29.3: la Tarjeta Social de las tres Citas de Calderón que pasan de 630 px (631 px; ver «Cifras para la decisión de la Tarjeta Social», con su margen de error).

**Resumen.** El salto de verso es un único U+000A del `texto`, con una sola regla de qué es, quién lo escribe y qué lo respalda. `formaDeLasLineas` (conservadora, solo el cuerpo, la cabecera `lineas:` manda) y `textoConSaltos` (el escritor único: solo toca el espacio, un `\n` donde un documento `verso`/`verso-espaciado` parte línea, descarta y cuenta lo tecleado) viven en `tools/lib/lineas.ts`; `tramoEnCrudo` y, desde la revisión, `rachasDeEspacio` —el único recorrido del espacio de un texto, con las reglas de `colapsarEspacios`— en `tools/lib/cotejo.ts`; el esquema de `texto` rechaza toda otra forma del salto; el cotejo del build rompe ante un salto sin respaldo (tres reglas) y ante una `lineas:` fuera del conjunto o vacía; `recuperar` declara `lineas:` en los documentos nuevos; `extraer`, el alta (y `sembrar`) y `documentar` (también `--texto`) escriben con el escritor único. Ninguna Cita publicada cambia (la restitución es la 29.2) y `dist/` sale idéntico.

**Ficheros** (implementación, `f68312a2d9`).
- `tools/lib/lineas.ts` (nuevo) — `FORMAS_DE_LINEAS`, `formaDeLasLineas`, `textoConSaltos`, `documentoParaLosSaltos` y el parte de saltos descartados.
- `tools/lib/cotejo.ts` — `tramoEnCrudo`, `rachasDeEspacio` y la puerta del salto en `cotejar` (reglas 1–3 y `lineas:` inválida); `EntradaDeCotejo.lineasDeclaradas`.
- `tools/lib/documento.ts` — `lineas?` en la cabecera, en crudo (también vacía).
- `tools/lib/corpus.ts` — `leerDocumentosParaElCotejo` y `lineas?` en `leerDocumentosDeclarados`.
- `integraciones/cotejo.ts` — pasa las `lineas:` declaradas al cotejo.
- `src/lib/admision.ts` — reglas de AD-29 en `texto`.
- `tools/recuperar.ts`, `tools/extraer.ts`, `tools/alta.ts`, `tools/lib/documentacion.ts` — `lineas:` en el documento nuevo; el `texto` por `textoConSaltos` y el parte de lo descartado.
- `tools/lib/tarjetaDelVerso.ts` (nuevo) y `tools/lineas.ts` (nuevo, solo lectura) — la geometría de la Tarjeta y la orden `formas|tarjeta`.
- `tests/unit/lineas.test.ts`, `tests/unit/lineas-cli.test.ts` (de la revisión) y `tests/unit/ayuda/lineas/`; pruebas en `puerta-de-admision`, `cotejo`, `cotejo-build`, `normalizar-y-slug`, `recuperar-cli`, `extraer-cli`, `alta`, `documentar-cli` y `documentacion`.
- `AGENTS.md` — el verso en «Una sesión de sembrado» y en «Documentar una Cita ya publicada».
- `sprint-status.yaml` — solo la línea de la 29.1; los comentarios de la 29.2, 29.3 y 29.4 siguen diciendo que esperan la decisión de Héctor.

**Revisión (primera pasada externa, `27215bee79`).** 17 parches (4 medium, 13 low), 2 diferidos (low, en el frontmatter), 14 rechazados; detalle en el «Review Triage Log». Lo principal: U+FEFF ya no desplaza la cuenta en crudo ni hace al escritor insertar un espacio; el esquema rechaza los demás separadores de línea y los espacios Unicode pegados a un salto; `tools/lineas.ts` tiene prueba de punta a punta; y el margen de error de las cifras de la Tarjeta queda dicho y contrastado con un renderizado real. `followup_review_recommended: true` (parches: 0 high, 4 medium, 13 low; puntuación 3·4 + 13 = 25).

**Verificación (revisión).** `npx astro check`: 0 errores, 0 avisos. Uno a uno por `correr.sh` (`logs/s-29/triage-29.1-1-ficheros.log`): `lineas`, `lineas-cli`, `cotejo`, `puerta-de-admision`, `cotejo-build`, `normalizar-y-slug`, `recuperar-cli`, `extraer-cli`, `alta`, `documentar-cli`, `documento`, `documentacion`: 12 ficheros, 797 pruebas, en verde. `npx tsx tools/lineas.ts formas` y `tarjeta`: mismas cifras que antes de los parches (1.422 documentos; 75 Citas, 3 por encima de 630). Cuatro `npm run build` alternos antes/después (`logs/s-29/triage-29.1-1-builds.log`): todos `EXIT:0`, 112/109 s después y 110/108 s antes, `diff -rq` de los 5.295 `.html` sin diferencias. `git diff --stat 6b58bb0429 HEAD -- corpus/`: vacío. `npm test` entero (`logs/s-29/triage-29.1-1-npm-test.log`): 157 ficheros, 7.273 pruebas, en verde (985 s).

**Riesgos.** El clasificador es heurístico: 96 `verso-espaciado` frente a los ~143 de la espina (razonado arriba); un documento de verso que caiga en `indeterminada` solo deja a su Cita en una línea, que es lo de hoy. La regla de índices podría dejar fuera algún poema muy anafórico; no se vio ninguno. Los saltos se toman de la primera aparición del texto (diferido). `documentar` lee las cabeceras de todo `corpus/fuentes/` (2–3 s). Las cifras de la Tarjeta valen para la geometría de hoy con un renglón por salto; cómo pinte la 29.3 el verso puede moverlas. La decisión de la Tarjeta Social es de Héctor.

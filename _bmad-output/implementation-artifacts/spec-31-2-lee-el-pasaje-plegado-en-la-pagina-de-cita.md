---
title: 'Historia 31.2 — «Lee el pasaje», plegado en la Página de Cita'
type: 'feature'
created: '2026-11-08'
status: 'done'
baseline_revision: '020a4dce8a6ab4f323122b254522f1248f17b94b'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-31-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-31-1-el-pasaje-se-localiza-con-el-localizador-del-orden-del-libro.md'
warnings: [oversized]
deferred:
  - summary: >-
      Pendiente de Héctor (antes de dar valor a MAX_CARACTERES_DEL_PASAJE): con el tope en 1.200, tres pasajes traen caracteres que las fuentes no componen y la puerta de cobertura tipográfica detiene el build.
    evidence: |-
      Copia del Corpus de la rama construida el 2026-11-08 con el tope en 1.200: [cobertura-tipografica] «11 caracteres publicados se quedan sin fuente que los componga» — griego (α ο δ ι ξ π ρ ς τ) en cita/miguel-de-unamuno-no-empiezan-los-pueblos-todos-por-creer, «ş» U+015F en cita/platon-en-efecto-nadie-conoce-la-muerte-ni y «г» U+0433 en cita/emilio-castelar-el-esclavo-que-sabe-que-le-han. Con el tope en undefined (el árbol) no hay pasaje y el build pasa. Salidas: ensanchar subsets en astro.config.mjs (se mide), un motivo nuevo en ofrecePasaje (ausencia antes que mutilación) o corregir el documento; decide Héctor.
    location: >-
      integraciones/cobertura.ts; tools/lib/pasaje.ts (ofrecePasaje)
    severity: high
  - summary: >-
      Pendiente de Héctor: el literal de la línea de la Fuente del pasaje (hoy el de la Línea de la Fuente, «Texto tomado de {rótulo}. {licencia}.») y el valor del tope.
    evidence: |-
      Design Notes del spec: los dos son de Héctor y van como diferidos.
    location: >-
      src/lib/atribucion.ts (lineaDeLaFuente); src/lib/umbrales.ts (MAX_CARACTERES_DEL_PASAJE)
    severity: low
---

<intent-contract>

## Intent

**Problem:** La 31.1 deja en cada Cita su pasaje (`pasajesDeLasCitas`), pero ninguna página lo pinta: quien llega a una Cita no puede leer el párrafo —o la estrofa— del que sale ni llegar desde él a la edición cotejada. Además la relación de superficies no sabe que la Página de Cita pasará a depender de los documentos de su Obra, y la lectura de la línea base no sabe que el pasaje partirá SM-C5.

**Approach:** «Lee el pasaje» entra como primer `Desplegable` del bloque `.desplegables` de `src/pages/cita/[slug].astro`, solo para la Cita con pasaje, con un componente nuevo que pinta los párrafos que le da el cargador —sin interpretar un salto— con las palabras de la Cita en `<mark>` y la línea de la Fuente que compone `src/lib/atribucion.ts`. `tools/lib/cambios.ts` compone en la Página de Cita los documentos de su Obra y las `formas` de su ficha, y `DESPLIEGUE_DEL_PASAJE` entra como corte de serie de SM-C5. Con `MAX_CARACTERES_DEL_PASAJE` en `undefined` ninguna página cambia: lo nuevo se prueba y se mide en copias con el tope parcheado.

## Boundaries & Constraints

**Always:**
- Qué es un salto lo dice solo `tools/lib/pasaje.ts` (AD-29, AD-30): el pasaje gana `parrafos`, los tramos UTF-16 sobre `texto` que se pintan como párrafos y, dentro, como líneas —`verso`: cada línea del bloque es una línea; `prosa-ajustada`: el bloque entero es una línea (sus `\n` interiores quedan literales y el HTML los pinta como espacio); `prosa-por-lineas`: cada línea es un párrafo de una línea; bloques separados por línea en blanco, párrafos distintos—. El componente solo recorta `texto` por esos tramos y por `[inicio, fin)`; no busca `\n` ni escribe ningún literal de forma.
- Texto literal: lo pintado, colapsado, es `texto` sin las líneas en blanco entre bloques; nunca se recorta, resume, corrige ni completa (FR-59, NFR-12). Dos Citas del mismo párrafo pintan el mismo pasaje con su propio `<mark>`.
- Marcado: `Desplegable rotulo="Lee el pasaje"` primero en `.desplegables`, antes de «Cómo citar»; dentro, `<p>` por párrafo, `<br>` entre líneas, las palabras de la Cita en `<mark>` (uno por tramo de línea que cruce), y debajo, a `calc(var(--unidad) * 2)`, la línea de la Fuente: el mismo texto que la Línea de la Fuente —«Texto tomado de {rótulo}. {licencia}.»—, enlace `rel="noopener nofollow"` a `cita.fuente.url`, misma pestaña, sin aviso de pestaña nueva. Sin `<script>`, sin `data-zona`, sin `data-sin-zona`, sin `data-ingreso`, sin enlace interno.
- Estilo solo con tokens de `tokens.css`: párrafo `--sans`, `--cuerpo-md`, `--interlineado-cuerpo-md`, `--tinta-apagada`, `--peso-regular`; `mark` `--serif` al mismo cuerpo, `--tinta`, fondo `transparent`, `font-weight: inherit`; línea de Fuente `--pie`, `--interlineado-pie`, `--tinta-apagada`, enlace `--siena`. Sin excepción nueva en `tests/unit/tipografia-en-tokens.test.ts`; `max-inline-size` la de `Desplegable` (`--medida-prosa`), sin `white-space` propio.
- `src/lib/atribucion.ts` compone la línea (`lineaDeLaFuente(fuente)`, usada también por `Fuente.astro`, cuyo HTML no cambia ni un byte) y cuenta `'pasaje'` en `PORTAN_LA_ATRIBUCION` (AD-28). Sin `cita.fuente` no hay pasaje (lo exige `documentosDeCita`): el componente lanza si llega uno sin Fuente.
- Relación de superficies (AD-27): la Página de Cita compone, además de lo de hoy, los documentos de su Obra —la unión de `documentosDeCita` de las Citas vivas de la Obra, con su índice de subpáginas (24.9) como uno de ellos— y las `formas` de su ficha; una Cita sin Obra, solo sus documentos y su índice. `CAMPOS_QUE_PINTA`: `documento.cita = CUALQUIER_CAMBIO`, `obra.cita = ['titulo', 'formas']`. Nunca los ficheros de Citas hermanas.
- `DESPLIEGUE_DEL_PASAJE: string | undefined = undefined` en `src/lib/umbrales.ts`, con comentario: jornada UTC del primer despliegue en que una Página de Cita enseña un pasaje en vivo —el que sigue a que Héctor dé valor al tope—, nunca la del merge; la pone Héctor en un commit aparte. Entrada nueva en `CORTES_DE_SERIE_DECLARADOS`, sin literal, `que: '“Lee el pasaje” en la Página de Cita'`, `series: ['continuacion-de-cita']`. Ninguna prueba fija su valor ni el del tope.
- Ninguna prueba depende del valor de `MAX_CARACTERES_DEL_PASAJE` del árbol: las construcciones lo parchean en la copia (`construirConCorpus({ ficheros })`, reemplazo por expresión regular de la declaración, como `pasaje-build.test.ts`).

**Block If:**
- El `dist/` del Corpus real con el tope en 1.200 (copia) pasa `AVISO_DE_PESO_DE_DIST`: HALT, decide Héctor; el techo no se sube.
- Hacer pasar algo exigiría dar valor a `MAX_CARACTERES_DEL_PASAJE` o a `DESPLIEGUE_DEL_PASAJE` en el árbol, escribir en `corpus/`, una zona o exención nueva, o tocar `_bmad-output/planning-artifacts/` o `_bmad-output/specs/`.
- El `dist/` del árbol (tope `undefined`) cambia en algún `.html` frente a `baseline_revision` en la misma jornada.

**Never:**
- Pintar el pasaje en la portada, el 404, la Página de Obra, la Tarjeta de Cita, el JSON-LD, lo copiado, la Imagen, el Fragmento, la Tarjeta Social o Pagefind; leer `pasajesDeLasCitas` fuera de `src/pages/cita/[slug].astro`.
- Otro `<details>` escrito a mano; abrirlo por omisión; un rótulo, aviso o hueco cuando no hay pasaje.
- Excluir la Cita atribuida o la Obra con derechos (35.4); el incipit (Épica 32).
- Correr `npm run medicion -- desplegar|comprobar`, nada con `--remote`, ni hacer push.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Verso, Cita de 2 de 4 versos | `parrafos` = [[4 líneas]] | un `<p>` con 3 `<br>`; `<mark>` en las dos líneas de la Cita | — |
| Cita que cruza dos estrofas | dos bloques | dos `<p>`; `<mark>` al final del primero y al principio del segundo | — |
| `prosa-ajustada` | bloque con `\n` interiores | un `<p>` sin `<br>`, con los `\n` literales | — |
| `prosa-por-lineas`, Cita en dos líneas | dos líneas | dos `<p>` | — |
| Sin pasaje (sin documento, no localiza, forma sin párrafo, no dice más, pasa del tope, tope `undefined`) | — | sin `<details>` «Lee el pasaje», el bloque empieza por el siguiente | — |
| Cita sin Obra con pasaje | sin Tarjeta de Obra | el filete del primero a 4 × unidad de «Compartir en» (la regla de `.desplegables` ya existe) | — |
| Invariante | toda Cita con pasaje | `colapsarEspacios(texto de los <mark> unidos por espacio) === colapsarEspacios(cita.texto)` | — |
| Pasaje sin Fuente | contrato roto | — | el componente lanza nombrando el slug |

</intent-contract>

## Code Map

- `src/pages/cita/[slug].astro` -- `getStaticPaths` (:43) calcula una vez `pasajesDeLasCitas(conjunto)` y pasa `pasaje` por props; `.desplegables` (:164) recibe «Lee el pasaje» delante de «Cómo citar». El comentario de :154 ya anuncia el sitio.
- `src/components/Desplegable.astro` -- primitiva de la 34.0; lanza si el `slot` sale vacío. Solo lectura.
- `src/components/Fuente.astro` -- la Línea de la Fuente («Texto tomado de … . {licencia}.», :48-55, `rotuloDeFuente`); pasa a usar `lineaDeLaFuente`. Su HTML lo vigila `tests/unit/fuente-visible.test.ts` y sus reglas `tests/unit/tarjeta-de-obra.test.ts:392`.
- `src/components/LeeElPasaje.astro` (nuevo) -- props `pasaje: PasajeDeAparicion`, `fuente: FuenteDeCita | undefined`, `slug`; pinta con `partesDelPasaje`.
- `src/lib/pasaje.ts` (nuevo, puro) -- `partesDelPasaje(pasaje)` → párrafos → líneas → segmentos `{ texto, deLaCita }`, solo con `parrafos`, `inicio`, `fin`. Sin `\n`, sin literales de forma.
- `src/lib/atribucion.ts` -- `PORTAN_LA_ATRIBUCION` (:137, hoy `Set<SuperficieDeLaSemblanza>`) se amplía a un tipo que admite `'pasaje'` sin tocar `semblanzaEn` (:146); `lineaDeLaFuente` nueva junto a la composición de la Fuente. Ya importa `rotuloDeFuente` de `obras.ts`.
- `src/lib/obras.ts` -- `PasajeDeAparicion` (:969) gana `parrafos: readonly (readonly [number, number])[][]`; `aparicionQueCuenta` (:1113) solo lectura.
- `tools/lib/pasaje.ts` -- `pasajeDeAparicion` (~:115) calcula `parrafos` desde `lineasDelCrudo`, `enBlanco` y la forma que ya recibe; único sitio que interpreta los saltos.
- `src/content.config.ts` -- esquema de `pasaje` (:345): `parrafos` no vacío, tramos `[desde, hasta)` con `0 ≤ desde < hasta ≤ texto.length`, crecientes y sin solaparse; refinamiento con mensaje.
- `src/lib/publicado.ts` -- `pasajesDeLasCitas` (:1598) solo lectura.
- `tools/lib/cambios.ts` -- `CAMPOS_QUE_PINTA` (:297), bucle de la Página de Cita (:548; usar `citasDeObra`, `documentos`, `indices` y `documentosDeCita` ya construidos más arriba, :487 y :543), cabecera del módulo (:24-81) al día.
- `src/lib/umbrales.ts` -- `DESPLIEGUE_DE_CITAR_Y_LLEVARSE` (:193) como modelo; `CorteDeSerie` (:218), `CORTES_DE_SERIE_DECLARADOS` (:242).
- `tools/lib/lineaBase.ts` -- `JuicioPorVentanas.corte` (:406), SM-C5 (:428-437), el juicio con corte (:1417-1500), el informe (:2029-2055), `problemasDeLaLectura` (:840).
- `tests/unit/linea-base.test.ts` -- lista de constantes de la declaración (:527), SM-C5 con corte (:1254-1410, ayudante `corte30`).
- `tests/unit/fecha-de-cambio.test.ts` -- «formas» (:744), «documento nuevo» (:841), «índice» (:864, hoy dice que no compone Páginas de Cita), «Cita nueva» (:520), `avisadas`/`refechadas`.
- `tests/unit/pasaje.test.ts`, `tests/unit/orden-del-libro.test.ts`, `tests/unit/pasaje-build.test.ts` -- sus `toEqual` sobre pasajes ganan `parrafos`.
- `tests/unit/como-citar.test.ts`, `tests/unit/inserta-esta-cita.test.ts` -- patrón de construcción con `conBusqueda` y `indiceDe` (`tests/unit/ayuda/pagefind.ts`).
- `tests/unit/ingreso-construido.test.ts` -- cómo se encienden los Modelos en una copia (`fuenteConModeloEncendido`, `fuenteConTiendaDePrueba`).
- `tests/e2e/ingreso-accesible.spec.ts` -- patrón de e2e con construcción parcheada servida en un puerto propio; `tests/e2e/pagina-de-cita.spec.ts:600-660` -- medida de Copiar a 360 × 640 y las tres Citas de la auditoría.
- `AGENTS.md` -- «Página de Cita = …» (§ El aviso, la serie y la congelación) y «La Página de Obra depende así también de `corpus/fuentes/` … y a ninguna otra superficie» (§ La Página de Obra).

## Tasks & Acceptance

**Execution:**
- `tools/lib/pasaje.ts` -- calcular `parrafos` por forma (reglas de Always) y devolverlos con el pasaje -- el componente no interpreta saltos.
- `src/lib/obras.ts`, `src/content.config.ts` -- `parrafos` en el tipo y en el esquema con su refinamiento -- el almacén lo valida.
- `tests/unit/pasaje.test.ts` -- `parrafos` en cada caso de la matriz de la 31.1 (verso, cruce de estrofas, ajustada con y sin cruce, por líneas con cruce, CRLF, bloque único) y el invariante: los tramos están dentro de `texto`, crecientes, y su unión contiene `[inicio, fin)` salvo el blanco entre bloques -- y poner al día `orden-del-libro.test.ts` y `pasaje-build.test.ts`.
- `src/lib/pasaje.ts` -- `partesDelPasaje` -- reparto en segmentos marcados.
- `src/lib/atribucion.ts` -- `lineaDeLaFuente` y `'pasaje'` en `PORTAN_LA_ATRIBUCION` -- AD-28.
- `src/components/Fuente.astro` -- usar `lineaDeLaFuente` -- un solo dueño de la línea.
- `src/components/LeeElPasaje.astro` -- el marcado y el `<style>` de Always.
- `src/pages/cita/[slug].astro` -- `pasajesDeLasCitas` en `getStaticPaths`, el desplegable primero y condicional, comentarios al día.
- `tests/unit/lee-el-pasaje.test.ts` (nuevo) -- `partesDelPasaje` puro (matriz e invariante) y una construcción `construirConCorpus` con `conBusqueda` y el tope parcheado (p. ej. 400): Citas en verso (dos del mismo poema), en `prosa-ajustada` y en `prosa-por-lineas`, una sin Obra con pasaje, una que «no dice más» y una sin documento. Comprueba: orden de los `<details>` del bloque; sin pasaje, ningún «Lee el pasaje»; `<p>`/`<br>`/`<mark>` por forma; mismo pasaje con distinto `<mark>` en las dos del poema; la línea de la Fuente igual a la de `Fuente.astro` de esa página; ni `<script>`, ni `data-zona`, ni `data-ingreso`, ni `href` interno dentro del desplegable; una palabra que solo está en un pasaje no aparece en la página fuera del `<details>` (JSON-LD, datos de Copiar e Imagen, Fragmento) y `indiceDe` no devuelve nada por ella; y una segunda construcción con todos los Modelos admitidos encendidos da el `<details>` byte a byte igual. Más una guarda estática: `pasajesDeLasCitas` solo lo llaman `[slug].astro` (y las pruebas), y ni `src/lib/tarjeta.ts`, `src/lib/lienzo.ts`, `public/islas/imagen.js`, `DatosEstructurados.astro` ni las páginas de `src/pages/tarjeta/` nombran el pasaje.
- `tests/unit/atribucion.test.ts` o `tests/unit/semblanza.test.ts` -- `PORTAN_LA_ATRIBUCION` contiene `'pasaje'` y `semblanzaEn` no cambia.
- `tools/lib/cambios.ts` -- la composición nueva de la Página de Cita y `CAMPOS_QUE_PINTA` -- AD-27.
- `tests/unit/fecha-de-cambio.test.ts` -- recuperar una página nueva de una Obra fecha y avisa esa Obra **y sus Páginas de Cita**; cambiar su índice, igual; un documento de otra obra, nada; las `formas` de la ficha fechan además sus Páginas de Cita; una Cita nueva sigue sin fechar ninguna otra Página de Cita; una Cita sin Obra compone solo sus documentos; la prueba de clasificación de campos sigue en verde.
- `src/lib/umbrales.ts` -- `DESPLIEGUE_DEL_PASAJE` y su entrada en `CORTES_DE_SERIE_DECLARADOS`.
- `tools/lib/lineaBase.ts` -- SM-C5 declara los dos cortes de su serie (ver Design Notes); el informe nombra cada uno pendiente y el llegado.
- `tests/unit/linea-base.test.ts` -- lista de constantes con `DESPLIEGUE_DEL_PASAJE`; con la constante sin valor, el informe dice «La llegada de DESPLIEGUE_DEL_PASAJE no ha ocurrido» y que la marca el primer despliegue con valor en `MAX_CARACTERES_DEL_PASAJE`, no el merge; con las dos con valor, la línea base propia empieza tras la del pasaje y ninguna ventana la cruza; los casos de la 30.1 siguen dando lo mismo.
- `tests/e2e/lee-el-pasaje.spec.ts` (nuevo) -- construcción parcheada como `ingreso-accesible.spec.ts`, servida en el puerto 4403: a 360 × 640 Copiar acaba dentro de 640 y su `y` no cambia al quitar del DOM el `<details>` del pasaje; a 320 px, abierto, sin desplazamiento horizontal; tabulación: el `<summary>` «Lee el pasaje» va tras el último enfocable de la Tarjeta de Obra y, abierto, le sigue el enlace a la edición; con JavaScript apagado se abre y se cierra; axe sin violaciones con el desplegable abierto.
- `AGENTS.md` -- el texto de `corpus/fuentes/` se publica también como pasaje, lo entrega solo el cargador de posiciones, la Página de Cita compone los documentos de su Obra y las `formas` de su ficha, `MAX_CARACTERES_DEL_PASAJE` es de Héctor y `DESPLIEGUE_DEL_PASAJE` es la jornada del primer despliegue con el tope con valor, no la del merge.

**Acceptance Criteria:**
- Given una Cita con pasaje en una construcción con el tope parcheado, when se construye su página, then «Lee el pasaje» es el primer `<details>` cerrado de `.desplegables`, tras la Tarjeta de Obra —o «Compartir en»— y antes de «Cómo citar», con los párrafos, el `<mark>` y la línea de la Fuente de Always, y se abre sin JavaScript.
- Given una Cita sin pasaje por cualquier motivo, or el árbol con el tope en `undefined`, when se construye, then no hay «Lee el pasaje» ni hueco, y el `dist/` del árbol no cambia en ningún `.html` frente a `baseline_revision`.
- Given el pasaje construido, when se busca una palabra que solo está en él, then Pagefind no da resultados y la página no la contiene fuera del desplegable; `GUIONES_EXTERNOS` no cambia, `tests/unit/medicion.test.ts` pasa sin fila nueva y el desplegable sale igual con los Modelos encendidos.
- Given la relación de superficies, when se recupera un documento nuevo de una Obra o cambia su índice o sus `formas`, then se fechan y avisan esa Obra y sus Páginas de Cita; una Cita nueva no fecha ninguna otra.
- Given `DESPLIEGUE_DEL_PASAJE` sin valor, when se lee la línea base, then el informe dice que su llegada no ha ocurrido y que la marca el tope, no el merge; con valor, ninguna ventana de SM-C5 la cruza.
- Given el Corpus real en una copia con el tope en 1.200, when se construye, then el spec anota los bytes que añade a `dist/` y a la Página de Cita (mediana y máximo), las cinco líneas de `integraciones/peso.ts` y la medida NFR-7 con Lighthouse.

## Spec Change Log

## Review Triage Log

### 2026-11-08 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

Sin hallazgos externos en esta pasada: el orquestador no pasó secciones «## Hallazgos externos — …». No cuenta como revisión: la primera revisión con hallazgos es la siguiente.

## Design Notes

**Por qué `parrafos` y no la forma.** Pintar exige saber si un `\n` es verso, espacio o párrafo, y eso es interpretar un salto del documento, que AD-29 reserva a `tools/`; además la guarda de `tests/unit/lineas.test.ts` prohíbe escribir las formas fuera de `lineas.ts`. Con tramos, el componente solo corta cadenas. Ejemplo (verso, dos estrofas, Cita en la última línea de la primera y la primera de la segunda): `texto = "A\nB\n\nC\nD"`, `parrafos = [[[0,1],[2,3]], [[5,6],[7,8]]]`, `inicio = 2`, `fin = 6` → `<p>A<br><mark>B</mark></p><p><mark>C</mark><br>D</p>`.

**La Fuente del pasaje es la de la Cita.** El pasaje sale de un documento casado por `documentosDeCita` con `cita.fuente.id`, así que su Fuente es la de la Cita. Medido el 2026-11-08 sobre el Corpus de la rama con el tope en 1.200: 2.104 Citas con pasaje, y en las 2.104 el `url:` de la cabecera del documento de la aparición que cuenta es `cita.fuente.url` (ninguna Cita con pasaje aparece en más de un documento). Largo del `texto` en UTF-8: mediana 621 bytes, máximo 1.229. Por eso la línea se compone con `cita.fuente` y no hace falta que el cargador lleve la URL.

**Los cortes de SM-C5.** Hoy `corte: { serie, deDondeLlega }` admite uno. La forma prevista: `CorteDeSerie` gana `deDondeLlega` (el nombre de su constante; la prueba de la lista lo coteja con el identificador de `jornada:`) y SM-C5 declara `corte: { serie: 'continuacion-de-cita', llegadas: [{ deDondeLlega: 'DESPLIEGUE_DE_CITAR_Y_LLEVARSE' }, { deDondeLlega: 'DESPLIEGUE_DEL_PASAJE', marca: 'el primer despliegue con valor en MAX_CARACTERES_DEL_PASAJE, no el merge' }] }`. La línea base propia sigue saliendo del último corte llegado de la serie (`partirSerie`, sin cambio) y se nombra por su `deDondeLlega`; cada llegada declarada que no está entre las llegadas de la serie sale como pendiente, con su jornada si es de hoy o posterior y con su `marca`. La palanca de SM-C5 no cambia.

**Lo que no es de esta historia y se dice.** El literal de la línea de la Fuente del pasaje (aquí el de la Línea de la Fuente) y el valor del tope son de Héctor: van como diferidos. NFR-7 que empeore no bloquea la historia: se anota y el merge espera a Héctor.

## Verification

**Commands:**
- `npx vitest run tests/unit/pasaje.test.ts`, `tests/unit/orden-del-libro.test.ts`, `tests/unit/lineas.test.ts`, `tests/unit/pasaje-build.test.ts`, `tests/unit/lee-el-pasaje.test.ts`, `tests/unit/fecha-de-cambio.test.ts`, `tests/unit/linea-base.test.ts`, `tests/unit/semblanza.test.ts`, `tests/unit/fuente-visible.test.ts`, `tests/unit/tipografia-en-tokens.test.ts`, `tests/unit/desplegable.test.ts`, `tests/unit/como-citar.test.ts`, `tests/unit/inserta-esta-cita.test.ts`, `tests/unit/medicion.test.ts` -- en verde, uno a uno.
- `npx astro check` -- 0 errores.
- `npm test` entero por `correr.sh` -- en verde salvo un rojo preexistente que se nombre.
- `npx playwright test tests/e2e/lee-el-pasaje.spec.ts` (los dos proyectos) y `tests/e2e/pagina-de-cita.spec.ts tests/e2e/como-citar.spec.ts tests/e2e/inserta-esta-cita.spec.ts --project=movil` -- en verde; puertos libres según las reglas.
- `FECHA_JORNADA=2026-11-08 npm run build` en el árbol, antes (`baseline_revision`) y después -- manifiesto de `dist/`: sin diferencias en `.html`; fuera de `pagefind/`, solo `sitemap-0.xml` (los `lastmod` de Páginas de Cita que ahora componen documentos: cuántas, en el spec).
- Copia del repositorio en el scratchpad con `node_modules` enlazado, construida con el tope del árbol y con `MAX_CARACTERES_DEL_PASAJE = 1200`, `FECHA_JORNADA` fija y `MEDICION_ENDPOINT=http://localhost:8787/` -- bytes añadidos a `dist/` y por Página de Cita con pasaje (mediana y máximo), las cinco líneas de `integraciones/peso.ts` de las dos; si pasa `AVISO_DE_PESO_DE_DIST`, Block If.
- NFR-7 -- Lighthouse 13.5.0 móvil (`--throttling-method=simulate`) sobre los dos `dist/` de la copia, servidos con `tests/servidor.mjs` (`SERVIDOR_CACHE_CONTROL=max-age=600`, `SERVIDOR_GZIP=1`), receptor local en 8787, 10 corridas alternas por página: `antonio-machado-caminante-no-hay-camino-se-hace-camino`, `jose-marti-yo-soy-un-hombre-sincero-de-donde`, `jose-marti-yo-vengo-de-todas-partes-y-hacia` y la Cita en verso con el pasaje más largo en la copia (nombrada en el spec); margen max(100 ms, 5 %) en LCP y FCP. Se borra la copia al terminar.
- `git diff --stat 1d1cb5ebd687029031cf742fd0970b074c013afd -- corpus/` -- vacío.

## Auto Run Result

Status: done
Blocking condition: none

**Qué se hizo.** «Lee el pasaje» es el primer `Desplegable` de `.desplegables` de la Página de Cita, solo para la Cita con pasaje: un `<p>` por párrafo, un `<br>` entre líneas, las palabras de la Cita en `<mark>` y, debajo, la línea de la Fuente con su licencia y el enlace a la edición. Qué es un salto lo dice solo `tools/lib/pasaje.ts`, que da al pasaje sus `parrafos` (tramos UTF-16 de párrafos y líneas); `src/lib/pasaje.ts` solo corta. La relación de superficies compone en la Página de Cita los documentos de su Obra (con su índice) y las `formas` de su ficha; `DESPLIEGUE_DEL_PASAJE` entra como corte de `continuacion-de-cita` y SM-C5 declara sus dos llegadas. Con el tope en `undefined` ningún `.html` cambia.

**Ficheros.**
- `tools/lib/pasaje.ts` — `parrafosDelTrozo`: los `parrafos` por forma (verso, prosa ajustada, prosa por líneas).
- `src/lib/obras.ts`, `src/content.config.ts` — `parrafos` en `PasajeDeAparicion` y en el esquema, con su refinamiento (tramos dentro del texto, crecientes, sin solaparse).
- `src/lib/pasaje.ts` (nuevo) — `partesDelPasaje`: párrafos → líneas → segmentos marcados, sin interpretar saltos.
- `src/lib/atribucion.ts` — `lineaDeLaFuente` (dueño único de la línea) y `'pasaje'` en `PORTAN_LA_ATRIBUCION`.
- `src/components/Fuente.astro` — usa `lineaDeLaFuente`; su HTML no cambia ni un byte (`dist/` idéntico).
- `src/components/LeeElPasaje.astro` (nuevo) — el marcado; lanza si llega un pasaje sin Fuente.
- `src/components/EstiloDeLeeElPasaje.astro` (nuevo) — la presentación, `<style is:inline>` en la cabeza solo donde hay pasaje.
- `src/pages/cita/[slug].astro` — `pasajesDeLasCitas` en `getStaticPaths`, el desplegable primero y condicional, la hoja en `slot="cabeza"`.
- `tools/lib/cambios.ts` — `documento.cita = CUALQUIER_CAMBIO`, `obra.cita = ['titulo', 'formas']`, los documentos de la Obra en cada Página de Cita (calculados una vez por Obra).
- `src/lib/umbrales.ts` — `DESPLIEGUE_DEL_PASAJE` y su corte; `CorteDeSerie` gana `deDondeLlega`.
- `tools/lib/lineaBase.ts` — `corte.llegadas` con `marca`; `JuicioLeido.pendientes`; el informe nombra cada llegada pendiente con su marca y la línea base propia por la constante del último corte llegado.
- Pruebas: `tests/unit/lee-el-pasaje.test.ts` y `tests/e2e/lee-el-pasaje.spec.ts` (nuevas); al día `pasaje`, `orden-del-libro`, `pasaje-build`, `fecha-de-cambio`, `fecha-de-cambio-build`, `avisar-rango`, `indexnow`, `linea-base`, `semblanza`.
- `AGENTS.md` — «Lee el pasaje», la composición de la Página de Cita, el tope y la jornada del corte de Héctor.

**Desviaciones del spec, y por qué.**
- El `mark` lleva `font-weight: var(--peso-regular)` y no `inherit`: `tests/unit/tipografia-en-tokens.test.ts` rechaza todo peso que no sea `var(--peso-…)`, y el spec prohíbe una excepción nueva. El efecto es el mismo (el párrafo es regular).
- La presentación no va en un `<style>` de `LeeElPasaje.astro` sino en `EstiloDeLeeElPasaje.astro`, puesto en la cabeza solo en las páginas con pasaje: con el `<style>` del componente, Astro lo metía en la hoja de toda Página de Cita y el nombre con huella de esa hoja cambiaba las 4.424 páginas con el tope en `undefined` (Block If). Coste: unos 650 bytes por página con pasaje.
- La Cita sin Obra con pasaje de la matriz no se puede construir: un documento solo casa con una Cita que declara obra y toda obra con forma tiene ficha. Su regla la prueba `orden-del-libro.test.ts` (`pasajesDeCitas` sin Obra); el filete es la regla de `.desplegables`, que no depende de la Tarjeta de Obra.
- E2E: todo en el perfil `movil` (el de `escritorio` se salta), porque el montaje levanta un puerto fijo (4403); las medidas fijan su ventana. El receptor de la medida NFR-7 fue el de 204 de la Épica 30 en 8787, no `wrangler dev`.
- `fecha-de-cambio-build.test.ts`: el documento ya trae el texto de la Cita sembrada desde el primer commit (la siembra real no reescribe documentos); reescribirlo en el commit de la siembra fecha ahora, a sabiendas, las hermanas.

**Verificación (2026-11-08).**
- `npx vitest run` por fichero de lo tocado — en verde; `npx astro check` — 0 errores, 0 avisos; `npm test` entero — 168 ficheros, 7.661 pruebas, en verde.
- `npx playwright test tests/e2e/lee-el-pasaje.spec.ts` — 5 en verde (movil), 5 saltadas (escritorio); `pagina-de-cita`, `como-citar` e `inserta-esta-cita` con `--project=movil` — 70 en verde, 26 saltadas.
- `FECHA_JORNADA=2026-11-08 npm run build`, base (`020a4dce8a`) frente al árbol: 0 `.html` distintos; fuera de `pagefind/`, solo `sitemap-0.xml`, con el `lastmod` de 483 Páginas de Cita movido a la fecha de un documento de su Obra.
- Copia con el tope en 1.200 (y la puerta de cobertura degradada a aviso **solo en la copia**, ver diferidos): 2.104 Citas con pasaje; +4.206.699 bytes en `dist/`; por Página de Cita con pasaje, mediana +1.983 y máximo +2.705 bytes (`mariano-jose-de-larra-hay-entre-nosotros-unos-pocos-hombres-que`). Pagefind: 4.881 páginas y 9.161 palabras en las dos.
  - Tope del árbol: «Peso de dist/: 542.418.177 bytes (517,3 MiB) en 15.371 ficheros» · «Rotan con la jornada, aparte: 111.990 bytes» · «Juzgado sin lo que rota: 542.306.187 bytes (517,2 MiB); quedan 244.125.813 bytes hasta el aviso» · «Tarjetas Sociales: 312.892.904 bytes, 57,7 %» · «Filtros y mapa: 97.029 bytes».
  - Tope 1.200: «Peso de dist/: 546.624.876 bytes (521,3 MiB) en 15.371 ficheros» · «Rotan con la jornada, aparte: 111.990 bytes» · «Juzgado sin lo que rota: 546.512.886 bytes (521,2 MiB); quedan 239.919.114 bytes hasta el aviso» · «Tarjetas Sociales: 312.892.904 bytes, 57,3 %» · «Filtros y mapa: 97.014 bytes». Muy por debajo de `AVISO_DE_PESO_DE_DIST` (750 MiB).
- NFR-7, Lighthouse 13.5.0 `simulate`, 10 corridas alternas, `max-age=600` y gzip; la Cita en verso con el pasaje más largo es `fernan-gonzalez-de-eslava-por-que-mi-dios-me-soltais-y` (697 caracteres, 27 saltos). Medias, tope del árbol → 1.200: Fernán González LCP 1.595 → 1.626 (+31), FCP 948 → 922 (−25); Machado LCP 1.639 → 1.610 (−29), FCP 939 → 900 (−39); Martí «sincero» LCP 1.596 → 1.626 (+30), FCP 922 → 919 (−2); Martí «vengo» LCP 1.580 → 1.624 (+44), FCP 896 → 917 (+21). Todas dentro del margen de 100 ms. Las tres de la auditoría no tienen pasaje (su HTML es igual en las dos copias): su diferencia es ruido.
- `git diff --stat 020a4dce8a -- corpus/` — vacío. La copia se borró.

**Revisión.** Pasada sin hallazgos externos: 0 parches, 0 diferidos, 0 rechazados. `followup_review_recommended: false` (parches: high 0, medium 0, low 0; puntuación 0).

**Riesgos residuales.** Con el tope en 1.200 el build se para por la cobertura tipográfica (tres pasajes): darle valor exige antes la decisión de Héctor (diferido). La hoja en la cabeza suma unos 650 bytes por Página de Cita con pasaje. El orden de tabulación se comprobó en una Cita con Tarjeta de Obra; sin Obra no hay Cita con pasaje.

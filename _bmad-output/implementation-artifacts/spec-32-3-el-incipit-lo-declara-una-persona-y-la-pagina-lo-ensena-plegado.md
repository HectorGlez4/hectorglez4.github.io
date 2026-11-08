---
title: 'El incipit lo declara una persona, y la página lo enseña plegado'
type: 'feature'
created: '2026-11-08'
status: 'done'
baseline_revision: '7ff35e7ab008fd8a688948f5ee62e6ef6340baa6'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-32-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-32-2-la-linea-de-ficha-tecnica-bajo-la-cabecera-de-obra.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-brainlySabiduria-2026-08-10/ARCHITECTURE-SPINE.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** La Página de Obra no dice cómo empieza la obra, y no hay forma de declararlo sin adivinar: el orden del libro pondría el prólogo de la Fuente delante (AD-30, pregunta 16). Tampoco hay sitio en la ficha, en el cargador ni en la relación de fechas para un incipit, ni corte de serie que separe la continuación de la Página de Obra de antes y después de que aparezca.

**Approach:** Una orden, `npm run obra -- incipit <ficha> corpus/fuentes/<documento>.txt "<desde>"`, escribe `incipit: {documento, desde}` en la ficha tras comprobar casado, forma y localización; el cargador de posiciones lo valida en cada build y entrega por ficha el incipit ya cortado por `incipitDe` (`tools/lib/pasaje.ts`) con el tope `MAX_CARACTERES_DEL_INCIPIT` (nace `undefined`); la página 1 lo pinta en un `Desplegable.astro` «Cómo empieza» entre la Cabecera y el listado. Nace `DESPLIEGUE_DEL_INCIPIT` (`undefined`) con su corte de serie. Ninguna ficha real declara incipit.

## Boundaries & Constraints

**Always:**
- **Orden** (único escritor del campo; AD-25, AD-30): `incipit <ficha> <documento> <desde>`, 3 argumentos (más `--corpus`); otra cantidad, bandera desconocida o `desde` vacío tras colapsar → **2**. Se niega con **1**, sin escribir, si: la ficha no existe; el documento no es un `.txt` dentro de `rutas.fuentes`, falta, no se deja analizar o es una biografía; no está en la unión de `documentosDeCita(cita.fuente, cita.procedencia.obra, documentos)` de las Citas **publicadas** que resuelven a esa ficha (casado); su forma (`formaDeLasLineas` con la `lineas:` de su cabecera) es `indeterminada`; `localizar(colapsarEspacios(desde), colapsarEspacios(cuerpo)) === -1`; o la ficha ya declara ese mismo `{documento, desde}`. Escribe `{documento: <nombre sin extensión>, desde: colapsarEspacios(desde)}` con `reescribirFichaDeObra(…, {...datosDeFicha(ficha), incipit})`. El parte nombra ficha, documento, forma y, si el tope tiene valor, el incipit que saldría (o el motivo de que no salga); con el tope en `undefined` lo dice: «MAX_CARACTERES_DEL_INCIPIT no tiene valor: la página no lo enseña».
- **Conservación:** `datosDeFicha` conserva `incipit` (cubre `titular`, `separar`, `declararEdicion`, `quitarEdicion`, el ajuste de título de `documentar` y `restituir-grafia`); `retirar` mueve el fichero; `reunirFichas` conserva el de la destino, no hereda el de la absorbida y el parte lo dice (patrón del de `wikidata`), dando la orden para declararlo en la reunida.
- **Esquema:** `esquemaDeObra` admite `incipit` opcional y estricto: `documento` cadena no vacía sin `/` ni extensión `.txt`; `desde` cadena de una línea (sin `\p{Cc}\p{Zl}\p{Zp}`) con algún no-espacio. Mensajes de claves desconocidas al día («… wikidata e incipit»). `yamlDeFicha` lo emite tras `wikidata` y sobrevive a la ida y vuelta con comillas, dos puntos y `#` en `desde`. `FichaDeObra` (`src/lib/obras.ts`) gana `incipit?`; `aplanarFichaDeObra` lo copia.
- **Corte, una sola función** — `incipitDe({crudo, forma, posicion, desde, tope})` en `tools/lib/pasaje.ts`, vecina de `pasajeDeAparicion`: el comienzo en el crudo es `tramoEnCrudo(crudo, posicion, posicion + desde.length).inicio`. Unidades: en `verso` y `verso-espaciado`, cada línea no en blanco (verso); en `prosa-ajustada` y `prosa-por-lineas`, la frase: termina tras `.`, `?`, `!` o `…` seguidos de cero o más cierres (`»”"’')]`) y luego espacio o fin, o en fin de párrafo (línea en blanco en `prosa-ajustada`; fin de línea en `prosa-por-lineas`). Texto entregado: en verso, los versos unidos por un `\n` (también entre estrofas); en prosa, los párrafos unidos por `\n` y todo otro espacio colapsado a uno (los saltos interiores de `prosa-ajustada` son espacio). Se toman unidades enteras mientras `[...texto].length <= tope`; el recorrido se para antes del pie de licencia de Wikisource (predicado exportado de `tools/lib/lineas.ts`, mismo patrón `PIE_DE_LICENCIA`) y al fin del documento. Nunca a media palabra ni a media frase; nada se recorta dentro.
- **Decisión, un solo punto** — `ofreceIncipit({tope, primera})` en `tools/lib/pasaje.ts` (objeto, para que la 35.9 lo amplíe): `tope === undefined` → `{ofrece:false, motivo:'sin-tope'}`; `[...primera].length > tope` → `'primera-no-cabe'`; si no, `{ofrece:true}`. `incipitDe` la llama con la primera unidad; `forma === 'indeterminada'` → motivo `'forma-indeterminada'`.
- **Cargador** — colección `incipits` en `src/content.config.ts` con el patrón del de `indices`: una sola entrada `porFicha`, siempre presente (también vacía), y su cargador solo cablea `tools/lib/posiciones.ts` (`leerIncipitsDelCorpus(raiz, {tope})` + `guardarIncipits`, vigilando `corpus/obras` y `corpus/fuentes`). Sin ninguna ficha con `incipit` no lee ningún documento. Por cada ficha con `incipit` **rompe el build** con «Regla incumplida: …» nombrando la ficha si el documento falta, no se deja analizar o es biografía, si su forma es `indeterminada` o si `desde` no se localiza (no repite el casado: ver Design Notes). Con incipit que se ofrece entrega `{documento, texto, fuente: {nombre, licencia?, url}}`: `nombre`/`licencia` de la entrada de `FUENTES` (`tools/lib/fuentes.ts`) del `fuente:` de la cabecera, `url` el `url:` de la cabecera. Esquema zod de la colección acorde. El tope por omisión es `MAX_CARACTERES_DEL_INCIPIT`.
- **Umbrales** (AD-9): `MAX_CARACTERES_DEL_INCIPIT: number | undefined = undefined` y `DESPLIEGUE_DEL_INCIPIT: string | undefined = undefined`, con comentarios (el de la jornada como dice el AC: primer día en vivo con incipit, tras dar valor al tope; no la del merge; la pone Héctor en commit aparte). `SerieDeMedicion` gana `'continuacion-de-obra'` `[ASSUMPTION: el nombre]`; `CORTES_DE_SERIE_DECLARADOS` gana `{jornada: DESPLIEGUE_DEL_INCIPIT, que: '«Cómo empieza» en la página 1 de Obra', series: ['continuacion-de-obra']}`. `tools/lib/lineaBase.ts`: `NOMBRE_DE_SERIE` ('la continuación de la Página de Obra'), la partida en `series` y en el bloque «Cortes de serie» del informe; ningún juicio nuevo (es de la 32.4).
- **Página** — solo la página 1, solo si `incipitsDeLasObras` (fachada nueva de `src/lib/publicado.ts`, lee `getCollection('incipits')`) trae la ficha: dentro de `div.pagina`, entre `</header>` y `ul.listado`, un `<div data-pagefind-ignore="all" style="margin-top: calc(var(--unidad) * 3)">` con `<ComoEmpieza …/>`. `src/components/ComoEmpieza.astro` (nuevo): `<Desplegable rotulo={ROTULO_COMO_EMPIEZA}>` (`'Cómo empieza'`, en `src/lib/atribucion.ts`) con el incipit en un `<p>` Inter `--cuerpo-md`/`--interlineado-cuerpo-md`, `--tinta`, `white-space: pre-line`, y a `calc(var(--unidad) * 2)` la Fuente en `--pie`/`--interlineado-pie`, `--tinta-apagada`: `<a href={url}>{nombre}</a>` en siena, subrayado, sin `target` (misma pestaña), sin `data-zona`/`data-sin-zona`, seguido de lo que componga `lineaDeLaFuenteDelIncipit` de `atribucion.ts` (`'. Licencia {licencia}.'` o `'.'` sin licencia `[ASSUMPTION]`). **Solo atributos `style` con tokens, sin `<style>`** (patrón `FichaTecnica.astro`). Fuera del JSON-LD (`DatosDeObra.astro` no cambia). Sin incipit: ni desplegable, ni div, ni hueco. Las 2+ no cambian. Idéntico con la afiliación encendida o apagada.
- **Fechas** (AD-27): `'incipit'` entra en `CAMPOS_QUE_PINTA.obra.obra` de `tools/lib/cambios.ts` (sus documentos ya los compone la Página de Obra).
- `AGENTS.md` § «Las fichas de Obra»: párrafo del incipit (lo escribe solo su orden; qué rompe el build; `MAX_CARACTERES_DEL_INCIPIT` y `DESPLIEGUE_DEL_INCIPIT` son de Héctor; corte en frase o verso).

**Block If:**
- Hiciera falta tocar `src/lib/vocabulario.ts`, una zona nueva, `EXCEPCIONES` de AD-22, un tercer import de `tools/lib/` desde `src/` (fuera de `posiciones.ts` y `wikidata.ts`), editar `_bmad-output/planning-artifacts/` o `_bmad-output/specs/`, o declarar un incipit / dar valor a una constante en el árbol.
- Con el Corpus real, `dist/` difiriera de la base en algo más que lo permitido en el primer AC.

**Never:**
- Declarar un incipit en `corpus/obras/` del árbol, dar valor a `MAX_CARACTERES_DEL_INCIPIT` o `DESPLIEGUE_DEL_INCIPIT`, ni escribir un juicio de SM-C4.
- Inferir el incipit del orden del libro o del primer documento; recortar dentro de una frase o un verso; pintarlo en la serif, en la Imagen, en lo copiado, en la Tarjeta Social o en el JSON-LD.
- Plegar «Dónde leer», retirar el salto de la 24.7 o añadir «Cómo citar» (32.4, 32.5). Escribir un `<details>` propio.
- Leer `corpus/fuentes/` para el incipit fuera de `tools/lib/posiciones.ts`/`pasaje.ts` (cargador) y de la orden.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Prosa | tope 60; «En un lugar de la Mancha. De cuyo nombre no quiero acordarme. Vivía…» | «En un lugar de la Mancha. De cuyo nombre no quiero acordarme.» si cabe; si no, solo la primera | — |
| Borde | primera frase de exactamente `tope` puntos de código | se ofrece | — |
| Uno más | primera frase de `tope + 1` | sin incipit (`primera-no-cabe`) | — |
| Verso | `verso`, versos de 30, tope 70 | dos versos con `\n` | — |
| Prosa ajustada | párrafo partido a 72 col. | saltos interiores → espacio | — |
| Cierres | `…acordarme.» Vivía` | la frase acaba tras `»` | — |
| Sin tope | `MAX_CARACTERES_DEL_INCIPIT` `undefined`, ficha con incipit válido | build verde, sin desplegable | — |
| Desde perdido | `desde` ya no está en el documento | build rompe nombrando la ficha | Regla incumplida |
| Documento falta | `documento` no existe en `corpus/fuentes/` | build rompe nombrando la ficha | Regla incumplida |
| Orden: ajeno | documento de otra Obra | código 1, nada escrito | parte |
| Orden: indeterminada | forma `indeterminada` | código 1 | parte |
| Orden: forma | dos argumentos / `desde` en blanco | código 2 | uso |

</intent-contract>

## Code Map

- `tools/lib/pasaje.ts` -- añadir `MotivoSinIncipit`, `ofreceIncipit`, `incipitDe` junto a `ofrecePasaje` (l. 85) y `pasajeDeAparicion` (l. 106); reutiliza `lineasDelCrudo`, `enBlanco`, `tramoEnCrudo`, `FORMAS_DE_LINEAS`. Cabecera del módulo al día (dueño del pasaje y del incipit).
- `tools/lib/lineas.ts` -- exportar un predicado del pie (`PIE_DE_LICENCIA`, l. 76, hoy privado), p. ej. `esPieDeLicencia(linea)`; la lista de importadores de `tests/unit/lineas.test.ts` (l. 320) no cambia (pasaje.ts ya está); su comentario «la 31.1 y la 32.3» ya lo anticipa.
- `tools/lib/posiciones.ts` -- `leerIncipitsDelCorpus(raiz, {tope?})` y `guardarIncipits` (patrón `leerOrdenDeLosIndicesDelCorpus`/`guardarOrdenDeLosIndices`, l. 155–185). Solo lectores de `corpus.ts`; `tests/unit/orden-del-libro.test.ts` l. 966–978 prohíbe `includes(`, `startsWith(`, `indexOf`… en este fichero y fija sus imports de `corpus.ts`: la lógica va a `pasaje.ts`, y la lista de lectores permitidos se amplía con los que se usen (`leerFichasDeObra` y el lector de documento declarado).
- `tools/lib/corpus.ts` -- `leerFichasDeObra` (l. 604); lector de un documento de Fuente con su cabecera (nuevo, p. ej. `leerDocumentoDeFuente(rutas, nombre)` → `{cabecera, cuerpo} | null | undefined`, con `analizarDocumento`, l. 2268 de `documento.ts`), para no leer los 1.400; `yamlDeFicha` emite `incipit` tras `wikidata`.
- `tools/lib/cotejo.ts` -- `documentosDeCita` (l. 355), `colapsarEspacios` (l. 61), `localizar` (l. 191), `tramoEnCrudo` (l. 77): reutilizar, no tocar.
- `tools/lib/fuentes.ts` -- `FUENTES` (l. 173): nombre y licencia por id.
- `src/content.config.ts` -- colección `incipits` tras `indices` (l. ~372–405), schema `porFicha: record(string, {documento, texto, fuente:{nombre, licencia?, url}})`; añadir a `collections`. Imports de `tools/lib/` solo desde `posiciones.ts` (test l. 944).
- `src/lib/admision.ts` -- `esquemaDeObra` (l. 626), campo tras `wikidata` (l. 703); mensajes l. 730–737; `tests/unit/obras.test.ts` (l. ~129) fija el mensaje.
- `src/lib/obras.ts` -- `FichaDeObra` (l. 180) gana `incipit?: { documento: string; desde: string }`; tipo `IncipitDeObra` para la página (`src/` no importa de `tools/lib/`).
- `src/lib/publicado.ts` -- `aplanarFichaDeObra` (l. 1455) copia `incipit`; fachada `incipitsDeLasObras()` (patrón `pasajesDeLasCitas`, l. 1592) → `ReadonlyMap<string, IncipitDeObra>`.
- `src/lib/atribucion.ts` -- `ROTULO_COMO_EMPIEZA`, `lineaDeLaFuenteDelIncipit`.
- `src/components/ComoEmpieza.astro` (nuevo) -- usa `src/components/Desplegable.astro` (API: `rotulo` + slot; rompe con slot vacío); estilos inline como `src/components/FichaTecnica.astro`.
- `src/pages/obra/[autor]/[slug]/[...page].astro` -- `getStaticPaths` (l. 83–90): pasar `incipit` solo a la página 1; el bloque entre `</header>` y `ul.listado` (l. ~190); comentario de cabecera (l. 10–17) al día. No añadir reglas a su `<style>`.
- `tools/lib/obras.ts` -- `datosDeFicha` (l. 505), `reunirFichas` (`nueva` l. 597, parte l. 665), nueva `declararIncipit(rutas, ficha, documento, desde, esquema?)` junto a `atarEntidadDeWikidata` (l. 1537, patrón de mensajes y `NADA_ESCRITO`); resolver las Citas de la ficha con `resolverObras` de `src/lib/obras.ts` (l. 848) sobre `leerCitas` y las fichas.
- `tools/obra.ts` -- `case 'incipit'` (patrón `case 'wikidata'`, l. 274), cabecera (l. 49–54) y `USO` (l. 107).
- `src/lib/umbrales.ts` -- tras `MAX_CARACTERES_DEL_PASAJE` (l. 41) el tope; tras `DESPLIEGUE_DE_LA_BUSQUEDA_CON_FILTROS` (l. 178) la jornada; `SerieDeMedicion` (l. 196), `CORTES_DE_SERIE_DECLARADOS` (l. 221).
- `tools/lib/lineaBase.ts` -- `series` (l. 868), `NOMBRE_DE_SERIE` (l. 1483), bucle del informe (l. 1574).
- `tools/lib/cambios.ts` -- `CAMPOS_QUE_PINTA.obra.obra` (l. 297).
- Pruebas de patrón: `tests/unit/pasaje-build.test.ts` (parche de la constante en la copia con `ficheros`, regex de la declaración), `tests/unit/ficha-tecnica-build.test.ts` (fixture >50 Citas, afiliación encendida, byte a byte), `tests/unit/obra-cli.test.ts`, `tests/unit/linea-base.test.ts` l. 486–540 (`umbralesCon`, lista de jornadas declaradas), `tests/unit/fecha-de-cambio.test.ts`, `tests/unit/ingreso-construido.test.ts` l. 374 (guarda «sin `<style>`»), `tests/e2e/ficha-tecnica.spec.ts` (servidor propio, axe, 360 × 640, 320 px), `tests/unit/ayuda/construir.ts`, `componerDocumento` de `tools/lib/documento.ts`.

## Tasks & Acceptance

**Execution:**
- `tools/lib/pasaje.ts`, `tools/lib/lineas.ts` -- `incipitDe`, `ofreceIncipit`, predicado del pie -- AD-30, FR-61.
- `src/lib/umbrales.ts`, `tools/lib/lineaBase.ts` -- dos constantes, serie y corte -- AD-9, AD-13.
- `src/lib/admision.ts`, `src/lib/obras.ts`, `tools/lib/corpus.ts` -- esquema, tipo, YAML, lector de un documento -- AD-25.
- `tools/lib/obras.ts`, `tools/obra.ts` -- orden y conservación -- AD-25, AD-30.
- `tools/lib/posiciones.ts`, `src/content.config.ts`, `src/lib/publicado.ts` -- cargador `incipits` y fachada -- AD-23, AD-30.
- `src/lib/atribucion.ts`, `src/components/ComoEmpieza.astro`, página de Obra -- el desplegable -- UX-DR124, UX-DR128, UX-DR146.
- `tools/lib/cambios.ts` -- `incipit` en la tabla -- AD-27.
- `tests/unit/incipit.test.ts` (nuevo, puro) -- cada fila de corte de la matriz, `verso-espaciado`, pie de licencia, fin de documento, `ofreceIncipit` (sin tope, borde, uno más).
- `tests/unit/obra-cli.test.ts` (o `incipit-cli.test.ts` nuevo) -- la orden: escribe y el YAML reabre; códigos 1 (ficha, documento ausente, biografía, ajeno, indeterminada, no localiza, repetido) y 2; conservación por `titular`, `separar`, `retirar`, `documentar` con ajuste de título, `restituir-grafia`; `reunir` conserva el de la destino, no hereda y lo dice.
- `tests/unit/incipit-build.test.ts` (nuevo, construye; tope parcheado en la copia con regex, nunca fijado) -- página 1 con `<details>` sin `open`, `<summary>` «Cómo empieza», incipit con su `\n` de verso, Fuente con `href` = `url:` sin `target` ni `data-zona`, todo bajo `data-pagefind-ignore="all"`, entre `</header>` y `ul.listado`; nada en `/2/` (fixture > `CITAS_POR_PAGINA`), ni en el JSON-LD, ni en Obra sin incipit; con el tope `undefined`, ninguna página lo lleva; build en rojo nombrando la ficha con `desde` perdido y con documento ausente; el bloque byte a byte igual con la afiliación encendida y una tienda de prueba.
- `tests/unit/linea-base.test.ts` -- la lista de jornadas declaradas incluye `DESPLIEGUE_DEL_INCIPIT`; con valor (copia parcheada) el corte parte solo `continuacion-de-obra`, sin valor no está en `CORTES_DE_SERIE`; el informe nombra la serie.
- `tests/unit/fecha-de-cambio.test.ts` -- declarar `incipit` en una ficha fecha y avisa solo esa Página de Obra (ni su Página de Cita, ni la portada); `incipit` clasificado.
- `tests/unit/orden-del-libro.test.ts`, `tests/unit/obras.test.ts`, `tests/unit/ingreso-construido.test.ts` -- lectores permitidos de `posiciones.ts`, mensaje de claves, `ComoEmpieza.astro` en la guarda «sin `<style>`».
- `tests/e2e/incipit.spec.ts` (nuevo, puerto 4406, `--project=escritorio`) -- copia con una Obra de título de Larra (177 caracteres), Ficha técnica completa e incipit: axe sin infracciones cerrado y abierto, Intro sobre el `<summary>` lo abre sin mover el foco, a 320 px `scrollWidth <= clientWidth`; a 360 × 640 se mide el borde superior de la primera Tarjeta y se anota en Design Notes (no es puerta: la 32.4 retira el salto y juzga SM-C4).
- `AGENTS.md` -- el párrafo del incipit.

**Acceptance Criteria:**
- Given el Corpus real (ninguna ficha con `incipit`), when se construye la rama y su base con la misma `FECHA_JORNADA`, then todo HTML de `dist/` es idéntico salvo, en las Páginas de Obra, la hoja de estilos (contenido de `<style>` o `href` de su `<link rel="stylesheet">`), cuyas reglas añadidas son solo las de `Desplegable.astro`, más los cinco ficheros que rotan y los filtros de Pagefind que no se reproducen (32.1); ningún HTML gana `<details>` ni «Cómo empieza», y el build no avisa de colección vacía.
- Given una Obra con incipit construida con fixtures y el tope con valor en la copia, when corren Vitest y `tests/e2e/incipit.spec.ts`, then «Cómo empieza» sale plegado tras la Cabecera y antes del listado, con el incipit cortado en frase o verso y su Fuente, y axe no da infracción.
- Given `tests/unit/medicion.test.ts`, `tests/unit/tipografia-en-tokens.test.ts`, `tests/unit/desplegable.test.ts`, `tests/unit/lineas.test.ts`, `tests/unit/huella.test.ts` y `npx astro check`, when se ejecutan, then pasan sin zona nueva, sin literal tipográfico, sin `<details>` propio, sin otro lector de saltos y sin mover el vocabulario.

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

## Design Notes

- **La única diferencia de `dist/` con el Corpus real es CSS, y es inevitable.** Astro emite la hoja de un componente por el grafo de importaciones aunque no se pinte (lo dice la cabecera de `Desplegable.astro` y la nota de `Sostener.astro` en AGENTS.md); el AC pide a la vez `Desplegable.astro` y «`dist/` no cambia». Se lee como: ningún contenido cambia; la hoja de la Página de Obra gana exactamente las reglas acotadas de la primitiva. Por eso `ComoEmpieza.astro` va sin `<style>` y la página no gana reglas: la diferencia queda reducida a eso, y la 32.4 la tendría igual al plegar «Dónde leer».
- **El build no repite el casado.** Si lo repitiera, retirar la última Cita de ese documento (`documentar --retirar`, que no sabe del incipit) rompería la construcción siguiente. Documento, forma y `desde` son del documento versionado, que no se reescribe: comprobarlos en el build no lo ata a las Citas.
- **Una entrada `porFicha` siempre presente** (patrón de `indices`): la colección nunca está vacía, así que se consulta sin guarda y sin aviso.
- **`\n` y `pre-line`**: el corte decide en `tools/lib/` (único intérprete de saltos) y entrega un texto donde solo hay salto en fin de verso o de párrafo; la página no interpreta nada.
- Medida de la primera pantalla: la anota la implementación (e2e).
- **Decisión del orquestador (bajo la delegación de Héctor del 2026-11-08):** con el Corpus real, la única diferencia de `dist/` aceptada es que la hoja de estilos de las Páginas de Obra gana las reglas de `Desplegable.astro` (Astro emite el CSS de un componente importado aunque no se pinte); no se acepta ninguna diferencia de contenido.
- **Medida de la primera pantalla (e2e, 2026-11-08):** a 360 × 640, en la página 1 de la Obra de Larra (título de 177 caracteres) con la Ficha técnica completa, el salto de la 24.7 y «Cómo empieza» cerrado, la primera Tarjeta del listado empieza a **669,5 px**: fuera de la primera pantalla por 29,5 px. No es puerta aquí (lo dice el spec): la 32.4 retira el salto «Dónde leer esta obra ↓» y juzga SM-C4 con la página reordenada.
- **`incipitDelDocumento` vive en `tools/lib/posiciones.ts`, no en `pasaje.ts`:** `tests/unit/pasaje.test.ts` exige que `pasaje.ts` no localice (ni `localizar` ni `indexOf`), así que el paso que juzga la forma y localiza `desde` —el que comparten la orden y el cargador— va junto al otro localizador del build, y `pasaje.ts` conserva solo el corte (`incipitDe`) y la decisión (`ofreceIncipit`). La orden (`tools/lib/obras.ts`) lo importa de ahí.
- **La primera consumidora de `Desplegable.astro`** es `ComoEmpieza.astro`, así que se quita la prueba temporal de `tests/unit/desplegable.test.ts` («ninguna página ni componente del sitio lo importa todavía»), como su propio comentario manda; la permanente («ningún fichero escribe su `<details>`») sigue.
- **La portada y el aviso:** el incipit entra solo en `CAMPOS_QUE_PINTA.obra.obra`, así que fecha y avisa por la relación solo su Página de Obra (ni la de Cita ni los listados). La portada no tiene fecha; `componerAviso` la sigue avisando ante **cualquier** cambio del Corpus que no sea un documento —una ficha incluida—, regla gruesa anterior a esta historia que no se toca aquí.

## Verification

**Commands:**
- `npx vitest run tests/unit/incipit.test.ts` -- verde.
- `npx vitest run tests/unit/obra-cli.test.ts tests/unit/obras.test.ts tests/unit/linea-base.test.ts tests/unit/fecha-de-cambio.test.ts tests/unit/lineas.test.ts tests/unit/orden-del-libro.test.ts` -- verde.
- `npx vitest run tests/unit/incipit-build.test.ts tests/unit/ingreso-construido.test.ts tests/unit/medicion.test.ts tests/unit/tipografia-en-tokens.test.ts tests/unit/desplegable.test.ts tests/unit/huella.test.ts` -- verde.
- `npx astro check` -- 0 errores.
- `npx playwright test tests/e2e/incipit.spec.ts --project=escritorio` -- verde; medida anotada.
- `FECHA_JORNADA=2026-11-08 npm run build` en la rama y en la base (worktree desprendido bajo `/Users/hec/brainlySabiduria/.claude/v9-ralph/tmp-wt/`, retirado después): comparar `dist/` como dice el primer AC, nombrando los ficheros que difieren.
- `npm test` (con `correr.sh`) -- verde.

## Auto Run Result

Status: done
Blocking condition: ninguna.

**Resumen.** Nace el campo `incipit: {documento, desde}` de la Ficha de Obra, con un único escritor (`npm run obra -- incipit`), que comprueba casado, forma y localización; el cargador `incipits` lo repite en cada build (rompe nombrando la ficha) y entrega el incipit cortado en frase o verso por `incipitDe`; la página 1 de Obra lo pinta plegado en «Cómo empieza» (`Desplegable.astro`) entre la Cabecera y el listado. Nacen `MAX_CARACTERES_DEL_INCIPIT` y `DESPLIEGUE_DEL_INCIPIT` en `undefined`, la serie `continuacion-de-obra` y su corte. Ninguna ficha real declara incipit.

**Ficheros.**
- `tools/lib/pasaje.ts` — `ofreceIncipit`, `incipitDe` (corte por frase o verso, parado ante el pie de licencia).
- `tools/lib/lineas.ts` — exporta `esPieDeLicencia`.
- `tools/lib/posiciones.ts` — `incipitDelDocumento` (forma + localización, compartido), `leerIncipitsDelCorpus`, `guardarIncipits`.
- `tools/lib/corpus.ts` — `leerDocumentoDeFuente` (un solo documento) y `incipit` en `yamlDeFicha`.
- `tools/lib/obras.ts` — `declararIncipit`; `datosDeFicha` y `reunirFichas` conservan / no heredan y lo dicen.
- `tools/obra.ts` — suborden `incipit`, cabecera y `USO`.
- `tools/lib/cambios.ts` — `incipit` en `CAMPOS_QUE_PINTA.obra.obra`.
- `tools/lib/lineaBase.ts` — serie `continuacion-de-obra` (partida, nombre e informe), sin juicio.
- `src/lib/umbrales.ts` — las dos constantes, la serie y el corte.
- `src/lib/admision.ts` — `incipit` estricto en `esquemaDeObra` y mensajes al día.
- `src/lib/obras.ts` — `FichaDeObra.incipit`, tipo `IncipitDeObra`.
- `src/lib/publicado.ts` — `aplanarFichaDeObra` lo copia; fachada `incipitsDeLasObras`.
- `src/lib/atribucion.ts` — `ROTULO_COMO_EMPIEZA`, `lineaDeLaFuenteDelIncipit`.
- `src/content.config.ts` — colección `incipits` (una entrada `porFicha`).
- `src/components/ComoEmpieza.astro` — nuevo, sin `<style>`.
- `src/pages/obra/[autor]/[slug]/[...page].astro` — el bloque en la página 1.
- `AGENTS.md` — párrafo del incipit.
- Pruebas: `tests/unit/incipit.test.ts`, `incipit-cli.test.ts`, `incipit-build.test.ts`, `tests/e2e/incipit.spec.ts` (nuevas); `linea-base`, `fecha-de-cambio`, `orden-del-libro`, `obras`, `ediciones-en-venta`, `ingreso-construido`, `desplegable` (al día).

**Revisión.** Las capas externas no traen hallazgos en esta pasada: 0 parches, 0 diferidos, 0 rechazados. Seguimiento recomendado: no (0 alto, 0 medio, 0 bajo; puntuación 0).

**Verificación.**
- `npx vitest run tests/unit/incipit.test.ts` — 31 verdes.
- `npx vitest run tests/unit/incipit-cli.test.ts` — 20 verdes.
- `tests/unit/incipit-build.test.ts` — 7 verdes (tope parcheado en la copia).
- Grupo `obra-cli`, `obras`, `lineas`, `orden-del-libro`, `ediciones-en-venta`, `ingreso-construido`, `medicion`, `tipografia-en-tokens`, `desplegable`, `huella`, `pasaje`, `pasaje-build`, `ficha-tecnica-build`, `superficies`, `peso` — verde tras mover `incipitDelDocumento` a `posiciones.ts`; `linea-base`, `fecha-de-cambio` verdes.
- `npx astro check` — 0 errores.
- `npx playwright test tests/e2e/incipit.spec.ts --project=escritorio` — 4 verdes; axe sin infracciones cerrado y abierto; Intro abre sin mover el foco; sin desplazamiento a 320 px; primera Tarjeta a 669,5 px a 360 × 640 (anotado en Design Notes, no es puerta).
- `FECHA_JORNADA=2026-11-08 npm run build` en la rama y en la base (worktree desprendido en `7ff35e7ab0`, retirado): difieren 548 HTML, todos en `obra/`, y **solo** en el `<style>` en línea, que gana exactamente las 7 reglas de `Desplegable.astro`; además `pagefind/filter/*`, `pagefind.es_*.pf_meta` y `pagefind/pagefind-entry.json` (los filtros de Pagefind que no se reproducen). Ningún HTML trae `<details>` ni «Cómo empieza»; los cinco que rotan, idénticos; sin aviso de colección vacía.
- `npm test` — 171 ficheros, 7.665 pruebas, verde.

**Riesgos residuales.** La primera Tarjeta de la Obra de Larra cae a 669,5 px en 360 × 640 con el desplegable puesto (lo resuelve la 32.4 al retirar el salto). La portada se sigue avisando ante cualquier cambio de ficha (regla gruesa previa). Un `desde` que coincida antes en el documento que el comienzo deseado se sitúa en la primera aparición (`localizar`): quien declara elige un `desde` que no se repita.

---
title: 'Historia 35.9 — La Obra con derechos vigentes se vende sola'
type: 'feature'
created: '2026-11-15'
status: 'done'
baseline_revision: 'b1282748aefa743d7a1715581e22d40122d55cb4'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-35-context.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Pendiente de Héctor (bmad-ux): asentar en DESIGN.md el espaciado de la venta sola, el primer grupo de venta a 2 × --unidad del summary sin el 3 × que lo separaría de Gratis.
    evidence: |-
      EdicionesEnVenta.astro gana la prop `sola` para cumplir UX-DR127 en la Obra con derechos vigentes; es una [ASSUMPTION] de presentación aceptada por la delegación de Héctor del 2026-11-14.
    location: >-
      src/components/EdicionesEnVenta.astro
    severity: low
---

<intent-contract>

## Intent

**Problem:** La Página de Obra trata igual a toda Obra: a la de un Autor vivo o de un Personaje le ofrecería «Gratis», la frase de lo tomado, «Cómo empieza» y «Cómo citar», y escondería sus ediciones en venta porque «nunca van solas». La venta sola de FR-70 (AD-20 y AD-25 v9.1, EXPERIENCE.md § Dónde leer y § State Patterns) no existe todavía, y lo cotejado cuenta también una atribuida que trae Fuente.

**Approach:** `src/lib/obras.ts` deriva `derechosVigentes` de cada Obra resuelta desde su dueño con `derechosVigentes` de `src/lib/clase.ts`, en una sola función; lo cotejado cuenta solo la clase de siempre; y las exclusiones con nombre que dejaron la 32.3, la 32.4, la 32.5 y la 33.3 (`ofreceIncipit`, `dondeLeer`, `obraTieneComoCitar`, `curar-primero`) se apoyan en ese dato. La relación de AD-27 fecha y avisa lo que mueve un cambio de `AÑO_DE_REFERENCIA` o `PLAZO_DE_PROTECCION_AÑOS`.

## Boundaries & Constraints

**Always:**
- Una sola regla: `derechosDeLaObra(ficha, autores, referencia?)` (nombre orientativo) en `src/lib/obras.ts`, sobre `dueñoDeFicha` + `derechosVigentes`/`dueñoAutor`; un Personaje dueño, siempre `true`. Toda otra pieza (build, cargador de incipits, orden `incipit`, `curar-primero`, relación) la llama; ninguna recalcula.
- `ObraResuelta` gana `derechosVigentes: boolean`; `resolverObras`/`colgarObras` reciben los Autores (slug, `vivo`, `añoFallecimiento`) como parámetro obligatorio y lanzan, nombrando la ficha, ante un Autor dueño que no está.
- Lo cotejado es de la clase de siempre (`esAtribuida`): `fuentes`, `edicionCotejada`, los grupos de `dondeLeer`, `edicionQueEncabeza`/`traductorDeLaEdicionQueEncabeza` y `avisosDeEdicionesSinCotejada` ignoran la Fuente de una atribuida (que sí cuenta en `total`).
- Obra con derechos vigentes, página 1: sin «Gratis», sin `textoDeLoTomado`, sin «Ninguna de sus citas tiene todavía documento cotejado.»; con afiliación encendida y admitida y sin congelación, «Dónde leer esta obra» (mismo rótulo, `Desplegable`) solo con `EdicionesEnVenta` (`edicionesPorFormato`, un `data-ingreso`); si no, no hay desplegable ni hueco. Sin «Cómo empieza», «Cómo citar» (`obraTieneComoCitar` → `false`), y la línea de Ficha técnica sin traductor.
- `ofreceIncipit` gana `derechosVigentes` (motivo propio, decidido primero); el cargador de incipits se lo pasa; `npm run obra -- incipit` se niega con 1 y nada escrito en esa ficha; `integraciones/obras.ts` rompe el build si una ficha con derechos vigentes declara `incipit`, nombrándola.
- `curar-primero`: propone también la Obra con derechos vigentes sin edición cotejada —incluida la de un Personaje sin Autor, que hoy filtra el merge (`c.autor !== undefined`)— y lo dice en su línea; la de dominio público sin cotejada sigue en «Fuera»; congelada, nada.
- AD-27: un commit que solo cambie `AÑO_DE_REFERENCIA` o `PLAZO_DE_PROTECCION_AÑOS` fecha (sitemap, `integraciones/historial.ts`) y avisa (`tools/avisar.ts`) exactamente las Obras cuyo `derechosVigentes` cambia con el Corpus de hoy y las Páginas de Cita de sus atribuidas; ni la portada ni nada más. El comparador sigue siendo `cambiaronLosCampos` (un `CampoDerivado` sobre la versión de `umbrales.ts`); una versión con plazo y sin año cuenta como cambio, sin lanzar. La regla de indexables (`reglaCambiada`) no cambia.
- Con el Corpus real (sin Obras con derechos vigentes ni atribuidas) `dist/` es idéntico byte a byte; `TIENDAS` vacío, afiliación apagada, `AÑO_DE_REFERENCIA` y `PLAZO_DE_PROTECCION_AÑOS` en `undefined`: los valores se dan solo en copias de prueba.
- `AGENTS.md`: «Encender la afiliación de libros» y «La Tarjeta de Obra» dicen la venta sola, y las líneas que afirman «una edición solo se pinta en una Obra con alguna Cita cotejada» llevan su excepción.

**Block If:** cumplir un criterio exigiera dar valor a una constante reservada a Héctor en el árbol, editar `_bmad-output/planning-artifacts/` o `specs/`, o un texto visible nuevo que no fije EXPERIENCE.md (la línea de `curar-primero` es de consola y la redacta el agente).

**Never:** leer los derechos de la ficha ni teclearlos; tocar `src/lib/vocabulario.ts`, zonas o eventos; un `<style>` en `EdicionesEnVenta`; admitir donaciones o publicidad en la Obra; sembrar el Corpus real; e2e en esta sesión (el barrido lo corre Héctor).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Venta sola | Obra de Autor `vivo: true`, 2 atribuidas (una con Fuente), 2 ediciones, afiliación encendida, sin congelar | «Dónde leer» con solo Electrónica/Impresa dentro del `data-ingreso`; sin aviso «Ediciones sin edición cotejada» | — |
| Apagada o congelada | lo mismo, Modelo apagado o `CONGELACION_DE_OBRAS` | ni `<summary>`, ni rótulo, ni hueco; `dist/` igual con y sin ediciones | — |
| Personaje | Obra de Personaje, atribuida con Fuente | `derechosVigentes`, Tarjeta «Ver la obra ›», sin «Cómo citar» ni incipit | — |
| DP con atribuida | Obra de Autor DP: 1 de siempre con Fuente + 1 atribuida con Fuente | «Gratis» con una línea de 1 Cita, «se tomó 1 de sus 2 citas» | — |
| Incipit vetado | ficha con derechos vigentes y `incipit` | orden: código 1, nada escrito; build: rompe nombrando la ficha | mensaje nombra la ficha |
| Autor ausente | ficha cuyo Autor no está en la lista | `resolverObras` lanza | nombra la ficha |
| Plazo movido | copia con `PLAZO`/`AÑO` cambiados en un commit | fechadas y avisadas solo la Obra que cambia y sus atribuidas | plazo sin año: cambio, sin lanzar |

</intent-contract>

## Code Map

- `src/lib/clase.ts` — `derechosVigentes`, `dueñoAutor`, `esAtribuida`, `ReferenciaDeDerechos`: la regla que se reutiliza; no se toca.
- `src/lib/obras.ts` — `ObraResuelta` (l.922), `resolverObras` (l.1039, `cotejadas = suyas.filter(tieneFuente)`), `colgarObras` (l.1097), `avisosDeEdicionesSinCotejada` (l.1171), `ordenDelLibro` (l.1411: sin posición → por slug, ya cumple), `CitaParaDondeLeer` (l.1483), `edicionQueEncabeza` (l.1626), `obraTieneComoCitar` (l.1665, «la 35.9 añadirá»), `dondeLeer` (l.1690, «lo ampliará la 35.9»).
- `src/lib/publicado.ts` — `obrasDeLosDatos`/`obrasDelConjunto` (l.1352–1385) y `conjuntoPublicable` (l.2056, `colgarObras(...)` con `entradasDeAutor` leído más abajo: subirlo).
- Otros llamadores de `colgarObras`/`resolverObras`: `integraciones/obras.ts:136`, `integraciones/historial.ts:454`, `tools/lib/alcance.ts:113`, `tools/lib/casiDuplicados.ts:102`, `tools/lib/obras.ts:1387`, `tools/lib/curarPrimero.ts:380`.
- `src/pages/obra/[autor]/[slug]/[...page].astro` — `dondeLeer(citas)`, `traductor`, `enVenta` (l.170), `conDondeLeer`, `conComoCitar` con la guarda `autorDeLaReferencia` del merge (l.158; conservarla como estrechamiento de tipo).
- `src/components/DondeLeer.astro` — ramas «Gratis»/«sin-cotejo»; añadir la de venta sola. `src/components/EdicionesEnVenta.astro` — sin cambios.
- `src/lib/atribucion.ts:712` `contenidoDeTarjetaDeObra` — lee `edicionCotejada`: sale «Ver la obra ›» solo con el cambio de lo cotejado.
- `tools/lib/pasaje.ts:229` `ofreceIncipit`, `incipitDe` (l.316), `MotivoSinIncipit` (l.212); `tools/lib/posiciones.ts:313` `leerIncipitsDelCorpus`; `tools/lib/obras.ts:1900` `declararIncipit` y `MOTIVO_SIN_INCIPIT` (l.1881).
- `integraciones/obras.ts:63` `revisar()` — tiene `fichasDeAutor`, `fallosDeObras`, `avisosDeEdicionesSinCotejada(fichas, citas)`.
- `tools/lib/curarPrimero.ts` — `componerCuracion` (l.215, `filter(o => o.edicionCotejada)`), `CandidataDeCuracion` (l.181), `lineasDeCuracion` (l.277).
- AD-27: `tools/lib/cambios.ts` (`CampoDerivado` l.189 con `NOMBRE_EN_REFERENCIA` de modelo, `CitaParaFechar`/`ObraParaFechar`/`EntidadParaFechar` l.439–494, `relacionDeSuperficies` l.556); `integraciones/historial.ts` (`analizarVersion` l.239, `historialDeLosFicheros`, `corpusParaFechar` l.432, `fechasDeLasSuperficies` l.532); `tools/lib/avisar.ts` (`componerAviso` l.166: la portada por `familiaDeFichero`, que para `umbrales.ts` es `undefined`); `tools/avisar.ts` (`FICHERO_DE_LA_REGLA` l.220, `leerRango` l.323); `constanteNumerica` en `tools/lib/obras.ts:1450`. `tests/unit/indexnow.test.ts` espera `familiaDeFichero('src/lib/umbrales.ts')` indefinido: no darle familia.
- Pruebas modelo: `tests/unit/ingreso-construido.test.ts` y `tests/unit/ayuda/construir.ts` (`construirConCorpus`, `fuenteConModeloEncendido`, `fuenteConTiendaDePrueba`, `TIENDA_DE_PRUEBA`, `registroDeClasesDe`); `tests/unit/ediciones-en-venta.test.ts`, `como-citar-obra-build.test.ts`, `incipit-build.test.ts`, `incipit-cli.test.ts`, `curar-primero.test.ts`, `tarjeta-de-obra.test.ts`, `fecha-de-cambio.test.ts`, `indexnow.test.ts`, `obras.test.ts` (`obraTieneComoCitar` «la 35.9 añadirá»), `tests/e2e/ingreso-accesible.spec.ts` (l.567). Atribuidas de prueba: ver `tests/unit/personaje-donde-el-autor.test.ts` y `clase-build.test.ts` (las constantes de la puerta se dan en la copia).

## Tasks & Acceptance

**Execution:**
- `src/lib/obras.ts` -- la función única de derechos de la Obra; `derechosVigentes` en `ObraResuelta`; Autores obligatorios en `resolverObras`/`colgarObras`; lo cotejado sin atribuidas (`CitaParaObra`/`CitaParaDondeLeer` con `clase?`); `dondeLeer(citas, { derechosVigentes })` que en ella no da grupos (con un indicador en `ResumenDondeLeer`); `obraTieneComoCitar(obra)` → `!obra.derechosVigentes` (cubre el Personaje sin cotejada); `avisosDeEdicionesSinCotejada` y un fallo «incipit en Obra con derechos vigentes» que reciben los derechos de cada ficha -- AD-20/25/30 v9.1.
- `src/lib/publicado.ts` y los seis llamadores del Code Map -- pasar los Autores leídos; `curarPrimero` deja de excluir las Citas de Personaje sin Autor (mismo filtro que `obrasDelConjunto`) -- un dueño, una regla.
- `src/pages/obra/[autor]/[slug]/[...page].astro` y `src/components/DondeLeer.astro` -- venta sola; sin desplegable si no hay nada; traductor `undefined` con derechos vigentes -- FR-54, FR-70.
- `tools/lib/pasaje.ts`, `tools/lib/posiciones.ts`, `tools/lib/obras.ts` (`declararIncipit`, `MOTIVO_SIN_INCIPIT`), `integraciones/obras.ts` -- el veto del incipit en sus tres puertas -- AD-30 v9.1.
- `tools/lib/curarPrimero.ts` -- candidatas cotejadas o con derechos vigentes; la línea lo dice; el titular deja de decir «con edición cotejada» a secas -- FR-62 v9.1.
- `tools/lib/cambios.ts`, `integraciones/historial.ts`, `tools/lib/avisar.ts`, `tools/avisar.ts` -- `umbrales.ts` como componente de la Obra de Autor con `añoFallecimiento` (no `vivo`) y de las Páginas de Cita de sus atribuidas, con un `CampoDerivado` que da su veredicto de derechos; leer sus transiciones (`constanteNumerica`) en el historial y como `CambioDeFichero` en el rango; sin avisar la portada -- AD-27 v9.1.
- `tests/unit/` -- la matriz: puros en `obras.test.ts`, `pasaje.test.ts`, `curar-primero.test.ts`, `fecha-de-cambio.test.ts`/`indexnow.test.ts` (relación y aviso moviendo `PLAZO`/`AÑO` en una copia con git); build en un fichero nuevo `tests/unit/venta-sola-build.test.ts` (página 1 encendida/apagada/congelada, Tarjeta, sin «Cómo citar»/«Cómo empieza»/pasaje, Ficha técnica sin traductor, tope `MAX_BYTES_DE_GUION`, incipit que rompe) y en `ingreso-construido.test.ts` (`dist/` idéntico con y sin ediciones con el Modelo apagado); `obras.test.ts` deja de afirmar «toda Obra lleva Cómo citar».
- `tests/e2e/ingreso-accesible.spec.ts` -- añade al corpus de la copia una Obra con derechos vigentes y dos ediciones, y la barre encendida (lo corre Héctor).
- `AGENTS.md` -- las secciones de las Always.

**Acceptance Criteria:**
- Given el Corpus real, when `npm run build` se compara con la construcción de antes (`git worktree add --detach` de `fa03c0773f00546dfcb9ec946a1bf4a000487d9f`), then ningún fichero de `dist/` cambia.
- Given una Obra con derechos vigentes publicada en una copia, when se sirve su página 1, then sigue sin `data-ingreso` de donaciones ni publicidad, y su 2+ no lleva ninguno.
- Given sus Citas atribuidas, when se pinta la Página de Cita, then su Tarjeta de Obra dice «Ver la obra ›» igual con el Modelo encendido o apagado, y no hay «Lee el pasaje».
- Given `npx astro check` y los ficheros de prueba tocados, when se corren, then 0 errores y todo en verde.

## Spec Change Log

## Review Triage Log

### 2026-11-15 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

Las cinco capas de revisión son externas (las corre el orquestador de v9-ralph) y esta pasada no trae hallazgos suyos.

### 2026-11-15 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 9 (high 0, medium 2, low 7)
- defer: 0
- reject: 22
- addressed_findings:
  - `[medium]` `[patch]` `versionDeUmbrales` leía con una expresión sin ancla: una declaración comentada contaba, una sin `;` o repartida en líneas se leía en silencio como «sin valor» y un decimal valía de plazo. Ahora busca al principio de línea, admite la falta de `;`, un comentario detrás y `70_000`; un decimal, un negativo, un `as` o una declaración que no reconoce son indeterminables (`¿?`), nunca «sin valor». Pruebas nuevas sobre esas formas y sobre el texto real de `src/lib/umbrales.ts` con 70/2026 dados en la copia (`tests/unit/fecha-de-cambio.test.ts`).
  - `[medium]` `[patch]` El aviso por rango (`tools/avisar.ts` `leerRango`/`ensayoDelRango`) no tenía ninguna prueba con un commit que solo diera valor al plazo y al año. `tests/unit/avisar-rango.test.ts` gana el commit `plazo-dado` (1970/2026, Séneca †65) y dos casos: avisa exactamente Cartas y Brevedad —Ira cambia de veredicto pero no se indexa—, sin portada; el ensayo fecha las tres Obras y nada más. Se comprobó que quitar `deLaRegla` los pone en rojo.
  - `[low]` `[patch]` `integraciones/obras.ts`: con Fichas técnicas, `resolverObras` lanzaba un `Error` suelto ante una ficha cuyo Autor no está, antes de que `fallosDeObras` lo nombrara con los demás. El aviso de año de la Ficha técnica no se compone mientras alguna ficha tenga un dueño sin resolver.
  - `[low]` `[patch]` `npm run obra -- casi-duplicados` y `curar-primero` salían por una traza si colgar las Obras lanzaba (Autor ausente, plazo sin año): ahora se niegan con su resultado `ok: false` y sin escribir.
  - `[low]` `[patch]` `dondeLeer` en la venta sola daba `citasSinDocumento: citas.length`; ahora es el recuento real (las sin Fuente cotejada de la clase de siempre).
  - `[low]` `[patch]` `DondeLeer.astro` en la venta sola sin ediciones pintaba un `<summary>` vacío si un uso no lo evitaba: ahora se para con un mensaje; la página ya lo evitaba.
  - `[low]` `[patch]` `tests/e2e/ayuda/corpus.ts` colgaba las Obras del Corpus real con `CUALQUIER_AUTOR` y sin `clase`: ahora lee los Autores reales (`vivo`, `añoFallecimiento`) y la clase de cada Cita, como el sitio.
  - `[low]` `[patch]` La línea de `curar-primero` «Fuera por no tener edición cotejada, de dominio público» afirmaba un estado legal; dice la regla aplicada: «… ni derechos vigentes» (orden, pruebas y AGENTS.md).
  - `[low]` `[patch]` AGENTS.md decía que crear `umbrales.ts` «no fecha nada» sin la condición: ahora dice que crearlo o borrarlo fecha lo mismo que dar o quitar sus valores, y qué declaraciones cuentan como indeterminables.

Rechazados, con su razón: la Tarjeta, el orden por slug y la Ficha técnica sin traductor en una Obra con derechos vigentes que tuviera Citas de siempre con Fuente (inalcanzable: `tools/lib/clases.ts` rompe el build ante una Cita de siempre de un Autor que no es de dominio público, y la Cita de un Personaje es siempre atribuida); que el sitio y la fecha lean distinto `vivo`/`añoFallecimiento` (los dos normalizan con `dueñoAutor`); que cambiar `vivo` o `añoFallecimiento` no refeche la Obra (`CAMPOS_DEL_AUTOR_FUERA` ya los compone); `reglaCambiada` (cubre todo cambio de `umbrales.ts`); `esElDeLosUmbrales` (solo ve las rutas que se le piden); el `primera: ''` de `ofreceIncipit` (mismo veto y mismo error del tope); `CUALQUIER_AUTOR` (ayuda de pruebas); el Personaje inexistente (lo para el build) y su nombre por slug (35.2); la lectura de la historia en el árbol de `posiciones.ts`/`historial.ts`/`alcance.ts` (estados que el build ya para con su mensaje; `alcance` ya envuelve en `try`); las lecturas del contrato (Personaje sin «Cómo citar», plazo sin año como cambio de toda Obra de Autor fallecido, Corpus de hoy); el fichero de prueba distinto de `ingreso-construido.test.ts` (registrado como desviación); el plazo sin prueba de construcción (el veredicto es el de `derechosVigentes`, probado puro, con git y por la puerta de `clases.ts` en `clase-build`, que da el plazo en la copia); la identidad de `dist/` (se repite en esta pasada); la página 2+ (la regla general de `modelosEnRuta` y `ingreso-construido`); el estado del spec antes de las capas externas (esta es su pasada; el barrido e2e de `ingreso-accesible` lo corrió en verde la capa ac-auditor, 13/13); el espaciado `sola` (ya diferido a `bmad-ux`).

### 2026-11-15 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 6 (high 0, medium 1, low 5)
- defer: 0
- reject: 32
- addressed_findings:
  - `[medium]` `[patch]` Dos versiones indeterminables distintas de `umbrales.ts` (`70 as number` → `80 as number`, o plazo sin año que pasa de 70 a 80) daban el mismo `¿?` y no fechaban ni avisaban nada. `derechosEnLosUmbrales` devuelve ahora el prefijo `¿?` seguido de lo leído de las dos constantes; prueba nueva en `tests/unit/fecha-de-cambio.test.ts`, en rojo sin el cambio.
  - `[low]` `[patch]` `versionDelLado` (alta y baja de `umbrales.ts` sin valores) no tenía prueba: un repo temporal con el Corpus, el alta y la baja en commits propios comprueba que la Obra de un Autor fallecido y la Página de Cita de su atribuida conservan la fecha del Corpus; en rojo sin `versionDelLado`.
  - `[low]` `[patch]` Las negativas que el primer triaje añadió a `casi-duplicados` y `curar-primero` ante una ficha cuyo Autor no está, sin prueba: un caso en cada fichero (`ok: false` con «No se pudieron resolver las Obras»; código 1, «las fichas de Obra», «No se ha escrito nada.», sin traza y el Corpus intacto).
  - `[low]` `[patch]` La aserción `toEqual(expect.any(Object))` sobre el `umbrales.ts` del árbol no comprobaba nada: ahora `toEqual({})`.
  - `[low]` `[patch]` Un comentario de `src/lib/publicado.ts` atribuía a la 17.2 la lectura temprana de los Autores: es de la 35.9.
  - `[low]` `[patch]` Dos líneas largas de AGENTS.md (el incipit y la afiliación) se reparten como el resto del fichero, y la frase «Apagada, `dist/` es idéntico…» vuelve a su párrafo; el bloque de resultados del spec nombra su pasada de construcción.

Rechazados, con su razón: otras formas de declaración (`export let`, sin `export`, reexportación, duplicadas, octal, hexadecimal: ninguna la usa `umbrales.ts`, TypeScript rechaza las duplicadas y el octal, y lo que no se lee cuenta como cambio, el sentido seguro); el `catch` amplio del veredicto (falla hacia fechar de más, nunca de menos); `esElDeLosUmbrales` por sufijo (solo recibe rutas relativas de git); la guarda de portada por familia (al aviso solo llegan ficheros de las familias del Corpus y `umbrales.ts`); por qué la Página de Cita de una atribuida compone `umbrales.ts` y la línea de AD-27 que lo pide (lo fija el contrato); `derechosSiSeSaben` ante una ficha sin `autor` ni `personaje`, un plazo sin año en el build, `corpusParaFechar`/`relacionAntes` y `citasConObra` ante un Autor ausente (estados que el esquema o el build ya paran con su mensaje); la guarda del incipit en la página, el `primera: ''` de `ofreceIncipit`, `CUALQUIER_AUTOR`, `autoresPorSlug` por llamada y los tipos `unknown` de `AutorParaDerechos` (defensivos o de estilo, sin camino real); `AÑO_DE_REFERENCIA` como expresión de fecha (el valor lo da Héctor, y lo no literal cuenta como cambio); la prueba del orden por slug, las filas de la matriz que faltan, la Ficha técnica con entidad y la página 2+ (cubiertas por la regla general o inalcanzables, ya rechazadas en la pasada anterior); el mensaje de `DondeLeer.astro` sin la Obra (solo lo ve un uso roto que la página evita); el índice de Pagefind (no determinista); un aviso nuevo en AGENTS.md para el parámetro de Autores (el contrato y la sección de la historia ya lo dicen); las lecturas del contrato y la desviación declarada del fichero de prueba (intent-alignment, ac-auditor); el espaciado `sola` (ya diferido a `bmad-ux`).

## Design Notes

El indicador de venta sola viaja en el resumen, no en el componente, para que la página decida existencia con un dato: `conDondeLeer = primera && (!obra.derechosVigentes || enVenta?.grupos.length > 0)`. Que todas las Citas de una Obra con derechos vigentes vayan por slug ya lo da `ordenDelLibro` (el cargador de posiciones no sitúa atribuidas, `tools/lib/posiciones.ts:120`): basta fijarlo con una prueba. El veredicto derivado de AD-27, como `NOMBRE_EN_REFERENCIA`:

```ts
const derechosEn = (dueño: DueñoDeDerechos): CampoDerivado => ({
  derivado: 'derechosVigentes', de: ['PLAZO_DE_PROTECCION_AÑOS', 'AÑO_DE_REFERENCIA'],
  valor: (v) => { try { return derechosVigentes(dueño, referenciaDe(v)); } catch { return '¿?'; } },
});
```

## Verification

**Commands:**
- `npx astro check` -- expected: 0 errores.
- `npx vitest run tests/unit/<cada fichero tocado>.test.ts` -- expected: verde (`venta-sola-build`, `ingreso-construido`, `obras`, `pasaje`, `incipit-cli`, `incipit-build`, `curar-primero`, `tarjeta-de-obra`, `como-citar-obra-build`, `ediciones-en-venta`, `fecha-de-cambio`, `indexnow`).
- `npm test` detached con `correr.sh` -- expected: EXIT=0.
- `npm run build` en el árbol y en el worktree de `fa03c0773f00546dfcb9ec946a1bf4a000487d9f`, y `diff -r` de los dos `dist/` -- expected: sin diferencias.

## Auto Run Result

### Pasada de construcción (2026-11-15)

Status: done
Blocking condition: ninguna.

**Resumen.** La Obra con derechos vigentes se vende sola (FR-70, AD-20/25/27/30 v9.1). `derechosDeLaObra` de `src/lib/obras.ts` es la única regla —el dueño de la ficha (`dueñoDeFicha`) juzgado por `derechosVigentes` de `src/lib/clase.ts`; un Personaje, siempre—, y `ObraResuelta` la lleva en `derechosVigentes`; `resolverObras`/`colgarObras` reciben los Autores como parámetro obligatorio y lanzan, nombrando la ficha, ante un Autor dueño que no está. Lo cotejado es de la clase de siempre (`tieneFuente`, `fuenteCotejada`): la Fuente de una atribuida no cuenta en `fuentes`, `edicionCotejada`, «Gratis», `edicionQueEncabeza` ni el aviso, y sí en el total. La página 1 de una Obra con derechos vigentes: sin «Gratis», frase de lo tomado ni de cotejo; «Dónde leer esta obra» solo con ediciones en venta (afiliación encendida y admitida, sin congelar), y si no, nada; sin «Cómo empieza» ni «Cómo citar» (`obraTieneComoCitar` → `!derechosVigentes`), y Ficha técnica sin traductor. El incipit se veta en sus tres puertas (`ofreceIncipit` con motivo `derechos-vigentes`, decidido primero; el cargador; `npm run obra -- incipit` con 1; el build con `fallosDeIncipitConDerechos`). `curar-primero` propone también las de derechos vigentes —también la de un Personaje sin Autor, con el filtro de `obrasDelConjunto`— y lo dice en su línea. AD-27: `src/lib/umbrales.ts` compone por su veredicto (`derechosEnLosUmbrales`, campo derivado sobre `versionDeUmbrales`) la Obra de un Autor fallecido y las Páginas de Cita de sus atribuidas; el historial y el aviso lo leen como un fichero más, sin familia (sin portada).

**Ficheros.**
- `src/lib/obras.ts` — `derechosDeLaObra`, `AutorParaDerechos`, `derechosVigentes` en `ObraResuelta`, Autores obligatorios, lo cotejado de la clase de siempre, `dondeLeer(…, { derechosVigentes })` con `ventaSola`, `obraTieneComoCitar`, aviso y `fallosDeIncipitConDerechos`.
- `src/lib/publicado.ts` — los Autores se leen antes de colgar las Obras; `obrasDeLosDatos` con `AutorParaDerechos`.
- `src/pages/obra/[autor]/[slug]/[...page].astro`, `src/components/DondeLeer.astro`, `src/components/EdicionesEnVenta.astro` — la venta sola (prop `sola`, sin el margen que la separaría de «Gratis»).
- `integraciones/obras.ts` — el fallo del incipit y el aviso con los Autores.
- `tools/lib/pasaje.ts`, `tools/lib/posiciones.ts`, `tools/lib/obras.ts` — el veto del incipit; `citasConObra` no compone la ficha provisional de un Autor que no está (la rechaza después la Pieza) y no lanza; `avisoSinCotejada` con los Autores.
- `tools/lib/curarPrimero.ts` — candidatas cotejadas o con derechos vigentes, la línea y el titular.
- `tools/lib/cambios.ts`, `integraciones/historial.ts`, `tools/lib/avisar.ts`, `tools/avisar.ts` — AD-27: `FICHERO_DE_LOS_UMBRALES`, `versionDeUmbrales`, `derechosEnLosUmbrales`, `AutorParaFechar`, `atribuida` en `CitaParaFechar`, `umbrales` en el corpus, llave de memoria por nombre de campo derivado, el historial y el rango lo leen (alta y baja = constantes sin valor), y la portada solo con familia de fichero.
- `tools/lib/alcance.ts`, `tools/lib/casiDuplicados.ts` — pasan los Autores.
- `tests/unit/venta-sola-build.test.ts` (nuevo), `tests/unit/ayuda/derechos.ts` (nuevo, `CUALQUIER_AUTOR`), `obras`, `incipit`, `incipit-cli`, `curar-primero`, `fecha-de-cambio`, `orden-del-libro`, `clase` y los fixtures de `ObraResuelta`/`colgarObras` de otras quince pruebas; `tests/e2e/ingreso-accesible.spec.ts` barre la venta sola (lo corre Héctor).
- `AGENTS.md` — curar-primero, el incipit, la Tarjeta de Obra, «Cómo citar» la Obra, la afiliación (la excepción de la venta sola) y AD-27.

**Hallazgos de revisión.** Ninguno en esta pasada (la de construcción: las capas externas aún no habían corrido): 0 parches, 0 diferidos, 0 rechazados. Las dos pasadas de revisión siguientes lo superan.

**Revisión de seguimiento (de esta pasada).** `false` — parches: 0 high, 0 medium, 0 low; puntuación 0. El valor vigente del frontmatter es el de la última pasada.

**Verificación.**
- `npx astro check`: 0 errores, 0 avisos (14 sugerencias).
- `npx vitest run` de los catorce ficheros tocados (`venta-sola-build`, `ingreso-construido`, `obras`, `pasaje`, `incipit`, `incipit-cli`, `incipit-build`, `curar-primero`, `tarjeta-de-obra`, `como-citar-obra-build`, `ediciones-en-venta`, `fecha-de-cambio`, `indexnow`, `orden-del-libro`): 705/705.
- `npm test` (correr.sh): primera pasada 9023/9026 —`pieza-cli` (la ficha provisional de un Autor ausente lanzaba en `citasConObra`), `clase.test.ts` (`tools/lib/curarPrimero.ts` lee la `clase` de una ventana de demanda: llegó con la fusión de la 33.3 y se añade a sus exentos con su motivo) y `cotejo.test.ts` (un comentario nombraba la palabra en `src/lib/obras.ts`)—; corregidos, la segunda pasada da 9026/9026, EXIT=0.
- `npm run build` con `FECHA_JORNADA=2026-11-15` en el árbol y en un worktree desacoplado de `fa03c0773f00546dfcb9ec946a1bf4a000487d9f` (retirado): `diff -rq` solo difiere en `dist/pagefind/` (`pf_meta` y filtros), que cambian también al volver a correr Pagefind sobre el mismo `dist/` de la base (no determinista); todo HTML, sitemap y PNG idénticos. `TIENDAS` vacío, afiliación apagada, `AÑO_DE_REFERENCIA` y `PLAZO_DE_PROTECCION_AÑOS` en `undefined`.
- La matriz, fila a fila: venta sola, apagada/congelada (con `dist/` entero igual con y sin ediciones) y Personaje en `venta-sola-build`; dominio público con atribuida en `obras` y `venta-sola-build`; incipit vetado en `incipit`, `incipit-cli`, `obras` y `venta-sola-build`; Autor ausente en `obras`; plazo movido en `fecha-de-cambio` (pura, con git y con el aviso).

**Decisiones y desviaciones.**
- `EdicionesEnVenta.astro` gana la prop `sola` (el Code Map lo daba sin cambios): sin ella, la venta sola llevaba los 3 × `--unidad` que la separan de «Gratis» y el primer grupo no caía a 2 × del `<summary>` (UX-DR127). [ASSUMPTION] de presentación, aceptada por la delegación de Héctor del 2026-11-14; pendiente de asentarla con `bmad-ux` en `DESIGN.md`.
- `dist/` idéntico con y sin ediciones y el Modelo apagado se comprueba en `tests/unit/venta-sola-build.test.ts` (sobre una Obra con derechos vigentes, que es donde la 35.9 lo cambia), no en `ingreso-construido.test.ts`, que sigue verde sin cambios; y el `ofreceIncipit` nuevo, en `incipit.test.ts`, donde viven sus pruebas, no en `pasaje.test.ts`.
- La línea de Ficha técnica sin traductor se garantiza por la página y por lo cotejado de la clase de siempre; no tiene prueba de construcción porque una Obra con derechos vigentes no puede reunir hoy Citas de siempre con traductor.

**Riesgos residuales.** El historial lee ahora cada versión de `src/lib/umbrales.ts` (un blob por commit que lo toca) para fechar el sitemap: más bytes por `git cat-file`, sin efecto medido en la construcción. El barrido e2e de la venta sola no se ha corrido (lo corre Héctor).

### Primera pasada de revisión (2026-11-15)

Status: done
Blocking condition: ninguna.

**Resumen.** Las cinco capas externas (blind-hunter, edge-case-hunter, verification-gap, intent-alignment, ac-auditor) se clasificaron en 9 parches, 0 diferidos y 22 rechazados, sin intent_gap ni bad_spec. Los parches, en `bf0475b4ce1d006f9204f79718dbeddabcfb69e5`: la lectura del plazo y el año en `versionDeUmbrales` (anclada, sin callar lo que no reconoce) y sus pruebas sobre el texto real; el aviso por rango con un commit que solo da valor al plazo (`avisar-rango.test.ts`); el fallo nombrado en vez del `Error` suelto en `integraciones/obras.ts`; `casi-duplicados` y `curar-primero` que se niegan en vez de lanzar; el recuento real de `citasSinDocumento` en la venta sola; la guarda de `DondeLeer.astro`; el apoyo e2e con los Autores y la clase reales; la línea «Fuera … ni derechos vigentes»; y la precisión de AGENTS.md sobre crear o borrar `umbrales.ts`.

**Ficheros.**
- `tools/lib/cambios.ts` — `versionDeUmbrales` anclada a la línea, con `;` opcional, comentario detrás y separadores; lo que no lee es indeterminable.
- `integraciones/obras.ts` — el aviso de año de la Ficha técnica no se compone mientras una ficha tenga un dueño sin resolver.
- `tools/lib/casiDuplicados.ts`, `tools/lib/curarPrimero.ts` — colgar las Obras dentro de su negativa; la línea de «Fuera».
- `src/lib/obras.ts` — `dondeLeer` en la venta sola con el recuento real.
- `src/components/DondeLeer.astro` — se para en la venta sola sin ediciones.
- `tests/e2e/ayuda/corpus.ts` — Autores y clase reales.
- `tests/unit/fecha-de-cambio.test.ts`, `tests/unit/avisar-rango.test.ts`, `tests/unit/obras.test.ts`, `tests/unit/curar-primero.test.ts` — las pruebas de los parches.
- `AGENTS.md` — AD-27 y curar-primero.

**Hallazgos.** 9 parches (high 0, medium 2, low 7), 0 diferidos, 22 rechazados (detalle en el Review Triage Log).

**Revisión de seguimiento.** `followup_review_recommended: true` — parches: 0 high, 2 medium, 7 low; puntuación 3 × 2 + 7 = 13 (≥ 5).

**Verificación.**
- `npx astro check`: 0 errores, 0 avisos (14 sugerencias).
- `npx vitest run` de `avisar-rango`, `fecha-de-cambio`, `obras`, `curar-primero`, `casi-duplicados`: verde; quitar `deLaRegla` de `leerRango` pone en rojo los dos casos nuevos del rango (comprobado y restituido).
- `npm test` (correr.sh, `logs/s-35/unit-35.9-triage1.log`): 208 ficheros, 9030/9030, EXIT=0.
- `npx astro build` con `FECHA_JORNADA=2026-11-15` en el árbol y en un worktree desacoplado de `fa03c0773f00546dfcb9ec946a1bf4a000487d9f` (retirado): `diff -rq` de los dos `dist/` sin ninguna diferencia (Pagefind no se corrió: no es determinista).
- e2e no corrido en esta pasada (la capa ac-auditor corrió `ingreso-accesible.spec.ts --project=escritorio` en verde, 13/13, sobre `350121d711`).

**Riesgos residuales.** Los de la pasada de construcción. Una Obra con derechos vigentes y Citas de la clase de siempre sigue sin tratamiento propio porque `tools/lib/clases.ts` la hace inalcanzable: si esa puerta cambiara, la Tarjeta y el orden habría que revisarlos.

### Segunda pasada de revisión (2026-11-15)

Status: done
Blocking condition: ninguna.

**Resumen.** Las cinco capas externas de la segunda pasada se clasificaron en 6 parches, 0 diferidos y 32 rechazados, sin intent_gap ni bad_spec. El único defecto de comportamiento: dos versiones indeterminables distintas de `umbrales.ts` daban el mismo veredicto y no fechaban ni avisaban; ahora el valor indeterminable lleva lo leído de las dos constantes. El resto son pruebas de lo que el primer triaje parcheó sin prueba (el alta y la baja de `umbrales.ts`, las negativas de `casi-duplicados` y `curar-primero`), una aserción vacía, un comentario con la historia equivocada y el formato de AGENTS.md y de este spec.

**Ficheros.**
- `tools/lib/cambios.ts` — `derechosEnLosUmbrales`: el indeterminable es `¿?` más lo leído.
- `tests/unit/fecha-de-cambio.test.ts` — indeterminables distintos, alta y baja de `umbrales.ts` con git, la aserción del árbol.
- `tests/unit/casi-duplicados.test.ts`, `tests/unit/curar-primero.test.ts` — la ficha de un Autor ausente.
- `src/lib/publicado.ts` — el comentario cita la 35.9.
- `AGENTS.md` — dos líneas largas repartidas.

**Hallazgos.** 6 parches (high 0, medium 1, low 5), 0 diferidos, 32 rechazados (detalle en el Review Triage Log).

**Revisión de seguimiento.** `followup_review_recommended: true` — parches: 0 high, 1 medium, 5 low; puntuación 3 × 1 + 5 = 8 (≥ 5). La pasada era la última del bucle: lo que queda es de pruebas y de forma.

**Verificación.**
- `npx astro check`: 0 errores, 0 avisos (14 sugerencias).
- `npx vitest run tests/unit/fecha-de-cambio.test.ts -t 35.9`: verde; sin el cambio de `derechosEnLosUmbrales` y sin `versionDelLado` en `historialDeLosFicheros`, los dos casos nuevos en rojo (comprobado y restituido).
- `npx vitest run tests/unit/casi-duplicados.test.ts tests/unit/curar-primero.test.ts -t 35.9`: verde.
- `npm test` (correr.sh, `logs/s-35/unit-35.9-triage2.log`): 208 ficheros, 9033/9033, EXIT=0.
- La construcción del Corpus real no cambia: el parche solo toca la lectura del historial ante versiones indeterminables, que el árbol no tiene (`umbrales.ts` con las dos constantes en `undefined`).

**Riesgos residuales.** Los de las pasadas anteriores. El espaciado `sola` sigue pendiente de `bmad-ux`.

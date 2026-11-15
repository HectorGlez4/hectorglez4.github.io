---
title: 'Historia 35.9 — La Obra con derechos vigentes se vende sola'
type: 'feature'
created: '2026-11-15'
status: 'ready-for-dev'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-35-context.md'
warnings: ['oversized']
deferred: []
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

Status: ready-for-dev
Blocking condition: ninguna. Planificación detenida a petición («Halt after planning»), sobre la rama v9/epica-35 tras el merge de la principal (1ea86a382de6f2230fdbf2fa6002f369af440402).

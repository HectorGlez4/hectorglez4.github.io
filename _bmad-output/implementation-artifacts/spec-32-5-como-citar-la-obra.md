---
title: '«Cómo citar» la Obra'
type: 'feature'
created: '2026-11-08'
status: 'ready-for-dev'
baseline_revision: '85bd3766a6da0dd68e0017fdc985f34e8b8176ec'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-32-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-32-3-el-incipit-lo-declara-una-persona-y-la-pagina-lo-ensena-plegado.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-brainlySabiduria-2026-08-10/ARCHITECTURE-SPINE.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Quien cita una obra entera no tiene en la Página de Obra su Referencia en APA, MLA ni Chicago: «Cómo citar» (30.3) solo existe en la Página de Cita, y la página 1 de Obra no tiene isla de copiar que ponga la fecha de consulta del visitante.

**Approach:** `referenciaDeObra`/`referenciasDeObra` en `src/lib/atribucion.ts`, hermanas de `referenciaDeCita`, componen las tres Referencias solo con lo que consta de la Obra; la página 1 las pinta con `Desplegable.astro` + `ComoCitar.astro` (sin tocarlos) como último desplegable antes del listado, y una isla nueva empaquetada, `src/islands/CopiarReferencia.astro`, pone la fecha, enseña los botones, copia, anuncia y mide; entra en `GUIONES_EXTERNOS` con su tope medido. Se construye sin la 32.4: el contenedor de desplegables que la 32.4 crea ya existe aquí para «Cómo empieza» y «Cómo citar».

## Boundaries & Constraints

**Always:**
- **Composición (AD-28, FR-58, FR-42):** `referenciaDeObra(obra, autor, edicion, canonica, estilo): SegmentoDeReferencia[]` con `nombreEnReferencia(autor, estilo)` (invertido solo con clave revisada), `obra.titulo` en cursiva, `obra.año` (ya resuelto con FR-42; sin él si discrepan; nunca el de una traducción), `edicion` = `{ nombre, traductor? } | undefined` de la edición que encabeza, `MARCA`, la canónica de la página 1 y el segmento `{ fecha: estilo }`. Formas (`[ASSUMPTION]` que revisa Héctor, como las de la Cita; son las de `referenciaDeCita` sin el texto de la Cita ni el «En »):
  - APA: `N (año). *Obra* (T, Trad.). Edición. Sabiduría de Bolsillo. {fecha}U` — sin traductor, `*Obra*.`; sin año, `N. `
  - MLA: `N. *Obra*, traducido por T, año. Edición. *Sabiduría de Bolsillo*, U.{fecha}`
  - Chicago: `N. *Obra*. año. Traducido por T. Edición. Sabiduría de Bolsillo. {fecha}U.`
  - Lo que no consta se omite con `punto`/`conPunto` (sin «s. f.», sin «Sin obra documentada»). El traductor va **sin año** (`traductorDeLaEdicionQueEncabeza` solo da el nombre).
- **La edición que encabeza, una sola regla:** se extrae de `traductorDeLaEdicionQueEncabeza` (`src/lib/obras.ts`) la elección del grupo por Fuente a una función exportada `edicionQueEncabeza(citas): { nombre: string; traductor?: string } | undefined` (`nombre` = el rótulo de ese grupo por `rotuloDeGrupo`; `traductor` = su `valorComun`), y `traductorDeLaEdicionQueEncabeza` pasa a ser `edicionQueEncabeza(citas)?.traductor`: misma salida que hoy (las pruebas de la 32.2 siguen verdes sin tocarlas). Sin ninguna Cita con Fuente → `undefined` → Referencia sin edición ni traductor.
- **Nunca desde la Ficha técnica:** `referenciaDeObra` no recibe `obra.wikidata` ni nada de `corpus/wikidata/`; una prueba de Vitest fija que la Referencia de una Obra con `wikidata` es igual a la de la misma Obra sin él.
- **Punto con nombre:** `obraTieneComoCitar(obra)` en `src/lib/obras.ts` `[ASSUMPTION: el nombre]`, hoy `true` para toda Obra (la 35.9 añade las exclusiones); la página solo pregunta.
- **Página** `src/pages/obra/[autor]/[slug]/[...page].astro`: `getStaticPaths` pasa a la página 1 `edicion: edicionQueEncabeza(citas)`; solo en la página 1, el `<div data-pagefind-ignore="all" style="margin-top: calc(var(--unidad) * 3)">` que hoy envuelve «Cómo empieza» pasa a renderizarse si hay incipit **o** `obraTieneComoCitar(obra)`, y contiene como **hermanos directos** `<ComoEmpieza …/>` (si hay incipit) y luego `<Desplegable rotulo="Cómo citar"><ComoCitar referencias={referenciasDeObra(obra, autor, edicion, canonica)} /></Desplegable>` (si `obraTieneComoCitar`), seguido de `<CopiarReferencia />`. Sin «Cómo citar» ni incipit, ni div ni hueco. Las 2+ no cambian. Comentario de cabecera al día. No se añaden reglas al `<style>` de la página.
- **Isla** `src/islands/CopiarReferencia.astro` `[ASSUMPTION: el nombre]`: sin marcado propio y con un `<script>` **procesado** (sale a `/_astro/`, nunca en línea) que importa `fechaDeConsulta` y `MARCADOR_DE_FECHA_DE_CONSULTA` de `src/lib/atribucion.ts`, `anunciar` de `src/lib/anuncio.ts` y el nombre del evento del vocabulario; sobre cada `[data-como-citar]` de la página: escribe la fecha en cada marcador (y otra vez en cada pulsación), quita `[data-sin-fecha]`, enseña los `[data-copiar-texto]`; al pulsar copia el `textContent` del `[data-copiable]` hermano, «Copiado.» 2 s en la etiqueta, `anunciar(region, 'Copiado.')` sobre la región del bloque (la de `ComoCitar.astro`, dentro del `<details>`), y tras la copia buena `__medir(EVENTOS.copiadoDeReferencia)` a secas (`declare function __medir`); si el portapapeles rechaza, nada (ni «Copiado.» ni evento). Ningún dato de contenido en el guion; sin `requestAnimationFrame` fuera de `anunciar`.
- **Lista cerrada (AD-6):** entrada `copiar-referencia` en `GUIONES_EXTERNOS` (`IdDeGuion`, `cuando`, `reconoce: /^\/_astro\/CopiarReferencia\.astro_astro_type_script_index_0_lang\.[A-Za-z0-9_-]+\.js$/`, `trozos: TROZO_COMPARTIDO` si el empaquetado saca uno), `MAX_BYTES_GUION_DE_COPIAR_REFERENCIA` en `src/lib/umbrales.ts` = cifra medida (fichero + trozos) + unos 400, con la medida y la fecha escritas en el comentario y en Design Notes; la lista de `id` de `tests/unit/medicion.test.ts` («cada entrada tiene un tope…») y su reconocimiento al día. Si el fichero arrastra módulos enteros, se marcan con `/* @__PURE__ */` las constantes calculadas en lo alto (pitfall de AGENTS.md) antes de fijar el tope.
- **Relación (AD-27):** `CAMPOS_QUE_PINTA.autor.obra` gana `NOMBRE_EN_REFERENCIA` (`tools/lib/cambios.ts`): revisar la clave de un Autor fecha y avisa sus Páginas de Obra; `proponer-claves` (claves sin revisar) sigue moviendo solo los Directorios. `tests/unit/fecha-de-cambio.test.ts` lo fija.
- Idéntico con la afiliación encendida o apagada; sin enlaces internos ni zona; fuera del JSON-LD (`DatosDeObra.astro` no cambia).
- `AGENTS.md`: la Página de Obra tiene isla de copiar (empaquetada, en la lista cerrada) y su «Cómo citar» va en la página 1, último desplegable antes del listado.

**Block If:**
- Hiciera falta cambiar `ComoCitar.astro`, `Desplegable.astro`, `src/islands/CopiarCita.astro` o `src/lib/vocabulario.ts`, una zona nueva o editar `_bmad-output/planning-artifacts/` o `_bmad-output/specs/`.
- Con el Corpus real, la prueba de `tests/e2e/accesibilidad.spec.ts` que mide toda página 1 de Obra a 360 × 640 (l. ~2184) dejara alguna primera Cita fuera de los 640 px.

**Never:**
- Tomar año, edición o traductor de la Ficha técnica, de otra Cita fuera de la regla de la edición que encabeza, o del conocimiento general; escribir la fecha del build.
- Reordenar «Dónde leer», retirar el salto de la 24.7 o tocar distancias de la 32.4; declarar `wikidata`, `incipit` o cualquier dato del Corpus real.
- Escribir otro `<details>`, otra composición de fecha, o poner la Referencia en el guion.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Completa | Autor con clave revisada, año, Fuente que encabeza con traductor común | Tres Referencias con nombre invertido, *título*, año, «T, Trad.»/«traducido por T»/«Traducido por T», edición, marca, U y fecha | — |
| Sin clave revisada | `ordenRevisado` ausente | Nombre tal cual en los tres estilos | — |
| Sin año | Citas discrepan (`obra.año` undefined) | Sin año en los tres | — |
| Sin Fuente | Ninguna Cita cotejada | Sin edición ni traductor | — |
| Traductores distintos | La Fuente que encabeza con dos traductores | Edición sin traductor | — |
| Con Wikidata | `obra.wikidata` presente | Idéntica a sin él | — |
| Sin JS | — | Referencia sin fecha, «Sin fecha de consulta: añade la de hoy.», botones `hidden` | — |
| Portapapeles denegado | `writeText` rechaza | Ni «Copiado.» ni evento; Referencia a la vista | silencio |
| Página 2+ | `currentPage > 1` | Sin «Cómo citar» ni isla | — |

</intent-contract>

## Code Map

- `src/lib/atribucion.ts` -- `referenciaDeCita` (l. 664) es el patrón; `referenciasDeCita` (l. 730), `nombreEnReferencia` (l. 616), `punto`/`conPunto` (privadas, ~l. 640), `MARCA`, `añoLegible`, `SegmentoDeReferencia`/`ReferenciaCompuesta` (l. 568–575), `fechaDeConsulta` (l. 750, corta a propósito), `referenciaEnTexto` (l. 760). Añadir `referenciaDeObra` y `referenciasDeObra` tras `referenciasDeCita`; tipo del parámetro Obra con `Pick` (`titulo`, `año`) para que `wikidata` no entre.
- `src/lib/obras.ts` -- `traductorDeLaEdicionQueEncabeza` (l. 1448) a refactorizar sobre `edicionQueEncabeza`; `rotuloDeGrupo` (l. ~1430), `valorComun` (l. ~1336); `obraTieneComoCitar` nueva junto a ellas.
- `src/pages/obra/[autor]/[slug]/[...page].astro` -- `getStaticPaths` (l. 83–103: `resumen`, `traductor`, `incipit` solo a la página 1); div del incipit (l. ~190); `canonica` (l. 114).
- `src/pages/cita/[slug].astro` l. 165–166 -- patrón de uso `Desplegable` + `ComoCitar`.
- `src/components/ComoCitar.astro`, `src/components/Desplegable.astro` -- solo lectura. Atributos que la isla lee: `data-como-citar`, `data-copiables`, `data-copiable`, `data-copiar-texto`, `data-etiqueta`, `data-sin-fecha`, `[role=status][data-anuncio]`, `data-fecha-de-consulta`.
- `src/islands/CopiarCita.astro` -- solo lectura: el recorrido `citar` del guion en línea es la conducta a igualar (temporizador por bloque, `k.d`); no se toca (el tope en línea de la Página de Cita va justo).
- `src/components/Busqueda.astro` l. 507 y 1064 -- patrón de `<script>` procesado con `declare function __medir` y `__medir(…)` a secas; `src/components/FiltroDelDirectorio.astro` -- otro guion empaquetado.
- `src/lib/guiones.ts` -- `IdDeGuion`, `GUIONES_EXTERNOS`, `TROZO_COMPARTIDO`; `src/lib/umbrales.ts` l. ~700–739 -- patrón de comentario del tope de la búsqueda.
- `tools/lib/cambios.ts` -- `NOMBRE_EN_REFERENCIA` (l. ~172–205), `CAMPOS_QUE_PINTA.autor.obra` (l. ~317).
- Pruebas de patrón: `tests/unit/atribucion.test.ts` l. 169–263 (tabla literal, `conMarcas`, `HOY`, `MARTI`, `MARTI_SIN_REVISAR`); `tests/unit/como-citar.test.ts` (marcado construido, Pagefind, JSON-LD, jornada del build); `tests/unit/ficha-tecnica-build.test.ts` (fixture de Obra, afiliación encendida, byte a byte); `tests/unit/medicion.test.ts` l. 1796–1817 y `CORPUS_MEDIDO` l. 1982 (ya trae «Cartas a Lucilio» y «Sobre la brevedad de la vida», con página 1 de Obra que pedirá la isla); `tests/unit/ingreso-construido.test.ts` l. 871–915; `tests/unit/fecha-de-cambio.test.ts`; `tests/unit/obras.test.ts` (traductor de la 32.2); `tests/e2e/como-citar.spec.ts` (`hoyEn`, `espiarMedicion`, `denegarPortapapeles`, `emitidosDeCopiar`); `tests/e2e/accesibilidad.spec.ts` l. ~2184 (primera pantalla de toda página 1 de Obra); `tests/e2e/incipit.spec.ts` (servidor propio con incipit).

## Tasks & Acceptance

**Execution:**
- `src/lib/obras.ts` -- `edicionQueEncabeza`, `traductorDeLaEdicionQueEncabeza` delegando, `obraTieneComoCitar` -- una regla para edición y traductor.
- `src/lib/atribucion.ts` -- `referenciaDeObra`, `referenciasDeObra` -- dueño único de la Referencia.
- `tests/unit/atribucion.test.ts` -- tabla literal de los tres estilos para cada fila de la matriz (completa, sin clave, sin año, sin Fuente, traductores distintos, con Wikidata igual a sin él, sin fecha = `referenciaEnTexto` sin `Date`) -- fija las formas.
- `tests/unit/obras.test.ts` -- `edicionQueEncabeza` (más Citas, desempate por rótulo e id, traductor común o ninguno, sin Fuente) y `obraTieneComoCitar` true.
- `src/islands/CopiarReferencia.astro` -- isla empaquetada -- fecha del visitante y copiado en la Página de Obra.
- `src/pages/obra/[autor]/[slug]/[...page].astro` -- el desplegable en la página 1 -- UX-DR124.
- `src/lib/guiones.ts`, `src/lib/umbrales.ts`, `tests/unit/medicion.test.ts` -- entrada, tope medido, lista de `id` y reconocimiento -- AD-6.
- `tests/unit/ingreso-construido.test.ts` -- la página 1 de Obra con afiliación encendida pide la entrada `copiar-referencia` (aserción explícita, como la de `busqueda`) -- AD-20.
- `tools/lib/cambios.ts`, `tests/unit/fecha-de-cambio.test.ts` -- la Página de Obra compone el nombre en Referencia -- AD-27.
- `tests/unit/como-citar-obra-build.test.ts` (nuevo) -- sitio construido: orden, 2+, Pagefind, JSON-LD, jornada del build, afiliación byte a byte -- ver AC.
- `tests/e2e/como-citar-obra.spec.ts` (nuevo) -- con y sin JS en el navegador -- ver AC.
- `AGENTS.md` -- la isla y el lugar de «Cómo citar» en la Página de Obra.

**Acceptance Criteria:**
- Given la página 1 de una Obra construida, when se lee su `dist/`, then lleva un solo `<details class="desplegable">` cuyo `<summary>` es «Cómo citar», con `[data-como-citar]` y tres estilos (APA, MLA, Chicago) cada uno con Referencia, marcador vacío y botón `hidden`, último del contenedor bajo `data-pagefind-ignore="all"`, tras «Cómo empieza» si hay incipit, y antes de `ul.listado`; sin enlaces ni `data-zona`; el JSON-LD no lo nombra; ninguna Referencia lleva la jornada del build; Pagefind no casa una palabra que solo esté en el bloque; las páginas 2+ no tienen ni el bloque ni el guion de la isla.
- Given la misma Obra con la afiliación encendida y apagada, when se construyen las dos, then el contenedor de los desplegables es idéntico byte a byte.
- Given el sitio de `CORPUS_MEDIDO`, when corre `tests/unit/medicion.test.ts`, then la página 1 de Obra pide `copiar-referencia`, sus ficheros caben en su tope y ninguna página pide un guion fuera de la lista.
- Given la página 1 de Obra en el navegador con JS, when se abre «Cómo citar» y se pulsa cada botón, then la Referencia lleva la fecha de hoy del navegador, el portapapeles tiene exactamente el `textContent` de esa Referencia, «Copiado.» llega a la región dentro del `<details>` y el espía ve un `copiado-de-referencia` por pulsación; con el portapapeles denegado, ni «Copiado.» ni evento.
- Given la página sin JS, when se abre «Cómo citar», then cada Referencia va sin fecha con «Sin fecha de consulta: añade la de hoy.» y sin botones visibles.
- Given la página 1 en el barrido de accesibilidad, when corre axe y se tabula desde «de {Autor}», then sin infracción nueva, el `<summary>` de «Cómo citar» se alcanza tras los anteriores y antes del listado, y toda página 1 de Obra del Corpus real sigue con su primera Cita por encima de 640 px a 360 × 640 (medida anotada en Design Notes).

## Spec Change Log

## Review Triage Log

## Design Notes

- **Sin la 32.4.** «Cómo citar» va tras «Cómo empieza» —o, sin incipit, solo— en el contenedor que la 32.3 ya pinta; la 32.4 antepondrá «Dónde leer» dentro del mismo `div` (su spec ya lo prevé: «la 32.5 meterá «Cómo citar» detrás, en el mismo contenedor»). El conflicto de fusión es de pocas líneas en la página y se resuelve conservando los tres hermanos. Hasta la 32.4, «Dónde leer» sigue al pie con su salto: es el orden de UX-DR124 «con lo que ya existe».
- **Primera pantalla.** «Cómo citar» cerrado suma ≈ 24 + 1 + 44 px bajo la Cabecera. Con el Corpus real (sin Ficha técnica ni incipit) la peor página 1 (Larra, 514 px) queda ≈ 585 px: la prueba de toda página 1 sigue siendo puerta. El escenario de la 32.4 (Ficha técnica + incipit + los tres cerrados) pasará de 646,5 a ≈ 691 px: no es puerta aquí, se anota la medida y lo decide Héctor junto con el bloqueo de la 32.4.
- **Isla empaquetada y no en línea.** El AC pide la isla en `GUIONES_EXTERNOS` con tope: eso solo lo admite un guion que se descarga, y lo que necesita `src/lib` se empaqueta (tabla de guiones de la espina). `fechaDeConsulta` llega por importación del mismo dueño —no se copia— en lugar de por su texto, que es la forma de las islas en línea. La conducta repite la del recorrido de `CopiarCita.astro`, que no se toca porque la Página de Cita no tiene bytes en línea de sobra.
- **La edición que encabeza** es la del grupo por Fuente de `traductorDeLaEdicionQueEncabeza` (la «Fuente que más Citas aporta»), no la primera línea de `dondeLeer`, que separa traducciones: así edición y traductor salen siempre de la misma Fuente.

## Verification

**Commands:**
- `npx vitest run tests/unit/atribucion.test.ts`, `tests/unit/obras.test.ts`, `tests/unit/fecha-de-cambio.test.ts`, `tests/unit/como-citar-obra-build.test.ts`, `tests/unit/como-citar.test.ts`, `tests/unit/medicion.test.ts`, `tests/unit/ingreso-construido.test.ts`, `tests/unit/vocabulario.test.ts`, `tests/unit/huella.test.ts`, `tests/unit/desplegable.test.ts`, `tests/unit/tipografia-en-tokens.test.ts` -- verde (cada uno por fichero).
- `npx astro check` -- sin errores.
- `npx playwright test tests/e2e/como-citar-obra.spec.ts tests/e2e/incipit.spec.ts tests/e2e/como-citar.spec.ts --project=escritorio` y `tests/e2e/accesibilidad.spec.ts -g "Obra"` en `escritorio` y `movil` -- verde; la medida de 360 × 640 anotada aquí.
- `npm test` completo (detached con `correr.sh`) -- verde.

## Auto Run Result

Status: ready-for-dev
Blocking condition: ninguna. Se construye sin la 32.4: «Cómo citar» entra en el contenedor de desplegables que ya pinta la 32.3, tras «Cómo empieza».
Baseline: 85bd3766a6da0dd68e0017fdc985f34e8b8176ec.

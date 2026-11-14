---
title: 'La página 1 de la Obra, reordenada: «Dónde leer esta obra» plegado y por formato, antes del listado'
type: 'feature'
created: '2026-11-08'
status: 'done'
baseline_revision: '0eb8fdaf5f6de5ee073bd9b5a8a6a606cde292cc'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-32-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-32-3-el-incipit-lo-declara-una-persona-y-la-pagina-lo-ensena-plegado.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-brainlySabiduria-2026-08-10/ARCHITECTURE-SPINE.md'
warnings: ['oversized']
deferred:
  - summary: >-
      pendiente de Héctor (bmad-ux): asentar en DESIGN.md/EXPERIENCE.md "Cómo citar" al pie de la página 1 de la Obra y la distancia de 2 × unidad.
    evidence: |-
      Decisión delegada por Héctor (chat, 2026-11-14): el contenedor único de desplegables bajo la Cabecera va a 2 × `--unidad` (no 3 ×), y —decisión 1b, del mismo día, ante los 683,5 px con tres desplegables— «Cómo citar» (32.5) sale de ese contenedor y va al pie de la página 1: tras el listado, su paginación, «Buscar en esta obra» y los Temas, antes de la Nota, cerrado, con el mismo componente, zona y comportamiento, en su propio contenedor a 5 × `--unidad`. UX-DR124 y UX-DR129 siguen diciendo otro orden; los artefactos de planificación no se tocan.
    location: >-
      src/pages/obra/[autor]/[slug]/[...page].astro
    severity: medium
  - summary: >-
      pendiente de Héctor (bmad-ux): con k = 1 y n > 1 la plantilla de UX-DR127 da «De esta edición se tomaron 1 de sus {n} citas.», sin concordancia.
    evidence: |-
      UX-DR127 fija literalmente «De esta edición se tomaron {k} de sus {n} citas.» y solo exceptúa k = n y n = 1; `textoDeLoTomado` la sigue al pie de la letra y `tests/unit/atribucion.test.ts` y `tests/unit/obra-pagina.test.ts` la fijan. Con dos Fuentes, una que aporta una sola Cita lo pinta en el sitio (revisión de la 32.4, blind-hunter y edge-case-hunter). La forma concordada —«se tomó 1 de sus {n} citas» o «se tomó una de sus {n} citas»— es redacción de la UX, no de la implementación.
    location: >-
      src/lib/atribucion.ts (textoDeLoTomado)
    severity: medium
  - summary: >-
      La puerta de primera pantalla de 360 × 640 pasa con 1,5 px de margen (638,5 px) y es solo e2e, que el CI no corre.
    evidence: |-
      `tests/e2e/incipit.spec.ts` sobre la Obra sintética de Larra con Ficha técnica completa e incipit mide 638,5 px; cualquier píxel más bajo la Cabecera (la 25.6 «Compartir en» va bajo el listado, pero una métrica de fuente o la 33.2 dentro del desplegable cerrado no) la rompe, y solo se ve corriendo `npm run test:e2e` en local, como exige la épica antes del merge.
    location: >-
      tests/e2e/incipit.spec.ts
    severity: low
---

<intent-contract>

## Intent

**Problem:** En la página 1 de una Obra, «Dónde leer esta obra» sigue al pie —tras una página entera de Tarjetas— y la Cabecera lleva el salto «Dónde leer esta obra ↓» de la 24.7; la v9 (FR-54, UX-DR124, UX-DR125, UX-DR127) lo sube plegado antes del listado, agrupado en «Gratis», con la cuenta positiva de lo tomado de cada edición, y SM-C4 debe poder juzgar si eso aleja las Citas.

**Approach:** `DondeLeer.astro` pasa a ser un `Desplegable.astro` cerrado, primero de los desplegables entre la Cabecera y el listado (junto a «Cómo empieza» de la 32.3, en un solo contenedor); se retira el salto y su ancla; «Gratis» pinta las líneas de `dondeLeer` seguidas de `textoDeLoTomado`; `umbrales.ts` gana `DESPLIEGUE_DE_LA_OBRA_COMO_DESTINO` en `undefined` y `lineaBase.ts` el juicio de SM-C4.

## Boundaries & Constraints

**Always:**
- Orden de la página 1 (UX-DR124): Cabecera (`h1`, «de {Autor} · {año}», Ficha técnica si la hay) → un único `<div data-pagefind-ignore="all" style="margin-top: calc(var(--unidad) * 3)">` con los desplegables como **hermanos directos** —«Dónde leer esta obra», luego «Cómo empieza» si hay incipit— (hermanos para que la regla `.desplegable + .desplegable` de la primitiva no doble el filete; la 32.5 meterá «Cómo citar» detrás, en el mismo contenedor) → `ul.listado` (su `margin-top` 4× y su filete, sin tocar) → Paginación → «Buscar en esta obra» → [sitio de «Compartir en», 25.6, sin hueco] → Temas → Nota. Tabulación en ese orden.
- Páginas 2+: idénticas a hoy salvo la retirada del salto (que ya no llevaban): sin Ficha técnica, desplegables, «Buscar en esta obra» ni Temas.
- `DondeLeer.astro` renderiza `Desplegable` en su raíz (sin `section` ni `h2` envolventes), con `ROTULO_DE_DONDE_LEER` como `rotulo`. Nunca escribe su `<details>`.
- Grupo «Gratis» (solo con alguna línea): `div.grupo` con el **elemento de rótulo de grupo** —nuevo `src/components/RotuloDeGrupo.astro`, un `<p>` (no encabezado: el `<summary>` no es encabezado y un `h3` sin `h2` rompería el esquema; precedente: `p.rotulo` de `ComoCitar.astro`), `--pie`, `--peso-fuerte`, `--interlineado-pie`, `--tinta`, `margin: 0`— que reutilizará la 33.2 para «Electrónica» e «Impresa». Tras el rótulo, cada línea de `dondeLeer` (nombre de la Fuente como enlace `rel="noopener nofollow"` si hay `enlace`, y `resto()` de hoy: «repartida en {n} páginas», traducción, licencia) y, tras cada una, su frase `textoDeLoTomado(linea.citas, total)`; líneas y frases en `--pie`, `--interlineado-pie`, `--tinta-apagada`, a `--unidad` de lo anterior. El primer grupo, a 2× del `<summary>` (lo da el `padding` de `.contenido` de la primitiva: el grupo no añade margen arriba); 3× entre grupos (`.grupo + .grupo`, para la 33.2).
- `textoDeLoTomado(k, n)` en `src/lib/atribucion.ts`, pura: n = 1 → «De esta edición se tomó su cita.»; k = n → «De esta edición se tomaron sus {n} citas.»; si no → «De esta edición se tomaron {k} de sus {n} citas.». Lanza si k o n no son enteros, k < 1 o k > n.
- Sin ninguna Cita con Fuente: dentro del desplegable, solo «Ninguna de sus citas tiene todavía documento cotejado.» (sin grupo, sin enlace, sin ediciones en venta aunque la ficha las declare).
- Ediciones en venta (afiliación encendida y admitida): `EdicionesEnVenta.astro` **sin cambios**, dentro del desplegable tras «Gratis» y solo si hay alguna línea; apagada y encendida, todo fuera del `data-ingreso` sale byte a byte igual.
- Fuera de Pagefind con `="all"`, sin zona ni `data-sin-zona` (enlaces de salida), se abre sin guion; a 320 px sin desplazamiento horizontal.
- `DESPLIEGUE_DE_LA_OBRA_COMO_DESTINO: string | undefined = undefined` en `src/lib/umbrales.ts`, tras `DESPLIEGUE_DEL_INCIPIT`, con la forma y la doc de `DESPLIEGUE_DE_LA_BUSQUEDA_CON_FILTROS` (jornada del primer día en que la página 1 de Obra cambia en vivo; le da valor Héctor en commit aparte). **No** entra en `CORTES_DE_SERIE_DECLARADOS` (como la de la búsqueda: es la `llegada` de un juicio).
- SM-C4 en `juiciosPorVentanas`: `nombre: 'SM-C4'`, unidad de la Página de Obra (nuevo `unidadDeLaPaginaDeObra(superficies)`: la superficie con `vistaConMarca === EVENTOS.vistaDeObra`, por `unidadDeclarada`), `llegada: DESPLIEGUE_DE_LA_OBRA_COMO_DESTINO`, `deDondeLlega: 'DESPLIEGUE_DE_LA_OBRA_COMO_DESTINO'`, una tasa nueva `TasaDeJuicio` `'continuacion-desde-listado'` = salidas internas de la zona `listado` (de `ZONAS`) entre lecturas de la unidad —reutiliza la rama `{ zona }` de `tasaEn`—, `corte: { serie: 'continuacion-de-obra', deDondeLlega: 'DESPLIEGUE_DEL_INCIPIT' }`. Nombre en el informe: «continuación desde listado». Las salidas a tiendas no son salidas internas: no se miden.
- Ninguna prueba fija el valor de las constantes; ninguna zona nueva; `src/lib/vocabulario.ts` no cambia.

**Block If:**
- La medida e2e de 360 × 640 sobre la Obra de Larra con Ficha técnica completa, incipit y los desplegables cerrados deja la primera Tarjeta del listado en `y ≥ 640` (estimación previa: ≈ 646 px, ver Design Notes): HALT `blocked` con la medida; mover distancias o el orden es de Héctor (`bmad-ux`).
- Cualquier cambio que exija tocar `_bmad-output/planning-artifacts/` o `_bmad-output/specs/`.

**Never:**
- Pintar «Electrónica»/«Impresa» o repartir ventas por tienda (33.2); tienda sin marca, puerta de encendido o congelación de ediciones (Épica 33); exclusiones de derechos vigentes en `dondeLeer` (35.9); «Cómo citar» (32.5); «Compartir en» (25.6).
- «Consíguelo» o «Cómprala» en ninguna superficie.
- Reservar hueco para «Compartir en»; añadir reglas al `<style>` de la página para los desplegables (van en atributo `style`); tocar `Desplegable.astro` o `EdicionesEnVenta.astro`.
- Quitar `destino` de `Rotulo.astro`: lo sigue usando `GrupoDeLetra.astro`.
- Dar valor a `DESPLIEGUE_DE_LA_OBRA_COMO_DESTINO`, `DESPLIEGUE_DEL_INCIPIT` o `MAX_CARACTERES_DEL_INCIPIT`; declarar incipit o Wikidata en el Corpus real.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Una Fuente, todas cotejadas | 27 Citas, las 27 de una Fuente | «Gratis», una línea, «De esta edición se tomaron sus 27 citas.» | — |
| Dos Fuentes y Citas sin documento | 12 + 5 cotejadas, 10 sin documento, n = 27 | dos líneas (12 primero), «…se tomaron 12 de sus 27 citas.», «…5 de sus 27…»; ninguna frase «no tienen documento» | — |
| Una sola Cita | n = 1, cotejada | «De esta edición se tomó su cita.» | — |
| Sin cotejo | ninguna Cita con Fuente | solo «Ninguna de sus citas tiene todavía documento cotejado.»; sin grupo ni ventas | — |
| Afiliación encendida | ficha con ediciones, alguna línea | bloque de la 22.9 tras «Gratis», dentro del `<details>` | sin línea: no se pinta |
| Con incipit | ficha con incipit ofrecido | dos `<details>` hermanos: «Dónde leer» y «Cómo empieza», un solo filete entre ellos | — |
| `textoDeLoTomado` inválido | k = 0, k > n, no enteros | — | lanza nombrando k y n |

</intent-contract>

## Code Map

- `src/pages/obra/[autor]/[slug]/[...page].astro` -- página. Quitar `ANCLA_DE_DONDE_LEER` del import (l. 43), el bloque del salto (l. 177–188), las reglas `.salto` y `.salto a` del `<style>` (l. 303–324) y el comentario de `conDondeLeer` (l. 114–120; queda `primera && resumenDondeLeer !== undefined`). Sustituir el `div` de «Cómo empieza» (l. 191–204) por el contenedor único con `<DondeLeer>` y luego `<ComoEmpieza>`; quitar el `<DondeLeer>` del pie (l. 240–241). Cabecera del fichero (l. 11–18) al día. `.listado` (l. 347) y `.nota-de-la-ficha` (l. 363) no cambian.
- `src/components/DondeLeer.astro` -- reescribir: `Desplegable` en la raíz, «Gratis» con `RotuloDeGrupo`, frase de lo tomado, sin `sinDocumento` (l. 61–64, 86), sin `Rotulo`/`ANCLA`; el `<style>` puede quedarse (el componente se pinta en toda página 1) con clases propias (`.grupo`, `.linea`, `.linea a` en siena subrayado), sin `h3`.
- `src/components/RotuloDeGrupo.astro` (nuevo) -- `<p class="rotulo-de-grupo"><slot /></p>`; sin props salvo el slot.
- `src/components/Desplegable.astro` -- leer, no tocar: API `rotulo` + slot; `.contenido` da 2× arriba y 3× abajo; `.desplegable + .desplegable` quita el filete doble; rompe con slot vacío.
- `src/components/ComoEmpieza.astro` -- no cambia; ahora hermano de «Dónde leer» dentro del contenedor.
- `src/components/EdicionesEnVenta.astro` -- no cambia (su `h3` «Ediciones en venta» y `DEL_BLOQUE` 2× siguen; los reparte la 33.2).
- `src/components/Rotulo.astro` -- comentario de cabecera (l. 3, l. 12–16): ya no nombra «Dónde leer esta obra»; `destino` se queda por `GrupoDeLetra.astro`.
- `src/lib/obras.ts` -- quitar `ANCLA_DE_DONDE_LEER` (l. 1406–1413); doc de `ROTULO_DE_DONDE_LEER` (l. 1415–1422: ahora el `<summary>`), de `LineaDondeLeer` (l. 1307, «Gratis») y de `dondeLeer` (l. 1471–1482: punto con nombre que ampliará la 35.9). `citasSinDocumento` sigue en el resumen.
- `src/lib/atribucion.ts` -- `textoDeLoTomado` junto a las demás frases de la Obra (p. ej. cerca de `contenidoDeTarjetaDeObra`, l. ~403).
- `src/lib/umbrales.ts` -- `DESPLIEGUE_DE_LA_OBRA_COMO_DESTINO` tras `DESPLIEGUE_DEL_INCIPIT` (l. ~222); cambiar en su doc «que juzga la 32.4» por el juicio ya existente.
- `tools/lib/lineaBase.ts` -- `TasaDeJuicio` (l. 376), `unidadDeLaPaginaDeCita` (l. 360, patrón), `juiciosPorVentanas` (l. 418), `tasaEn`/`nombreDeTasa` (l. ~1398–1419: la rama `{ zona }`), comentario de `'continuacion-de-obra'` (l. 965–966: ahora la lee SM-C4). Import de `DESPLIEGUE_DE_LA_OBRA_COMO_DESTINO` y `ZONAS`.
- `tests/unit/obra-pagina.test.ts` -- l. 17 (import de `ANCLA`), l. 232–290 (ayudas del salto), `describe` 22.6 (l. 705–784: orden «después del Listado» pasa a «antes del listado»), `describe` 24.7 (l. 785–861: reescribir como «ningún ancla a Dónde leer, el `<summary>`»), l. 973–1170 (casos (c)/(d): la frase de lo tomado sustituye a «no tienen documento»; l. 1132 y l. 1144 del salto y la hoja del pie), l. 1303 (congelada). Añadir la prueba del sitio de «Compartir en»: el siguiente hermano de `form.buscar-en` en la página 1 es `section.temas` (o nada si no hay Temas).
- `tests/unit/ediciones-en-venta.test.ts` -- `seccionDondeLeer` (l. 596–610) pasa a recortar el `<details>` de «Dónde leer»; l. 683 («Edición cotejada, gratuita» → «Gratis»); `describe` 24.7 del salto (l. 797–846) se reescribe: el `<summary>`, «Gratis» y todo lo de fuera del `data-ingreso` idénticos encendida/apagada.
- `tests/unit/ficha-tecnica-build.test.ts` l. 126–133 -- «antes del salto» → la línea va antes del contenedor de los desplegables.
- `tests/unit/buscar-en.test.ts` l. 235 -- `class="donde-leer"` ya no va tras el formulario: queda solo `class="temas"`.
- `tests/unit/tarjeta-de-obra.test.ts` l. 1082–1085 -- debería seguir pasando (texto del `<summary>` y la frase (c)); comprobar.
- `tests/unit/incipit-build.test.ts` -- revisar las aserciones del contenedor de «Cómo empieza» (margen 3× propio): ahora es el del contenedor común.
- `tests/unit/obras.test.ts` / `tests/unit/atribucion.test.ts` -- pruebas de `textoDeLoTomado` (tres casos, dos Fuentes, errores).
- `tests/unit/linea-base.test.ts` -- l. 486–565 (`umbralesCon`, lista de cortes: no cambia), l. 1278–1445 (patrón SM-C5 con corte): añadir SM-C4 con respuestas fijas (salidas `listado` de rutas de Obra / lecturas de Obra; corte del incipit pendiente y llegado; ventana que no cruza la llegada).
- `tests/e2e/accesibilidad.spec.ts` -- `describe` 24.7 del salto (l. 1930–2150) se reescribe: ninguna página de Obra tiene `[href="#donde-leer-esta-obra"]` ni `#donde-leer-esta-obra`; Tab desde «de {Autor}» → enlace de la Ficha técnica (si la hay) → `<summary>` → listado; Intro sobre el `<summary>` lo abre sin mover el foco. `obrasDelPie` (l. 1855–1920: `id="edicion-cotejada"` ya no existe; buscar la línea de «Gratis»). l. 2211–2252: «listado a 32 px del salto» → del último desplegable; el pie sin «Dónde leer»: Temas → Nota. La de «toda página 1 a 360 × 640» (l. 2151) se queda.
- `tests/e2e/incipit.spec.ts` l. 213 -- la medida pasa a ser puerta (`< 640`), con la línea, «Dónde leer» y «Cómo empieza» cerrados; `tests/e2e/ficha-tecnica.spec.ts` l. 156 sigue siendo puerta.
- `tests/e2e/tipografia-calculada.spec.ts-snapshots/tipografia-obra-{movil,escritorio}.json` -- regenerar (selectores `p.salto`, `section.donde-leer` desaparecen).
- `AGENTS.md` -- secciones de la Página de Obra («La Página de Obra (Historia 22.4)», «La Tarjeta de Obra», «Encender la afiliación de libros»): sin el salto ni el bloque al pie; el orden nuevo de la página 1 y la frase de lo tomado.

## Tasks & Acceptance

**Execution:**
- `src/lib/atribucion.ts` -- añadir `textoDeLoTomado(k, n)` -- dueño único de la frase (AD-28).
- `src/components/RotuloDeGrupo.astro` -- crear -- el elemento que reutilizará la 33.2.
- `src/components/DondeLeer.astro` -- reescribir como desplegable con «Gratis» y la frase de lo tomado -- UX-DR125, UX-DR127, FR-54.
- `src/lib/obras.ts` -- retirar `ANCLA_DE_DONDE_LEER`, poner al día las docs -- nadie más lo usa.
- `src/pages/obra/[autor]/[slug]/[...page].astro` -- retirar el salto y sus reglas, contenedor único de desplegables antes del listado, quitar el bloque del pie -- UX-DR124.
- `src/components/Rotulo.astro` -- poner al día su comentario.
- `src/lib/umbrales.ts` -- añadir `DESPLIEGUE_DE_LA_OBRA_COMO_DESTINO` -- llegada de SM-C4.
- `tools/lib/lineaBase.ts` -- `unidadDeLaPaginaDeObra`, tasa `continuacion-desde-listado`, juicio SM-C4 -- PRD §7.
- `tests/unit/atribucion.test.ts` -- `textoDeLoTomado`: tres casos, dos Fuentes, errores.
- `tests/unit/obra-pagina.test.ts`, `tests/unit/ediciones-en-venta.test.ts`, `tests/unit/ficha-tecnica-build.test.ts`, `tests/unit/buscar-en.test.ts`, `tests/unit/incipit-build.test.ts`, `tests/unit/tarjeta-de-obra.test.ts` -- reescribir lo del salto y el pie; orden, distancias por `style`/hoja, sitio de «Compartir en», byte a byte con afiliación.
- `tests/unit/linea-base.test.ts` -- SM-C4 con respuestas fijas, sin fijar el valor de la constante.
- `tests/e2e/accesibilidad.spec.ts`, `tests/e2e/incipit.spec.ts` -- reescribir el salto; tabulación; medida de primera pantalla como puerta; snapshots de tipografía de Obra regenerados.
- `AGENTS.md` -- describir el orden nuevo y la frase de lo tomado.

**Acceptance Criteria:**
- Given la página 1 de cualquier Obra construida, when se lee su `<main>`, then aparecen en este orden la Cabecera, la Ficha técnica (si la hay), el contenedor `data-pagefind-ignore="all"` con el `<details>` «Dónde leer esta obra» (cerrado, sin `open`) y, si hay incipit, «Cómo empieza», el `ul.listado`, la Paginación, «Buscar en esta obra», los Temas y la Nota; y ningún enlace ni `id` de la página es `donde-leer-esta-obra`.
- Given una página 2+ de Obra, when se construye, then no lleva desplegables, Ficha técnica, «Buscar en esta obra», Temas ni salto.
- Given la página 1 en un navegador a 360 × 640, when se tabula desde «de {Autor}», then el foco pasa por el enlace de la Ficha técnica (si la hay), los `<summary>` en orden, y luego el listado; Intro sobre el `<summary>` de «Dónde leer» lo abre sin mover el foco; axe sin infracciones cerrado y abierto; a 320 px, sin desplazamiento horizontal.
- Given la Obra de Larra con Ficha técnica, incipit y desplegables cerrados (e2e), when se mide a 360 × 640, then la primera Tarjeta del listado empieza por encima de 640 px, y la medida queda en Design Notes.
- Given la pareja de construcciones de `ediciones-en-venta.test.ts`, when se compara la página 1 encendida y apagada, then solo difiere el `div[data-ingreso="afiliacion-de-libros"]`, que va dentro del `<details>` tras «Gratis».
- Given `npm run medicion` con respuestas fijas de salidas de la zona `listado` y lecturas de Páginas de Obra, when se compone el informe, then SM-C4 da sus ventanas de la tasa «continuación desde listado» contadas desde `DESPLIEGUE_DE_LA_OBRA_COMO_DESTINO`, sin ventana que cruce esa jornada ni la de `DESPLIEGUE_DEL_INCIPIT` (con el corte llegado, su línea base es propia), y con la constante en `undefined` el juicio se informa como los demás sin llegada, nombrando la constante.
- Given el Corpus real, when se construye, then ninguna superficie contiene «Consíguelo», «Cómprala», «no tienen documento cotejado» ni «Edición cotejada, gratuita».

## Spec Change Log

- 2026-11-14 — **Decisión delegada por Héctor (chat, 2026-11-14), decisión 1b.** «Cómo citar» (32.5) sale del contenedor de arriba y va al pie de la página 1: tras el listado y su paginación, «Buscar en esta obra» y los Temas, y antes de la Nota de la ficha; sigue siendo un desplegable cerrado con el mismo componente, zona (ninguna) y comportamiento, en su propio contenedor `data-pagefind-ignore="all"` a 5 × `--unidad` (el ritmo del pie), con la isla `CopiarReferencia` tras él. El contenedor de arriba conserva «Dónde leer esta obra» y luego «Cómo empieza», a 2 × `--unidad`. Esto sustituye, en la página, a la frase de Boundaries «la 32.5 meterá "Cómo citar" detrás, en el mismo contenedor» (el contrato no se reescribe). Lo motiva el Block If: con tres desplegables arriba la medida daba 683,5 px. Se ajustan las pruebas de la 32.5 que afirmaban su sitio (`tests/unit/como-citar-obra-build.test.ts`, `tests/e2e/como-citar-obra.spec.ts`, `tests/unit/buscar-en.test.ts`) sin rebajar lo demás que comprueban, y AGENTS.md. Asentarlo en DESIGN.md/EXPERIENCE.md queda diferido para Héctor (`bmad-ux`).

## Review Triage Log

### 2026-11-14 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

### 2026-11-14 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 3: (high 0, medium 1, low 2)
- defer: 2: (high 0, medium 1, low 1)
- reject: 24
- addressed_findings:
  - `[medium]` `[patch]` El barrido de la afiliación encendida (`tests/e2e/ingreso-accesible.spec.ts`) auditaba «Ediciones en venta» dentro de un `<details>` cerrado: ahora abre «Dónde leer esta obra» con un clic en su `<summary>` (exigiendo el bloque oculto antes y visible después), barre la página cerrada y abierta con `auditar`, y mira nombres, descripción y contraste del bloque con él abierto.
  - `[low]` `[patch]` `tests/unit/ediciones-en-venta.test.ts` buscaba la palabra «Gratis» en cualquier parte del `<details>`: ahora exige el `p.rotulo-de-grupo` «Gratis» y que el bloque de ventas vaya detrás de él.
  - `[low]` `[patch]` SM-C4 no declaraba `palanca`: la gana con lo que dice el PRD §7 («si baja, se juzga lo que se movió»; lo decide Héctor), y `tests/unit/linea-base.test.ts` la exige.

## Design Notes

- **Primera pantalla, estimación previa.** La 32.3 midió 669,5 px (Larra, Ficha técnica completa, salto y «Cómo empieza» cerrado). El salto costaba 24 + 44 = 68 px; «Dónde leer» cerrado cuesta 44 + filete, y «Cómo empieza» pierde su margen y su filete superior al pasar a hermano. Queda ≈ 646 px: probablemente por encima de 640. Si la medida lo confirma, es el Block If (lo decide Héctor con `bmad-ux`), no un ajuste de distancias por nuestra cuenta. En el Corpus real (sin Wikidata ni incipit) la prueba de toda página 1 cambia ≈ +2 px.
- **Primera pantalla, medida (2026-11-08).** Con la página 1 reordenada (sin el salto, contenedor único a 3 × de la Cabecera, «Dónde leer esta obra» y «Cómo empieza» hermanos y cerrados, listado a 4 × con su filete), `tests/e2e/incipit.spec.ts` en `escritorio` a 360 × 640 sobre la Obra de Larra con Ficha técnica completa e incipit mide la primera Tarjeta del listado a **646,5 px** (≥ 640): se cumple el Block If. Desglose bajo la Cabecera: 24 (contenedor) + 1 (filete) + 44 («Dónde leer») + 44 («Cómo empieza») + 1 (filete) + 32 (listado) + 1 (filete del listado) = 147 px, frente a los 170 de antes (salto 68 + «Cómo empieza» 70 + 32). Faltan 6,5 px; mover distancias o el orden lo decide Héctor con `bmad-ux`.
- **Decisión delegada por Héctor (chat, 2026-11-14).** El contenedor único de desplegables bajo la Cabecera va a 2 × `--unidad` (16 px) en lugar de 3 × (24 px), mismo orden; todo lo demás como dice el spec. Se calculó para los 646,5 px de dos desplegables (≈ 638,5 < 640).
- **Primera pantalla, medida con la 32.5 (2026-11-14).** Fusionada la 32.5 —«Cómo citar», cerrado, en toda página 1, último hermano del contenedor— y aplicada la decisión delegada, la misma medida da **683,5 px**: 646,5 + 45 («Cómo citar» y su filete) − 8. Sigue el Block If; faltan 43,5 px y la decisión delegada no los cubre. Lo construido está en la rama local `v9/wip-32-4-fusion` (b478e35f48, sobre 25ee042e57).
- **Decisión 1b (delegada por Héctor, chat, 2026-11-14).** «Cómo citar» va al pie de la página 1, antes de la Nota; arriba quedan «Dónde leer esta obra» y «Cómo empieza» a 2 × `--unidad`. Estimación: 683,5 − 45 ≈ 638,5 px. Medida: ver «Primera pantalla, medida con la decisión 1b».
- **Primera pantalla, medida con la decisión 1b (2026-11-14).** Con «Cómo citar» al pie y arriba «Dónde leer esta obra» y «Cómo empieza» cerrados a 2 × `--unidad`, `tests/e2e/incipit.spec.ts` en `escritorio` a 360 × 640 sobre la Obra de Larra con Ficha técnica completa e incipit mide la primera Tarjeta del listado a **638,5 px** (< 640: la puerta pasa, con 1,5 px de margen). Desglose bajo la Cabecera: 16 (contenedor) + 1 (filete) + 44 («Dónde leer») + 44 («Cómo empieza») + 1 (filete) + 32 (listado) + 1 (filete del listado) = 139 px. La puerta de la 32.2 (`tests/e2e/ficha-tecnica.spec.ts`, sin incipit) vuelve a correr fuera de `test.fixme`: 593,5 px. Con el Corpus real (`tests/e2e/accesibilidad.spec.ts`, toda página 1), la peor deja el fin de la primera línea de la primera Cita a 550,8 px.
- **Un contenedor, hermanos.** Dos `div` con su propio `data-pagefind-ignore` separarían los `<details>` y la regla `.desplegable + .desplegable` no actuaría: dos filetes juntos.
- **El rótulo de grupo no es encabezado.** El `h2` pasa a `<summary>` (UX-DR125) y Desplegable prohíbe encabezados en él; un `h3` dentro del contenido colgaría del `h1`. `EdicionesEnVenta` conserva su `h3` porque la historia la quiere «tal como lo pinta»; la 33.2 la reparte.
- **La hoja.** `DondeLeer.astro` se pinta en toda página 1, así que su `<style>` no crea hueco en páginas que no lo usan; la página no gana reglas (el contenedor lleva `style`).

## Verification

**Commands:**
- `npx astro check` -- 0 errores.
- `npx vitest run tests/unit/atribucion.test.ts tests/unit/obra-pagina.test.ts tests/unit/ediciones-en-venta.test.ts tests/unit/ficha-tecnica-build.test.ts tests/unit/incipit-build.test.ts tests/unit/buscar-en.test.ts tests/unit/tarjeta-de-obra.test.ts tests/unit/linea-base.test.ts tests/unit/medicion.test.ts tests/unit/ingreso-construido.test.ts tests/unit/desplegable.test.ts tests/unit/tipografia-en-tokens.test.ts` -- verde, uno a uno.
- `FECHA_JORNADA=2026-11-08 npm run build` -- pasa (alcance, indexables, peso).
- `npm test` (desatendido, `correr.sh`) -- verde.
- `npx playwright test tests/e2e/incipit.spec.ts tests/e2e/ficha-tecnica.spec.ts --project=escritorio` y `tests/e2e/accesibilidad.spec.ts -g "Obra"` en `escritorio` y `movil`; `tests/e2e/tipografia-calculada.spec.ts --update-snapshots` solo para los de Obra -- verde; la medida de 360 × 640 anotada aquí.

## Auto Run Result

Status: done
Baseline: 0eb8fdaf5f6de5ee073bd9b5a8a6a606cde292cc (la reanudación; el trabajo de `v9/wip-32-4-fusion`, b478e35f48, se trae por cherry-pick en el mismo commit).

**Resumen.** La página 1 de la Obra, reordenada: «Dónde leer esta obra» es un desplegable cerrado (`DondeLeer.astro` sobre `Desplegable.astro`), primero del contenedor entre la Cabecera y el listado y a 2 × `--unidad` de ella, con «Cómo empieza» de hermano; el grupo «Gratis» (`RotuloDeGrupo.astro`) con la frase de lo tomado de cada edición (`textoDeLoTomado`); sin el salto ni el ancla de la 24.7. Por la decisión 1b delegada por Héctor (chat, 2026-11-14), «Cómo citar» (32.5) va al pie, tras los Temas y antes de la nota, en su propio contenedor a 5 × `--unidad`. `DESPLIEGUE_DE_LA_OBRA_COMO_DESTINO` (`undefined`) y el juicio SM-C4 (`continuacion-desde-listado`, unidad de la Página de Obra, corte del incipit).

**Ficheros.**
- `src/pages/obra/[autor]/[slug]/[...page].astro` — sin salto ni sus reglas; contenedor de arriba con «Dónde leer» y «Cómo empieza» a 2 ×; «Cómo citar» al pie a 5 ×; cabecera al día.
- `src/components/DondeLeer.astro` — desplegable con «Gratis», la frase de lo tomado y el caso sin cotejo.
- `src/components/RotuloDeGrupo.astro` — nuevo: el rótulo de grupo, un `<p>`.
- `src/components/Rotulo.astro`, `src/lib/obras.ts` — sin `ANCLA_DE_DONDE_LEER`; docs al día.
- `src/lib/atribucion.ts` — `textoDeLoTomado`.
- `src/lib/umbrales.ts` — `DESPLIEGUE_DE_LA_OBRA_COMO_DESTINO`.
- `tools/lib/lineaBase.ts` — `unidadDeLaPaginaDeObra`, la tasa «continuación desde listado» y SM-C4.
- `tests/unit/{obra-pagina,ediciones-en-venta,ficha-tecnica-build,buscar-en,incipit-build,tarjeta-de-obra,como-citar-obra-build}.test.ts` — el salto y el pie reescritos; orden, distancias, sitio de «Compartir en», byte a byte con afiliación; «Cómo citar» al pie.
- `tests/unit/{atribucion,obras,linea-base}.test.ts` — `textoDeLoTomado`, dos Fuentes y SM-C4 con respuestas fijas.
- `tests/e2e/{accesibilidad,incipit,como-citar-obra,ficha-tecnica}.spec.ts` — el `describe` de la 24.7 pasa a la 32.4 (sin salto, tabulación, Intro, 320 px, distancias); la puerta de 360 × 640 de la 32.3 y la de la 32.2 (fuera de `test.fixme`).
- `tests/e2e/tipografia-calculada.spec.ts-snapshots/tipografia-obra-{movil,escritorio}.json` — regenerados.
- `AGENTS.md` — el orden de la página 1, la frase de lo tomado, SM-C4 y «Cómo citar» al pie.
- `_bmad-output/implementation-artifacts/spec-32-5-como-citar-la-obra.md` — su registro de cambios anota la decisión 1b; `sprint-status.yaml` — fuera el comentario de bloqueo de la 32-4.

**Revisión.** Sin hallazgos externos en esta pasada: 0 parches, 0 diferidos, 0 rechazados. Recomendación de revisión de seguimiento: `false` (parches 0 high, 0 medium, 0 low; puntuación 0).

**Verificación.**
- `npx astro check` — 0 errores, 0 avisos.
- Unitarias, por fichero: `obra-pagina`, `buscar-en`, `incipit-build`, `ediciones-en-venta`, `ficha-tecnica-build`, `como-citar-obra-build`, `tarjeta-de-obra`, `desplegable`, `tipografia-en-tokens`, `medicion`, `ingreso-construido`, `atribucion`, `linea-base`, `obras` — verde.
- `FECHA_JORNADA=2026-11-08 npm run build` — pasa (alcance, indexables, peso).
- `npm test` (desatendido) — 175 ficheros, 7.927 pruebas, verde.
- `npx playwright test tests/e2e/incipit.spec.ts tests/e2e/ficha-tecnica.spec.ts tests/e2e/como-citar-obra.spec.ts --project=escritorio` — 15 verdes, 1 saltada (la página 2 de la Obra de hoy no existe). **Puerta de 360 × 640: 638,5 px** (Larra, Ficha técnica + incipit, todo cerrado); la de la 32.2, 593,5 px.
- `npx playwright test tests/e2e/accesibilidad.spec.ts -g "Obra"` (escritorio y móvil) — 90 verdes; peor página 1 del Corpus real, 550,8 px.
- `tests/e2e/tipografia-calculada.spec.ts -g "cambian obra: cada" --update-snapshots` — regenerados y verdes.

**Riesgos residuales.** La puerta de la primera pantalla pasa con 1,5 px de margen en el peor caso sintético (Larra con Ficha técnica completa e incipit): cualquier px más bajo la Cabecera la vuelve a romper. UX-DR124/UX-DR129 en los artefactos de planificación siguen diciendo otro sitio para «Cómo citar» hasta que Héctor lo asiente con `bmad-ux` (diferido).

### Pasada de revisión 1 (2026-11-14)

**Resumen.** Cinco capas externas (blind-hunter, edge-case-hunter, verification-gap, intent-alignment, ac-auditor). Lo que solo repite la divergencia de las decisiones 1 y 1b frente a UX-DR124/UX-DR129 y la épica no es hueco de intención: lo delegó Héctor (chat, 2026-11-14) y su asiento en DESIGN.md/EXPERIENCE.md ya estaba diferido para él (`bmad-ux`).

**Ficheros de esta pasada.**
- `tests/e2e/ingreso-accesible.spec.ts` — el barrido de la afiliación encendida abre «Dónde leer esta obra» por su `<summary>` y audita cerrada y abierta; nombres, descripción y contraste del bloque, con él abierto.
- `tests/unit/ediciones-en-venta.test.ts` — «Gratis» como `p.rotulo-de-grupo`, antes del bloque de ventas.
- `tools/lib/lineaBase.ts` — SM-C4 declara su `palanca` (PRD §7); `tests/unit/linea-base.test.ts` la exige.

**Revisión.** 3 parches (0 high, 1 medium, 1 + 1 low), 2 diferidos (la concordancia de UX-DR127 con k = 1, para Héctor con `bmad-ux`; el margen de 1,5 px de la puerta de primera pantalla), 24 rechazados (entre ellos: las salidas de las páginas 2+ ya quedan fuera de la unidad por `lugarDe`, la medida de prosa la da `Desplegable.astro`, `citasSinDocumento` se queda por decisión del spec, la retirada del ancla es criterio de la historia, el `h3` de `EdicionesEnVenta` es de la 33.2, la isla de copiar ya la vigila `como-citar-obra-build.test.ts`, y la línea de `sprint-status.yaml` la escribe el cierre del bucle). Recomendación de revisión de seguimiento: `true` (parches 0 high, 1 medium, 2 low; puntuación 3 × 1 + 2 = 5).

**Verificación.**
- `npx vitest run tests/unit/linea-base.test.ts` — 104 verdes; `tests/unit/ediciones-en-venta.test.ts` — 55 verdes.
- `npx playwright test tests/e2e/ingreso-accesible.spec.ts --project=escritorio` — 12 verdes (la Página de Obra, cerrada y abierta).
- `npx astro check` — 0 errores, 0 avisos.
- `npm test` (desatendido) — 175 ficheros, 7.927 pruebas, verde.

**Riesgos residuales.** Los de la pasada anterior, más la frase «se tomaron 1 de sus {n} citas» en el sitio hasta que Héctor redacte la forma concordada en UX-DR127.

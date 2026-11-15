---
title: 'Historia 36.1 — Los paneles de la Página de Cita y de la de Autor'
type: 'feature'
created: '2026-11-15'
status: 'done'
baseline_revision: '9502445ffbb9f4e15dbe0824b8671e1a0366233a'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-36-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-brainlySabiduria-2026-08-10/DESIGN.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-brainlySabiduria-2026-08-10/EXPERIENCE.md'
warnings: [oversized]
deferred:
  - summary: 'Radios: DESIGN.md da `rounded.ficha` 0.75rem y `rounded.panel` 1rem; los radios existentes de tokens.css van en px (`--radio: 3px`, `--radio-tarjeta: 6px`). Decisión de plan: se escriben literalmente como en DESIGN.md (`--radio-ficha: 0.75rem`, `--radio-panel: 1rem`); ninguna prueba compara radios ni exige px. Si el árbol debe unificar unidades, lo decide Héctor (bmad-ux).'
    evidence: 'DESIGN.md frontmatter `rounded`; src/styles/tokens.css «Forma»; grep de `--radio` en tests/ (solo sondas de `--radio` en e2e).'
    severity: low
  - summary: '[ASSUMPTION aceptada por delegación de Héctor (chat, 2026-11-14), pendiente de bmad-ux] La Ficha de Autor en panel Autor solo en la página 1 de `/autor/{slug}/`: las 2+ no tienen Ficha (llevan solo el `h1`) y su `h1` queda sobre el papel.'
    evidence: 'EXPERIENCE.md § Ficha de Autor («Vive solo en la primera página»); DESIGN.md § Página de Autor «En paneles».'
    severity: low
  - summary: '[ASSUMPTION aceptada, pendiente de bmad-ux] Espaciados no escritos en las espinas: el panel de herramientas a 4 × unidad de lo de arriba también cuando le precede el panel de la Obra (la regla «entre paneles 2 × unidad» rige dentro de las Rutas de salida y entre la Ficha de Autor y la Lista de Obras); el `nav` de las Rutas conserva su apertura de 8 × / 12 × unidad pero pierde su filete y su `padding-top`; el panel que cierra con un `<summary>` cuenta como «cierra con Fila de bloque» (1 × unidad abajo).'
    evidence: 'DESIGN.md § Primitivas → Panel de bloque y § Página de Cita → Desplegables (v9.3); RutasDeSalida.astro `.salidas`.'
    severity: low
  - summary: 'Consecuencia forzada por AD-19 (la Ficha no admite variante): al cambiar `TarjetaDeCita.astro`, los listados de Tema, Colección, Obra y Personaje pasan ya a Fichas en esta historia; aquí solo se les quita el filete superior del `ul` (incoherente sobre una pila de cajas). Sus paneles siguen siendo de la 36.2.'
    evidence: 'EXPERIENCE.md § Tarjeta de Cita (v9.3, «la misma tarjeta en todas partes… sin variante compacta»); `border-top` de `.listado` en tema/coleccion/obra/personaje `[...page].astro`.'
    severity: low
  - summary: 'Corte de serie: la pasada cambia el aspecto de la Tarjeta de Obra y de las Rutas de salida, que son lo que mide la continuación de la Página de Cita (SM-4, SM-3) y SM-C5, así que se declara su corte con una constante nueva `DESPLIEGUE_DE_LOS_PANELES` en `undefined`. Su valor lo da Héctor al desplegar, en un commit aparte; ningún agente lo elige.'
    evidence: 'epic-36-context.md § Requirements; src/lib/umbrales.ts CORTES_DE_SERIE_DECLARADOS; tools/lib/lineaBase.ts JUICIOS_POR_VENTANAS SM-C5.'
    severity: low
  - summary: 'NFR-7 (Lighthouse, medias de 10 corridas alternas) se mide en la puerta de la Épica 36 antes del merge, no en esta historia: aquí solo se anota el delta en bytes de la hoja de estilo de la Página de Cita y de la de Autor. La historia no añade guion.'
    evidence: 'epics.md Story 36.1, último Given; memoria del bucle (puerta NFR-7 por medias de 10 corridas).'
    severity: low
  - summary: >-
      La instantánea `buscar-con-resultados` de `tests/e2e/tipografia-calculada.spec.ts` depende del momento: según la carga, la región `p.estado` de `/buscar/` ya tiene texto al medir y sale una ruta que la instantánea no trae.
    evidence: |-
      `npx playwright test tests/e2e/tipografia-calculada.spec.ts --repeat-each=3 -g buscar-con-resultados` falla 5 de 6 con la misma diferencia (`main > div.contenedor.pagina > div.recuento > p.estado`) en la revisión base 9502445ffb, sin esta historia; `/buscar/` no cambia con ella y su instantánea no se regrabó.
    location: >-
      tests/e2e/tipografia-calculada.spec.ts:37
    severity: low
---

<intent-contract>

## Intent

**Problem:** En la Página de Cita y en la de Autor todos los bloques visten igual —mismo papel, mismo filete, misma versalita gris— y las Citas relacionadas se leen con el cuerpo y el peso de la principal; Héctor (2026-11-14): «todo viste igual».

**Approach:** Pasada solo visual (UX v9.3, dirección «Fichas»): tokens nuevos en `tokens.css`, una primitiva `PanelDeBloque` (fondo por familia, radio, relleno, Rótulo de panel y divisorias de dentro) que envuelve los bloques secundarios existentes sin cambiar su marcado interno ni su orden, y la Tarjeta de Cita restilizada como Ficha de Cita.

## Boundaries & Constraints

**Always:**
- Ningún literal de color, tipografía, peso o interlineado fuera de `tokens.css`; cada token nuevo con el valor del frontmatter de DESIGN.md: `--contenedor-obra #f7e3d8`, `--sobre-contenedor-obra #5c2c18`, `--filete-obra #ebcdbd`, `--contenedor-autor #dde5ef`, `--sobre-contenedor-autor #2b3a4a`, `--filete-autor #c9d5e3`, `--contenedor-tema #e4ebdc`, `--sobre-contenedor-tema #2e4228`, `--contorno-tema #55704a`, `--filete-ficha #e6dccd`, `--radio-ficha: 0.75rem`, `--radio-panel: 1rem` (`--cita-xs` y `--interlineado-cita-xs` ya existen). `tipografia-en-tokens.test.ts` en verde sin excepción nueva.
- Nada cambia salvo el aspecto: ni orden de bloques, ni textos, ni `data-zona` (siguen en cada `<li>` y en el `ul` de chips), ni `COLOCACION`, ni `src/lib/vocabulario.ts`, ni rutas, metas, JSON-LD ni `data-pagefind-*`. Las `section` existentes conservan elemento, clase y atributos (las pruebas buscan `<section class="de-la-misma-obra"`, etc.).
- El panel es un `<div>` sin `role`, sin `aria-*` y sin `data-zona`/`data-sin-zona`: no añade regiones. Cada bloque conserva su `h2` de `Rotulo.astro` y su texto; `Rotulo.astro` y su API no cambian.
- Un bloque ausente no deja panel (sin Obra, sin panel Obra; sin grupo de Rutas, sin su panel). La atribuida lleva solo «Inserta esta cita» en el panel de herramientas.
- `TarjetaDeCita.astro` sigue siendo la única tarjeta (AD-19), sin variante: mismo contenido por sitio, recorte a 120 y verso.
- `Desplegable.astro` sigue sin `:global` y sin fondo, radio ni regla de foco propios (su prueba lo vigila); el trato dentro de un panel lo pone el panel.
- Sin sombra ni elevación; botones, campos, selectores y chips conservan sus radios. `secondary`/`secondary-container` no aparecen.
- Portada, 404, Directorios y `/buscar/` no cambian a la vista (la portada no usa `TarjetaDeObra.astro` ni `TarjetaDeCita.astro`).

**Block If:**
- Un contraste AA medido sobre un tinte no se cumple con los tokens de DESIGN.md (habría que cambiar un valor de la espina).
- CAP-1 se rompe: a 360 × 640 el texto de la Cita deja de ser lo primero visible.
- Cumplir algo exige editar `_bmad-output/planning-artifacts/` o `_bmad-output/specs/`, o tocar `src/lib/vocabulario.ts`.

**Never:**
- Los textos nuevos de la maqueta («Para usarla», «De otras obras suyas.», recuentos junto a «Citas documentadas», «Procedencia no documentada.»).
- Paneles en Obra, Personaje, Tema, Colección (36.2), en la portada o en los Directorios.
- Píldoras, iconos por familia, paneles anidados, un `section aria-labelledby` o un `aside` como panel.
- Tocar `EdicionesEnVenta.astro` ni nada dentro de un `data-ingreso`.
- Dar valor a `DESPLIEGUE_DE_LOS_PANELES`, correr Lighthouse contra el sitio en vivo o cualquier orden `--remote`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Cita completa | Cita con Obra de ≥3 Citas, pasaje, «Cómo citar», «Más de», Temas | Orden: Cita/Atribución/Fuente/acciones/«Compartir en» en papel → panel Obra (Tarjeta de Obra) → «Lee el pasaje» en papel → panel herramientas («Cómo citar» + «Inserta esta cita») → `nav` con panel Obra («De la misma obra»), panel Autor («Más de»), panel Tema (chips) | — |
| Cita sin Obra | `cita.obra` ausente | Ni panel Obra arriba ni «De la misma obra»; herramientas y demás igual | — |
| Atribuida | Cita de Personaje, sin «Cómo citar» ni pasaje | Panel herramientas con solo «Inserta esta cita»; «Más de {Personaje}» en panel Autor; línea de retirada sobre el papel tras el `nav` | — |
| Rutas vacías | ningún grupo | Sin `nav` ni panel | — |
| Autor p. 1 | con semblanza ajena, Lista con pliegue y «Y N citas sin obra» | Panel Autor (h1 en `--sobre-contenedor-autor`, años, semblanza, atribución en siena) → panel Obra (Rótulo de panel «Su obra en este Corpus», lista, «Y {m} obras más» dentro, pie) → «Citas documentadas», «Buscar en», listado en Fichas sobre el papel | — |
| Autor p. 2+ | `currentPage > 1` | `h1` sobre el papel, listado en Fichas | — |
| Desplegable abierto en panel | se abre «Cómo citar» | Crece dentro del panel; el campo conserva fondo `--contenedor-bajo` y contorno | — |

</intent-contract>

## Code Map

- `src/styles/tokens.css` -- tokens; añadir colores v9.3 en «Color» y radios en «Forma», con comentario de origen (DESIGN.md v9.3). Anillo global `:focus-visible` (siena, `border-radius: var(--radio)`): comprobar que no pisa el radio de la Ficha (el selector con ámbito del componente gana en especificidad).
- `src/components/PanelDeBloque.astro` -- NUEVO. Props: `familia: 'obra' | 'autor' | 'tema' | 'herramientas'` y `cierre: 'fila' | 'texto'` (obligatorios, sin omisión). `<div class="panel {familia} cierre-{…}"><slot/></div>`. Su `<style>` posee el trato de dentro con `:global` bajo `.panel`: fondo por familia; `border-radius: var(--radio-panel)`; `padding: 3u 2u {1u|3u}`; `max-width: var(--medida-prosa)`; `.panel + .panel { margin-top: 2u }`; Rótulo de panel (`.panel :global(.rotulo)`: `text-transform: none`, `letter-spacing: 0.06em`, color `--sobre-contenedor-{obra|autor|tema}` por selector explícito, sin propiedades personalizadas nuevas) y su contenido a 1 × unidad; Filas de bloque con divisoria de familia (`--filete-obra`, `--filete-autor`, `--filete` en herramientas) y sin borde en la última; Desplegables planos (`border-block: none`; divisoria arriba cuando siguen a algo; `<summary>` con trato de Rótulo de panel en `--tinta`); divisoria de `ListaDeObras` en `--filete-obra`; `.chip` en panel Tema (`--contenedor-minimo`, filete `--grosor-filete` `--contorno-tema`, hover `--contenedor-bajo`). No sobrescribe `font-size`/`line-height` (la guardia de tipografía exige pareja).
- `src/components/TarjetaDeObra.astro` -- solo se usa en `src/pages/cita/[slug].astro` (la portada compone la suya en `index.astro`). Envolver la `section` en `<PanelDeBloque familia="obra" cierre="fila">`; quitar de `.tarjeta-de-obra` `border-top`/`padding-top` (el margen de 4u pasa al panel o se conserva fuera) y de `.filas` el `border-top` y su margen se mantiene en 2u. Su propia hoja sigue sin `background`/`border-radius` (prueba de 24.4).
- `src/components/RutasDeSalida.astro` -- cada `section` dentro de su panel: `de-la-misma-obra` → obra/fila, `mas-del-autor` → autor/fila, `temas-de-la-cita` → tema/texto. `.salidas`: conservar `margin-top` 8u/12u, quitar `border-top` y `padding-top`; `section + section` → lo da `.panel + .panel`; `.tarjetas` sin `border-top`, a 1u del rótulo; el cierre `FilaDeBloque` a 1u de la última ficha.
- `src/components/TarjetaDeCita.astro` -- Ficha de Cita: `li` sin `border-bottom`, `.tarjeta + .tarjeta { margin-top: var(--unidad) }`; `a` con `background: var(--contenedor-minimo)`, `border: var(--grosor-filete) solid var(--filete-ficha)`, `border-radius: var(--radio-ficha)`, `padding: calc(var(--unidad) * 2)`, sin `margin-inline` negativo, `min-height` 44, hover `--contenedor-bajo` (regla `.tarjeta a:hover` que la prueba busca); `.fragmento` `--cita-xs`, `--peso-regular`, `--interlineado-cita-xs`. Las comillas «» las pone ya `TextoDeCita.astro`. `.autor`, `.obra` y `gap` (1u) sin cambio.
- `src/pages/cita/[slug].astro` -- `.desplegables` (con `data-pagefind-ignore="all"`) queda: «Lee el pasaje» suelto, luego `<PanelDeBloque familia="herramientas" cierre="fila">` con «Cómo citar» (si hay) e «Inserta esta cita». El panel a 4u de lo de arriba.
- `src/pages/autor/[slug]/[...page].astro` -- página 1: `header.ficha` dentro de `<PanelDeBloque familia="autor" cierre="texto">`, `h1` con color `--sobre-contenedor-autor` solo en el panel; `section.obras-del-autor` dentro de `<PanelDeBloque familia="obra" cierre={pieDeObras !== undefined ? 'texto' : 'fila'}>` (margen 5u → 2u entre paneles; la lista a 1u del rótulo). `.listado` sin `border-top`. Páginas 2+ sin panel.
- `src/components/Chips.astro`, `src/components/Desplegable.astro`, `src/components/FilaDeBloque.astro`, `src/components/ListaDeObras.astro`, `src/components/Rotulo.astro` -- sin cambios (los compartan portada, Directorios y `/obras/`); el panel los alcanza por sus clases.
- `src/pages/{tema/[slug],coleccion/[slug],obra/[autor]/[slug],personaje/[slug]}/[...page].astro` -- solo quitar el `border-top` de `.listado`.
- `src/lib/umbrales.ts` -- `DESPLIEGUE_DE_LOS_PANELES: string | undefined = undefined` con su comentario (forma de `DESPLIEGUE_DE_CITAR_Y_LLEVARSE`) y entrada en `CORTES_DE_SERIE_DECLARADOS`, `series: ['continuacion-de-cita']`, al final.
- `tools/lib/lineaBase.ts:466-478` -- SM-C5 `corte.llegadas` añade `{ deDondeLlega: 'DESPLIEGUE_DE_LOS_PANELES' }`.
- Pruebas que fijan lo de antes y hay que poner al día: `tests/unit/tarjeta-de-obra.test.ts` (~430-480: `.filas border-top`, apertura), `tests/unit/tarjeta-de-cita.test.ts` (estilo de `.fragmento`/`.tarjeta`), `tests/unit/rutas-de-salida.test.ts`, `tests/unit/linea-base.test.ts:545-560,1308-1320` (lista de jornadas y llegadas de SM-C5), `tests/e2e/desplegable.spec.ts:240-285` (trato del `<summary>`: en panel, sin mayúsculas y en tinta; «Lee el pasaje» igual), `tests/e2e/rutas-de-salida.spec.ts`, `tests/e2e/tipografia-calculada.spec.ts` + `-snapshots/` (rutas de clases nuevas por el `div.panel` y el fragmento 600|1,3 → 400|1,45 en cita, autor, tema, coleccion, obra; regrabar desde la base y revisar que el diff no tiene nada más).

## Tasks & Acceptance

**Execution:**
- `src/styles/tokens.css` -- añadir los 10 colores y 2 radios -- contrato de DESIGN.md v9.3.
- `src/components/PanelDeBloque.astro` -- crear la primitiva con cabecera documental (qué es, por qué no es landmark, por qué posee el trato de dentro) -- un solo dueño del Panel de bloque.
- `src/components/TarjetaDeObra.astro`, `src/components/RutasDeSalida.astro`, `src/components/TarjetaDeCita.astro` -- aplicar Code Map y poner al día sus comentarios de cabecera (v9.3) -- los bloques de la Página de Cita.
- `src/pages/cita/[slug].astro`, `src/pages/autor/[slug]/[...page].astro` -- panel de herramientas; paneles Autor y Obra en p. 1; listado sin filete -- las dos páginas de la historia.
- Listados de tema/coleccion/obra/personaje -- quitar `border-top` de `.listado` -- coherencia con la Ficha global.
- `src/lib/umbrales.ts`, `tools/lib/lineaBase.ts` -- corte `DESPLIEGUE_DE_LOS_PANELES` -- SM-4/SM-C5.
- `tests/unit/paneles.test.ts` -- NUEVO, sobre `dist/` con `construirConCorpus` (patrón de `tests/unit/rutas-de-salida.test.ts`): tokens.css declara cada token nuevo con el valor del frontmatter de DESIGN.md (leído con `yaml`); en una Página de Cita completa, una atribuida y una sin Obra, qué bloque cae en qué `div.panel.{familia}`, en el orden de hoy, sin panel vacío, sin `role`/`aria-*`/`data-zona` en ningún `.panel`, «Lee el pasaje» y la Cita fuera de todo panel; en la Página de Autor p. 1 y p. 2 lo de la matriz; ningún `.panel` en portada, 404, `/autores/`, `/obras/`, Obra, Tema, Colección ni Personaje.
- Pruebas del Code Map -- poner al día lo que fijaba el trato de antes, sin relajar lo demás.
- `tests/e2e/paneles.spec.ts` -- NUEVO (escritorio y móvil): contraste calculado ≥ 4,5:1 de rótulo, texto, apagado y siena sobre cada tinte y de texto sobre la Ficha, ≥ 3:1 del filete del chip sobre Tema; Ficha con `min-height` ≥ 44 y radio 12px; foco visible (outline siena) sobre una Ficha y una Fila dentro de cada panel; a 360 × 640 la Cita sigue siendo lo primero visible.

**Acceptance Criteria:**
- Given DESIGN.md v9.3, when se construye, then `tokens.css` define una vez cada token nuevo con el valor del frontmatter y ningún componente lleva literal de color, tipografía, peso ni interlineado (`tipografia-en-tokens.test.ts` en verde sin excepción nueva).
- Given la Página de Cita a 360 px y en escritorio, when se pinta, then cada bloque está en el panel de la matriz, en el orden de hoy, con Rótulo de panel en la tinta de su familia, el mismo `h2` y texto, ningún panel es landmark, y «De la misma obra» y «Más de» llevan Fichas con `--cita-xs` mientras la Cita principal conserva su tramo.
- Given la Página de Cita a 360 × 640, when carga, then el texto de la Cita es el primer contenido visible sin desplazar (CAP-1).
- Given la Página de Autor, when se pinta, then la Ficha va en panel Autor, la Lista de Obras en panel Obra con su tope de la 34.2 y su desplegable intactos, y el listado en Fichas sobre el papel.
- Given cualquier panel o ficha, when se mide, then AA sobre cada tinte, 44 px de toque, foco visible y `tests/e2e/accesibilidad.spec.ts` en verde; `dist/` solo difiere en marcado y estilos de presentación (sin cambio de textos, rutas, metas, JSON-LD, `data-zona` ni `data-pagefind-*`).
- Given la puerta de la Épica 36, when se mide NFR-7 con Lighthouse antes del merge, then no empeora (diferido a la puerta; aquí, delta de bytes de CSS anotado).

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

(Las cinco capas son externas y la invocación no trajo hallazgos suyos: esta pasada no tiene ninguno.)

## Design Notes

El panel envuelve y no sustituye: las `section` de hoy (`tarjeta-de-obra`, `obras-del-autor`, con `aria-labelledby`) siguen siendo lo que eran, así que no se añade ni se quita ninguna región, y las pruebas que buscan `<section class="…"` siguen valiendo. Todo el trato de dentro vive en `PanelDeBloque.astro` con `:global` acotado bajo `.panel`, para que `Rotulo`, `Desplegable`, `FilaDeBloque`, `Chips` y `ListaDeObras` —compartidos con la portada, los Directorios y `/obras/`— salgan idénticos fuera de un panel. Comprobar especificidad: `.panel[data-astro-cid-…] .desplegable` gana a `.desplegable[data-astro-cid-…]`.

```astro
<PanelDeBloque familia="obra" cierre="fila">
  <section class="de-la-misma-obra"><Rotulo id="de-la-misma-obra">De la misma obra</Rotulo>…</section>
</PanelDeBloque>
```

## Verification

**Commands:**
- `npx vitest run tests/unit/paneles.test.ts` (y uno a uno: `tipografia-en-tokens`, `tarjeta-de-obra`, `tarjeta-de-cita`, `rutas-de-salida`, `desplegable`, `medicion`, `linea-base`, `espinas-de-ux`, `contraste-del-contorno`, `superficies`) -- verde.
- `npx astro check` -- 0 errores.
- `npm run build` -- termina; el paso del peso no se para.
- `npx playwright test tests/e2e/{paneles,accesibilidad,desplegable,rutas-de-salida,pagina-de-cita,tipografia-calculada}.spec.ts` -- verde contra `tests/servidor.mjs` (puertos según RULES).
- `npm test` completo, desacoplado con `correr.sh` -- verde.

**Manual checks (if no CLI):**
- Capturas a 360 × 640 y a 1280 de una Página de Cita completa, una atribuida y la Página de Autor p. 1 de un Autor con Lista plegada: tintes, radios, ningún panel vacío.

## Auto Run Result

Status: done
Blocking condition: ninguna.

**Resumen.** Pasada solo visual (UX v9.3, «Fichas»): doce tokens nuevos en `tokens.css`; la primitiva `PanelDeBloque.astro` (fondo por familia, radio, relleno, Rótulo de panel y el trato de dentro con `:global` acotado bajo `.panel`); la Tarjeta de Obra, «Cómo citar» + «Inserta esta cita» y los tres grupos de las Rutas de salida en sus paneles en la Página de Cita; la Ficha de Autor y la Lista de Obras en los suyos en la página 1 de Autor; la Tarjeta de Cita compuesta como Ficha de Cita (y, por AD-19, en todos los listados, cuyo `ul` pierde el filete superior); y el corte `DESPLIEGUE_DE_LOS_PANELES` (en `undefined`) para la continuación de la Página de Cita y SM-C5. Ni orden, ni textos, ni `data-zona`, ni rutas, metas, JSON-LD ni `data-pagefind-*` cambian.

**Desviación del Code Map.** La familia va en la clase `panel-{familia}` (`panel panel-obra cierre-fila`), no en `{familia}` a secas: `.autor` y `.obra` ya eran las clases de la Atribución (`p.autor`) y de la Tarjeta de Cita (`span.obra`), y un `div.panel.autor` hacía casar `page.locator('.autor')` con dos elementos (dos pruebas de `accesibilidad.spec.ts` y `pagina-de-cita.spec.ts` en rojo). El comentario de cabecera de `PanelDeBloque.astro` lo dice.

**Ficheros.**
- `src/styles/tokens.css` — los diez colores y los dos radios de DESIGN.md v9.3.
- `src/components/PanelDeBloque.astro` — nuevo: la primitiva, `familia` y `cierre` obligatorios y validados al construir.
- `src/components/TarjetaDeObra.astro` — en el panel de la Obra; sin filete de apertura ni de primera fila.
- `src/components/RutasDeSalida.astro` — cada grupo en su panel; el `nav` conserva su apertura y pierde filete y relleno; fichas y cierre a 1 × unidad.
- `src/components/TarjetaDeCita.astro` — Ficha de Cita: caja blanca, filete `--filete-ficha`, radio `--radio-ficha`, fragmento en `--cita-xs` regular.
- `src/pages/cita/[slug].astro` — el panel de las herramientas; los paneles a 4 × unidad de lo de arriba.
- `src/pages/autor/[slug]/[...page].astro` — paneles Autor y Obra en la página 1 (el `h1` en `--sobre-contenedor-autor`); las 2+ sin panel; listado sin filete.
- `src/pages/{tema,coleccion,obra,personaje}/…/[...page].astro` — solo el `border-top` de `.listado`.
- `src/lib/umbrales.ts`, `tools/lib/lineaBase.ts` — el corte `DESPLIEGUE_DE_LOS_PANELES` y su llegada en SM-C5.
- `tests/unit/paneles.test.ts`, `tests/e2e/paneles.spec.ts` — nuevos (tokens contra el frontmatter; qué bloque en qué panel en `dist/`, sin panel vacío, anidado, con rol, `aria-*` ni zona; ninguna otra superficie con panel; contraste AA, 44 px, radio 12 px, foco en siena, `<summary>` en panel, CAP-1).
- `tests/unit/{tarjeta-de-obra,como-citar,lee-el-pasaje,linea-base}.test.ts`, `tests/e2e/{pagina-de-cita,rutas-de-salida,como-citar}.spec.ts` — puestas al día de lo que fijaba el trato de antes (el panel como hijo del `article`, filetes, aire, el corte nuevo en las llegadas pendientes).
- `tests/e2e/tipografia-calculada.spec.ts-snapshots/` — regrabadas solo cita (4 tramos), autor, tema, colección y obra, en los dos perfiles: rutas de clases con el `div.panel` y el fragmento de 600 | 1,3 a 400 | 1,45; portada, 404, Directorios y `/buscar/` sin cambio.

**Revisión.** 0 parches, 0 diferidos, 0 rechazados (sin hallazgos externos en esta invocación). `followup_review_recommended: false` (puntuación 0).

**Verificación.**
- `npx vitest run` de `paneles`, `tipografia-en-tokens`, `tarjeta-de-obra`, `tarjeta-de-cita`, `rutas-de-salida`, `desplegable`, `como-citar`, `espinas-de-ux`, `contraste-del-contorno`, `superficies`, `lista-de-obras`, `directorio-de-obras`, `linea-base`, `lee-el-pasaje`: verde.
- `npx astro check`: 0 errores, 0 avisos.
- `npm test` completo (desacoplado): 209 ficheros, 9.049 pasan y 1 falló (`lee-el-pasaje`, que esperaba un `<details>` como primer hijo de `.desplegables`); corregido y repasado el fichero en verde.
- `npm run build` (en el `webServer` de Playwright) termina; `npx tsx integraciones/peso.ts` sobre ese `dist/`: 568.571.178 bytes juzgados, por debajo del aviso.
- `npx playwright test` de `paneles`, `accesibilidad`, `desplegable`, `rutas-de-salida`, `pagina-de-cita` y `tipografia-calculada` en los dos perfiles: 495 pasan. Suite e2e entera después: 1.483 pasan y 1 falla, `buscar-con-resultados` de `tipografia-calculada`, que falla igual en la revisión base (diferido).
- Delta de CSS (NFR-7 se mide en la puerta de la Épica 36), con `/cita/alberto-masferrer-silencio-es-concentrarse-seguir-la-propia-orbita/` y `/autor/alberto-masferrer/` frente a una construcción de la base: Página de Cita +2.258 bytes (hoja externa 6.634 → 6.383, en línea 16.285 → 18.794); Página de Autor +2.489 (en línea 14.945 → 17.434); un Tema +304; la portada +308, solo los tokens. Sin guion nuevo. El marcado de la portada, `/autores/` y `/obras/` es el de la base (salvo el guion de medición de la construcción de prueba).

**Riesgos.** El trato de dentro del panel depende de la especificidad de `.panel[cid] …` sobre las reglas con ámbito de cada componente; lo fijan las pruebas e2e de `paneles` y de `pagina-de-cita`. La Ficha global cambia ya los listados de Tema, Colección, Obra y Personaje (sus paneles son de la 36.2). `DESPLIEGUE_DE_LOS_PANELES` espera su valor de Héctor.

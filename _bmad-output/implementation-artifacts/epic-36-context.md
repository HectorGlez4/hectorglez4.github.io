# Epic 36 Context: Las secciones se distinguen

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Quien lee una Página de Cita, de Autor, de Obra, de Personaje, de Tema o de Colección distingue cada bloque a la vista. La Cita principal va sola sobre el papel, sin caja, y cada bloque secundario —la Obra, las herramientas de citar, «De la misma obra», «Más de», los Temas, la semblanza, la Lista de Obras— va en un Panel de bloque con el tinte de su familia; las Citas relacionadas y los listados pasan a Fichas de Cita compactas que no compiten con la principal. Responde a Héctor (2026-11-14): «todo viste igual». Es una pasada **solo visual** (dirección «Fichas», UX v9.3).

## Stories

- Story 36.1: Los paneles de la Página de Cita y de la de Autor
- Story 36.2: El mismo patrón en Obra, Personaje, Tema y Colección

## Requirements & Constraints

- **Nada cambia salvo el aspecto**: ni el orden de ningún bloque, ni ningún texto, ni ninguna `data-zona` (siguen en el `<li>` de cada fila o ficha y en el `ul` de los chips; el panel no lleva zona ni exención), ni la tabla `COLOCACION` de `tests/unit/medicion.test.ts`, ni `src/lib/vocabulario.ts` (la huella no se mueve). Los textos nuevos de la maqueta («Para usarla», «De otras obras suyas.», «201 citas, en orden alfabético.», «Procedencia no documentada.», el recuento junto a «Citas documentadas») **no entran**.
- Un bloque que no existe no deja panel vacío ni hueco (sin Obra, sin panel de Obra; sin «Cómo citar» ni «Inserta esta cita», sin panel de herramientas; la atribuida lleva solo «Inserta esta cita»).
- Accesibilidad: todo texto sobre cada tinte AA (4,5:1; 3:1 texto grande y bordes de control), también lo apagado y el siena de lo que actúa; foco visible sobre cada tinte; áreas táctiles de 44 px (la Ficha entera es el enlace, alto mínimo 44 px); el barrido axe de `tests/e2e/accesibilidad.spec.ts` sigue en verde. El color nunca es la única señal: lo nombra el rótulo.
- Un Panel de bloque **no es un landmark**: contenedor sin rol ni nombre accesible (nunca `section` con `aria-labelledby` ni `aside`). Cada bloque conserva su `h2` de `Rotulo.astro` y su texto.
- CAP-1: a 360 × 640 el texto de la Cita sigue siendo lo primero visible sin desplazar. SM-C4 en la Obra: sus Citas siguen cerca de la primera pantalla.
- NFR-7 se mide con Lighthouse antes del merge y no empeora.
- Si la pasada mueve la primera pantalla de la Página de Cita, corta las series de SM-4 y SM-C5: el corte entra en `CORTES_DE_SERIE_DECLARADOS` con su constante de despliegue (sin fecha literal; el valor lo da Héctor al desplegar).
- `dist/` cambia solo en marcado/estilos de presentación; ningún dato, ruta, meta ni JSON-LD cambia.

## Technical Decisions

- **Tokens, nunca literales**: cada token nuevo de `DESIGN.md` v9.3 se define una vez en `src/styles/tokens.css` con el valor del frontmatter: `--contenedor-obra` (#f7e3d8) · `--sobre-contenedor-obra` (#5c2c18) · `--filete-obra` (#ebcdbd); `--contenedor-autor` (#dde5ef) · `--sobre-contenedor-autor` (#2b3a4a) · `--filete-autor` (#c9d5e3); `--contenedor-tema` (#e4ebdc) · `--sobre-contenedor-tema` (#2e4228) · `--contorno-tema` (#55704a); `--filete-ficha` (#e6dccd); `--cita-xs` (17px, regular) con `--interlineado-cita-xs` (1,45); `--radio-ficha` (0.75rem) y `--radio-panel` (1rem). `tests/unit/tipografia-en-tokens.test.ts` sigue en verde **sin excepción nueva**; también el peso y el interlineado van por token.
- El `secondary` / `secondary-container` sigue reservado a la curación y nunca aparece en público: el Autor usa su token propio aunque el valor coincida.
- Sin elevación: panel y ficha son fondo plano y radio, sin sombra. Solo esos dos radios grandes; botones, campos, selectores y chips conservan los suyos (la maqueta los dibuja como píldoras: no vale).
- `TarjetaDeCita.astro` sigue siendo el único componente de tarjeta (AD-19), sin variante compacta: cambia cómo se ve, no su contenido por sitio, su recorte a 120 caracteres ni su verso.
- Los Desplegables siguen siendo `<details>` nativos, cerrados al cargar, planos dentro del panel (el fondo es del panel).
- Un estilo de un componente de Modelo de Ingreso se emite aunque no se renderice: lo que va dentro de `data-ingreso` conserva su presentación en atributos `style` (las ediciones en venta no se tocan).

## UX & Interaction Patterns

- **Panel de bloque**: fondo por familia —Obra `--contenedor-obra`, Autor `--contenedor-autor`, Tema `--contenedor-tema`, herramientas `--contenedor`—; sin contorno ni sombra; radio `--radio-panel`; relleno 3 × unidad arriba y 2 × a los lados; abajo 1 × unidad si cierra con Fila de bloque, 3 × si cierra con chips o texto; medida de prosa, sin sangrar al borde; 2 × unidad entre paneles. Filas internas en `on-surface` con la divisoria de su familia (`--filete-obra`, `--filete-autor`, o `outline-variant` en herramientas), sin filete encima de la primera ni debajo de la última. Un panel por bloque, nunca anidados; dentro solo Fichas y los controles que ya tenían caja.
- **Rótulo de panel**: el mismo `h2`, con Inter al cuerpo, peso e interlineado del token `author`, sin mayúsculas, 0,06em de espaciado, en la tinta del panel; contenido a 1 × unidad. Fuera de un panel se conserva el Rótulo de sección (versalita gris): «Compartir en», «Citas documentadas», «Lee el pasaje», portada, Directorios. Desplegable dentro de un panel: su `<summary>` con trato de Rótulo de panel en `on-surface`.
- **Ficha de Cita**: fondo `--contenedor-minimo`, filete `rule-width` en `--filete-ficha`, radio `--radio-ficha`, relleno 2 × unidad; cursor → `--contenedor-bajo`; texto en `--cita-xs` regular entre comillas angulares; Autor (si lo lleva) en `author`, Obra debajo a 1 × unidad en `caption` y `on-surface-variant`; apiladas a 1 × unidad (sin filete entre ellas).
- **Página de Cita (36.1)**, en el orden de hoy: Cita, Atribución, Línea de la Fuente/Variante, acciones y «Compartir en» sobre el papel; Tarjeta de Obra en panel Obra (sin filete de apertura, divisoria `--filete-obra` entre sus dos filas); «Lee el pasaje» sobre el papel; «Cómo citar» + «Inserta esta cita» juntos en el panel de herramientas, sin rótulo de panel (sus `<summary>` son los rótulos, divisoria entre ellos; el campo conserva su fondo y contorno); «De la misma obra» en panel Obra con Fichas; «Más de {Autor}/{Personaje}» en panel Autor con Fichas; Temas en panel Tema (chip sobre `--contenedor-minimo` con filete `--contorno-tema`, cursor `--contenedor-bajo`); línea del canal de corrección sobre el papel. El cierre «Las {n} citas de… ›» es la última Fila de bloque del panel, a 1 × unidad de la última ficha y sin divisoria encima. El `nav` «Seguir leyendo» sigue envolviendo los tres grupos.
- **Página de Autor (36.1)**: nombre, años, semblanza y su atribución en panel Autor (nombre en `--sobre-contenedor-autor`, cuerpo y familia sin cambio; enlaces de la atribución en siena); Lista de Obras en panel Obra con su rótulo como Rótulo de panel y su desplegable «Y {m} obras más» dentro (tope de la 34.2 intacto); catálogo —«Citas documentadas», «Buscar en {Autor}», listado— sobre el papel, listado en Fichas.
- **36.2** [ASSUMPTION delegado, sin maqueta]: Obra — Cabecera y Ficha técnica en panel Obra en todas sus páginas; los tres desplegables juntos en el panel de herramientas; listado en Fichas sobre el papel; «Buscar en esta obra» y «Compartir en» sobre el papel; Temas en panel Tema; Nota sobre el papel con su filete, fuera de todo panel. Personaje — calca Autor (Ficha en panel Autor, Lista de Obras en panel Obra, listado en Fichas). Tema y Colección — `h1`, nombre y criterio sobre el papel, listados en Fichas.
- **No cambian**: Directorios (`/autores/`, `/obras/`), la portada (sus bloques conservan Rótulo de sección y filete; la Tarjeta de Obra de la Cita del Día sigue plana), la búsqueda sin resultados.
- Maqueta de referencia: `ux-designs/ux-brainlySabiduria-2026-08-10/mockups/v9-3-fichas.html`; vale por tintes, radios, Rótulo de panel y Ficha. Donde difiere (rellenos de 12/14/20 px, píldoras, 32 px del nombre, 15 px/500 del summary, «Y 54 obras más» como enlace), mandan `DESIGN.md` y `EXPERIENCE.md`.

## Cross-Story Dependencies

- 36.1 define los tokens, el Panel de bloque, el Rótulo de panel y la Ficha de Cita; 36.2 los reutiliza en Obra, Personaje, Tema y Colección y no los redefine.
- Se construye sobre la principal con las Épicas 29 a 35 ya fundidas (verso en `TextoDeCita`, recorte de la 34, Personaje y atribuida de la 35, desplegables de la v9): no reescribe nada de ellas.

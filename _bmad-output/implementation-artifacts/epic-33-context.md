# Epic 33 Context: Afiliación sin reloj

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Héctor prepara la afiliación de libros sin que arranque ningún plazo de ventas: declara las tiendas **sin su marca** —`amazon.com` primero, `amazon.es` después—, cura ficha a ficha las ediciones impresas y electrónicas de las Obras con más demanda y sabe que el Modelo `afiliacion-de-libros` no se enciende mientras alguna tienda declarada siga sin marca. Encendido, «Dónde leer esta obra» reparte las ediciones en venta en «Electrónica» e «Impresa», debajo de «Gratis». Apagado, `dist/` sale idéntico haya o no tiendas, marcas y ediciones. Con la familia Obra congelada por SM-11, lo curado se conserva y no se enseña. Ninguna cuenta con plazo de ventas se solicita antes de la pregunta 11 de §14.

## Stories

- Story 33.1: Una tienda se declara sin marca, y el Modelo no se enciende con ella
- Story 33.2: Las ediciones en venta, por formato y por tienda dentro de «Dónde leer esta obra»
- Story 33.3: La orden de qué Obras curar primero

## Requirements & Constraints

- **Declarar una tienda, con marca o sin ella, es un acto de Héctor.** Ninguna historia, prueba ni orden escribe una tienda real ni una marca en `src/lib/ingreso.ts`; `TIENDAS` sigue vacío en el árbol. Las pruebas trabajan sobre una copia (AD-21) con tiendas inventadas de dominio `.example`.
- La marca es opcional (`marca?: string`) y, sin valor, el campo se omite: nunca `marca: ''` ni `undefined` escrito. Una marca presente en blanco o con espacios se sigue rechazando; `parametro` se sigue exigiendo sin marca (el esquema lo usa para rechazar una dirección con la marca pegada). Clave, nombre, dominio y unicidad no cambian.
- El Modelo encendido con alguna tienda sin marca **detiene la construcción** nombrando cada tienda por clave y nombre; sigue en pie el fallo de la 22.9 para el Modelo encendido sin ninguna tienda; con todas con marca, construye como hoy.
- Apagado, `dist/` es idéntico byte a byte con tiendas con o sin marca y con ediciones o sin ellas (cuatro variantes, mismo `MEDICION_ENDPOINT`), sin `data-ingreso="afiliacion-de-libros"` ni dominio de tienda en ninguna página (UX-DR35).
- La edición en venta nunca va sola (FR-54): se pinta solo en una Obra con alguna Cita cotejada (`edicionCotejada`); si no, el build avisa «Ediciones sin edición cotejada».
- Con la familia Obra congelada (`CONGELACION_DE_OBRAS`, `congelacionVigente()` de `src/lib/obras.ts`) la orden `edicion` se niega con 1 sin escribir, las ediciones ya declaradas se conservan, y desde la 33.2 ninguna Página de Obra las pinta aunque el Modelo esté encendido (AD-25).
- La orden de curación no escribe nada, no pide credenciales ni red, y ningún módulo de `src/`, `integraciones/` ni `astro.config.mjs` la importa, lee la serie o recibe su resultado (AD-24). Ausencia antes que cero: sin ventana leída cada Obra sale «sin cifra» con su motivo, nunca 0.
- Accesibilidad WCAG 2.2 AA en lo que cambia (NFR-9); `npx playwright test tests/e2e/ingreso-accesible.spec.ts --project=escritorio` lo corre Héctor en local; el CI no corre e2e.
- Fuera de la épica: la Obra con derechos vigentes que vende sin edición cotejada (FR-70, Historia 35.9), y elegir ediciones o tiendas `[NON-GOAL]` (FR-62). Un Umbral cruzado dispara **solicitar** la cuenta, nunca encender.

## Technical Decisions

- **AD-20 (v9).** `Tienda` gana `marca?`; `TiendaConMarca` es `Tienda` con `marca` obligatoria. `urlDeEdicion` solo acepta, por su tipo, una `TiendaConMarca` (una prueba con `// @ts-expect-error` lo fija en `astro check`) y en ejecución lanza nombrando la tienda si le llega una sin marca por un `as`; nunca escribe `tag=` vacío ni `tag=undefined`. `edicionesEnVenta` lanza, nombrando tienda y ficha, ante una edición de tienda sin marca. `revisarDeclaracionDeIngreso` es la puerta del encendido; `astro build` evalúa `src/lib/ingreso.ts` al cargar, así que la puerta para el build.
- El esquema de la Ficha de Obra (`src/lib/admision.ts`) admite ediciones de una tienda sin marca con las reglas de siempre (dominio o subdominio, `https://`, sin puerto, sin el parámetro en ninguna capitalización). `npm run obra -- edicion` lo dice en su parte («no se pintará hasta que Héctor declare la marca y encienda el Modelo»).
- Ayudantes de prueba en `tests/unit/ayuda/construir.ts`: junto a `TIENDA_DE_PRUEBA`, una tienda inventada sin marca; `fuenteConTiendaDePrueba` declara una, otra o las dos, y sigue rompiendo si la declaración vacía de `TIENDAS` no aparece exactamente una vez. La prueba de los dos estados va en `tests/unit/ingreso-construido.test.ts` o en una vecina con los mismos ayudantes.
- `npm run ingreso` (y `--json`, con `conMarca` por tienda, nunca la marca ni el parámetro) dice cuántas tiendas hay y cuáles no tienen marca; sigue sin escribir y sale con 0.
- **33.2.** La agrupación es una función pura, `edicionesPorFormato` de `src/lib/ediciones.ts` `[ASSUMPTION: el nombre]`: formatos «Electrónica» e «Impresa» en ese orden, dentro de cada uno por tienda en el orden de `TIENDAS` `[ASSUMPTION]` y, a igual tienda, en el orden de la ficha. `EdicionesEnVenta.astro` recibe lo ya agrupado, no importa `src/lib/ingreso.ts`, no lleva `<style>` (presentación en atributos `style` con tokens, `--peso-fuerte`, `--interlineado-pie`) y pinta los dos grupos dentro de **un único** `data-ingreso="afiliacion-de-libros"` (nunca `aside`) dentro del `<details>` de `DondeLeer.astro`, tras «Gratis». La página consulta `congelacionVigente`, y el comentario «congelada o no» de `src/pages/obra/[autor]/[slug]/[...page].astro` pasa a decir que la congelación oculta las ediciones.
- Prueba de los dos estados (UX-DR147): en la copia encendida, quitar el elemento `data-ingreso` deja cada Página de Obra idéntica byte a byte a la apagada; fuera de las Obras, los dos `dist/` son idénticos; páginas 2+ sin ediciones (`modelosEnRuta`). Cada ruta con `data-ingreso` sigue bajo `MAX_BYTES_DE_GUION`. Sin guion ni enlace interno nuevo: las ediciones son enlaces de salida sin zona, y `tests/unit/medicion.test.ts` no cambia. AD-27: escribir o quitar `ediciones` sigue fechando y avisando solo su Página de Obra (`tests/unit/fecha-de-cambio.test.ts`).
- **33.3 (AD-24, AD-22).** `npm run obra -- curar-primero` *(nombre de trabajo)* en `tools/obra.ts`, cálculo puro en `tools/lib/` y efectos inyectados. Lee Citas publicadas, fichas, Autores y `corpus/serie-de-demanda.yml` (hoy con `lecturas:` vacía). Candidatas: Obras de `obrasPublicadas` con `edicionCotejada`, cada una con ficha, título, Autor, número de ediciones (0 si no declara), cuántas de tienda sin marca y si está congelada; dice cuántas quedaron fuera sin listarlas. Con congelación, lo dice con su jornada y no propone nada (sale 0). Con ventanas, usa la `28-dias` más reciente por `hasta` `[ASSUMPTION]`, nombrándola; la demanda de una Obra son impresiones y clics de sus Citas llevadas a su Obra por `resolverObras`, **provisional** (la serie no cuenta la Página de Obra) y **cota inferior** (`MIN_IMPRESIONES_POR_FILA` va a `resto`); Citas que no se publican o no resuelven no cuentan, y se dice cuántas. Orden: impresiones desc, clics desc, nombre de ficha. Una ventana leída sin Citas de la Obra o `vacia: true` da 0, que sí es lectura; una ventana ilegible da «sin cifra» con su motivo, sin recurrir a otra. Códigos: 0 si informó; 1 sin escribir si el Corpus, una ficha o la serie no se leen; 2 con bandera desconocida o argumento de más. No propone ediciones ni tiendas ni sugiere encender ni solicitar.

## UX & Interaction Patterns

- Dentro del `<details>` de «Dónde leer esta obra» (`DondeLeer.astro` sobre `Desplegable.astro` de la 34.0): «Gratis», y debajo, como mucho, «Electrónica» e «Impresa», con el mismo elemento de rótulo de grupo que pone la 32.4. Un formato sin ediciones no deja rótulo ni hueco. Sin rótulo de tienda: cada línea la nombra.
- Cada línea conserva la forma de la 22.9: «Edición impresa en {tienda}: {descripción}.» / «Edición electrónica en {tienda}: {descripción}.» (o sin descripción «Edición impresa en {tienda}.»), y en la misma línea «Enlace de afiliado: si compras, el sitio recibe una comisión sin coste para ti.». Enlace `rel="sponsored noopener"`, pestaña nueva con `AVISO_DE_PESTAÑA_NUEVA` en su nombre accesible y la declaración por `aria-describedby` con `id` único.
- Desaparece el rótulo «Ediciones en venta»; «Consíguelo» y «Cómprala» no aparecen en ninguna superficie.
- Presentación (`[ASSUMPTION]` en el espaciado): rótulo de grupo en `{typography.caption}` con el peso de `{typography.author}` y `{colors.on-surface}`; líneas en `{typography.caption}` y `{colors.on-surface-variant}`; `{spacing.unit}` del rótulo a sus líneas, 3 × `{spacing.unit}` entre grupos.

## Cross-Story Dependencies

- **33.1** no depende de nada; construible sobre la principal con `TIENDAS` vacío.
- **33.2** va detrás de la **32.4** («Dónde leer esta obra» ya plegado, antes del listado, con su grupo «Gratis» y su rótulo de grupo, y el bloque de la 22.9 dentro tras «Gratis») y de la **33.1** (una edición de tienda sin marca declarable). Sin esas dos, no empieza. Las dos están ya en la rama: la 33.1 en revisión, y la 32.4 llegó con la Épica 32 fundida en la principal (2026-11-15).
- **33.3** no depende de las otras dos; lee la serie de demanda tal como la escribe la Historia 20.3.
- Ninguna espera a las Épicas 25 y 28 de la v8. Los paneles de la v9.3 (Fichas, Épica 36) vienen después: las ediciones en venta conservan su presentación dentro de su `data-ingreso`.
- Pregunta abierta de la épica: si el orden de las tiendas dentro de un formato es el de `TIENDAS` (lo que asume la 33.2) o el de la ficha. La 35.9 consume de aquí las tiendas sin marca (33.1), `edicionesPorFormato` (33.2) y `curar-primero` (33.3).
- `AGENTS.md` § Encender la afiliación de libros se pone al día con la 33.1 (tienda sin marca, la puerta) y la 33.2 (grupos, congelación que oculta, prueba de los dos estados); § Leer la demanda por página gana el párrafo de la orden con la 33.3.

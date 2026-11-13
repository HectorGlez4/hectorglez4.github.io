# Epic 34 Context: Listados que se leen

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Ningún listado corta una palabra y ninguna página entierra sus Citas. La Tarjeta de Cita de los listados, el título de pestaña y la meta descripción de la Página de Cita se recortan en la última palabra entera antes de su tope, con «…» y un solo dueño del recorte. La Página de Autor enseña tres Obras y pliega el resto en «Y {m} obras más», así que la primera Cita de Rafael Barrett (59 Obras) pasa de unos 3.249 px a unos 680 a 360 × 640. Todo Campo de búsqueda se ve como campo, con contorno completo. A la cabeza va la primitiva de Desplegable, que reutilizan esta épica y las 30, 31, 32, 33 y 35, para que todo lo que se pliega en el sitio se abra y se cierre igual.

## Stories

- Story 34.0: La primitiva de Desplegable
- Story 34.1: Un solo dueño del recorte por palabra
- Story 34.2: La Página de Autor enseña tres Obras y despliega el resto
- Story 34.3: El Campo de búsqueda se ve como campo

## Requirements & Constraints

- Lo plegado funciona sin guion y está en el HTML inicial: un `<details>` nativo, cerrado al cargar (sin `open`), que se abre con Intro o Espacio sobre el `<summary>` y no mueve el foco. La lista entera de Obras sigue en la página 1, cada Obra una sola vez.
- Accesibilidad WCAG 2.2 AA en lo que cambia, también cerrado y abierto; reflujo sin desplazamiento horizontal a 320 px; el `<summary>` lleva solo el texto del rótulo, nunca un `h2`…`h6` dentro.
- Un desplegable que no existe para su página no pinta nada (ni `<summary>`, ni filete, ni aire); el componente se niega a un contenido vacío y detiene la construcción nombrando el rótulo.
- El recorte nunca corta a media palabra; cuenta puntos de código y no los saltos de verso; si cabe, va tal cual. El `h1`, el JSON-LD, lo copiado, la Imagen y `/buscar/` conservan el texto íntegro.
- Los topes viven con nombre en `src/lib/umbrales.ts` y conservan su valor: 120 para la Tarjeta de Cita, 110 para título y meta, `MAX_OBRAS_ANTES_DE_LAS_CITAS` = 3 (valor de Héctor). Literales, para no engordar el guion del filtro de los Directorios.
- El contorno del campo (`--contorno` sobre `--papel`) debe dar al menos 3:1, comprobado por prueba.
- Ningún cambio de campos del Corpus ni de `lastmod`; ningún Modelo de Ingreso aloja nada de esto, y se construye idéntico con los Modelos encendidos o apagados.
- Las medidas en Playwright con el Corpus real (Barrett, `/tema/la-vida/`) las corre Héctor en local; el CI no corre e2e.

## Technical Decisions

- **Desplegable** es un solo componente, `src/components/Desplegable.astro`, por el que lo citan las historias que lo usan; nadie escribe su propio `<details>`. Sin `data-zona` ni guion propio: lo de dentro declara su zona como si no estuviera plegado. No cambia `GUIONES_EXTERNOS`, `src/lib/vocabulario.ts` ni el vocabulario de zonas; ninguna historia de la épica añade zona (lo plegado de la Lista de Obras conserva `lista-de-obras`).
- Su `<style>` solo lleva reglas de su propio marcado, con el ámbito de Astro, sin `:global`: Astro emite el estilo por el grafo de importaciones aunque no se renderice, y una prueba lo vigila. Solo tokens de `tokens.css`, también peso e interlineado; `tests/unit/tipografia-en-tokens.test.ts` pasa sin excepción nueva.
- El glifo de despliegue va en un `span` `aria-hidden="true"`, del subconjunto `latin` de Inter, sin fuente propia; se comprueba con la función de `tools/lib/cobertura.ts` que usa la puerta de cobertura. El glifo concreto es provisional (lo decide Héctor con `bmad-ux`). Nunca «→» (U+2192).
- La 34.0 se renderiza en prueba fuera de toda página (contenedor de Astro o copia, nunca el árbol) y no cambia ningún fichero de `dist/` mientras ninguna página la importe. `tests/e2e/accesibilidad.spec.ts` gana un paso que abre todos los `<details>` de cada superficie y repite axe y la prueba de foco.
- El recorte lo hace una sola función pura de `src/lib/` (`recortarPorPalabra` en `src/lib/recorte.ts`, nombre supuesto); una prueba prohíbe `slice`/`substring` sobre texto de Cita en `src/components/` y `src/pages/`. En verso, título y meta pasan a una línea con `enUnaLinea` de `src/lib/verso.ts` después de recortar.
- La Lista de Obras gana una prop obligatoria que dice si se pliega: la Página de Autor la pliega, `/obras/` nunca (su HTML no cambia). El rótulo «Y {m} obras más» / «Y una obra más» lo redacta una sola función de `src/lib/atribucion.ts`, que lanza con m < 1.
- Los enlaces dentro de un `<details>` cuentan en el grafo de alcance de NFR-5 (no es `<template>` ni `<noscript>`).
- El Campo de búsqueda es una sola composición para todos sus usos; una prueba sobre `dist/` exige que todo `input[type="search"]` esté dentro de `.campo-de-busqueda`.

## UX & Interaction Patterns

- El `<summary>` lleva el trato del Rótulo de sección —`{typography.author}`, `{colors.on-surface-variant}`, mayúsculas—, sin el marcador del navegador. Toda su fila es zona de toque, alto mínimo `--zona-de-toque`. No es enlace: sin subrayado ni siena (abrir no es actuar); lo que actúa dentro sí lleva siena.
- Plano: Filete divisorio encima de cada rótulo y debajo del último, sin fondo ni radio, cerrado o abierto. Abierto, el contenido empieza a 2 × `--unidad` del rótulo y cierra con 3 × de aire antes del filete siguiente, dentro de la medida de prosa, sin mover lo de encima.
- La Lista de Obras plegada: tres primeras en el orden de `ordenDeLaListaDeObras`, luego el desplegable con el resto bajo su `<summary>` y las mismas filas; con tres o menos, sin desplegable. «Y {n} citas sin obra documentada.» va al pie, tras el desplegable.
- Campo de búsqueda: contorno completo de `--grosor-filete` en `--contorno`, radio `--radio`, fondo `--papel`, relleno horizontal; al foco, contorno en `--siena` a 2 × `--grosor-filete`, sumado al anillo global. «Buscar en este tema» sigue bajo el título del Tema.

## Cross-Story Dependencies

- La 34.0 no depende de nada y **se funde sola en la principal antes que la Épica 30** (excepción con nombre a la fusión por épica, como la 23.12); su fila de `sprint-status.yaml` lo dice en un comentario. La usan la 30.3, 30.4, 31.2, 32.3, 32.4, 32.5, 33.2, 34.2 y 35.3.
- La 34.1 espera a la Épica 29 fundida (saltos de verso como U+000A y `enUnaLinea`); cambia el punto de corte que la 29 dejaba en las Citas en verso, y se dice.
- La 34.2 va detrás de la 34.0 y la reutiliza sin copiarla.
- La 34.3 no depende de nada; con la Épica 28 (campo de la portada), la que llegue después integra a la otra.
- `AGENTS.md` gana, con la 34.0, la convención de que todo lo plegado usa `Desplegable.astro`, y con la 34.2, el pliegue de la Lista de Obras.

# Epic 32 Context: La Obra como destino

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

La página 1 de una Obra dice qué es la obra, cómo empieza y dónde leerla sin echar las Citas de la primera pantalla. Bajo la Cabecera de Obra, una línea de Ficha técnica (género, año de publicación, lengua original) sale de revisiones fijas y versionadas de Wikidata que una persona ata a la Obra con una orden que coteja el autor. Debajo, plegados y antes del listado, «Dónde leer esta obra» (agrupado en «Gratis», «Electrónica», «Impresa», con «De esta edición se tomaron {k} de sus {n} citas.»), «Cómo empieza» (el incipit que una persona declara) y «Cómo citar» la Obra. Se retira el salto de la cabecera de la 24.7. Sirve a SM-C4: la continuación de la Página de Obra hacia sus Citas, leída con el Modelo apagado.

## Stories

- Story 32.1: Revisiones fijas de Wikidata, versionadas, y la orden que ata una entidad a su Obra
- Story 32.2: La línea de Ficha técnica bajo la cabecera de Obra
- Story 32.3: El incipit lo declara una persona, y la página lo enseña plegado
- Story 32.4: La página 1 de la Obra, reordenada: «Dónde leer esta obra» plegado y por formato, antes del listado
- Story 32.5: «Cómo citar» la Obra

## Requirements & Constraints

- **Actos de Héctor, nunca de un agente:** atar una entidad de Wikidata a una ficha, declarar un incipit, dar valor a `MAX_CARACTERES_DEL_INCIPIT` (400 propuesto), y dar jornada a `DESPLIEGUE_DE_LA_OBRA_COMO_DESTINO` y `DESPLIEGUE_DEL_INCIPIT`. Las historias construyen las órdenes, los esquemas y las constantes (en `undefined`); al cerrar, ninguna ficha declara `wikidata` ni `incipit`, `corpus/wikidata/` lleva solo `vigentes.yml` con cabecera y sin entradas, y lo que dependa de esos datos no se ve en `dist/`.
- **Pregunta 12** (si una antología de un compilador, p. ej. «Granos de oro» de Martí, es Obra del Autor) bloquea atar su entidad, no construir. La 13 (varias fechas de publicación → ninguna) no bloquea. Cómo se unen varios géneros o lenguas es `[ASSUMPTION]` revisable por Héctor con `bmad-ux`.
- **Ausencia antes que hueco:** sin entidad, sin campo con etiqueta en español, sin incipit o sin «Cómo citar», no hay línea, desplegable, rótulo, filete ni hueco; los demás suben. Las páginas 2+ de Obra no cambian (solo Cabecera y listado).
- **Nada se recorta:** la línea de Ficha técnica reparte renglones; el incipit corta solo en fin de frase o de verso; a 320 px, sin desplazamiento horizontal.
- **Primera pantalla:** a 360 × 640, en la Obra de título más largo (hoy de Larra, primera Cita a 514 px), la primera Cita del listado sigue empezando en la primera pantalla con la línea y los desplegables cerrados; la medida va en el spec.
- **Búsqueda y datos estructurados:** línea de Ficha técnica, incipit, «Dónde leer» y «Cómo citar» van bajo `data-pagefind-ignore="all"` y fuera del JSON-LD (lección de la 26.2: «novela» no puede casar con toda Obra).
- **Modelos:** todo lo de la épica sale idéntico byte a byte con la afiliación encendida o apagada; solo cambia lo de dentro de `data-ingreso`.
- **Medición:** ninguna zona nueva; lo de esta épica que enlaza fuera no lleva zona. El evento `copiado-de-referencia` (30.5) no se emite hasta que `PENDIENTES` lo suelte; `src/lib/vocabulario.ts` no cambia.
- **Cortes de serie:** toman la jornada del primer día en que la página cambia en vivo, nunca la del merge; entran en `CORTES_DE_SERIE_DECLARADOS` sin fecha literal y ninguna prueba fija su valor.

## Technical Decisions

- **Wikidata (AD-31):** un documento por (entidad, revisión) en `corpus/wikidata/{Q}--r{N}.json`, CC0 declarada; lo descarga solo la cáscara de `tools/recuperar.ts` por `oldid` (la Fuente declara entidad y revisión por su API, como las biografías); `tools/lib/` es puro. `vigentes.yml` (`{Q: revisión}`) tiene un solo escritor que solo añade; cambiar una vigente es otra orden explícita que dice cuántas Obras fecha. La extracción pura da `{generos[], lenguas[], año?}`: ignora `deprecated`, con `preferred` cuentan solo esas, género P136, lengua P407 (nunca P364), etiqueta en español de la revisión vigente o fuera, año de P577 solo si queda un único valor con precisión ≥ 9. La ficha lleva `wikidata: {entidad, revision}` escrito solo por su orden, que coteja P50 con el `nombre` del Autor con `esElMismoAutor` de `tools/lib/documento.ts`; el build repite esas comprobaciones desde un cargador de `src/content.config.ts`, segunda excepción nombrada a que `src/` no importe de `tools/lib/`. El cotejo no lee `corpus/wikidata/`. El traductor nunca sale de la entidad.
- **Incipit (AD-30):** el texto de `corpus/fuentes/` se publica solo como pasaje e incipit, y lo entrega solo el cargador de posiciones. La ficha lleva `incipit: {documento, desde}`, escrito por una orden que comprueba el casado con `documentosDeCita`, que la forma de líneas no sea `indeterminada` y que `desde` se localice; el build rompe si deja de localizarse. Nunca se infiere del orden del libro. Corte por una sola función (`incipitDe`, vecina de `pasajeDeAparicion` en `tools/lib/pasaje.ts`) y un solo punto que decide si hay incipit (`ofreceIncipit`), que ampliará la 35.9.
- **Ficha de Obra (AD-25):** campos nuevos opcionales en `esquemaDeObra` de `src/lib/admision.ts`, omitidos sin valor; `titular`, `separar`, `retirar`, el ajuste de título de `documentar` y `restituir-grafia` los conservan; `reunir` conserva los de la destino, no hereda los de la absorbida y lo dice.
- **Fechas y avisos (AD-27):** la Página de Obra compone su documento de Wikidata y, por `vigentes.yml`, los de las entidades que pinta; `corpus/wikidata/` es familia de fichero en `FAMILIAS_DE_FICHERO`; `wikidata` e `incipit` entran en `CAMPOS_QUE_PINTA` de la Página de Obra; con «Cómo citar», también el nombre del Autor tal como lo pinta la Referencia (`nombre`, `ordenAlfabetico`, `ordenRevisado`). Cada cambio lo fija `tests/unit/fecha-de-cambio.test.ts`.
- **Composición de texto (AD-28):** `src/lib/atribucion.ts` es el dueño de la Referencia; `referenciaDeObra` es hermana de `referenciaDeCita` (30.3) y usa su `nombreEnReferencia` (invertido solo con clave revisada). La Referencia de Obra lleva Autor, título de la ficha, año de la Obra (FR-42), la edición cotejada que encabeza «Dónde leer» y su traductor solo por `traductorDeLaEdicionQueEncabeza` de `src/lib/obras.ts` (lo crea la 32.2 y la 32.5 lo consume). Nunca completa nada desde la Ficha técnica ni desde otra Cita. La fecha de consulta la pone una isla de copiar nueva de la Página de Obra sobre `MARCADOR_DE_FECHA_DE_CONSULTA`, con el formato de `fechaDeConsulta`; la isla entra en `GUIONES_EXTERNOS` con su tope medido.
- **Puntos con nombre para la Épica 35:** `ofreceIncipit` (32.3), `dondeLeer` (32.4) y `obraTieneComoCitar` (32.5); hoy no excluyen nada.
- **Umbrales (AD-9):** `MAX_CARACTERES_DEL_INCIPIT`, `DESPLIEGUE_DEL_INCIPIT` y `DESPLIEGUE_DE_LA_OBRA_COMO_DESTINO` son `… | undefined` en `src/lib/umbrales.ts`. La 32.4 añade el juicio de SM-C4 a `JUICIOS_POR_VENTANAS` de `tools/lib/lineaBase.ts` (salidas internas desde la zona `listado` entre lecturas de la Página de Obra, con la regla de ventanas de SM-C3/SM-C5, sin comparar a través de ninguno de los dos cortes).

## UX & Interaction Patterns

- **Orden de la página 1 (UX-DR124):** Cabecera de Obra (sin salto); línea de Ficha técnica; desplegables cerrados «Dónde leer esta obra», «Cómo empieza», «Cómo citar»; Listado de Obra y Paginación; «Buscar en esta obra»; «Compartir en» (sin la Historia; lo pinta la 25.6, sin hueco reservado); Temas; Nota. Distancias: línea a `{spacing.unit}` de «de {Autor} · {año}»; filete del primer desplegable a 3 ×; el listado a 4 × bajo el último, con su filete; la Nota tras los Temas, 4 × arriba y 3 × abajo. Tabulación en ese mismo orden.
- **Desplegables:** `src/components/Desplegable.astro` de la 34.0 (en la principal); se abren sin guion; los `<summary>` en tinta apagada, sin siena.
- **Ficha técnica (UX-DR126):** `{typography.caption}`, Inter, `{colors.on-surface-variant}`; «Novela · 1605 · Escrita en español», orden fijo, género con mayúscula inicial, puntos medios ocultos al lector (oye coma); «· Traducción de {traductor}» si procede; al final «Datos: Wikidata, CC0», enlace en siena a la revisión, misma pestaña.
- **Dónde leer (UX-DR125, UX-DR127):** se retira el salto «Dónde leer esta obra ↓» con su ancla y foco; el `h2` pasa a `<summary>`. Grupos «Gratis», «Electrónica», «Impresa» (esta épica pinta «Gratis»; los grupos de venta son de la 33.2, y hasta entonces el bloque de `EdicionesEnVenta.astro` va tal cual tras «Gratis»). Rótulo de grupo en `{typography.caption}` con el peso de `{typography.author}` y `{colors.on-surface}`. Cada línea de «Gratis» va seguida de la frase de lo tomado (`textoDeLoTomado`): «De esta edición se tomaron {k} de sus {n} citas.» / «…se tomaron sus {n} citas.» / «…se tomó su cita.». «Consíguelo» y «Cómprala» no aparecen en ningún sitio.
- **Cómo empieza (UX-DR128):** incipit en Inter `{typography.body-md}` `{colors.on-surface}` (nunca serif), con los saltos del verso; la Fuente debajo a 2 × en caption, con su licencia y el enlace en siena.
- **Cómo citar (UX-DR119, UX-DR129):** reutiliza `ComoCitar.astro` de la 30.3 tal cual; APA, MLA, Chicago apilados con «Copiar APA/MLA/Chicago»; «Copiado.» por la región `role="status"` dentro del `<details>` con `anunciar`; sin JS, «Sin fecha de consulta: añade la de hoy.» y sin botones.

## Cross-Story Dependencies

- Orden dentro de la épica: 32.1 → 32.2 (lee lo que versiona la 32.1) → 32.3 → 32.4 y 32.5 (encajan sus desplegables alrededor de «Cómo empieza»; cada historia deja la página en el orden de UX-DR124 con lo que ya existe, y la 32.4 la deja completa).
- Fuera de la épica: la 32.3 necesita `formaDeLasLineas` y `tramoEnCrudo` (29.1, Épica 29) y el cargador de posiciones con texto más `tools/lib/pasaje.ts` (31.1, Épica 31); la 32.5 necesita `referenciaDeCita`, `nombreEnReferencia`, `fechaDeConsulta`, `MARCADOR_DE_FECHA_DE_CONSULTA` y `ComoCitar.astro` (30.3) y el evento `copiado-de-referencia` (30.5, Épica 30). La 34.0 (`Desplegable.astro`) ya está en la principal. No espera a las Épicas 25 y 28 de la v8.
- Épica 33: la tienda sin marca, la puerta del encendido, la congelación que oculta ediciones y el reparto en «Electrónica»/«Impresa» son suyos. Épica 35: las exclusiones de la Obra con derechos vigentes y la de Personaje, en los tres puntos con nombre.
- Unidad de fusión, la épica; antes del merge, Héctor corre `npm run test:e2e` entero en local.

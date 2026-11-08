# Epic 29 Context: La Cita se lee como se escribió

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Una Cita en verso se lee en sus versos, cada uno en su renglón y con la mayúscula donde la puso el poeta, en toda superficie (Página de Cita, Cita del Día, Tarjeta de Cita de los listados, Kit y lote) y en todo lo que sale del sitio (lo copiado y compartido, la Imagen, la Tarjeta Social, la Pieza de Canal), sin cambiar la URL, el veredicto del cotejo ni lo que encuentra la búsqueda. Los saltos no se teclean: salen del documento versionado de la Cita, y solo de uno que sea de verso, por una orden que lanza Héctor sobre lo publicado. Además, al curar se señalan las Citas de una misma Obra que casi coinciden, se repiten o son fragmento de otra, para que decida una persona. Va primera en la v9 porque el Fragmento, la Referencia, el pasaje y el incipit de las épicas siguientes llevan el verso.

## Stories

- Story 29.1: El salto de verso sobrevive en el Corpus, el cotejo y el slug
- Story 29.2: Una orden restituye los saltos de las Citas publicadas desde su documento
- Story 29.3: El verso en toda superficie y todo lo que sale
- Story 29.4: Los casi duplicados dentro de una Obra y entre clases se señalan al curar

## Requirements & Constraints

- El texto de una Cita nunca se altera: restituir, escribir o pintar el verso no cambia una letra ni un signo; lo escrito colapsa exactamente a lo que había (NFR-12). Nada se recorta, encoge ni abrevia para que quepa: ausencia antes que mutilación.
- La URL, el slug y la huella no cambian con los saltos (NFR-4); la búsqueda sigue encontrando la Cita, también por la primera palabra de un verso.
- Lo copiado es texto plano con un salto entre verso y verso y la atribución detrás del último; la Tarjeta Social de una Cita que admite Imagen lleva su texto (FR-19); la Pieza cuenta los versos al apilar y, si deja de caber, lo dice como hoy (FR-30).
- La prueba de cabida de la Imagen corre con los saltos restituidos y con las Citas en verso más largas de cada tramo; si una Cita de hasta `MAX_CARACTERES_IMAGEN` deja de caber, el reparto de la tabla de tramos lo cambia Héctor, nunca un agente.
- Casi duplicados: la herramienta es un parte, no una puerta; el sistema no retira, fusiona ni corrige nada. Retirar, conservar o restituir el literal lo decide una persona.
- Actos reservados a Héctor: decidir la Tarjeta Social de una Cita en verso que no quepa en 630 px (con las cifras de la 29.1); correr la restitución sin `--seco` sobre el Corpus real (commit propio de `corpus/`, antes del merge y tras cada puesta al día con la principal); `npm run test:e2e` entero y el merge. Ningún agente restituye el Corpus real para poner el build en verde.
- La épica no toca `src/lib/vocabulario.ts`, `src/lib/superficies.ts`, el vocabulario de zonas ni añade guiones: no mueve la huella. `public/islas/imagen.js` cambia dentro de su entrada de `GUIONES_EXTERNOS` y su tope.

## Technical Decisions

- **El salto se guarda como un único U+000A en `texto`**, y solo así: el esquema rechaza `\r`, dos saltos seguidos, salto al principio o al final, espacio o tabulador pegado a un salto, `<br` y « / ». Se escribe dentro de la cadena entre comillas dobles de `aYaml`.
- **La forma de las líneas de un documento tiene un dueño**: `formaDeLasLineas` de `tools/lib/lineas.ts`, con el conjunto cerrado `FORMAS_DE_LINEAS` (`verso`, `verso-espaciado`, `prosa-por-lineas`, `prosa-ajustada`, `indeterminada`). Conservadora: ante la duda, `indeterminada`; nunca `verso` un documento ajustado a ancho fijo (casi todos los de Gutenberg lo están, a ~72 columnas; unos 143 de Wikisource ponen línea en blanco entre versos). Juzga solo el cuerpo, sin red. Los documentos recuperados desde la v9 declaran `lineas:` en su cabecera y esa declaración manda; los versionados no se reescriben.
- **Las posiciones en crudo tienen un dueño**: `tramoEnCrudo` de `tools/lib/cotejo.ts`, junto a `colapsarEspacios`, traduce un tramo colapsado a desplazamientos UTF-16 en el crudo.
- **Un solo escritor del campo `texto`**: `textoConSaltos` de `tools/lib/lineas.ts`, para `extraer`, el alta, `sembrar`, `documentar` (también `--texto`), `revisar --aprobar` y la restitución. Saltos solo desde un documento `verso` o `verso-espaciado`; cada racha de espacio con salto queda en un `\n`, también al cruzar estrofa. Un salto tecleado no sobrevive.
- **El salto tiene puerta en el build** (cotejo): rompe si una Cita con saltos no se localiza en un documento de verso suyo, si un `\n` no cae sobre un salto de ese documento, o si una Cita sin documento lleva saltos. Desde la 29.2, rompe también ante una Cita de documento de verso sin los saltos que le compondría `textoConSaltos`, dando la orden exacta de restitución; el conflicto entre dos documentos de verso solo avisa.
- **Ningún otro módulo interpreta un salto de un documento**: una prueba lo fija y la amplían las historias que añadan lectores (31.1, 32.3).
- **Cotejo, forma canónica y slug no cambian**: `colapsarEspacios` y `normalizar` ya pliegan el salto; `tramoDe` cuenta un `\n` como un carácter.
- **Dos dueños del verso en las salidas** (`src/lib/verso.ts`): `versosDe` para el HTML, que pinta un solo componente, `TextoDeCita.astro` (lo usan Bloque de Cita, Tarjeta de Cita y Material para publicar), con un espacio entre versos en el texto que lee Pagefind; y `enUnaLinea`, con « / », para lo que no admite saltos (meta descripción, título de pestaña, `text` del JSON-LD, `description` del RSS, y luego la Referencia). Los recortes de hoy (110 y 120) se miden sobre el texto, cada salto un carácter, y no dejan salto ni « / » colgando; el recorte por palabra es de la 34.1.
- **Los dos repartos de los lienzos** (`repartirEnLineas` de `src/lib/lienzo.ts` y el de `public/islas/imagen.js`, que no importa de `src/`) abren línea en cada salto y reparten por palabras dentro de cada verso, cada uno con su medida; nunca unen dos versos en una línea.
- **Una sola medida de parecido**: `parecidoEntre` en `tools/lib/parecido.ts` (repetidos, casi iguales con `MIN_PARECIDO_PARA_CORREGIR` 0,85, contenido con `MIN_CARACTERES_PARA_CONTENCION`), adonde se mueven `parecidoDeTextos` (de `tools/lib/documentacion.ts`) y `contenidaEn` (de `tools/alta.ts`); ningún otro módulo calcula parecido. La comparación no lee ninguna clase de Cita, para que el cruce con la Cita atribuida de la Épica 35 salga por construcción.

## UX & Interaction Patterns

- Un verso por línea en la Página de Cita, la Tarjeta de Cita de los listados (crece en alto; nunca « / »), la Cita del Día y las imágenes; las comillas angulares abren el primer verso y cierran el último.
- El verso hereda el token `quote-*` de su tramo y la serif; sin valores literales de color ni tipografía.
- A 360 × 640 la Cita en verso sigue siendo lo primero visible sin desplazar, cada verso empieza renglón y nada desplaza en horizontal a 320 px.
- El nombre accesible de la Tarjeta de Cita sigue siendo su texto visible en orden.

## Cross-Story Dependencies

- La 29.1 va primera: pone `formaDeLasLineas`, `tramoEnCrudo`, `textoConSaltos` y la puerta del salto. Entrega las cifras para la decisión de Héctor sobre la Tarjeta Social del verso (cuántas Citas ganarían saltos, cuántas admiten Imagen, el alto de cada Tarjeta y cuáles pasan de 630 px); ninguna otra historia empieza hasta que esa decisión está anotada en su spec, salvo que no haya ninguna Cita que pase, y entonces queda sin objeto.
- La 29.2 construye sobre la 29.1. La 29.3 necesita la 29.1 para construirse y la restitución real de Héctor (29.2) para su puerta de merge. La 29.4 no depende de ninguna.
- Fuera de la épica: la 25.2 pondrá el pie del dominio sobre la misma prueba de cabida y el mismo `imagen.js`; la portada de la 28 (en `v8/epica-28`, sin fusionar) pintará la Cita del Día con `TextoDeCita.astro`: la que se fusione después integra a la otra. `versosDe`, `enUnaLinea`, `formaDeLasLineas` y `tramoEnCrudo` los consumirán las Épicas 30, 31 y 32 sin reescribirlos.

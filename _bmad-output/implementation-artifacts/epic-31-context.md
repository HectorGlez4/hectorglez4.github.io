# Epic 31 Context: Lee el pasaje

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Desde la Página de Cita, plegado tras la Tarjeta de Obra, quien llega a una Cita lee el párrafo —o la estrofa— de la edición cotejada del que sale, literal y tal como lo trae el documento, con las palabras de la Cita marcadas dentro y su Fuente, su licencia y el enlace a esa edición debajo. Lo sitúan el mismo documento y el mismo localizador que dan a la Cita su lugar en el orden del libro, así que no hay un segundo cotejo. Sin pasaje no hay bloque, ni rótulo, ni hueco, y el pasaje nunca se recorta. No entra en la búsqueda interna ni en los datos estructurados, y su peso se mide contra el techo de `dist/` antes de publicarlo.

## Stories

- Story 31.1: El pasaje se localiza con el localizador del orden del libro, y tiene su tope
- Story 31.2: «Lee el pasaje», plegado en la Página de Cita

## Requirements & Constraints

- El texto de `corpus/fuentes/` se publica solo como pasaje (y, en la Épica 32, como incipit), y lo entrega solo el cargador de posiciones; nada se guarda en `corpus/` ni se pide a la red.
- Por aparición, el cargador da además de `{documento, posicion}` un `pasaje: {texto, inicio, fin}`: el trozo literal del documento crudo y el tramo de la Cita sobre él en desplazamientos UTF-16. El campo se omite cuando no hay pasaje, nunca vacío ni `null`.
- Sin pasaje cuando: no hay documento, no se localiza, la forma del documento es `verso-espaciado` o `indeterminada`, el trozo no dice más que la Cita (forma canónica de `normalizar`: un párrafo que solo añade el punto final no cuenta), o pasa de `MAX_CARACTERES_DEL_PASAJE` contado en puntos de código. Nunca se recorta, resume, corrige ni completa.
- `MAX_CARACTERES_DEL_PASAJE: number | undefined` en `src/lib/umbrales.ts`, **en `undefined`**: con él así no se ofrece ningún pasaje (la puerta nace cerrada). Su valor lo da Héctor en un diff visible (1.200 propuesto); ningún agente se lo da y ninguna prueba fija su valor: las pruebas lo pasan por parámetro o en una copia temporal.
- La 31.1 deja en el spec, sobre el Corpus real, cuántas Citas tendrían pasaje con 800, 1.200 y 2.000 y cuántas se quedan sin él por cada motivo; el tiempo de `npm run build` y el peso del almacén de datos de Astro antes y después; y que `dist/` no cambia (construidos en la misma jornada).
- La 31.2 anota los bytes que añade a `dist/` y a la Página de Cita (mediana y máximo) con el tope en 1.200 en una copia temporal; si el total pasa `AVISO_DE_PESO_DE_DIST`, no se fusiona y decide Héctor (el techo no se sube). NFR-7 con Lighthouse a mano, contra el receptor local, con medias de corridas alternas; si empeora, el merge espera a Héctor.
- Fuera de Pagefind (`data-pagefind-ignore="all"`), del JSON-LD, de lo copiado, la Imagen, el Fragmento y la Tarjeta Social; una prueba de `dist/` lo fija. Sin guion (`GUIONES_EXTERNOS` no cambia), sin enlaces internos (sin zona ni exención nueva, sin fila nueva en `COLOCACION`), idéntico con cualquier Modelo encendido o apagado. Se abre y cierra sin JavaScript. Reflujo a 320 px sin desplazamiento horizontal.
- Corte de serie: `DESPLIEGUE_DEL_PASAJE` (nombre supuesto), `string | undefined` y en `undefined`, en `CORTES_DE_SERIE_DECLARADOS` sin fecha literal, partiendo la continuación de la Página de Cita y el juicio de SM-C5 como el corte de la 30.1. Su jornada es la del primer despliegue con el tope con valor, no la del merge; la pone Héctor. `juiciosPorVentanas` no compara ventanas de SM-C5 a través de ella, y sin valor el informe de `npm run medicion` dice que la llegada no ha ocurrido y la marca el tope.

## Technical Decisions

- Un solo localizador: `localizar` de `tools/lib/cotejo.ts` sobre el mismo conjunto de `documentosDeCita` que el cotejo; el tramo colapsado se lleva al crudo con `tramoEnCrudo` (junto a `colapsarEspacios`), y la forma del documento la da `formaDeLasLineas` (la cabecera `lineas:` manda). Las dos son de la 29.1 y esta épica las consume sin escribir otras; ningún otro módulo interpreta un salto de un documento.
- El trozo lo da una sola función, `pasajeDeAparicion` de `tools/lib/pasaje.ts` (nombre supuesto): en `verso` la estrofa (líneas entre dos en blanco); en `prosa-ajustada` el bloque entre líneas en blanco con sus saltos interiores tal cual; en `prosa-por-lineas` la línea. Una Cita que cruza bloques toma los contiguos que la contienen, enteros, contados juntos contra el tope.
- Decidir si hay pasaje es un punto con nombre, `ofrecePasaje` (nombre supuesto), que la 35.4 ampliará para excluir la Cita atribuida y la Obra con derechos vigentes.
- La aparición que cuenta la elige una sola función de `src/lib/obras.ts`, `aparicionQueCuenta` (nombre supuesto), la misma que ordena en `ordenDelLibro`; si esa aparición no tiene pasaje, la Cita no lo tiene (no se busca en otra). `src/lib/publicado.ts` cuelga de cada Cita su pasaje elegido, lo único que leen las páginas; una Cita sin Obra toma la primera aparición de sus documentos con la misma regla. Dos Citas del mismo párrafo dan el mismo `texto` con su propio `inicio`/`fin`.
- La línea de la Fuente con su licencia y el enlace a la edición la compone `src/lib/atribucion.ts`, que cuenta el pasaje entre las superficies que portan la atribución.
- Relación de superficies (`tools/lib/cambios.ts`): la Página de Cita compone los documentos de su Obra (unión de `documentosDeCita` de sus Citas) y las `formas` de su ficha, que pasa a `CAMPOS_QUE_PINTA`; una Cita sin Obra, solo sus documentos. Recuperar una página nueva de una Obra fecha y avisa sus Páginas de Cita a sabiendas; una Cita nueva sigue sin fechar las demás.
- `AGENTS.md` se pone al día al cerrar la 31.2 (pasaje desde `corpus/fuentes/`, dueño único el cargador, composición de documentos, tope y jornada del corte de Héctor).

## UX & Interaction Patterns

- «Lee el pasaje» es el primero de los desplegables de la Página de Cita, con `src/components/Desplegable.astro` (34.0): `<details>` nativo cerrado al cargar, «Lee el pasaje» como único texto del `<summary>`; tras la Tarjeta de Obra y antes de «Cómo citar»; su filete a 4 × `{spacing.unit}` de la Tarjeta de Obra o, sin Obra, de «Compartir en». Nada se intercala entre la Atribución, la Línea de la Fuente y Copiar; Copiar no se mueve en la primera pantalla de 360 × 640.
- Dentro: el pasaje en `body-md`, Inter y `on-surface-variant`; las palabras de la Cita en un `<mark>` sin fondo, Source Serif al mismo cuerpo y `on-surface`, sin peso 600. En verso, un verso por línea; en `prosa-ajustada`, los saltos interiores como espacio; dos bloques contiguos, dos párrafos.
- A 2 × `{spacing.unit}`, la Fuente con su licencia y el enlace a la edición cotejada en `caption` y `on-surface-variant`, el enlace en siena, enlace de salida en la misma pestaña, exento de la zona de toque por ir a mitad de frase.
- Todo con tokens de `tokens.css`, también peso e interlineado; `tipografia-en-tokens.test.ts` sin excepción nueva. Tabulación: el `<summary>` tras la Tarjeta de Obra y, abierto, el enlace a la edición.

## Cross-Story Dependencies

- La 31.1 va primero (datos, sin cambio en `dist/`); la 31.2 los pinta.
- Épica 29 (29.1: `formaDeLasLineas` en `tools/lib/lineas.ts`, `tramoEnCrudo` en `tools/lib/cotejo.ts`, los saltos de verso) tiene que preceder: no está en la principal.
- Épica 30: la 30.1 deja el orden de la Página de Cita con las acciones antes de la Tarjeta de Obra y su corte de serie; la 30.3 deja el bloque de desplegables donde la 31.2 inserta el pasaje. Le basta la 30 en la principal; no espera a las Épicas 25 y 28.
- La 34.0 (`Desplegable.astro`) ya está en la principal.
- Después: la 35.4 amplía `ofrecePasaje`; la Épica 32 reutiliza el cargador para el incipit.
- Actos de Héctor: el valor de `MAX_CARACTERES_DEL_PASAJE`, la jornada de `DESPLIEGUE_DEL_PASAJE`, `npm run test:e2e` y el merge.

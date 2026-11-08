# Epic 30 Context: Citar y llevarse la Cita

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Quien llega a una Página de Cita se la lleva sin desplazarse: Copiar, Imagen y el bloque de compartir suben tras la Atribución y su Línea de la Fuente, antes de la Tarjeta de Obra. Debajo de la Tarjeta, plegados, «Cómo citar» (APA, MLA y Chicago de notas y bibliografía, cada una con su copiar y la fecha de consulta del visitante) e «Inserta esta cita» (un Fragmento de HTML estático con la Cita, su Autor, su Obra y el enlace de vuelta, que no pide nada al sitio). En escritorio la Cita usa su medida de 34ch en su propio cuerpo y Copiar e Imagen van en fila desde 600 px. Copiar una Referencia y copiar el Fragmento son dos acciones nuevas del vocabulario, retenidas hasta que Héctor despliega el receptor. La épica es una sola llegada en vivo, para que SM-4, SM-5 y SM-C5 la distingan de la Épica 31.

## Stories

- Story 30.1: Copiar antes de la Tarjeta de Obra en la Página de Cita
- Story 30.2: La Cita a su medida y las acciones en fila desde 600 px
- Story 30.3: «Cómo citar» en la Página de Cita
- Story 30.4: «Inserta esta cita»
- Story 30.5: Copiar una Referencia y copiar el fragmento entran en el vocabulario

## Requirements & Constraints

- Orden del `<article>` de la Página de Cita: Bloque de Cita con Atribución; Línea de la Fuente; acciones (Copiar, Imagen); bloque de compartir que haya en la principal; Tarjeta de Obra; bloque de desplegables («Cómo citar», «Inserta esta cita»; el sitio del pasaje de la Épica 31 va delante, sin hueco); Rutas de salida; `FiltrosDeLaCita` último. Nada se intercala entre la Atribución/Fuente y Copiar. El orden de tabulación es el del marcado.
- La portada no se reordena (la Cita del Día nace en el orden nuevo con la 28.2) y el 404 no cambia. No se esperan las Épicas 25 ni 28: la que se fusione después integra a la otra.
- La Referencia y el Fragmento salen solo de la Obra resuelta y de los campos de Fuente de esa Cita; lo que no consta se omite, nunca se infiere de otra Cita, de la Ficha técnica ni del conocimiento general. Nada lee `procedencia.obra`. Sin Obra, sin título de Obra.
- Chicago es la entrada de bibliografía «Apellido, Nombre. *Título*. Año.»; las formas literales de los tres estilos y del Fragmento son supuestos fijados con tablas de ejemplos en Vitest que Héctor revisa en el spec.
- El texto de la Cita, donde entre, va entero y literal (ausencia antes que mutilación).
- La fecha de consulta es del cliente; el build lleva un marcador vacío y la línea «Sin fecha de consulta: añade la de hoy.». Ninguna página de `dist/` lleva la jornada del build en «Cómo citar».
- Sin JavaScript: los desplegables abren y cierran, el texto se selecciona, los botones de copiar (marcados `hidden`) no se ven.
- El Fragmento: un solo `blockquote`, todo escapado, sin `script`, `img`, `iframe`, `link`, `style`, `class` ni atributo `style`; enlace a la canónica sin `?de=` ni `?via=`; existe para Citas de cualquier longitud; sin vista previa; su enlace es texto del campo, no un `<a>` de la página.
- Medición: dos eventos nuevos sin campos, fuera de `METRICA_DE_ACCION`, retenidos en `PENDIENTES`; se informan aparte y fuera de SM-5, SM-7 y SM-C3. Un corte de serie nuevo parte solo lo que leen SM-4 y SM-C5.
- Peso: se anota lo que añade cada historia; si salta el aviso de peso de `dist/`, se para y decide Héctor (sus umbrales no se tocan). El tope de guion sí sube en el mismo diff con la cifra medida.
- WCAG 2.2 AA, reflujo a 320 px sin desplazamiento horizontal, texto al 200 % sin solapes.

## Technical Decisions

- `src/lib/atribucion.ts` es el único dueño de lo copiado, la Referencia (`referenciaDeCita`), el Fragmento (`fragmentoParaInsertar`), el nombre invertido (`nombreEnReferencia`), `citaTieneComoCitar`, `fechaDeConsulta` y `MARCADOR_DE_FECHA_DE_CONSULTA` (nombres supuestos). `fechaDeConsulta` es autocontenida porque viaja a la isla por su texto, como `anunciar` por `guionQueAnuncia`.
- Inversión del nombre solo con `ordenRevisado` y una clave que es palabra del `nombre`: apellidos desde esa palabra; iniciales de APA solo de palabras con mayúscula inicial (supuesto). Sin clave revisada, el `nombre` tal cual.
- AD-27: como la Página de Cita pinta ese nombre derivado, `CAMPOS_QUE_PINTA` (Autor → Página de Cita) cuenta `nombre`, `ordenAlfabetico` y `ordenRevisado` en esa derivación: revisar una clave fecha y avisa sus Páginas de Cita; `proponer-claves` sobre claves sin revisar sigue moviendo solo los Directorios.
- Verso (AD-29): el Fragmento lleva los saltos como `<br>` por `versosDe`, y la Referencia, si lleva el texto, la forma en una línea con « / » por `enUnaLinea`, las dos de `src/lib/verso.ts` (Épica 29); ninguna historia de esta escribe su propia versión.
- Desplegables con `src/components/Desplegable.astro` (Historia 34.0), sin copiarla ni cambiarla; «Cómo citar» lo pinta `ComoCitar.astro`, que recibe las Referencias ya compuestas y no sabe si son de Cita o de Obra (la 32.5 lo reutiliza). Los desplegables van en un solo bloque de `src/pages/cita/[slug].astro` (palanca de SM-C5 en un diff de un sitio), bajo `data-pagefind-ignore="all"` y fuera del JSON-LD.
- Una sola isla de copiar por página, generalizada desde `src/islands/CopiarCita.astro`, idéntica byte a byte en toda Página de Cita y sin datos de contenido (todo en `data-*` y en el marcado); anuncia con `anunciar` de `src/lib/anuncio.ts` por la región `role="status"` de su bloque, dentro del `<details>`; `__medir(…)` a secas, fuera del `try` del portapapeles, con el nombre del evento como constante del vocabulario. Copiar la cita copia lo mismo que antes.
- Constante de despliegue nueva en `src/lib/umbrales.ts` (`DESPLIEGUE_DE_CITAR_Y_LLEVARSE`, supuesto), `string | undefined` y en `undefined`: la jornada la pone Héctor. Entra en `CORTES_DE_SERIE_DECLARADOS` sin fecha literal; si `SerieDeMedicion` no expresa el alcance, se amplía en lo mínimo. `juiciosPorVentanas` no compara ventanas a través del corte. Ninguna prueba fija el valor.
- Tokens nuevos `--mono` (pila monoespaciada del sistema, sin fichero de fuente), `--codigo` (13 px) e `--interlineado-codigo` (1,5), solo para el campo del Fragmento.
- Vocabulario: `copiado-de-referencia` y `copiado-de-fragmento` (supuestos) en `EVENTOS`, sin campos ni migración, fuera de `EVENTOS_DEL_GUION` mientras estén en `PENDIENTES`. Mover el vocabulario pone `tests/unit/huella.test.ts` en rojo hasta que Héctor despliegue; soltarlos es un commit aparte, después.

## UX & Interaction Patterns

- Distancias: Copiar a 4 × `{spacing.unit}` de lo de arriba; Imagen a 2 × bajo Copiar por debajo de 600 px; desde 600 px, Copiar e Imagen en una fila, cada uno a su ancho, a 2 × (supuesto); «Compartir en» a 3 × bajo ellos, en su bloque propio; el campo de copia manual bajo la fila; sin Imagen, Copiar solo y sin hueco. La fila es un contenedor compartido sin `data-zona`, reutilizable por la 28.2.
- La Cita limitada a `--medida-cita` (34ch) con el `ch` resuelto en el cuerpo de su tramo (unos 610 px en `xl` a 1280 px), dentro de los 720 px de la columna; Atribución y Línea de la Fuente en la medida de prosa; en móvil no cambia nada.
- «Cómo citar»: estilos apilados APA, MLA, Chicago, sin pestañas; rótulo en caption con el peso de autor; Referencia en `body-md` e Inter (nunca serif); botón secundario «Copiar APA/MLA/Chicago» en siena; 3 × entre estilos; primer filete a 4 × de lo de arriba (supuesto). Al copiar, «Copiado.» dos segundos; si falla, nada de error técnico.
- «Inserta esta cita»: `<label>` visible «Pega este fragmento en tu página: lleva la cita, su autor y el enlace a esta página.», campo de solo lectura en `typography.code` sobre `surface-container-low` con contorno `outline` y radio por omisión, en la medida de prosa; botón «Copiar el fragmento».
- Zonas: el orden cambia, las zonas no; ninguna zona ni exención nueva.

## Cross-Story Dependencies

- Principal: la 34.0 (`Desplegable.astro`) ya está fundida. La Épica 29 (`src/lib/verso.ts`) es requisito de la épica según la planificación y no está en la principal: afecta al Fragmento (30.4), a la Referencia si lleva el texto (30.3) y a la medida de Copiar con la Cita en verso más larga (30.1).
- Dentro de la épica: la 30.1 va primero; la 30.2 es independiente; la 30.4 usa la isla generalizada de la 30.3; la 30.5 va la última y enseña a las dos islas a pedir sus eventos.
- La Épica 31 inserta el pasaje delante de «Cómo citar»; la 32.5 reutiliza `ComoCitar.astro` y añade `referenciaDeObra`; la 35.4 añade la exclusión de la Cita atribuida en `citaTieneComoCitar` y el Personaje en `fragmentoParaInsertar`.
- Actos de Héctor: la jornada de la constante del corte, desplegar el receptor desde la rama y commitear la huella, `npm run test:e2e` entero y el merge.

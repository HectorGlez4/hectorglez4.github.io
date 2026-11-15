# Epic 28 Context: La portada de retorno

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

La portada deja de ser la lista entera de Autores (~5.900 px) y pasa a servir a quien vuelve: arriba, una línea con las cifras del Corpus (Citas, Autores, cotejadas) y un campo para buscar; debajo, la Cita del Día con su Tarjeta de Obra y las mismas acciones que su Página de Cita (copiar, Imagen, «Compartir en»), que actúan siempre sobre la canónica de esa Página; después seis Obras de seis Autores que rotan con la jornada, todos los Temas, las Colecciones con su criterio y los ocho Autores destacados, cada bloque con su cierre hacia el Directorio. Es la última épica de la v8 y permite a Héctor leer por zona por dónde sigue quien vuelve (SM-4 de la portada).

## Stories

- Story 28.1: La portada abre con las cifras del Corpus y un campo para buscar
- Story 28.2: La cita de hoy lleva su obra y las acciones de su página
- Story 28.3: Seis Obras que cambian con la jornada
- Story 28.4: Todos los Temas, las Colecciones con su criterio y ocho Autores
- Story 28.5: La portada nueva llega en vivo tras el juicio de SM-11 (operativa)

## Requirements & Constraints

- **Orden fijo de la portada:** Cabecera → línea de cifras → campo → «La cita de hoy» → «Obras» → «Temas» → «Colecciones» → «Autores» → (solo encendida) Invitación de donación. Rótulos `h2` literales. La marca de la Cabecera es el único `h1` (con `aria-current="page"`, en la cabecera, no en `main`); desaparece `.marca-portada` de `src/pages/index.astro`. «Saltar al contenido.» lleva a la línea de cifras.
- **Línea de cifras:** con censo de `corpus/pendientes-de-cotejo.yml` no vacío, literal «{n} citas de {m} autores; {k} cotejadas con el texto de su fuente.» (punto de millar; k por `esCitaDocumentada`; m de `autoresPublicados`). Nunca «cada una» mientras quede censo (prueba sobre el texto de la línea). Con censo vacío: «… , cada una cotejada con el texto de su fuente.», «de 1 autor», «1 cita de 1 autor, cotejada con el texto de su fuente.» (tres Corpus de prueba). No es SM-C1, no rota con la jornada, la portada sigue sin `lastmod`.
- **Campo de la portada:** formulario GET a `/buscar/` con `q`, sin guion (no carga Pagefind), etiqueta y ejemplo del 404, botón «Buscar»; sin zona (exento por escrito); enviarlo no es salida interna.
- **Pagefind:** la portada responde solo por su título (tipo `portada`, «Portada: Sabiduría de Bolsillo»): todo `main` bajo `data-pagefind-ignore="all"`; el armazón declara el título con `data-pagefind-meta="title:…"` dentro de `data-pagefind-body`. Un fragmento de la Cita del Día devuelve su Página de Cita.
- **Cita del Día:** Bloque de Cita + Atribución (+ Línea de la Fuente) → «Ver esta cita» (tinta solo en la portada; siena en el 404; zona `cita-del-dia`) → Tarjeta de Obra (`nivel` 3) → Copiar e Imagen → «Compartir en» (`h3`). Un solo subárbol `data-jornada` (marca del componente único `CitaDelDia.astro`) y en `data-pagefind-ignore="all"`; ningún `data-ingreso` dentro. Lo copiado y los `data-*` de `imagen.js` idénticos a los de su Página de Cita; las URL de compartir son la canónica con `?via=`, nunca `/` ni `location`, nunca `?de=`. Lo hecho aquí se registra como de la portada; la portada no emite la vista de una Cita. Por encima de `MAX_CARACTERES_IMAGEN` no existen Imagen ni Historia. Sin Obra, sin Tarjeta ni hueco.
- **Sin ninguna Cita apta:** no hay bloque; tras el campo una frase literal «Citas en español, cada una en su página, con su autor y, cuando consta, la obra de la que procede.» (prueba de Vitest). Pregunta abierta que bloquea el cierre de la 28.2: si `DESCRIPCION_DEL_SITIO` (`src/lib/marca.ts`; `description`, `WebSite`, Tarjeta Social, `rss.xml`) cambia con ella — pendiente de Héctor (`bmad-ux`).
- **404:** conserva su Cita del Día como estaba (sin Tarjeta, sin acciones, sin islas, «Ver esta cita» en siena).
- **Seis Obras:** del conjunto `obrasIndexables` (o el congelado si rige `CONGELACION_DE_OBRAS`; nunca `SM11_VIGENTE`); la congelación no quita el bloque. Sin Obras, sin bloque. Fila de bloque a `rutaDeLaObra`, «{Autor} · {año} · {n} citas» (año solo si coincide, nunca de traducción), cierre «Las {n} obras ›» (n del Directorio de Obras, también `noindex`) a `/obras/`; zona `obras-de-portada`; sin enlace comercial con la afiliación encendida.
- **Temas / Colecciones / Autores:** todos los de `temasPublicados` (zona `chip-de-tema`); todas las Colecciones publicadas con su criterio entero (`aria-describedby`, zona `colecciones`); los ocho de la función única de destacados de la 27.6 en orden del Directorio, Fila de bloque serif, zona `autores-de-portada`, cierre «Los {m} autores, de la A a la Z ›» a `/autores/`. La lista entera de Autores sale y la puerta de NFR-5 tiene que seguir pasando (tope nunca relajado).
- **Accesibilidad y pantalla:** texto de la Cita del Día en la primera pantalla a 360 × 640 con la cabecera en dos filas; reflujo a 320 px en las tres condiciones de la 26.9 (rejilla «Compartir en» a una columna, títulos y criterios largos parten); WCAG 2.2 AA; «Copiado.» por región `role="status"` vía `anunciar`.
- **Para fusionar (28.5):** CI verde; `npm run test:e2e` entero con receptor local; `ingreso-accesible.spec.ts --project=escritorio` con donaciones encendidas en copia; Lighthouse móvil 4G a mano sobre portada y Página de Cita frente a la principal del mismo día, en local (nunca el sitio en vivo); si empeora, decide Héctor. Fecha: tras el juicio de SM-11 (desde 2026-12-05) o con `DESPLIEGUE_DE_LA_PORTADA_DE_RETORNO` (jornada UTC del trabajo «Desplegar», en commit aparte el día de llegada). No abre corte en SM-8.

## Technical Decisions

- **Un dueño por enumeración (`src/lib/publicado.ts`):** la línea de cifras (nunca la página ni `tools/lib/cifras.ts`), los ocho destacados (reutilizados, no recalculados), las Obras de la portada vía `obrasIndexables`.
- **Rotación de las seis Obras:** función pura junto a `src/lib/citaDelDia.ts`, que recibe la jornada de `jornadaDelBuild` (con `FECHA_JORNADA`). Rondas sobre la lista circular de Autores con Obras en el conjunto, en el orden del Directorio (clave de orden 26.1); la ventana avanza por jornada tantos puestos como Obras salen; en su n-ésima aparición, el Autor da su n-ésima Obra (orden de la lista de obras de `obras.ts`: recuento desc., título, nombre de ficha) módulo su número; n desde el mismo origen de jornadas que `citaDelDia.ts`. El seis es una constante con nombre en `umbrales.ts`. Independiente de la Cita del Día y de las fijaciones de `corpus/portada.json`. `cita-del-dia.test.ts` sigue verde.
- **Jornada:** solo `CitaDelDia.astro` emite `data-jornada`; la prueba de las dos jornadas exige que en portada y 404 solo difieran esos subárboles. La comprobación sobre `dist/` de AD-17 exige que todo el conjunto del que rotan sean rutas sin `noindex`, no solo las seis de hoy.
- **Islas (AD-6):** solo copiar, Imagen y compartir sobre la Cita del Día, con los disparadores de la Historia y «Más opciones…»; caben en `MAX_BYTES_DE_GUION` medido con una Cita que admite Imagen y donaciones encendidas, o el tope sube en el mismo diff. Ningún guion en línea con datos de contenido (todo por `data-*`); generador por `import()` al pulsar. Lo miden `medicion.test.ts` e `ingreso-construido.test.ts`.
- **Componentes reutilizados con nivel por prop:** `TarjetaDeObra` (`nivel` 3, `siguiente` de `siguienteCita` con los mapas de `citasDeLasObras`/`citasDeTema`), el bloque «Compartir en» de la 25.6, `FilaDeBloque` (glifo «›» U+203A, nunca «→»), `Rotulo`.
- **Modelos:** la Invitación de donación (`Sostener.astro`, `modelosEnRuta('/')`) al final; apagada, nada emitido. Pruebas con Modelos encendidos solo en copias temporales (AD-21).
- **Zonas:** cada enlace interno nuevo de `main` lleva su zona (`cita-del-dia`, `tarjeta-de-obra`, `siguiente`, `obras-de-portada`, `chip-de-tema`, `colecciones`, `autores-de-portada`) y suma su fila a `COLOCACION` de `medicion.test.ts`; ninguna zona ni exención nueva sin Héctor.

## UX & Interaction Patterns

- Cada bloque abre con su `h2` a 6 × `{spacing.unit}` del anterior y su contenido 2 × más abajo (la Cita del Día, 3 ×); campo a 3 × de la línea de cifras; botón «Buscar» 2 × bajo el campo.
- Línea de cifras en `{typography.body-md}` / `{colors.on-surface-variant}`, sin cifra destacada.
- Campo: etiqueta en `{typography.caption}`, filete inferior `{components.rule-width}` `{colors.outline}` que pasa a `{colors.primary}` al foco (además del anillo), lo tecleado en Inter a `{typography.body-lg}`.
- «Ver esta cita» en `{typography.body-md}`, `{colors.on-surface}`, subrayado, 44 px de toque.
- Fila de Obra: título Inter `{typography.body-lg}` peso 600; segunda línea `{typography.caption}`; puntos medios `aria-hidden`, pausa solo para lectores; filas que se tocan separadas por filete. Autores destacados: Source Serif `{typography.headline-sm}` peso 400. Cierres en `{typography.body-md}` subrayados, flecha `aria-hidden`.
- Colección: chip y, a `{spacing.unit}`, el criterio en `{typography.caption}`; 2 × entre Colecciones. Nunca se recorta texto (NFR-12).

## Cross-Story Dependencies

- Depende de la 23 (medición, zonas, AD-6), la 24 (Tarjeta de Obra, «Siguiente»), la 25 (Compartir en, Imagen, Historia), la 26 (Cabecera, Directorios, clave de orden, Campo, `data-jornada`, puerta NFR-5) y la 27 (destacados de la 27.6, campo del 404 de la 27.8).
- Orden interno: 28.1 primero (saca el `h1` de `main`, fija el orden de bloques, Pagefind solo por título); 28.2, 28.3 y 28.4 en cualquier orden; 28.5 al final.
- Conviene la 21.2 antes (con 16 aptas la Cita del Día se repite cada 16 días).
- Preguntas abiertas de Héctor: si la ventana de SM-11 se reinicia desde el 2026-10-19 (fija la fecha del merge); la frase sin apta frente a `DESCRIPCION_DEL_SITIO` (bloquea el cierre de la 28.2).

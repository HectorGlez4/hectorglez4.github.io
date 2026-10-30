---
title: 'Historia 28.4 — Todos los Temas, las Colecciones con su criterio y ocho Autores'
type: 'feature'
created: '2026-10-30'
status: 'done'
baseline_revision: '27d2505ee8073b388bf4a98142b09122c25b3c4a'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-28-context.md'
  - '{project-root}/AGENTS.md'
warnings: [oversized]
deferred: []
---

<intent-contract>

## Intent

**Problem:** La portada termina en la lista entera de Autores (~5.900 px), que la hace una puerta de entrada en vez de una página de retorno, y sus Colecciones salen como chips idénticos a los de Tema, sin decir qué reúne cada una.

**Approach:** Cada Colección publicada va en su fila con su criterio debajo (asociado por `aria-describedby`); la lista de Autores se sustituye por los ocho de `autoresDestacados` (la función de la 27.6) como Filas de bloque en serif, en orden del Directorio, con el cierre «Los {m} autores, de la A a la Z ›» a `/autores/`; la puerta de NFR-5 tiene que seguir pasando con el Corpus real sin la lista.

## Boundaries & Constraints

**Always:**
- **Temas:** sin cambios de marcado ni de zona: todos los de `temasPublicados`, `h2` «Temas», `ul.chips[data-zona="chip-de-tema"]`; sin ninguno, sin sección.
- **Colecciones:** todas las de `conjunto.colecciones` (ya resueltas y sobre umbral; no se llama a `coleccionesPublicadas` ni se filtra nada), en el orden en que llegan, bajo `h2` «Colecciones». Marcado: `<ul class="colecciones" data-zona="colecciones">`, un `<li>` por Colección con `<a class="chip" href={rutaDeColeccion(slug)} aria-describedby={id}>{nombre}</a>` y, a `--unidad` debajo, `<p class="criterio" id={id}>{criterio}</p>` con `id` = `criterio-de-{slug}`. El chip conserva su aspecto y su tamaño de contenido (no se estira a todo el ancho). Criterio en `--pie` (caption), `--tinta-apagada`, sans, entero, sin enlace, sin `nowrap`, `overflow-wrap: anywhere`; 2 × `--unidad` entre Colecciones; la lista a 2 × del rótulo. Sin ninguna, sin sección (como hoy).
- **Autores:** `const destacados = autoresDestacados(conjunto.autores, conjunto.citas)`; sección solo si `destacados.length > 0`: `<section aria-labelledby="autores">` con `<Rotulo id="autores">Autores</Rotulo>`, `<ul class="destacados">` (filete arriba, a 2 × del rótulo) de `<FilaDeBloque href={rutaDeAutor(autor.slug)} zona="autores-de-portada"><span class="nombre">{autor.nombre}</span></FilaDeBloque>` en el orden devuelto (la función ya da el del Directorio), sin `avance`, texto en la misma línea que las etiquetas. `.nombre`: `display: block`, `--serif`, `--titular-sm`, peso 400, `--tinta`, `overflow-wrap: anywhere`; sin subrayado (ni al pasar). Después, fuera de la lista, a 2 ×: `<p data-zona="autores-de-portada"><a href={rutaDelDirectorioDeAutores()}>{cierreDeLosAutores(autores.length)}<span aria-hidden="true">&nbsp;›</span></a></p>` con el mismo trato que el cierre de Obras (comparten regla CSS por selector de zona: `--cuerpo-md`, `--tinta`, subrayado siempre, alto `--zona-de-toque`). `autores` es el `autoresPublicados` que ya calcula la página: la misma m que `lineaDeCifras`.
- `cierreDeLosAutores(m)` en `src/lib/atribucion.ts`, junto a `cierreDeLasObras`: «Los {milesEnEspañol(m)} autores, de la A a la Z»; con 1, «El 1 autor, de la A a la Z»; lanza con un recuento que no sea entero ≥ 1. Sin glifo.
- La lista entera de Autores (`ul.autores` y su CSS) desaparece. Orden de la columna intacto: … «Obras» → «Temas» → «Colecciones» → «Autores» → `Sostener` (por `modelosEnRuta('/')`, sin tocarlo).
- Todo sigue dentro del `div` con `data-pagefind-ignore="all"`. Ningún guion, ningún `data-ingreso`, ningún `<style>` nuevo fuera de `index.astro`.
- **Grafo del modelo sin cambios** (`grafoDelModelo`: la espina, AD-11, no cuenta los destacados entre sus aristas). El aviso «NFR-5 en el modelo» se conserva y se reescribe: las Citas que solo los Autores destacados de la portada dejan a ≤3 saltos (cambian con los recuentos, y una orden que retira no se apoya en ellos). Se conserva el prefijo literal «NFR-5 en el modelo: {n} Cita(s) queda(n) a más de 3 saltos de la portada».
- Comentarios y `AGENTS.md` dejan de hablar de «la lista de Autores que quitará la Épica 28».

**Block If:**
- `npm run build` con el Corpus del árbol rompe la puerta de NFR-5 (o la de aristas del modelo) tras quitar la lista: HALT, decide Héctor; el tope (`MAX_SALTOS_DESDE_LA_PORTADA`) no se toca. (Comprobado en la planificación: `avisoDeFueraDelModelo` no da ninguna Cita con el Corpus de la rama ni con el de la principal, 4.420 Citas.)
- Hace falta una zona o exención nueva, o tocar `src/lib/vocabulario.ts`.

**Never:**
- No recalcular la regla de FR-8 ni su suelo; no ordenar Autores en la página; no tocar `autoresDestacados`, `buscar.astro` (Chip en la búsqueda sin resultados) ni `AUTORES_DESTACADOS`.
- No tocar la Cita del Día, las Obras (28.3), el 404, `LoQueRota.astro` ni lo de la 28.2.
- No cambiar `criterioDeColeccion`, `MIN_CITAS_POR_COLECCION` ni el umbral de Tema; no sembrar Colecciones en `corpus/colecciones/`.
- No editar `_bmad-output/planning-artifacts/` ni `_bmad-output/specs/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| ≥ 9 Autores publicados | Corpus con 10 Autores con Citas | 8 filas = `autoresDestacados`, en su orden; cierre con m = 10 | — |
| Suelo latinoamericano | el 10.º por Citas es latinoamericano y el suelo lo mete | sale entre los ocho (lo da la función, la página no decide) | — |
| ≤ 8 Autores | 2 Autores | 2 filas; cierre «Los 2 autores, de la A a la Z ›» | — |
| Dos Colecciones | una de criterio largo con una palabra de 30+ letras | dos filas chip+criterio; criterio entero, partido en renglones | — |
| Colección bajo umbral | 14 miembros publicados | ni chip ni criterio en la portada | — |
| Criterio vacío / solo espacios | fichero de Colección | — | el build rompe (`criterioDeColeccion`, ya probado) |
| Cierre | m = 1 / m = 1234 | «El 1 autor, de la A a la Z» / «Los 1.234 autores, de la A a la Z» | m = 0, −1, 1.5 lanzan |

</intent-contract>

## Code Map

- `src/pages/index.astro` -- l. 18–20 comentario «todos los Autores» (reescribir: Temas, Colecciones y Directorios; cada Autor a dos saltos por la cabecera y `/autores/`); l. 52–58 imports de `publicado.ts` (añadir `autoresDestacados`) y de `superficies.ts` (`rutaDelDirectorioDeAutores`); l. 62 `autores` (se queda: da m); l. 219–235 Colecciones (rehacer con criterio); l. 237–248 lista entera (sustituir); CSS: `p[data-zona='obras-de-portada']` l. 362–379 (ampliar a `autores-de-portada`), `.chips`/`.chip` l. 381–405, `.autores*` l. 407–435 (quitar).
- `src/lib/publicado.ts` -- `autoresDestacados` (l. 204, no tocar), `autoresPublicados` (l. 171), `lineaDeCifras` (l. 294, la m), `grafoDelModelo` (l. 1219; solo su comentario l. 1212–1215), `ColeccionResuelta.criterio` (l. 368).
- `src/lib/atribucion.ts` -- `cierreDeLasObras` (l. 438) como modelo; aquí `cierreDeLosAutores`. `milesEnEspañol` de `src/lib/formato.ts`.
- `src/lib/superficies.ts` -- `rutaDelDirectorioDeAutores`, `rutaDeAutor`, `rutaDeColeccion`.
- `src/components/FilaDeBloque.astro` -- `li.fila-de-bloque[data-zona]` > `a` > `span` > slot; estilos sans/`--cuerpo-md` del `a` que el `span.nombre` de la página sobrescribe por herencia (patrón de `FilaDeAutor.astro`, `.nombre`).
- `src/lib/admision.ts` -- `criterioDeColeccion` (l. 406): ya rompe sin criterio o en blanco; lo prueban `tests/unit/colecciones-build.test.ts` l. 243 y 332, y el umbral, l. 196.
- `tools/lib/alcance.ts` -- `avisoDeFueraDelModelo` (l. 359–377, texto del aviso), comentario de `fueraDeAlcanceTras` (l. 403–404). `integraciones/alcance.ts` l. 15–16 y 83 (comentarios). `tests/unit/ayuda/al-limite.ts` l. 12 (comentario).
- `tests/unit/alcance-construido.test.ts` -- l. 17–37 narrativa; l. 111–119 el aviso (prefijo se conserva); l. 168–195 parchea `index.astro` quitando la sección «Autores» por regex (l. 178): ajustar la regex al marcado nuevo (la sección queda dentro de `destacados.length > 0 && (…)`) y renombrar a «sin sus Autores destacados». En su fixture, Séneca y Epicteto son los dos destacados, así que la construcción sana sigue pasando y avisando.
- `tests/unit/medicion.test.ts` -- `COLOCACION` l. 3103: sumar `['/', '/autores/', [{ zona: 'autores-de-portada' }]]` (zona de la Épica 23: suma fila); l. 3250 comentario («la lista de Autores» → «los Autores destacados»).
- `tests/unit/espinas-de-ux.test.ts` -- l. 199 `['src/pages/index.astro', '.autores a']` → `.nombre`; añadir `['src/pages/index.astro', '.criterio']`.
- `tests/unit/ingreso-construido.test.ts` -- l. 540–575: construcción con donaciones encendidas; aquí la aserción de posición. `fuenteConDonacionesEncendidas`.
- `tests/unit/obras-de-la-portada.test.ts` -- plantilla de fixture con varios Autores, `construirConCorpus`, `paginaConstruida`, `recorrerElementos` (`tools/lib/html.ts`). `tests/unit/autores-destacados.test.ts` -- cómo se construyen Autores con `aplanarAutor` para llamar a `autoresDestacados`.
- `tests/unit/publicable-y-alcanzable.test.ts` -- l. 1117 orden de rótulos (debe seguir verde).
- `tests/e2e/busqueda.spec.ts` -- `todasLasDirecciones` (l. 600, privada) y l. 632 `ul.autores a` → `ul.destacados a`. Mover `todasLasDirecciones` a `tests/e2e/ayuda/pagefind.ts` y reutilizarla.
- `tests/e2e/accesibilidad.spec.ts` -- l. 859 `TEXTOS_DEL_CORPUS`: quitar `.autores a` (`.nombre` ya está), añadir `.criterio`.
- `tests/e2e/obras-de-la-portada.spec.ts` -- plantilla de sitio propio (`construirConCorpus`, `tests/servidor.mjs`, puerto 4404) y `tests/e2e/ayuda/reflujo.ts` (`CONDICIONES`, `cargarEn320`, `anchoDeLaPagina`).
- `tests/e2e/portada.spec.ts` -- l. 225–260 distancias (incluye «Autores»), l. 316–430 pruebas de Obras como modelo de medidas.
- `AGENTS.md` -- l. 45 (la frase «son las Citas que hoy solo acerca la lista de Autores de la portada, que la Épica 28 quita»); tras «Las Obras de la portada (Historia 28.3)» (l. 1009), subsección breve de la 28.4.

## Tasks & Acceptance

**Execution:**
- `src/lib/atribucion.ts` -- `cierreDeLosAutores(m)` con su comentario (FR-55, UX-DR62).
- `src/pages/index.astro` -- Colecciones con criterio, Autores destacados y su cierre, CSS (quitar `.autores`, añadir `.colecciones`, `.criterio`, `.destacados`, `.nombre`, cierre compartido), comentarios de cabecera y de bloque.
- `tools/lib/alcance.ts`, `integraciones/alcance.ts`, `src/lib/publicado.ts` (comentario), `tests/unit/ayuda/al-limite.ts` -- el aviso y los comentarios hablan de los Autores destacados, no de la lista que quitaría la Épica 28.
- `AGENTS.md` -- l. 45 y subsección «Temas, Colecciones y Autores de la portada (Historia 28.4)»: los ocho de `autoresDestacados`, el cierre con la m de la línea, el criterio con `aria-describedby`, el aviso de NFR-5 reescrito.
- `tests/unit/cierre-de-los-autores.test.ts` (nuevo, puro) o dentro de uno puro existente de `atribucion` -- la fila «Cierre» de la matriz.
- `tests/unit/portada-temas-colecciones-autores.test.ts` (nuevo, con builds) -- fixture: 10 Autores con `ordenAlfabetico` y `tradicion`, recuentos distintos, orden del Directorio distinto del de recuento, el último por recuento latinoamericano que entra por el suelo; un Tema publicado (`MIN_CITAS_POR_TEMA` Citas); dos Colecciones publicadas (`MIN_CITAS_POR_COLECCION` miembros), una de criterio largo; una tercera bajo umbral. Exige sobre `index.html`: rótulos en orden; todos los Temas de `temasPublicados`; las dos Colecciones, cada `a.chip` con `aria-describedby` que apunta a un `p.criterio` existente con el criterio literal entero, la tercera ausente; dentro de `[data-zona="autores-de-portada"]` exactamente los `href` de `autoresDestacados` (calculado con `aplanarAutor` sobre el fixture), en ese orden, y ningún otro enlace a `/autor/` en `main` salvo la Atribución de la Cita del Día; el latinoamericano entre ellos; cierre `href` `/autores/` con texto `cierreDeLosAutores(10)` + `&nbsp;›` en `span[aria-hidden]` y la m igual a la de `.cifras`; todo bajo `data-pagefind-ignore="all"`; sin `data-ingreso`. Segunda construcción con 2 Autores, sin Colecciones y sin Tema publicado: sin «Temas» ni «Colecciones», 2 filas y «Los 2 autores…».
- `tests/unit/ingreso-construido.test.ts` -- en la construcción encendida, el `aside` de donaciones va después del cierre `/autores/` de la portada y es lo último de la columna; apagada, la portada sin rastro (lo que ya fija).
- `tests/unit/alcance-construido.test.ts`, `tests/unit/medicion.test.ts`, `tests/unit/espinas-de-ux.test.ts` -- los ajustes del Code Map.
- `tests/e2e/ayuda/pagefind.ts` (nuevo) + `tests/e2e/busqueda.spec.ts` -- `todasLasDirecciones` compartida; el selector de los destacados.
- `tests/e2e/temas-colecciones-autores-de-la-portada.spec.ts` (nuevo) -- copia con fixture (≥ 2 Colecciones, una con criterio de 30+ letras en una palabra; un destacado con nombre larguísimo), `conBusqueda: true`, servida con `tests/servidor.mjs` en el puerto 4405 (comprobar libre; cerrar al final), perfil `escritorio`, en serie: a 320 px en las tres `CONDICIONES` sin desplazamiento horizontal y el criterio largo en más de un renglón; el nombre accesible del chip es el nombre y su descripción el criterio; axe sin violaciones en la portada; buscar el criterio da la Página de Colección y no `/`, y buscar el nombre del destacado da su Página de Autor y no `/`.
- `tests/e2e/portada.spec.ts` -- sitio de siempre: «Autores» con exactamente `AUTORES_DESTACADOS` filas, serif `--titular-sm` 400 tinta sin subrayado, 44 px cada una, lista a 2 × del rótulo; cierre a 2 ×, subrayado, 44 px, y su número igual a la m de la línea de cifras y al número de Autores de `/autores/`; ninguna lista entera de Autores.
- `tests/e2e/accesibilidad.spec.ts` -- `TEXTOS_DEL_CORPUS`.

**Acceptance Criteria:**
- Given la portada construida con el Corpus del árbol, when se lee `main`, then tras «Colecciones» (si hay) va «Autores» con ocho Filas de bloque —las de `autoresDestacados`, en su orden— y «Los {m} autores, de la A a la Z ›» a `/autores/`, y no hay ninguna otra lista de Autores.
- Given `npm run build` con el Corpus del árbol, when acaba, then la puerta de NFR-5 pasa (informe de una línea) sin la lista entera, y el aviso de «NFR-5 en el modelo», si sale, nombra los Autores destacados.
- Given una Colección publicada, when un lector de pantalla llega a su chip, then oye el nombre y, como descripción, el criterio entero.
- Given las donaciones encendidas en una copia, when se construye la portada, then la invitación es lo último de la columna, tras el cierre de Autores; apagadas, no emite nada.
- Given `npx astro check`, `tests/unit/cita-del-dia.test.ts`, `dos-jornadas.test.ts` y `obras-de-la-portada.test.ts`, when corren, then pasan sin cambios en sus aserciones.

## Design Notes

**Por qué el modelo no lleva los destacados.** La espina (AD-11) enumera las aristas del modelo y no cuenta los Autores de la portada: los ocho cambian con los recuentos, y una orden que retira no puede apoyarse en que un Autor siga entre ellos. Con la lista entera fuera, el aviso de «NFR-5 en el modelo» sigue teniendo sentido —una Cita en la página 2+ de un Autor destacado, sin Tema publicado, está a tres saltos en `dist/` y a cuatro en el modelo— y se reescribe en vez de quitarse.

**Sin ningún Autor publicado** (Corpus sin Citas) la guarda `destacados.length > 0` omite la sección entera, rótulo y cierre incluidos, como «Obras» sin indexables; `cierreDeLosAutores` lanzaría con 0. Ninguna prueba construye un Corpus sin Citas: basta la guarda y la prueba pura del cierre.

**Marcado de una Colección:**
```astro
<li><a class="chip" href={rutaDeColeccion(c.slug)} aria-describedby={`criterio-de-${c.slug}`}>{c.nombre}</a><p class="criterio" id={`criterio-de-${c.slug}`}>{c.criterio}</p></li>
```
El `li` es un contenedor de bloque; el chip, `inline-flex` (o el `li` en columna con `align-items: flex-start`) para no estirarse.

## Verification

**Commands:**
- `npx vitest run tests/unit/cierre-de-los-autores.test.ts` (o el puro donde vaya) -- verde.
- `npx vitest run` uno por uno: `portada-temas-colecciones-autores`, `alcance-construido`, `medicion`, `espinas-de-ux`, `ingreso-construido`, `publicable-y-alcanzable`, `colecciones-build`, `obras-de-la-portada`, `dos-jornadas`, `alcance`, `peso` -- verde.
- `npx astro check` -- 0 errores.
- `npm run build` -- termina; NFR-5 pasa con el Corpus del árbol; la portada lleva ocho Autores y el cierre.
- `npx playwright test tests/e2e/temas-colecciones-autores-de-la-portada.spec.ts tests/e2e/portada.spec.ts tests/e2e/seo.spec.ts` y `tests/e2e/busqueda.spec.ts -g "portada"` y `tests/e2e/accesibilidad.spec.ts -g "320|axe"` -- verde, con 4321, 4405 y 8787 libres.

## Spec Change Log

## Review Triage Log

### 2026-10-30 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

(Las capas de revisión son externas en el bucle v8-ralph y en esta pasada no traían hallazgos: la revisión independiente viene después.)

## Auto Run Result

Status: done
Blocking condition: ninguna.

Planificación (pasada anterior): `avisoDeFueraDelModelo` no dejaba ninguna Cita fuera del modelo con el Corpus de la rama ni con el de la principal (4.420 Citas). Confirmado al construir: la puerta de NFR-5 pasa sin la lista entera de Autores y el build no emite «NFR-5 en el modelo».

**Resumen.** La portada deja la lista entera de Autores: «Autores» enseña los ocho de `autoresDestacados` (27.6) en su orden —el del Directorio— como Filas de bloque con el nombre en la serif `--titular-sm` 400, zona `autores-de-portada`, y el cierre «Los {m} autores, de la A a la Z ›» a `/autores/`, con la m de `autoresPublicados` (la de la línea de cifras). Cada Colección va en su fila con el chip —mismo aspecto, sin estirarse— y, a `--unidad`, su criterio entero en `p.criterio` (`id="criterio-de-{slug}"`), que el chip lleva por `aria-describedby`. Los Temas no cambian. El aviso «NFR-5 en el modelo» conserva su prefijo y ahora habla de los Autores destacados; comentarios y `AGENTS.md` dejan de hablar de «la lista que quitará la Épica 28».

**Ficheros.**
- `src/lib/atribucion.ts` — `cierreDeLosAutores(m)`, junto a `cierreDeLasObras`; lanza con un recuento que no sea entero ≥ 1.
- `src/pages/index.astro` — Colecciones con criterio, Autores destacados y su cierre; CSS: fuera `.autores`, nuevos `.colecciones`, `.criterio`, `.destacados`, `.nombre`; el cierre comparte regla con el de Obras por selector de zona; comentarios.
- `tools/lib/alcance.ts`, `integraciones/alcance.ts`, `src/lib/publicado.ts`, `tests/unit/ayuda/al-limite.ts` — texto del aviso y comentarios: los Autores destacados, que el modelo no lleva porque cambian con los recuentos.
- `AGENTS.md` — la frase de NFR-5 (l. 45) y la subsección «Temas, Colecciones y Autores de la portada (Historia 28.4)».
- `tests/unit/cierre-de-los-autores.test.ts` (nuevo) — la fila «Cierre» de la matriz.
- `tests/unit/portada-temas-colecciones-autores.test.ts` (nuevo) — dos construcciones: diez Autores (suelo latinoamericano, orden del Directorio distinto del recuento), dos Temas publicados y uno no, dos Colecciones publicadas y una bajo umbral; y dos Autores sin Temas ni Colecciones.
- `tests/unit/ingreso-construido.test.ts` — con donaciones encendidas, la invitación va tras el cierre de Autores y es lo último de la columna.
- `tests/unit/alcance-construido.test.ts`, `tests/unit/alcance.test.ts` — el parche quita ahora la sección de los destacados (`destacados.length > 0 && (…)` → `null`); narrativa y nombres.
- `tests/unit/medicion.test.ts` — fila de `COLOCACION` para `/autores/` desde la portada; comentario.
- `tests/unit/espinas-de-ux.test.ts` — `.nombre` y `.criterio` de la portada con `overflow-wrap: anywhere`.
- `tests/e2e/ayuda/pagefind.ts` (nuevo) — `todasLasDirecciones`, sacada de `busqueda.spec.ts` para compartirla.
- `tests/e2e/busqueda.spec.ts` — la usa desde la ayuda; selector `ul.destacados a`.
- `tests/e2e/accesibilidad.spec.ts` — `TEXTOS_DEL_CORPUS` sin `.autores a`, con `.criterio`.
- `tests/e2e/portada.spec.ts` — describe de la 28.4: ocho filas, tipografía y toque, distancias, cierre y su m frente a la línea y a `/autores/`.
- `tests/e2e/temas-colecciones-autores-de-la-portada.spec.ts` (nuevo) — copia con Pagefind en el puerto 4405: nombre y descripción accesibles del chip, reflujo a 320 px en las tres condiciones, axe y búsqueda del criterio y del nombre.

**Revisión.** Parches: 0. Diferidos: 0. Rechazados: 0. Recomendación de revisión de seguimiento: `false` (parches high 0, medium 0, low 0; puntuación 0).

**Verificación.**
- `npx vitest run tests/unit/cierre-de-los-autores.test.ts` — 3/3.
- `npx vitest run` de `cierre-de-los-autores`, `portada-temas-colecciones-autores`, `alcance-construido`, `espinas-de-ux`, `ingreso-construido`, `publicable-y-alcanzable`, `colecciones-build`, `obras-de-la-portada`, `dos-jornadas`, `alcance`, `peso`, `cita-del-dia`, `autores-destacados` y `medicion` — 14 ficheros, 995 pruebas en verde.
- `npx astro check` — 0 errores, 0 avisos (8 pistas ajenas a este cambio).
- `npm run build` con el Corpus del árbol — termina con 0; «NFR-5: 5115 superficies publicadas, todas a 3 saltos o menos de la portada; las 37398 aristas del modelo están en dist/», sin aviso «NFR-5 en el modelo»; la portada lleva ocho Autores (Arenal, Gracián, Ingenieros, Martí, González Prada, Quevedo, Séneca, Unamuno) y «Los 135 autores, de la A a la Z ›», con 135 también en la línea de cifras.
- `npx playwright test tests/e2e/temas-colecciones-autores-de-la-portada.spec.ts tests/e2e/portada.spec.ts tests/e2e/seo.spec.ts` — 72 en verde, 4 saltadas (el sitio propio solo en `escritorio`).
- `npx playwright test tests/e2e/busqueda.spec.ts -g portada` — 8 en verde.
- `npx playwright test tests/e2e/accesibilidad.spec.ts -g "320|axe"` — 148 en verde.
- Puertos 4321, 4405 y 8787 libres antes y después.

**Auditoría de la matriz.** ≥ 9 Autores y suelo latinoamericano: `portada-temas-colecciones-autores` (diez Autores, el décimo latinoamericano entre los ocho, orden de `autoresDestacados`, m = 10). ≤ 8 Autores: misma prueba, segunda construcción (2 filas, «Los 2 autores…»). Dos Colecciones con palabra de 30+ letras: criterio entero en la unitaria y partido en renglones a 320 px en la e2e. Colección bajo umbral: la unitaria (14 miembros, ni chip ni criterio). Criterio vacío: `colecciones-build` (ya existente, en verde). Cierre m = 1 / 1234 / 0 / −1 / 1,5: `cierre-de-los-autores`.

**Riesgos residuales.** Ninguno conocido. La regla de selección de los ocho es de `autoresDestacados` (27.6) y cambia con los recuentos del Corpus; el aviso de NFR-5 en el modelo lo dirá si algún día una Cita solo queda cerca por ellos.

---
title: 'Historia 28.4 — Todos los Temas, las Colecciones con su criterio y ocho Autores'
type: 'feature'
created: '2026-10-30'
status: 'done'
baseline_revision: '27d2505ee8073b388bf4a98142b09122c25b3c4a'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-28-context.md'
  - '{project-root}/AGENTS.md'
warnings: [oversized]
deferred:
  - summary: >-
      Los ocho Autores destacados cambian con los recuentos, así que una orden que retira, o un alta o una aprobación que reordena los recuentos, puede sacar de los ocho al Autor que hoy acerca una Cita «ya fuera del modelo» y romper el build siguiente sin que ninguna orden la nombre antes.
    evidence: |-
      Edge-case-hunter, revisión de la 28.4. Por decisión del contrato (AD-11) el modelo no lleva los destacados y las órdenes que retiran no bloquean por lo que ya estaba fuera; antes de la 28.4 la lista entera de Autores era estable y esas Citas seguían a 3 saltos en dist/, y ahora dependen de qué ocho salgan. Hoy es latente: con el Corpus del árbol y el de la principal el aviso «NFR-5 en el modelo» no da ninguna Cita. Si algún día da alguna, decide Héctor si las órdenes (retirar, revisar --aprobar, alta) deben comparar también los destacados de antes y de después.
    location: >-
      tools/lib/alcance.ts (citasFueraDelModelo, avisoDeFueraDelModelo); src/pages/index.astro (destacados)
    severity: medium
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

(Pasada de implementación: las capas de revisión son externas en el bucle v8-ralph y en esta pasada no traían hallazgos; la revisión independiente es la pasada 1, abajo. Este recuento a cero no es el veredicto vigente.)

### 2026-10-30 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 5: (high 0, medium 1, low 4)
- defer: 1: (high 0, medium 1, low 0)
- reject: 27: (high 0, medium 0, low 27)
- addressed_findings:
  - `[medium]` `[patch]` Las medidas de «Colecciones» (UX-DR62, variante 3A) solo las decía el CSS (verification-gap, ac-auditor 1, intent-alignment c): nueva prueba en `tests/e2e/temas-colecciones-autores-de-la-portada.spec.ts` que mide con el estilo calculado el chip igual al de Tema y más estrecho que su fila, el criterio en `--sans`/`--pie`/`--tinta-apagada` a `--unidad` del chip, 2 × entre Colecciones y la lista a 2 × del rótulo.
  - `[low]` `[patch]` El otro enlace a `/autor/` de `main` se comprobaba con `<= 1` aunque siempre hay Cita del Día (blind-hunter): `toBe(1)` en la unitaria y en `tests/e2e/portada.spec.ts`.
  - `[low]` `[patch]` El caso de dos Autores reescribía la regla de orden del Directorio a mano (blind-hunter): ahora compara con `autoresDestacados` sobre los mismos dos Autores y sus tres Citas.
  - `[low]` `[patch]` En `tests/unit/ingreso-construido.test.ts` un `indexOf('<aside')` de −1 daba un fallo sin causa, y el filete de la invitación no se comprobaba (edge-case-hunter, ac-auditor 2, intent-alignment f): guarda explícita y aserción del `border-top` del `aside`.
  - `[low]` `[patch]` El aviso «NFR-5 en el modelo» reescrito era ambiguo y no decía qué hacer (blind-hunter): conserva el prefijo y la frase de los destacados, aclara que las órdenes no bloquean por esas Citas y dice que cada una necesita un Tema publicado.

Rechazados (27, todos `low`): el tablero y el commit del spec con el código (los lleva el bucle), el spec en `done` antes de la revisión (diseño del flujo), la zona compartida del cierre (la fija el contrato y una zona nueva es de Héctor), la guarda en `destacados` (`autoresDestacados` devuelve al menos uno si hay algún Autor publicado), el ancho (`section` ya lleva `max-width: var(--medida-prosa)`), el marcado en una línea (patrón de la 28.3, comentado), el reflujo que «pasa sin medir» (la premisa fallida es un `expect.soft` que suspende la prueba), los tipos de `comoAutor`, el `&nbsp;`, la regex con sangrías (tiene guarda), los bordes de 8 y 9 Autores (`autores-destacados.test.ts`), los `id` (slugs únicos con prefijo), la doble lectura del criterio, la redacción de «El 1 autor» y «1.234» (las fija el contrato), el sitio y la extensión de la sección de `AGENTS.md` (los fija el Code Map), el recuento de `/autores/`, la comprobación sobre el Corpus real de Colecciones, la identidad de los ocho y NFR-5 sobre el Corpus real (la puerta del build y la página pasa la salida de la función tal cual), las garantías previas de las Colecciones (ya probadas), las condiciones previas 26.8/27.6 en `review` (el bucle las fusiona por épica) y la lista de Temas escrita a mano en la unitaria.

### 2026-10-30 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 15: (high 0, medium 1, low 14)
- defer: 0
- reject: 13: (high 0, medium 0, low 13)
- addressed_findings:
  - `[medium]` `[patch]` La identidad de los ocho, los Temas y las Colecciones solo se comprobaba sobre fixtures (intent-alignment a): nueva prueba en `tests/e2e/portada.spec.ts` sobre el sitio construido con el Corpus del árbol que exige los enlaces de «Autores» iguales a `autoresDestacados` del Corpus leído con `conjuntoDeLosDatos`, en su orden y con su nombre, los de «Temas» iguales a `temasPublicados` y las Colecciones a `conjunto.colecciones` con su criterio.
  - `[low]` `[patch]` El aviso «NFR-5 en el modelo» decía «el build pasa» aunque se escribe antes de juzgar `dist/` y la puerta puede romper (blind-hunter): reescrito para que valga en los dos casos —«En dist/ pueden acercarlas ellos… si el Autor de una deja de estar entre los destacados, el build puede romper por ella»—, con su prefijo y la frase de los destacados intactos; el comentario de `avisoDeFueraDelModelo` lo explica.
  - `[low]` `[patch]` El consejo del aviso omitía la Colección y el umbral del Tema (blind-hunter): «un Tema publicado (desde `MIN_CITAS_POR_TEMA` Citas) o una Colección publicada».
  - `[low]` `[patch]` El riesgo diferido no tenía seguimiento fuera del spec (blind-hunter, intent-alignment e, ac-auditor 6): entrada nueva en `_bmad-output/implementation-artifacts/deferred-work.md` y, en `AGENTS.md`, la consecuencia —el build siguiente puede romper sin aviso de ninguna orden— y cómo se cierra.
  - `[low]` `[patch]` La subsección de la 28.4 en `AGENTS.md` colgaba de «Las fichas de Obra» (blind-hunter): pasa a sección propia (`##`) en el mismo sitio.
  - `[low]` `[patch]` `AGENTS.md` no decía que la invitación a sostener va tras el cierre de «Autores» ni la fila de `COLOCACION` (blind-hunter): añadido. (El registro de puertos no existe en `AGENTS.md`; no se inventa aquí.)
  - `[low]` `[patch]` El `li` de las Colecciones en una línea sin explicar (blind-hunter): comentario en `index.astro` —ningún blanco del formateo entra en el nombre ni en la descripción accesibles—.
  - `[low]` `[patch]` `comoAutor` copiaba a mano los datos de la ficha (blind-hunter, ac-auditor 3): la unitaria lee ahora los Autores, las Citas y los Temas de los mismos ficheros que escribe (`yaml` sobre la ficha y el frontmatter), y los pasa por `aplanarAutor`.
  - `[low]` `[patch]` «Temas» comparado con una lista escrita a mano (blind-hunter, ac-auditor 4): se compara, en orden, con `temasPublicados` sobre el Corpus de la prueba.
  - `[low]` `[patch]` El cierre se comparaba con el literal `&nbsp;` en un caso y con la entidad en otro (blind-hunter): la unitaria normaliza `&nbsp;` a U+00A0 en los dos.
  - `[low]` `[patch]` «El mismo trato que el cierre de Obras» solo se probaba en parte (ac-auditor 5): la e2e compara familia, cuerpo, peso, color y subrayado computados de los dos cierres.
  - `[low]` `[patch]` La importación de `todasLasDirecciones` iba entre dos de `src/lib` (blind-hunter): junto a las ayudas locales. (`OPCIONES_DE_PAGEFIND` **sí** se usa todavía en `busqueda.spec.ts`, cuatro veces: esa parte del hallazgo no se sostiene.)
  - `[low]` `[patch]` Dos comentarios partidos a media frase (`grafoDelModelo` en `src/lib/publicado.ts` y la cabecera de `tests/unit/alcance-construido.test.ts`) (blind-hunter): reenvueltos.
  - `[low]` `[patch]` El spec mezclaba veredictos de pasadas distintas (blind-hunter): el `Auto Run Result` dice que el vigente es el último bloque, la pasada de implementación lleva su rótulo y sus riesgos «ninguno» quedan marcados como superados.
  - `[low]` `[patch]` Verificación parcial tras la pasada 1 (blind-hunter): esta pasada corre la Verificación entera del spec, `tests/e2e/accesibilidad.spec.ts` completo (foco y orden de tabulación incluidos) y los trece ficheros unitarios.

Rechazados (13, todos `low`): la m del cierre y la de la línea «coinciden por casualidad» (las dos salen de `autoresPublicados` con los mismos `conjunto.citas` y `conjunto.autores`: `lineaDeCifras` la calcula así); la zona compartida del cierre (la fija el contrato; una zona nueva es de Héctor, UX-DR111); el tablero `sprint-status.yaml` y las condiciones previas 26.8/27.6 en `review` (los lleva el bucle por épica, y esta pasada no tiene orden de tocar esas líneas); la regex con sangrías de `alcance-construido` (tiene guarda que falla diciendo por qué); las aserciones e2e sobre la Cita del Día y `/autores/` (hechos del sitio de la suite, que siempre tiene Cita del Día y cuyo Directorio lista un enlace por Autor); la doble lectura del criterio (UX-DR62 y el contrato piden el criterio visible **y** como descripción del chip: quien navega por enlaces lo oye con el chip, y quien lee en orden lo encuentra en su sitio); la portada vacía sin prueba construida (decisión del spec: guarda más prueba pura); el ancho de `.destacados` (`section` ya lleva `max-width: var(--medida-prosa)`); NFR-5 sobre el Corpus real (la puerta corre en cada build, también en CI, y esta pasada la vio pasar); el barrido a 320 px y la búsqueda del criterio sobre el Corpus real (no hay ninguna Colección publicada: curarlas es de Héctor, y el fixture lo cubre); y las garantías de FR-28, el criterio en blanco y las donaciones apagadas (probadas por las pruebas existentes, en verde).

## Auto Run Result

Status: done
Blocking condition: ninguna.

Los bloques van en orden y el vigente es el último: «Pasada de implementación», «Pasada de revisión 1» y «Pasada de revisión 2». Las cifras de revisión y los riesgos de un bloque anterior quedan superados por los del siguiente.

### Pasada de implementación (2026-10-30)

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

**Riesgos residuales (superado por la pasada 1, que difiere un riesgo medio).** Ninguno conocido. La regla de selección de los ocho es de `autoresDestacados` (27.6) y cambia con los recuentos del Corpus; el aviso de NFR-5 en el modelo lo dirá si algún día una Cita solo queda cerca por ellos.

### Pasada de revisión 1 (2026-10-30)

**Resumen.** La revisión independiente (cinco capas externas) no cambió el comportamiento de la portada: cinco parches de pruebas y de redacción, un diferido y 27 rechazos (detalle en el Review Triage Log).

**Ficheros.**
- `tests/e2e/temas-colecciones-autores-de-la-portada.spec.ts` — prueba nueva: las medidas de «Colecciones» con el estilo calculado (chip igual al de Tema y sin estirarse, criterio en `--sans`/`--pie`/`--tinta-apagada` a `--unidad`, 2 × entre Colecciones y del rótulo).
- `tests/unit/portada-temas-colecciones-autores.test.ts` — la Atribución de la Cita del Día, exactamente un enlace a `/autor/`; el caso de dos Autores compara con `autoresDestacados`.
- `tests/e2e/portada.spec.ts` — ídem, exactamente un enlace de Atribución.
- `tests/unit/ingreso-construido.test.ts` — guarda del `<aside>` y su filete encima.
- `tools/lib/alcance.ts` — el aviso «NFR-5 en el modelo», más claro y con el siguiente paso (un Tema publicado); prefijo y frase de los destacados intactos.

**Revisión.** Parches: 5 (high 0, medium 1, low 4). Diferidos: 1. Rechazados: 27. Recomendación de revisión de seguimiento: `true` (puntuación 3 × 1 + 4 = 7 ≥ 5; ningún parche high).

**Verificación.**
- `npx vitest run` uno por uno: `portada-temas-colecciones-autores` 8/8, `ingreso-construido` 42/42, `alcance-construido` 6/6, `alcance` 26/26, `cierre-de-los-autores` 3/3.
- `npx astro check` — 0 errores, 0 avisos, 8 pistas.
- `npx playwright test tests/e2e/temas-colecciones-autores-de-la-portada.spec.ts tests/e2e/portada.spec.ts` — 53 en verde, 5 saltadas (la copia solo en `escritorio`). Puertos 4321, 4405 y 8787 libres antes y después.

**Riesgos residuales.** El diferido: los destacados cambian con los recuentos y una orden que retira o un alta pueden sacar de los ocho al Autor que acerca una Cita ya fuera del modelo; hoy no hay ninguna (el aviso no sale con el Corpus del árbol).

### Pasada de revisión 2 (2026-10-30)

**Resumen.** Segunda revisión independiente (cinco capas externas): ningún cambio de comportamiento de la portada. Una prueba nueva sobre el sitio construido con el Corpus del árbol (los ocho, los Temas y las Colecciones son los de sus funciones, en su orden), el aviso «NFR-5 en el modelo» reescrito para que sea cierto pase o rompa la puerta, el riesgo diferido llevado a `deferred-work.md` y a `AGENTS.md`, y ajustes de pruebas, comentarios y documentación.

**Ficheros.**
- `tests/e2e/portada.spec.ts` — prueba nueva sobre el Corpus del árbol (`autoresDestacados`, `temasPublicados`, `conjunto.colecciones`); el cierre de «Autores» con el trato computado del de «Obras».
- `tests/unit/portada-temas-colecciones-autores.test.ts` — Autores, Citas y Temas leídos de los ficheros que escribe; «Temas» frente a `temasPublicados`; `&nbsp;` normalizado.
- `tools/lib/alcance.ts` — texto del aviso «NFR-5 en el modelo» y su comentario.
- `AGENTS.md` — la sección de la 28.4 pasa a `##`; la consecuencia del riesgo diferido, la invitación tras el cierre y la fila de `COLOCACION`.
- `_bmad-output/implementation-artifacts/deferred-work.md` — el riesgo de los destacados, con su evidencia.
- `src/pages/index.astro` — comentario del `li` de las Colecciones (sin cambio de marcado).
- `src/lib/publicado.ts`, `tests/unit/alcance-construido.test.ts` — comentarios reenvueltos.
- `tests/e2e/busqueda.spec.ts` — la importación de la ayuda, con las ayudas locales.

**Revisión.** Parches: 15 (high 0, medium 1, low 14). Diferidos: 0 nuevos (el de la pasada 1 sigue en el frontmatter y ahora también en `deferred-work.md`). Rechazados: 13. Recomendación de revisión de seguimiento: `true` (puntuación 3 × 1 + 14 = 17 ≥ 5; ningún parche high).

**Verificación.**
- `npx vitest run` uno por uno: `cierre-de-los-autores` 3, `portada-temas-colecciones-autores` 8, `alcance-construido` 6, `alcance` 26, `medicion` 686, `espinas-de-ux` 14, `ingreso-construido` 42, `publicable-y-alcanzable` 46, `colecciones-build` 18, `obras-de-la-portada` 11, `dos-jornadas` 7, `peso` 63, `cita-del-dia` 45 — 975 en verde.
- `npx astro check` — 0 errores, 0 avisos, 8 pistas.
- `npm run build` con el Corpus del árbol — termina con 0; «NFR-5: 5115 superficies publicadas, todas a 3 saltos o menos de la portada; las 37398 aristas del modelo están en dist/», sin aviso «NFR-5 en el modelo»; la portada lleva 8 filas `autores-de-portada` y «Los 135 autores, de la A a la Z».
- `npx playwright test tests/e2e/temas-colecciones-autores-de-la-portada.spec.ts tests/e2e/portada.spec.ts tests/e2e/seo.spec.ts` — 75 en verde, 5 saltadas (la copia solo en `escritorio`); `tests/e2e/busqueda.spec.ts -g portada` — 8 en verde; `tests/e2e/accesibilidad.spec.ts` completo — 294 en verde.
- Puertos 4321, 4405 y 8787 libres antes y después.

**Riesgos residuales.** El diferido de la pasada 1, sin cambios: los destacados cambian con los recuentos y una orden puede sacar de los ocho al Autor que acerca una Cita ya fuera del modelo; hoy no hay ninguna. No se corrió `npm test` entero (los trece ficheros de la Verificación sí).

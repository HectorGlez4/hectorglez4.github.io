---
title: 'Historia 29.3 — El verso en toda superficie y todo lo que sale'
type: 'feature'
created: '2026-11-08'
status: 'done'
baseline_revision: '3906b28d503978ab8efd55311110bd70c7644436'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-29-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-29-1-el-salto-de-verso-sobrevive-en-el-corpus-el-cotejo-y-el-slug.md'
warnings: [oversized]
deferred:
  - summary: >-
      «Yo soy un hombre sincero», que la AC de la Página de Cita a 360 × 640 nombra como Cita en verso de la auditoría, está en el censo (`corpus/pendientes-de-cotejo.yml`, sin documento) y nunca llevará saltos mientras siga ahí.
    evidence: |-
      corpus/citas/jose-marti--yo-soy-un-hombre-sincero-de-donde.md trae «Yo soy un hombre sincero de donde crece la palma.» con procedencia tecleada; no figura entre las 75 Citas que la 29.1 contó con saltos. Documentarla (y, con ello, restituir sus saltos) es curar el Corpus real: pendiente de Héctor (`npm run documentar`), fuera de esta historia. La prueba usa «Yo vengo de todas partes» y una segunda Cita en verso de *Versos sencillos* sacada de los datos.
    location: tests/e2e/pagina-de-cita.spec.ts
    severity: low
  - summary: >-
      El barrido de axe de la portada no lleva una Cita en verso: la AC de NFR-9 la nombra, y ponerla exige fijar una jornada, que es de Héctor.
    evidence: |-
      tests/e2e/accesibilidad.spec.ts barre la Página de Cita en verso y su listado; la portada se construye con la Cita del Día de la rotación del día. `verso-construido.test.ts` prueba el marcado del componente en la portada, el 404 y el Kit, pero sin axe. Pendiente de Héctor: fijar una jornada con una Cita en verso apta (`npm run jornada -- fijar`) o aceptar la cobertura de la construcción de fixtures.
    location: tests/e2e/accesibilidad.spec.ts
    severity: low
  - summary: >-
      `public/islas/imagen.js` queda a 23 bytes de su tope (7.527 de 7.550): el pie de la 25.2 y el 9:16 de la 25.4 no caben sin subir `MAX_BYTES_GUION_DE_IMAGEN`, que es de Héctor.
    evidence: |-
      `wc -c public/islas/imagen.js` da 7.527; el tope está en `src/lib/umbrales.ts`. Antes de la 29.3 el margen era de 33 bytes, y la 29.3 ganó el sitio del reparto por versos recortando prosa de dos comentarios. La razón de AD-7 sigue escrita en la espina y en `ImagenDeCita.astro`.
    location: public/islas/imagen.js
    severity: low
---

<intent-contract>

## Intent

**Problem:** Desde la 29.1 el `texto` de una Cita puede guardar sus saltos de verso (U+000A), y desde la 29.2 una orden los restituye en 75 Citas publicadas; pero ninguna superficie sabe pintarlos: el HTML los pierde de corrido, los dos repartos de los lienzos parten por `\s+` y unen versos en una línea, y lo que no admite saltos (título, meta, JSON-LD, RSS) los escribiría crudos. Además, con un renglón por salto, tres Citas de Calderón (7 versos, tramo `md`) piden 631 px en una Tarjeta Social de 630.

**Approach:** Un módulo nuevo, `src/lib/verso.ts`, con los dos únicos dueños del verso en las salidas —`versosDe` (los versos, para el HTML y los lienzos de `src/`) y `enUnaLinea` (con « / », para lo que no admite saltos)—; un solo componente, `src/components/TextoDeCita.astro`, que pinta el texto en el Bloque de Cita, la Tarjeta de Cita y el material del Kit/lote; los dos repartos de los lienzos abren línea en cada salto; y la decisión de Héctor del 2026-11-08 como una regla de `src/lib/tramos.ts`, solo en la columna de la Tarjeta: si el bloque no cabe en el alto, el tramo siguiente más pequeño, hasta que quepa. Las pruebas unitarias van con fixtures; la medición y las pruebas sobre el Corpus real, tras el commit de restitución del orquestador.

## Boundaries & Constraints

**Always:**
- El texto no cambia una letra ni un signo (NFR-12); nada se recorta, encoge ni abrevia para que quepa, salvo la regla de la Tarjeta que decidió Héctor (tramo siguiente, nunca por slug, nunca por debajo de `sm`).
- `versosDe(texto: string): string[]` y `enUnaLinea(texto: string): string` son la API entera de `src/lib/verso.ts`, puras, sin opciones: `versosDe` parte por `\n` (un texto sin saltos da `[texto]`); `enUnaLinea` une `versosDe` con `' / '`. Las consumirán las Épicas 30, 31 y 34 sin reescribirlas: no se les añaden parámetros.
- Una Cita **sin saltos** sale con el mismo HTML que antes: `TextoDeCita.astro` emite exactamente `«{texto}»` (ningún elemento ni atributo nuevo). Con el Corpus de la rama (sin saltos hasta el commit de restitución) ningún `.html` de `dist/` difiere de la construcción de antes, salvo lo que la historia cambia a propósito y se nombre (no se espera nada).
- Con saltos, cada verso es un `<span class="verso" style="display:block">` dentro del elemento del texto de hoy (`h1`/`p.texto`, `span.fragmento`, `blockquote.texto`), con un nodo de texto `' '` entre dos `span` (Pagefind y el nombre accesible leen un espacio), « dentro del primero y » dentro del último. El `display:block` va en atributo y no en un `<style>` del componente por lo mismo que `Sostener.astro`: Astro emite el `<style>` de todo componente importado aunque no se pinte, y cambiaría el CSS de toda página. Ni color ni tipografía en el componente: el verso hereda `quote-*` del tramo y la serif del elemento padre.
- Los dos repartos de los lienzos —`repartirEnLineas` de `src/lib/lienzo.ts` (usa `versosDe`) y el privado de `public/islas/imagen.js` (parte por `'\n'` él mismo: no importa de `src/`)— reparten cada verso por palabras con su medida y nunca unen dos versos en una línea. `imagen.js` queda **≤ `MAX_BYTES_GUION_DE_IMAGEN` (7.550)**; hoy pesa 7.517: se gana el sitio recortando prosa de sus comentarios, nunca subiendo el tope.
- Lo copiado y compartido es `textoParaCopiar` (que ya pasa el `\n` tal cual) en texto plano; no se recompone en ningún isla.

**Block If:**
- `imagen.js` no cabe en 7.550 bytes ni recortando comentarios (subir el tope no es de esta historia).
- Con la regla de la Tarjeta, una Cita publicada que admite Imagen (con los saltos que le compondría `textoConSaltos`) no cabe ni en `sm`: la prueba la nombra y decide Héctor.
- Tras el commit de restitución, una Cita de hasta `MAX_CARACTERES_IMAGEN` deja de caber en la Imagen cuadrada (prueba de cabida): no se fusiona hasta que Héctor decida `tramos.ts`; marcar en `sprint-status.yaml` en un comentario, a mano.
- NFR-7 empeora en la Página de Cita en verso frente a la de una sin saltos: el merge espera a Héctor.

**Never:**
- Restituir saltos en el Corpus real, correr la 29.2 sin `--seco`, `documentar` Citas reales, ni editar `corpus/` para poner en verde una prueba.
- Tocar `pixelesEnImagen`/`pixelesEnPieza`, los cortes de la tabla o `MAX_CARACTERES_IMAGEN`; cambiar el tramo de la Página de Cita, la Imagen o la Pieza; componer sin texto la Tarjeta de una Cita que admite Imagen.
- `<br>` en el Corpus, « / » en el HTML o en los lienzos, un segundo reparto de versos fuera de `verso.ts` (salvo el de `imagen.js`), recortar por palabra o recortar la meta descripción (34.1).
- Tocar `src/lib/vocabulario.ts`, `src/lib/superficies.ts`, zonas, ni añadir guiones; mover las acciones de la Página de Cita (30.1).
- Editar `_bmad-output/planning-artifacts/` ni `_bmad-output/specs/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Sin saltos | «Todo necio confunde valor y precio.» | HTML, título, meta, JSON-LD, RSS, Tarjeta, Pieza e Imagen idénticos a antes | — |
| Verso | «Yo vengo de todas partes,\nY hacia todas partes voy:\nArte soy entre las artes,\nEn los montes, monte soy.» | 4 `span.verso`, « en el 1.º, » en el 4.º; `enUnaLinea` → «…partes, / Y hacia…»; copiado con 3 `\n` y «» — José Martí, Versos sencillos, 1891.» | — |
| Recorte del título | texto > 110 cuyo carácter 109 cae en o junto a un salto | corte en el mismo índice; sin `\n`, espacio ni « / » colgando antes de «…» | — |
| Fragmento de Tarjeta | texto > 120 con saltos | corte en el mismo índice (`trimEnd` ya quita el salto); versos del fragmento en `span.verso` | — |
| Verso largo | un verso más ancho que la línea del lienzo | sigue en la línea siguiente; nunca se une al verso siguiente | — |
| Tarjeta, Calderón | 7 versos, 177–179 caracteres (`md`, 38 px → 631 px) | se compone a 32 px (`sm`): 7·42 + 128 + 160 = 582 ≤ 630 | — |
| Tarjeta, cabe | Martí, 4 versos (`lg`, 528 px) | su tramo, 46 px | — |
| Tarjeta, nada cabe | texto sintético en verso (p. ej. 20 versos de una palabra) que no cabe ni en `sm` | `svgDeTarjeta` lanza; la ruta PNG añade el slug al mensaje; el build se para | build roto |
| Pieza | selección que cabe de corrido y no con saltos | `cabenEnPieza` → `{ cabe: false, maximo }`; la orden lo dice como hoy | código 1 |

</intent-contract>

## Code Map

- `src/lib/verso.ts` (nuevo) -- `versosDe`, `enUnaLinea`. Ningún otro fichero de `src/` o `public/islas/` parte un texto por `\n` (hoy solo `src/lib/biografia.ts:109`, que parte un documento de biografía y no un texto de Cita: exención nombrada en la guarda).
- `src/components/BloqueDeCita.astro:38-42` -- `«{cita.texto}»` en `h1.texto`/`p.texto`: pasa a `<TextoDeCita texto={cita.texto} />` dentro del mismo elemento. Lo usan la Página de Cita, `CitaDelDia.astro` (portada y 404).
- `src/components/TarjetaDeCita.astro:116-122,147` -- `LARGO_DE_FRAGMENTO = 120`, `slice(0,119).trimEnd()…`; el `span.fragmento` pasa a `<TextoDeCita texto={fragmento} />`. El nombre accesible: `.solo-para-lectores` «, » ya separa partes.
- `src/components/MaterialParaPublicar.astro:51-52` -- `blockquote.texto` del Kit y del lote.
- `src/pages/cita/[slug].astro:94,101` -- `recorte` de 110 (UTF-16 `.length`, `slice(0,109)`) y `descripcion` con el texto entero: los dos pasan por `enUnaLinea`, el recorte antes de componer, quitando una racha final de espacio que contenga `\n` (`/\s*\n\s*$/`): una Cita sin saltos no cambia ni un byte.
- `src/components/DatosEstructurados.astro:36` -- `text: cita.texto` → `enUnaLinea`.
- `src/lib/sindicacion.ts:117` -- `description` del RSS → `enUnaLinea`.
- `src/lib/atribucion.ts:87-101` -- `textoParaCopiar`: ya lleva el `\n`; solo pruebas. `src/lib/compartir.ts:119` (`textoParaCompartir` = `textoParaCopiar`), `src/islands/CopiarCita.astro`, `src/islands/ImagenDeCita.astro:227,267` (`data-texto-plano`, `textarea`), `src/islands/CompartirEnlace.astro:59,96`: no se tocan; un atributo HTML conserva el salto.
- `src/lib/lienzo.ts:97-118,130-138` -- `repartirEnLineas` (hoy `split(/\s+/)`): recorrer `versosDe(texto)` y repartir cada uno con el bucle de hoy; `palabrasQueDesbordan` ya parte por `\s+` (el `\n` lo es): solo prueba.
- `src/lib/tramos.ts:58-90` -- `TABLA` (xl 56, lg 46, md 38, sm 32 en `pixelesEnTarjeta`). Nueva `cuerpoEnTarjeta(texto, cabe: (cuerpo: number) => boolean): number | undefined`: `undefined` si no admite Imagen; sin saltos, el `pixelesEnTarjeta` de su tramo sin preguntar; con saltos, el `pixelesEnTarjeta` de `tramoDe(texto)` y, mientras `cabe` diga que no, el de cada fila siguiente de `TABLA`; `undefined` si ninguna. Es la regla entera de Héctor; la geometría la inyecta la Tarjeta.
- `src/lib/tarjeta.ts:61-121` -- `svgDeTarjeta`: hoy `cuerpo = tramo.pixelesEnTarjeta`; bloque = `2·80 + líneas·round(cuerpo·1,3) + 40 + 24 + 34 (+30)`. Pasa a pedir `cuerpoEnTarjeta(datos.texto, (c) => alto(c) <= ALTO)` con ese alto y a lanzar si da `undefined` con tramo que admite Imagen. Las líneas, de `repartirEnLineas(`«${texto}»`)` (ya con versos). La rama sin Imagen no cambia.
- `src/pages/tarjeta/[slug].png.ts:41-43` -- envolver `svgDeTarjeta` para que un fallo nombre `cita.slug` (pasarlo en `props`).
- `src/lib/pieza.ts:193-235,357-425` -- `bloqueDe`/`cabenEnPieza`/`desbordanALoAncho`: heredan los versos de `repartirEnLineas`; solo pruebas. `tools/lib/piezas.ts` dice ya «caben N».
- `public/islas/imagen.js:37-53,59-106` -- `repartirEnLineas(ctx, texto, ancho)` privado y `dibujar`. 7.517 bytes de 7.550 (`src/lib/umbrales.ts:517`, entrada `imagen` de `src/lib/guiones.ts:100-108`). Lo cargan `ImagenDeCita.astro` y `ImagenDelKit.astro` (`data-texto` con el `\n`).
- `tools/lib/tarjetaDelVerso.ts`, `tools/lineas.ts` (29.1) -- medición del alto **a su tramo** (la cifra de la decisión): no se tocan; la prueba de contraste de `tests/unit/lineas.test.ts` sigue valiendo (sin saltos `svgDeTarjeta` no cambia).
- Fixtures: `tests/unit/ayuda/lineas/wikisource-es--versos-sencillos--versos-sencillos-i.txt` (verso) y cómo `tests/unit/cotejo-build.test.ts` construye una Cita con saltos respaldada (la puerta del salto exige el documento en `corpus/fuentes/` del fixture). `tests/unit/ayuda/construir.ts` (`construirConCorpus`, `citaValida`, `paginaEnDist`), `tests/unit/ayuda/pagefind.ts` (`indiceDe`).
- E2E: `tests/e2e/ayuda/corpus.ts` (lo derivado del Corpus, nunca fijado), `copiar.spec.ts`, `pagina-de-cita.spec.ts`, `accesibilidad.spec.ts`, `imagen.spec.ts` (cómo se abre el diálogo y se carga `imagen.js`).
- Las 3 de Calderón (`pedro-calderon-de-la-barca-contra-vosotros-naciendo-aunque-si-naci-ya`, `…-entre-las-flores-se-quiebra-cuando-musico`, `…-ni-que-pueda-preguntarte-solo-dire-que`): sus textos con saltos salen de `textoConSaltos` sobre su documento de `corpus/fuentes/` (`npx tsx tools/lineas.ts tarjeta` los localiza); se copian literales a la prueba.

## Tasks & Acceptance

**Execution:**
- `src/lib/verso.ts` (nuevo) -- `versosDe`, `enUnaLinea`, con cabecera que diga que son los dos dueños (AD-29) -- API pequeña para 30, 31 y 34.
- `src/components/TextoDeCita.astro` (nuevo) -- prop `texto: string`; un verso → `«{texto}»` tal cual; varios → los `span.verso` del contrato con `' '` entre ellos; sin `<style>`, sin guion -- único pintor del texto.
- `src/components/BloqueDeCita.astro`, `src/components/TarjetaDeCita.astro`, `src/components/MaterialParaPublicar.astro` -- usar `TextoDeCita` dentro de su elemento de hoy -- ninguno parte el texto.
- `src/pages/cita/[slug].astro`, `src/components/DatosEstructurados.astro`, `src/lib/sindicacion.ts` -- `enUnaLinea` en título (tras el recorte de 110 y la limpieza de la racha final con salto), meta descripción, `text` y `description` -- lo que no admite saltos.
- `src/lib/lienzo.ts` -- `repartirEnLineas` por versos -- Tarjeta y Pieza.
- `src/lib/tramos.ts` -- `cuerpoEnTarjeta` con un comentario que cite la decisión de Héctor del 2026-11-08 -- la regla, solo en la columna de la Tarjeta.
- `src/lib/tarjeta.ts`, `src/pages/tarjeta/[slug].png.ts` -- cuerpo por `cuerpoEnTarjeta`; lanzar si nada cabe; el slug en el mensaje -- FR-19 con verso.
- `public/islas/imagen.js` -- reparto por versos; recortar comentarios hasta ≤ 7.550 bytes -- AD-7.
- `tests/unit/verso.test.ts` (nuevo) -- `versosDe`/`enUnaLinea` (sin saltos, 2 y 4 versos); guarda: `split` por `\n` y `' / '` como separador de versos solo en `src/lib/verso.ts` y `public/islas/imagen.js` dentro de `src/` y `public/islas/` (exención nombrada: `src/lib/biografia.ts`); `TextoDeCita` solo lo importan los tres componentes del Code Map.
- `tests/unit/verso-construido.test.ts` (nuevo, **una** construcción con `construirConCorpus` y fixtures: la Cita de 4 versos de *Versos sencillos* I con su documento y su Obra, una de prosa, un Tema publicado con las dos, `jornada` fija con la de verso apta para portada) -- sobre `dist/`: Página de Cita (4 `span.verso`, «/» en primero/último, ningún `<br>` ni « / » en `<main>`), Tarjeta en el listado del Tema, Cita del Día de la portada y del 404, `/kit/`; título y meta con « / » y sin `\n`; JSON-LD `text` y RSS `description` con « / »; Pagefind (`indiceDe`) encuentra la Cita por «arte»; la de prosa: `h1.texto` byte a byte `«…»` como antes.
- `tests/unit/tarjeta-de-cita.test.ts` -- fragmento de dos versos: un `span.verso` por verso, el nombre accesible es el texto visible en orden con «, » solo para lectores; añadir el uso nuevo si la prueba enumera usos.
- `tests/unit/lienzo.test.ts` -- `repartirEnLineas` con saltos: una línea nunca contiene final de un verso y principio del siguiente; verso largo en dos líneas; sin saltos idéntico a hoy; `palabrasQueDesbordan` igual con `\n` que con espacio.
- `tests/unit/imagen-verso.test.ts` (nuevo) -- `import` de `public/islas/imagen.js`; `dibujar` con un lienzo simulado (`getContext` que registra cada `fillText`, `measureText` fijo `{ width: caracteres·10 }`, `fillRect`, `font`/`fillStyle` asignables): ninguna línea del texto une dos versos; sin saltos, las mismas líneas que hoy; y el tamaño en bytes del fichero ≤ `MAX_BYTES_GUION_DE_IMAGEN`.
- `tests/unit/tarjeta.test.ts` -- `cuerpoEnTarjeta` (su tramo si cabe; baja una fila; `undefined` si nada; `undefined` sin Imagen; sin saltos, su tramo aunque `cabe` diga que no); las 3 de Calderón (textos literales con saltos): cuerpo 32 y bloque ≤ 630 leído del SVG (`font-size` y el `y` del último `<text>` antes de la marca); Martí de 4 versos: cuerpo 46; un texto sin saltos de cada tramo: SVG idéntico al de antes (cuerpo de su tramo); el texto sintético en verso que no cabe: lanza; y un barrido del Corpus real (citas publicadas que admiten Imagen, con `textoConSaltos` sobre `documentoParaLosSaltos` de `documentosDeCita`, como `tools/lineas.ts tarjeta`): todas tienen cuerpo y caben, y si no, falla nombrando el slug (una de prosa que no cupiera se nombra igual: decide Héctor) -- vale antes y después de la restitución.
- `tests/unit/pieza.test.ts` -- el apilado con Citas en verso (fixtures): cada verso abre línea, una selección que cabe de corrido no cabe con saltos y `maximo` lo dice; el SVG no une dos versos.
- `tests/unit/sindicacion.test.ts`, la prueba de `DatosEstructurados` si existe, o `verso-construido.test.ts` -- « / » donde toca.
- `tests/e2e/ayuda/corpus.ts` -- `citasEnVerso()` (publicadas con `\n` en `texto`, con su tramo y versos), `citaMasLargaPorTramo()` y `citaEnVersoMasLargaPorTramo()` (por caracteres y, aparte, por versos) -- derivado del Corpus del que se construyó el sitio, nunca slugs fijados (salvo «Yo vengo de todas partes», que la AC nombra).
- `tests/e2e/copiar.spec.ts` -- una Cita en verso de `citasEnVerso()`: el portapapeles trae `textoParaCopiar` con sus `\n`.
- `tests/e2e/pagina-de-cita.spec.ts` -- a 360 × 640, «Yo vengo de todas partes» y otra de *Versos sencillos* de `citasEnVerso()`: el `h1` es lo primero visible sin desplazar; el `left` de la primera palabra de cada `span.verso` (un `Range` sobre sus primeros caracteres) = el `left` del `h1` (±1 px); a 320 px, `scrollWidth ≤ clientWidth`. Si no hay Cita en verso, falla diciendo que falta el commit de restitución.
- `tests/e2e/accesibilidad.spec.ts` -- el barrido incluye una Cita en verso en su Página, en un listado (su Tema o su Obra) y en la portada (fijándola o comprobando que su Tarjeta sale en la portada; si la portada no puede llevarla sin fijar una jornada, el barrido de la portada con el componente se cubre en `verso-construido.test.ts` y se dice aquí).
- `tests/e2e/cabida-de-imagen.spec.ts` (nuevo; la 25.2 y la 25.4 le añaden pie y 9:16) -- con Source Serif cargada (`document.fonts.load`), para la Cita más larga de cada tramo que admite Imagen y las Citas en verso más largas de cada tramo (que tenga): carga `/islas/imagen.js`, llama a `dibujar` con los datos de la isla de su página (`data-texto`, `data-tamano`, autor, procedencia, marca) en formato cuadrado, espía `fillText` y `measureText`, y exige que todo texto y atribución quepan en `[MARGEN, 1080 − MARGEN]` a lo ancho y acaben por encima de la marca (`1080 − 96`); falla si no encuentra ninguna Cita en verso.
- `AGENTS.md` -- «Conventions that differ from defaults»: los dos dueños del verso (`TextoDeCita.astro` con `versosDe` para el HTML y `enUnaLinea` para lo que no admite saltos, en `src/lib/verso.ts`), los repartos de los lienzos que abren línea en cada salto, y la regla de la Tarjeta (`cuerpoEnTarjeta`, decisión de Héctor del 2026-11-08); «Componer una Pieza de Canal»: el apilado cuenta los versos.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` -- solo la línea de la 29.3.
- Este spec -- rellenar «Medidas tras la restitución» (abajo) cuando el orquestador haya hecho su commit.

**Acceptance Criteria:**
- Given la construcción de fixtures de `verso-construido.test.ts`, when se lee `dist/`, then la Cita en verso sale verso a verso con un solo componente en la Página de Cita, la Tarjeta del listado, la Cita del Día de portada y 404 y el Kit; la de prosa, con el mismo `«…»` de antes; y Pagefind la encuentra por «arte».
- Given el Corpus de la rama sin saltos, when se construye antes y después de la historia (`npm run build` con `FECHA_JORNADA` fija, por `correr.sh`, el «antes» desde un `git worktree add --detach` bajo `.claude/v9-ralph/tmp-wt/`), then `diff -rq` de los `.html` no da ninguna diferencia y las Tarjetas PNG son idénticas byte a byte.
- Given las 3 Citas de Calderón con sus saltos, when se compone su Tarjeta, then lleva el cuerpo de `sm` y el bloque cabe en 630 px; y ninguna Cita publicada que admite Imagen se queda sin cuerpo con sus saltos.
- Given `imagen.js`, when se mide, then pesa ≤ 7.550 bytes y ninguna línea dibujada une dos versos.
- Given `npx astro check`, then 0 errores; `tests/unit/tipografia-en-tokens.test.ts` pasa sin permitidos nuevos.
- Given el commit de restitución del orquestador en la rama, when corren `cabida-de-imagen`, `copiar`, `pagina-de-cita` y `accesibilidad` (`--project=escritorio` y el de móvil donde aplique), then pasan, y el spec anota: el resultado de cabida por tramo; el alto del texto y la `y` de Copiar a 360 × 640 de las dos Citas de *Versos sencillos* antes (construcción sin saltos) y después (para la 30.1); y NFR-7 con Lighthouse —una Cita en verso y una sin saltos, receptor local, medias de corridas alternas como en la 26.11— con sus cifras.

## Design Notes

**Orden de trabajo y Corpus.** Este árbol no tiene todavía la restitución real de la 29.2 ni las 75 Citas con saltos: llegan con un commit del orquestador. Todo lo de Vitest va con fixtures y se verifica ya; el barrido de la Tarjeta sobre el Corpus real usa `textoConSaltos`, así que vale antes y después. Lo que exige el Corpus real con saltos —la prueba de cabida, las e2e del verso, las medidas para la 30.1 y Lighthouse— se corre **después** de ese commit, y hasta entonces esas pruebas fallan diciendo que falta la restitución (no se saltan en silencio). El «antes» de las medidas de la 30.1 se toma ya, sobre la construcción sin saltos.

**La regla de la Tarjeta, como código:**

```ts
// tramos.ts
export function cuerpoEnTarjeta(texto: string, cabe: (cuerpo: number) => boolean): number | undefined {
  const tramo = tramoDe(texto);
  if (!tramo.admiteImagen) return undefined;
  if (versosDe(texto).length === 1) return tramo.pixelesEnTarjeta; // la decisión es para el verso
  const desde = TABLA.findIndex((fila) => fila.tramo === tramo);
  return TABLA.slice(desde).map((f) => f.tramo.pixelesEnTarjeta).find(cabe);
}
```

Héctor la decidió para «una Cita en verso»: un texto sin saltos conserva su tramo por construcción, cabe o no (hoy toda Tarjeta de prosa con Imagen cabe; si el barrido encontrara una que no, se anota aquí y no se toca). La prueba «sin saltos, idéntico» lo fija.

**Por qué la marca de Pagefind es un espacio entre `span`.** `display:block` separa a la vista, pero el texto que extrae Pagefind y el nombre accesible salen de los nodos de texto; sin el `' '` explícito, «voy:Arte» sería una palabra.

## Verification

**Commands:**
- `npx vitest run tests/unit/verso.test.ts`, `verso-construido.test.ts`, `tarjeta.test.ts`, `tarjeta-de-cita.test.ts`, `lienzo.test.ts`, `imagen-verso.test.ts`, `pieza.test.ts`, `pieza-cli.test.ts`, `pieza-coleccion-cli.test.ts`, `sindicacion.test.ts`, `tarjeta-construida.test.ts`, `tipografia-en-tokens.test.ts`, `lineas.test.ts`, `medicion.test.ts`, `busqueda-con-filtros.test.ts` -- uno a uno, en verde.
- `npx astro check` -- 0 errores.
- `npm run build` antes/después por `correr.sh` y `diff -rq` de `.html` -- sin diferencias; `wc -c public/islas/imagen.js` ≤ 7550.
- `npm test` entero por `correr.sh` -- en verde.
- Tras el commit de restitución: `npx playwright test tests/e2e/cabida-de-imagen.spec.ts tests/e2e/copiar.spec.ts tests/e2e/pagina-de-cita.spec.ts tests/e2e/accesibilidad.spec.ts` por proyecto (puertos libres según las reglas) -- en verde; Lighthouse a mano.

## Medidas tras la restitución

Tomadas el 2026-11-08 sobre 3906b28d50 (la restitución real: 75 Citas publicadas con saltos).

**E2E** (`npx playwright test tests/e2e/cabida-de-imagen.spec.ts tests/e2e/copiar.spec.ts
tests/e2e/pagina-de-cita.spec.ts tests/e2e/accesibilidad.spec.ts`, los dos proyectos, receptor
local en 8787): **426 pasan, 6 se saltan, 0 fallan** (5,6 min), sin repetir ningún fichero.

**Cabida de la Imagen cuadrada por tramo** (Source Serif cargada, `dibujar` de
`public/islas/imagen.js` con los datos de la isla, `fillText` espiado): todas caben a lo ancho en
`[96, 984]` y acaban por encima de la marca.

| tramo | la más larga | en verso, la más larga | en verso, la de más versos |
|---|---|---|---|
| xl | antonio-machado-no-te-importe-con-el-barro-de (en verso) | la misma | antonio-machado-confiemos-en-que-no-sera-verdad-nada |
| lg | baltasar-gracian-insufrible-tormento-es-de-un-animo-heroico | gonzalo-de-berceo-quanto-aqui-vivimos-en-ageno-moramos-la | antonio-machado-al-andar-se-hace-camino-y-al |
| md | santiago-ramon-y-cajal-aun-los-medianamente-dotados-desde-el-punto | luis-de-gongora-goza-cuello-cabello-labio-y-frente-antes | pedro-calderon-de-la-barca-contra-vosotros-naciendo-aunque-si-naci-ya |
| sm | ninguna Cita publicada cae en el tramo | — | — |

Ninguna Cita de hasta `MAX_CARACTERES_IMAGEN` deja de caber: no hay nada que decidir en
`tramos.ts`. La Tarjeta Social: el barrido del Corpus real de `tests/unit/tarjeta.test.ts` da cuerpo
y cabida a toda Cita que admite Imagen; las 3 de Calderón se componen a 32 px (582 px de 630).

**Para la 30.1 — alto del texto y `y` de Copiar a 360 × 640** (Chromium, `deviceScaleFactor`
2,625, fuentes cargadas; «antes» es el código de antes sobre el mismo Corpus, que pinta los versos
de corrido):

| Cita | `y` del texto | alto antes | alto después | `y` de Copiar antes | `y` de Copiar después |
|---|---|---|---|---|---|
| jose-marti-yo-vengo-de-todas-partes-y-hacia | 153 | 189 | 265 | 756 | 832 |
| jose-marti-con-los-pobres-de-la-tierra-quiero-2 | 153 | 227 | 265 | 794 | 832 |

Copiar queda por debajo del pliegue de 640 en las dos, antes y después: lo que la 30.1 mueve.

**NFR-7** (`npx -y lighthouse@13.5.0`, perfil móvil, `--throttling-method=simulate`, solo
rendimiento, Google Chrome 156.0.8078.80 sin cabeza). `origin/main` (2566e227b4) y la rama (el árbol
de la 29.3 sobre 3906b28d50), las dos construidas en local con `MEDICION_ENDPOINT=http://localhost:8787/`
y un receptor de prueba en 8787 que contesta 204 a todo; servidas con `tests/servidor.mjs`
(`SERVIDOR_CACHE_CONTROL=max-age=600`, `SERVIDOR_GZIP=1`, 4399 y 4400). 10 corridas por página y
construcción, alternando principal y rama:

| página | construcción | LCP media | FCP media | rendimiento |
|---|---|---|---|---|
| Cita en verso (`/cita/jose-marti-yo-vengo-de-todas-partes-y-hacia/`) | `origin/main` | 1.537 ms | 910 ms | 100 |
| Cita en verso | rama | 1.538 ms | 910 ms | 100 |
| Cita sin saltos (`/cita/miguel-de-cervantes-la-libertad-sancho-es-uno-de-los/`) | `origin/main` | 1.602 ms | 880 ms | 100 |
| Cita sin saltos | rama | 1.583 ms | 877 ms | 100 |

Veredicto **ok**: LCP de la Página de Cita muy por debajo de 2.500 ms, ninguna media por encima de
la principal + máx(100 ms, 5 %), y la Cita en verso no empeora frente a la de prosa (1.538 frente a
1.583 ms en la rama). No hizo falta el desempate con `devtools`.

## Spec Change Log

- **Antes/después del HTML, sobre el Corpus restituido y no sobre uno sin saltos.** El «antes» que
  pedía la AC (Corpus de la rama sin saltos, 251406f3d4) ya no construye: desde la 29.2 la puerta
  del cotejo rompe ante una Cita de documento de verso sin sus saltos. Las dos construcciones se
  hicieron sobre 3906b28d50 (`FECHA_JORNADA=2026-11-08`, `npm run build`, dos `git worktree add
  --detach` bajo `.claude/v9-ralph/tmp-wt/`): el código de antes y el de la 29.3. `diff -rq`: 525
  `.html` difieren y **los 525 son exactamente las páginas que llevan `span.verso`** (las Páginas de
  Cita de las 75 y los listados, portada, Kit… que las pintan); ninguna página sin verso difiere.
  72 Tarjetas PNG difieren, todas de Citas en verso (las 75 menos 3 que no admiten Imagen); toda
  Tarjeta de prosa es idéntica byte a byte. Difieren además `islas/imagen.js` (el reparto),
  `rss.xml` (una Cita en verso entre sus jornadas) y los ficheros de Pagefind (sus hashes).
- **La Tarjeta de Cita del listado con versos se prueba en `verso-construido.test.ts`**, en la misma
  construcción que el resto (versos del fragmento y corte de 120 en el mismo índice), y no en
  `tarjeta-de-cita.test.ts`: ese fichero enumera usos de `<TarjetaDeCita`, y la 29.3 no añade
  ninguno. El nombre accesible lo cubre el barrido de `accesibilidad.spec.ts` con el listado en verso.
- **La guarda de `tests/unit/lineas.test.ts`** («las cinco formas solo se escriben como literal en
  `tools/lib/lineas.ts`») se estrecha para no leer `class="verso"` como la forma `verso`: es la
  clase que el contrato de esta historia impone a `TextoDeCita.astro`.
- **La portada en el barrido de `accesibilidad.spec.ts`** no lleva una Cita en verso: haría falta
  fijar una jornada, que es de Héctor. El componente en la portada, el 404 y el Kit lo cubre
  `verso-construido.test.ts` (y se dice en la prueba).

## Review Triage Log

### 2026-11-08 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

(Sin hallazgos externos en la invocación: las capas de revisión las corre el orquestador después.)

### 2026-11-08 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 10: (high 0, medium 5, low 5)
- defer: 2: (high 0, medium 0, low 2)
- reject: 25: (high 0, medium 3, low 22)
- addressed_findings:
  - `[medium]` `[patch]` La prueba de cabida de la Tarjeta repetía a mano la cuenta del dibujo (blind-hunter, verification-gap, ac-auditor). `svgDeTarjeta` saca de una sola `disposicion(c)` las líneas, el alto del texto y lo que sobra arriba al centrar, y el predicado de `cuerpoEnTarjeta` es `arriba >= MARGEN`, la misma cuenta que coloca `inicio` (equivalente exacta a la de antes: ningún SVG cambia). `tests/unit/tarjeta.test.ts` lee del SVG el `y` de la atribución y de la marca (`caeSobreLaMarca`) para Calderón, Martí, un bloque al límite en cada cuerpo y el barrido del Corpus; cambiar el `+ 76` de la procedencia la pone en rojo (comprobado).
  - `[medium]` `[patch]` El barrido de la Tarjeta no podía nombrar una Cita de prosa que no cupiera (blind-hunter, edge-case-hunter, ac-auditor): ahora juzga lo dibujado de toda Tarjeta, prosa incluida, y nombra el slug. Ninguna sale.
  - `[medium]` `[patch]` La prueba de cabida de la Imagen elegía sus casos por caracteres y por versos (blind-hunter, edge-case-hunter): mide la más larga de cada tramo y **toda** Cita en verso que admite Imagen (75 casos por proyecto).
  - `[medium]` `[patch]` El formato vertical de `imagen.js` no se medía (blind-hunter, edge-case-hunter): cada caso dibuja los dos formatos y juzga cada uno contra su franja y su ancho útil.
  - `[low]` `[patch]` Cotas que faltaban en la cabida (blind-hunter): el margen de arriba de la franja y que la línea base sea `top`, que la cuenta supone.
  - `[medium]` `[patch]` El nombre de la Tarjeta de Cita con versos no se fijaba (intent-alignment, ac-auditor): `verso-construido.test.ts` exige que el texto del enlace del listado sea el visible, en orden, con los versos separados por un espacio y «, » solo para lectores delante del Autor y de la Obra.
  - `[low]` `[patch]` El respaldo del diálogo de Imagen y Compartir no tenían prueba con verso (intent-alignment, ac-auditor): la misma construcción exige `textoParaCopiar` con sus saltos en `data-texto-plano`, en el `textarea` y en el `data-texto` de Compartir.
  - `[low]` `[patch]` La guarda de los dos dueños se saltaba con `replace`, `replaceAll`, una expresión regular o `fromCharCode(10)`, y eximía `biografia.ts` entero (blind-hunter, edge-case-hunter): `tests/unit/verso.test.ts` enumera cada uso del salto en `src/` y `public/islas/` y nombra las exenciones una a una (las dos de `biografia.ts` y el recorte del título de `[slug].astro`).
  - `[low]` `[patch]` La exención de `tests/unit/lineas.test.ts` valía para `class=` delante de cualquiera de las cinco formas (blind-hunter): solo exime `class="verso"` de `TextoDeCita.astro`.
  - `[low]` `[patch]` La prueba de 360 × 640 heredaba el tamaño del proyecto (blind-hunter): lo fija antes de navegar.

## Auto Run Result

Status: done
Blocking condition: ninguna.

**Resumen.** El verso se pinta en toda superficie y en todo lo que sale. `src/lib/verso.ts` da los dos
dueños (`versosDe`, `enUnaLinea`); `TextoDeCita.astro` es el único pintor del texto (Bloque de Cita,
Tarjeta de Cita, material del Kit/lote), byte a byte igual sin saltos; título, meta, JSON-LD y RSS van en
una línea con « / »; los dos repartos de los lienzos abren línea en cada salto; y la regla de Héctor del
2026-11-08 vive en `cuerpoEnTarjeta` (solo la Tarjeta de una Cita en verso baja de tramo; si nada cabe, el
build se para nombrando la Cita). `imagen.js` pesa 7.527 bytes (tope 7.550, sin tocar) recortando prosa
de dos comentarios.

**Ficheros.**
- `src/lib/verso.ts` (nuevo) — `versosDe` y `enUnaLinea`.
- `src/components/TextoDeCita.astro` (nuevo) — el texto de la Cita, verso a verso en `span.verso`.
- `src/components/BloqueDeCita.astro`, `TarjetaDeCita.astro`, `MaterialParaPublicar.astro` — usan `TextoDeCita`.
- `src/pages/cita/[slug].astro` — título (recorte de 110 sin salto colgando) y meta con `enUnaLinea`.
- `src/components/DatosEstructurados.astro`, `src/lib/sindicacion.ts` — `text` y `description` con `enUnaLinea`.
- `src/lib/lienzo.ts` — `repartirEnLineas` por versos.
- `src/lib/tramos.ts` — `cuerpoEnTarjeta`, la regla de la Tarjeta del verso.
- `src/lib/tarjeta.ts`, `src/pages/tarjeta/[slug].png.ts` — cuerpo por la regla; lanza si nada cabe, con el slug.
- `public/islas/imagen.js` — reparto por versos; comentarios recortados.
- Pruebas: `tests/unit/verso.test.ts`, `verso-construido.test.ts`, `imagen-verso.test.ts` (nuevas);
  `tarjeta.test.ts`, `lienzo.test.ts`, `pieza.test.ts`, `sindicacion.test.ts`, `lineas.test.ts` (guarda
  estrechada); `tests/e2e/cabida-de-imagen.spec.ts` (nueva), `copiar`, `pagina-de-cita`, `accesibilidad`,
  `ayuda/corpus.ts`.
- `AGENTS.md` — convenciones del verso y el apilado de la Pieza; `sprint-status.yaml` — la línea de la 29.3.

**Revisión.** Sin hallazgos externos en esta pasada: 0 parches, 0 diferidos, 0 rechazados.
`followup_review_recommended: false` (puntuación 0).

**Verificación.** Los 15 ficheros de Vitest del spec, uno a uno, en verde (la guarda de `lineas.test.ts`
falló una vez por `class="verso"` y se estrechó); `npx astro check` 0 errores; `npm test` entero en verde
(160 ficheros, 7.359 pruebas, 28,5 min); antes/después de `dist/` y e2e, cabida, medidas para la 30.1 y
NFR-7 en «Medidas tras la restitución» y en el Spec Change Log.

**Riesgos.** La portada no se barre con axe con una Cita en verso (haría falta fijar una jornada); la
cubre la construcción de fixtures. Ningún Corpus de hoy cae en el tramo `sm`, así que la cabida de ese
tramo solo la prueban las pruebas unitarias.

### Pasada de revisión 1 (2026-11-08)

**Resumen.** Diez parches sobre la cabida y las guardas, sin cambiar ninguna salida: la Tarjeta
Social decide el cuerpo con la misma cuenta con que dibuja (`disposicion` en `svgDeTarjeta`, cuyo
predicado `arriba >= MARGEN` es equivalente exacto al de antes), y las pruebas juzgan lo dibujado
y no una copia de la fórmula; la cabida de la Imagen mide toda Cita en verso en los dos formatos;
se fijan el nombre de la Tarjeta de Cita con versos, lo copiado del respaldo de Imagen y de
Compartir, y las guardas de los dos dueños y de las cinco formas se estrechan a lo que eximen.

**Ficheros.**
- `src/lib/tarjeta.ts` — una sola `disposicion(c)` para la cabida y para colocar el bloque.
- `tests/unit/tarjeta.test.ts` — `geometria` lee atribución y marca; `caeSobreLaMarca`; bloque al límite por cuerpo; el barrido juzga lo dibujado (prosa incluida).
- `tests/unit/verso-construido.test.ts` — texto del enlace de la Tarjeta de Cita; `data-texto-plano`, `textarea` y Compartir con saltos.
- `tests/unit/verso.test.ts` — la guarda enumera cada uso del salto y nombra las exenciones.
- `tests/unit/lineas.test.ts` — solo `class="verso"` de `TextoDeCita.astro` queda exento.
- `tests/e2e/cabida-de-imagen.spec.ts` — toda Cita en verso, los dos formatos, margen de arriba y línea base.
- `tests/e2e/pagina-de-cita.spec.ts` — fija 360 × 640 antes de navegar.

**Revisión.** 10 parches (5 medios, 5 bajos), 2 diferidos (bajos, de Héctor: axe de la portada con
verso y el margen de bytes de `imagen.js`), 25 rechazados. La regla de la Tarjeta es la decisión
delegada de Héctor del 2026-11-08 (spec de la 29.1): los hallazgos de que «la eligió el agente» se
rechazan. `followup_review_recommended: true` (parches: 0 altos, 5 medios, 5 bajos; 3·5 + 5 = 20).

**Verificación.** `npx vitest run` de `tarjeta`, `verso`, `verso-construido`, `lineas`, en verde (una
mutación del `+ 76` de la procedencia pone `tarjeta.test.ts` en rojo); `npx astro check` 0 errores;
`npx playwright test tests/e2e/cabida-de-imagen.spec.ts tests/e2e/pagina-de-cita.spec.ts` en los dos
proyectos: 230 pasan, 6 se saltan (75 casos de cabida en verso por proyecto, los dos formatos);
`npm test` entero en verde (160 ficheros, 7.365 pruebas, 22,7 min).

**Riesgos.** El margen del bloque al límite frente al ojo de la marca es de 2 px a 32 px: la prueba
lo vigila, pero cualquier retoque de la marca o de la atribución lo agota. La portada sigue sin
barrido de axe con verso.

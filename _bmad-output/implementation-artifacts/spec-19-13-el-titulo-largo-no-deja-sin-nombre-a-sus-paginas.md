---
title: 'Historia 19.13 — Un título largo no deja sin nombre a las páginas de su obra'
type: 'bugfix'
created: '2026-10-02'
status: 'in-progress'
baseline_commit: '91845c3af8deacb774e9675483193323e4edc8b2'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** el nombre de un documento es `{fuente}--{slug-de-obra}--{slug-de-página}`, y cada segmento se acota a 60 caracteres sin partir palabra. Cuando el título de la obra ya agota ese largo, el título de la página —que en Wikisource es «Obra/Subpágina» entero— se recorta hasta quedar **idéntico** al de la obra, y el nombre colapsa a `{fuente}--{slug-de-obra}`. Medido el 24/09: las 21 subpáginas de «Coloquios espirituales y sacramentales y poesías sagradas» compiten por un solo fichero; `recuperar` se niega con razón y de la obra entera solo se pudo versionar una página. Fernán González de Eslava publicó 1 Cita con veinte páginas suyas sin mirar.

**Approach:** cuando el recorte deje el segmento de página igual al de la obra, el segmento se construye con **lo que distingue a esa página**: lo que la Fuente escribe tras la última barra de su título declarado. Es declaración suya, no inferencia de ruta. El resto del nombre no cambia.

## Boundaries & Constraints

**Always:**
- El segmento sale del **título que la página declara**, nunca de la URL ni del nombre del fichero.
- El caso que ya funcionaba no se renombra: una página que **es** la obra sigue colapsando a un solo segmento, y Gutenberg sigue con uno.
- Ningún documento ya versionado se renombra: `recuperar` reutiliza por URL, y el nombre de un fichero del Corpus es su identidad.
- Dos páginas que sigan coincidiendo al acotar siguen chocando, y `recuperar` sigue negándose: esta historia no afloja esa puerta.

**Ask First:**
- Renombrar el documento de los Coloquios ya versionado para que haga juego con los que vengan.
- Subir `MAX_CARACTERES_SLUG_DE_OBRA`.

**Never:**
- Derivar el nombre de la ruta de la URL, ni del nombre del índice del escaneo.
- Numerar o desambiguar añadiendo un sufijo inventado: dos páginas con el mismo nombre se rechazan, no se renumeran.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Obra larga con subpágina | obra «Coloquios…sagradas», página «Coloquios…sagradas/Canción divina» | `…--coloquios-…-sagradas--cancion-divina` | N/A |
| La página es la obra | «El sable» y «El sable» | Un solo segmento, como hoy | N/A |
| Difieren solo en mayúsculas | «Respuesta a Sor Filotea» / «…a sor Filotea» | Un solo segmento, como hoy | N/A |
| Dos colas que coinciden al acotar | dos subpáginas de título casi igual | Mismo nombre; `recuperar` se niega | Se niega, como hoy |
| Cola sin ninguna letra | «Obra larga/···» | Cae al nombre de un segmento | N/A |
| Obra corta con subpágina | «Los jardines interiores/Triste» | Dos segmentos, como hoy | N/A |
| Fuente sin paginar | Gutenberg | Un segmento, como hoy | N/A |

</frozen-after-approval>

## Code Map

- `tools/lib/documento.ts:2087` -- `nombreDeDocumento`: compone los segmentos y colapsa cuando el de página iguala al de obra (:2097). Ahí entra la regla.
- `tools/lib/documento.ts:2058` -- `segmentoDeNombre`: acota a `MAX_CARACTERES_SLUG_DE_OBRA` (:2048, 60) sin partir palabra, y devuelve `undefined` cuando no queda ni una letra. **No se toca**.
- `tools/recuperar.ts` -- quien pide el nombre y quien rechaza la colisión; el rechazo se conserva tal cual.
- `tests/unit/documento.test.ts` -- las pruebas de `nombreDeDocumento` de la 11.2, con el caso «Triste»/«Tibi Regina».
- Medido el 02/10 sobre los 309 documentos de Wikisource-es versionados: **uno solo** tiene hoy el nombre colapsado por esta causa, el de los Coloquios. Otros cuatro colapsan correctamente, porque obra y página solo difieren en mayúsculas.

## Tasks & Acceptance

**Execution:**
- [ ] `tests/unit/documento.test.ts` -- pruebas de la matriz, que fallen antes del cambio.
- [ ] `tools/lib/documento.ts` -- la regla en `nombreDeDocumento`, con comentario: qué distingue a la página, por qué de su título declarado y no de la ruta, y la cifra medida.
- [ ] `_bmad-output/specs/spec-brainlySabiduria/.memlog.md` -- hallazgo y decisión.

**Acceptance Criteria:**
- Given dos subpáginas cualesquiera de los Coloquios, when se piden sus nombres, then son distintos entre sí y distintos del de la obra.
- Given los 309 documentos de Wikisource-es ya versionados, when se recalculan sus nombres, then ninguno cambia salvo el de los Coloquios.
- Given una página que es su propia obra, when se pide su nombre, then sigue teniendo un solo segmento.

## Spec Change Log

## Verification

**Commands:**
- `npx vitest run tests/unit/documento.test.ts` -- expected: la matriz nueva falla antes y todo pasa después.
- `npx tsx tools/recuperar.ts "<dos subpáginas de los Coloquios>" --corpus <corpus de prueba>` -- expected: dos ficheros con nombre propio, sin rechazo.
- `npx astro check` -- expected: 0 errores.
- `npm test` -- expected: sin regresión, salida en fichero y código de salida 0.

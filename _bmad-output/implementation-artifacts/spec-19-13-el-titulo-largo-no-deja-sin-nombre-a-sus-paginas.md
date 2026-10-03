---
title: 'Historia 19.13 — Un título largo no deja sin nombre a las páginas de su obra'
type: 'bugfix'
created: '2026-10-02'
status: 'done'
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
- [x] `tests/unit/documento.test.ts` -- pruebas de la matriz, que fallen antes del cambio.
- [x] `tools/lib/documento.ts` -- la regla en `nombreDeDocumento`, con comentario: qué distingue a la página, por qué de su título declarado y no de la ruta, y la cifra medida.
- [x] `_bmad-output/specs/spec-brainlySabiduria/.memlog.md` -- hallazgo y decisión.

**Acceptance Criteria:**
- Given dos subpáginas cualesquiera de los Coloquios, when se piden sus nombres, then son distintos entre sí y distintos del de la obra.
- Given los 309 documentos de Wikisource-es ya versionados, when se recalculan sus nombres, then ninguno cambia salvo el de los Coloquios.
- Given una página que es su propia obra, when se pide su nombre, then sigue teniendo un solo segmento.
- Given una página cuya **obra derivada es su propio título con barra** —«Fábulas de Fedro/Epílogo Libro IV», «Del sentimiento trágico de la vida/I», que no declaran `|título`—, when se pide su nombre, then sigue teniendo un solo segmento y es el que su documento ya lleva escrito. (Añadido en revisión: la implementación lo descubrió y la regla literal del Code Map lo habría renombrado.)
- Given una subpágina de **más de un tramo** —«Obra/Libro I/Capítulo I» y «Obra/Libro II/Capítulo I»—, when se piden sus nombres, then son distintos entre sí: la cola son todos los tramos que quedan, no el último. (Añadido en revisión.)
- Given una subpágina cuya cola da el **mismo slug que la obra**, when se pide su nombre, then sigue teniendo dos segmentos y **no** es el nombre del documento de la obra entera: una subpágina no reclama el documento de su obra. (Añadido en revisión.)

## Spec Change Log

- 02/10, al implementar: la condición de la regla se afina. El Code Map la planteaba como
  «cuando el recorte deje el segmento de página igual al de la obra», y comprobar solo esa
  igualdad **renombraba tres documentos ya versionados**: «Fábulas de Fedro/Epílogo Libro
  IV», «Fábulas de Fedro/Prólogo Libro IV» y «Del sentimiento trágico de la vida/I» no
  declaran `|título`, así que su obra derivada es su propio título entero —barra incluida—
  y la cola les habría dado un segundo segmento. La cola se mira solo cuando
  `slugDeObra(pagina) !== slugDeObra(obra)`: si los dos títulos canonizan igual, nombran lo
  mismo —la página **es** la obra, o difieren solo en mayúsculas— y el colapso es correcto.
  Los «otros cuatro» que el Code Map cuenta son exactamente los de mayúsculas.
- 02/10, revisión: tres correcciones de la regla, ninguna de ellas en el bloque congelado.
  (a) La cola se construye con **todos los tramos** que el título declarado trae detrás del
  título de la obra, no con el último: quedarse con el último repetía el defecto un nivel
  más abajo en una obra por libros. (b) Los tramos vacíos —título acabado en «/», o «//» en
  medio— se descartan, así que no cuelgan un sufijo vacío ni parten la cola. (c) Cuando la
  cola existe, el nombre lleva **siempre** dos segmentos, aunque la cola dé el mismo slug
  que la obra: con uno solo, la subpágina se llamaría igual que el documento de la obra
  entera y podría reclamarlo, que es peor que dos subpáginas chocando entre sí.

## Verification

**Commands:**
- `npx vitest run tests/unit/documento.test.ts` -- expected: la matriz nueva falla antes y todo pasa después.
- `npx tsx tools/recuperar.ts "<dos subpáginas de los Coloquios>" --corpus <corpus de prueba>` -- expected: dos ficheros con nombre propio, sin rechazo.
- `npx astro check` -- expected: 0 errores.
- `npm test` -- expected: sin regresión, salida en fichero y código de salida 0.

**Evidence (2026-10-02, tras aplicar la ronda de revisión):**

| Comando | Código | Resultado |
|---------|--------|-----------|
| `npx vitest run tests/unit/documento.test.ts` | 0 | 220 pruebas, 1 fichero, todo en verde. Antes del cambio, 5 de las nuevas en rojo. |
| `npx tsx tools/recuperar.ts <4 subpáginas de los Coloquios> --corpus <corpus de prueba>` | 0 ×4 | Cuatro ficheros con nombre propio —`…--cancion-divina`, `…--el-obraje-divino`, `…--ensalada-del-gachopin`, `…--cancion-a-san-hieronimo`— y ningún rechazo. Antes competían por `wikisource-es--coloquios-…-sagradas.txt`. |
| `npx astro check` | 0 | 0 errores, 0 avisos, 16 pistas (las de siempre). |
| `npm test` | 0 | 104 ficheros, 2993 pruebas, todo en verde. |

Y la medida que sostiene el criterio de los 309, recalculada tras la revisión: de los 324
documentos versionados, **uno solo** cambia de nombre —el de los Coloquios—; los otros 323,
ninguno.

**Hecho el 2026-10-02 por decisión de Héctor, y era el Ask First de la historia:** renombrar
el documento de los Coloquios ya versionado, con `git mv` para que conserve su historia. Con
el nombre viejo `extraer` y `documentar` lo rechazaban por nombre, y `recuperar` lo daba por
«ya versionado»: quedaba versionado e inerte. El nombre de destino no se teclea, se deriva: para
`corpus/fuentes/wikisource-es--coloquios-espirituales-y-sacramentales-y-poesias-sagradas.txt`,
`nombreDeDocumento` implica hoy
`wikisource-es--coloquios-espirituales-y-sacramentales-y-poesias-sagradas--cancion-divina`.
Comprobado por adelantado, sin tocar el Corpus, que el renombrado no rompe nada aguas abajo:

- `documentosDeCita` resuelve la Cita «¿Por qué, mi Dios, me soltais…» contra el documento
  con **cualquiera** de los dos nombres —busca el nombre corto y todos los `…--<página>`—,
  así que el cotejo del build sigue verde;
- `npx tsx tools/extraer.ts <copia bajo el nombre nuevo> --autor fernan-gonzalez-de-eslava --corpus <corpus de prueba> --seco`
  sale con **código 0**: pasa la puerta del nombre y coteja el Autor. Hoy, con el nombre
  colapsado, esa puerta lo rechaza.

Hecho el renombrado, la prueba que recorre los documentos versionados espera lista **vacía**:
ya no admite ninguna excepción.

## Suggested Review Order

**La regla**

- Dónde entra: el nombre de un solo segmento, calculado una vez y usado en todas las salidas.
  [`documento.ts:2114`](../../tools/lib/documento.ts#L2114)

- La guarda: si los dos títulos canonizan igual, la página es la obra y el colapso es correcto.
  [`documento.ts:2154`](../../tools/lib/documento.ts#L2154)

- La cola sale del título declarado, con todos sus tramos tras la obra, nunca de la ruta.
  [`documento.ts:2185`](../../tools/lib/documento.ts#L2185)

**El documento renombrado**

- Los Coloquios, con `git mv` y contenido intacto: el Ask First, decidido por Héctor.
  [`…--cancion-divina.txt`](../../corpus/fuentes/wikisource-es--coloquios-espirituales-y-sacramentales-y-poesias-sagradas--cancion-divina.txt)

**Pruebas**

- La matriz: obra larga, página que es la obra, mayúsculas, colas que chocan, Gutenberg.
  [`documento.test.ts:1405`](../../tests/unit/documento.test.ts#L1405)

- Subpáginas de dos niveles: «Libro I/Capítulo I» y «Libro II/Capítulo I» ya no chocan.
  [`documento.test.ts:1438`](../../tests/unit/documento.test.ts#L1438)

- Una cola que repite a la obra no reclama el documento de la obra entera.
  [`documento.test.ts:1456`](../../tests/unit/documento.test.ts#L1456)

- El barrido de los 309: reproduce la puerta de `extraer` y ya no admite excepciones.
  [`documento.test.ts:1553`](../../tests/unit/documento.test.ts#L1553)

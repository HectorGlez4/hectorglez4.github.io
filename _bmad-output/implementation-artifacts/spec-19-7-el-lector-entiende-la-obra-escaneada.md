---
title: 'Historia 19.7 — El lector entiende la obra escaneada, que es donde viven los clásicos'
type: 'feature'
created: '2026-09-07'
status: 'in-review'
baseline_commit: 'e658301c147aa535aff3cf7bc55b32ca8d79d9a6'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/LOOP-PROTOCOL-V5.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Wikisource-es declara el Autor de dos maneras y **el lector solo entiende una**. La conocida es la plantilla `{{Encabezado|autor=…}}`. La otra es la de las obras **transcritas de un escaneo**, `<pages index="…" autor="Marco Aurelio" traductor="…" />`, y de ésa el lector no ve nada: los doce libros de los *Soliloquios* se versionaron sin Autor declarado y la invariante de FR-23 los nombró. No es un caso raro — es el **31 %** de las páginas de la Fuente, y es justamente donde vive lo que la v6 persigue: los clásicos y la teología, que llegan a Wikisource escaneados de una edición antigua.

**Approach:** una lectura más en la cadena que ya existe, **en el borde**. La etiqueta se normaliza a las mismas líneas `|autor = …` que produce la plantilla, y de ahí para dentro no cambia nada: obra, Autor, año y traductor se derivan con el código de siempre.

## Boundaries & Constraints

**Always:**
- Lo que se versiona es **lo que la Fuente escribió**, literal. La normalización es de forma, nunca de contenido.
- La cadena de lectura de Autor sigue siendo la misma y en el mismo orden: esta forma se suma, no sustituye a ninguna.
- La obra la declara **la página**, como hasta hoy: el `titulo=` de la etiqueta es de la página que se recupera, no del índice del que cuelga.
- Los documentos ya versionados que dependan de esto **se vuelven a recuperar**, no se editan a mano.

**Ask First:**
- Leer del índice —la página `Index:`— cualquier cosa que la página misma no declare. Es otra petición de red por documento y otra decisión.
- Tratar el `traductor` como algo más que un dato conservado. Que se lea no significa que ya tenga superficie.

**Never:**
- **Sacar el año del nombre del fichero del índice.** «Obras de los moralistas griegos … (1888).pdf» lleva un año dentro, y tomarlo sería exactamente la Procedencia inferida que FR-2 prohíbe: la Fuente no ha declarado que la obra sea de 1888, ha nombrado un fichero.
- Escribir a mano el Autor en un documento versionado para poner verde una prueba. El documento es la copia de la Fuente; falsear su cabecera es falsear la Procedencia.
- Tocar la puerta de FR-23. Si un documento sigue sin declarar Autor, sigue sin declararlo.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Obra escaneada | `<pages … autor="Marco Aurelio" />` | Declara a Marco Aurelio, como si fuera `\|autor=` | N/A |
| Con traductor | `traductor="Jacinto Díaz de Miranda"` | Se conserva en la declaración | N/A |
| Título con enlace | `titulo="[[Soliloquios]]"` | La obra es «Soliloquios», resuelto como en la plantilla | N/A |
| Etiqueta sin autor | `<pages index="…" />` a secas | No declara Autor, igual que hoy | Sin cambio |
| Las dos formas a la vez | Plantilla **y** etiqueta | Ambas se versionan; manda el orden de lectura de siempre | N/A |
| Año en el nombre del índice | `… (1888).pdf` | **No** se deriva año de ahí | N/A |
| Etiqueta partida en dos líneas | Atributos en la línea siguiente | Se leen igual: la etiqueta acaba en `/>`, no en el salto | N/A |

</frozen-after-approval>

## Code Map

- `tools/lib/documento.ts:647` -- `lineasDeEncabezadoDeWikitexto`: recorre **plantillas equilibradas** y parte por `|`. Una etiqueta XML no es ninguna de las dos cosas, y por eso no ve nada. Aquí entra la lectura nueva.
- `tools/lib/documento.ts:1049` -- `declaracion(...)` de Wikisource: compone lo que se versiona. La línea nueva se suma a las de la plantilla.
- `tools/lib/documento.ts:335` -- `PARAMETRO_DE_ENCABEZADO`, la lista cerrada de metadatos. La etiqueta se normaliza a esa forma para pasar por ella sin excepciones.
- `tools/lib/documento.ts:1121` -- `autor(declaracion)`, la cadena de cuatro lecturas. **No se toca**: recibe las líneas ya normalizadas.
- `tools/recuperar.ts:246` -- de aquí sale la declaración al recuperar. Los doce documentos se rehacen por aquí.

**Medido el 07/09/2026 contra la API de Wikisource-es** (`insource:`, espacio principal):

| Forma | Páginas |
|---|---|
| `{{Encabezado\|autor=…}}` — la que el lector conoce | 40.923 |
| `<pages index=…>` — la de lo escaneado | **18.040** |
| …de ésas, con `autor="…"` | 8.465 |
| …de ésas, con `traductor="…"` | 253 |

Y en el Corpus: de 167 documentos de Wikisource, **25 no llevan `|autor`**; doce son los *Soliloquios*.

## Tasks & Acceptance

**Execution:**
- [x] `tools/lib/documento.ts` -- leer los atributos de `<pages … />` y normalizarlos a líneas de encabezado.
- [x] `tools/lib/documento.ts` -- sumarlas a la declaración de Wikisource, sin tocar la cadena de Autor.
- [x] Volver a recuperar los doce documentos de los *Soliloquios*, con red y desde `tools/`.
- [x] Pruebas de la matriz, incluido que del `(1888)` del índice **no** sale año.

**Acceptance Criteria:**
- Given una página con `<pages … autor="Marco Aurelio" />`, when se deriva, then declara a Marco Aurelio.
- Given el nombre de índice con `(1888)`, when se deriva el año, then no hay año.
- Given los doce documentos rehechos, when corre la prueba de FR-23, then ninguno queda sin Autor declarado.

## Design Notes

**Por qué normalizar en el borde y no leer en cuatro sitios.** La cadena de Autor tiene ya cuatro eslabones —parámetro, etiqueta `Autor:`, firma y categoría— y cada uno con su prueba. Añadir un quinto que entienda atributos XML habría duplicado esa lógica en la lectura de la obra, en la del año y en la del traductor. Convertir la etiqueta en las mismas líneas `|autor = …` que ya produce la plantilla deja **un solo sitio nuevo** y todo lo demás intacto, que es la lección de la 12.1: una superficie declarada en dos sitios acaba divergiendo.

**Por qué el año no sale del índice.** Es la tentación obvia y sería un error caro: el nombre del fichero es una convención de quien subió el escaneo, no una declaración de la obra. FR-2 prohíbe la Procedencia inferida, y aquí se inferiría de un nombre de fichero.

## Verification

**Commands:**
- `npx vitest run <las pruebas nuevas>` -- expected: la matriz en verde, sin red.
- `npx vitest run tests/unit/documento.test.ts` -- expected: los *Soliloquios* fuera de la lista de mudos.
- `npx astro check` -- expected: 0 errores.
- `npm test` -- expected: sin regresión.

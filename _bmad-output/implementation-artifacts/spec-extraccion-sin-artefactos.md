---
title: 'La extracción retira el encabezado que la fuente pega al cuerpo'
type: 'bugfix'
created: '2026-08-24'
status: 'ready-for-dev'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/deferred-work.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `sentencias()` hace `.replace(/\s+/g, ' ')` antes de partir, así que pierde la estructura de líneas del documento y pega al cuerpo lo que la Fuente puso en línea aparte. Salen candidatas como «El sable Un general, un tonel vacío…» y «Capítulo I La casualidad quiso que Rocinante…». No es solo ruido: **53 sentencias de los 59 documentos versionados llevan encabezado pegado, 21 de ellas el tratado entero de Séneca**, y una vez pegado el encabezado la sentencia ya no es publicable. Ninguna puerta lo caza —es español legible, está literal en el documento y lo firma quien lo firma—, así que el coste se paga a mano en cada sesión.

**Approach:** Retirar el encabezado antes de aplicar las reglas que ya existen. Lo que quede se juzga como siempre: las entradas de índice puras caen solas por la regla de longitud, y la prosa real se recupera.

## Boundaries & Constraints

**Always:**
- Retirar es una decisión de **límite**, no de contenido: lo que queda sigue apareciendo literal en el documento, así que el cotejo de la 11.2 lo sigue dando por bueno.
- El prefijo de la **obra** solo se retira de la primera sentencia del documento. En cualquier otra posición sería mutilar: una obra llamada «La vida» convertiría «La vida es sueño…» en «es sueño…».
- Las formas de encabezado se reconocen por lo medido en los 59 documentos: la obra declarada, `Capítulo <romano>`, y `<romano>` seguido de guion.
- Cada descarte nuevo trae su motivo propio, contable en el informe como los cuatro que ya hay.

**Ask First:**
- Cualquier forma de encabezado que no aparezca hoy en `corpus/fuentes/`. La regla se diseñó midiendo, no imaginando.
- Retirar prefijos en posiciones distintas de la primera sentencia.

**Never:**
- Alterar el texto de una candidata más allá de retirar el encabezado y los espacios que lo siguen.
- Tocar `MIN_CARACTERES_CANDIDATA` ni las puertas de español, legibilidad o repetición.
- Reescribir los documentos de `corpus/fuentes/`: son el registro de lo que la Fuente dio.
- Tocar ninguna Cita ya publicada.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Título pegado | Primera sentencia «El estado Esclavizarse por razón de política…», obra «El estado» | Candidata «Esclavizarse por razón de política…» | N/A |
| Encabezado de capítulo | «Capítulo I La casualidad quiso que Rocinante…» | Candidata «La casualidad quiso que Rocinante…» | N/A |
| Entrada de índice pura | «III - Orden y medida en el cambio.» | Queda en 28 caracteres y la descarta la regla de longitud que ya existe | Descarte «longitud» |
| Índice encadenado | «I - II - III - IV - V - …» (20 encabezados seguidos) | Se descarta con motivo propio | Descarte «índice» |
| La obra no está pegada | Primera sentencia que no empieza por la obra | No se toca nada | N/A |
| La obra aparece más tarde | Sentencia posterior que empieza igual que la obra | **No se toca**: solo la primera | N/A |

</frozen-after-approval>

## Code Map

- `tools/lib/extraccion.ts:149` -- `sentencias()`, que colapsa `\s+` y pierde la estructura de líneas. Es la causa raíz.
- `tools/lib/extraccion.ts:265` -- el bucle de `extraerCandidatas`, donde se aplican las cuatro reglas actuales y donde entra la nueva.
- `tools/lib/extraccion.ts:268` -- la regla de longitud, que es la que recoge sola las entradas de índice puras.
- `tools/lib/extraccion.ts:72-73` -- `MIN_CARACTERES_CANDIDATA = 40`, `MAX_CARACTERES_CANDIDATA = 240`; no se tocan.
- `tools/lib/extraccion.ts:234` -- `extraerCandidatas(documento, autor)`; `documento.obra` ya está disponible aquí.
- `tools/lib/extraccion.ts` -- el tipo `Descarte` y sus motivos actuales: longitud, no español, ilegible, repetida.
- `tools/extraer.ts` -- imprime el recuento por motivo; el nuevo tiene que salir ahí.
- `corpus/fuentes/wikisource-es--de-la-brevedad-de-la-vida.txt` -- 21 de las 53 afectadas; es el caso que más recupera.
- `corpus/fuentes/wikisource-es--el-sable.txt`, `…--el-estado--…txt` -- los dos únicos con la obra pegada.
- `corpus/fuentes/wikisource-es--motivos-de-proteo--motivos-de-proteo-001.txt` -- el índice encadenado.

## Tasks & Acceptance

**Execution:**
- [ ] `tools/lib/extraccion.ts` -- función pura que retira un encabezado del principio de una sentencia y dice si retiró algo -- reconoce `Capítulo <romano>` y `<romano>` con guion; la obra se le pasa aparte porque solo vale en la primera.
- [ ] `tools/lib/extraccion.ts` -- aplicar el retirado en el bucle, antes de la regla de longitud, con la obra solo en la primera sentencia -- así lo que quede se juzga con las reglas de siempre y las entradas de índice caen solas.
- [ ] `tools/lib/extraccion.ts` -- descartar con motivo propio la sentencia que sea cadena de más de dos encabezados seguidos -- es el índice del libro listado entero, y retirarle uno solo dejaría el resto pasando.
- [ ] `tools/extraer.ts` -- informar del nuevo motivo y de cuántas sentencias se recuperaron al retirarles el encabezado -- una puerta que actúa en silencio no se puede vigilar.
- [ ] `tests/unit/` -- cubrir la matriz entera, incluida la fila que **no** actúa: una sentencia posterior que empieza igual que la obra no se toca.
- [ ] `tests/unit/` -- prueba sobre los documentos reales que fije los números medidos: 53 sentencias con encabezado, de las que 36 quedan utilizables y 16 caen por longitud, más el único índice encadenado -- si un cambio futuro los mueve, que se vea.
- [ ] `AGENTS.md` -- anotar en la sesión de sembrado que la extracción retira encabezados y qué formas reconoce.

**Acceptance Criteria:**
- Given `corpus/fuentes/wikisource-es--de-la-brevedad-de-la-vida.txt`, when se extrae, then ninguna candidata empieza por «Capítulo», y salen al menos 20 más que antes del cambio.
- Given `corpus/fuentes/wikisource-es--el-sable.txt`, when se extrae, then existe la candidata que empieza por «Un general» y ninguna empieza por «El sable».
- Given los 59 documentos versionados, when se extraen todos, then ninguna candidata empieza por un encabezado de las formas reconocidas.
- Given `npm test`, `npm run check` y `npm run build`, then pasan sin regresión sobre las 1852 pruebas de la línea base, y el build sigue cotejando 229 Citas.

## Design Notes

**Por qué retirar y no descartar.** El primer diseño era descartar la candidata con encabezado. Medido, era tirar 36 sentencias de prosa real —incluidas las 21 de Séneca, que solo tiene cinco Citas publicadas—. El encabezado es un accidente del renderizado, no del texto: lo que la obra dice empieza después.

**Por qué no se arregla en `sentencias()` partiendo por línea en blanco.** Es lo que parecía obvio y está mal: «El sable» trae líneas en blanco **a mitad de frase** —«un tonel vacío; un / / ejército en marcha»— así que partir por ahí fragmentaría sentencias reales. La estructura de líneas de estos documentos no es fiable; el encabezado sí es reconocible.

**Por qué las entradas de índice puras no necesitan regla.** Al retirarles el numeral quedan en 20-38 caracteres —«Reformarse es vivir.», «Armonía de las edades.»— y las recoge `MIN_CARACTERES_CANDIDATA`, que ya existe y ya vale para esto. Inventar una regla de «parece un título» habría añadido una puerta que decide por estilo, y ninguna otra puerta de este módulo hace eso.

## Verification

**Commands:**
- `npx tsx tools/extraer.ts corpus/fuentes/wikisource-es--de-la-brevedad-de-la-vida.txt --autor seneca --seco` -- expected: al menos 20 candidatas más que en la rama base, ninguna con «Capítulo»
- `npx tsx tools/extraer.ts corpus/fuentes/wikisource-es--el-sable.txt --autor manuel-gonzalez-prada --seco` -- expected: 32+ candidatas, ninguna empieza por «El sable»
- `npm test` -- expected: 1852+ en verde
- `npm run check` -- expected: 0 errores
- `npm run build` -- expected: 229 Citas cotejadas, censo en 23

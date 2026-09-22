---
title: 'Historia 19.12 — El verso se lee por frase, no por renglón'
type: 'bugfix'
created: '2026-09-20'
status: 'done'
baseline_commit: '98dfbc6f1ebf134216ea72da63c38fea3f36ebc2'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** al versionar una página que la Fuente declara como verso —`<div class="poem">`, con `<br/>` y salto real detrás de cada renglón— cada verso queda en **párrafo propio**, y el troceador de candidatas parte por párrafo, porque «una frase no cruza un párrafo». Así cada renglón se juzga como frase entera y casi ninguno llega al mínimo de 40 caracteres: «Diestras, pudieras decir / en la herida del pedir, / que es su primera intención.» es una sentencia y sale como tres fragmentos de 22, 24 y 31. Medido el 20/09: «Los favores del mundo» de Alarcón da 9 candidatas en ventana y debería dar 232; la «Canción divina» de González de Eslava, 1 y debería dar 14. De ahí salieron descartes de Autores enteros «porque su obra solo da medios versos», al menos en esos dos casos: en otros —Lucrecio, cuya traducción ya da 75 candidatas— el defecto es distinto y esta historia no lo toca.

**Approach:** dentro de un bloque que **la Fuente declara** como verso, el salto de renglón se versiona como salto simple y no como párrafo, de modo que el bloque sea un párrafo y sus frases se troceen por puntuación, como en la prosa. Ni el troceador ni el mínimo ni el cotejo se tocan.

## Boundaries & Constraints

**Always:**
- Solo donde la Fuente lo declara, y por **identificador exacto de clase**: `poem`, `verse`, `mw-poem-indented`. Nunca por subcadena —`poemas`, `poem-title` no son verso— ni por heurística de longitud o de puntuación.
- Las palabras no cambian: cambia dónde hay salto de párrafo. Un documento sin verso declarado se versiona byte a byte igual.
- La regla que protege los epígrafes —una frase no cruza un párrafo— sigue intacta: el verso deja de ser párrafo, el epígrafe sigue siéndolo.
- Los documentos ya versionados que traigan verso declarado se regeneran **de uno en uno** con `tools/recuperar.ts`, comparando cuerpo palabra a palabra: solo puede cambiar el espaciado. Si cambia algo más —incluida una declaración de Autor que aparezca por la 19.9, que también corre al regenerar— se restituye el viejo y se pregunta.
- El cotejo no se relaja: colapsa espacios antes de comparar, así que una Cita que une versos sigue apareciendo literal en su documento.
- La medida de esta historia son Citas publicables, no candidatas. Una candidata que entra en cola no es valor: es trabajo para quien revisa.

**Ask First:**
- Quitar el nombre del personaje que abre el renglón en el teatro («DON IUAN La pobreza es tan medrosa…»).
- Quitar los números de verso que esa edición imprime **dentro** del renglón («…lo veràn. 25 Señor, si quieres ser rico…»). No son los `<sup>` de la 19.11.

**Never:**
- Unir párrafos de prosa por parecerse a verso.
- Tocar `MIN_CARACTERES_CANDIDATA`, `MAX_CARACTERES_CANDIDATA`, la canaria de legibilidad ni el cotejo.
- Editar a mano un documento de `corpus/fuentes/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Verso declarado con `<br/>` | `<div class="poem">verso<br/>\nverso</div>` | Un párrafo; las frases se parten por puntuación | N/A |
| Verso anidado | `<div class="mw-poem-indented">` dentro de `poem` | Igual que su contenedor | N/A |
| Verso ya en renglón simple | `<div class="verse"><pre>…` *(Navarrete)* | No cambia nada | N/A |
| Documento en prosa | Odas de Salinas, fábula de Fedro | Cuerpo idéntico al versionado | N/A |
| Poema sin puntuación | Bloque largo sin `.!?` | Un párrafo largo; cae por longitud, no se inventa corte | N/A |
| Teatro con personaje | `DON IUAN La pobreza es tan medrosa,` | La candidata lo lleva delante; la revisión decide | Ask First |
| Número de verso en el renglón | `…lo veràn. 25 Señor, si quieres…` | Se conserva; no es el `<sup>` de la 19.11 | Ask First |
| Documento versionado con verso | Ya en `corpus/fuentes/` | Se regenera y se compara; solo cambia el espaciado | Ask First si cambia algo más |
| Frase que al unirse pasa de 240 | Sentencia repartida en cinco o más versos | Cae por longitud: se pierde una candidata que hoy salía troceada | Se mide y se anota por documento |
| Clase que solo se parece | `class="poemas"`, `class="poem-title"` | No es verso: el documento no cambia | N/A |

</frozen-after-approval>

## Code Map

Anclas refrescadas el 22/09, después del cambio; las de antes apuntaban a posiciones previas.

- `tools/lib/documento.ts:92` -- `aTextoPlano`: `BLOQUES` (:75) convierte `<br>` en `\n`, y el salto real que la Fuente escribe detrás suma el segundo; `normalizarEspacios` (:80) deja exactamente una línea en blanco. Ahí nace el párrafo por verso.
- `tools/lib/documento.ts:1456` -- `region()` del lector `'wikisource-es'`: donde ya viven el cromo (`CROMO_MEDIAWIKI`, :1231) y la numeración de verso de la 19.11 (`NUMERACION_DE_VERSO`, :1265). La regla nueva mira **contenedores**, así que va aquí, sobre el marcado y antes de `aTextoPlano`.
- `tools/lib/documento.ts:1315` -- `CLASES_DE_VERSO`, las tres clases que la Fuente usa para declarar verso, y `versoEnUnSoloParrafo` (:1358), que es la regla.
- `tools/lib/documento.ts:111` -- `elementoEquilibrado`, que desde esta historia informa además de si el elemento **cerró de verdad**: un contenedor de verso sin cierre se deja intacto.
- `tools/lib/extraccion.ts:511` -- `sentencias()`: parte por párrafo y luego por puntuación. **No se toca**: recibe el texto ya versionado.
- `tools/lib/extraccion.ts:418` -- la ventana de 40 a 240 caracteres. Solo se lee.
- `tools/lib/cotejo.ts:50` -- `colapsarEspacios`: por eso unir versos no rompe el cotejo de ninguna Cita publicada.
- Medido el 20/09 contra la Fuente, en frases dentro de ventana, hoy → con la regla: «Los favores del mundo» (Alarcón) 9 → 232; «Canción divina» (González de Eslava) 1 → 14; «El sagrado laurel ciña tu frente» (Catalina de Eslava) 3 → 3, con los tercetos enteros; «Influjo de amor» (Navarrete, `verse`+`pre`) 4 → 4; Odas de Horacio (Salinas, prosa) 151 → 151; fábula de Fedro (prosa) 4 → 4; «De la naturaleza de las cosas» (Lucrecio, Marchena) 75 → 75.
- Medido el 22/09 en la implementación, en **candidatas de `extraer`** y no en frases en ventana, contra la página de la Fuente de los **306** documentos de Wikisource-es versionados, sin errores. **54 traen verso declarado y 252 no.** En los 54, 8.269 → 8.508 candidatas; por texto, 1.130 ganadas —1.117 con forma de frase entera— y 891 perdidas —684 eran fragmento: medio verso acabado en coma o empezado en minúscula—.
  - Las cuatro obras que la historia nombra: «Canción divina» 1 → 9; «El sagrado laurel ciña tu frente» 3 → 3, con los tercetos enteros; «Influjo de amor» (`verse`+`pre`) 4 → 4 sin cambiar un byte; «Los favores del mundo» 73 → 761, que es justo la comedia que la historia no promete.
  - Quien más gana: «Prometeo encadenado» 43 → 262; los tres «Versos sencillos» de Martí, de **cero** a 19, 12 y 2; La ciudad de Dios, entre +0 y +32 por libro; «Abel Martín» +13; «La paz» (Filemón) 1 → 7.
  - Quien pierde, y por qué: las once entregas de La Eneida de Ochoa, entre −3 y −18, porque la traducción reparte una sentencia en cinco o más versos y unida pasa de 240; «Libro primero de la Consolación de la filosofía» 164 → 126; «Propercio, Elegías, libro 1» 524 → 175, donde cada renglón era una candidata acabada en coma.
  - **La clase `poem` no siempre envuelve verso.** Los 22 libros de La ciudad de Dios meten el libro entero —prosa— en un solo `<div class="poem">` con un `<br>` entre párrafos. Consecuencia medida: su índice de capítulos, dentro del mismo `poem`, pasa de treinta párrafos a uno y sus renglones sin punto se pegan al siguiente —32 candidatas del tipo «De lo que se ha dicho en el libro primero CAPITULO II.» solo en el libro IV—. Anotado en `deferred-work.md`: no se arregla aquí, porque lo único que distinguiría esa prosa del verso es la forma del renglón.

## Tasks & Acceptance

**Execution:**
- [x] `tests/unit/documento.test.ts` -- pruebas de la matriz sobre un fixture con `poem`, `verse`+`pre` y prosa, que fallen antes del cambio.
- [x] `tools/lib/documento.ts` -- la regla en `region()` de `'wikisource-es'`, con comentario: qué declara la Fuente, la cifra medida y por qué no va en el troceador.
- [x] Medición -- cuántos documentos de `corpus/fuentes/` traen verso declarado en su página de la Fuente, y cuántas candidatas en ventana gana o **pierde** cada uno.
- [x] `corpus/fuentes/` -- regenerar con `recuperar`, de uno en uno, los que lo traigan; comparar palabra a palabra y restituir el viejo si cambia algo más que el espaciado; anotar los que no lo traen. **50 regenerados y 4 restituidos** —«Juan de Mairena», «Nada te turbe» y los dos «Proverbios y cantares»—, porque su declaración gana una línea `[[Categoría:Poesías de …]]` que no es de esta historia; su cuerpo era idéntico de todos modos. De los 50, ninguno cambia una palabra: solo el espaciado.
- [x] `_bmad-output/specs/spec-brainlySabiduria/.memlog.md` -- hallazgo, decisión y resultado por documento.

**Acceptance Criteria:**
- Given la «Canción divina» de González de Eslava recuperada de nuevo, when se extraen y se revisan sus candidatas una a una, then al menos una es Cita publicable. La cifra de candidatas en cola no es criterio de nada.
- Given cada documento regenerado, when se mide antes y después, then se anota si **pierde** candidatas en ventana, porque unir versos puede pasar una frase de 240 caracteres.
- Given un documento en prosa ya versionado, when se recupera otra vez, then su cuerpo es idéntico salvo la fecha de recuperación.
- Given los documentos regenerados, when corre el cotejo del build, then toda Cita publicada sigue literal en su documento.

## Spec Change Log

- 22/09 -- Code Map: añadida la medición de la implementación sobre los 306 documentos, y el hallazgo de que la clase `poem` de la Fuente envuelve prosa en La ciudad de Dios. Tareas marcadas y estado a `in-review`: la historia está construida, pero `done` lo decide quien revise, no quien implementa. El bloque congelado no se toca.
- 22/09 -- Revisión, diez parches. Código: fuera un `continue` inalcanzable; el contenedor sin cerrar se detecta por `cerrado` de `elementoEquilibrado` y no adivinando por el sufijo `</div>`; el nombre del atributo anclado a un blanco, para que `data-class` y `mw:class` no declaren verso; admitida la clase sin comillas; el salto real cuenta a los dos lados del `<br>`. Pruebas: pinchadas `verse` y `mw-poem-indented` por separado, `<br><br>` pegados, la frase que al unirse pasa de 240, el contenedor sin cerrar, lo que guarda la **declaración** y la prosa envuelta en `poem`. Anclas del Code Map refrescadas. Ninguno de los cinco cambios de código altera el cuerpo de ningún documento del Corpus: los 306 siguen coincidiendo byte a byte con lo versionado.

## Design Notes

Por contenedor y no por forma: la Fuente ya dice qué es verso —`class="poem"`, `class="verse"`—, y adivinarlo por renglones cortos rompería el arreglo del epígrafe, que es de la misma familia y costó 42 candidatas envenenadas en un solo libro. Unir con espacio y no con barra: la Cita se publica en una línea, decisión de Héctor del 20/09; conservar el salto de verso tocaría el esquema de la Cita, la Imagen y el copiado, y es otra historia.

Lo que esta historia **no** arregla, y conviene no prometer: el teatro sigue trayendo el nombre del personaje pegado a la frase, y la edición antigua de Alarcón imprime el número de verso dentro del renglón. Las dos cosas son «Ask First» y salen en la matriz.

**Y por eso esta historia no promete a Alarcón.** La regla es estructural y no sabe qué es teatro, así que sus comedias mejoran igual; pero sembrarlas metería en cola doscientas treinta y dos frases con nombre propio delante, y la ordenación de la 19.6 las puntuaría alto —son frases bien formadas, con verbo y punto— enterrando lo bueno que haya debajo. Lo que esta historia entrega es el verso sin personajes: los dos Eslava y Navarrete. El teatro espera a que sepamos separar el nombre.

## Verification

**Commands:**
- `npx vitest run tests/unit/documento.test.ts` -- expected: la matriz nueva falla antes y todo pasa después.
- `npx tsx tools/recuperar.ts "https://es.wikisource.org/wiki/Coloquios_espirituales_y_sacramentales_y_poesías_sagradas/Canción_divina" --corpus <corpus de prueba>` seguido de `extraer` y de leer las candidatas -- expected: frases enteras del coloquio, y al menos una publicable.
- `npx astro check` -- expected: 0 errores.
- `npm test` -- expected: sin regresión, salida en fichero y código de salida 0.

## Suggested Review Order

**La regla**

- Qué declara la Fuente como verso, y por identificador exacto de clase.
  [`documento.ts:1315`](../../tools/lib/documento.ts#L1315)

- La regla: dentro del contenedor, el salto de renglón vale por uno.
  [`documento.ts:1358`](../../tools/lib/documento.ts#L1358)

- El salto cuenta a los dos lados del `<br>`; `<br><br>` sigue dando párrafo.
  [`documento.ts:1346`](../../tools/lib/documento.ts#L1346)

- El atributo, anclado a un blanco: `data-class` no declara verso.
  [`documento.ts:1327`](../../tools/lib/documento.ts#L1327)

- Un contenedor sin cerrar se sabe, no se adivina por el sufijo.
  [`documento.ts:111`](../../tools/lib/documento.ts#L111)

- Dónde entra, tras el cromo y la numeración de la 19.11.
  [`documento.ts:1456`](../../tools/lib/documento.ts#L1456)

**Pruebas**

- La matriz del verso: `poem`, `verse`, sangrado, prosa y la frase que pasa de 240.
  [`documento.test.ts:308`](../../tests/unit/documento.test.ts#L308)

- Un documento sin verso declarado se versiona byte a byte igual.
  [`documento.test.ts:450`](../../tests/unit/documento.test.ts#L450)

- El contenedor sin cerrar no se trata, y la prosa de detrás conserva su párrafo.
  [`documento.test.ts:475`](../../tests/unit/documento.test.ts#L475)

- Lo que la regla cambia en lo que lee la declaración, fijado en sus dos formas.
  [`documento.test.ts:519`](../../tests/unit/documento.test.ts#L519)

- La consecuencia aceptada: prosa envuelta en `class="poem"`.
  [`documento.test.ts:568`](../../tests/unit/documento.test.ts#L568)

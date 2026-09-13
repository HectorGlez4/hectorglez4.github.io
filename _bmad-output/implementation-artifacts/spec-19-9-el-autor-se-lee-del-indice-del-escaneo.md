---
title: 'Historia 19.9 — El Autor se lee del Índice del escaneo'
type: 'feature'
created: '2026-09-09'
status: 'in-review'
baseline_commit: 'cd9294d4354ef8799e79850507f9d83aa80f7071'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/LOOP-PROTOCOL-V5.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-19-7-el-lector-entiende-la-obra-escaneada.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** una obra transcrita de un escaneo se sirve con `<pages index="…" />`, y la 19.7 enseñó a leer el `autor=` de esa etiqueta. Pero **más de la mitad de esas páginas no lo llevan**: de las 18.043 que la usan, 8.465 lo declaran y **9.578 no**. Cuando no lo llevan, el único sitio donde la Fuente lo declara es la página `Índice:` del escaneo — la misma que la etiqueta nombra.

**Y lo que esta historia NO arregla, medido antes de escribirla:** el `Índice:` de *La vida y fábulas del Esopo* trae `|Autor=` **vacío**, y el de *La República* de 1805 también. Los dos casos que motivaron pedirla **siguen sin arreglo**, porque Wikisource-es sencillamente no los atribuye. Sobre 25 subpáginas mudas de verdad, el Índice salva **2**; a **17 no las salva nada**. Esta historia vale ese 8 %, no el 53 %.

**Approach:** una petición más, **solo cuando la página no declara Autor y solo cuando ella misma nombra su índice**. Lo que venga se normaliza a las mismas líneas `|autor = …` que ya produce la plantilla, como en la 19.7, y de ahí para dentro no cambia nada.

## Boundaries & Constraints

**Always:**
- El índice se toma del atributo `index=` que **la propia página escribe**. Nunca de la ruta ni del nombre del fichero.
- La petición se hace **solo si hace falta**: una página que ya declara Autor no gasta ninguna. Y es **un solo salto**: si el índice tampoco lo declara, se acabó.
- Va al **mismo anfitrión**, con las mismas guardas que las otras peticiones: tiempo máximo, techo de tamaño y revalidación tras redirección.
- Lo que se versiona sale **marcado como del índice**, no confundido con lo que declara la página. Quien audite tiene que poder ver de dónde vino cada línea.
- Si el índice no responde, la recuperación **sigue adelante** y lo dice, como ya hace con el año.

**Ask First:**
- Tomar del índice cualquier cosa que no sea Autor, traductor o año.
- Que el Autor del índice gane a algo que la página declare. Aquí es el **último** recurso, nunca una segunda opinión.

**Never:**
- **Derivar el padre de la ruta.** «Esta página cuelga de aquella, luego comparte su Autor» es la Procedencia inferida que la Historia 11.1 prohíbe, y además es falso en cuanto el padre es una antología: *Fábulas de Esopo… y de otros famosos autores* lo dice en el título. Cubriría más —6 de 25 contra 2— y por eso se descarta por escrito y no por olvido.
- Repartir entre varios. Un índice que declara dos Autores no declara el de esta página: se deja sin declarar, que es un estado legítimo.
- Sacar el año del nombre del fichero del índice. Sigue rigiendo el «Never» de la 19.7.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Página muda, índice con Autor | `<pages index="X.djvu"/>` y `\|Autor=[[Autor:Unamuno]]` | Declara a Unamuno, marcado como del índice | N/A |
| Página que ya declara | `autor="Marco Aurelio"` en la etiqueta | **No se pide el índice**: cero peticiones nuevas | N/A |
| Índice con el campo vacío | `\|Autor=` a secas *(Esopo, La República)* | Sigue sin declarar Autor, como hoy | N/A |
| Índice con dos Autores | `\|Autor=[[A]] y [[B]]` | No declara ninguno | Lo dice en el informe |
| Índice que no responde | Red caída o 404 | Se versiona sin Autor y se avisa | No falla la recuperación |
| Índice con traductor y año | `\|Traductor=`, `\|Ano=` | Se conservan, como en la 19.7 | N/A |
| Página sin `index=` | Cualquier otra forma | No hay índice que pedir | N/A |

</frozen-after-approval>

## Code Map

- `tools/recuperar.ts:166` -- el salto al encabezado de la obra, que ya existe **solo cuando falta el año**. El del índice va al lado y con la misma condición de necesidad, pero sobre el Autor.
- `tools/recuperar.ts:426` -- `encabezadoDeLaObra`: el patrón exacto —componer sobre el mismo anfitrión, revalidar, degradar con aviso—. La petición nueva lo copia.
- `tools/lib/documento.ts` -- `lineasDeEtiquetaDeEscaneo` (19.7): de aquí sale el `index=`, ya leído. La normalización a `|autor = …` es la misma.
- `tools/lib/documento.ts:1121` -- la cadena de Autor. **No se toca**: recibe líneas ya normalizadas.

**Medido el 08–09/09/2026 contra la API de Wikisource-es:**

| | |
|---|---|
| Páginas con `<pages index=` | 18.043 |
| …que declaran `autor=` en la etiqueta | 8.465 |
| …que **no** | **9.578** |
| Muestra de subpáginas mudas de verdad | 25 |
| …que salva el `Índice:` | **2** |
| …que salvaría el padre por la ruta *(descartado)* | 6 |
| …que no salva nada | **17** |

El espacio de nombres es `Índice:` en Wikisource-es, no `Index:`, aunque el atributo se escriba `index=`.

## Tasks & Acceptance

**Execution:**
- [ ] `tools/recuperar.ts` -- pedir el índice **solo** si la página no declara Autor y nombra su `index=`.
- [ ] `tools/lib/documento.ts` -- leer `Autor`, `Traductor` y `Ano` del template del índice, por líneas, sin saltar de campo.
- [ ] Marcar en la declaración que esas líneas vienen del índice.
- [ ] Pruebas de la matriz con la red simulada, incluidos el campo vacío y los dos Autores.
- [ ] Corregir el motivo de descarte de Esopo: hoy dice «reabrir cuando se decida leer del Index:», y el índice lo trae vacío.

**Acceptance Criteria:**
- Given una página muda cuyo índice declara Autor, when se recupera, then el documento lo declara.
- Given una página que ya declara Autor, when se recupera, then **no se pide el índice**.
- Given un índice con `|Autor=` vacío, when se recupera, then el documento sigue sin declarar Autor y no se inventa ninguno.

## Design Notes

**Por qué el índice y no el padre, cubriendo el padre el triple.** El índice lo **nombra la propia página** en su `index=`: leerlo es seguir una declaración suya. El padre solo se alcanza cortando la ruta por la última barra, y eso es una inferencia nuestra —la misma que la 11.1 prohibió para la Procedencia— que además falla justo donde más se usaría: en las antologías, donde el padre reúne a varios Autores y prestaría el suyo a quien no le toca. Se prefiere cubrir 2 de 25 con una declaración a cubrir 6 con una suposición.

**Por qué se escribe cuánto NO cubre.** Esta historia se pidió creyendo que desbloqueaba el 53 % de lo escaneado, y la medición dice 8 %. Dejarlo escrito es lo que impide que dentro de tres sesiones alguien la recuerde como la que arregló Esopo.

## Verification

**Commands:**
- `npx vitest run <las pruebas nuevas>` -- expected: la matriz en verde, sin red.
- `npx tsx tools/recuperar.ts <una página muda con índice que declara>` -- expected: declara Autor.
- `npx astro check` -- expected: 0 errores.
- `npm test` -- expected: sin regresión.

---
title: 'Story 12.2 — La Colección declara sus miembros, y la lista es blanda'
type: 'feature'
created: '2026-08-19'
status: 'ready-for-dev'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-12-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-12-1-una-superficie-declara-en-un-solo-sitio.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Agrupar Citas por un criterio editorial —«frases cortas para reflexionar»— no debe obligar a editar decenas de ficheros de Cita. Y una agrupación que se rompa cuando una Cita se retira a revisión sería una agrupación que nadie se atreve a curar.

**Approach:** La Colección declara **sus miembros**, por slug, en su propio fichero. La pertenencia se resuelve **intersectando** esa lista con el conjunto publicable, así que retirar una Cita la saca de todas sus Colecciones sin romper nada. El umbral mínimo se aplica al recuento **resuelto**, nunca al declarado.

## Boundaries & Constraints

**Always:**
- La pertenencia se declara **en la Colección** y se resuelve por intersección con el conjunto publicable. Es la dirección **inversa** a la del Tema, que se declara en la Cita, y es a propósito.
- **Ninguna Cita se modifica** para pertenecer a una Colección: sus Temas y su Autor quedan intactos.
- Retirar una Cita a `corpus/_revision/` **no rompe el build**: sale de todas sus Colecciones sin dejar hueco ni enlace roto.
- El umbral se aplica al recuento **resuelto**, jamás al declarado.
- El umbral vive en `src/lib/umbrales.ts` con un valor **provisional declarado como tal**, y en ningún otro sitio (AD-9). El PRD §14.4 lo deja abierto a propósito: sale de curar las tres o cuatro primeras Colecciones.
- La resolución es **pura**, sin lecturas de disco (AD-5).
- Ni los Temas ni las Colecciones participan en ninguna ruta de Cita, y el slug de una Cita no se recalcula (AD-4).

**Block If:**
- Cumplir un criterio exigiera modificar ficheros de Cita para declarar pertenencia, o que `src/lib/` leyera disco.

**Never:**
- No construir la Página de Colección: es la 12.3. Esta historia entrega el modelo y la resolución.
- No fijar el umbral definitivo. Provisional y declarado como provisional.
- No aplicar el umbral al recuento declarado: una Colección con veinte miembros declarados y tres publicados tiene tres.
- No inventar un segundo cómputo del conjunto publicable: la resolución lo consume, no lo reimplementa.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Colección por encima del umbral | Declara 20 miembros, 18 publicados | Resuelve a 18 y queda publicada | Sin error |
| Miembro retirado a revisión | Una Cita miembro se mueve a `_revision/` | El build no falla; la Cita sale de todas sus Colecciones | Sin error |
| Recuento resuelto bajo el umbral | Declara 20, resuelven 2 | La Colección no queda publicada, y nada derivado de ella la anuncia | Sin error |
| Umbral sobre lo declarado, no lo resuelto | Declara 20, resuelven 2, umbral 5 | **No** se publica: manda el resuelto | Sin error |
| Cita en varias Colecciones | Una Cita miembro de tres | Sus Temas y su Autor no cambian | Sin error |
| Miembro declarado que no existe | Un slug con errata, que no es ninguna Cita | La resolución no rompe, y el desajuste entre declarado y resuelto es visible | Sin error, pero contado |
| Miembro declarado dos veces | El mismo slug repetido en la lista | Cuenta una vez | Sin error |
| Colección sin miembros | Lista vacía | Resuelve a cero y no se publica | Sin error |
| Colección sin criterio o sin nombre | Falta un campo obligatorio | El build falla nombrando el fichero y la regla | Construcción abortada |

</intent-contract>

## Code Map

- `src/content.config.ts` -- cablea las reglas a las colecciones (AD-1). Hay tres: `citas`, `autores`, `temas`. **Añadir `colecciones`**, con base `./corpus/colecciones`. Ojo: la Historia 11.2 dejó aquí el comentario de que `corpus/fuentes/` **no** es colección; la de Colección sí lo es.
- `src/lib/admision.ts` -- las reglas, puras y sin disco (AD-5). Aquí va la forma del fichero de Colección; el esquema de Tema es `{ nombre }` a secas, así que la Colección es el primero con lista de miembros.
- `src/lib/publicado.ts` -- dueño del conjunto publicable (AD-11). `temasPublicados(temas, citas)` cuenta Citas que referencian cada Tema y filtra por `MIN_CITAS_POR_TEMA`: es **la dirección contraria** a la que hay que escribir aquí. `ConjuntoPublicable` es `{ citas, autores, temas }` y hay que ampliarlo. También `rutasPublicadas` y `verificarIntegridad`.
- `src/lib/umbrales.ts` -- `MIN_CITAS_POR_TEMA = 15`, `CITAS_POR_PAGINA = 50`, etc. Aquí va el umbral de Colección, provisional y dicho.
- `src/lib/superficies.ts` -- de la 12.1, el dueño único de la publicabilidad por familia de superficie. La familia de Colección se declara en la **12.3**, con su página; esta historia no la añade.
- `tools/lib/corpus.ts` -- lectores del corpus para las herramientas: `leerCitas`, `leerAutores`, `leerTemas`, `rutasDelCorpus`. La herramienta de curación es la 12.4, pero la lectura de Colecciones encaja aquí.
- `tests/unit/publicado.test.ts` -- las pruebas del conjunto publicable. `tests/unit/ayuda/construir.ts` es el andamio de build; siembra documentos de Fuente para las Citas de los fixtures.
- `corpus/temas/*.yml` -- ocho ficheros de una línea; el precedente de forma más cercano.

## Tasks & Acceptance

**Execution:**
- `src/lib/umbrales.ts` -- añadir el umbral mínimo de Colección con un valor **provisional**, y decir en el comentario que lo es y de dónde saldrá el definitivo -- AD-9 y §14.4 del PRD.
- `src/lib/admision.ts` -- la forma del fichero de Colección: nombre, criterio editorial y lista de miembros por slug. Pura, sin disco, y del mismo estilo que las reglas vecinas.
- `src/content.config.ts` -- cablear la colección `colecciones` sobre `./corpus/colecciones` -- ahí es donde la regla se convierte en puerta y un fichero que la incumpla rompe el build.
- `src/lib/publicado.ts` -- la **resolución blanda**: dada una Colección y el conjunto publicable, resolver sus miembros por intersección, contar sin repetir, y publicar solo si el recuento resuelto alcanza el umbral. Ampliar `ConjuntoPublicable`. Es el corazón de la historia y de la épica.
- `corpus/colecciones/` -- crear el directorio con una Colección de partida que sirva de ejemplo vivo del formato, o dejarlo vacío con su marcador si se prefiere no sembrar contenido editorial desde el bucle. Decide y déjalo escrito.
- `tools/lib/corpus.ts` -- lectura de Colecciones para las herramientas, en la línea de `leerTemas`.
- `tests/unit/colecciones.test.ts` (nuevo) -- la matriz de E/S sobre lo puro: por encima y por debajo del umbral, umbral sobre lo resuelto y no lo declarado, miembro inexistente, miembro repetido, lista vacía, y que una Cita en varias Colecciones no cambia.
- `tests/unit/colecciones-build.test.ts` (nuevo, o dentro de `publicacion.test.ts`) -- sobre un proyecto construido: una Colección con miembros publicados resuelve; retirar un miembro a `corpus/_revision/` **no rompe el build** y lo saca; una Colección sin nombre o sin criterio rompe el build nombrando fichero y regla.

**Acceptance Criteria:**
- Given un fichero en `corpus/colecciones/{slug}.yml` que declara sus miembros por slug, when se construye el sitio, then la pertenencia se resuelve intersectando esa lista con el conjunto publicable, y ninguna Cita ha sido modificada para pertenecer a la Colección.
- Given una Cita miembro que se mueve a `corpus/_revision/`, when se construye, then el build no falla y la Cita sale de todas sus Colecciones sin dejar hueco ni enlace roto.
- Given una Colección cuyo recuento **resuelto** cae por debajo del umbral, when se construye, then no queda publicada, y nada que derive del conjunto publicable la anuncia.
- Given el umbral mínimo, when se busca en el código, then vive solo en `src/lib/umbrales.ts`, con su valor declarado como provisional.
- Given una Cita que pertenece a varias Colecciones, when se consultan sus Temas y su Autor, then no han cambiado.

## Spec Change Log

## Review Triage Log

## Design Notes

**Por qué se invierte la dirección.** El Tema se declara en la Cita porque es una propiedad de la Cita: quién la escribió y de qué habla. La Colección es una decisión editorial **sobre un conjunto**, y puede cambiar sin que ninguna Cita cambie. Declararla en la Cita obligaría a editar decenas de ficheros para crear una agrupación, y a editarlos otra vez para deshacerla. AD-18 lo invierte a propósito.

**Por qué el umbral va sobre lo resuelto.** Si fuera sobre lo declarado, una Colección se publicaría anunciando veinte Citas y enseñando tres. El recuento que importa es el que el visitante ve.

**Lo blando no debe tapar erratas.** La resolución tolera que un miembro desaparezca —ese es su sentido— pero un slug con errata se comportaría igual: desaparecería en silencio. No conviene que rompa el build, porque entonces retirar una Cita rompería el build por la puerta de atrás. Que el desajuste entre declarado y resuelto sea **visible y contado**, como la deuda del censo de la 11.2, y que la herramienta de curación de la 12.4 sea la que cace la errata en el momento de escribirla.

## Verification

**Commands:**
- `npx astro check` -- expected: 0 errores.
- `npx vitest run` -- expected: todo en verde; ninguna de las 970 de la línea base perdida.
- `npm run build` -- expected: construye, con la puerta de la 11.2 intacta.
- `grep -rn "MIN_CITAS_POR_COLECCION\|umbral.*[Cc]olecci" src/ tools/ --include="*.ts" | grep -v umbrales.ts` -- expected: solo usos, ninguna definición fuera de `umbrales.ts`.

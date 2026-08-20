---
title: 'Story 13.3 — Una Colección anuncia su propia pieza'
type: 'feature'
created: '2026-08-20'
status: 'ready-for-dev'
baseline_revision: '3daba87'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-13-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-13-2-una-pieza-de-varias-citas.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-12-3-la-pagina-de-coleccion.md'
warnings: []
deferred: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** La Épica 12 dio a la cola larga dónde aterrizar —la Colección y su Página—, pero el Canal solo sabe anunciar Citas sueltas. Publicar una Cita de una Colección no anuncia la agrupación: manda a la Cita, y la Colección sigue sin que nadie sepa que existe.

**Approach:** Una suborden hermana de la 13.2: `npm run pieza -- coleccion <slug> --red <red>`. La misma plantilla, las mismas reglas de atribución y de tramos, y **dos diferencias que son el contenido de la historia**: la Pieza lleva el nombre de la Colección, y su enlace único apunta a la Página de Colección en vez de a una Cita.

## Boundaries & Constraints

**Always:**
- El umbral lo aplica el **tipo**, no una comprobación escrita: la función que compone exige una `ColeccionPublicada`, y la única forma de obtener una en todo el proyecto es `coleccionesPublicadas` (FR-32, AD-11). Una Colección por debajo del umbral no compila su Pieza, no es que se le diga que no.
- El enlace único es `/coleccion/<slug>` marcado por red, nunca el de una Cita.
- Se reutiliza la composición de la 13.2 —`svgDePieza`, `cabenEnPieza`, `citaEnPieza`, `nombreDePieza`—, no se duplica. Atribución visible por Cita, texto íntegro, tamaños de `tramos.ts`.
- El orden de las Citas es el **declarado en la Colección**: es curación de Héctor, no ordenación del sistema (`resolverColeccion` ya lo preserva).
- Lo que quede fuera de la Pieza se **dice por salida estándar**, con su motivo.

**Ask First:**
- Si cumplir un criterio exigiera relajar el umbral, o que una Colección retirada compusiera Pieza.

**Never:**
- No repliques el umbral con un `if`: existe `MIN_CITAS_POR_COLECCION` y existe un solo sitio donde se aplica. Un segundo lo haría divergir.
- No añadas superficie web, ni versiones la salida: sigue en `piezas/` (AD-15).
- No inventes presentación: el nombre de Colección usa el tratamiento que `DESIGN.md` ya le da (`headline-md`, serif 600), y todo lo demás es la plantilla de la 13.2.
- No toques FR-31 (pieza en movimiento).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Componer | Colección publicada y red válida | PNG con el nombre de la Colección y sus Citas; texto con **un** enlace a `/coleccion/<slug>?de=<red>` | Sin error |
| Bajo umbral | Colección con menos Citas resueltas que `MIN_CITAS_POR_COLECCION` | Se rechaza diciendo cuántas tiene y cuántas le faltan; no se compone nada | Código 1 |
| Retirada | Colección en `corpus/_colecciones-retiradas/` | Se rechaza: lo despublicado no se anuncia | Código 1 |
| Inexistente | Slug con errata | Se rechaza nombrando el slug | Código 1 |
| Miembros largos | Alguna Cita de la Colección supera `MAX_CARACTERES_IMAGEN` | Queda **fuera** de la Pieza y la salida lo dice con su motivo; la Pieza se compone con las demás | Sin error |
| No caben todas | La Colección tiene más Citas de las que caben | Entran las primeras del orden declarado que quepan; la salida dice cuántas quedaron fuera | Sin error |
| Ni dos que quepan | Menos de `MINIMO_DE_CITAS` aptas | Se rechaza: una Pieza reúne al menos dos | Código 1 |
| Red ausente o inválida | Sin `--red`, o `--red mastodon` | Se rechaza enumerando las redes válidas | Código 2 / 1 |
| Repetir | La misma orden dos veces | Mismo PNG byte a byte | Sin error |

</frozen-after-approval>

## Code Map

- `src/lib/pieza.ts` -- la plantilla de la 13.2, ya con `LADO=1080`, `MARGEN=96`, `MINIMO_DE_CITAS=2`, `CitaEnPieza`, `bloqueDe`, `apilado`, `desbordanALoAncho`, `cabenEnPieza`, `svgDePieza`. **Aquí entra un título opcional**: el alto del título y su separación tienen que entrar en `apilado`/`cabenEnPieza`, o el nombre de la Colección empujará la última Cita contra la marca.
- `src/lib/publicado.ts:165-233` -- `declare const umbralAplicado: unique symbol`, `ColeccionPublicada`, `resolverColeccion` (preserva el orden declarado, deduplica) y `coleccionesPublicadas` (**el único sitio con el umbral**, ordena por nombre en `es`). La marca no existe en ejecución: exigir el tipo no cuesta nada y cierra el criterio en el compilador.
- `tools/lib/piezas.ts` -- `componerPieza`, y las piezas a reutilizar tal cual: `nombreDePieza`, `citaEnPieza`, `motivosDeLaSalida`, `DIRECTORIO_DE_PIEZAS`, `redesValidas`. `textoDeLaPieza(citas, autores, red)` compone hoy el enlace a la portada: **hay que parametrizar el destino**, no escribir un segundo constructor.
- `tools/lib/curacion.ts:184` -- `inventarioDeColecciones(rutas)` y `coleccionesParaHuecos(colecciones, citas)`: el puente ya escrito entre `tools/lib/corpus.ts` y las funciones puras. `leerColecciones(rutas)` **lanza** si un YAML es ilegible.
- `tools/lib/corpus.ts` -- `rutas.colecciones` y `rutas.coleccionesRetiradas`. Una Colección despublicada **se mueve** de directorio (AD-2), así que «retirada» es no estar en el primero.
- `src/lib/superficies.ts:100-113` -- la ruta de la Página de Colección, `/coleccion/{slug}`. `src/lib/redes.ts` -- `enlaceConOrigen(ruta, red)`.
- `src/lib/umbrales.ts:102` -- `MIN_CITAS_POR_COLECCION = 15`, **provisional y declarado como tal**. No lo toques.
- `_bmad-output/planning-artifacts/ux-designs/.../DESIGN.md` -- `headline-md`: Source Serif 30px, weight 600, el tratamiento del nombre de Colección. La atribución sigue en Inter.
- `tests/unit/pieza-cli.test.ts` y `tests/unit/pieza.test.ts` -- los moldes; `tests/unit/ayuda/construir.ts` trae `coleccionValida(...)` y `citaValida(...)` para fabricar el corpus de prueba. Ojo: hacen falta **≥15** Citas resueltas para que una Colección de prueba se publique.

## Tasks & Acceptance

**Execution:**
- [ ] `src/lib/pieza.ts` -- admitir un título opcional en `svgDePieza` y en el cálculo de cabida, con el tratamiento de `headline-md`. Rationale: si el título no entra en el apilado, la Pieza de Colección desborda por abajo exactamente igual que desbordaba la marca antes del parche de la 13.2.
- [ ] `src/lib/coleccionEnPieza.ts` (nuevo, puro) o dentro de `pieza.ts` -- la selección: recibe una `ColeccionPublicada` y devuelve qué Citas entran y **qué queda fuera con su motivo**, en el orden declarado. Rationale: el criterio dice qué se anuncia; lo que no se anuncia y por qué es lo que hace la orden auditable.
- [ ] `tools/lib/piezas.ts` -- parametrizar el destino de `textoDeLaPieza`, y añadir `componerPiezaDeColeccion(rutas, slug, red, salida?)`: lee, obtiene la Colección **por `coleccionesPublicadas`**, distingue inexistente de retirada de bajo umbral, y compone reutilizando lo de la 13.2.
- [ ] `tools/pieza.ts` -- la suborden `coleccion`. `package.json` y `AGENTS.md` -- la orden nueva y sus rechazos, fuera del bloque gestionado.
- [ ] `tests/unit/pieza.test.ts` -- el título en el SVG con su tratamiento, y que la cabida lo cuenta.
- [ ] `tests/unit/pieza-coleccion-cli.test.ts` (nuevo) -- la matriz entera con corpus temporal: el enlace es `/coleccion/<slug>` y **no** el de ninguna Cita, bajo umbral, retirada, inexistente, miembro largo excluido y dicho, y que el corpus no cambia ni un byte.
- [ ] Una prueba de tipos que fije la puerta: pasar una `ColeccionResuelta` sin publicar donde se espera `ColeccionPublicada` **no compila**.

**Acceptance Criteria:**
- Given una Colección publicada, when compongo su Pieza, then el enlace de destino apunta a la Página de Colección y no a una Cita.
- Given una Colección por debajo de su umbral, when intento componer su Pieza, then no se produce: no se anuncia lo que no está publicado.
- Given la Pieza de Colección, when la reviso, then respeta las mismas reglas de atribución y de tramos que la Pieza de varias Citas.

## Spec Change Log

## Design Notes

**El umbral se cierra en el compilador, no en un `if`.** `ColeccionPublicada` lleva una marca de símbolo único no exportado, así que ningún módulo puede fabricar una: la única conversión de todo el proyecto está pegada al `filter` que aplica `MIN_CITAS_POR_COLECCION`. Si la firma de la composición exige ese tipo, «una Colección por debajo del umbral no produce Pieza» deja de ser una regla que hay que recordar. La 12.1 ya dejó escrito que una nota que hay que leer no es una puerta.

**Aquí sí se excluye en silencio... pero se dice.** En la 13.2 una Cita larga se rechaza, porque Héctor la nombró y descartarla convertiría su error en un artefacto publicado incompleto. Aquí no la nombró nadie: las Citas vienen de la pertenencia de la Colección, que puede tener veinte. Excluir es lo correcto —la Pieza tiene que poder componerse— pero la salida enumera qué quedó fuera y por qué, que es la diferencia entre excluir y perder.

**Una Colección de quince Citas no cabe en 1080.** Entran las primeras del orden declarado que quepan. El orden declarado es curación de Héctor y `resolverColeccion` ya lo preserva a propósito, así que la Pieza anuncia lo que él puso primero, no lo que el sistema decidió.

## Verification

**Commands:**
- `npx astro check` -- expected: 0 errores.
- `npx vitest run` -- expected: todo en verde; ninguna de las 1356 de la línea base perdida.
- `npm run build` -- expected: 53 páginas, sin superficie nueva.
- `grep -rn "MIN_CITAS_POR_COLECCION" src tools --include="*.ts"` -- expected: solo `umbrales.ts` y `publicado.ts`; ningún umbral replicado en `tools/`.
- `git status --porcelain` -- expected: vacío tras componer una Pieza de Colección de verdad.

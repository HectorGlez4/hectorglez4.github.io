---
title: 'Story 11.6 — Documentar una Cita ya publicada'
type: 'feature'
created: '2026-08-21'
status: 'ready-for-dev'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-11-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-11-1c-el-ano-lo-declara-la-obra.md'
warnings: []
deferred: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Una Cita anterior a la v3 **no se puede documentar**. `tools/alta.ts` toma la Fuente al crear y `revisar --aprobar` al aprobar, pero para una Cita ya publicada no hay ninguna orden: el único camino es editar su `.md` a mano y borrar su línea del censo, que es justo lo que las herramientas existen para evitar. Es el último criterio abierto de la Historia 11.4 — el censo de 38 pendientes de cotejo no puede menguar.

Y no es deuda formal. Al cotejar a Gracián contra su edición de 1647 aparecieron **dos Citas publicadas desde la v1 que no son suyas**: el Corpus dice «El sabio hace luego lo que el necio al fin» y el aforismo 268 dice «Haga al principio el cuerdo lo que el necio al fin»; «Saber y saberlo mostrar es saber dos veces» no aparece en ninguno de los 300. Son paráfrasis que circulan por internet con su nombre.

**Approach:** Una orden que **documenta** una Cita publicada contra un documento ya recuperado —comprobando que su texto aparece literal antes de escribir nada— y otra que **retira** a `corpus/_revision/` la que no supera el cotejo. Documentar y salir del censo ocurren en el mismo gesto, porque el censo exige que ocurran juntos.

## Boundaries & Constraints

**Always:**
- **Nada se escribe si el texto no aparece literal** en el documento. Es la puerta entera: si documentar pudiera hacerse sin cotejar, sería teclear una Procedencia con más pasos.
- La obra y el año se **derivan del documento** con los mismos lectores puros que usan `recuperar` y `extraer`, nunca de banderas ni de lo que la Cita ya tuviera tecleado.
- **O todo o nada**: la Cita y el censo se dejan de acuerdo, o no se toca ninguno de los dos. Una Cita que declara Fuente y sigue en el censo rompe la construcción, y un slug del censo sin Cita publicada también.
- Si la obra derivada **difiere** de la que la Cita ya declaraba, se dice antes de escribir: es un dato que cambia lo que lee el visitante.
- El fichero del censo conserva su cabecera y sus comentarios: se borra una línea, no se vuelca el fichero.
- Retirar **mueve** a `corpus/_revision/` (AD-2). No borra nada, y git conserva la historia.

**Ask First:**
- Si documentar exigiera relajar el cotejo, admitir una coincidencia aproximada, o tocar el texto de la Cita.

**Never:**
- **No corrijas el texto de la Cita para que cuadre.** Ausencia antes que mutilación (NFR-12): o aparece literal, o se retira. Ajustar un acento «para que pase» es inventar lo que la edición decía.
- No permitas altas en el censo: es cerrado y solo mengua.
- No dejes documentar una Cita que no esté publicada; para las candidatas ya está `revisar --aprobar`.
- No metas red en esta orden: el documento lo recupera `tools/recuperar.ts` (AD-22).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Documentar | Cita publicada cuyo texto aparece literal en el documento | Se escriben `fuente` y la Procedencia derivada, y **se borra su línea del censo** | Sin error |
| No aparece | El texto no está en el documento | Se rechaza sin tocar nada, nombrando el documento y recordando que se corrige contra la edición o se retira | Código 1 |
| Obra distinta | La Cita declaraba «Proverbios y cantares» y el documento declara otra | Se documenta con la del documento **y se dice el cambio** | Sin error |
| Ya documentada | La Cita ya declara `fuente` | Se rechaza: para cambiarla, primero se retira | Código 1 |
| Cita inexistente o en revisión | Slug con errata, o Cita en `_revision/` | Se rechaza nombrando el slug | Código 1 |
| Documento inexistente o ilegible | Ruta que no está, o fichero sin la forma de la recuperación | Se rechaza nombrando la ruta | Código 1 |
| Retirar | Cita publicada, con motivo | Se mueve a `corpus/_revision/`, **y sale del censo si estaba** | Sin error |
| Retirar sin motivo | Solo el slug | Se rechaza: sin motivo no es una retirada, es una desaparición | Código 2 |
| Fuera del censo | Cita publicada después de la v3, ya con Fuente | `retirar` funciona igual; `documentar` la rechaza por ya documentada | Código 1 |
| Texto corregido | `--texto` con el literal de la edición: aparece en el documento y se parece a la publicada | Se documenta con el texto restituido, **y se dice el antes y el después**; el slug no se recalcula | Sin error |
| Corregido que no aparece | `--texto` con algo que el documento no dice | Se rechaza: corregir es restituir, no inventar | Código 1 |
| Corregido que es otra Cita | `--texto` con otro pasaje **del mismo documento** | Se rechaza nombrando el parecido y el umbral | Código 1 |
| Rechazo al corregir | Cualquiera de los dos anteriores | No quedan tocados ni la Cita, ni el censo, ni el fichero | Código 1 |

</frozen-after-approval>

## Spec Change Log

### 2026-08-21 — `--texto`: restituir el texto de la edición

**Qué cambia.** `documentar` admite `--texto "<el texto literal de la edición>"`. Sin la
bandera se comporta como se especificó arriba: o el texto publicado aparece literal, o se
rechaza.

**Por qué.** Medido con las Citas reales del censo: el Corpus dice «Hombres necios que
acusáis a la mujer sin razón, sin ver que sois la ocasión de lo mismo que culpáis.» y las
*Redondillas* dicen lo mismo con una coma más y un punto y coma final. No es una paráfrasis:
es la misma Cita con la puntuación normalizada al teclearla en la v1, y ese es el patrón
general del censo —las que fallan el cotejo fallan casi todas por signos, no por contenido—.
Con el contrato original la única salida habría sido **retirar Citas verdaderas por una
coma**.

**Dónde estaba el hueco.** El «Never» juntaba dos cosas distintas: *ajustar el texto hasta
que pase* —que sigue prohibido, porque permitiría colar una Cita distinta— y *restituir el
texto exacto de la edición*, que es lo contrario de inventar: es hacer que el Corpus diga lo
que la Fuente dice. El propio mensaje de la 11.2 ya ofrecía esa salida por escrito
(«corríjala contra su edición, o retírela») y no tenía orden que la ejecutara.

**Las guardas que lo hacen seguro.**

1. El texto nuevo tiene que **aparecer literal en el documento**. Sin eso no se escribe
   nada: es lo que impide inventarlo, porque no se puede teclear algo que la edición no dice.
2. El texto nuevo tiene que ser **reconociblemente la misma Cita** que la publicada. El
   parecido se mide sobre la forma canónica de AD-3 —la definición que el proyecto ya tiene
   de «dos textos son la misma Cita»— con distancia de edición normalizada, y el umbral es
   `MIN_PARECIDO_PARA_CORREGIR = 0,85`. Una corrección que solo toca signos o acentos vale
   1; el par que descubrió el problema —«El sabio hace luego lo que el necio al fin» contra
   «Haga al principio el cuerdo lo que el necio al fin»— vale 0,60. El umbral vive en esa
   holgura y no pegado a ningún caso concreto.
3. **Se dice siempre lo que cambia**, con el antes y el después, antes de escribir.
4. El **slug no se recalcula** aunque el texto cambie: es la URL y es inmutable (AD-4).
5. Corregir el texto invalida la exención del censo, que va atada a la **huella del texto** y
   no al slug — razón de más para que documentar, corregir y salir del censo sean el mismo
   gesto.


## Code Map

- `tools/lib/cotejo.ts` -- `apareceEnDocumento(texto, cuerpo)` (colapsa espacios y nada más), `documentosDeCita`, `FICHERO_DEL_CENSO = 'pendientes-de-cotejo.yml'`, `CENSO_DE_PARTIDA` (slug → huella del texto), `TOPE_DE_PENDIENTES_DE_COTEJO`, `huellaDeTexto`, `motivoParaNoPublicar`. **El censo ata la exención a la huella del texto, no al slug**: por eso una Cita retirada y otra con el mismo slug no heredan la exención.
- `tools/lib/documento.ts` -- `analizarDocumento`, `derivarDeLaDeclaracion` (obra, página, año). De ahí sale la Procedencia.
- `tools/lib/fuentes.ts` -- `fuenteDe(id)`, con `nombre` y licencia, que es lo que va al bloque `fuente` de la Cita.
- `tools/lib/corpus.ts` -- `leerCitas(rutas.citas)`, `escribirCita`, `mover(origen, destinoDir)` (nunca sobrescribe), `separarFrontmatter`, `rutasDelCorpus`. `escribirPortada` es el precedente de **escritura atómica**, que aquí conviene para el censo.
- `tools/lib/revision.ts` -- `conTemasDeclarados` es el precedente exacto de insertar una clave en el frontmatter conservando el resto.
- `tools/lib/cli.ts` -- `terminar`, `posicionales`, `motivosDeArgumentosNoReconocidos`. Códigos: **2 la forma de la invocación, 1 lo que la invocación dice**.
- `corpus/pendientes-de-cotejo.yml` -- 38 slugs bajo `citas:`, con una cabecera larga de comentarios que **hay que conservar**.
- `tests/unit/cotejo.test.ts`, `tests/unit/cotejo-build.test.ts` -- lo que ya prueba la puerta; la orden nueva no puede aflojarla.

## Tasks & Acceptance

**Execution:**
- [ ] `tools/lib/documentacion.ts` (nuevo) -- `documentarCita(rutas, slug, rutaDelDocumento): Promise<Resultado>` y `retirarCita(rutas, slug, motivo): Promise<Resultado>`. Toda la lógica, con la regla de o todo o nada.
- [ ] `tools/lib/cotejo.ts` -- el ayudante que borra un slug del censo **conservando la cabecera**, si no existe ya.
- [ ] `tools/documentar.ts` (nuevo) -- la orden, con sus dos formas y el guardián de banderas.
- [ ] `package.json` -- guion `documentar`. `AGENTS.md` -- cómo se documenta y cómo se retira, fuera del bloque gestionado.
- [ ] `tests/unit/documentacion.test.ts` (nuevo) -- la matriz sobre lo puro, con corpus temporal: documenta, rechaza lo que no aparece, obra distinta, ya documentada, y **que un rechazo no deja ni la Cita ni el censo tocados**.
- [ ] `tests/unit/documentar-cli.test.ts` (nuevo) -- por la orden, incluido `retirar` sin motivo y que el censo conserva sus comentarios.
- [ ] Una prueba de que **documentar una Cita y no sacarla del censo rompería el build**, para que quede fijado que van juntos.
- [ ] `--texto` (enmienda del 2026-08-21, en el Spec Change Log): restituir el texto literal de la edición, con sus dos guardas —aparece literal, y sigue siendo la misma Cita— y su umbral escrito con su porqué.

**Acceptance Criteria:**
- Given una Cita publicada cuyo texto aparece literal en un documento recuperado, when la documento, then queda con su Fuente y su Procedencia derivadas del documento y **fuera del censo**, y el build sigue en verde.
- Given una Cita cuyo texto **no** aparece, when intento documentarla, then se rechaza sin tocar la Cita ni el censo.
- Given una Cita que no supera el cotejo, when la retiro con su motivo, then queda en `corpus/_revision/` y fuera del censo, y el build sigue en verde.
- Given cualquier operación, when termina, then el censo conserva su cabecera y sus comentarios.

## Design Notes

**Por qué documentar y salir del censo son un solo gesto.** El censo declara «esta Cita se publica sin cotejar porque no tiene documento». En cuanto lo tiene, la frase es falsa, y el propio cotejo rompe la construcción si la encuentra en los dos sitios. Separar las dos operaciones dejaría un estado intermedio que **no puede existir**, y una orden que puede dejar el corpus en un estado imposible no es una herramienta: es una trampa.

**Por qué el rechazo es el caso importante.** Documentar lo que cuadra es trámite. Lo que esta orden aporta de verdad es negarse cuando no cuadra, porque es el único momento en que alguien se entera de que una Cita publicada no dice lo que su autor escribió. El mensaje tiene que dejar claras las dos salidas —corregir contra la edición, o retirar— y no insinuar una tercera.

**Golden example del rechazo esperado:**

```
«baltasar-gracian-el-sabio-hace-luego-lo-que-el» no aparece en
corpus/fuentes/wikisource-es--oraculo-manual-…-aforismos-251-275.txt.
La comparación colapsa espacios y nada más. No se toca el texto de la Cita para que
cuadre (NFR-12): corríjala contra su edición —con --texto "<el texto literal de la
edición>"—, o retírela con
  npx tsx tools/documentar.ts --retirar <slug> "<motivo>"
No se ha escrito nada: ni la Cita ni el censo.
```

## Verification

**Commands:**
- `npx astro check` -- expected: 0 errores.
- `npx vitest run` -- expected: verde; ninguna de las 1617 de la línea base perdida.
- `npm run build` -- expected: construye, con el recuento de pendientes ya menguado.
- `git diff corpus/pendientes-de-cotejo.yml` -- expected: solo líneas borradas; la cabecera intacta.

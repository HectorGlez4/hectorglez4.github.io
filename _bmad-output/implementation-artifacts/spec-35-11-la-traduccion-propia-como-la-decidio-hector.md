---
title: 'Historia 35.11 — La traducción propia, como la decidió Héctor'
type: 'feature'
created: '2026-11-14'
status: 'ready-for-dev'
baseline_revision: '37a44f3e372fa31320954ce9c47f17891377e030'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-35-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-35-10-la-siembra-acotada-desde-brainyquote.md'
warnings: [oversized]
deferred:
  - summary: 'Pendiente de Héctor (bmad-architecture): AD-32 v9.2 dice «una entrada de fecha igual o posterior a su último cambio de texto» sin decir de dónde sale la fecha del cambio. Esta historia lo lee como orden de commits (ver Design Notes); si Héctor quiere otra lectura, se enmienda la espina.'
    severity: medium
    location: 'integraciones/clases.ts, tools/lib/aprobaciones.ts'
  - summary: 'Pendiente de Héctor: LENGUAS_DE_PARTIDA entra con códigos ISO 639-1 de trabajo (en, fr, it, de, pt, ja); ampliarlo o renombrarlo es un diff suyo.'
    severity: low
    location: 'src/lib/admision.ts'
  - summary: 'Pendiente de Héctor: dar valor a MAX_PROPORCION_MAL_TRADUCIDA_SM_C6 (y a las demás constantes de SM-C6). Ningún agente lo hace.'
    severity: low
    location: 'src/lib/umbrales.ts'
---

<intent-contract>

## Intent

**Problem:** La 35.10 construyó la traducción propia antes de que la planificación v9.2 la fijara: la Página de Cita dice «Traducción de Sabiduría de Bolsillo…» (`TraduccionPropia.astro`, `lineaDeTraduccionPropia`), el `origen` fecha la Página de Cita, la frase de partida es `textoOriginal` (sin lengua), la aprueba una persona sin registro y SM-C6 no la muestrea aparte. PRD v9.2 (FR-68), espina v9.2 (AD-24, AD-27, AD-32, AD-34, AD-35), UX v9.3 y SPEC dicen otra cosa, y la Épica 35 no se funde sin ajustarlo.

**Approach:** Retirar la línea visible; cambiar `textoOriginal` por `partida: {texto, lengua}`; exigir dos agentes distintos (`--propone`/`--aprueba`) y anotarlos en un registro nuevo que solo añade, con puerta en el build; abrir en `atribuida texto` la sustitución por la versión que circula; y dar a la auditoría de SM-C6 una segunda muestra solo de traducción propia con `mal-traducida` y su umbral sin valor.

## Boundaries & Constraints

**Always:**
- Ninguna superficie pinta `origen` ni `partida`: ni línea, sello, nota, hueco ni nodo vacío; los dos en `CAMPOS_QUE_NO_FECHAN.cita`, junto a `atestiguaciones`.
- `partida` solo con `origen: traduccion-propia`, y en él obligatoria; la Variante nunca lleva ese origen y una traducción propia nunca lleva Variante (ya en `reglasDeLaAtribuida`, se conserva).
- `corpus/aprobaciones-de-atribuidas.yml` se versiona con su cabecera y `aprobaciones:` vacío; solo añade `{slug, propone, aprueba, fecha}` por `appendFile`, juzgando el añadido en memoria antes y releyendo después (patrón de `registrarClases`, `tools/lib/corpus.ts:3833`); lo escriben solo el alta y `revisar --aprobar` que publican una traducción propia, y `atribuida texto` que la retraduce conservando el origen; siempre **después** de escribir la Cita y, si falla, la Cita vuelve: la aprobada, a `corpus/_revision/` con su contenido de antes; la dada de alta, movida a `corpus/_revision/` (AD-2, nada se borra); la retraducida, a su contenido original. El parte lo dice y sale con 1. Se escribe antes que `clases-de-cita.yml`, y una Cita devuelta no se anota allí.
- `propone` y `aprueba`: cadenas no vacías tras recortar, una línea; se comparan recortadas y en minúsculas. Igual, o falta alguna, con una traducción propia en la pasada → 1 sin escribir nada (también en seco). Dadas sin ninguna traducción propia en la pasada → 1 («solo la traducción propia lleva dos agentes»).
- Ninguna orden posterior al alta crea una traducción propia: `atribuida texto --origen traduccion-propia` y `atribuida variante` con ese origen → 1.
- Ninguna prueba ni orden escribe en el Corpus real; `MAX_PROPORCION_MAL_TRADUCIDA_SM_C6` queda `undefined`; `src/lib/vocabulario.ts` no se toca; con el Corpus real (sin atribuidas) `dist/` solo cambia por lo que se quita.
- Ningún módulo de `src/` nombra el registro nuevo ni `tools/lib/aprobaciones.ts` (AD-24); el registro no es familia de AD-27 (no fecha ni avisa).

**Block If:**
- La retirada de `TraduccionPropia.astro` o de `origen` de `CAMPOS_QUE_PINTA` mueve `dist/` del Corpus real más allá de quitar ese componente (bytes de otras páginas): parar y reportar.
- Hace falta editar `_bmad-output/planning-artifacts/` o `_bmad-output/specs/`.

**Never:**
- Sembrar, traducir o aprobar sobre el Corpus real; dar valor a constantes de Héctor; escribir el registro a mano.
- Comprobar el sentido inverso del registro (una entrada de una Cita retirada o sustituida no rompe nada).
- Mantener `textoOriginal` como alias ni compatibilidad hacia atrás (el Corpus real no tiene ninguna).
- Pintar `mal-traducida` en la primera muestra o mezclar los juicios de las dos muestras.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Esquema, traducción propia | atribuida `origen: traduccion-propia`, `partida: {texto: 'To infinity and beyond!', lengua: en}` | admitida | — |
| Sin partida / partida en otro origen / `textoOriginal` | falta, `origen: doblaje` con partida, o campo viejo | rechazo que nombra «partida» | mensaje del esquema |
| Partida mal formada | lengua fuera de `LENGUAS_DE_PARTIDA`, texto en blanco o con salto, clave extra | rechazo | mensaje del esquema |
| Aprobar traducción propia | `revisar --aprobar s --temas t --propone a --aprueba b` | publica, anota `{s, a, b, hoy}` y su clase | — |
| Agentes iguales / falta uno | `--propone Ana --aprueba " ana "` o sin `--aprueba` | 1, nada escrito | parte nombra la regla |
| Registro falla tras escribir | append que lanza | la Cita vuelve a `_revision/`, sin entrada de clase; 1 | parte nombra Cita y registro |
| Sustituir | publicada propia; `atribuida texto s "<versión>" --origen doblaje --atestiguacion u1 --atestiguacion u2` | texto y origen nuevos, atestiguaciones = las nuevas (`consultadaEl` hoy), sin `partida`, mismo slug, sin parecido, sin entrada | topes, mínimo de dominios y duplicados como siempre → 1 |
| Retraducir | publicada propia; `atribuida texto s "<texto>" --propone a --aprueba b` | parecido de siempre; entrada nueva | sin agentes → 1 |
| Origen en Cita no propia | `--origen`/`--atestiguacion`/`--propone` sobre otra atribuida | 1 | `--atestiguacion` sin `--origen` → 2 |
| Build | propia publicada sin entrada, o una suya con `propone`=`aprueba`, o texto cambiado en un commit posterior al de su última entrada | rompe nombrando fichero y registro | sin historial de git: solo existencia e igualdad, y avisa con el motivo |
| Auditoría | mes cerrado, `MUESTRA=n`, propias al cierre | segunda muestra de n por SHA-256 de `traduccion|{slug}|{mes}`; anota `muestraDeTraduccion`/`resultadosDeTraduccion` | `mal-traducida` en `--resultado` → 2; slug ajeno o resultado que falta → 1 |

</intent-contract>

## Code Map

- `src/components/TraduccionPropia.astro`, `src/pages/cita/[slug].astro:17,188-190` -- se borra el componente y su uso.
- `src/lib/atribucion.ts:246-256` -- `lineaDeTraduccionPropia` se retira (y su import de `MARCA` si queda sin uso).
- `src/lib/publicado.ts:123-128,1727-1728` -- campo `traduccionPropia` y su relleno se retiran; el import de `ORIGEN_TRADUCCION_PROPIA` si queda sin uso.
- `src/lib/admision.ts:259-327,366,446-485,893-894` -- `ORIGENES` (comentario), `textoOriginal` → `partida` (`z.strictObject {texto, lengua}`) y `LENGUAS_DE_PARTIDA` exportada; `reglasDeLaAtribuida` y la de siempre nombran `partida`.
- `src/content.config.ts:27,111` -- `textoOriginal` → `partida`.
- `src/lib/clase.ts:37` -- `ORIGEN_TRADUCCION_PROPIA` (se reutiliza).
- `tools/lib/cambios.ts:316-318,399-403` -- quitar `origen` de `CAMPOS_QUE_PINTA.cita.cita`; `CAMPOS_QUE_NO_FECHAN.cita` = `[..., 'atestiguaciones', 'origen', 'partida']`.
- `tools/lib/corpus.ts:176-195,421-424,3786-3869` -- constantes de nombre de registro y `Rutas`; patrón de `registrarClases`/`analizarClases`/`CABECERA_DE_CLASES`; `fechaLocal:1488`; `leerCitas`, `escribirCita`.
- `tools/lib/aprobaciones.ts` (nuevo) -- `FICHERO_DE_APROBACIONES` vía `corpus.ts`, `CABECERA_DE_APROBACIONES`, `analizarAprobaciones`, `leerAprobaciones`, `registrarAprobaciones`, `mismoAgente(a,b)`, `problemaDeLosAgentes(propone?, aprueba?)` y la pura `fallosDeAprobaciones(traducciones, entradas)` (con instantes opcionales).
- `tools/lib/revision.ts:489-850` (`aprobar`) y `tools/alta.ts:226-400` (`darDeAltaLote`) -- opción `agentes?: {propone, aprueba}`; añadido del registro tras el bucle de escritura y antes de `registrarClases`, con su vuelta atrás. `tools/revisar.ts:50-100` y el `principal` de `tools/alta.ts:~1010` -- banderas `--propone`/`--aprueba`.
- `tools/lib/cambioDeAtribuida.ts:67-72,215-226,272-460` -- `texto` gana `origen?`, `atestiguaciones?`, `agentes?`; rama de sustitución sin parecido; rama de retraducción con registro y vuelta atrás (la escritura y la vuelta de la Cita ya están en 423-450). `tools/atribuida.ts:58-145,242` -- `FORMA.texto` con `--origen`, `--atestiguacion` (repetible), `--propone`, `--aprueba`; mensaje de la línea 242.
- `tools/lib/siembraAtribuida.ts:14,195-196,227-249,408` -- `partida` en lugar de `textoOriginal` en `CAMPOS_DEL_LOTE`, en lo escrito y en `MOTIVO_SIN_ESPAÑOL`/aviso.
- `integraciones/clases.ts` -- leer el registro y `fallosDeAprobaciones`; para las propias publicadas (si hay alguna) pedir a `integraciones/historial.ts` (`estadoDelRepositorio:150`, `historialDeLosFicheros:335`, `cambiaronLosCampos` de `tools/lib/cambios.ts:224`) el instante del último cambio de `texto` y el de la aparición de cada entrada; sin propias, no llama a git.
- `src/lib/umbrales.ts:1500-1516` -- `MAX_PROPORCION_MAL_TRADUCIDA_SM_C6: number | undefined = undefined` con su comentario.
- `tools/lib/peticiones.ts:61-73,97-108,327-399,600-800` -- `RESULTADOS_DE_TRADUCCION` (los tres + `mal-traducida`), `Auditoria` con `muestraDeTraduccion?`/`resultadosDeTraduccion?` (los dos o ninguno), `claveDeMuestraDeTraduccion`, `muestraDeTraduccion`, `mesesDeSmC6` con `traduccionesHoy` (población y `auditoriaDeTraduccion`), `juicioDeTraduccionSmC6`; cabecera del registro de auditorías.
- `tools/peticion.ts:70-160,416-641` -- constante nueva en `Constantes`/`problemasDeLasConstantes`; `auditar` con `--resultado-de-traduccion`; consulta y JSON con la columna y el juicio aparte; `traduccionesHoy` = slugs con `origen: traduccion-propia` en `corpus/citas/` o `corpus/_revision/`.
- Pruebas a tocar: `tests/unit/variante.test.ts`, `variante-build.test.ts`, `siembra-atribuida.test.ts`, `atribuidas.test.ts:293-296`, `atribuida-cli.test.ts:315-345`, `fecha-de-cambio.test.ts:1571-1590`, `peticiones.test.ts` (auditoría y «registros del árbol»), `revision.test.ts`/`alta.test.ts` (agentes), `clase-build.test.ts` (puerta del registro). Ayudas: `tests/unit/ayuda/construir.ts` (`conLaPuertaAbierta`, `citaValida`, `ATESTIGUADA`).
- `AGENTS.md:221-535` -- la puerta, la sesión de sembrado de la atribuida y los registros.

## Tasks & Acceptance

**Execution:**
- `src/components/TraduccionPropia.astro`, `src/pages/cita/[slug].astro`, `src/lib/atribucion.ts`, `src/lib/publicado.ts` -- retirar componente, uso, `lineaDeTraduccionPropia` y `traduccionPropia` -- la página no lo dice.
- `src/lib/admision.ts`, `src/content.config.ts` -- `partida` con `LENGUAS_DE_PARTIDA = ['en','fr','it','de','pt','ja']` y las reglas de la matriz; comentarios al día (la página no dice el origen) -- AD-32 v9.2.
- `tools/lib/cambios.ts` -- `origen` y `partida` a `CAMPOS_QUE_NO_FECHAN` -- AD-27 v9.2.
- `src/lib/umbrales.ts` -- `MAX_PROPORCION_MAL_TRADUCIDA_SM_C6` sin valor -- de Héctor.
- `tools/lib/corpus.ts`, `tools/lib/aprobaciones.ts`, `corpus/aprobaciones-de-atribuidas.yml` -- el registro (nombre, ruta en `Rutas`, cabecera, lector, escritor, juicio puro) y el fichero con cabecera y lista vacía -- el quinto registro.
- `tools/lib/revision.ts`, `tools/revisar.ts`, `tools/alta.ts` -- agentes, añadido y vuelta atrás -- doble aprobación.
- `tools/lib/cambioDeAtribuida.ts`, `tools/atribuida.ts` -- sustitución y retraducción -- AD-35 v9.2.
- `tools/lib/siembraAtribuida.ts` -- `partida` en el lote -- `proponer` la acepta.
- `integraciones/clases.ts` -- la puerta del build -- un solo sentido.
- `tools/lib/peticiones.ts`, `tools/peticion.ts` -- segunda muestra, registro y juicio aparte -- SM-C6 v9.2.
- `tests/unit/aprobaciones.test.ts` (nuevo) -- analizador, escritor (solo añade, relectura, cabecera), agentes, `fallosDeAprobaciones` con instantes, el árbol (cabecera y lista vacía, empieza por el de `HEAD^1`, no es familia de AD-27, ningún `src/` lo nombra) y el historial real sobre un repositorio temporal (texto cambiado en commit posterior a la entrada → fallo; en el mismo commit o sin commitear los dos → pasa).
- Pruebas existentes de la lista del Code Map -- al día con `partida`, sin la línea, con agentes; `variante-build.test.ts`: dos atribuidas en la copia iguales salvo texto, una `traduccion-propia` con `partida` y su entrada, otra `doblaje`: sus páginas son idénticas tras sustituir slug y texto, y ninguna lleva `traduccion-propia`; `peticiones.test.ts`: la segunda muestra fijada con slugs de prueba, una Cita en las dos muestras juzgada por separado, juicio aparte con y sin constante.
- `AGENTS.md` -- «Una sesión de sembrado de la Cita atribuida»: último recurso, `partida`, dos agentes y su registro, la página no lo dice, cómo se sustituye; la puerta (origen ya no se pinta); la auditoría y los cinco registros (tres leídos por el build); la persona aprueba la atribuida con otro origen por convención, sin puerta.

**Acceptance Criteria:**
- Given una Página de Cita atribuida con `origen: traduccion-propia`, when se construye, then no contiene `traduccion-propia`, «Traducción de», `partida` ni ningún nodo nuevo, y es igual a la de la misma Cita con `origen: doblaje` salvo el texto.
- Given `tests/unit/fecha-de-cambio.test.ts`, when se corre, then toda clave del esquema está clasificada y un cambio solo de `origen` o de `partida` no fecha nada.
- Given `npm run atribuida -- proponer` con una candidata con `origen: traduccion-propia` y `partida`, when pasa la puerta de calidad, then queda en `corpus/_revision/` con su `partida`; sin `texto` sigue rechazada con `MOTIVO_SIN_ESPAÑOL`.
- Given la consulta `npm run peticion` con auditorías de traducción, when hay valor de mínimo y de `MAX_PROPORCION_MAL_TRADUCIDA_SM_C6` (por parámetro), then da la proporción mal traducida aparte y salta en el segundo de dos meses cerrados seguidos sobre su propia población; sin valor, informa y lo dice.
- Given la historia cerrada, when se mira el árbol, then `git status --short corpus/` solo muestra `corpus/aprobaciones-de-atribuidas.yml` nuevo, y `MAX_PROPORCION_MAL_TRADUCIDA_SM_C6` es `undefined`.

## Spec Change Log

## Review Triage Log

## Design Notes

- **«Fecha igual o posterior a su último cambio de texto», leído como orden de commits.** La orden escribe la entrada con la jornada de hoy y el commit llega después, quizá otro día: comparar la `fecha` con el instante del commit rompería un flujo legítimo, y la Cita no guarda ninguna fecha de texto. Por eso el build exige que alguna entrada del slug **apareciera en el registro** en el mismo commit que el último cambio de `texto` de la Cita, en uno posterior, o sin commitear; y que, si el texto está sin commitear, también lo esté la entrada. Instante del texto: la última transición del fichero con `cambiaronLosCampos(t, ['texto'])` (el alta cuenta), o «sin commitear» si el `texto` del disco difiere del de `HEAD` o el fichero no está en `HEAD`. Instante de la entrada *i*: la primera versión del registro con más de *i* entradas (el registro solo añade), o «sin commitear» si `HEAD` no la tiene. Sin historial fiable (`motivo` de `estadoDelRepositorio`: copia superficial, sin git) se comprueban solo la existencia y la igualdad, y el build avisa con el motivo, como el sitemap. Diferido a Héctor.
- **Población de la segunda muestra.** Atribuidas al cierre (`atribuidasAlCierre`) cuyo fichero de hoy —en `corpus/citas/` o `corpus/_revision/`— declara `origen: traduccion-propia`; sin leer git, como la primera. Una sustituida deja de contar. El mínimo de juicio se aplica a esa población.
- **Ejemplo de entrada:** `  - { slug: "buzz--al-rescate", propone: "agente-a", aprueba: "agente-b", fecha: "2026-11-14" }`.

## Verification

**Commands:**
- `npx vitest run tests/unit/aprobaciones.test.ts tests/unit/variante.test.ts tests/unit/siembra-atribuida.test.ts tests/unit/atribuida-cli.test.ts tests/unit/atribuidas.test.ts tests/unit/peticiones.test.ts tests/unit/fecha-de-cambio.test.ts` -- expected: verde.
- `npx vitest run tests/unit/variante-build.test.ts tests/unit/clase-build.test.ts tests/unit/revision.test.ts tests/unit/alta.test.ts` -- expected: verde.
- `npx astro check` -- expected: 0 errores.
- `npm run build` en el árbol, comparado con la línea base (`git worktree add --detach` de `baseline_revision` bajo `.claude/v9-ralph/tmp-wt/`) -- expected: `dist/` idéntico salvo lo que quita el componente.
- `npm test` (desatendido con `correr.sh`) -- expected: verde.

## Auto Run Result

Status: ready-for-dev
Blocking condition: ninguna (parada tras planificar, como pedía la invocación).

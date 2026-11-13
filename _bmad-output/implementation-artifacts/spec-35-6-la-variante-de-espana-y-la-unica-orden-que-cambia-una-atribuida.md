---
title: 'Historia 35.6 — La Variante de España, y la única orden que cambia una atribuida'
type: 'feature'
created: '2026-11-13'
status: 'done'
baseline_revision: 'ec89fecf2cca398f25032bba6408fa323be17e59'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-35-context.md'
warnings: ['oversized']
deferred:
  - summary: 'Intercambiar principal y Variante [ASSUMPTION]: la historia admite el intercambio por la regla del parecido, pero con dos invocaciones sucesivas el texto anterior se perdería en la primera. Se construye como un solo gesto: `texto` con un texto canónicamente igual al de la Variante (o `variante` con uno igual al principal) intercambia los dos textos y sus dos `origen`; la `region` no cambia. Si el intercambio debe ser otra cosa (una suborden, otra forma), lo decide Héctor (bmad-architecture).'
    evidence: 'epics.md Story 35.6 («intercambiar principal y Variante se admite»); ARCHITECTURE-SPINE.md AD-35 tercera cláusula.'
  - summary: '`obra`, `autor` y `personaje` solo **añaden** [ASSUMPTION]: con el campo ya declarado la orden se niega con 1 (cambiar la Obra, el Autor o el Personaje de una atribuida publicada no es «añadirle»). Quitar una Variante tampoco tiene suborden. Si deben admitirse, lo decide Héctor (bmad-architecture).'
    evidence: 'epics.md Story 35.6 («el único camino para añadirle Obra, Autor o Personaje, o cambiar su variante o su texto»).'
  - summary: 'La historia nombra `tests/unit/ayuda/indice-de-pagefind.ts` para la prueba de búsqueda, pero ese andamio solo descodifica el índice; el que lo consulta es `indiceDe` de `tests/unit/ayuda/pagefind.ts` (27.1). La prueba usa el segundo. Si la historia debe decir el otro nombre, pendiente de Héctor (bmad-create-epics-and-stories).'
    evidence: 'tests/unit/ayuda/pagefind.ts:68 indiceDe(proyecto) con search(); tests/unit/ayuda/indice-de-pagefind.ts solo indiceDe(dist) descodificado.'
  - summary: 'Los modos por lote de `documentar` (`--restituir-traduccion`, `--restituir-saltos`) saltan las atribuidas y las cuentan en su parte, además de negarse la orden por slug: «documentar no toca una atribuida» (AD-35). Si deben fallar en vez de saltarlas, lo decide Héctor.'
    evidence: 'tools/lib/documentacion.ts restituirTraducciones (1059), restituirSaltos (1219).'
---

<intent-contract>

## Intent

**Problem:** Una frase con dos doblajes (Latinoamérica y España) solo puede entrar hoy como dos Citas con dos URL, y nada en el Corpus impide editar a mano una atribuida publicada saltándose su Ficha de Obra, sus topes y su clase; `documentar` tampoco se niega ante ella.

**Approach:** Un campo `variante: {texto, region, origen}` solo de la atribuida, juzgado por el esquema, comparado como duplicado con `parecidoEntre` en el build, el alta y la aprobación, y pintado en la Página de Cita por una línea que compone `atribucion.ts`; y una orden `npm run atribuida -- {obra|autor|personaje|variante|texto}` que es el único camino para cambiar una atribuida publicada, con `documentar` negándose ante ella. Con el Corpus real (sin atribuidas) `dist/` no cambia.

## Boundaries & Constraints

**Always:**
- `REGIONES_DE_VARIANTE` vive en un módulo puro nuevo `src/lib/variante.ts` (conjunto cerrado, hoy `espana` → rótulo «España»); `admision.ts` y `atribucion.ts` lo importan. `origen` de la Variante es `ORIGENES` de `admision.ts`.
- La Variante no entra en el slug (sale solo del texto principal, AD-4/NFR-4), ni en lo copiado, compartido, la Imagen, el Fragmento, la Tarjeta Social, la meta description ni el JSON-LD.
- La línea «En España: «{texto}»» la compone solo `lineaDeVariante` de `src/lib/atribucion.ts`; se pinta solo en `src/pages/cita/[slug].astro`, tras `<Fuente>` y antes de `<FilaDeAcciones>`, dentro de `data-pagefind-body` y fuera de todo `data-pagefind-ignore`, nunca en un `data-pagefind-meta`; sin `lang`, no enfocable, sin enlace. Sin Variante no se emite nada (ni nodo vacío).
- Presentación por tokens en atributo `style` (precedente de `Sostener.astro`): `font-family: var(--sans)`, `font-size: var(--pie)`, `line-height: var(--interlineado-pie)`, `color: var(--tinta-apagada)`, `margin: var(--unidad) 0 0`, `max-width: var(--medida-prosa)`. **Sin bloque `<style>`**: uno nuevo re-trocearía el CSS de toda Página de Cita aunque no se pinte (pitfall de AGENTS.md, «Encender un Modelo»).
- La orden carga la puerta como el alta: `opciones.puerta` (`ValoresDeLaPuerta`) por parámetro, por omisión `VALORES_DEL_ARBOL`; con la puerta cerrada del árbol toda invocación válida sale con 1 sin escribir. Las pruebas abren la puerta por parámetro o con `conLaPuertaAbierta` en una copia, nunca en el árbol.
- Códigos: 2 por la forma de la invocación (suborden desconocida, argumentos de menos o de más, bandera desconocida, repetida o vacía, `variante` sin `--region` o `--origen`); 1 por lo que dice; en ningún caso de error se escribe nada (Cita ni ficha). No cambian slug ni nombre de fichero.
- Claves nuevas del esquema clasificadas en el mismo commit: `variante` en `CAMPOS_QUE_PINTA.cita.cita` (solo Página de Cita) de `tools/lib/cambios.ts`.
- Al terminar: `dist/` idéntico con el Corpus real (fuera de `pagefind/`), y `AGENTS.md` dice la orden y que una atribuida publicada no se edita a mano.

**Block If:**
- Con el Corpus real y `FECHA_JORNADA` fija, `diff -r -x pagefind` de `dist/` antes/después muestra cualquier diferencia → HALT `blocked` nombrando los ficheros.
- Algún guion empaquetado (`GUIONES_EXTERNOS`) cambia de bytes o pasa su tope por este cambio.

**Never:**
- Sembrar Variantes, atribuidas, Personajes o claves en el Corpus real, ni correr la orden nueva sobre él; dar valor en el árbol a las constantes de la puerta (`MAX_CARACTERES_DE_ATRIBUIDA`…, `BUZON_DE_PETICIONES`).
- Tocar `src/lib/vocabulario.ts`, zonas o eventos; editar `_bmad-output/planning-artifacts/` o `_bmad-output/specs/`; tocar `sprint-status.yaml`.
- Una segunda medida de parecido fuera de `tools/lib/parecido.ts` (`parecidoEntre`, `parecidoDeTextos`, `MIN_PARECIDO_PARA_CORREGIR`).
- Construir la línea de retirada (35.8), lo que cuenta solo la clase de siempre (35.7) ni `formas-vedadas.yml`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Variante válida | atribuida con `variante: {texto, region: espana, origen: doblaje}` | el esquema la admite; la página pinta «En España: «…»» | — |
| Siempre con Variante | Cita sin `clase` con `variante` | el build rompe nombrando el fichero (regla de `reglasDeClase`) | build falla |
| Forma mala | `region: mexico`, `origen` ajeno, `\n` en el texto, lista en vez de objeto, clave extra | regla incumplida con su mensaje | esquema |
| Variante larga | `variante.texto` > `maxCaracteres` (puerta abierta) | fallo de `fallosDeAtribuidas` que nombra «la variante» | build / órdenes |
| Duplicado por Variante | la Variante (o el texto) de una atribuida coincide (`parecidoEntre`) con texto o variante de otra Cita de cualquier clase | fallo de duplicado entre clases nombrando la otra | build rompe; alta/aprobación la dejan en revisión |
| Alta de siempre igual a una Variante publicada | entrada sin clase cuyo texto repite la Variante de una publicada | sale en `posiblesDuplicados` (FR-14), salvo `--con-duplicados` | no escribe |
| `texto` parecido | `atribuida -- texto <slug> "<t>"`, `t` ≥ 0,85 del texto o de la variante | reescribe `texto`, slug y fichero intactos | — |
| `texto` distinto | parecido < 0,85 con los dos | se niega con 1 | no escribe |
| Intercambio | `texto` con el texto (canónico) de la Variante | texto ↔ variante.texto y origen ↔ variante.origen; `region` igual | — |
| Clase de siempre | cualquier suborden sobre una Cita sin `clase` | se niega con 1 («la clase no cambia») | no escribe |
| Añadir Personaje a Autor vivo | `personaje <slug> <p>` | sigue atribuida, mismo slug y fichero | — |
| Añadir Autor DP a Personaje | `autor <slug> <a>` con `añoFallecimiento` | sigue atribuida, mismo slug y fichero | — |
| Dueño de Obra cambiaría | `autor` cuyo Autor posee una ficha con la misma forma | se niega con 1 (la Obra resolvería otra ficha) | no escribe |
| Campo ya declarado | `obra`/`autor`/`personaje` ya presente | se niega con 1 | no escribe |
| Inexistente / en revisión | slug no publicado, Autor o Personaje que no existe | se niega con 1 con su motivo | no escribe |
| `documentar` sobre atribuida | `npm run documentar -- <slug> <doc>` o `--retirar` | se niega con 1 nombrando `npm run atribuida` | no escribe |

</intent-contract>

## Code Map

- `src/lib/variante.ts` -- NUEVO: `REGIONES_DE_VARIANTE` (`{ espana: 'España' } as const`), `RegionDeVariante`, `esRegionDeVariante`. Puro, sin dependencias.
- `src/lib/admision.ts` -- `texto` (l.163), `ORIGENES`/`origen` (l.260), `reglasDeClase` (l.283: rama de siempre que rechaza `atestiguaciones`/`origen`/`personaje` — añadir `variante` con su mensaje), `reglasDeLaAtribuida` (l.358: el `\n` del texto — repetir para `variante.texto`), `citaAdmisible` (l.754). Añadir `variante` = `z.object({texto, region, origen}).strict()` con mensajes «Regla incumplida: …».
- `src/content.config.ts:80-120` -- colección `citas`: añadir `variante: variante.optional()` junto a `atestiguaciones`/`origen`.
- `src/lib/publicado.ts:75` (`interface Cita`) y `:1636` (`aplanarCita`) -- llevar `variante?` a la Cita publicada (si no, no llega a la página).
- `src/lib/atribucion.ts` -- añadir `lineaDeVariante(cita): string | undefined` («En España: «{texto}»», rótulo de `REGIONES_DE_VARIANTE`). No tocar `textoParaCopiar` (l.156), `fragmentoParaInsertar` (l.920), `firmaDeCita` (l.100): siguen con `cita.texto`.
- `src/components/Variante.astro` -- NUEVO: `<p style=…>` con `lineaDeVariante`; sin `<style>` ni guion; nada si `undefined`.
- `src/pages/cita/[slug].astro:178-191` -- `<Variante cita={cita} />` entre `<Fuente cita={cita} />` y `<FilaDeAcciones>`.
- `tools/lib/atribuidas.ts` -- `CitaParaAtribuidas` (l.105) gana `variante?: string`; en `fallosDeAtribuidas` el tope de caracteres (l.204) juzga también la variante; los duplicados (l.292) comparan todas las formas de la juzgada (texto y variante) contra todas las de cada otra; `formaDe` (l.330) pasa a cachear una lista de formas por objeto.
- `integraciones/clases.ts:68` -- pasar `variante: c.variante.texto` al juicio.
- `tools/alta.ts` -- `EntradaDeLote` (l.76) gana `variante?`; `aRegistroDeCita` (l.759) la escribe; `paraAtribuidas` (l.779) la pasa; el índice FR-14 `yaEnCorpus` (l.413-427) indexa también las variantes de publicadas y en revisión (mismo slug) y la entrada se compara también por su variante (l.477, `repetidaOContenida`). El slug sigue saliendo solo de `texto`.
- `tools/lib/revision.ts` -- `CandidataEnRevision` (l.71) gana `variante?`; se llena en el `lote.push` (l.295); `candidataParaAtribuidas` (l.830) la pasa; `yaPublicadas`/`vistasEnRevision` (l.235-337) incluyen las variantes y la candidata se mira también por la suya. `reescribirConSlug` conserva el fichero, así que la Variante viaja al aprobar.
- `tools/lib/cambioDeAtribuida.ts` -- NUEVO: `cambiarAtribuida(rutas, cambio, opciones: { puerta?: ValoresDeLaPuerta }): Promise<Resultado>`. Localiza la publicada (patrón `localizarPublicada`, `tools/lib/documentacion.ts:132`), niega la de siempre (`esAtribuida`), compone el frontmatter nuevo (`separarFrontmatter` + `escribirCita`, `tools/lib/corpus.ts:849,911`), lo valida con `citaAdmisible`, comprueba que Autor/Personaje existen (`leerAutores`, `leerPersonajes`), que `claseQueCorresponde` siga siendo atribuida (`src/lib/clase.ts`), el parecido (`parecidoDeTextos` ≥ `MIN_PARECIDO_PARA_CORREGIR` contra el texto o la variante publicados), la Obra con `resolverFichaDeObra`/`aplicarFichaDeObra` (`tools/lib/obras.ts:127,240`) y que la ficha que resuelve (`fichaDeCita`, `src/lib/obras.ts:381`) sea la misma de antes si ya tenía Obra, y los topes y duplicados con `fallosDeAtribuidas` (lo publicado con la Cita sustituida + `comparables` de `corpus/_revision/`, `juzgar: {slug}`, `valores: puerta`). Escribe la Cita y después la ficha; si la ficha falla, restituye el fichero original.
- `tools/atribuida.ts` -- NUEVO: CLI calcado de `tools/personaje.ts` (tabla `FORMA`, `motivosDeArgumentosNoReconocidos`, `terminar` de `tools/lib/cli.ts`). Subórdenes: `obra <slug> "<obra>"`, `autor <slug> <slug-de-autor>`, `personaje <slug> <slug-de-personaje>`, `variante <slug> "<texto>" --region <r> --origen <o>`, `texto <slug> "<texto>"`; `--corpus`.
- `package.json:22` -- `"atribuida": "tsx tools/atribuida.ts"`.
- `tools/lib/documentacion.ts` -- `documentarCita` (l.417) y `retirarCita` (l.809) se niegan con 1 ante `esAtribuida`, nombrando `npm run atribuida`; `restituirTraducciones` (l.1059) y `restituirSaltos` (l.1219) las saltan y las cuentan.
- `tools/lib/cambios.ts:314-325` -- `CAMPOS_QUE_PINTA.cita.cita: [...CAMPOS_DE_CITA, 'variante']`; las demás columnas no.
- `tests/unit/ayuda/construir.ts:753,841,866` -- `citaValida`, `ATESTIGUADA`, `conLaPuertaAbierta`, `registroDeClasesDe` (l.447); `tests/unit/ayuda/relleno.ts` para el Tema con página; `tests/unit/ayuda/pagefind.ts:68` `indiceDe(proyecto).search(...)` (construir con `conBusqueda`). Modelo de fixture: `tests/unit/personaje-donde-el-autor.test.ts`.
- `AGENTS.md` -- sección nueva «Cambiar una atribuida publicada» y mención de la Variante.

## Tasks & Acceptance

**Execution:**
- `src/lib/variante.ts` -- crear el conjunto cerrado y su rótulo -- un solo dueño de la región.
- `src/lib/admision.ts`, `src/content.config.ts` -- esquema `variante` (estricto, una como mucho), prohibida en la de siempre, sin `\n` en la atribuida -- AD-34, AD-32.
- `src/lib/publicado.ts` -- llevar `variante` a `Cita` y `aplanarCita` -- que la página la reciba.
- `src/lib/atribucion.ts`, `src/components/Variante.astro`, `src/pages/cita/[slug].astro` -- componer y pintar la línea -- UX-DR138, NFR-13.
- `tools/lib/atribuidas.ts`, `integraciones/clases.ts` -- tope y duplicados con la variante -- FR-67, AD-3.
- `tools/alta.ts`, `tools/lib/revision.ts` -- llevar la Variante y compararla en FR-14 y en la puerta -- FR-67.
- `tools/lib/cambioDeAtribuida.ts`, `tools/atribuida.ts`, `package.json` -- la orden -- AD-35.
- `tools/lib/documentacion.ts` -- negarse / saltar ante atribuida -- AD-35.
- `tools/lib/cambios.ts` -- clasificar `variante` -- AD-27 v9.1.
- `tests/unit/variante.test.ts` -- NUEVO, puro: esquema (cada fila de forma de la matriz), `reglasDeClase` con siempre+variante, `lineaDeVariante`, `fallosDeAtribuidas` (tope de la variante; duplicado texto↔variante, variante↔texto y variante↔variante, entre clases), y que `textoParaCopiar`, `fragmentoParaInsertar` y los datos/SVG de la Tarjeta Social (`src/lib/tarjeta.ts` con lo que use el endpoint) no contienen el texto de la Variante.
- `tests/unit/variante-build.test.ts` -- NUEVO, sobre `dist/` de una copia con la puerta abierta y `conBusqueda`: atribuida con Variante (línea tras la Fuente y antes de Copiar, en `data-pagefind-body`, fuera de `data-pagefind-ignore`, sin `lang`/`tabindex`/enlace; ausente de `data-texto-plano`, de los `data-*` de la Imagen, del Fragmento, del JSON-LD, de la meta description y del `<title>`); atribuida sin Variante sin línea ni hueco; búsqueda de 3+ palabras de la Variante → la misma `/cita/{slug}/`; slug igual con y sin Variante; un segundo build con una de siempre con `variante` rompe nombrando su fichero, y otro con dos atribuidas cuya Variante duplica rompe.
- `tests/unit/atribuida-cli.test.ts` -- NUEVO, en una copia del Corpus: cada fila de la orden de la matriz por `cambiarAtribuida` con la puerta por parámetro (contenido del fichero, slug y nombre intactos, ficha creada o la misma); y por proceso (`tsx tools/atribuida.ts --corpus <copia>`) los códigos 2 de forma y el 1 con la puerta del árbol, sin escribir.
- `tests/unit/documentar-cli.test.ts`, `tests/unit/duplicados.test.ts` -- añadir: `documentar` y `--retirar` sobre una atribuida → 1 sin escribir; alta de una de siempre igual a una Variante publicada → `posiblesDuplicados`; alta y aprobación de una atribuida cuya Variante duplica → en revisión.
- `tests/unit/fecha-de-cambio.test.ts` -- correrla tras clasificar `variante`; si su prueba de clasificación no recorre el esquema nuevo, añadirle la clave -- que la clave quede clasificada en el mismo commit.
- `AGENTS.md` -- documentar la orden, sus códigos, que no se edita a mano una atribuida, y la Variante (campo de la atribuida, no otra Cita).

**Acceptance Criteria:**
- Given el Corpus real y `FECHA_JORNADA` fija, when se construye antes y después y se compara `diff -r -x pagefind`, then ningún fichero difiere.
- Given la copia de `variante-build.test.ts`, when Vitest corre sobre su `dist/` e índice, then se cumple cada punto de su tarea.
- Given la Página de Cita atribuida con Variante, when se sirve, then entre la línea de la Variante y Copiar no hay ningún otro elemento.
- Given `npm run atribuida` sobre cualquier Cita, when la invocación es válida y la puerta del árbol está cerrada, then sale con 1 y `git status` no muestra cambios.
- Given `npm test`, `npx astro check` y `npm run build`, when corren tras el cambio, then pasan sin errores nuevos.

## Spec Change Log

## Review Triage Log

### 2026-11-13 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

### 2026-11-13 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 15: (high 0, medium 7, low 8)
- defer: 0
- reject: 21
- addressed_findings:
  - `[medium]` `[patch]` El intercambio escribía la letra guardada y tiraba la tecleada (una corrección de puntuación se perdía con éxito): `intercambio` recibe ya los dos textos que resultan y el tecleado entra con su letra; prueba nueva en `atribuida-cli.test.ts`.
  - `[medium]` `[patch]` Un cambio que no cambia nada (`texto` o `variante` iguales a lo que hay) reescribía el fichero y decía «Cambiada»: ahora se niega con 1, «Nada que cambiar», sin escribir; dos pruebas.
  - `[medium]` `[patch]` El esquema admitía una Variante igual (forma canónica) a su propio texto, y solo la orden lo vedaba: regla en `reglasDeLaAtribuida` de `src/lib/admision.ts`, que vale para el alta, la aprobación, el build y la orden; prueba en `variante.test.ts`.
  - `[medium]` `[patch]` La restitución tras fallar la ficha no tenía `try`: si fallaba, la promesa rechazaba sin `Resultado`. Ahora devuelve un motivo que dice que la Cita quedó sin ficha; y la rama de restitución tiene prueba (directorio de fichas de solo lectura en la copia → la Cita queda byte a byte igual).
  - `[medium]` `[patch]` Sin prueba de que la aprobación juzgue el texto de una candidata contra la Variante de una publicada: prueba nueva en `duplicados.test.ts` (comprobada por mutación: quitar la Variante del juicio de `aprobar` la pone en rojo).
  - `[medium]` `[patch]` Sin prueba del alta forzada (`--con-duplicados`) contra la Variante de una publicada y de una candidata: dos pruebas nuevas en `duplicados.test.ts`.
  - `[medium]` `[patch]` Sin prueba del `duplicaA` de `revisar` por Variante: prueba nueva (texto de la candidata = Variante publicada; Variante de la candidata = texto publicado).
  - `[low]` `[patch]` «La Variante nuevo se parece»: concordancia corregida («El texto nuevo», «La Variante nueva») y la prueba ya no fija el error.
  - `[low]` `[patch]` Una Variante en blanco («   ») pasaba el esquema: `.refine` de no blanco; prueba nueva.
  - `[low]` `[patch]` Una bandera con valor dada la última o seguida de otra bandera salía con 1 (««» no es una región»): ahora es forma, código 2 («va sin valor»); fila nueva en la prueba por proceso.
  - `[low]` `[patch]` `lineaDeVariante` pintaría «En undefined» ante una región sin rótulo: ahora lanza nombrando la región; prueba nueva.
  - `[low]` `[patch]` Un Autor declarado que no está en el Corpus dejaba juzgar la clase con `{}`: la orden se niega nombrándolo; y la rama «sería de la clase siempre» tiene prueba (Autor de la Cita pasado a dominio público en la copia).
  - `[low]` `[patch]` La Obra se escribía sin recortar los espacios de los bordes: se recorta; prueba nueva.
  - `[low]` `[patch]` Índice FR-14 del alta: la Variante de una candidata podía pisar el texto de otra, y una Variante de forma canónica vacía se indexaba bajo «»: las Variantes se indexan después de los textos sin pisarlos y nunca con clave vacía (también en `revisar`).
  - `[low]` `[patch]` Pruebas débiles: el duplicado por Variante del build fija ahora que el fallo nombra la otra Cita de Buzz (los textos difieren), la línea fija su `margin: var(--unidad) 0 0`, y `fecha-de-cambio.test.ts` prueba que un cambio solo de `variante` fecha la Página de Cita y ningún listado. AGENTS.md dice el intercambio con la letra tecleada, el `--origen` del intercambio por `variante`, «Nada que cambiar», la Variante en blanco o igual al texto y la bandera sin valor.

## Design Notes

- **Duplicados, dos niveles.** La puerta estricta de la atribuida (`fallosDeAtribuidas`, sin `--con-duplicados`) compara las formas {texto, variante} de cada atribuida juzgada contra las de toda otra Cita; el build la corre sobre todas las atribuidas, así que una de siempre que repita la Variante de una publicada también rompe el build. El aviso FR-14 del alta y la aprobación (`posiblesDuplicados`, `duplicaA`) indexa además las variantes, para que el alta de una de siempre lo vea antes de escribir.
- **El parecido de la orden** se mide con `parecidoDeTextos` (forma canónica, AD-3) del valor nuevo contra el texto **y** la variante publicados; basta uno ≥ `MIN_PARECIDO_PARA_CORREGIR`. Una Variante nueva donde no había ninguna se mide contra el texto.
- **Dueño de la Obra.** Añadir un Autor a la Cita de un Personaje cambia `dueñoDeCita` (prefiere el Autor), pero el slug y el fichero conservan el prefijo del Personaje (35.2) y la Obra la decide `fichasDeCita` en dos pasos; la orden compara el nombre de la ficha resuelta antes y después y se niega si difiere.
- Ejemplo de línea: `<p style="…">En España: «Hasta el infinito y más allá»</p>`.

## Verification

**Commands:**
- `npx vitest run tests/unit/variante.test.ts` -- verde.
- `npx vitest run tests/unit/variante-build.test.ts` -- verde.
- `npx vitest run tests/unit/atribuida-cli.test.ts` -- verde.
- `npx vitest run tests/unit/documentar-cli.test.ts tests/unit/duplicados.test.ts tests/unit/atribuidas.test.ts tests/unit/clase-build.test.ts tests/unit/fecha-de-cambio.test.ts tests/unit/tipografia-en-tokens.test.ts tests/unit/medicion.test.ts` -- verde.
- `npx astro check` -- 0 errores.
- Dos `npm run build` con `FECHA_JORNADA` fija (antes desde un `git worktree add --detach` en `/Users/hec/brainlySabiduria/.claude/v9-ralph/tmp-wt/`, después en el árbol) y `diff -r -x pagefind` de los `dist/` -- sin salida.
- `npm test` entero, desatendido con `correr.sh`/`esperar.pl` -- verde.

## Auto Run Result

Status: done
Blocking condition: ninguna.

**Resumen.** La atribuida gana `variante: {texto, region, origen}` (una como mucho, solo en la atribuida, sin saltos), con `REGIONES_DE_VARIANTE` en un módulo propio; el tope de caracteres y los duplicados entre clases la juzgan como al texto (build, alta y aprobación), y el aviso FR-14 mira también las Variantes. La Página de Cita la pinta en una línea «En España: «…»» tras la Línea de la Fuente y antes de Copiar, dentro del cuerpo de Pagefind y con la presentación en un atributo `style`. `npm run atribuida -- {obra|autor|personaje|variante|texto}` es la única orden que cambia una atribuida publicada; `documentar` (por slug y `--retirar`) se niega ante ella y sus modos por lote la saltan y la cuentan.

**Ficheros.**
- `src/lib/variante.ts` — nuevo: el conjunto cerrado de regiones y su rótulo.
- `src/lib/admision.ts`, `src/content.config.ts` — esquema `variante`, prohibida en la de siempre, una línea en la atribuida.
- `src/lib/publicado.ts` — `Cita.variante` y su aplanado.
- `src/lib/atribucion.ts` — `lineaDeVariante`.
- `src/components/Variante.astro`, `src/pages/cita/[slug].astro` — la línea en la Página de Cita, sin `<style>`.
- `tools/lib/atribuidas.ts` — `textoDeVariante`, tope de la Variante y duplicados por todas las formas.
- `integraciones/clases.ts`, `tools/alta.ts`, `tools/lib/revision.ts` — la Variante viaja al juicio y al índice FR-14.
- `tools/lib/cambioDeAtribuida.ts`, `tools/atribuida.ts`, `package.json` — la orden nueva.
- `tools/lib/documentacion.ts` — documentar se niega ante una atribuida; los lotes la saltan.
- `tools/lib/cambios.ts` — `variante` en `CAMPOS_QUE_PINTA.cita.cita`.
- `tests/unit/variante.test.ts`, `variante-build.test.ts`, `atribuida-cli.test.ts` — nuevos; `documentar-cli.test.ts`, `duplicados.test.ts` — filas nuevas.
- `AGENTS.md` — «La Variante de España» y «Cambiar una atribuida publicada».

**Revisión.** Las capas externas no traen hallazgos en esta pasada: 0 parches, 0 diferidos, 0 rechazados. Seguimiento recomendado: no (parcheados: high 0, medium 0, low 0; puntuación 0).

**Verificación.**
- `npx vitest run tests/unit/variante.test.ts` (19), `variante-build.test.ts` (10), `atribuida-cli.test.ts` (35): verde.
- `npx vitest run` de documentar-cli, duplicados, atribuidas, clase-build, fecha-de-cambio, tipografia-en-tokens, medicion y las tres nuevas: 10 ficheros, 988 pruebas, verde.
- `npx astro check`: 0 errores.
- Dos `npm run build` con `FECHA_JORNADA=2026-11-13` (base `ec89fecf2c` en un `git worktree add --detach` temporal, ya retirado; después en el árbol): los dos con 0, y `diff -rq -x pagefind` de los `dist/` sin salida (los guiones de `_astro/` incluidos: ningún byte cambia).
- `npm test` entero, desatendido: 185 ficheros, 8.174 pruebas, verde.
- Auditoría de la matriz: cada fila tiene prueba que corrió y pasó (forma y regla de clase en `variante.test.ts`; línea, búsqueda y roturas del build en `variante-build.test.ts`; las filas de la orden en `atribuida-cli.test.ts`; FR-14, alta y aprobación en `duplicados.test.ts`; documentar en `documentar-cli.test.ts`).

**Riesgos residuales.** El intercambio y el «solo añaden» siguen las suposiciones diferidas del frontmatter (las decide Héctor). La Variante de una candidata se compara con la forma canónica en el aviso FR-14 de `revisar` (repetidas), no por contención; la puerta estricta de la atribuida sí usa `parecidoEntre` entero. Pagefind no es determinista en sus filtros (25 bytes de diferencia entre las dos construcciones, dentro de `pagefind/`, excluido del cotejo).

### Pasada de revisión 1 (2026-11-13)

**Resumen.** Quince parches sobre la 35.6, sin tocar el contrato: el intercambio conserva la letra tecleada; un cambio que no cambia nada se niega con 1 («Nada que cambiar»); el esquema veda una Variante en blanco o igual (forma canónica) a su propio texto, para toda puerta y no solo para la orden; la restitución tras fallar la ficha ya no puede rechazar sin parte; una bandera con valor dada sin él es forma (2); un Autor declarado que no está en el Corpus se niega antes de juzgar la clase; la Obra se recorta; `lineaDeVariante` no pinta «En undefined»; el índice FR-14 del alta y de `revisar` no pisa un texto con una Variante ni indexa una forma vacía; y las pruebas que faltaban (aprobación y alta forzada contra la Variante publicada o de una candidata, `duplicaA` de `revisar` por Variante, restitución tras fallar la ficha, rama de cambio de clase, fecha solo de la Página de Cita, margen de la línea, causa del duplicado del build).

**Ficheros.**
- `tools/lib/cambioDeAtribuida.ts` — intercambio con la letra tecleada, «Nada que cambiar», Autor ausente, Obra recortada, restitución con `try`, concordancia del motivo.
- `tools/atribuida.ts` — bandera con valor sin valor → 2.
- `src/lib/admision.ts` — Variante no en blanco y distinta de su texto.
- `src/lib/atribucion.ts` — `lineaDeVariante` lanza ante una región sin rótulo.
- `tools/alta.ts`, `tools/lib/revision.ts` — índices FR-14 de la Variante sin pisar textos ni clave vacía.
- `tests/unit/atribuida-cli.test.ts`, `variante.test.ts`, `duplicados.test.ts`, `fecha-de-cambio.test.ts`, `variante-build.test.ts` — pruebas nuevas o reforzadas.
- `AGENTS.md` — lo nuevo de la orden y del esquema.

**Revisión.** 15 parches (medium 7, low 8), 0 diferidos, 21 rechazados (entre ellos: hacer cumplir «el único camino» contra una edición a mano, que ningún build puede distinguir; el tope en la puerta y no en el esquema, porque su valor es de la puerta; `/buscar/` frente al índice, que es lo que la historia nombra; el orden de claves; los `cast`; la escritura concurrente; las suposiciones ya diferidas). Seguimiento recomendado: sí (parcheados high 0, medium 7, low 8; puntuación 3×7+8 = 29).

**Verificación.**
- `npx vitest run` de variante, variante-build, atribuida-cli, documentar-cli, duplicados, atribuidas, clase-build, fecha-de-cambio, tipografia-en-tokens y medicion: 10 ficheros, 1.004 pruebas, verde.
- Mutación: sin la Variante de las publicadas en el juicio de `aprobar`, la prueba nueva de la aprobación cae.
- `npx astro check`: 0 errores.
- Dos `npm run build` con `FECHA_JORNADA=2026-11-13` (base `ec89fecf2cca398f25032bba6408fa323be17e59` en un `git worktree add --detach` temporal, ya retirado; después, el árbol con los parches): los dos con 0 y `diff -rq -x pagefind` vacío.
- `npm test` entero, desatendido: 185 ficheros, 8.190 pruebas, verde.

**Riesgos residuales.** El aviso FR-14 de `revisar` sigue comparando por forma canónica igual, como hace con los textos; la puerta estricta usa `parecidoEntre`. «El único camino» es procedimiento (AGENTS.md, la negativa de `documentar`): una edición a mano que pase el esquema y la puerta no se detecta.

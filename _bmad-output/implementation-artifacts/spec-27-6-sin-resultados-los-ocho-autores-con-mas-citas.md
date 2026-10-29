---
title: 'Historia 27.6 — Sin resultados, los ocho Autores con más Citas'
type: 'feature'
created: '2026-10-29'
status: 'done'
baseline_revision: '79919bfebcab8c7b2cc5b99b546e133d9c1279aa'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-27-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-brainlySabiduria-2026-08-10/ARCHITECTURE-SPINE.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** La salida sin resultados de `/buscar/` ofrece los ocho primeros Autores del alfabeto (`autoresPublicados(...).slice(0, 8)` en `src/pages/buscar.astro`), sin regla ni suelo latinoamericano, y dice siempre «No encontramos esa frase. Prueba con menos palabras.», también a quien solo filtró y no escribió nada; además, a cero con aviso de la dirección (27.4) la sugerencia se ve dos veces (diferido de la 27.4 asignado a esta historia) (FR-8, UX-DR62, UX-DR93, UX-DR99, UX-DR112).

**Approach:** Una sola función de `src/lib/publicado.ts` da los ocho Autores destacados —los de más Citas con el suelo de `SUELO_TRADICION_LATINOAMERICANA` por razón exacta, presentados en el orden del Directorio— usando el predicado «cuenta para el suelo» sacado de `src/lib/huecos.ts`; una función pura de `src/lib/busqueda.ts` compone la frase a cero según texto y filtros con la misma composición que el recuento, y la isla la escribe por `textContent` en `.sugerencia` y la anuncia una vez por la región, apartada de la vista.

## Boundaries & Constraints

**Always:**
- Predicado con nombre en `src/lib/huecos.ts`: `export function cuentaParaElSuelo(autor: Pick<AutorParaHuecos, 'tradicion'>): boolean` → `autor.tradicion !== 'otra'` (un Autor sin `tradicion` cuenta). `verHuecos` calcula `hispanicos` con él (`autores.filter(cuentaParaElSuelo).length`): mismo valor que hoy. Ninguna otra definición en `src/` ni `tools/`.
- `Autor` de `publicado.ts` gana `tradicion?` con el tipo del esquema (`z.infer<typeof tradicion>` de `admision.ts`, por `import type`), nunca una tercera lista literal; `aplanarAutor` la copia solo si está declarada (convención de ausencia). Ninguna superficie la pinta.
- `AUTORES_DESTACADOS = 8` en `src/lib/umbrales.ts`, con docblock (AD-9, FR-8, Historia 27.6; lo reutiliza la portada en la 28.4), junto a `TANDA_DE_RESULTADOS`.
- `export function autoresDestacados(autores: readonly Autor[], citas: readonly Pick<Cita, 'autor'>[]): Autor[]` en `src/lib/publicado.ts`, pura y sin mutar la entrada:
  1. Publicados: Autores con ≥ 1 Cita en `citas`; recuento por Autor.
  2. **Una sola clasificación:** recuento descendente y, a igualdad, `compararPorClave({ clave: ordenAlfabetico, slug })` de `src/lib/normalizar.ts` (el orden del Directorio, 26.1). Un Autor publicado sin `ordenAlfabetico` **lanza** nombrando su slug y la orden `npx tsx tools/autor.ts proponer-claves`, como `agruparPorClave` de `src/lib/directorios.ts`.
  3. Elegidos = los `AUTORES_DESTACADOS` primeros; fuera = el resto, en el orden de la clasificación.
  4. Mientras `100 · latinoamericanos < SUELO_TRADICION_LATINOAMERICANA · cuentan` (enteros, razón exacta; `cuentan` = elegidos con `cuentaParaElSuelo`): cede el **último** elegido en la clasificación que cumpla `cuentaParaElSuelo` y no sea `latinoamericana` (peninsular o sin declarar; nunca `otra`), y entra el **primero** de fuera que sea `latinoamericana`. Si falta cualquiera de los dos, se detiene.
  5. Devuelve los elegidos ordenados por `compararPorClave` (orden del Directorio, nunca por recuento). Menos de ocho publicados: todos.
- `src/lib/busqueda.ts`: la composición de lo filtrado («de {Autor}», « en {Obra}» solo con Autor y título no vacío, « sobre {temaEnFrase(tema)}») sale de **un** ayudante privado que usan `fraseDelRecuento` (salidas idénticas a hoy) y la nueva `sugerenciaSinResultados(datos: Omit<DatosDelRecuento, 'total'>)`. Constante exportada `SUGERENCIA_SIN_FILTROS = 'No encontramos esa frase. Prueba con menos palabras.'`. Reglas: sin Autor ni Tema → `SUGERENCIA_SIN_FILTROS`; con filtro y texto recortado no vacío → `No encontramos «{texto}» entre las citas{composición}`; con filtro y sin texto → `No hay citas{composición}`; las dos últimas cierran con «.» salvo que ya acaben en `.?!…` (regla de `fraseDelRecuento`).
- `src/pages/buscar.astro`: `autores = autoresDestacados(conjunto.autores, conjunto.citas)`; la `.sugerencia` estática es `{SUGERENCIA_SIN_FILTROS}`; la sección «Autores» solo si hay alguno (como Temas y Colecciones). Marcado, `h2`, chips serif a `var(--cuerpo-md)`, enlaces sin `target`, `data-sin-zona="salidas-sin-resultados"` y su posición fuera de `[data-zona="resultado"]`: sin cambios.
- `src/components/Busqueda.astro` (isla): `pintar` recibe los datos del recuento (`{ total, texto, ...nombres }`) en lugar de la cadena y a cero: compone `sugerenciaSinResultados`, escribe `conAviso(sugerencia)` en `.sugerencia` por `textContent`, deja la región **siempre** apartada (`solo-para-lectores`) y la sombra vacía, y anuncia `conAviso(sugerencia)` con `anunciar` y la guarda `vez === pintadas` de hoy. Con resultados, nada cambia. Docblocks del componente y de `buscar.astro` al día.
- `MAX_BYTES_GUION_DE_LA_BUSQUEDA`: si el guion pasa del tope, se rederiva con la regla escrita en su docblock (medido + unos 400) y se documenta la medida con fecha; si no, no se toca.

**Block If:**
- Cumplir el contrato exige tocar `src/lib/ingreso.ts`, la huella de AD-14 (`src/lib/vocabulario.ts`, una zona nueva) o cualquier fichero de `_bmad-output/planning-artifacts/` o `_bmad-output/specs/` → HALT `blocked`.
- Extraer `cuentaParaElSuelo` cambia alguna cifra de `verHuecos` o de `npm run huecos`/`npm run objetivo` sobre el Corpus de la rama → HALT `blocked`.

**Never:**
- Ordenar los destacados por recuento al presentarlos; una segunda clasificación para el desempate del suelo; porcentajes redondeados en la regla; `localeCompare` para ordenar Autores.
- Filas de bloque de la portada en `/buscar/`; tocar la portada (28.4), `<noscript>`/índice que no carga (27.7) o «Buscar en…» (27.8).
- `innerHTML`/`insertAdjacentHTML` para la frase; escapar a mano lo tecleado.
- Cambiar la emisión: `busqueda` con tramo 0 al asentarse (con texto o sin él) y `busqueda-sin-resultados` solo con texto (23.8) siguen como están.
- Dependencias nuevas; `localStorage`; editar artefactos de planificación.

## I/O & Edge-Case Matrix

| Escenario | Estado / entrada | Comportamiento esperado |
|----------|------------------|-------------------------|
| Suelo cumplido | 8 primeros: 3 lat., 4 pen., 1 `otra` (3/7) | Sin cesiones; los 8 en orden del Directorio. |
| Cede | 8 primeros: 2 lat., 5 pen., 1 `otra`; fuera, lat. con 50 y 40 | Cede el pen. con menos Citas, entra el lat. de 50: 3/7 cumple; para. |
| 2 de 5 | 5 cuentan, 2 lat. | Cumple (40 % exacto): sin cesiones. |
| Varias cesiones | 0 lat. entre 8 que cuentan; 4 lat. fuera | Ceden de uno en uno los últimos hasta 4/8 (o hasta agotar los de fuera). |
| Se detiene | Bajo el suelo y sin lat. fuera, o los que no son lat. son todos `otra` | Sin cambios; nunca cede un `otra`. |
| Empates | Recuentos iguales en el corte, al ceder y al entrar | Decide `compararPorClave`: cede el que va detrás en el Directorio, entra el que va delante. |
| Sin tradición | Autor sin `tradicion` entre los 8 | Cuenta para el suelo y puede ceder. |
| Pocos | < 8 publicados; Autor sin Citas | Todos los publicados; el sin Citas nunca. |
| Sin clave | Autor publicado sin `ordenAlfabetico` | Lanza nombrando el slug. |
| Determinismo | Mismas listas permutadas | Los mismos 8, en el mismo orden. |
| Texto sin filtros, a cero | `q=zzz` | «No encontramos esa frase. Prueba con menos palabras.» |
| Texto y filtros, a cero | «escuela», José Martí, Maestros ambulantes | «No encontramos «escuela» entre las citas de José Martí en Maestros ambulantes.» |
| Filtros sin texto, a cero | Autor + Tema; Autor + Obra + Tema | «No hay citas de José Martí sobre la prudencia.»; «No hay citas de José Martí en Maestros ambulantes sobre la prudencia.» |
| Marcado tecleado | `?q=<b>zzz</b>&autor=…` a cero | La frase dice `«<b>zzz</b>»` literal; ningún elemento `b` en la salida. |
| Aviso a cero | `?q=zzz&tema=y` (Tema inexistente) | `.sugerencia` = «Uno de los filtros… va sin él. No encontramos esa frase…»; región con el mismo texto, apartada; la frase se ve una sola vez. |

</intent-contract>

## Code Map

- `src/lib/huecos.ts` -- `AutorParaHuecos` (l. 42), `EquilibrioDeTradicion.hispanicos` (l. 252–269, el porqué de que los sin declarar cuenten), `verHuecos` calcula `hispanicos = latinoamericana + peninsular + sinDeclarar` (l. 507): sacar `cuentaParaElSuelo` y usarlo ahí. Solo importa `umbrales.ts`: `publicado.ts` puede importarlo sin ciclo.
- `src/lib/publicado.ts` -- `Autor` (l. 91), `autoresPublicados` (l. 159, ordena por `localeCompare` de nombre: no reutilizar su orden), `aplanarAutor` (l. 1265, hoy pierde `tradicion`), `conjuntoPublicable` (l. 1455). Importa ya de `umbrales.ts`, `obras.ts`, `superficies.ts`; añadir `compararPorClave` de `normalizar.ts` y `cuentaParaElSuelo` de `huecos.ts`.
- `src/lib/admision.ts:251` -- `tradicion` (zod enum) del que sale el tipo; `src/content.config.ts:96` lo declara opcional en el Autor.
- `src/lib/normalizar.ts:128` -- `compararPorClave` (clave + slug, por unidades de código): el orden del Directorio. `src/lib/directorios.ts:79` `agruparPorClave` es el modelo del error por clave ausente.
- `src/lib/umbrales.ts:343` -- `SUELO_TRADICION_LATINOAMERICANA = 40`; l. 655 `TANDA_DE_RESULTADOS` (poner `AUTORES_DESTACADOS` cerca); l. 617 `MAX_BYTES_GUION_DE_LA_BUSQUEDA = 17293` con su historial de medidas (16.893 hoy).
- `src/lib/busqueda.ts:132` -- `fraseDelRecuento` (composición y regla del punto final a reutilizar); `DatosDelRecuento` (l. 104); `avisoDeLaDireccion` (l. 436). El grafo de importaciones del guion lo fija `busqueda-con-filtros.test.ts:116`: no añadir importaciones nuevas a `busqueda.ts`.
- `src/pages/buscar.astro` -- l. 38 `.slice(0, 8)` a sustituir; `.salida` con `data-sin-zona`, `.sugerencia` estática y las tres secciones de chips; estilos `.chip` ya con `--serif`/`--cuerpo-md`.
- `src/components/Busqueda.astro` -- `pintar` (l. 753): rama `vacio` hoy lee la sugerencia del DOM y, con aviso, deja la región visible (la doble pintura del diferido de la 27.4); `buscar` (l. 833) compone `nombres` y llama `pintar(..., fraseDelRecuento(...), ...)` (l. 905). Docblock de cabecera (l. 50–60) describe el primer ritmo a cero.
- `tests/unit/ayuda/busqueda.ts` -- entorno simulado de la isla; la salida y su `.sugerencia` en l. 436–438; accesores en l. 879–883 (añadir `sugerencia()`).
- `tests/unit/medicion.test.ts` -- 27.2 «filtro a cero» (l. 4576) y «con texto y filtro a cero» (l. 4615), 27.4 aviso a cero (l. 5371–5375, hoy `apartada: false`): se actualizan a la nueva frase/regla.
- `tests/unit/busqueda-con-filtros.test.ts` -- pruebas puras de frases (l. 87–150) y «lo construido» (l. 674, fixture con Martí/Nervo/Séneca cuyo orden de Directorio —Martí, Nervo, Séneca— difiere del de nombre —Amado, José, Séneca—).
- `tests/unit/huecos.test.ts` -- casos de tradición (l. 72+).
- `tests/e2e/busqueda.spec.ts` -- 3.2 y 22.10 (l. 281–445, siguen valiendo sin filtros); describe 27.2 (l. 1073) con `conjunto()` del Corpus y `filtrosDeLaBusqueda` como patrón; Pagefind servido por `page.route` en l. 428.

## Tasks & Acceptance

**Execution:**
- `src/lib/huecos.ts` -- exportar `cuentaParaElSuelo` con docblock (remite a `hispanicos`) y usarlo en `verHuecos` -- un solo dueño del predicado (AD-11).
- `src/lib/umbrales.ts` -- `AUTORES_DESTACADOS = 8` con docblock -- AD-9.
- `src/lib/publicado.ts` -- `tradicion?` en `Autor`, `aplanarAutor` la copia, y `autoresDestacados` según el contrato, con docblock (FR-8, AD-11, AD-3, 28.4) -- la regla única de los ocho.
- `src/lib/busqueda.ts` -- ayudante de composición compartido, `SUGERENCIA_SIN_FILTROS` y `sugerenciaSinResultados` -- frases a cero de UX-DR93.
- `src/pages/buscar.astro` -- destacados por `autoresDestacados`, sugerencia estática por la constante, sección Autores condicional, docblock -- la salida.
- `src/components/Busqueda.astro` -- `pintar` con datos; a cero escribe `.sugerencia` y anuncia una vez con la región apartada; docblock -- frases y fin del diferido de la 27.4.
- `src/lib/umbrales.ts` -- rederivar `MAX_BYTES_GUION_DE_LA_BUSQUEDA` solo si el guion pasa del tope -- AD-6.
- `tests/unit/autores-destacados.test.ts` (nuevo, sin build) -- toda la matriz de destacados, con permutaciones de Autores y Citas; y una comprobación de fuente: `publicado.ts` importa `cuentaParaElSuelo` de `./huecos.ts` y ningún módulo de `src/lib` salvo `huecos.ts` define el predicado (`tradicion !== 'otra'`/`=== 'otra'` fuera de `huecos.ts` y `admision.ts`) -- determinismo y dueño único.
- `tests/unit/huecos.test.ts` -- `cuentaParaElSuelo` con las tres tradiciones y sin declarar; `hispanicos` igual que antes -- regresión.
- `tests/unit/busqueda-con-filtros.test.ts` -- puras: las tres reglas de `sugerenciaSinResultados` con y sin Obra/Tema, título que cierra con `!`, Obra sin Autor o sin título no nombrada, texto recortado y marcado tal cual; `fraseDelRecuento` sin cambios. Construido (mismo `beforeAll`): los `/autor/` de `[data-salida]` son Martí, Nervo, Séneca en ese orden y sin `target`; la `.sugerencia` estática es `SUGERENCIA_SIN_FILTROS` -- lo puro y lo construido.
- `tests/unit/ayuda/busqueda.ts` -- accesor `sugerencia()` (texto de `.sugerencia`) -- para observar la salida.
- `tests/unit/medicion.test.ts` -- actualizar los casos a cero: Séneca + La prudencia sin texto → «No hay citas de Séneca sobre la prudencia.» en región (apartada) y `.sugerencia`; José Martí + «zzz nada» → «No encontramos «zzz nada» entre las citas de José Martí.»; caso con Obra; aviso a cero → región apartada con aviso + sugerencia y `.sugerencia` igual; emisiones de tramo 0 y `busqueda-sin-resultados` sin cambios -- la isla.
- `tests/e2e/busqueda.spec.ts` -- describe «Historia 27.6»: (a) los chips de Autor de la salida son `autoresDestacados` del Corpus (por `conjuntoDeLosDatos`), en su orden, a `/autor/{slug}/` sin `target`; (b) Autor + Tema del Corpus sin cruce (primer par por slug; `test.skip` diciendo por qué si no hay) → `.sugerencia` y región dicen «No hay citas de {Autor} sobre {tema}.», región de ancho ≤ 1, y Tab desde «Quitar los filtros» llega al primer chip de la salida; (c) `?q=<b>zzz</b>&autor={el Autor mayor}` con un Pagefind servido por `page.route` que no encuentra nada y da `filters()` → `.sugerencia` con `«<b>zzz</b>»` literal y `[data-salida] b` con 0 elementos -- superficie real.

**Acceptance Criteria:**
- Given el Corpus de la rama, when se construye `/buscar/`, then su salida lista bajo «Autores» exactamente `autoresDestacados(conjunto.autores, conjunto.citas)`, en el orden del Directorio, cada uno chip serif enlazado a su Página de Autor en la misma pestaña (la prueba de Playwright (a) lo fija sobre el sitio construido; el determinismo ante el orden de entrada lo fija `autores-destacados.test.ts`).
- Given una búsqueda que se asienta a cero, when se emite, then va `busqueda` con tramo 0 (con texto o sin él) y `busqueda-sin-resultados` solo con texto, como en la 23.8.
- Given filtros y cero resultados, when se pinta, then «Quitar los filtros» está visible encima de la frase y es el último control enfocable antes de la salida.
- Given cualquier frase a cero, when se pinta, then la región `role="status"` la dice una vez, apartada de la vista, y la página la muestra una sola vez, en `.sugerencia`.
- Given `npm run huecos` sobre el Corpus de la rama, when se compara con la base, then las cifras de tradición son idénticas.

## Spec Change Log

## Review Triage Log

### 2026-10-29 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

Las capas de revisión son externas (bucle v8-ralph) y en esta pasada no llegaron hallazgos: la revisión independiente sigue a este commit.

## Design Notes

- **Por qué a cero la región siempre se aparta.** La 27.4 dejaba la región visible con aviso para que el aviso se viera, y la `.sugerencia` repetía la frase. Con la frase en `.sugerencia` compuesta por la isla, el aviso va delante en el mismo párrafo visible y la región solo anuncia: cumple «sin pintarse dos veces» (22.10) y cierra el diferido.
- **Por qué la clasificación ordena por clave y no por slug al empatar:** el AC fija el orden del Directorio como desempate; `compararPorClave` ya desempata por slug a igual clave, así que el resultado es total y determinista.
- Ejemplo de la regla (Corpus de hoy, aproximado): Unamuno (p), Ingenieros (l), Quevedo (p), Gracián (p) y Séneca (o) empatados a 242 —Gracián antes por clave—, Arenal (p), Martí (l), González Prada (l): cuentan 7, latinoamericanos 3 → 3/7 cumple, sin cesiones.

## Verification

**Commands:**
- `npx vitest run tests/unit/autores-destacados.test.ts tests/unit/huecos.test.ts tests/unit/objetivo.test.ts tests/unit/meta-de-corpus.test.ts` -- expected: verde.
- `npx vitest run tests/unit/busqueda-con-filtros.test.ts` -- expected: verde (incluye el build con Pagefind).
- `npx vitest run tests/unit/medicion.test.ts` (con `correr.sh`, tarda) -- expected: verde.
- `npx vitest run tests/unit/ingreso-construido.test.ts` (con `correr.sh`) -- expected: verde (la salida sigue diciendo «Prueba con menos palabras» en el HTML y el guion bajo su tope).
- `npx astro check` -- expected: 0 errores.
- `npm run huecos` antes y después -- expected: misma salida de tradición.
- `npm run build` y `npx playwright test tests/e2e/busqueda.spec.ts --project=escritorio` (con `correr.sh`) -- expected: verde, incluidos 3.2, 22.10 y 27.6.

## Auto Run Result

Status: done
Blocking condition: ninguna

**Resumen.** La salida sin resultados de `/buscar/` ofrece los ocho Autores destacados de `autoresDestacados` (`src/lib/publicado.ts`): los de más Citas, desempate por el orden del Directorio, con el suelo de `SUELO_TRADICION_LATINOAMERICANA` por razón exacta sobre los que cuentan para él (predicado `cuentaParaElSuelo`, extraído de `src/lib/huecos.ts`), presentados en el orden del Directorio. La frase a cero la compone `sugerenciaSinResultados` (`src/lib/busqueda.ts`) con la misma composición de lo filtrado que el recuento; la isla la escribe por `textContent` en `.sugerencia`, con el aviso de la 27.4 delante, y la anuncia una vez por la región, siempre apartada y con la sombra vacía (cierra el diferido de la 27.4).

**Ficheros.**
- `src/lib/huecos.ts` — `cuentaParaElSuelo`, único dueño del predicado; `verHuecos` calcula `hispanicos` con él.
- `src/lib/umbrales.ts` — `AUTORES_DESTACADOS = 8` junto a `TANDA_DE_RESULTADOS`.
- `src/lib/publicado.ts` — `Autor.tradicion?` con el tipo del esquema; `aplanarAutor` la copia si está declarada; `autoresDestacados`.
- `src/lib/busqueda.ts` — ayudantes privados `loFiltrado` y `cerrarFrase` (los usa también `fraseDelRecuento`, salidas idénticas), `SUGERENCIA_SIN_FILTROS` y `sugerenciaSinResultados`.
- `src/pages/buscar.astro` — destacados por `autoresDestacados`, `.sugerencia` estática por la constante, sección Autores condicional, docblocks.
- `src/components/Busqueda.astro` — `pintar` recibe los datos del recuento; a cero escribe `.sugerencia`, aparta siempre la región y anuncia una vez; docblock.
- `tests/unit/autores-destacados.test.ts` (nuevo) — la matriz de destacados, permutaciones y el dueño único del predicado.
- `tests/unit/huecos.test.ts`, `tests/unit/busqueda-con-filtros.test.ts`, `tests/unit/medicion.test.ts`, `tests/unit/ayuda/busqueda.ts`, `tests/e2e/busqueda.spec.ts` — pruebas puras, construidas, de la isla y de Playwright de la 27.6, y los casos a cero de la 27.2 y la 27.4 al día.

**Hallazgos de revisión.** Ninguno en esta pasada (capas externas sin hallazgos): 0 parches, 0 diferidos, 0 rechazados.

**Revisión de seguimiento.** `followup_review_recommended: false` — parches: 0 high, 0 medium, 0 low; puntuación 0.

**Verificación.**
- `npx vitest run tests/unit/autores-destacados.test.ts tests/unit/huecos.test.ts` — 63 pasan; `tests/unit/objetivo.test.ts tests/unit/meta-de-corpus.test.ts` — 76 pasan.
- `npx vitest run tests/unit/busqueda-con-filtros.test.ts` — 61 pasan (con build y Pagefind).
- `npx vitest run tests/unit/medicion.test.ts` — 663 pasan; `tests/unit/ingreso-construido.test.ts` — 41 pasan.
- `npm test` entero — 151 ficheros, 6.980 pruebas, verde.
- `npx astro check` — 0 errores, 0 avisos.
- `npm run huecos` y `npm run objetivo` antes y después — salida idéntica (suelo: 62 latinoamericanos, 53 peninsulares, 0 sin declarar, 56 de `otra`).
- `npm run build` — verde; `dist/buscar/` ofrece Arenal, Gracián, Ingenieros, Martí, González Prada, Quevedo, Séneca y Unamuno, en ese orden, y la `.sugerencia` sin filtros.
- `npx playwright test tests/e2e/busqueda.spec.ts --project=escritorio` — 74 pasan, 4 saltadas (las de antes: «el índice no contiene nada no publicado», las dos de 360 px y «un Autor sin Obras»), incluidas 3.2, 22.10 y las tres de la 27.6.
- Guion de la búsqueda: 17.227 bytes de 17.293 (medido por la prueba de la 23.1); no pasa del tope, así que `MAX_BYTES_GUION_DE_LA_BUSQUEDA` no se toca.

**Riesgos residuales.**
- El guion de la búsqueda queda a 66 bytes de su tope: la próxima historia que lo toque (27.7, 27.8) casi seguro tendrá que rederivarlo con su regla.
- La prueba de Playwright (b) depende de que el Corpus tenga un par Autor–Tema sin cruce; si no, se salta diciéndolo.

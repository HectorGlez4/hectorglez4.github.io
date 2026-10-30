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
deferred:
  - summary: >-
      La clave de orden de Manuel González Prada es «Prada», así que el Directorio y los Autores destacados lo ordenan bajo la P y no bajo la G de su primer apellido.
    evidence: |-
      corpus/autores/manuel-gonzalez-prada.yml declara ordenAlfabetico: "Prada" desde 908ee84fc1 (26.1, la regla de proponer-claves toma la última palabra). Con un apellido compuesto la convención es «González Prada, Manuel». La 27.6 lo hace visible en /buscar/ (Martí antes que González Prada) pero no lo causa. Corregir la clave es de Héctor (ordenRevisado), no de un agente.
    location: >-
      corpus/autores/manuel-gonzalez-prada.yml:6
    severity: medium
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

### 2026-10-29 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 9 (high 0, medium 1, low 8)
- defer: 1 (high 0, medium 1, low 0)
- reject: 22 (high 0, medium 0, low 22)
- addressed_findings:
  - `[medium]` `[patch]` Nada veía perderse `tradicion` en `aplanarAutor` (el Corpus de hoy cumple el suelo sin cesiones, así que `dist/buscar/` saldría igual): `autores-destacados.test.ts` prueba que `aplanarAutor` la copia, la omite sin declarar y que un Autor aplanado entra por el suelo; comprobado que falla al quitar la línea.
  - `[low]` `[patch]` La prueba de dueño único solo recorría `src/lib` y `===`/`!==` con comilla simple: ahora recorre `src/`, `tools/` e `integraciones/` con `==`/`!=`/`case`/`.includes(`/`.has(` y las dos comillas, en ficheros que hablan de `tradicion`; `tools/auditoria.ts` (Citas traducidas, 19.1) queda exento con su motivo y su única aparición fijada; comprobado que falla con un predicado plantado en `tools/`.
  - `[low]` `[patch]` `barajar` multiplicaba en coma flotante más allá de 2^53: congruencial en 32 bits (`Math.imul`, `>>> 0`) y una prueba de que las 25 permutaciones son distintas.
  - `[low]` `[patch]` La prueba de Playwright (c) tenía una aserción que no podía fallar (`frase` frente a `SUGERENCIA_SIN_FILTROS`): sustituida por lo que faltaba, «Quitar los filtros» visible encima de la frase y Tab hasta la salida con texto y filtro.
  - `[low]` `[patch]` La prueba (c) componía `&autor=` sin codificar: `encodeURIComponent`.
  - `[low]` `[patch]` «Quitar los filtros» con texto y filtro a cero no lo miraba nadie: cubierto en la prueba (c).
  - `[low]` `[patch]` El aviso de la 27.4 a cero solo se miraba en la isla simulada: prueba de Playwright nueva (`?q=zzz&tema=<inventado>` con un Pagefind sin resultados) que exige aviso y frase una vez en la `.sugerencia`, la región igual y apartada, y la sombra vacía.
  - `[low]` `[patch]` Aviso a cero con un filtro que sí se usa, sin prueba: caso de la isla en `medicion.test.ts` (`?q=zzz&autor=jose-marti&tema=y` → «Uno… No encontramos «zzz» entre las citas de José Martí.»).
  - `[low]` `[patch]` Un renglón del comentario de la región en `buscar.astro` pasaba del ancho: reenvuelto (no llega a `dist/`).

Rechazados, en resumen: el estado del tablero y el commit de la spec (los lleva el bucle); la revisión «ya hecha» (esta es); `esLatinoamericano` es el valor del enum, no un predicado; `hispanicos` ante un valor fuera del enum (el esquema lo excluye y la salida de `npm run huecos` es idéntica); `tradicion` no viaja a la isla (sus props son `OpcionPorNombre`); la `.sugerencia` rancia y el camino del `catch` (la salida se oculta antes de cada búsqueda y un fallo deja el estado anterior, como el recuento; el índice que no carga es de la 27.7); la `.sugerencia` ausente (está en el marcado y lo fija la prueba construida); la Obra o el Autor sin nombre (solo se usan filtros con opción en el selector); dos órdenes en la página, título sin comillas y frase sin «menos palabras» con filtros (los fija el contrato); los 66 bytes del guion (la regla solo rederiva al pasar del tope); dos builds frente a la permutación pura; la sección Autores condicional; la tipografía de los chips (CSS anterior sin tocar); Obra + Tema sin texto en la isla (la composición es la pura, probada).

### 2026-10-29 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 1 (high 0, medium 0, low 1)
- defer: 0
- reject: 24 (high 0, medium 0, low 24)
- addressed_findings:
  - `[low]` `[patch]` Ninguna prueba miraba sobre la superficie construida el tratamiento de los chips de Autor ni la agrupación bajo `h2` que pide el AC (solo el CSS sin tocar lo sostenía): la prueba de Playwright (a) exige ahora que cada grupo de `[data-salida]` tenga su `h2`, que el de los Autores diga «Autores» y que cada chip de Autor compute la misma familia y el mismo cuerpo que `var(--serif)`/`var(--cuerpo-md)` en la misma página.

Rechazados, en resumen: la `.sugerencia` ausente (está en el marcado y la fija la prueba construida); el aviso de la 27.4 en la `.sugerencia` a cero (es el cierre del diferido, razonado en Design Notes); la salida estática ante el filtro activo, sin enlace al Directorio y sin «siguiente paso» en las frases con filtro (la intención fija la salida —«cambia la regla, no el componente»— y las plantillas); lo tecleado sin tope ni normalización (la intención fija «{texto}» literal); texto vacío sin filtros (inalcanzable: sin texto ni filtros no se busca); `hispanicos` ante un valor fuera del enum, también del edge-case-hunter (el esquema del build lo excluye y la salida de `npm run huecos` es idéntica); el acoplamiento `publicado.ts` → `huecos.ts` (lo fija el contrato); la fragilidad de la prueba de dueño único y del ancho ≤ 1 de la región; (a) que compara con la propia función y la falta de cesiones en el sitio construido (la regla la fija Vitest, como pide el AC, y `aplanarAutor` está probado); los 66 bytes del guion (la regla solo rederiva al pasar del tope); el lanzamiento sin `ordenAlfabetico` (lo pide el contrato; `ingreso-construido` y e2e pasan); la clave «Prada» (ya diferida en el frontmatter); el tablero, `review_loop_iteration` y las líneas del Code Map (el tablero lo lleva el bucle; no hubo vueltas por `bad_spec`; el Code Map es el mapa previo); la tabulación solo en Chromium (patrón de la suite); un nombre vacío en la frase (solo se usan filtros con opción en el selector, 27.4); dos builds frente a la permutación pura; Autor + Obra + Tema sin texto en la isla y texto + Obra en el navegador (la composición es la pura, probada, y la isla pasa la Obra, probado con texto); el Pagefind servido por `page.route` en (c) y (d) (lo que se prueba es el guion de la página); «Quitar los filtros» anterior al diff (las pruebas lo fijan sobre lo construido).

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

**Hallazgos de revisión.** Tercera pasada (las cinco capas externas de nuevo): 1 parche (low), 0 diferidos, 24 rechazados; sin `bad_spec` ni `intent_gap`. Fichero: `tests/e2e/busqueda.spec.ts` — la prueba (a) exige el `h2` de cada grupo de la salida, «Autores» en el de los Autores y los chips de Autor a la serif en `body-md`, comparados con los tokens computados. Pasadas anteriores: primera pasada (capas externas sin hallazgos): 0 parches, 0 diferidos, 0 rechazados. Segunda pasada (blind-hunter, edge-case-hunter, verification-gap, intent-alignment, ac-auditor): 9 parches, 1 diferido (la clave «Prada» de González Prada, pendiente de Héctor), 22 rechazados; sin `bad_spec` ni `intent_gap`.

Ficheros de la segunda pasada:
- `tests/unit/autores-destacados.test.ts` — `aplanarAutor` con y sin `tradicion` y por el suelo; dueño único sobre `src/`, `tools/` e `integraciones/`; `barajar` en 32 bits.
- `tests/e2e/busqueda.spec.ts` — (c) con `encodeURIComponent` y «Quitar los filtros» encima y antes de la salida; (d) nueva, el aviso de la 27.4 a cero sobre el sitio construido.
- `tests/unit/medicion.test.ts` — aviso a cero con un filtro que sí se usa.
- `src/pages/buscar.astro` — un renglón de comentario reenvuelto.

**Revisión de seguimiento.** `followup_review_recommended: false` — parches de la tercera pasada: 0 high, 0 medium, 1 low; puntuación 3 × 0 + 1 = 1. (La segunda pasada había dado 0 high, 1 medium, 8 low; puntuación 11, y por eso esta tercera.)

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
- Segunda pasada (sin cambios en `src/lib` ni en la isla): puras (`autores-destacados`, `huecos`, `objetivo`, `meta-de-corpus`) 143 pasan; `busqueda-con-filtros` 61; `medicion` 663; `ingreso-construido` 41; `npx astro check` 0 errores; `npm run build` verde; `npx playwright test tests/e2e/busqueda.spec.ts --project=escritorio` 75 pasan y 4 saltadas (las mismas), incluidas las cuatro de la 27.6. Las dos pruebas nuevas de dueño único y de `aplanarAutor` se comprobaron en rojo con la regresión plantada. `npm run huecos` no se repite: `huecos.ts` no cambia en esta pasada.

- Tercera pasada (solo cambia `tests/e2e/busqueda.spec.ts`): `npx playwright test tests/e2e/busqueda.spec.ts --project=escritorio` — 75 pasan y 4 saltadas (las mismas); la aserción nueva se comprobó en rojo con `.chip` plantado a `var(--sans)` en `buscar.astro` y, revertido, las cuatro de la 27.6 vuelven a pasar; `npx astro check` — 0 errores, 0 avisos. No se repiten las pruebas unitarias ni `npm run huecos`: ni `src/` ni las pruebas unitarias cambian en esta pasada.

**Riesgos residuales.**
- El guion de la búsqueda queda a 66 bytes de su tope: la próxima historia que lo toque (27.7, 27.8) casi seguro tendrá que rederivarlo con su regla.
- La prueba de Playwright (b) depende de que el Corpus tenga un par Autor–Tema sin cruce; si no, se salta diciéndolo.

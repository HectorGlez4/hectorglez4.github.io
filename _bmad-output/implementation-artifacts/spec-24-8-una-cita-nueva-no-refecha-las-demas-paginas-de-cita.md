---
title: 'Historia 24.8 — Una Cita nueva no refecha las demás Páginas de Cita'
type: 'feature'
created: '2026-10-27'
status: 'done'
baseline_revision: '74d911b0db61a68bd97b14f3770b127ca8651ae3'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-24-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-brainlySabiduria-2026-08-10/ARCHITECTURE-SPINE.md'
warnings: ['oversized']
deferred:
  - summary: 'Una Cita que cambia de Tema, de Autor o de Obra sin salir del Corpus no fecha en el sitemap el listado que abandona (el aviso sí lo avisa por la relación de antes). Es anterior a esta historia; la 24.8 solo cierra las bajas de fichero.'
    location: 'tools/lib/cambios.ts'
    severity: 'low'
  - summary: 'AD-27 fija el lastmod de la Obra (ficha, Citas, Autor y documentos) por precedencia hasta que bmad-prd alinee FR-51 — pendiente de Héctor (bmad-prd).'
    severity: 'low'
  - summary: 'Los commits de fusión con resolución de conflictos en corpus/ siguen invisibles para el historial (git log --raw sin -m), como hoy con --name-only.'
    location: 'integraciones/historial.ts'
    severity: 'low'
  - summary: >-
      La página 1 de la Página de Obra pinta el nombre de los Temas de sus Citas (chips) y la relación no compone esos ficheros de Tema: renombrar un Tema no fecha ni avisa las Obras que lo muestran — pendiente de Héctor (bmad-create-epics-and-stories).
    evidence: |-
      src/pages/obra/[autor]/[slug]/[...page].astro pinta `tema.nombre` en la sección «Temas» desde la 22.4, y CAMPOS_QUE_PINTA.tema solo tiene `cita` y `tema`. El AC de la 24.8 y el intent-contract enumeran la composición de la Obra («su ficha, sus Citas, el fichero de su Autor y sus documentos») sin Temas, mientras el mismo AC pide «los ficheros y los campos que pinta»: es el caso del Block If, y no se decide a mano. La omisión ya estaba en la relación de la 22.8. Añadirla es una casilla (`tema: { …, obra: ['nombre'] }`) y componer los Temas de las Citas de la Obra.
    location: >-
      tools/lib/cambios.ts (CAMPOS_QUE_PINTA, relacionDeSuperficies)
    severity: low
  - summary: >-
      Cuando el `titulo` de una ficha ya no lo declara ninguna Cita publicada, el título efectivo de la Obra sale de las grafías de sus Citas (`grafiaPorOmision`), y el cambio de grafía de una Cita hermana cambia el título que pintan las Páginas de Cita y los listados sin fecharlos ni avisarlos.
    evidence: |-
      `tituloEfectivo` (src/lib/obras.ts) cae a `grafiaPorOmision` sobre la `procedencia.obra` de las Citas de la Obra; la relación compone de la ficha solo `titulo` y nunca Citas hermanas en la Página de Cita. El build ya avisa de un `titulo` que no se sostiene y `documentar`/`restituir-grafia` lo ponen al día en el mismo gesto, así que el caso solo aparece con ese aviso desatendido. Anterior a la 24.8: la relación por ficheros tampoco componía hermanas.
    location: >-
      src/lib/obras.ts (tituloEfectivo), tools/lib/cambios.ts
    severity: low
---

<intent-contract>

## Intent

**Problem:** `relacionDeSuperficies` (AD-27) relaciona cada superficie con **ficheros enteros**: cualquier cambio de un fichero fecha y avisa todo lo que lo compone —un commit que solo escribe `aptaParaPortada` fecharía ~104 Páginas de Cita, la semblanza fecha todas las Páginas de Cita del Autor— y, a la vez, faltan dependencias reales: los listados de Tema, Colección y Autor no cuentan la ficha de Obra cuyo título pintan (24.3, 17.3), la Página de Obra no cuenta sus documentos de `corpus/fuentes/` (24.1) y una baja no fecha lo que componía. La 26.1 (claves de orden en los 171 Autores) no puede entrar mientras esto siga así.

**Approach:** La relación pasa a ir de cada superficie a **(fichero, campos que pinta)** y lleva la familia de la ruta. Un solo comparador puro decide si una transición de un fichero (antes → después) cambió esos campos, y lo usan las dos lecturas: la fecha del sitemap, sobre el historial por commit leído con `git log --raw` + `git cat-file --batch`, y el aviso, sobre el par `desde`/`hasta`. `tools/avisar.ts --ensayo --desde --hasta` gana el reparto por familia de lo que cambia de fecha y lo que se avisaría.

## Boundaries & Constraints

**Always:**
- **Un dueño, dos lecturas** (AD-27): la relación y la tabla de campos viven solo en `tools/lib/cambios.ts`; `fechasPorSuperficie` y `rutasAvisadasPor` la leen con el **mismo** comparador de campos. Nada de `src/` importa de `tools/lib/`.
- **Campos por lista explícita** (sin «todos menos»), en una tabla con nombre por (familia de fichero → superficie):
  - **Cita** (en su página, en los listados de Autor/Tema/Colección y en la Página de Obra): `texto`, `autor`, `temas`, `procedencia`, `fuente`, `slug`.
  - **Autor** en su página: `nombre`, `añoNacimiento`, `añoFallecimiento`, `semblanza`, `biografia`; en Página de Cita, listados y Página de Obra: `nombre`, `añoNacimiento`, `añoFallecimiento`.
  - **Tema**: `nombre`. **Colección** en su página: `nombre`, `criterio`, `miembros`.
  - **Ficha de Obra** en Página de Cita y listados: `titulo`; en Página de Obra: `autor`, `titulo`, `formas`, `nota`, `ediciones`.
  - **Documento** (`corpus/fuentes/`): cualquier cambio, solo en la Página de Obra.
  - **No fechan ninguna superficie**, en una lista con nombre: `aptaParaPortada` y `estadoDerechos` (Cita), `tradicion` (Autor), `distintaDe` (Ficha).
- **Composición de cada superficie:** Página de Cita = su fichero + su Autor + sus Temas + su ficha de Obra (nunca Citas hermanas: Tarjeta de Obra, «Siguiente», «De la misma obra», «Más de», sus recuentos y el año del `isPartOf` son navegación — excepción de Héctor, FR-47). Autor/Tema/Colección = su fichero + sus Citas + los Autores de esas Citas + **las fichas de Obra de esas Citas**. Página de Obra = su ficha + sus Citas + su Autor + **sus documentos** (unión de `documentosDeCita` de sus Citas sobre los nombres de `corpus/fuentes/`).
- **Comparación canónica:** un campo ausente equivale a `undefined`; los objetos se comparan sin depender del orden de claves; un alta o una baja cambia todos los campos; una versión que no se deja analizar cuenta como cambio (antes fechar de más que mentir de menos).
- **Fecha de un componente** = la fecha más reciente (por instante, no por orden del log) entre las transiciones de su fichero que cambian sus campos. Sin ninguna, el componente no aporta fecha; la superficie sin fechas se omite (regla de 18.4, sin centinelas).
- **Bajas:** un fichero que ya no está en el Corpus (última transición = borrado; mover a `corpus/_revision/` o a `_obras-retiradas/` lo es) entra con su **última versión** como baja y fecha, con el instante del commit que lo sacó, las superficies **vivas** que compondría: una Cita, su Autor, sus Temas, sus Colecciones (por `miembros`) y su Obra (resuelta por (autor, `formaDeObra`) contra las fichas de hoy); una ficha, las Páginas de Cita y los listados de las Citas de hoy cuya forma reclamaba. Nunca declara la página de la propia baja.
- **Familias:** `tools/lib/avisar.ts` declara dos constantes con nombre — familias de **fichero** (`cita`, `autor`, `tema`, `coleccion`, `obra`, `documento` → `corpus/fuentes`), una sola tabla que alimenta el filtro del diff y el reconocimiento, y familias de **ruta** (`cita`, `autor`, `tema`, `coleccion`, `obra`); la familia de una ruta la pone su entrada en la relación. La portada se avisa como hoy, sin familia.
- Se conservan las reglas de la Obra en el aviso (22.8: indexable/`noindex`/ausente, hermanas por indexabilidad) y el contrato de no romper el build (`fechasDeLasSuperficies` avisa y devuelve el mapa vacío ante cualquier tropiezo; shallow y cobertura insuficiente siguen avisando).

**Block If:**
- El mismo instrumento obliga a fechar o avisar algo que contradice el AC (p. ej. un campo que la Página de Cita pinta y no está en la lista de lo que afirma): HALT y nombrar campo y superficie; no se decide a mano.

**Never:**
- Correr `npx tsx tools/avisar.ts` **sin `--ensayo`** (sin él envía a IndexNow). Nada con `--remote`, nada que escriba en el sitio en vivo.
- Meter `ordenAlfabetico`, `ordenRevisado` o los Directorios en la relación (son de la 26).
- Tocar `_bmad-output/planning-artifacts/` o `_bmad-output/specs/`, ni regenerar `sprint-status.yaml`.
- Un segundo cómputo de la relación o del comparador (una función para la fecha y otra para el aviso).
- Escribir nada en `corpus/` ni versionar la salida del ensayo.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Cita nueva | commit que añade `x--b.md` (Autor X, Tema t, Obra O de ≥2, Colección c) | cambian de fecha y se avisan `/cita/x-b/`, `/autor/x/`, `/tema/t/`, `/coleccion/c/` y la Obra (reglas 22.8); ninguna otra Página de Cita, aunque cambien su «Siguiente», sus recuentos o el año del `isPartOf` | — |
| Cruce de Autores | Cita B de otro Autor, Obra de una sola Cita, mismo primer Tema t; entra A en t | `/cita/b/` no cambia de fecha ni se avisa | — |
| Solo `aptaParaPortada` / `estadoDerechos` / `tradicion` / `distintaDe` | commit que solo cambia ese campo | ninguna superficie cambia de fecha; el aviso solo lleva la portada | — |
| Solo semblanza | cambia `semblanza` del Autor | solo `/autor/x/` | — |
| Nombre o años del Autor | cambia `nombre` | Autor, sus Páginas de Cita, los listados que lo pintan y sus Obras | — |
| `nota` o `ediciones` | ficha cambia solo eso | solo la Página de Obra | — |
| Retitular ficha | cambia `titulo` | su Obra, sus Páginas de Cita y los listados de Autor/Tema/Colección de esas Citas | — |
| Documento nuevo | se añade `fuente--obra--iii.txt` de una Obra paginada | solo esa Obra | — |
| Baja de Cita | se mueve a `corpus/_revision/` | su Autor, Temas, Colecciones y Obra toman el instante de ese commit (fecha y aviso coinciden) | — |
| Reunir | ficha absorbida a `_obras-retiradas/`, destino gana `formas` | la Obra destino y las Páginas de Cita y listados de las Citas que la absorbida reclamaba toman ese instante | — |
| Versión ilegible | un blob histórico no se deja analizar | esa transición cuenta como cambio de todos los campos | sin lanzar |
| Sin historial | copia superficial / sin git / git mudo | sitemap sin `lastmod` y aviso en el registro, como hoy | no rompe el build |

</intent-contract>

## Code Map

- `tools/lib/cambios.ts` — dueño único. `CitaParaFechar` (l.114) gana lo que la relación necesita (forma canónica de su obra, ficheros de sus documentos); `relacionDeSuperficies` (l.173) hoy `Map<ruta, string[]>` → entradas con familia y componentes (fichero, campos); `ficherosPorSuperficie` (l.279), `fechasPorSuperficie` (l.323), `fechaMasReciente` (l.301), `coberturaInsuficiente` (l.376) pasan de «fichero → fecha» a historial de transiciones; cabecera (l.1-80) reescrita al criterio «lo que afirma, por campos». Aquí viven la tabla de campos, la lista de los que no fechan y el comparador puro de una transición.
- `tools/lib/avisar.ts` — `FamiliaAvisable` (l.17) y `DIRECTORIOS_AVISABLES` (l.27) se parten en familias de fichero (con `documento`) y de ruta; `rutasAvisadasPor` (l.53) recibe cambios (fichero, antes, después) y aplica el comparador por componente; `componerAviso` (l.112) igual, conservando la lógica de Obras.
- `integraciones/historial.ts` — capa de git. `fechasDeLosFicheros` (l.174, `git log --name-only -z`) → transiciones por fichero con `git log --raw --no-renames -z --no-abbrev` (blobs viejo/nuevo y estado) más un solo `git cat-file --batch` de los blobs que hagan falta (no los de `corpus/fuentes/`, que solo cuentan como «cambió»), analizados con `separarFrontmatter` (`.md`) y `parse` de `yaml` (`.yml`) como `tools/lib/corpus.ts`. `corpusParaFechar` (l.256) añade documentos (nombres de `corpus/fuentes/`) y formas; `fechasDeLasSuperficies` (l.315) añade `corpus/fuentes` al ámbito y las bajas. Mantener `-z`, `--no-show-signature`, UTC y la canonización de rutas.
- `tools/avisar.ts` — `relacionEnDisco` (l.93), `corpusDeRevision` (l.113: extrae los directorios del Corpus; `corpus/fuentes` se lista con `git ls-tree`, no se extrae, 155 MB), `rutasTocadas` (l.238: `git diff --name-only` → `git diff --raw` + blobs; el Corpus de después sale de `hasta`, extraído si `hasta` no es HEAD), `principal` (l.341: `--ensayo` con `--desde` imprime el reparto por familia; historial del rango con `git log desde..hasta`).
- `src/lib/obras.ts` — `formaDeObra` (l.41), `colgarObras` (l.849), `rutaDeLaObra` (l.120): solo se reutilizan.
- `tools/lib/cotejo.ts` — `documentosDeCita` (l.242): el casado de documentos, reutilizado sin cambios.
- `src/lib/admision.ts` — `citaAdmisible` (l.318), `autorAdmisible` (l.303), `coleccionAdmisible` (l.467), `esquemaDeObra` (l.544): fuente de las claves para la prueba de clasificación.
- `tests/unit/fecha-de-cambio.test.ts`, `tests/unit/indexnow.test.ts` — pruebas puras de esta historia (sin repositorio). `tests/unit/avisar-rango.test.ts` y `tests/unit/fecha-de-cambio-build.test.ts` usan git de verdad y deben seguir en verde con las firmas nuevas.
- `astro.config.mjs` l.169 (`fechaDeLaEntrada`) — sin cambio de contrato.
- `AGENTS.md` — secciones «La Página de Obra» (párrafo del orden del libro: «la relación de 22.8 todavía no lo sabe»), «El aviso, la serie y la congelación» y las menciones «(… 24.8)».

## Tasks & Acceptance

**Execution:**
- *Medida de antes, sin tocar código* — elegir un rango real de siembra del historial (p. ej. `fd2c295d0f^..fd2c295d0f`, sesión 146, o una más reciente de `main` leída solo con git) y, con un guion en el scratchpad que importe el código actual, contar por familia las rutas que avisaría y que cambiarían de fecha con la relación por ficheros (relación sobre los Corpus extraídos de `desde` y `hasta`). Anotar las cifras en este spec. Borrar los temporales.
- `tools/lib/cambios.ts` — tabla de campos y lista de no-fechables con nombre; comparador puro de transición; relación con familias, componentes, fichas en listados, documentos en la Obra y bajas; fecha por componente; cabecera al día — es el único dueño.
- `tools/lib/avisar.ts` — dos constantes de familias; `rutasAvisadasPor` y `componerAviso` sobre cambios con antes/después y el mismo comparador.
- `integraciones/historial.ts` — transiciones por fichero (log raw + cat-file batch), documentos y formas en `corpusParaFechar`, bajas, cobertura sobre ficheros con historial; sin romper el build.
- `tools/avisar.ts` — diff raw con blobs, Corpus de `hasta`, documentos por `ls-tree`, y en `--ensayo` el bloque por familia: «cambian de fecha» y «se avisarían» por familia de ruta, más la portada aparte. No escribe ni envía.
- `tests/unit/fecha-de-cambio.test.ts` — casos de la matriz sobre corpus de ejemplo con historiales sintéticos; prueba de clasificación: cada clave de los esquemas de Cita, Autor, Colección y Obra está en alguna lista de campos o en la de no-fechables, y ninguna lista nombra una clave que no exista (así la 26.1 tiene que clasificar `ordenAlfabetico`).
- `tests/unit/indexnow.test.ts` — un rango que solo añade una Cita avisa solo su Cita, Autor, Temas, Colecciones y Obra; inversas: sobre un corpus con un alta y una baja en un mismo commit, `rutasAvisadasPor(relación de después) ∪ (rutasAvisadasPor(relación de antes) ∩ rutas de después)` es exactamente el conjunto de rutas de después cuya fecha es la del commit; las dos constantes de familias fijadas.
- `tests/unit/avisar-rango.test.ts` — ajustar a las firmas nuevas y añadir un rango que solo toca `aptaParaPortada` (solo portada) y uno que añade un documento (solo su Obra).
- `AGENTS.md` — documentar la relación por campos, la tabla, las bajas, la familia `documento` y `npx tsx tools/avisar.ts --ensayo --desde … --hasta … [--sitemap <fichero>]`; quitar las frases que dicen que la 24.8 está pendiente.
- *Medida de después* — correr `npx tsx tools/avisar.ts --ensayo --desde <mismo> --hasta <mismo>` y anotar en este spec las dos cifras por familia (antes/ahora), con fecha; anotar también cuánto tarda la lectura del historial en el Corpus real.

**Acceptance Criteria:**
- Given el sitio construido con historial completo, when se lee `dist/sitemap-0.xml`, then cada entrada (salvo la portada) lleva el `lastmod` del cambio más reciente de los campos que su superficie pinta, y dos construcciones del mismo commit dan las mismas fechas.
- Given `npx tsx tools/avisar.ts --ensayo --desde A --hasta B` sobre un rango de siembra real, when termina, then imprime por familia (cita, autor, tema, coleccion, obra) cuántas superficies cambian de fecha y cuántas se avisarían, más la portada, y no escribe ni envía nada.
- Given un commit que solo cambia `aptaParaPortada` en N Citas, when se fecha y se compone el aviso, then ninguna Página de Cita cambia de fecha ni se avisa (dato para la decisión de Héctor sobre la 21.2).
- Given la prueba de clasificación, when un esquema gana una clave sin clasificar, then `tests/unit/fecha-de-cambio.test.ts` falla nombrándola.

## Design Notes

El comparador es la única regla; las dos lecturas solo cambian de dónde salen las transiciones:

```ts
// tools/lib/cambios.ts — forma orientativa
type Campos = typeof CUALQUIER_CAMBIO | readonly string[];
interface Transicion { antes: Version | null; despues: Version | null } // null = no existe
cambiaronLosCampos(t: Transicion, campos: Campos): boolean
// fecha: historial Map<fichero, (Transicion & { fecha })[]>  ← git log --raw (por commit)
// aviso: cambios (Transicion & { fichero })[]                  ← git diff --raw desde..hasta
```

La prueba de inversas es la que impide que las dos lecturas diverjan; la de clasificación, que un campo nuevo quede fuera en silencio (un nombre mal escrito en la tabla nunca fecharía nada). Medido el 2026-10-27 en la rama: ~6.800 transiciones y ~6.200 blobs distintos en los cinco directorios del Corpus, 0,26 s el `git log --raw`; 568 borrados históricos.

## Verification

**Commands:**
- `npx vitest run tests/unit/fecha-de-cambio.test.ts` — verde.
- `npx vitest run tests/unit/indexnow.test.ts` — verde.
- `npx vitest run tests/unit/avisar-rango.test.ts` — verde.
- `npx vitest run tests/unit/fecha-de-cambio-build.test.ts` — verde (construye; git real).
- `npx astro check` — sin errores.
- `npx tsx tools/avisar.ts --ensayo --desde <A> --hasta <B>` — reparto por familia impreso, «Ensayo: no se ha enviado nada.»
- `npm test` completo, desacoplado con `correr.sh`/`esperar.pl` (≈16 min) — verde.

**Manual checks (if no CLI):**
- Las dos cifras (relación de antes y de ahora) y la duración de la lectura del historial quedan anotadas en este spec con fecha y rango.

## Medidas

Tomadas el 2026-10-27/28 en la rama `v8/epicas-24-26`, solo con git y sin tocar el sitio en vivo
(el ensayo pide el sitemap publicado para saber qué Obras se indexan; no escribe ni envía).

**Rango A — `fd2c295d0f^..fd2c295d0f`** (sesión 146: 16 Citas nuevas, 16 ficheros).

| familia | cambian de fecha (antes → ahora) | se avisarían (antes → ahora) |
|---|---|---|
| cita | 16 → 16 | 16 → 16 |
| autor | 4 → 4 | 4 → 4 |
| tema | 8 → 8 | 8 → 8 |
| coleccion | 0 → 0 | 0 → 0 |
| obra | 6 → 6 | 4 → 4 |
| portada | — | 1 → 1 |

**Rango B — `169880e015^..169880e015`** (sesión 144: 21 Citas y 11 fichas nuevas, 32 ficheros).

| familia | cambian de fecha (antes → ahora) | se avisarían (antes → ahora) |
|---|---|---|
| cita | 21 → 21 | 21 → 21 |
| autor | 4 → 4 | 4 → 4 |
| tema | 12 → 12 | 12 → 12 |
| coleccion | 0 → 0 | 0 → 0 |
| obra | 18 → 18 | 18 → 18 |
| portada | — | 1 → 1 |

«Antes» es la relación por ficheros del código de `74d911b0` sobre los Corpus extraídos de `desde`
y `hasta` (guion de medida en el scratchpad, ya borrado); «ahora», `npx tsx tools/avisar.ts
--ensayo --desde … --hasta …`. Una siembra que solo **añade** Citas ya no refechaba hermanas con
la relación por ficheros, así que las cifras coinciden: la relación vieja fallaba en los cambios
de campos, no en las altas. Ningún commit del historial toca solo `aptaParaPortada` (el único es
la siembra inicial, `c4886d43d5`), así que ese caso se mide en `fecha-de-cambio-build.test.ts`.

**El `lastmod` del Corpus real, relación vieja frente a la nueva** (HEAD de la rama, 5.148
superficies): Cita 4.348 iguales y **72 más viejas** (cambios que solo tocaban campos que la
página no pinta); Autor 148 iguales y 23 más nuevas; Tema 20 y 4; Colección 2 y 14 más nuevas
(bajas de miembros y fichas de Obra); Obra 414 iguales, **101 más nuevas** (documentos de
`corpus/fuentes/` recuperados después) y 2 más viejas.

**Duración de la lectura del historial en el Corpus real:** `historialDeLosFicheros` sobre los seis
ámbitos (con `corpus/fuentes/` opaco) — 7.297 ficheros, 8.755 transiciones — **0,89 s**;
`fechasDeLasSuperficies` entera (Corpus, historial, bajas y relación) **1,73 s**, sin avisos. El
historial de un rango en el ensayo, 0,04–0,05 s; la orden del ensayo entera, unos 7 s de reloj
(con la petición del sitemap publicado).

## Review Triage Log

### 2026-10-28 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

Las capas de revisión son externas en este bucle y no traen hallazgos en esta pasada: sigue una
revisión independiente.

### 2026-10-28 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 14: (high 0, medium 4, low 10)
- defer: 2: (high 0, medium 0, low 2)
- reject: 19: (high 0, medium 0, low 19)
- addressed_findings:
  - `[medium]` `[patch]` El camino del sitemap declaraba su propia tabla de ámbitos y familias en `integraciones/historial.ts`: ahora sale de `FAMILIAS_DE_FICHERO`, la misma que filtra el diff del aviso y el historial del ensayo (también los opacos).
  - `[medium]` `[patch]` La prueba de clasificación leía solo `admision.ts` y escribía a mano las claves de Tema: ahora une las del `z.object` literal de `citas`, `autores` y `temas` en `src/content.config.ts` (árbol sintáctico de TypeScript), con una prueba de que el lector las encuentra. Mutación: una clave nueva en `temas` falla nombrándola.
  - `[medium]` `[patch]` Las bajas del camino del sitemap (`fechasDeLasSuperficies`) no se probaban con git de verdad: la prueba de la nota de la ficha suma un `git mv` de una Cita a `corpus/_revision/` y comprueba que su Autor, su Tema y su Obra toman ese instante y la Página de Cita hermana no. Mutación: quitar `bajas:` la tumba.
  - `[medium]` `[patch]` Los documentos de `corpus/fuentes/` en el camino del sitemap tampoco: la misma prueba commitea un documento de Cartas después y comprueba que solo su Obra cambia de fecha. Mutación: `documentosEnDisco` vacío la tumba.
  - `[low]` `[patch]` `versionesDeBlobs` no escuchaba `'error'` en la entrada de `git cat-file`: un EPIPE tumbaba el proceso en vez de rechazar la promesa; ahora se ignora y manda el código de salida.
  - `[low]` `[patch]` Un cambio solo de modo (mismo blob) contaba como transición y fechaba/avisaba la Obra por un documento: `soloDeModo` lo descarta en el historial y en el diff del rango.
  - `[low]` `[patch]` Si `cat-file` fallaba en `leerRango` se perdía el aviso entero, portada incluida: ahora cada versión queda opaca y se avisa de más, con un aviso en el registro.
  - `[low]` `[patch]` El ensayo leía el árbol como Corpus de `hasta` aunque `corpus/` tuviera cambios sin commit: `esLaDelArbol` exige además `git status` limpio en los directorios que se extraen; prueba nueva con el árbol sucio (mutación comprobada).
  - `[low]` `[patch]` «Cambian de fecha» del ensayo cuenta también las Obras `noindex` y los cambios que el rango deshace: dicho en la cabecera de `ensayoDelRango` y en `AGENTS.md`.
  - `[low]` `[patch]` `AGENTS.md` y la cabecera de `cambios.ts` no decían que solo hay bajas de Cita, ficha y documento ni que una baja ilegible no fecha: escrito, con el porqué en `bajasDelHistorial` y una prueba de que la baja de un Autor, un Tema o una Colección no compone nada vivo.
  - `[low]` `[patch]` El comentario de `historialDeLosFicheros` sobre las fusiones afirmaba de más: ahora nombra la resolución de conflictos y la simplificación de historia.
  - `[low]` `[patch]` Nombre de prueba rancio en `indexnow.test.ts` (la Obra sin documentos): renombrado.
  - `[low]` `[patch]` Faltaba un rango de git de verdad que solo añade una Cita: `avisar-rango.test.ts` suma el commit `cita-nueva` y comprueba que avisa su Cita, Autor, Tema y Obra, y ninguna otra.
  - `[low]` `[patch]` La prueba de «reunir» solo miraba la fecha: ahora comprueba también que el aviso (relación de antes con la absorbida) da las mismas rutas.

Diferidos (frontmatter): los chips de Tema de la Página de Obra fuera de su composición —choca con la composición que fija el AC; pendiente de Héctor (bmad-create-epics-and-stories)— y el título efectivo que cae a las grafías de las hermanas. Rechazados: `estadoDerechos` (literal: cambiarlo rompe el build, no despublica), el cuerpo Markdown (el texto vive en el frontmatter y ninguna página renderiza el cuerpo), `TOPE_DE_SALIDA` (128 MB frente a ~1,3 MB), el blob analizado por la extensión del primer fichero (solo coincidiría el blob vacío), las medidas iguales y el guion borrado (lo pedía el spec; el AC solo pide anotar las cifras), el `lastmod` que retrocede (es el valor verdadero), el registro de la pasada vacía (esta es la revisión), `sprint-status.yaml` (lo lleva el orquestador), el orden de las pruebas de `avisar-rango` (cada caso hace su `checkout`), la Colección que quita el miembro en el mismo commit (`miembros` cambia y fecha), `CAMPOS_DE_CITA` en los listados y la resolución de bajas contra las fichas de hoy (los fija el intent-contract), las fechas de committer no monótonas, la prueba de inversas frente a `componerAviso`, el recuento que baja sin baja (ya diferido), la 21.2 delante de Héctor (los datos están en este spec), las precondiciones en `review` y el titular probado solo en puro (ahora también con git).

## Auto Run Result

Status: done
Blocking condition: ninguna.

**Qué se hizo.** La relación de AD-27 pasa de «superficie → ficheros» a «superficie → (fichero,
campos que pinta)», con la familia de la ruta, y un solo comparador puro (`cambiaronLosCampos`)
lo leen las dos lecturas: la fecha del sitemap, sobre el historial por commit (`git log --raw` +
un `git cat-file --batch`), y el aviso, sobre `git diff --raw desde..hasta`. Los listados cuentan
las fichas de Obra de sus Citas, la Página de Obra sus documentos de `corpus/fuentes/`, y las bajas
fechan lo vivo que componían. `tools/avisar.ts --ensayo --desde --hasta` imprime el reparto por
familia.

**Ficheros.**
- `tools/lib/cambios.ts` — dueño único: `CAMPOS_QUE_PINTA`, `CAMPOS_QUE_NO_FECHAN`, `VERSION_OPACA`,
  `CUALQUIER_CAMBIO`, `cambiaronLosCampos`, la relación por campos con bajas y documentos,
  `superficiesFechadas`, `fechasPorSuperficie` sobre un historial, `bajasDelHistorial`, `conRutas`;
  cabecera reescrita al criterio «lo que afirma, por campos».
- `tools/lib/avisar.ts` — `FAMILIAS_DE_FICHERO` (con `documento`) y `FAMILIAS_DE_RUTA`;
  `rutasAvisadasPor` y `componerAviso` sobre cambios con antes/después y el mismo comparador; la
  portada, con todo cambio que no sea un documento.
- `integraciones/historial.ts` — `historialDeLosFicheros` (log raw + cat-file batch, opacos para
  `corpus/fuentes/`), `entradasCrudas`, `analizarVersion`, `versionesDeBlobs`; `corpusParaFechar`
  con documentos, formas, obra declarada y Fuente; `fechasDeLasSuperficies` con bajas y el ámbito
  de los documentos, sin romper el build.
- `tools/avisar.ts` — diff raw con blobs, Corpus de `hasta` (el árbol o una copia), documentos por
  `git ls-tree`, `ensayoDelRango` e `informeDelEnsayo`.
- `tests/unit/fecha-de-cambio.test.ts` — comparador, clasificación de los esquemas, la matriz entera
  (fecha y aviso), las bajas; las pruebas de git leen el historial nuevo.
- `tests/unit/indexnow.test.ts` — las dos constantes de familias, el aviso por campos, una Cita
  nueva, solo `aptaParaPortada`, un documento, y la prueba de inversas con alta y baja.
- `tests/unit/avisar-rango.test.ts` — rangos de `aptaParaPortada` (solo portada) y de un documento
  (solo su Obra), el Corpus de `hasta` fuera del árbol, el ensayo; la nota de la ficha ya no fecha
  la Página de Cita.
- `tests/unit/fecha-de-cambio-build.test.ts` — sobre `dist/sitemap-0.xml`: un commit de solo
  `aptaParaPortada` no fecha nada y uno de solo semblanza solo fecha la Página de Autor.
- `AGENTS.md` — la relación por campos, la tabla, las bajas, la familia `documento` y la orden del
  ensayo; fuera la frase de que la 24.8 estaba pendiente.

**Revisión.** Sin hallazgos en esta pasada (capas externas): 0 parches, 0 diferidos, 0 rechazados.
Seguimiento recomendado: `false` (0 parches; puntuación 0).

**Verificación.**
- `npx vitest run tests/unit/fecha-de-cambio.test.ts` — 58/58 verde.
- `npx vitest run tests/unit/indexnow.test.ts` — 34/34 verde.
- `npx vitest run tests/unit/avisar-rango.test.ts` — 20/20 verde.
- `npx vitest run tests/unit/fecha-de-cambio-build.test.ts` — 12/12 verde (construye; git real).
- `npx astro check` — 0 errores, 0 avisos (8 pistas ajenas a esta historia).
- `npx tsx tools/avisar.ts --ensayo --desde fd2c295d0f^ --hasta fd2c295d0f` (y el rango B) — reparto
  impreso y «Ensayo: no se ha enviado nada.»
- `npm test` desacoplado — 137 ficheros, 6.297 pruebas, verde (771 s).
- Mutaciones a mano: quitar `fuente` de la tabla hace fallar la clasificación nombrándola; un
  comparador que siempre dice «cambió» tumba 8 pruebas (campos, matriz e inversas).

**Riesgos residuales.**
- El build lee ahora unos 6.200 blobs y analiza su YAML en cada construcción (≈0,9 s hoy); crece
  con el historial del Corpus, no con el número de commits del día.
- Una baja cuya última versión no se deja analizar no fecha lo que componía (no se sabe a qué
  componía); su borrado sí se avisa por la relación de `--desde`.
- Los diferidos del frontmatter siguen abiertos: el cambio de Tema, Autor u Obra de una Cita viva
  no fecha el listado que abandona; FR-51 frente a AD-27 (pendiente de Héctor, `bmad-prd`); las
  fusiones con conflictos en `corpus/` siguen invisibles para el historial.

### Pasada de revisión del 2026-10-28 (capas externas)

**Qué cambió.** Catorce parches, ninguno de contrato: el camino del sitemap toma sus ámbitos y
familias de `FAMILIAS_DE_FICHERO`; `git cat-file` ya no puede tumbar el proceso por EPIPE y, en el
aviso, su fallo deja las versiones opacas en vez de perder el aviso; un cambio solo de modo no es
una transición (`soloDeModo`); el ensayo extrae una copia de `hasta` si `corpus/` está sucio; la
clasificación lee también los esquemas literales de `src/content.config.ts` (Tema incluido); y las
pruebas cubren con git de verdad las bajas y los documentos del sitemap, el alta sola en un rango
y el aviso de «reunir». `AGENTS.md` y las cabeceras dicen qué bajas existen, qué cuenta «cambian
de fecha» y qué no ve el historial en las fusiones.

**Ficheros.**
- `integraciones/historial.ts` — ámbitos desde `FAMILIAS_DE_FICHERO`; escucha de `'error'` en la
  entrada de `cat-file`; `soloDeModo`; comentario de las fusiones.
- `tools/avisar.ts` — `soloDeModo` en el diff; `cat-file` fallido → versiones opacas con aviso;
  `esLaDelArbol` exige `corpus/` limpio; cabecera de `ensayoDelRango`.
- `tools/lib/cambios.ts` — por qué solo hay bajas de Cita, ficha y documento, y la baja ilegible.
- `tests/unit/fecha-de-cambio.test.ts` — clasificación contra `content.config.ts`; aviso de
  «reunir»; la baja de Autor, Tema o Colección no compone nada vivo.
- `tests/unit/avisar-rango.test.ts` — rango que solo añade una Cita; árbol sucio; documento y
  baja en `fechasDeLasSuperficies`.
- `tests/unit/indexnow.test.ts` — nombre de prueba al día.
- `AGENTS.md` — bajas y ensayo.

**Revisión.** 14 parches (4 medios, 10 bajos), 2 diferidos, 19 rechazados. Seguimiento
recomendado: `true` (puntuación 3 × 4 + 10 = 22).

**Verificación.**
- `npx vitest run tests/unit/avisar-rango.test.ts` — 22/22 verde; mutaciones: sin la comprobación
  del árbol limpio, sin `bajas:` y con `documentosEnDisco` vacío, la prueba que toca falla.
- `npx vitest run tests/unit/fecha-de-cambio.test.ts tests/unit/indexnow.test.ts` — verde; una
  clave nueva solo en el esquema de `temas` falla nombrándola.
- `npx vitest run tests/unit/fecha-de-cambio.test.ts tests/unit/fecha-de-cambio-build.test.ts` —
  72/72 verde.
- `npx astro check` — 0 errores, 0 avisos, 8 pistas ajenas.
- `npx tsx tools/avisar.ts --ensayo --desde fd2c295d0f^ --hasta fd2c295d0f --sitemap
  dist/sitemap-0.xml` — mismo reparto que en «Medidas» (16/16, 4/4, 8/8, 0/0, 6/4, portada 1),
  «Ensayo: no se ha enviado nada.», 6,6 s.
- `npm test` desacoplado — 137 ficheros, 6.301 pruebas, verde (770 s).

**Riesgos residuales.** Los diferidos del frontmatter: los chips de Tema de la Página de Obra
(pendiente de Héctor), el título efectivo por grafías hermanas, el recuento que baja sin baja,
FR-51 frente a AD-27 y las fusiones con conflictos en `corpus/`.

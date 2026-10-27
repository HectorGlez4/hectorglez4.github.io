---
title: 'Historia 24.8 — Una Cita nueva no refecha las demás Páginas de Cita'
type: 'feature'
created: '2026-10-27'
status: 'ready-for-dev'
review_loop_iteration: 0
followup_review_recommended: false
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

## Auto Run Result

Status: ready-for-dev
Blocking condition: ninguna (alto tras planificar, por indicación de la invocación).

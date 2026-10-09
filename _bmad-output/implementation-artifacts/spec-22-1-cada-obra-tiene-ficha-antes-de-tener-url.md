---
title: 'Historia 22.1 — Cada Obra tiene ficha antes de tener URL'
type: 'feature'
created: '2026-10-10'
status: 'in-progress'
baseline_revision: 'c75dc93c2a76300b01c502c0c7c25dbf99fc1be4'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-22-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-brainlySabiduria-2026-08-10/ARCHITECTURE-SPINE.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** La Obra va a tener página (22.4) y su URL no puede depender del título: corregir una tilde no debe mover una página ni romper un enlace. Hoy la Obra no es más que una cadena en `procedencia.obra`, sin ninguna ficha que fije su identidad ni su URL.

**Approach:** Nueva colección `corpus/obras/` con fichas `{slug-autor}--{slug-obra}.yml` que llevan `autor`, `titulo` y `formas`. Una sola función de `tools/lib/` crea las fichas, y la usan la aprobación, el alta, `documentar` y una orden de siembra. El build exige que toda Obra publicada tenga ficha. Una orden retira fichas. Ninguna ruta ni ningún texto del sitio cambian todavía.

## Boundaries & Constraints

**Always:**
- **Esquema** (`src/lib/admision.ts`, exportado como `obraAdmisible`; la colección lo usa tal cual, como `coleccionAdmisible`). Es estricto y sin valores por omisión:
  - `autor`: slug de Autor;
  - `titulo`: cadena no vacía;
  - `formas`: lista no vacía de formas canónicas (`normalizar(x) === x`) sin duplicados.
  Los campos opcionales de épicas siguientes (`distintaDe`, `nota`, `ediciones`) **no** se declaran todavía.
- **Identidad:** el par (Autor, forma) con `normalizar` (AD-3). Una Cita resuelve la ficha cuyo `autor` es el suyo y cuyas `formas` contienen `normalizar(procedencia.obra)`. Una Cita sin `procedencia.obra` no necesita ficha.
- **Nombre:** `{autor}--{slugDeObra(titulo)}.yml`, **sin** la truncación de 60 caracteres de `nombreDeDocumento`. No se recalcula nunca.
- **Regla de grafía por omisión**, declarada en `src/lib/obras.ts` como `grafiaPorOmision(grafias: {literal, citas}[])`: entre las grafías literales de `procedencia.obra` de esa Obra, gana la que más Citas publicadas usan, y en caso de empate, la primera por `localeCompare(…, 'es')`. Es siempre literal y nunca se inventa.
- **Puertas del build**, como integración `integraciones/obras.ts` al patrón de `integraciones/colecciones.ts` (regla pura que devuelve las líneas de fallo, detalle al registro y titular en el Error). Rompe:
  - una Cita publicada cuya obra no reclama ninguna ficha, nombrando la Obra, su Autor y la orden exacta (`npm run obra -- sembrar`);
  - una forma reclamada por dos fichas, nombrando las dos;
  - un nombre de fichero cuyo prefijo de Autor no coincide con `autor`;
  - una ficha cuyo `autor` no existe.
  Una ficha sin Citas publicadas **avisa** y no rompe.
- **Función única** `asegurarFichaDeObra(rutas, {autor, obra, citasPublicadas})` en `tools/lib/obras.ts`:
  1. busca la forma entre las fichas activas y las de `corpus/_obras-retiradas/`;
  2. si la encuentra activa, no hace nada;
  3. si la encuentra retirada, la **restaura** con `mover`;
  4. si no la encuentra, la crea con `titulo` = grafía por omisión y `formas: [forma]`;
  5. nunca sobrescribirá: ante una colisión de nombre con otra ficha, se niega y lo dice.
  
  La llaman, en el mismo gesto en que publican, `aprobar` (`tools/lib/revision.ts`), `darDeAltaLote` (`tools/alta.ts`, no en seco ni para candidatas) y `documentarCita` (`tools/lib/documentacion.ts`, cuando cambia la obra). Escribir en `_revision/` no crea ninguna ficha.
- **Orden** `npm run obra -- sembrar`: crea con la misma función las fichas que falten para todas las Citas publicadas. Es idempotente. Informa cuántas creó y los grupos de grafías equivalentes: misma forma con grafías literales distintas, más los pares en que una forma es prefijo de otra del mismo Autor, para la 22.2. Se ejecuta sobre el corpus real y su resultado va en un **commit propio**.
- **Orden** `npm run obra -- retirar <nombre-de-ficha> --motivo "…"`: mueve la ficha a `corpus/_obras-retiradas/` (AD-2). Se niega con código 1, y sin mover nada, mientras una Cita publicada o una candidata de `_revision/` la resuelva. Sin motivo, o sin nombre, sale con código 2.
- **`retirarAutor`** (`tools/lib/gestion.ts`): las fichas del Autor se suman a la lista de lo que lo bloquea, dicha toda a la vez.
- **Pruebas:** `construirConCorpus` siembra sola las fichas que falten, como ya hace con los documentos de Fuente, salvo que la prueba las dé, para que las pruebas de build existentes no se rompan.
- Con el corpus sembrado, `dist/` es **idéntico** byte a byte al de la base.
- Sección «Las fichas de Obra» en AGENTS.md: las dos órdenes y que nadie escribe ni borra fichas a mano.

**Block If:** la siembra encuentra dos Obras de distinto Autor que reclaman el mismo nombre de fichero, o una colisión que la función no puede resolver sin decidir. Hoy no hay ninguna.

**Never:**
- Publicar una ruta `/obra/`.
- Cambiar ningún texto del sitio.
- Decidir reuniones de grafías: eso es la 22.2 y lo decide Héctor.
- Escribir o borrar fichas a mano.
- Dar a `formas` un valor por omisión fuera del esquema.
- Leer una ficha como YAML crudo saltándose `obraAdmisible`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Obra sin ficha | Cita de Séneca con obra «Sobre la brevedad de la vida» y ninguna ficha | el build rompe y nombra la Obra, a `seneca` y `npm run obra -- sembrar` | código ≠ 0 |
| Forma duplicada | dos fichas de `seneca` con la misma forma | el build rompe nombrando los dos ficheros | código ≠ 0 |
| Prefijo erróneo | `seneca--x.yml` con `autor: horacio` | el build rompe | código ≠ 0 |
| Ficha huérfana | ficha sin Citas publicadas | aviso; el build pasa | código 0 |
| Aprobar | candidata con una obra nueva | Cita publicada y ficha creada con el título literal | — |
| Restaurar | la forma está en `_obras-retiradas/` | la ficha vuelve, no se crea otra | — |
| Colisión | el nombre existe con otra forma | se niega y no sobrescribe | código 1 en la orden |
| Candidata | `extraer` escribe en `_revision/` | ninguna ficha nueva | — |
| Grafía por omisión | «Respuesta a Sor Filotea…» ×N frente a «…sor…» ×M | gana la de más Citas; en empate, la primera alfabética | — |
| Sembrar dos veces | corpus ya sembrado | 0 creadas | — |
| Retirar bloqueada | una Cita la resuelve | no se mueve nada | código 1 |
| Retirar sin motivo | — | uso | código 2 |
| Autor con fichas | `autor retirar seneca` | las fichas aparecen entre los bloqueos | código 1 |
| `dist/` | corpus sembrado | idéntico al de la base | — |

</intent-contract>

## Code Map

- `src/content.config.ts` -- las colecciones `autores` (l.74), `colecciones` (l.164, usa `coleccionAdmisible`) y el export de l.169. Se añade `obras`, con `glob` sobre `./corpus/obras` y `*.{yml,yaml}`. Las notas de l.125-153 explican el aviso que da un directorio vacío.
- `src/lib/admision.ts` -- `nombre` (l.214), `autorAdmisible` (l.252) y `coleccionAdmisible`. Aquí va `obraAdmisible`.
- `src/lib/normalizar.ts:33` -- `normalizar`. `src/lib/slug.ts:65` -- `slugDeObra`; actualiza su comentario, porque ahora también nombra fichas.
- `tools/lib/documento.ts:2231-2298` -- `MAX_CARACTERES_SLUG_DE_OBRA` y `segmentoDeNombre`, que truncan. La ficha **no** los usa.
- `integraciones/colecciones.ts` y `tools/lib/colecciones.ts` (`fallosDeColecciones`, `titular…` y `formatear…`, l.45-82) -- la plantilla de la puerta. Se registra en `astro.config.mjs` (l.66-106).
- `tools/lib/corpus.ts` -- `Rutas` (l.119) y `rutasDelCorpus` (l.263). Se añaden `obras` y `obrasRetiradas` (`_obras-retiradas`). También `mover` (l.699, que nunca sobrescribe), `escribirAutor` (l.573), `leerAutores` (l.331), `leerCitas` (l.463) y `aYaml`.
- `tools/lib/revision.ts:208-264` -- `aprobar`, que publica en l.257-262.
- `tools/alta.ts:93,229-236` -- `darDeAltaLote`, que escribe en l.229.
- `tools/lib/documentacion.ts:440,602-632` -- `documentarCita`: cambia la obra en l.602 y escribe en l.632.
- `tools/lib/gestion.ts:612-747` -- `retirarAutor`, con `cuenta` y `listaCorta`. `tools/autor.ts:152` -- su CLI. `tools/lib/cli.ts` -- `opcion`, `posicionales`, `motivosDeArgumentosNoReconocidos` y `terminar`.
- `tools/sembrar.ts` -- modelo de orden idempotente.
- `tests/unit/ayuda/construir.ts` -- `construirConCorpus` (l.91), los directorios creados (l.157; se añade `obras`) y `documentosDeFuenteDe` (l.301), el modelo de la autosiembra. Las aserciones de build están en `tests/unit/cotejo-build.test.ts:114` y `colecciones-build.test.ts:167`. CLI: `tests/unit/autor-cli.test.ts:34-236`.
- Datos medidos: 1.894 Citas (4 sin obra), 182 pares (Autor, forma), 1 grupo de grafías equivalentes (Sor Juana, «Sor/sor Filotea») y 2 pares de prefijo (Machado, «Proverbios y cantares»; Unamuno, «Del sentimiento trágico de la vida»/«… I»).

## Tasks & Acceptance

**Execution:**
- `src/lib/admision.ts` y `src/content.config.ts` -- el esquema y la colección.
- `src/lib/obras.ts` -- `formaDeObra(obra)`, `grafiaPorOmision` y `nombreDeFichaDeObra(autor, titulo)`, más la resolución pura (Cita → ficha) y `fallosDeObras(fichas, citas, autores)` / `avisosDeObras`.
- `integraciones/obras.ts` y `astro.config.mjs` -- la puerta del build.
- `tools/lib/corpus.ts` -- las rutas, `leerFichasDeObra` (validando con `obraAdmisible`), `leerFichasDeObraRetiradas` y `escribirFichaDeObra`.
- `tools/lib/obras.ts` -- `asegurarFichaDeObra`, `sembrarFichasDeObra` y `retirarFichaDeObra`.
- `tools/obra.ts` y `package.json` (`"obra": "tsx tools/obra.ts"`) -- subórdenes `sembrar` y `retirar`.
- `tools/lib/revision.ts`, `tools/alta.ts`, `tools/lib/documentacion.ts` y `tools/lib/gestion.ts` -- los enganches.
- `tests/unit/ayuda/construir.ts` -- la autosiembra.
- Pruebas: `tests/unit/obras.test.ts` (puro y órdenes), `tests/unit/obras-build.test.ts` (filas de build de la matriz) y `tests/unit/obra-cli.test.ts` (códigos 1 y 2); más ajustes en las pruebas de revisión, alta, documentación y gestión.
- **Ejecución:** `npm run obra -- sembrar` sobre el corpus real. Revisar el informe (unas 182 fichas, 1 grupo y 2 prefijos) y comprobar que `npm run build` construye y que `dist/` sale idéntico al de la base, con la misma `FECHA_JORNADA`.
- `AGENTS.md` -- la sección nueva.

**Acceptance Criteria:**
- Given el corpus sembrado, when `npm run build`, then termina con 0 y `diff -rq` contra el `dist/` de la base no da diferencias.
- Given `npx astro check` y las pruebas tocadas, when corren, then pasan.

## Spec Change Log

## Review Triage Log

## Design Notes

La ficha es identidad y URL futura; el título es presentación. Por eso el nombre sale del título **una sola vez**, al crear la ficha, y nunca se recalcula: la 22.2 puede cambiar `titulo` y `formas` sin mover la URL. Ejemplo:
```yaml
# corpus/obras/seneca--sobre-la-brevedad-de-la-vida.yml
autor: seneca
titulo: Sobre la brevedad de la vida
formas:
  - sobre la brevedad de la vida
```

## Verification

**Commands:**
- `npx vitest run tests/unit/obras.test.ts tests/unit/obras-build.test.ts tests/unit/obra-cli.test.ts tests/unit/revision.test.ts tests/unit/gestion.test.ts tests/unit/documentacion.test.ts` -- expected: verde
- `npx astro check` -- expected: 0 errores
- `npm run build` -- expected: código 0

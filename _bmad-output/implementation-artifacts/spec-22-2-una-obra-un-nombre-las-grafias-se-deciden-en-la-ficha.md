---
title: 'Historia 22.2 — Una obra, un nombre: las grafías se deciden en la ficha'
type: 'feature'
created: '2026-10-10'
status: 'in-progress'
baseline_revision: 'f567f890efa7280cd174c8e44a7bf901026b404f'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-22-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-22-1-cada-obra-tiene-ficha-antes-de-tener-url.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Hay Obras que se publican con dos grafías: «Respuesta a Sor/sor Filotea de la Cruz», con 20 Citas contra 1. Otras Obras que podrían ser la misma no tienen manera de reunirse, o de declararse distintas, sin reescribir la Procedencia.

**Approach:**
- **Puerta ortográfica en el build:** un grupo de grafías equivalentes con alguna no literal rompe.
- **Aviso de prefijo**, que se silencia con `distintaDe` o reuniendo.
- **Una orden que restituye la grafía** de una Cita del censo a la cabecera de su documento.
- **Las órdenes `reunir` y `titular`**, que editan la ficha y nunca las Citas.
- **Las reuniones conocidas se proponen por escrito.** Las aplica la orden solo cuando Héctor las decida: ninguna se aplica en esta historia.

## Boundaries & Constraints

**Always:**
- **Literal:** la grafía `procedencia.obra` de una Cita es literal si es igual, colapsando espacios y nada más, a la `obra:` de la cabecera de **su** documento. El documento sale de `documentosDeCita` (`tools/lib/cotejo.ts`), y si la Obra tiene varias páginas, basta con que coincida una. Una Cita sin documento no es literal.
- **Puerta** (`fallosDeObras` en `src/lib/obras.ts`, que la integración ya invoca): para cada (Autor, forma) con **dos o más grafías distintas** entre sus Citas publicadas, si alguna no es literal, rompe. El mensaje nombra los ficheros de Cita, las grafías y la forma, y dice: `npm run obra -- restituir-grafia <slug>` si existe un documento de esa Obra; si no, `npm run documentar`. Si todas son literales, no rompe.
- **El build necesita las cabeceras:** la integración lee `obra:` de cada documento de `corpus/fuentes/` con `analizarDocumento` (como el cotejo) y se la pasa pura a `src/lib/obras.ts`.
- **Esquema** (`obraAdmisible`): gana `distintaDe`, opcional, una lista de formas canónicas, cada una distinta de las `formas` de la propia ficha. Si no tiene valor se omite.
- **Aviso de prefijo** (`avisosDeObras`): dos formas del mismo Autor en fichas distintas, una prefijo de palabra de la otra, avisan, salvo que alguna de las dos fichas declare a la otra en `distintaDe`.
- **Título de la ficha:** el build publica `titulo` (en la 22.3). Esta historia solo comprueba que siga siendo una grafía literal declarada por alguna Cita publicada de la Obra. Si no lo es, **avisa** y la grafía efectiva es `grafiaPorOmision`. `documentar` (cuando cambia la obra) y `retirarCita` (`documentar --retirar`) actualizan `titulo` en el mismo gesto si deja de sostenerse.
- **`npm run obra -- restituir-grafia <slug-de-cita>`:**
  - aplica solo a una Cita **del censo** (`pendientes-de-cotejo.yml`) cuya grafía normaliza igual que la `obra:` de un documento versionado del mismo Autor y Fuente, pero se escribe distinto;
  - iguala `procedencia.obra` a esa cabecera, sin tocar nada más y **sin sacarla del censo**;
  - fuera de ese caso se niega con código 1, diciendo por qué.
- **`npm run obra -- reunir <ficha-destino> <ficha-absorbida>`:**
  - añade las `formas` de la absorbida a las de la destino y retira la absorbida a `_obras-retiradas/`, con el motivo «reunida en …»;
  - no mueve ninguna Cita ni ningún documento;
  - se niega si son de Autores distintos;
  - avisa siempre de que la URL de la absorbida dará 404 cuando las Obras tengan página (NFR-4, UX-DR50 f).
- **`npm run obra -- separar <ficha> <ficha-otra>`:** añade a cada una la forma principal de la otra en `distintaDe`.
- **`npm run obra -- titular <ficha> "<grafía>"`:** solo admite una grafía que declare alguna Cita publicada de la Obra. Una escrita de nuevo se rechaza con código 1.
- **Códigos de las órdenes:** 2 para la forma de la invocación (falta un argumento, una bandera desconocida) y 1 para lo que la invocación dice.
- **Sobre el corpus real:**
  - se ejecuta `restituir-grafia` sobre la Cita de «sor Filotea», si está en el censo;
  - el build tiene que construir;
  - se escribe `_bmad-output/implementation-artifacts/propuesta-reuniones-de-obra.md` con cada reunión o separación conocida, sus datos (fichas, grafías, Citas por grafía, documentos y lo que dice cada Fuente) y la orden exacta para aplicarla:
    - «Del sentimiento trágico de la vida / … I»;
    - «Sobre la brevedad de la vida» frente a «De la brevedad de la vida»;
    - los dos «Proverbios y cantares».
- `dist/` sigue **idéntico** al de la base: el título aún no se publica.
- AGENTS.md amplía «Las fichas de Obra» con las órdenes nuevas y la regla de literalidad.

**Block If:** nada; lo que exige decisión se propone y no se aplica.

**Never:**
- Aplicar ninguna reunión ni separación sobre el corpus real.
- Reescribir una Procedencia fuera de `restituir-grafia` y `documentar`.
- Editar una Cita o una ficha a mano.
- Reunir partes de una obra (las fábulas sueltas de Fedro siguen siendo Obras distintas).
- Publicar el título o una ruta de Obra.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Grupo no literal | 2 grafías; una de una Cita sin documento | el build rompe, nombra ficheros y grafías y da la orden | código ≠ 0 |
| Grupo literal | 2 grafías, las dos iguales a cabeceras de sus documentos | el build pasa | — |
| Una sola grafía | Cita sin documento, grafía única | el build pasa | — |
| Restituir grafía | Cita del censo con «sor», documento con «Sor» | `obra` = «Respuesta a Sor Filotea de la Cruz»; sigue en el censo; nada más cambia | — |
| Restituir no aplicable | Cita con documento, o sin documento equivalente | se niega | código 1 |
| Prefijo | fichas «proverbios y cantares» y «… nuevas canciones» | aviso | — |
| distintaDe | una declara a la otra | sin aviso | — |
| Reunir | dos fichas de Séneca | formas unidas, absorbida retirada, Citas intactas y aviso de 404 | — |
| Reunir entre Autores | Séneca y Horacio | se niega | código 1 |
| Titular literal | grafía declarada por una Cita | `titulo` cambia | — |
| Titular inventado | «Obras de Séneca» | se niega | código 1 |
| Título que deja de sostenerse | se retira la Cita que lo daba | aviso del build; `documentar --retirar` actualiza el título | — |

</intent-contract>

## Code Map

- `src/lib/obras.ts` (22.1) -- `formaDeObra`, `grafiaPorOmision`, `fallosDeObras`, `avisosDeObras` y la resolución Cita → ficha. Aquí entran la regla de literalidad (pura, que recibe un mapa de cabeceras), la puerta ortográfica, el aviso de prefijo y la comprobación del título.
- `integraciones/obras.ts` (22.1) -- lee fichas, Citas y Autores. Añade la lectura de cabeceras de `corpus/fuentes/` con `analizarDocumento` (`tools/lib/documento.ts:1999`), al patrón de `integraciones/cotejo.ts`.
- `tools/lib/cotejo.ts:199,220` -- `documentoDeCita` y `documentosDeCita`. También `leerCenso` / `escribirCenso`, o los nombres que use, de `pendientes-de-cotejo.yml`.
- `src/lib/admision.ts` -- `obraAdmisible`, que gana `distintaDe`.
- `tools/lib/obras.ts` (22.1) -- `resolverFichaDeObra`, `aplicarFichaDeObra`, `retirarFichaDeObra` y `leerCitasTolerante`. Aquí van `reunirFichas`, `separarFichas`, `titularFicha` y `restituirGrafia`.
- `tools/obra.ts` (22.1) -- se añaden las subórdenes.
- `tools/lib/documentacion.ts` -- `documentarCita` y `retirarCita` (l.695): actualizan el título.
- `tools/lib/corpus.ts` -- `escribirCita`, `escribirFichaDeObra` y `mover`.
- Pruebas: `tests/unit/obras.test.ts`, `obras-build.test.ts` y `obra-cli.test.ts`. El andamio `construirConCorpus` siembra las fichas y los documentos de Fuente; para el caso «grupo literal», los dos documentos con cabeceras distintas.
- Datos reales:
  - Sor Juana: 20 Citas «Sor» y 1 «sor» (`sor-juana-ines-de-la-cruz--yo-no-estudio-para-saber-mas-sino`, en el censo); cabecera del documento: «Respuesta a Sor Filotea de la Cruz».
  - Séneca: 33 «De la brevedad de la vida» con documento y 2 «Sobre…» en el censo.

## Tasks & Acceptance

**Execution:**
- `src/lib/admision.ts`, `src/lib/obras.ts` e `integraciones/obras.ts` -- el esquema, las puertas y los avisos.
- `tools/lib/obras.ts` y `tools/obra.ts` -- las cuatro órdenes nuevas.
- `tools/lib/documentacion.ts` -- el título en el mismo gesto.
- Pruebas de cada fila de la matriz.
- **Corpus real:** `npm run obra -- restituir-grafia sor-juana-ines-de-la-cruz--yo-no-estudio-para-saber-mas-sino`, y después `npm run build` en verde.
- `_bmad-output/implementation-artifacts/propuesta-reuniones-de-obra.md` -- la propuesta para Héctor.
- `AGENTS.md`.

**Acceptance Criteria:**
- Given el corpus real tras restituir, when `npm run build`, then termina con 0, el `dist/` es idéntico al de la base y los avisos de prefijo nombran a Machado y a Unamuno.
- Given `npx astro check` y las pruebas tocadas, when corren, then pasan.

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `npx vitest run tests/unit/obras.test.ts tests/unit/obras-build.test.ts tests/unit/obra-cli.test.ts tests/unit/documentacion.test.ts` -- expected: verde
- `npx astro check` -- expected: 0 errores
- `npm run build` -- expected: código 0

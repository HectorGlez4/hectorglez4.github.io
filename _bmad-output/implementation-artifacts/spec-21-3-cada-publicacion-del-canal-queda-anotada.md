---
title: 'Historia 21.3 — Cada publicación del canal queda anotada'
type: 'feature'
created: '2026-10-10'
status: 'in-progress'
baseline_revision: 'd0e4d9e3e282db406d14ec80eea510a8c70032f3'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Se publica a diario en varias cuentas, pero no queda registro de qué se publicó, dónde ni con qué enlace. A los 90 días no se podrá distinguir «la página no trae visitas» de «se publicó la mitad de las semanas».

**Approach:** `npm run canal -- anotar <red> <formato> <ruta|-> [--fecha AAAA-MM-DD]` añade una línea al final de `corpus/publicaciones-de-canal.yml`. `npm run canal` informa por semana ISO y red, sin escribir nada. Sigue el patrón de `tools/rastreo.ts`: cáscara en `tools/canal.ts` y lógica pura en `tools/lib/canal.ts`. La 21.4 añadirá a la misma orden las señales externas.

## Boundaries & Constraints

**Always:**
- **Red:** del conjunto cerrado de `src/lib/redes.ts` (`esRedValida`).
- **Formato:** `foto`, `reel`, `pieza` o `historia`.
- **Ruta:** `-` (publicación sin enlace) o una ruta que el sitio **publica**. La juzga `rutasPublicadas` de `src/lib/publicado.ts`, igual que `tools/rastreo.ts` (readiness §3); `superficies.ts` solo se consulta para redactar el motivo. Se aceptan la URL entera del dominio propio o la ruta, y antes de juzgar se recorta la cadena de consulta (`?de=<red>`) y el fragmento. Se guarda la ruta normalizada como la escribe el censo.
- **Fecha:** `--fecha` con forma de jornada (`esJornada`) y no futura; por omisión, la fecha local de hoy. La anterior a la primera jornada anotable se rechaza, como en rastreo.
- **Escritura:** solo añade al final; ninguna entrada anterior se reescribe. Si el fichero no existe, se crea con su cabecera. La escritura es atómica, y si el fichero es ilegible se niega sin tocarlo.
- **Códigos de salida:**
  - **1** para una red fuera del conjunto, un formato fuera de los cuatro, una ruta que el sitio no publica o una fecha futura;
  - **2** para una bandera desconocida, argumentos de menos o de más, o un `--fecha` sin forma de jornada;
  - nada se escribe en ninguno de los dos casos.
- **Consulta** (`npm run canal`, con `--json` disponible): por semana ISO (`AAAA-Www`) y red, cuenta las publicaciones y desglosa a dónde enlazan:
  - Cita, Autor, Colección y portada, con la familia sacada del censo (`censoPorFamilia`; `/` es la portada);
  - «otra» para lo publicable que no es ninguna de esas;
  - «sin enlace» para `-`.
  
  No escribe nada.
- **Cabecera de `corpus/publicaciones-de-canal.yml`:**
  - qué registra (actos de publicación);
  - por qué solo añade, al contrario que las series;
  - qué la distingue de `serie-de-indexacion.yml` y de `peticiones-de-rastreo.yml`;
  - que la 18.2 se cierra con cuatro semanas ISO seguidas con la foto diaria y el enlace marcado;
  - que no la lee ningún módulo de `src/lib/` (AD-24).
  
  Se versiona con su cabecera y `publicaciones:` vacío.
- **Banderas:** `--json`, `--corpus <dir>` y `--ayuda`.
- **Docs:** script `"canal": "tsx tools/canal.ts"` en `package.json`. Sección «Anotar lo que se publica en el canal» en AGENTS.md, junto a la de rastreo.

**Block If:** nada.

**Never:**
- Inventar entradas o anotar publicaciones reales: el fichero se versiona vacío.
- Hacer que el sitio lo lea.
- Hacer peticiones de red.
- Reescribir entradas anteriores.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Alta | `anotar facebook foto /cita/<slug-publicado>/` | línea al final con la fecha de hoy | 0 |
| Alta sin enlace | `anotar tiktok reel -` | línea con `ruta: "-"` | 0 |
| URL con marca | `anotar instagram foto https://<dominio>/cita/x/?de=instagram` | se guarda `/cita/x/` | 0 |
| Con fecha | `--fecha 2026-10-08` | esa fecha | 0 |
| Red ajena | `anotar myspace foto -` | no escribe | 1 |
| Ruta no publicada | `/cita/inexistente/`, `/buscar/` o `/autor/x/2/` | no escribe | 1 |
| Fecha futura | `--fecha` de mañana | no escribe | 1 |
| Formato malo | `anotar facebook video -` | no escribe | 1 |
| Bandera | `--fecah …` o faltan argumentos | uso | 2 |
| Consulta | 3 entradas en 2 semanas | por semana y red, con desglose de destino | 0, sin escribir |
| No reescribe | fichero con 2 entradas y una alta | las 2 primeras byte a byte iguales | — |

</intent-contract>

## Code Map

- `tools/rastreo.ts` (220 líneas) y `tools/lib/rastreo.ts` -- la plantilla entera:
  - `principal(argumentos, …)` y el análisis de banderas con `tools/lib/cli.ts`;
  - `PRIMERA_JORNADA_ANOTABLE` (l.63) y `hostAjeno` (l.94);
  - `componerPeticiones` (l.124): validación contra `rutasPublicadas` y normalización;
  - `familiaDeRuta` (l.288), `destinoDePeticion` (l.359) y `lineasDeRegistro` (l.448).
  
  Se reutiliza lo que se pueda; si algo es privado y hace falta, se exporta en lugar de copiarlo.
- `tools/lib/corpus.ts` -- `Rutas`, la ruta de `peticiones-de-rastreo.yml` y su escritura de solo añadir: el patrón del fichero nuevo y su cabecera.
- `corpus/peticiones-de-rastreo.yml` -- el modelo de cabecera.
- `src/lib/redes.ts` -- `esRedValida`, `REDES_VALIDAS` y `PARAMETRO_DE_ORIGEN`.
- `src/lib/publicado.ts` -- `rutasPublicadas`. `src/lib/superficies.ts` -- `rutaNormalizada` y `caracterDe` (solo para el motivo).
- `tools/lib/indexacion.ts` -- `censoPorFamilia`. `tools/indexacion.ts` -- `conjuntoDelCorpus`.
- `src/lib/citaDelDia.ts` -- `esJornada`. `tools/lib/corpus.ts` -- `fechaLocal`.
- `tests/unit/rastreo.test.ts` -- patrones de prueba: corpus temporal, CLI en subproceso o `principal` en el mismo proceso, cabecera, `content.config.ts` y aislamiento de `src/`.

## Tasks & Acceptance

**Execution:**
- `tools/lib/canal.ts` -- puro:
  - `FORMATOS`;
  - `componerPublicacion(entrada, {publicadas, hoy})`, que devuelve la publicación o los motivos;
  - `semanaIso(fecha)`;
  - `resumenPorSemana(publicaciones, censo)`;
  - `lineasDeCanal`.
- `tools/canal.ts` -- la cáscara, con `anotar` y la consulta por omisión.
- `tools/lib/corpus.ts` -- la ruta del fichero, su cabecera, la lectura y el añadido atómico.
- `corpus/publicaciones-de-canal.yml` -- cabecera y lista vacía.
- `package.json` y `AGENTS.md`.
- `tests/unit/canal.test.ts` -- cada fila de la matriz, más la cabecera, que `content.config.ts` no apunta al fichero y que ningún `src/` lo nombra.

**Acceptance Criteria:**
- Given `npx vitest run tests/unit/canal.test.ts tests/unit/rastreo.test.ts`, when corre, then pasa.
- Given `npx astro check` y `npm run build`, when corren, then pasan, y `dist/` no cambia.

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `npx vitest run tests/unit/canal.test.ts tests/unit/rastreo.test.ts` -- expected: verde
- `npx astro check` -- expected: 0 errores
- `npm run build` -- expected: código 0

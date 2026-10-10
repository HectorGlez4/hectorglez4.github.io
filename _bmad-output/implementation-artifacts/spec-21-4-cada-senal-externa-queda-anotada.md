---
title: 'Historia 21.4 — Cada señal externa queda anotada, propia o ajena'
type: 'feature'
created: '2026-10-10'
status: 'done'
baseline_revision: 'de99ecdaff5963f17056f2f606419da3022a8507'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/spec-21-3-cada-publicacion-del-canal-queda-anotada.md'
warnings: []
deferred:
  - summary: >-
      El recordatorio de Search Console sigue diciendo «pendiente» después de hecha la comprobación: el resultado es un comentario que ninguna orden lee.
    evidence: |-
      La lectura de la 21.4 se anota a mano como comentario al final de senales-externas.yml.
    location: >-
      tools/lib/canal.ts
    severity: low
---

<intent-contract>

## Intent

**Problem:** Cuando la serie de indexación se mueva no se sabrá si fue por una señal externa ni de qué clase, porque los enlaces hacia el sitio desde fuera no se anotan en ningún sitio. Tampoco se distingue si los puso Héctor (la bio de TikTok, el Linktree, el campo web de Facebook) o un tercero.

**Approach:** Suborden `npm run canal -- senal <url-origen> <ruta-destino> --tipo propia|ajena [--fecha AAAA-MM-DD] [--nota "<texto>"]`, que añade al final de `corpus/senales-externas.yml`. La consulta `npm run canal` gana un bloque de señales.

## Boundaries & Constraints

**Always:**
- **Origen:** una URL absoluta `http(s)` cuyo host **no** sea el dominio propio, ni `www.` ni ningún subdominio suyo (`DOMINIO` de `src/lib/dominio.ts`). Si es del propio dominio, se rechaza con 1: una señal interna no es externa. Se guarda la URL tal cual se tecleó, sin espacios en los extremos.
- **Destino:** se juzga como la ruta de `anotar` de la 21.3, reutilizando su función: `rutasPublicadas`, recorte de `?…` y `#…`, y la ruta canónica del censo. Un destino que el sitio no publica se rechaza con 1. Se guarda además `marcado`, con la misma regla de `?de=<red>` que en la 21.3, solo si el destino llevaba la marca.
- **Tipo:** `--tipo` es obligatorio. Sin él, o con un valor que no es `propia` ni `ajena`, sale con 2.
- **Fecha y nota:** `--fecha` y `--nota` funcionan como en `anotar` (jornada no futura, desde la primera anotable). Repetir una bandera sale con 2.
- **Escritura:** igual que la 21.3. `appendFile` con validación previa y relectura, solo añade, crea el fichero con su cabecera si falta y se niega ante un fichero ilegible.
- **Consulta** (`npm run canal` y `--json`): un bloque «Señales externas» que separa propias de ajenas, cada una con fecha, origen, destino y familia del destino (la misma clasificación de la 21.3), y dice explícitamente si existe **alguna ajena** («La 18.1 se cierra con la primera ajena: hay N» o «todavía ninguna»). Sin señales, lo dice.
- **Cabecera de `corpus/senales-externas.yml`:**
  - qué registra (enlaces desde fuera, con su clase);
  - por qué solo añade;
  - que la 18.1 no se cierra con señales propias, sino con la primera ajena;
  - que las propias de la semana del ciclo se anotan el día que se ponen;
  - que, a las dos semanas de la primera propia, se anota a mano si figura como dominio de referencia en el informe de enlaces de Search Console;
  - AD-24.
  
  Se versiona con la cabecera y `senales:` vacío.
- AGENTS.md amplía la sección del canal con `senal`.

**Block If:** nada.

**Never:**
- Anotar señales reales.
- Hacer peticiones de red.
- Leer Search Console.
- Hacer que el sitio lea el fichero.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Propia | `senal https://www.tiktok.com/@x / --tipo propia` | línea al final con la fecha de hoy | 0 |
| Ajena con nota | `senal https://blog.ejemplo/post /cita/<slug>/ --tipo ajena --nota "reseña"` | línea con la nota | 0 |
| Sin tipo | — | uso | 2 |
| Tipo malo | `--tipo otra` | uso | 2 |
| Origen propio | `https://<dominio>/x` o `https://www.<dominio>/` | no escribe | 1 |
| Origen sin esquema | `tiktok.com/@x` | no escribe | 1 |
| Destino no publicado | `/buscar/` | no escribe | 1 |
| Fecha futura | — | no escribe | 1 |
| Consulta | 1 propia | bloque con «todavía ninguna» ajena | 0 |
| Consulta con ajena | 1 propia y 1 ajena | separadas; «hay 1» | 0 |
| No reescribe | 2 previas y una alta | las previas byte a byte iguales | — |

</intent-contract>

## Code Map

- `tools/lib/canal.ts` y `tools/canal.ts` (21.3) -- la validación de ruta y marca, `semanaIso`, el resumen, las líneas, el análisis de banderas y los códigos. Aquí entran `componerSenal`, `resumenDeSenales` y la suborden `senal`.
- `tools/lib/corpus.ts` (21.3) -- el patrón de `publicaciones-de-canal.yml`, del que salen `FICHERO_DE_SENALES`, `Rutas.senalesExternas`, `CABECERA_DE_SENALES`, la lectura validada y el añadido.
- `src/lib/dominio.ts` -- `DOMINIO`.
- `tools/lib/rastreo.ts` -- `hostAjeno`.
- `tests/unit/canal.test.ts` (21.3) -- los patrones de prueba.

## Tasks & Acceptance

**Execution:**
- `tools/lib/canal.ts`, `tools/canal.ts`, `tools/lib/corpus.ts`, `corpus/senales-externas.yml` y `AGENTS.md`.
- `tests/unit/canal.test.ts` -- cada fila de la matriz, la cabecera y el aislamiento de `src/`.

**Acceptance Criteria:**
- Given `npx vitest run tests/unit/canal.test.ts`, when corre, then pasa.
- Given `npx astro check`, `npm run build` y la suite completa, when corren, then pasan.

## Spec Change Log

## Review Triage Log

### 2026-10-10 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 13 (high 0, medium 3, low 10)
- defer: 1 (low 1)
- reject: 1
- addressed_findings:
  - `[medium]` `[patch]` Un registro roto bloqueaba la otra suborden → cada una lee el suyo; la consulta nombra el que no pudo leer.
  - `[medium]` `[patch]` El informe de la 18.1 no decía cuál es la primera ajena → la nombra, con la lista ordenada por fecha.
  - `[medium]` `[patch]` El lector era más laxo que el escritor (una ajena interna escrita a mano cerraba la 18.1) → misma validación.
  - `[low]` `[patch]` Orígenes locales; destino recortado; `?de=` solo en la consulta; duplicados avisados y contados por enlace; `--retira`; sin límite inferior de fecha; ajena marcada señalada; recordatorio de Search Console; mensajes y códigos de un solo dueño; tipos; pruebas.

## Verification

**Commands:**
- `npx vitest run tests/unit/canal.test.ts tests/unit/rastreo.test.ts` -- expected: verde
- `npx astro check` -- expected: 0 errores
- `npm run build` -- expected: código 0

## Auto Run Result

Status: done

**Resumen:** `npm run canal -- senal <url-origen> <ruta-destino> --tipo propia|ajena [--fecha] [--nota] [--retira]` añade al final de `corpus/senales-externas.yml` (vacío y versionado). La consulta separa propias de ajenas por enlace distinto, nombra la primera ajena que cerraría la 18.1 y avisa de cuándo toca mirar el informe de enlaces de Search Console.

**Revisión:** 13 parches aplicados, 1 diferido y 1 rechazado (agregado por familia en lugar de etiqueta por fila). Seguimiento: 3×3 = 9 → true.

**Verificación:** suite 113 ficheros y 3457 pruebas; astro check, 0 errores; build en verde.

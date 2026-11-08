---
title: 'Copiar una Referencia y copiar el fragmento entran en el vocabulario (30.5)'
type: 'feature'
created: '2026-11-08'
status: 'done'
baseline_revision: 'f81a36ff7dd5ade29c7f78fdf83ee7dad062ccc8'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-30-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-30-4-inserta-esta-cita.md'
warnings: ['oversized']
deferred:
  - summary: 'Soltar los dos eventos tras el despliegue del receptor (fase B de la 30.5): sacarlos de PENDIENTES y meterlos en EVENTOS_DEL_GUION en un commit aparte, ganar el caso de tests/e2e/receptor-local.spec.ts y el renglón «once» pasa a «trece».'
    evidence: 'epics.md, Story 30.5, «Given que Héctor ha desplegado el receptor desde la rama y commiteado la huella»: «en un commit aparte de la rama y nunca antes».'
    severity: 'high'
    location: 'src/lib/medicion.ts, tests/unit/vocabulario.test.ts, tests/e2e/receptor-local.spec.ts'
  - summary: 'Medición de NFR-7 de la épica con los eventos sueltos (Lighthouse móvil 4G, 10 corridas alternas, max-age=600, receptor local, frente a la principal del mismo día) y anotar cifras, peso de la Página de Cita y de dist/ y dónde cae Copiar a 360×640 en las tres Citas de la auditoría. Después de la fase B; si se degrada, decide Héctor.'
    evidence: 'epics.md, Story 30.5, «Given la épica entera en la rama, con los eventos ya sueltos».'
    severity: 'medium'
  - summary: 'Actos de Héctor (o de la sesión principal con su autorización): `npm run medicion -- desplegar` y `comprobar` desde la rama tras `git fetch`, commitear medicion/huella-del-vocabulario.json, `npm run test:e2e` entero, el merge y el valor de DESPLIEGUE_DE_CITAR_Y_LLEVARSE.'
    evidence: 'AGENTS.md «Desplegar el receptor de la medición»; RULES.md de s-30.'
    severity: 'high'
  - summary: 'Pendiente de Héctor: si `copiado-de-referencia` debe llevar el estilo (APA/MLA/Chicago) como campo, es una columna nueva con migración; sin decisión, ninguno lleva campo.'
    evidence: 'epics.md, Épica 30, Preguntas abiertas, «Los nombres de los dos eventos».'
    severity: 'low'
---

<intent-contract>

## Intent

**Problem:** Copiar una Referencia de «Cómo citar» y copiar el Fragmento de «Inserta esta cita» no se miden: la isla de Copiar no pide ningún evento para ellos, y Héctor no puede saber si quien llega viene a citar sin mezclarlo con SM-5.

**Approach:** Declarar `copiado-de-referencia` y `copiado-de-fragmento` en `EVENTOS`, sin campos y fuera de `METRICA_DE_ACCION`, retenidos en `PENDIENTES` (el guion de medición no los emite todavía); enseñar a la isla de Copiar a pedirlos con `__medir(…)` tras una copia buena; y que la lectura de la línea base los informe aparte. Esta pasada es la **fase A**: soltarlos es otro commit, tras el despliegue del receptor (diferido).

## Boundaries & Constraints

**Always:**
- Nombres: claves `copiadoDeReferencia: 'copiado-de-referencia'` y `copiadoDeFragmento: 'copiado-de-fragmento'` en `EVENTOS`, con comentario: FR-58 (Referencia) y FR-57 (Fragmento), informadas aparte y fuera de SM-5, SM-7 y SM-C3 hasta que su línea base diga cómo se leen (pregunta 15 del PRD; AD-13, NFR-11); hoy solo las pide la isla de Copiar de la Página de Cita.
- En `CAMPOS_DE_EVENTO` cada uno es `{}`: ningún campo, ninguna Marca de llegada. Ninguna migración ni columna nueva.
- `PENDIENTES = [{ historia: '30.5', eventos: [EVENTOS.copiadoDeReferencia, EVENTOS.copiadoDeFragmento] }]`; `EVENTOS_DEL_GUION` no cambia; el renglón «lo no pendiente son los once eventos de hoy» sigue con los once.
- La isla (`CopiarCita.astro`) recibe los dos nombres como constantes por `guionQueAnuncia` (p. ej. `EVENTO_REFERENCIA`, `EVENTO_FRAGMENTO`), nunca como literal en el cuerpo; en `b.onclick`, tras `anunciar` y `setTimeout`, y fuera del `try`, llama `__medir(…)` a secas con el del bloque: `copiado-de-fragmento` si el bloque `k` lleva `data-inserta-esta-cita`, `copiado-de-referencia` si no (los tres estilos son el mismo evento). Si el portapapeles rechaza (`catch { return; }`), no se pide nada. Copiar la cita sigue con `EVENTO_COPIADO`, intacto. El guion sigue sin contenido e idéntico en toda Página de Cita.
- `ComoCitar.astro` e `InsertaEstaCita.astro` no cambian de marcado: la identidad del bloque ya está (`data-como-citar` / `data-inserta-esta-cita`).
- Línea base (`tools/`): la consulta `acciones` de `FORMA_DE_LA_CONSULTA` lee también los dos eventos (siguen siendo cinco consultas y los mismos recorridos). Una constante `ACCIONES_DE_CITAR` en `lineaBase.ts` los nombra desde `EVENTOS`; el campo `acciones` de `CifrasDeSuperficie` y de `CifrasDeObra` **los excluye** (su cifra sigue comparable con la de antes) y ninguna tasa de SM-5, SM-7, SM-12, SM-C3 ni SM-C5 los cuenta.
- La lectura gana un bloque propio (`citar` en `LecturaDeMedicion`, nombre libre): en el tramo vigente de la lectura, por cada evento, el total y el recuento por superficie declarada (`lugar`/`superficieDe`, nunca prefijo de ruta), lo de fuera del censo en su sitio de siempre; si `acciones` no se leyó, `{ faltan: ['acciones'] }` y el informe dice «Sin leer (las acciones)», nunca cero. El informe: un renglón por evento; uno con la tesis de la v9 —copias de la Referencia frente a copiados de la Cita (`copiado`, todos los registros) en la Página de Cita—, sin juzgarla; y uno que dice que no hay meta y que contarlos en SM-5 o SM-C3 es la pregunta 15, que se decide con su línea base declarando el corte.
- El guion en línea de la Página de Cita con Imagen se mide con la medición puesta (`tests/unit/medicion.test.ts`, «la Página de Cita no pierde su listón»): hoy 7.326 de 7.680. Si no cabe, `MAX_BYTES_DE_GUION` sube **en el mismo diff** con la cifra medida y el margen en su comentario de `umbrales.ts`, y el spec lo anota.
- `npm run medicion -- ensayo` contra el receptor local (`npm run medicion -- local` en segundo plano, con `correr.sh`, puerto 8787 libre según RULES.md; pararlo después): debe salir con 0, y el spec anota el resultado. Solo local.
- Cuando la línea `30-5-…` de `sprint-status.yaml` pase a `review`, su comentario (a mano, sin regenerar) dice que la rama de la Épica 30 no se fusiona mientras `tests/unit/huella.test.ts` esté en rojo: espera al despliegue del receptor desde la rama y a la huella commiteada.
- `tests/unit/huella.test.ts` en rojo es **esperado** desde este commit hasta el despliegue de la sesión principal: no es un bloqueo, no se toca la huella ni la prueba, y el resultado lo dice. Cualquier otra prueba en rojo sí bloquea.

**Block If:**
- `ensayo` falla por algo de esta historia que no se arregla sin tocar `medicion/migrations/`, el receptor o la huella.
- Hacer caber el guion exige cambiar el comportamiento de Copiar, de «Cómo citar» o de «Inserta esta cita».

**Never:**
- `npm run medicion -- desplegar|comprobar`, `wrangler … --remote`, escribir `medicion/huella-del-vocabulario.json` a mano o saltar/marcar como pendiente `huella.test.ts`.
- Soltar los eventos (sacarlos de `PENDIENTES` o meterlos en `EVENTOS_DEL_GUION`) en esta pasada.
- Añadirlos a `METRICA_DE_ACCION`, a `DESTINOS_VALIDOS` o a `EVENTOS_SOLO_DEL_FICHERO`; darles un campo; una migración; una sexta consulta.
- Emitirlos desde la portada, el 404 o el Kit (no tienen esos bloques), o desde otra isla.
- Tocar `_bmad-output/planning-artifacts/`, `_bmad-output/specs/`, los umbrales de peso de `dist/` o `DESPLIEGUE_DE_CITAR_Y_LLEVARSE`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Copiar APA/MLA/Chicago | portapapeles acepta | espía ve un `__medir('copiado-de-referencia')` por pulsación, sin datos ni destino; ninguna baliza (pendiente) | — |
| Copiar el fragmento | portapapeles acepta | espía ve `__medir('copiado-de-fragmento')` | — |
| Portapapeles denegado | Referencia o Fragmento | ni «Copiado.» ni `__medir` | `catch` devuelve antes |
| Copiar la cita | botón principal | sigue siendo `copiado` | — |
| Lectura, `acciones` falla | `acciones: 'D1_ERROR'` | bloque de citar «Sin leer (las acciones)»; nunca 0 | ausencia antes que cero |
| Lectura con los dos eventos | filas en Página de Cita y en ruta fuera del censo | recuentos aparte por superficie; SM-5/SM-7/SM-C3 y `acciones` de superficie idénticos a sin ellos | — |

</intent-contract>

## Code Map

- `src/lib/vocabulario.ts:41-88` (`EVENTOS`), `:194-199` (`METRICA_DE_ACCION`, no tocar), `:256-280` (`CAMPOS_DE_EVENTO`, el tipo exige entrada por evento: `{}`).
- `src/lib/medicion.ts:79-91` (`EVENTOS_DEL_GUION`, no cambia en fase A); el guion descarta lo que no está en su tabla (prueba `tests/unit/medicion.test.ts:212`, «descarta en cliente cualquier evento fuera del conjunto»).
- `tests/unit/vocabulario.test.ts:244` (`PENDIENTES`), `:492` (los once), `:576` (prueba «está pendiente»).
- `src/islands/CopiarCita.astro:111-169` (guion; `citar` en `:146`, `b.onclick` en `:158`, `setTimeout` en `:166`), cabecera `:43-70` (las líneas «Sin `__medir` nuevo… es de la 30.5» y «La 30.5 distinguirá…» pasan a describir lo hecho).
- `src/lib/anuncio.ts:52` (`guionQueAnuncia`: escribe `const NOMBRE = "valor";` por constante).
- `tools/lib/medicion.ts:209-212` (`FORMA_DE_LA_CONSULTA.acciones.eventos`).
- `tools/lib/lineaBase.ts:504-505,557` (`acciones` de superficie y Obra), `:674-697` (`LecturaDeMedicion`), `:708-709` (constantes de acciones), `:986`, `:1061` (`deAcciones`, excluir), `:1074-1091` (`tasasDeAccion`, no cambia), `:1795-1828` (informe de la Página de Cita: el bloque nuevo va detrás).
- `tests/unit/linea-base.test.ts` (fixtures con `accion(D1, ruta, evento, n)`), `tests/unit/medicion-orden.test.ts:977-1000` (forma del SQL: debe seguir pasando).
- `tests/e2e/ayuda/espia.ts` (`espiarMedicion`, `emitidos`); patrón en `tests/e2e/imagen.spec.ts:103-113`; casos en `tests/e2e/como-citar.spec.ts` y `tests/e2e/inserta-esta-cita.spec.ts`.
- `tests/unit/medicion.test.ts:2476-2515` (bytes de guion), `:2584-2630` (islas llaman `__medir` a secas).
- `src/lib/umbrales.ts:455-466` (`MAX_BYTES_DE_GUION`, solo si no cabe).
- `AGENTS.md`, párrafo largo de la medición en «Conventions that differ from defaults» (el de `__medir(…)` a secas).

## Tasks & Acceptance

**Execution:**
- `src/lib/vocabulario.ts` -- añadir los dos eventos con su comentario y sus `{}` en `CAMPOS_DE_EVENTO` -- AD-13.
- `tests/unit/vocabulario.test.ts` -- `PENDIENTES` con la entrada de la 30.5 -- retiene los eventos hasta el despliegue.
- `src/islands/CopiarCita.astro` -- dos constantes por `guionQueAnuncia` y el `__medir` del bloque en `b.onclick`, fuera del `try`; cabecera al día -- única isla de copiar.
- `tests/unit/medicion.test.ts` (o el fichero de la isla que ya mire su guion sobre `dist/`) -- una prueba sobre el guion de Copiar en `dist/`: lleva las dos constantes con los valores de `EVENTOS`, no escribe los nombres como literal fuera de ellas, y llama `__medir(` con ellas detrás del `try`; anotar los bytes del guion.
- `tests/e2e/como-citar.spec.ts`, `tests/e2e/inserta-esta-cita.spec.ts` -- con `espiarMedicion`: copia buena → el evento, una vez por pulsación, con `datos`/`destino` nulos; denegado → ninguno; «Copiar la cita» sigue en `copiado`.
- `tools/lib/medicion.ts` -- los dos eventos en la consulta `acciones`.
- `tools/lib/lineaBase.ts` -- `ACCIONES_DE_CITAR`, exclusión en `acciones` de superficie y Obra, el bloque de la lectura y sus renglones del informe.
- `tests/unit/linea-base.test.ts` -- con respuestas fijas: recuentos por superficie y fuera del censo; «Sin leer» con `acciones` fallida; SM-5, SM-7, SM-C3 y `acciones` de superficie iguales con y sin las filas nuevas; renglones de tesis y de pregunta 15.
- `src/lib/umbrales.ts` -- solo si el guion no cabe, con la cifra medida.
- `AGENTS.md` -- el párrafo de la medición nombra las dos acciones nuevas: fuera de `METRICA_DE_ACCION`, sin campos, que solo las pide la isla de Copiar de la Página de Cita y que entraron retenidas en `PENDIENTES` hasta que Héctor despliegue el receptor; soltarlas es un commit aparte.

**Acceptance Criteria:**
- Given `npx vitest run tests/unit/vocabulario.test.ts`, when corre, then pasa: los dos eventos salen en «está pendiente: el guion no lo emite» y los no pendientes son los once.
- Given `tests/unit/migraciones.test.ts` y `tests/unit/receptor.test.ts`, when corren, then pasan sin tocar `medicion/migrations/`.
- Given una Página de Cita servida con el espía (Playwright local), when se copia una Referencia de cualquier estilo o el Fragmento con éxito, then el espía ve su evento, una vez por pulsación (que no salga baliza mientras esté pendiente lo fija la prueba «está pendiente» de `tests/unit/vocabulario.test.ts`).
- Given la lectura de la línea base con respuestas fijas, when compone, then informa los dos eventos aparte y ninguna tasa ni el `acciones` de superficie cambia por ellos.
- Given `npm test` tras el commit, when termina, then solo `tests/unit/huella.test.ts` está en rojo, y el resultado lo dice como esperado.
- Given `npm run medicion -- ensayo` contra el receptor local, when corre, then sale con 0 y el spec lo anota.

## Spec Change Log

## Review Triage Log

### 2026-11-08 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

Las capas de revisión son externas (orquestador v9-ralph) y no trajeron hallazgos en esta pasada.

### 2026-11-08 — Review pass (2)
- intent_gap: 0
- bad_spec: 0
- patch: 7 (high 0, medium 3, low 4)
- defer: 0
- reject: 16 (low 16)
- addressed_findings:
  - `[medium]` `[patch]` La isla daba por Referencia todo bloque `[data-copiables]` que no fuera «Inserta esta cita» (blind-hunter, edge-case-hunter). Ahora el evento sale de las dos identidades explícitas (`data-inserta-esta-cita` → `copiado-de-fragmento`, `data-como-citar` → `copiado-de-referencia`) al preparar el bloque, y un bloque que no es ninguno copia sin pedir nada (`if (c) __medir(c);`); la cabecera de `CopiarCita.astro` lo dice. La prueba de `dist/` de `tests/unit/medicion.test.ts` sigue el nuevo texto.
  - `[medium]` `[patch]` El literal de atributo del guion no estaba atado al marcado, y nada comprobaba que la portada, el 404 o el Kit no tuvieran bloques copiables (blind-hunter, edge-case-hunter, verification-gap, intent-alignment, ac-auditor). Prueba nueva en `npm test` sobre todas las páginas de `dist/`: los bloques `[data-copiables]` solo están en Páginas de Cita, cada uno con exactamente una de las dos identidades que el guion conoce, y la Página de Cita trae las dos.
  - `[medium]` `[patch]` La exclusión de las acciones de citar en el `acciones` de Obra (`tools/lib/lineaBase.ts:1097`) no se ejercitaba (verification-gap, ac-auditor). El fixture de `tests/unit/linea-base.test.ts` gana una `copiado-de-referencia` en `/obra/a/b/`; comprobado que revertir la exclusión pone la prueba en rojo, y el bloque de citar la cuenta en «la Página de Obra».
  - `[low]` `[patch]` `ACCIONES_DE_CITAR` y `CifrasDeCitar.porEvento[].evento` tipados como `Evento`, no `string` (blind-hunter).
  - `[low]` `[patch]` El renglón de la pregunta 15 decía «Lo de fuera del censo va en su bloque»; ahora dice que las cifras son del censo de hoy y nombra el bloque «Fuera del censo» (blind-hunter).
  - `[low]` `[patch]` E2E: el filtro de las acciones de copiar y el portapapeles denegado viven una vez en `tests/e2e/ayuda/espia.ts` (`emitidosDeCopiar`, `denegarPortapapeles`, `escriturasDenegadas`), con los nombres de `EVENTOS`; las pruebas de denegado comprueban que se intentó escribir, que el botón no pasa a `copiado` y que la región sigue vacía antes de afirmar la ausencia; y una prueba nueva copia la Cita, una Referencia, el Fragmento y otra Referencia en la misma carga y espera cada evento en orden (blind-hunter, edge-case-hunter).
  - `[low]` `[patch]` `tests/unit/medicion-orden.test.ts`: el comentario explica qué hace «descartable» a la baliza de un evento sin campos (sus campos ajenos, que el bucle exige en la baliza, no la fila) y que la única fila no guardada es la del evento ajeno: de ahí 91 enviadas y 90 leídas (blind-hunter, edge-case-hunter).

Rechazados, con su motivo: el `status: done` frente a `review` de `sprint-status.yaml` es el reparto del bucle (el spec cierra la fase A; la línea del tablero la escribe el paso de cierre y la fase B está diferida); el `findLastIndex` es correcto por construcción (la descartable va siempre detrás) y la baliza la distingue; la prueba por texto del guion es el patrón de la casa para guiones en línea y el comportamiento lo cubren las e2e; `total` del censo queda dicho en el informe; `citar` obligatorio compila (`astro check` 0 errores; no hay otro constructor); `textoDeTramo(vigente, …)` es el mismo encabezado que «Superficies con lectura»; `referenciasEnCita` y `porEvento` clasifican con el mismo `superficieDe`; la tesis declara su denominador, que es la lectura (a) que el spec fija; el estilo de la Referencia ya está diferido a Héctor; el margen del guion es riesgo residual anotado; el párrafo transitorio de AGENTS.md lo reescribe la fase B diferida; la cabecera de la isla deja de describir el vocabulario; el receptor local para la fase A no aplica (los eventos están retenidos y la fase B está diferida); `ACCIONES_DE_CITAR` frente a la consulta ya lo fija la prueba del SQL de `medicion-orden`; sin Página de Cita declarada no hay sitio; lo anterior al tramo vigente no entra, como en toda cifra de la lectura.

### 2026-11-08 — Review pass (3)
- intent_gap: 0
- bad_spec: 0
- patch: 2 (high 0, medium 1, low 1)
- defer: 0
- reject: 40 (medium 1, low 39)
- addressed_findings:
  - `[medium]` `[patch]` Mientras las dos acciones siguen retenidas, el informe de `npm run medicion` enseñaba `copiado-de-referencia: 0.` y `copiado-de-fragmento: 0.`, un cero que el guion garantiza y que parece medido, y la rama del cero no tenía prueba (blind-hunter, edge-case-hunter, verification-gap, intent-alignment). `lineasDeLecturaDeMedicion` (`tools/lib/lineaBase.ts`) dice ahora «sin registros; el guion de medición aún no lo emite» para un evento sin registros que no está en `EVENTOS_DEL_GUION` (`src/lib/medicion.ts`); al soltarlos en la fase B vuelve solo al 0 leído. Prueba nueva en `tests/unit/linea-base.test.ts` sobre los renglones del caso sin filas, en rojo sin el arreglo y en verde con él.
  - `[low]` `[patch]` El primer bloque del «Auto Run Result» (7.516 bytes, recomendación `false`) quedaba sin marcar como superado por la pasada 2 (blind-hunter, verification-gap, ac-auditor). Lleva ahora la marca «superado por la pasada 2».

Rechazados, con su motivo (casi todos repiten hallazgos ya rechazados en la pasada 2, con el mismo motivo): el `status`/`review` del tablero y el comentario «7.516» de `sprint-status.yaml` son del paso de cierre del bucle, que escribe esa línea; `review_loop_iteration: 0` es el reinicio que manda el flujo al abrir una pasada sobre un spec `done`; lo anterior al tramo vigente no entra, como en toda cifra de la lectura; `total` del censo y «Fuera del censo» ya los dice el informe; la tesis no se juzga, así que no pasa por `MIN_LECTURAS_DE_LINEA_BASE`; sin Página de Cita declarada no hay sitio; una `copiado-de-referencia` en la Obra es la de la 32.5, no una anomalía; `referenciasEnCita` y `porEvento` clasifican con el mismo `superficieDe`; `citar` obligatorio compila y no tiene otro constructor; la prueba por texto del guion es el patrón de la casa y el comportamiento lo cubren las e2e locales; el evento calculado al preparar el bloque, un bloque con las dos identidades o `data-anuncio` ausente los impide la prueba de `dist/` del marcado; `__medir` sin arranque lo impide el armazón (toda página que carga el fichero lo abre); varias pulsaciones son varias copias, por diseño; la expresión `data-copiables` y el `>` en un atributo son especulativos sobre un marcado que genera el build; `findLastIndex` y las cifras derivadas (91, 1638…) ya se explicaron; `null` frente a `undefined` en el espía y los 300 ms de espera son de pruebas locales que hoy pasan; el acoplamiento de las e2e a la 30.4 es deliberado (la secuencia mezclada); el párrafo transitorio de AGENTS.md y el receptor de la fase A los cubre la fase B diferida; los cuatro diferidos del frontmatter son anteriores a la revisión (salen del plan).

## Design Notes

Por qué la exclusión en `acciones` de superficie: es un recuento de registros que ya tiene historia; sumarle los copiados de citar movería la serie el día que se suelten, sin decirlo. Por qué la consulta `acciones` y no una sexta: cada consulta es un recorrido de la tabla contra la cuota de lectura de D1 (Historia 23.13).

Selección del evento en la isla (forma orientativa, compacta, sin comentarios en el guion):

```js
anunciar(r, 'Copiado.');
s = setTimeout(v, 2000);
__medir(k.hasAttribute('data-inserta-esta-cita') ? EVENTO_FRAGMENTO : EVENTO_REFERENCIA);
```

Mientras estén en `PENDIENTES`, el fichero de medición los descarta (no están en su tabla): el espía ve la llamada y no sale baliza. Al soltarlos (fase B) no hay que tocar la isla.

## Verification

**Commands:**
- `npx vitest run tests/unit/vocabulario.test.ts tests/unit/migraciones.test.ts tests/unit/receptor.test.ts tests/unit/linea-base.test.ts tests/unit/medicion-orden.test.ts tests/unit/medicion-secuencias.test.ts` -- verde.
- `npx vitest run tests/unit/medicion.test.ts tests/unit/como-citar.test.ts tests/unit/inserta-esta-cita.test.ts` -- verde; anotar los bytes del guion de la Página de Cita con Imagen.
- `npx vitest run tests/unit/huella.test.ts` -- rojo esperado, por la huella; anotarlo.
- `npx astro check` -- 0 errores.
- `npm run medicion -- local` (detached) y `npm run medicion -- ensayo` -- 0; parar el receptor.
- `npx playwright test tests/e2e/como-citar.spec.ts tests/e2e/inserta-esta-cita.spec.ts tests/e2e/copiar.spec.ts --project=movil --project=escritorio` -- verde.
- `npm test` (detached, `correr.sh`) -- verde salvo `huella.test.ts`.

## Auto Run Result

Status: done
Blocking condition: ninguna. `tests/unit/huella.test.ts` en rojo es **esperado** (el vocabulario se movió y la huella no se toca hasta que la sesión principal despliegue el receptor desde la rama y commitee `medicion/huella-del-vocabulario.json`).

**Resumen.** Fase A de la 30.5: `copiado-de-referencia` y `copiado-de-fragmento` entran en `EVENTOS` con `{}` en `CAMPOS_DE_EVENTO`, fuera de `METRICA_DE_ACCION`, y retenidos en `PENDIENTES` (el guion de medición no los emite; `EVENTOS_DEL_GUION` intacto, los no pendientes siguen siendo once). La isla de Copiar los recibe como constantes (`EVENTO_REFERENCIA`, `EVENTO_FRAGMENTO`) y, tras una copia buena de un bloque y fuera del `try`, pide el del bloque con `__medir(…)` a secas. La consulta `acciones` de la lectura lee también los dos (siguen cinco consultas); `ACCIONES_DE_CITAR` los excluye del `acciones` de superficie y de Obra y de toda tasa, y la lectura gana el bloque `citar` con su informe (renglón por evento, la tesis sin juzgarla, la pregunta 15; «Sin leer (las acciones)» si falla).

**Ficheros.**
- `src/lib/vocabulario.ts` — los dos eventos, con su comentario, y sus `{}`.
- `src/islands/CopiarCita.astro` — dos constantes por `guionQueAnuncia` y el `__medir` del bloque; cabecera al día.
- `tools/lib/medicion.ts` — los dos eventos en la consulta `acciones`.
- `tools/lib/lineaBase.ts` — `ACCIONES_DE_CITAR`, exclusión en `acciones`, `CifrasDeCitar`/`citar` y el bloque «Citar» del informe.
- `tests/unit/vocabulario.test.ts` — `PENDIENTES` con la 30.5; la lista cerrada con los dos.
- `tests/unit/medicion.test.ts` — la lista cerrada; prueba nueva sobre el guion de Copiar en `dist/` (constantes, sin literal, `__medir` tras el `catch`, y solo dos `__medir`).
- `tests/unit/medicion-orden.test.ts`, `tests/unit/medicion-secuencias.test.ts` — el SQL de `acciones` con los dos; 91 balizas (antes 87: dos eventos × válida y descartable); la descartable de un evento sin campos se busca como la última fila vacía.
- `tests/unit/linea-base.test.ts` — bloque de la 30.5 con respuestas fijas; la prueba de metas admite el renglón «No tienen meta».
- `tests/e2e/como-citar.spec.ts`, `tests/e2e/inserta-esta-cita.spec.ts` — espía: evento una vez por pulsación sin datos ni destino; denegado, ninguno; «Copiar la cita» sigue en `copiado`.
- `AGENTS.md` — el párrafo de la medición nombra las dos acciones y la fase B.
- `sprint-status.yaml` (commit aparte) — la 30.5 en `review`, con el aviso de no fusionar mientras la huella esté en rojo.

*(Pasada 1, superada por la pasada 2: sus bytes y su recomendación ya no valen; véase abajo.)*

**Revisión.** Sin hallazgos externos en esta pasada: 0 parches, 0 diferidos, 0 rechazados. Recomendación de revisión de seguimiento: `false` (0 parches; puntuación 0).

**Verificación.**
- `npx vitest run tests/unit/vocabulario.test.ts tests/unit/migraciones.test.ts tests/unit/receptor.test.ts tests/unit/linea-base.test.ts tests/unit/medicion-orden.test.ts tests/unit/medicion-secuencias.test.ts` — 384 en verde.
- `npx vitest run tests/unit/medicion.test.ts tests/unit/como-citar.test.ts tests/unit/inserta-esta-cita.test.ts` — 712 en verde. Guion en línea de la Página de Cita con Imagen y medición puesta: **7.516 de 7.680 bytes** (antes 7.326; +190), cabe: `MAX_BYTES_DE_GUION` no cambia.
- `npx vitest run tests/unit/huella.test.ts` — rojo esperado, por la huella.
- `npx astro check` — 0 errores, 0 avisos.
- `npm run medicion -- local` (desacoplado) y `npm run medicion -- ensayo` — **0**: «91 balizas enviadas, 90 filas leídas, y casan»; cada evento y valor llegó al D1 local, lo ajeno se descartó, recuentos iguales tras barajar. Receptor parado.
- `npx playwright test tests/e2e/como-citar.spec.ts tests/e2e/inserta-esta-cita.spec.ts tests/e2e/copiar.spec.ts --project=movil --project=escritorio` — 62 en verde.
- `npm test` — 7.321 en verde, 1 en rojo: solo `tests/unit/huella.test.ts` («está versionada… y casa con src/lib/vocabulario.ts»), el rojo esperado.

**Auditoría de la matriz.** Copiar APA/MLA/Chicago y el fragmento → e2e de la 30.5 (evento por pulsación, sin datos ni destino; que no sale baliza lo fija «está pendiente» de `vocabulario.test.ts`). Portapapeles denegado → e2e «no pide nada» en los dos bloques. Copiar la cita → e2e «sigue pidiendo copiado». `acciones` falla → `linea-base.test.ts` «Sin leer (las acciones)». Lectura con los dos → `linea-base.test.ts` recuentos por superficie, fuera del censo y tasas idénticas.

**Riesgos residuales.** Margen del guion de 164 bytes para la Épica 31 y la fase B (que no toca la isla). La fase B, la medida NFR-7 de la épica y el despliegue del receptor siguen diferidos (frontmatter).

### Pasada de revisión 2 (hallazgos externos de las cinco capas)

**Resumen.** Siete parches, ningún `bad_spec` ni `intent_gap`, nada diferido; 16 rechazados con su motivo en el Review Triage Log. La isla ya no da por Referencia un bloque copiable sin identidad conocida: el evento sale de `data-inserta-esta-cita` o `data-como-citar`, y lo demás copia sin pedir nada. `npm test` gana la prueba de `dist/` que ata esas dos identidades al marcado y deja los bloques copiables solo en las Páginas de Cita; la línea base ejercita la exclusión del `acciones` de Obra; tipos `Evento` en `ACCIONES_DE_CITAR`; el renglón de la pregunta 15 nombra «Fuera del censo»; las e2e comparten ayudante con los nombres de `EVENTOS`, comprueban la rama del rechazo y la secuencia mezclada.

**Ficheros.**
- `src/islands/CopiarCita.astro` — evento por las dos identidades del bloque, `if (c) __medir(c);`; cabecera al día.
- `tools/lib/lineaBase.ts` — `Evento` en `ACCIONES_DE_CITAR` y `CifrasDeCitar`; renglón de la pregunta 15.
- `tests/unit/medicion.test.ts` — la prueba del guion sigue el nuevo texto; prueba nueva de los bloques copiables en todo `dist/`.
- `tests/unit/linea-base.test.ts` — fila de citar en la Obra; renglones al día.
- `tests/unit/medicion-orden.test.ts` — comentario de la descartable sin campos y de 91/90.
- `tests/e2e/ayuda/espia.ts` — `emitidosDeCopiar`, `denegarPortapapeles`, `escriturasDenegadas`.
- `tests/e2e/como-citar.spec.ts`, `tests/e2e/inserta-esta-cita.spec.ts` — ayudante compartido, rechazo comprobado, secuencia mezclada.

**Revisión.** Parches 7 (alta 0, media 3, baja 4); diferidos 0; rechazados 16. Recomendación de revisión de seguimiento: `true` (3 × 3 + 1 × 4 = 13 ≥ 5).

**Verificación.**
- `npx vitest run` de vocabulario, migraciones, receptor, linea-base, medicion-orden y medicion-secuencias — 384 en verde. Revertir la exclusión de la Obra (`lineaBase.ts:1097`) pone en rojo «ninguna tasa ni el acciones de superficie o de Obra cambian por ellas»; restituida.
- `npx vitest run tests/unit/medicion.test.ts tests/unit/como-citar.test.ts tests/unit/inserta-esta-cita.test.ts` — 713 en verde. Guion en línea de la Página de Cita con Imagen y medición puesta: **7.577 de 7.680 bytes** (+61 sobre la pasada 1); `MAX_BYTES_DE_GUION` no cambia.
- `npx astro check` — 0 errores, 0 avisos.
- `npm run medicion -- local` (desacoplado) y `npm run medicion -- ensayo` — **0**, «91 balizas enviadas, 90 filas leídas, y casan»; receptor parado.
- `npx playwright test tests/e2e/como-citar.spec.ts tests/e2e/inserta-esta-cita.spec.ts tests/e2e/copiar.spec.ts --project=movil --project=escritorio` — 64 en verde.
- `npm test` — 7.322 en verde, 1 en rojo: solo `tests/unit/huella.test.ts`, el rojo esperado hasta el despliegue del receptor.

**Riesgos residuales.** El margen del guion baja a 103 bytes para la Épica 31 (la fase B no toca la isla). Un bloque copiable nuevo copia sin medir hasta que su historia declare su evento y su identidad (la prueba de `dist/` lo para si no trae una de las dos conocidas). Fase B, NFR-7 de la épica y el despliegue siguen diferidos.

### Pasada de revisión 3 (hallazgos externos de las cinco capas)

**Resumen.** Dos parches, ningún `bad_spec` ni `intent_gap`, nada diferido; 40 rechazados con su motivo en el Review Triage Log (casi todos repiten los de la pasada 2). Mientras las dos acciones siguen retenidas, el informe de la línea base ya no enseña un `0.` que parezca medido: dice «sin registros; el guion de medición aún no lo emite», y vuelve solo al cero leído cuando la fase B las suelte en `EVENTOS_DEL_GUION`. El primer bloque de este resultado queda marcado como superado.

**Ficheros.**
- `tools/lib/lineaBase.ts` — el renglón de un evento de citar sin registros y retenido lo dice; importa `EVENTOS_DEL_GUION` de `src/lib/medicion.ts`.
- `tests/unit/linea-base.test.ts` — prueba nueva de los renglones del caso sin filas (en rojo sin el arreglo, en verde con él).
- Este spec — triage de la pasada 3 y la marca de superado en el bloque de la pasada 1.

**Revisión.** Parches 2 (alta 0, media 1, baja 1); diferidos 0; rechazados 40. Recomendación de revisión de seguimiento: `false` (3 × 1 + 1 × 1 = 4 < 5).

**Verificación.**
- `npx vitest run` de vocabulario, migraciones, receptor, linea-base, medicion-orden, medicion-secuencias y orden-de-llegada — 514 en verde.
- `npx astro check` — 0 errores, 0 avisos.
- `npm test` — 7.323 en verde, 1 en rojo: solo `tests/unit/huella.test.ts`, el rojo esperado hasta el despliegue del receptor.
- La isla, el guion y `dist/` no cambian en esta pasada: los bytes (7.577 de 7.680), el `ensayo` y las e2e de la pasada 2 siguen valiendo.

**Riesgos residuales.** Los de la pasada 2. Al soltar los eventos (fase B), la prueba nueva cae a propósito en su primera aserción y pide el cero leído.

## Verificación previa a la fusión — 2026-11-08 (UTC)

Puerta de la etapa s-30 (Épica 30, 30.1–30.5), intento 1.

**Puesta al día.** `git fetch origin`; `origin/main` (369a171dd1, con la Épica 29 y la 34.0) no era antepasado y se fundió en `d181cb057f`. Dos conflictos, resueltos con los dos lados: las importaciones de `tests/e2e/ayuda/corpus.ts` en `tests/e2e/pagina-de-cita.spec.ts` (`citasEnVerso` y `estaPublicada`) y la fecha de `sprint-status.yaml` (el resto, por la fusión automática: las líneas de la principal y los estados de la rama, una clave por línea). `npx tsx tools/autor.ts proponer-claves` no escribió nada. El lock no cambió: sin `npm ci`.

**Lo diferido «al fundir la Épica 29».**
- 30.3 (`a36c8be322`): `referenciaDeCita` pasa el texto por `enUnaLinea`; la tabla literal de `tests/unit/atribucion.test.ts` gana la fila «en verso» con « / » en APA, MLA y Chicago.
- 30.4 (`3fd04bc8e3`): el párrafo de `fragmentoParaInsertar` es `versosDe(cita.texto).map(escapar).join('<br>')`; la tabla gana la fila «en verso» y `tests/unit/inserta-esta-cita.test.ts` construye una Cita en verso respaldada por su documento de verso y comprueba que, con los `<br>` leídos como saltos, el texto es el `texto`.
- Los dos se componen en el build: el guion de Copiar no cambia y `MAX_BYTES_DE_GUION` no se toca (`tests/unit/medicion.test.ts` en verde).
- Arreglo de la ronda 1 (`31032eca97`): `tests/unit/verso-construido.test.ts` (29.3) exigía ningún « / » en el `<main>` de una Página de Cita en verso; con la 30.3 las tres Referencias son la excepción de UX-DR116. La prueba sigue exigiéndolo en todo lo demás del `<main>` y comprueba en positivo que las tres Referencias llevan `«${enUnaLinea(texto)}».`.

**CI equivalente** (sobre `31032eca97` para `npm test`; el build y `astro check` también tras el arreglo, que solo toca una prueba):
- `npm run build` — 0; peso juzgado 516,9 MiB (aviso en 750 MiB).
- `npx astro check` — 0 errores, 0 avisos, 11 sugerencias.
- `npm test` — 7.583 en verde, 1 en rojo: solo `tests/unit/huella.test.ts` (los eventos `copiado-de-referencia` y `copiado-de-fragmento` no están en la huella), el rojo aceptado hasta que la sesión principal despliegue el receptor desde la rama.

**`npm run test:e2e`** (los dos proyectos, receptor local en 8787): 1.372 en verde, 155 omitidas, 1 en rojo: `tipografia-calculada.spec.ts` «buscar-con-resultados» (instantánea de `/buscar/`, clave `div.recuento > p.estado`). Repetida sola: falla de forma intermitente en los dos proyectos (5 de 6 con `--repeat-each=3`) y **falla igual sobre `origin/main`** (369a171dd1, 5 de 6 con la misma orden): no la causa la Épica 30, que no toca `/buscar/`. Queda para quien decida la instantánea o la espera de esa prueba en la principal.

**NFR-7** (la etapa cambia la Página de Cita). Lighthouse 13.5.0 móvil (`--throttling-method=simulate`), los dos `dist/` construidos en local con `MEDICION_ENDPOINT=http://localhost:8787/` y servidos por el `tests/servidor.mjs` de la rama con `SERVIDOR_CACHE_CONTROL=max-age=600` y `SERVIDOR_GZIP=1` (principal en 4399, rama en 4400, receptor ficticio en 8787), 10 corridas alternas por página:

| Página | LCP principal | LCP rama | Δ | FCP principal | FCP rama | Δ |
|---|---|---|---|---|---|---|
| `/cita/antonio-machado-caminante-no-hay-camino-sino-estelas-en/` | 1.595 | 1.610 | +14 | 908 | 934 | +26 |
| `/cita/jose-marti-yo-vengo-de-todas-partes-y-hacia/` (en verso) | 1.595 | 1.610 | +15 | 906 | 938 | +31 |

Margen max(100 ms, 5 %): las dos dentro; LCP de Cita bajo 2.500 ms. Veredicto: **ok**, sin desempate. Registro: `.claude/v9-ralph/logs/s-30/nfr7-gate1/`.

**Veredicto de la puerta.** Pasa con el rojo aceptado de `huella.test.ts` y el rojo preexistente de la principal en la instantánea de `/buscar/`. `vocabulario_changed: true`: el orden es receptor (desde la rama), huella commiteada y después fusión.

## Verificación en el sitio en vivo — 2026-11-08

Receptor desplegado antes (desplegar y comprobar con 0; huella d9a663b600). Fusión 97e0073166, Publicar 42517374294 en verde («Desplegar» 2026-11-08T20:13:29Z). Solo curl.

| URL | Qué se buscó | Resultado |
|---|---|---|
| /cita/jose-marti-yo-vengo-de-todas-partes-y-hacia/ | 200 | encontrado |
| la misma | «Copiar» antes de la Tarjeta de Obra dentro de `<main>` (30.1) | encontrado (botón en el byte 19.755, tarjeta en el 33.354) |
| la misma | «Cómo citar» con tres Referencias copiables (30.3) | encontrado (`data-como-citar`, `data-referencia data-copiable`) |
| la misma | la Referencia de una Cita en verso en una línea con « / » (30.3, tras la 29) | encontrado |
| la misma | «Inserta esta cita» con el Fragmento y sus `<br>` (30.4) | encontrado (`data-inserta-esta-cita`, `&lt;br&gt;` en el campo) |
| 30.2 | medida y fila de acciones desde 600 px | sin superficie que mirar con curl (CSS); cubierto por la e2e de la puerta |
| 30.5 | los dos eventos nuevos | sin datos que enseñar: fase A, retenidos en PENDIENTES; el receptor ya los acepta |

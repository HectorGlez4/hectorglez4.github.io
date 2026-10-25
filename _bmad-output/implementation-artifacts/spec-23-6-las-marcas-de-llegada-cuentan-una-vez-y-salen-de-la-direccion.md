---
title: 'Historia 23.6 — Las marcas de llegada cuentan una vez y salen de la dirección'
type: 'feature'
created: '2026-10-25'
status: 'done'
baseline_revision: 'a0e540104fb3c693e3651b0b73b9f8cda7e36998'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-23-context.md'
warnings: [multiple-goals, oversized]
deferred: []
---

<intent-contract>

## Intent

**Problem:** el fichero de medición lee `?de=` y la deja en la dirección, así que una recarga, un enlace copiado de la barra o una vuelta atrás vuelven a contar la misma llegada en SM-8; y `?via=` —la Marca de difusión, que el vocabulario (23.2) y el receptor desplegado (23.3) ya saben guardar en vistas y lectura— no la lee nadie (`PENDIENTES` de la 23.6 en `tests/unit/vocabulario.test.ts`). Además `npm run canal` acepta hoy un enlace con `?via=` en `anotar` y en `senal`, sin distinguir la marca de un visitante de la de una cuenta propia.

**Approach:** enseñar al fichero que compone `guionDeMedicion` a leer las dos marcas una vez, al activarse y antes de la vista, cada una contra su conjunto; a quitarlas de la dirección con `history.replaceState` mediante una sola función pura que conserva el resto, el fragmento y `history.state`; a enviarlas con las vistas y la lectura y olvidarlas al emitir la lectura. Y en `tools/`, que `anotar` y `senal --tipo propia` rechacen `?via=` y que `senal --tipo ajena` lo admita, cotejado, con un campo `compartido: true` y su aviso en la consulta.

## Boundaries & Constraints

**Always:**
- Las dos marcas se leen **una vez**, en la activación (`a()`, tras `prerenderingchange` si hace falta), antes de emitir ninguna vista, de `new URLSearchParams(location.search)` (la cadena literal la exige `tests/unit/redes.test.ts`): `origen` con `get(PARAMETRO_DE_ORIGEN)` y `via` con `get(PARAMETRO_DE_DIFUSION)`, la primera aparición, y se guardan en variables separadas. Cada una se coteja al emitir contra su conjunto (redes de `redes.ts`; `DESTINOS_VALIDOS`), por la tabla de `CAMPOS_DE_EVENTO`: un valor ajeno viaja `null` y el evento sale igual. Los nombres de los parámetros y los conjuntos se componen desde sus módulos, nunca se escriben en `medicion.ts`.
- Quitar las marcas es **una sola función pura** —(búsqueda, nombres) → búsqueda— que viaja dentro del fichero: parte la consulta por `&`, quita cada segmento que el mismo lector (`URLSearchParams`) lee como `de` o `via` —todas las apariciones, con valor o sin él, válidas o ajenas— y devuelve el resto **literal** (sin recodificar), en su orden, con `?` delante solo si queda algo. Ningún nombre parecido (`dev`, `vias`, `DE`, `de%20`, `xde`) se toca; `d%65` sí, porque el lector lo lee como `de`.
- El fichero llama a `history.replaceState(history.state, '', location.pathname + nueva + location.hash)` **solo si** la búsqueda cambió, dentro de un `try`: si lanza, o no hay `history`, las vistas salen igual con sus marcas. Nunca `location.href`, nunca recarga.
- `via` viaja con las vistas y la lectura (fuente nueva del fichero en `FUENTE_EN_EL_GUION`), nunca con una acción ni con otro evento, y no la puede poner una isla por argumento. Al emitir la lectura, las dos marcas pasan a `null`; `pageshow` con `persisted` las deja en `null`, como ya hace con `origen`; nada vuelve a leer `location.search`.
- En una superficie sin vista (páginas 2+, `/buscar/`, 404) las marcas se quitan igual y ningún evento las lleva. Sin punto final no hay fichero, y la dirección se queda como llegó.
- `tools/`: `anotar` rechaza con 1 todo enlace cuya consulta (antes de `#`) lleve `via`, diciendo que `?via=` es la marca de un visitante y no la de una cuenta propia; `senal --tipo propia`, igual. `senal --tipo ajena` coteja `?via=` por su lado, con la regla de `?de=`: un valor fuera de `DESTINOS_VALIDOS` (también vacío) o más de un valor distinto, 1; si no, anota `compartido: true` (booleano opcional, solo `true`, al patrón de `marcado`) y la consulta pinta «⚠ copia un enlace compartido».
- `CODIGOS_DE_SENAL` se pone al día a la vez en sus tres copias (la cabecera la compone desde la constante; `AGENTS.md` y el docblock de `tools/canal.ts`, literal), y los dos registros versionados siguen siendo exactamente su cabecera con la lista vacía.
- `MAX_BYTES_GUION_DE_MEDICION` se sube a lo medido con el punto final de producción más unos 400 bytes, redondeado, con la medida y el porqué en su comentario (precedente de la 23.1, 23.2 y 23.5).

**Block If:**
- Cumplir algo exige cambiar `src/lib/vocabulario.ts` o `medicion/` (movería la huella y exigiría otro `desplegar`).
- Cumplir algo exige subir `MAX_BYTES_DE_GUION`, tocar `ARRANQUE_DE_MEDICION` o escribir en el D1, el Worker o el sitio en vivo.
- `corpus/senales-externas.yml` o `corpus/publicaciones-de-canal.yml` traen en la rama alguna entrada: no se reescriben.

**Never:**
- Que una isla lea `de`/`via`, escriba en el historial o componga `?via=` (lo compuesto es de la 25); la marca de asentada de la búsqueda y su `replaceState` (23.8); `salida-interna` y zonas (23.7); `vista-de-obra` (23.9); la lista de cortes de serie, `CORTES_DE_SM8` o la jornada de despliegue de la 23 (23.10/23.11).
- Reconstruir la consulta con `URLSearchParams#toString` (recodifica lo ajeno); meter la función pura con `String(función)` (el empaquetado puede renombrarla y el fichero dejaría de ser el mismo en Vitest y en el build); leer la dirección más de una vez.
- Anotar ninguna publicación ni señal en `corpus/`; editar `_bmad-output/planning-artifacts/` o `_bmad-output/specs/`; correr `npm run medicion -- desplegar|comprobar`, `wrangler … --remote`, push o fusión.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Dos marcas | vista declarada, `?de=instagram&via=whatsapp` | vista `{origen:'instagram', via:'whatsapp'}`; `replaceState(estadoPrevio, '', '/cita/una/')`, una vez; la lectura lleva las dos; nada después las lleva | — |
| Solo difusión | `?via=telegram` | `origen: null`, `via: 'telegram'` en vista y lectura | — |
| Ajenas | `?de=visitante-7f3a&via=lo-que-sea` | los dos `null`; la vista y la lectura salen; las dos se quitan | — |
| Repetidas | `?via=x&via=whatsapp` / `?via=whatsapp&via=x` | `via: null` / `'whatsapp'` (la primera); todas las apariciones se quitan | — |
| Resto y fragmento | `?a=1&de=instagram&b=%20&via=x`, `#frag` | dirección `/cita/una/?a=1&b=%20#frag`, literal | — |
| Nombres parecidos | `?dev=1&vias=2&DE=3&de%20=4&xde=5` | ninguna marca; no se llama a `replaceState` | — |
| Codificado | `?d%65=tiktok` | `origen: 'tiktok'`, y se quita | — |
| Sin marcas | `''`, `?a=1&&b=2` | ni `replaceState` ni cambio | — |
| Sin vista | sin `data-vistas`, `?de=x&via=whatsapp`, interacción, copiado | se quitan; ningún evento lleva `origen` ni `via` | — |
| Prerender | `prerendering: true`, luego `activar()` | nada se lee ni se quita antes; al activar, como «Dos marcas» | — |
| Caché de atrás y adelante | tras la lectura, `pageshow` `persisted` | nueva lectura con `origen` y `via` nulos | — |
| Recarga | entorno nuevo con la dirección que dejó `replaceState` | vista y lectura sin marcas | — |
| Historial roto | `replaceState` lanza, o no hay `history` | vista y lectura con sus marcas; ninguna excepción sale | `try` |
| Isla que cuela `via` | `__medir('vista-de-cita', null, undefined, 'si', 'whatsapp')` sin marcas | `via: null` | descartado |
| `anotar` con `?via=` | `anotar facebook foto /cita/x/?de=facebook&via=whatsapp` | código 1, nada escrito, el motivo nombra `?via=` como marca de un visitante | — |
| `senal` propia con `?via=` | `senal https://linktr.ee/x /?via=whatsapp --tipo propia` | código 1, nada escrito, mismo motivo | — |
| `senal` ajena con `?via=` | `/cita/x/?via=whatsapp --tipo ajena` | 0; `destino: /cita/x/`, `compartido: true`; consulta «⚠ copia un enlace compartido» | — |
| `?via=` ajeno o varios | `?via=myspace`, `?via=`, `?via=x&via=telegram` en ajena | código 1, nada escrito; `?via=x&via=x` se admite | — |
| Las dos marcas, ajena | `?de=instagram&via=x` | `marcado: true` y `compartido: true`, los dos avisos | — |
| Tras `#` | `/cita/x/#?via=x` | no cuenta como marca, como `?de=` | — |
| Entrada a mano | `compartido: "sí"` en el registro | el registro no se deja leer: código 1 y nada escrito | — |

</intent-contract>

## Code Map

- `src/lib/medicion.ts:21-32` -- importa `PARAMETRO_DE_ORIGEN` de `redes.ts` y del vocabulario; `PARAMETRO_DE_DIFUSION` ya existe en `vocabulario.ts:34`, y `DESTINOS_VALIDOS` llega por `CAMPOS_DE_EVENTO` (no hace falta importarlo).
- `src/lib/medicion.ts:92-116` -- `FUENTE_EN_EL_GUION` (0 marca, 1 datos, 2 destino, 3 `primera`): entra `via` como fuente nueva; `camposQueEmite` y `CAMPOS_DEL_GUION` la heredan (los usan `vocabulario.test.ts` y `receptor.spec.ts`). Docblock «Los demás campos… `via`…» al día.
- `src/lib/medicion.ts:174-337` -- docblock y `guionDeMedicion`: `b` compone con `m=[o,t,z,y]` (pasa a llevar la marca de difusión), `l` emite la lectura (ahí se olvidan), `a()` lee `?de=` (línea 325) y emite vistas, `pageshow` (331) pone `o=null`. Aquí entran la función pura, la lectura de `via`, el `replaceState` y el olvido. Las variables cortas están listadas en el comentario 285-301: al día.
- `src/lib/vocabulario.ts:30-34,242,251-265` -- solo lectura: `PARAMETRO_DE_DIFUSION`, `MARCA_DE_DIFUSION` (`DESTINOS_VALIDOS`, nulo), `via` ya declarada en `vista-de-cita`, `vista-de-superficie`, `vista-de-obra` y `lectura`. No se toca (huella).
- `src/lib/umbrales.ts:198-222` -- `MAX_BYTES_GUION_DE_MEDICION = 2420`; hoy 2.096 bytes con `https://medicion-sabiduria-de-bolsillo.sabiduriadebolsillo.workers.dev` (2.097 con barra final): sin subirlo no cabe lo nuevo (~350 bytes). Lo juzga también `src/pages/medicion/[version].js.ts` (para el build) y `GUIONES_EXTERNOS` en `src/lib/guiones.ts`.
- `src/pages/buscar.astro:68-180,291` -- la isla de la búsqueda, `<script is:inline set:html>` clásico al final del `<body>`: lee `q` de `location.search` (176) al analizarse, antes que el fichero diferido; hoy no escribe en el historial (lo hará la 23.8, desde sus escuchas). Es la única isla que lee la dirección (comprobado: ninguna otra de `src/islands`, `src/components`, `src/pages` ni `public/islas` lo hace).
- `src/components/Medicion.astro:35-36` -- el arranque en línea y `<script src defer>` del fichero en el `<head>`; no cambia.
- `tests/unit/ayuda/medicion.ts:92-113,126-204` -- el entorno simulado: `location` sin `hash` (hoy el fichero escribiría «undefined») y sin `history`. Necesita `hash`, `history` con `state` y `replaceState` que apunte la llamada y aplique la URL a `location`, y opciones para el estado previo y para un historial que lanza o que falta.
- `tests/unit/medicion.test.ts:345-361` -- «la marca de origen viaja con la vista y la lectura…»: se amplía a `via`. `378-394,438,742-750,766-772` -- lecturas comparadas con `toEqual({evento, ruta, origen})` y la lista de claves `['evento','origen','ruta']`: ganan `via: null`/`'via'` sin rebajar lo que afirman. `810-816`: «compone… desde sus módulos» (se amplía a los nombres de las marcas). `958-1081` -- `sitioMedido()` (con punto final y Pagefind), `paginasDe`, `RUTA_DEL_FICHERO`; `guionesEjecutables` de `tests/unit/ayuda/guion.ts:26` da los `<script>` de una página en su orden, con atributos y cuerpo: base de la prueba sobre `dist/`.
- `tests/unit/redes.test.ts:38-57` -- exige el literal `URLSearchParams(location.search)` y prohíbe `location.href`/`document.referrer` en el fichero; debe seguir en verde.
- `tests/unit/superficies.test.ts:580-604` -- las señales de WCAG leen el texto de `src/`, comentarios incluidos: ningún comentario nuevo de `src/` debe nombrar `touchmove`, `pointermove`, `position: fixed`, `popover`, etc.
- `tests/unit/vocabulario.test.ts:226-249,285-344,350-411` -- `PENDIENTES` (entrada 23.6: `via` en vistas y lectura), `producir`, `escenariosDe` (hoy solo `?de=` y destinos) y la correspondencia con `interpretar`.
- `tests/e2e/receptor.spec.ts:76-125,291-310,663-700,832-946` -- sitio propio con receptor Node (4399/4400), `esperarEvento`, `esperarAlFichero`, `apuntarBalizas`/`balizasDe`; las de la 8.2 con `?de=`; la 23.5 afirma en 699 las claves `['evento','origen','ruta']` de la lectura (gana `via`).
- `tests/e2e/origen.spec.ts` -- canónica idéntica con marca y sin ella (Historia 8.2), contra el `webServer` por omisión, que ya construye con punto final (`playwright.config.ts:50-58`): debe seguir en verde con las marcas quitadas.
- `tools/lib/canal.ts:83-91` -- `marcasDeOrigen` (quita el fragmento, `getAll`): se generaliza a cualquier parámetro. `201-252` -- `componerPublicacion` (marca de otra red en 229-243). `555-563` -- `CODIGOS_DE_SENAL`. `566-591` -- `SenalExterna` (`marcado`). `653-724` -- `componerSenal` (marcas de `?de=` en 686-701; `marcado` en 721). `837-851` -- `lineaDeSenal` («⚠ copia un enlace del Kit»).
- `tools/lib/corpus.ts:2522-2568` -- `CABECERA_DE_PUBLICACIONES` (códigos de `anotar`); `2796-2853` -- `CABECERA_DE_SENALES` (qué registra, `marcado`; los códigos los compone de la constante); `2863-2949` -- `analizarSenales` (`marcado` booleano en 2935); `2958-2971` -- `bloqueDeSenal`.
- `corpus/senales-externas.yml`, `corpus/publicaciones-de-canal.yml` -- solo su cabecera y la lista vacía, aquí y en la principal; `tests/unit/canal.test.ts:395-398,921-924` exige que sean exactamente su cabecera.
- `tools/canal.ts:1-41` -- docblock con los códigos de `anotar` y, literal, los de `senal`; la JSON de la consulta (`432-449`) reparte `EnlaceExterno`, así que `compartido` viaja solo.
- `tests/unit/canal.test.ts:177-247,493-650,705-816,817-904,905-995,996-1242,1303-1320` -- componer, la orden, señales, resumen, registro y las tres copias de los códigos.
- `AGENTS.md:37` (convención de la medición), `:329-367` (anotar; rechazos con 1 en 352), `:369-415` (señal; `marcado` en 385, códigos literales, «copia un enlace del Kit» en 411).
- `DESPLIEGUE.md:488-526` (§3, la lectura y `primera`), `528-560` (consultas a mano), `570-626` (SM-8).

## Tasks & Acceptance

**Execution:**
- `src/lib/medicion.ts` -- exportar los nombres de las dos marcas compuestos desde sus módulos y el texto de la función pura (ver Design Notes); `via` como fuente; `guionDeMedicion` según Boundaries (lectura única, `replaceState` condicional en `try`, olvido al emitir la lectura y en `pageshow` con `persisted`); docblocks y comentario de variables al día (las marcas, quién las quita, que solo la búsqueda escribe además en el historial) -- AD-13, FR-22, FR-56.
- `src/lib/umbrales.ts` -- tras implementar, medir el fichero con el punto final de producción y subir `MAX_BYTES_GUION_DE_MEDICION` a medida + ~400, con la medida y el porqué en su comentario -- un tope visible en el diff.
- `tests/unit/ayuda/medicion.ts` -- `location.hash` (opción `fragmento`, por omisión `''`); `history` con `state` (opción `estado`, por omisión `null`) y `replaceState(estado, titulo, url)` que apunta la llamada y aplica la URL a `location`; opción para un historial que lanza y otra sin `history`; devolver `historial()` (las llamadas) y `direccion()` (`pathname + search + hash`) -- el entorno que pide la historia.
- `tests/unit/medicion.test.ts` -- `describe('Historia 23.6 — …')`: una prueba por fila de guion de la matriz; la función pura evaluada en `node:vm` como función y llamada con los nombres compuestos (vacío, solo marcas, `?de=x&`, `?a=1&&de=x` → `?a=1&`, `?de` y `?de=` sin valor, resto literal con `%20` y `+`, nombres parecidos, `d%65`); que `replaceState` recibe **el mismo** `history.state` que había; y sobre `sitioMedido()`: en toda página que carga el fichero su `<script src>` está en el `<head>` antes de todo guion que escriba en el historial o la dirección; ningún guion salvo el fichero y la isla de `/buscar/` lo hace; ningún guion salvo el fichero lee `de` ni `via` (también `/islas/imagen.js` y Pagefind); entre los guiones propios (en línea e `islas/`) solo la isla de `/buscar/` lee la dirección. Los detectores componen `de`/`via` desde sus módulos y se comprueban contra el fichero (que sí escribe y sí lee), para no pasar en vacío. Ajustar las pruebas del Code Map que ganan `via` -- Vitest, que corre el CI.
- `tests/unit/vocabulario.test.ts` -- quitar la entrada 23.6 de `PENDIENTES`; `escenariosDe` gana `?via=` por cada destino de `DESTINOS_VALIDOS` y uno ajeno, `?via` repetido y `?de=…&via=…` juntos, con su valor esperado por campo -- la prueba de correspondencia de la 23.2.
- `tests/e2e/receptor.spec.ts` -- `describe('Historia 23.6 — …')`: llegada a la Cita con `?x=1&de=instagram&via=whatsapp#cita` y un `history.state` puesto antes (`addInitScript`): la dirección queda `?x=1#cita`, una sola petición de documento, `history.state` intacto, canónica y `og:url` iguales a las de la página sin marcas y sin `?`; la vista y la lectura (una tecla) llegan con `instagram` y `whatsapp`; recargar da una vista sin marcas y la misma dirección. `/buscar/?q=…&de=instagram` queda `/buscar/?q=…`, la búsqueda inicial corre y ningún evento lleva marca. Ajustar la lista de claves de la 23.5 -- Playwright local, que el CI no corre.
- `tools/lib/canal.ts` -- leer cualquier marca de lo tecleado con una sola función (sin fragmento, `getAll`); `componerPublicacion` y `componerSenal` según Boundaries; `compartido?: boolean` en `SenalExterna`, con su docblock; `lineaDeSenal` con «⚠ copia un enlace compartido» para la ajena con `compartido`; `CODIGOS_DE_SENAL` con la marca `?via=` (en una propia; en una ajena, de un destino que no existe o más de una) -- AD-13, FR-22.
- `tools/lib/corpus.ts` -- `analizarSenales` niega `compartido` no booleano como hace con `marcado`; `bloqueDeSenal` lo escribe tras `marcado`; `CABECERA_DE_SENALES` dice qué es `compartido`; `CABECERA_DE_PUBLICACIONES` nombra el enlace con `?via=` entre los rechazos con 1 -- un registro que se lee igual que se escribe.
- `corpus/senales-externas.yml`, `corpus/publicaciones-de-canal.yml` -- reescritos para ser exactamente la cabecera nueva con la lista vacía (solo comentarios; ninguna entrada) -- los fija `canal.test.ts`.
- `tools/canal.ts` -- docblock: el rechazo de `?via=` en `anotar` y los códigos de `senal` literales -- una sola redacción.
- `tests/unit/canal.test.ts` -- una prueba por fila de `tools/` de la matriz, en `componerPublicacion`/`componerSenal` y por `principal` (código y fichero sin tocar), la consulta con los dos avisos, el registro que escribe y relee `compartido`, y el que niega `compartido: "sí"` -- Vitest.
- `AGENTS.md` -- en la convención de la medición, una frase: las marcas las lee y las quita solo el fichero, con el `history.state` que había; ninguna isla las lee y solo la búsqueda escribe además en el historial. En el canal: el rechazo de `?via=` en `anotar`, `compartido` y su aviso en la señal, y los códigos literales.
- `DESPLIEGUE.md` -- en §3, un párrafo de las Marcas de llegada (se leen una vez, se quitan sin recargar, viajan con vistas y lectura y se olvidan en ella; sin fichero se quedan en la dirección; `via` nombra el botón, nunca a quien comparte ni a quien abre, NFR-11) y la consulta de difusión **sobre lecturas** con `via`, desde la primera jornada UTC completa tras la llegada de la 23; en SM-8, que sigue contando solo `origen` en vistas y que esta historia es una causa de su corte (antes, recargar o copiar la dirección volvía a contar la llegada), compuesto de la jornada de despliegue de la 23 que da la 23.11.

**Acceptance Criteria:**
- Given el sitio de `receptor.spec.ts` construido con punto final, when se llega a una Página de Cita con `?de=` y `?via=` válidos, then la barra muestra la dirección sin las dos marcas y con el resto y el fragmento, sin recarga ni cambio de canónica u `og:url`, y el receptor Node recibe la vista y la lectura con las dos; y when se recarga, then la vista nueva llega sin marcas.
- Given `npm run canal -- anotar …` o `senal … --tipo propia` con un enlace con `?via=`, when se ejecuta, then sale con 1 y el registro no cambia; given `senal … --tipo ajena` con `?via=whatsapp`, then sale con 0, la entrada lleva el destino recortado y `compartido: true`, y `npm run canal` la marca «copia un enlace compartido».
- Given la rama terminada, when corren `npx astro check` y por fichero `medicion`, `vocabulario`, `redes`, `comparticion`, `huella`, `receptor`, `canal`, `superficies`, `espinas-de-ux` y `kit-construido` de `tests/unit/`, then 0 errores y todo en verde, con `git diff 3dd8b508f3bf544a2c14f82907f2ff2e4075f831..HEAD -- src/lib/vocabulario.ts medicion/` vacío.
- Given `npm test` en segundo plano, when termina, then todo en verde.
- Given `npx playwright test tests/e2e/receptor.spec.ts --project=escritorio`, when corre, then pasa; y `origen`, `copiar`, `imagen`, `compartir-enlace`, `compartir-imagen`, `busqueda`, `pagina-de-cita` y `receptor-local` siguen en verde con el `webServer`.
- Given el fichero compuesto con el punto final de producción, when se mide, then cabe en el `MAX_BYTES_GUION_DE_MEDICION` nuevo, cuyo comentario dice la medida.

## Spec Change Log

## Review Triage Log

### 2026-10-25 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

Las capas de revisión de esta pasada son externas (blind-hunter, edge-case-hunter, verification-gap,
intent-alignment, ac-auditor) y no traían hallazgos todavía: la revisión independiente viene después.

## Design Notes

**La función pura viaja como texto.** El fichero es una cadena, así que la función tiene que ir dentro como texto; con `String(función)` el empaquetado del build puede renombrarla o reformatearla, y el fichero —y su versión, que sale del contenido— dejaría de ser el mismo que calcula Vitest (`medicion.test.ts` compara `dist/` con `guionDeMedicion(ENDPOINT)` byte a byte). Por eso se escribe una sola vez como texto de una expresión de función, con los nombres como argumento, y las pruebas la evalúan en `node:vm` y la llaman. Orientativo (nombres y compactación los fija el código):

```js
var R=function(s,n){var r=s.slice(1).split("&").filter(function(x){return!n.some(function(k){return new URLSearchParams(x).has(k)})}).join("&");return r?"?"+r:""};
// en a(), antes de las vistas:
var u=new URLSearchParams(location.search),x;o=u.get("de");w=u.get("via");
try{x=R(location.search,["de","via"]);x!=location.search&&history.replaceState(history.state,"",location.pathname+x+location.hash)}catch(y){}
// l(): …b("lectura"),o=w=null      pageshow persisted: o=w=null,n()
```

`URLSearchParams` sobre cada segmento decide «¿es esta una marca?» con el mismo analizador que la lee, así que lo que se quita es exactamente lo que se leyó (`d%65` incluido) y nada más.

**`via` en la vista y en la lectura, pero la difusión se cuenta en la lectura.** El vocabulario declara `via` en las dos y la historia pide que viaje con las dos; que una llegada con `?via=` cuente solo si se leyó es regla de lectura de la serie (consulta de `DESPLIEGUE.md`, informe de la 23.10), no del fichero.

**Orden en el documento.** El fichero va en el `<head>` con `defer`; la isla de `/buscar/` es un guion clásico al final del `<body>` que se ejecuta antes que él. Hoy no escribe en el historial; cuando la 23.8 lo haga, debe hacerlo desde sus escuchas (enviar, pulsar, ocultarse), nunca al analizarse, y siempre con la dirección que haya (ya sin marcas) y su propio `history.state`. La prueba sobre `dist/` fija el orden en el documento; esta nota es para la 23.8.

**`?via=` repetido en una ajena** sigue la regla vigente de `?de=` (`new Set(marcas).size > 1`): dos valores distintos se rechazan porque sus visitas se atribuirían a uno solo; el mismo valor dos veces no confunde a nadie.

## Verification

**Commands:**
- `npx astro check` -- expected: 0 errores.
- `npx vitest run tests/unit/medicion.test.ts`, y por fichero `vocabulario`, `redes`, `comparticion`, `huella`, `receptor`, `canal`, `superficies`, `espinas-de-ux`, `kit-construido` -- expected: verde.
- `npm test` en segundo plano con `correr.sh` -- expected: verde.
- `npx playwright test tests/e2e/receptor.spec.ts --project=escritorio`; con el `webServer`, `origen`, `copiar`, `imagen`, `compartir-enlace`, `compartir-imagen`, `busqueda`, `pagina-de-cita`, `receptor-local` en `escritorio` -- expected: verde (puertos 4321, 4399, 4400, 4402 y 8787 libres al terminar).
- `npx tsx -e` que importe `guionDeMedicion` y mida sus bytes UTF-8 con `https://medicion-sabiduria-de-bolsillo.sabiduriadebolsillo.workers.dev` -- expected: ≤ el tope nuevo, anotado en su comentario.

**Manual checks (if no CLI):**
- `git diff 3dd8b508f3bf544a2c14f82907f2ff2e4075f831..HEAD -- src/lib/vocabulario.ts medicion/` vacío; `ARRANQUE_DE_MEDICION` y `MAX_BYTES_DE_GUION` sin cambios; en `corpus/` solo cambian las cabeceras de los dos registros, que siguen con la lista vacía (commit con `git add` de esos dos ficheros, nunca de `corpus/_revision/`).

## Auto Run Result

Status: done
Blocking condition: ninguna.

**Qué se hizo.** El fichero de medición lee las dos Marcas de llegada **una vez**, en `a()` —tras
`prerenderingchange` si hace falta— y antes de emitir ninguna vista, de
`new URLSearchParams(location.search)`: `o` (origen) y `w` (difusión), la primera aparición de cada
una, cotejadas al emitir contra su conjunto por la tabla de `CAMPOS_DE_EVENTO` (fuente 4 nueva,
`via`). Luego, dentro de un `try`, compone la búsqueda sin marcas con la función pura
`SIN_MARCAS_DE_LLEGADA` —texto de una expresión de función, (búsqueda, nombres) → búsqueda— y, solo
si cambió, llama a `history.replaceState(history.state, '', location.pathname + nueva +
location.hash)`. Las marcas viajan con las vistas y la lectura (`m=[o,t,z,y,w]`), se olvidan al
emitir la lectura (`o=w=null` en `l`) y con `pageshow` `persisted`; nada vuelve a leer
`location.search`. Los nombres salen de `MARCAS_DE_LLEGADA = [PARAMETRO_DE_ORIGEN,
PARAMETRO_DE_DIFUSION]`, compuestos de `redes.ts` y del vocabulario; `medicion.ts` no escribe ninguno
(lo fija una prueba sobre sus literales). La función pura da a cada segmento un `&` delante antes de
preguntarle a `URLSearchParams`, para que un `?` inicial de segmento no se lea como el de la búsqueda
(`?a=1&?de=x` se queda: el lector tampoco lee ahí `de`). En `tools/`, `anotar` y `senal --tipo
propia` rechazan con 1 un enlace con `?via=` («marca de un visitante… no la de una cuenta propia»);
`senal --tipo ajena` lo coteja contra `DESTINOS_VALIDOS` con la regla de `?de=` y anota
`compartido: true`, y la consulta pinta «⚠ copia un enlace compartido». `marcasDeOrigen` pasó a
`marcasDe(dada, parametro)`, una función para las dos marcas.

**Ficheros.**
- `src/lib/medicion.ts` — `MARCAS_DE_LLEGADA`, `SIN_MARCAS_DE_LLEGADA`, fuente `via: 4`; el fichero
  lee, quita y olvida las marcas; docblocks y comentario de variables (`N`, `R`, `w`) al día.
- `src/lib/umbrales.ts` — `MAX_BYTES_GUION_DE_MEDICION` de 2.420 a 2.880: medido **2.482 bytes** con
  el punto final de producción (2.483 con barra final; 2.450 con el de las pruebas), +386 sobre la
  23.5, más unos 400 de margen; la medida y el porqué en su comentario.
- `tests/unit/ayuda/medicion.ts` — `location.hash` (`fragmento`), `history` con `state` (`estado`) y
  `replaceState` que apunta la llamada y aplica la URL sin recodificar; `historialQueLanza`,
  `sinHistorial`; `historial()` y `direccion()`.
- `tests/unit/medicion.test.ts` — `describe('Historia 23.6 — …')`: la función pura en `node:vm`
  (20 casos, con la comprobación de que lo quitado es exactamente lo que el lector lee) y una prueba
  por fila de guion de la matriz; `describe('Historia 23.6 — solo el fichero lee y quita las marcas,
  en `dist/`')` sobre `sitioMedido()`: el `<script src>` del fichero en el `<head>` antes de todo
  guion que escriba en el historial; ningún guion en línea escribe salvo la búsqueda; ninguno lee
  una marca, tampoco la Imagen ni Pagefind y su worker; entre los propios, solo la búsqueda lee la
  dirección; los detectores, comprobados contra el fichero. Las lecturas comparadas ganan `via`.
- `tests/unit/vocabulario.test.ts` — fuera la entrada 23.6 de `PENDIENTES`; `escenariosDe` con
  `?via=` por cada destino y uno ajeno, repetida (manda la primera) y junto a `?de=`.
- `tests/e2e/receptor.spec.ts` — `describe('Historia 23.6 — …')`: llegada con
  `?x=1&de=instagram&via=whatsapp#cita` y `history.state` previo (barra `?x=1#cita`, un solo
  documento, estado intacto, canónica y `og:url` como sin marcas; vista y lectura con las dos al
  receptor; recargar da una vista sin marcas) y `/buscar/?q=…&de=instagram`; la lista de claves de la
  23.5 gana `via`.
- `tools/lib/canal.ts` — `marcasDe`, `motivoDeDifusionPropia`, `?via=` en `componerPublicacion` y
  `componerSenal`, `compartido?` en `SenalExterna`, el aviso en `lineaDeSenal`, `CODIGOS_DE_SENAL`.
- `tools/lib/corpus.ts` — `analizarSenales` niega `compartido` no booleano; `bloqueDeSenal` lo escribe
  tras `marcado`; las dos cabeceras al día.
- `tools/canal.ts` — docblock (rechazo de `?via=` en `anotar`, códigos de `senal` literales) y uso.
- `corpus/senales-externas.yml`, `corpus/publicaciones-de-canal.yml` — exactamente la cabecera nueva
  con la lista vacía (solo comentarios; ninguna entrada, en la rama ni en la principal).
- `tests/unit/canal.test.ts` — `describe('Historia 23.6 — …')`: cada fila de `tools/` de la matriz en
  `componer*` y por `principal` (código y fichero sin tocar), la consulta con los dos avisos, el
  registro que escribe y relee `compartido`, el que niega `compartido: "sí"`, las cabeceras.
- `AGENTS.md` — la convención de la medición (solo el fichero lee y quita las marcas, con el
  `history.state` que había; ninguna isla las lee; solo la búsqueda escribirá además en el historial,
  desde la 23.8); el canal: `?via=` en `anotar`, `compartido` y su aviso en la señal, códigos literales.
- `DESPLIEGUE.md` — §3: las Marcas de llegada y la consulta de difusión sobre lecturas desde la
  primera jornada UTC completa tras la llegada de la 23; SM-8: sigue contando solo `origen` en vistas
  y la 23.6 es una causa de su corte, compuesto de la jornada de despliegue de la 23 (23.11).

**Discrepancia de la matriz, para la revisión.** La fila «Repetidas» escribe `?via=x&via=whatsapp →
via: null`, pero `x` es un destino del conjunto (`DESTINOS_DE_ENLACE`, el de X), y las filas de
`tools/` lo tratan como válido (`?via=x&via=x` se admite; `?de=instagram&via=x` da `compartido`).
Con la regla de los Boundaries —la primera aparición, cotejada contra `DESTINOS_VALIDOS`— y sin tocar
el vocabulario (Block If), esa entrada da `'x'`. Se implementó la regla y se prueba la intención de la
fila con un valor ajeno delante (`?via=lo-que-sea&via=whatsapp` → `null`; `?via=whatsapp&via=lo-que-sea`
→ `'whatsapp'`), y además el caso literal con su valor real (`?via=x&via=whatsapp` → `'x'`), comentado.

**Revisión.** Capas externas sin hallazgos en esta pasada: 0 parches, 0 diferidos, 0 rechazados.
Seguimiento recomendado: `false` (parcheados: 0 altos, 0 medios, 0 bajos; puntuación 0).

**Verificación.**
- `npx astro check` — 0 errores, 0 avisos (20 sugerencias previas). La primera pasada dio 1 error de
  tipo en el entorno simulado (`history.state` como `unknown`), corregido.
- `npx vitest run` de `medicion`, `vocabulario`, `redes`, `comparticion`, `huella`, `receptor`,
  `canal`, `superficies`, `espinas-de-ux` y `kit-construido` — 10 ficheros, 687 pruebas en verde.
- `npm test` (con `correr.sh`) — 131 ficheros, 5.712 pruebas en verde.
- `npx playwright test tests/e2e/receptor.spec.ts --project=escritorio` — 37 en verde, 1 saltada
  (la de prerender, como antes); las dos de la 23.6 pasan y la caché de atrás y adelante real restauró.
- Con el `webServer`, `origen`, `copiar`, `imagen`, `compartir-enlace`, `compartir-imagen`,
  `busqueda`, `pagina-de-cita` y `receptor-local` en `escritorio` — 114 en verde, 2 saltadas.
  Puertos 4321, 4399, 4400, 4402 y 8787 libres al terminar.
- `guionDeMedicion` medido con `npx tsx`: 2.482 bytes con
  `https://medicion-sabiduria-de-bolsillo.sabiduriadebolsillo.workers.dev` (≤ 2.880).
- `git diff 3dd8b508f3bf544a2c14f82907f2ff2e4075f831 -- src/lib/vocabulario.ts medicion/` vacío;
  `ARRANQUE_DE_MEDICION` y `MAX_BYTES_DE_GUION` sin cambios; en `corpus/` solo las cabeceras de los
  dos registros, con la lista vacía.

**Riesgos que quedan.**
- La difusión llega casi siempre nula hasta que la Épica 25 componga `?via=` en los botones.
- La isla de `/buscar/` lee `q` antes que el fichero (guion clásico al final del `<body>`); cuando la
  23.8 escriba en el historial, debe hacerlo desde sus escuchas y con la dirección ya sin marcas: la
  prueba sobre `dist/` fija solo el orden en el documento.
- Un `history.replaceState` que falla deja las marcas en la barra: esa carga se cuenta bien, pero
  recargarla las volvería a contar, como antes de la historia.
- Los detectores de `dist/` son textuales (cadena entre comillas, `?nombre=`, `location`, `history`):
  un guion que compusiera el nombre de una marca por piezas se les escaparía.

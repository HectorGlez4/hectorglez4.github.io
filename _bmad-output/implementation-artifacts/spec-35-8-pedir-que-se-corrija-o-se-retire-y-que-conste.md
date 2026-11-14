---
title: 'Historia 35.8 — Pedir que se corrija o se retire, y que conste'
type: 'feature'
created: '2026-11-14'
status: 'done'
baseline_revision: '1242122f79733819b403bf1afc7ea0660b1977e0'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-35-context.md'
warnings: ['oversized']
deferred:
  - summary: 'Cómo se dice la dirección «también como texto» [ASSUMPTION]: la UX no fija la forma. Va tras el enlace, entre paréntesis, en el mismo párrafo: «… <a>Pide que se corrija o se retire.</a> (buzón)». Si debe ser otra (p. ej. «Escribe a …»), lo decide Héctor (bmad-ux).'
    evidence: 'DESIGN.md «Línea de retirada»; EXPERIENCE.md tabla de textos; AD-35 («y la dirección también como texto»).'
  - summary: 'El asunto del correo [ASSUMPTION]: «Corregir o retirar la cita {slug}» en la Página de Cita y «Corregir o retirar citas del personaje {slug}» en la de Personaje, codificado con encodeURIComponent. La historia solo exige `?subject=` con el slug. Si el texto debe ser otro, lo decide Héctor (bmad-ux).'
    evidence: 'epics.md Story 35.8, primer AC; UX-DR139.'
  - summary: 'WCAG 3.2.6 pasa de «no-aplica» a «ux» en `CRITERIOS_QUE_AÑADE_WCAG_22`: la línea de retirada es un mecanismo de ayuda (un correo con destinatario) y la historia la pone en la misma posición relativa por 3.2.6. `EXPERIENCE.md` («Accessibility Floor», l. 596) sigue diciendo que 3.2.6 no aplica: pendiente de Héctor (bmad-ux).'
    evidence: 'src/lib/superficies.ts CRITERIOS_QUE_AÑADE_WCAG_22; tests/unit/superficies.test.ts SEÑALES_QUE_DESMIENTEN (3.2.6); EXPERIENCE.md:596.'
  - summary: 'El `id` de la petición [ASSUMPTION]: un entero correlativo (el mayor del registro más uno), que es lo que teclea `resolver <id>`. AD-35 no fija su forma.'
    evidence: 'ARCHITECTURE-SPINE.md AD-35, primera cláusula.'
  - summary: 'Qué es «saltar» en SM-C6 [ASSUMPTION; el PRD ya lo marca así]: en dos meses seguidos con al menos `MIN_ATRIBUIDAS_PARA_JUZGAR_SM_C6` atribuidas publicadas al cierre de cada uno, (a) las peticiones por cada cien del segundo superan las del primero, o (b) la proporción mal atribuida de la auditoría pasa de `MAX_PROPORCION_MAL_ATRIBUIDA_SM_C6` en los dos. «Reclamaciones» son las peticiones (corregir y retirar); las retiradas por cada cien se informan y no juzgan. Una sola función lo decide (`juicioDeSmC6`). Si la regla es otra, lo decide Héctor (bmad-prd).'
    evidence: 'prd.md SM-C6 (l. 1676); epics.md Story 35.8, AC de SM-C6.'
  - summary: 'Las atribuidas publicadas al cierre de un mes [ASSUMPTION]: sin leer el historial de git, se derivan de los registros: las entradas `atribuida` de `clases-de-cita.yml` con fecha ≤ fin de mes, menos las que tienen en `formas-vedadas.yml` una entrada con su slug (`retirada` o `cambio-de-clase`) con fecha ≤ fin de mes y no están publicadas hoy. Una Cita devuelta a mano tras retirarse cuenta como publicada en los meses de en medio. De ahí salen la muestra y el denominador de las tasas.'
    evidence: 'AD-32 (registro de clases y formas vedadas, «ninguna puerta lee el historial de git»).'
  - summary: 'Cuándo una petición cuenta como retirada en SM-C6 [ASSUMPTION]: la de un titular de derechos que pide retirar, en el mes de la petición (se retira en el mismo gesto, aunque después se resuelva rechazada); cualquier otra, en el mes de su resolución `retirada`.'
    evidence: 'epics.md Story 35.8, AC «una petición de retirar».'
  - summary: 'La auditoría exige un resultado para cada slug de la muestra y solo de un mes cerrado [ASSUMPTION]; una segunda auditoría del mismo mes se anota (solo añade) con aviso, y la consulta toma la última. `sin-fuente` no cuenta como mal atribuida en la proporción.'
    evidence: 'AD-32, última cláusula; epics.md Story 35.8.'
  - summary: >-
      El `mailto:` lleva solo `?subject=`; un `body` prerrellenado que pidiera quién escribe (persona
      afectada, titular de derechos u otro), qué pide (corregir o retirar) y por qué ahorraría adivinar
      el `--solicitante` al anotar, y ese dato decide si la Cita se retira en el mismo gesto. Lo que dice
      el cuerpo es redacción de UX: pendiente de Héctor (bmad-ux).
    evidence: |-
      Hallazgo blind-hunter de la revisión 1 de la 35.8. EXPERIENCE.md y UX-DR139 fijan solo el asunto;
      la historia no pide cuerpo. src/lib/atribucion.ts lineaDeRetirada.
    location: >-
      src/lib/atribucion.ts lineaDeRetirada
    severity: low
---

<intent-contract>

## Intent

**Problem:** Nada deja pedir que una Cita atribuida se corrija o se retire, ni anota esas peticiones: la puerta de la atribuida exige `BUZON_DE_PETICIONES` pero ninguna página pinta el canal, no hay registro que cuente lo pedido y SM-C6 no tiene de dónde medirse.

**Approach:** Un componente `LineaDeRetirada.astro` pinta el `mailto:` al pie de la Página de Cita atribuida y de toda página de Personaje; `npm run peticion` anota peticiones y resoluciones en `corpus/peticiones-de-retirada.yml`, retira por petición (mueve a `_revision/` y veda la forma, sin negarse por NFR-5), consulta por mes con su plazo, y audita SM-C6 con su muestra sin mano en `corpus/auditorias-de-atribuidas.yml`. Todo con la puerta cerrada: con el Corpus real, `dist/` no cambia.

## Boundaries & Constraints

**Always:**
- La línea: solo en `/cita/{slug}/` de una atribuida (`esAtribuida`) y en toda `/personaje/{slug}/` (1 y 2+). Cita: tras `RutasDeSalida`, último elemento visible de `<article>` (solo la sigue `FiltrosDeLaCita`, oculto), también sin Rutas de salida. Personaje: tras `<Paginacion>`, dentro de `.pagina`. Textos exactos: «¿Esta cita está mal atribuida o te afecta? » / «¿Alguna cita de esta página está mal atribuida o te afecta? » + enlace «Pide que se corrija o se retire.» + « (buzón)». Enlace `mailto:{buzón}?subject={codificado}`, misma pestaña (sin `target`), siena por la regla `a` de `tokens.css`, sin relleno de zona de toque (a mitad de frase, exento por UX-DR145). `<p>` con `data-pagefind-ignore="all"`, sin `data-zona`, sin guion, sin filete, a `calc(var(--unidad) * 5)`, `--pie`/`--interlineado-pie`/`--tinta-apagada`/`--sans`/`--peso-regular`, `max-width: var(--medida-prosa)`.
- Presentación en atributo `style` (precedente `Variante.astro`, `Sostener.astro`): un `<style>` de componente se emitiría en toda Página de Cita y cambiaría `dist/`.
- La composición (textos, asunto, `href`) la hace una función pura de `src/lib/atribucion.ts`, que **lanza** si el buzón es `undefined` o en blanco; el componente le pasa `BUZON_DE_PETICIONES` de `src/lib/dominio.ts` (atribucion.ts no importa dominio.ts: lo usan islas del cliente).
- Registros nuevos `corpus/peticiones-de-retirada.yml` (`entradas:`) y `corpus/auditorias-de-atribuidas.yml` (`auditorias:`), con cabecera y lista vacía; solo añaden por `appendFile` con validación previa y relectura (reutilizar `añadirAlRegistro` de `tools/lib/corpus.ts`, exportándolo); su «solo añade» frente a `HEAD^1` lo comprueba `npm test` como en `formas-vedadas.test.ts`; no son familia de fichero (no fechan ni avisan); ningún fichero de `src/` los nombra (AD-24).
- Entradas: `- peticion: {id, fecha, cita, solicitante, peticion, motivo?}` y `- resolucion: {peticion, fecha, resolucion}`; auditoría `{mes, muestra, resultados, auditadoEl}` con `resultados` un mapa slug → `bien|mal-atribuida|sin-fuente`. Conjuntos cerrados con nombre en `tools/lib/peticiones.ts`.
- Códigos: 2 por la forma de la invocación (suborden desconocida, bandera desconocida o repetida, argumentos de menos o de más, fecha o mes sin forma, motivo vacío, valor fuera del conjunto cerrado de `--solicitante`/`--peticion`/resolución/resultado, `--resultado` sin forma `slug=valor`); 1 por lo que dice (fecha futura, registro o Corpus ilegible, Cita desconocida o de siempre, motivo con correo o teléfono, id inexistente o ya resuelto, resolución anterior a su petición, mes sin cerrar, resultado de un slug fuera de la muestra o muestra incompleta, muestra sin valor con `--resultado`). En 1 y 2 no escribe nada.
- Retirar por petición (titular + `retirar` al anotar; o `resolver <id> retirada` si la Cita sigue publicada): valida y lee todo antes de escribir; mueve con `mover` a `rutas.revision`, anota `entradaVedada(texto, 'retirada', fecha, slug)`, pone al día títulos con `ajustarTitulosDeObra`, y **después** añade la entrada al registro de peticiones; si falla la forma vedada, devuelve la Cita; si falla la petición, devuelve la Cita y lo dice (la forma vedada con su slug no veda a esa Cita). Informa de lo que `fueraDeAlcanceTras` dejaría fuera (ruta, Tema y recuento) sin negarse, y si no se puede componer el modelo, lo dice y sigue. El parte dice que el fichero se añade a mano con `git add <ruta en _revision>` y que su texto sigue en el historial de git (pregunta 25).
- La Cita se valida contra lo publicado o el registro de clases: vale si alguna entrada del registro la da `atribuida` o si está publicada y `esAtribuida`.
- Consulta (`npm run peticion` a secas, `--json` opcional): peticiones por mes (AAAA-MM de su fecha) con Cita, solicitante, petición y resolución o «sin resolver»; con `PLAZO_DE_RESPUESTA_A_RETIRADA_DIAS`, nombra las sin resolver con más días que el plazo desde su fecha; sin valor, lo dice y no juzga. Bloque SM-C6 por mes: atribuidas al cierre, peticiones y retiradas por cada cien (sin atribuidas, «sin tasa», nunca 0 %), proporción mal atribuida de su auditoría; juicio solo con las dos constantes, y por debajo del mínimo dice que no juzga; nunca propone el freno. No escribe, no hace red.
- Muestra: las `MUESTRA_DE_AUDITORIA_SM_C6` atribuidas al cierre del mes con menor SHA-256 hex de `` `${slug}|${mes}` `` (todas si hay menos); sin valor, lo dice y no elige.
- `src/lib/umbrales.ts` gana, en `undefined` y con comentario «lo fija Héctor»: `PLAZO_DE_RESPUESTA_A_RETIRADA_DIAS`, `MUESTRA_DE_AUDITORIA_SM_C6`, `MIN_ATRIBUIDAS_PARA_JUZGAR_SM_C6`, `MAX_PROPORCION_MAL_ATRIBUIDA_SM_C6` (literales: el filtro de Directorios importa el módulo). Las funciones puras los reciben por parámetro con esos valores por omisión; las pruebas nunca fijan el valor del árbol.

**Block If:**
- Construir el sitio con el Corpus real en la base y en la rama da cualquier diferencia en `dist/` (salvo `pagefind/`) que no se pueda atribuir a la jornada.

**Never:**
- Dar valor a `BUZON_DE_PETICIONES` ni a las cuatro constantes nuevas; anotar peticiones o auditorías en los ficheros del árbol; editar `_bmad-output/planning-artifacts/` o `_bmad-output/specs/`; tocar `src/lib/vocabulario.ts` (ninguna zona ni evento nuevos); `target="_blank"` en el enlace; leer el historial de git en la orden; proponer bajar topes o parar la siembra.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Anotar corregir | `anotar buzz-x --solicitante otro --peticion corregir --motivo "la frase es de otro"` | Entrada `peticion` id 1, fecha hoy; exit 0 | — |
| Titular retira | `anotar buzz-x --solicitante titular-de-derechos --peticion retirar` con la Cita publicada | Cita en `_revision/`, forma `retirada` en `formas-vedadas.yml`, petición anotada sin resolución; parte con `git add` y la pregunta 25, y lo que quedaría fuera de alcance | Forma vedada ilegible → 1 sin mover |
| Motivo con contacto | `--motivo "escríbeme a ana@x.org"`, `"+34 600 11 22 33"`, `"tel. 600112233"`, `"(91) 555-1234"` | No escribe | exit 1 |
| Cita de siempre | slug de una Cita sin `clase` y entrada `siempre` | No escribe | exit 1 «no es atribuida» |
| Cita ya retirada | slug solo en el registro de clases como `atribuida` | Se anota (y `resolver … retirada` solo registra) | — |
| Forma | bandera desconocida, `--fecha 2026-13-01`, `--motivo ""`, `--solicitante jefe` | No escribe | exit 2 |
| Fecha futura | `--fecha` mañana | No escribe | exit 1 |
| Resolver retirada | petición `otro`+`retirar`, Cita publicada | Retira como el titular y anota la `resolucion` | id inexistente o ya resuelto → 1 |
| Rechazar tras retirar | `resolver 1 rechazada` sobre una retirada primero | Anota; la Cita sigue en `_revision/` y el parte dice que devolverla es moverla a mano | — |
| Plazo sin valor | consulta con `PLAZO_…` `undefined` | Lista y dice que no juzga plazo | — |
| Muestra | `muestraDeAuditoria(['a','b','c'], '2026-10', 2)` | Misma en dos llamadas; otra con `'2026-11'` puede diferir | — |
| Auditar | `auditar 2026-10 --resultado a=bien --resultado b=mal-atribuida` con muestra `{a,b}` | Entrada en `auditorias-de-atribuidas.yml` | slug ajeno, incompleta o muestra sin valor → 1 |

</intent-contract>

## Code Map

- `src/lib/dominio.ts:64` `BUZON_DE_PETICIONES` -- la lee el componente; su comentario dice ya «la línea llega con la 35.8» (ponerlo en presente).
- `src/lib/atribucion.ts` -- añadir `lineaDeRetirada({ sobre: 'cita' | 'personaje', slug }, buzon)` → `{ pregunta, enlace, href, direccion }`; lanza sin buzón. Composición de textos de la Página de Cita vive aquí (precedente `lineaDeVariante`).
- `src/components/Variante.astro` -- modelo exacto de presentación en `style` con tokens. `src/components/AtribucionDeSemblanza.astro` -- enlace de salida en un `<p>` de pie.
- `src/pages/cita/[slug].astro:231-237` -- insertar `{esAtribuida(cita) && <LineaDeRetirada sobre="cita" slug={cita.slug} />}` entre `<RutasDeSalida>` y `<FiltrosDeLaCita>` (importar `esAtribuida` de `src/lib/clase.ts`).
- `src/pages/personaje/[slug]/[...page].astro:146` -- `<LineaDeRetirada sobre="personaje" slug={personaje.slug} />` tras `<Paginacion>`.
- `src/styles/tokens.css:203` `a { color: var(--siena) }`; tokens `--pie`, `--interlineado-pie`, `--tinta-apagada`, `--unidad`, `--medida-prosa`.
- `src/lib/superficies.ts:943-949` -- 3.2.6 pasa a `comprueba: 'ux'` con motivo «el único mecanismo de ayuda es la línea de retirada (Historia 35.8), un solo componente al pie de la Página de Cita atribuida y de la de Personaje». `tests/unit/superficies.test.ts:674-680` (reparto esperado), `:618-631` `REVISADO_SIN_DESMENTIR` (añadir la línea exacta de `atribucion.ts` que compone `mailto:${…}` con criterio 3.2.6 y su porqué), `:756` (la muestra «no-aplica» pasa a «ux»).
- `src/lib/umbrales.ts:1465` -- añadir las cuatro constantes al final, tras la puerta de la atribuida.
- `tools/lib/corpus.ts:140-182,184-406` -- `FICHERO_DE_PETICIONES_DE_RETIRADA`, `FICHERO_DE_AUDITORIAS`, `Rutas.peticionesDeRetirada`, `Rutas.auditoriasDeAtribuidas`; `:2916` `añadirAlRegistro` (exportar); `:1116` `mover`; `:755` `leerCitas`; `:1469` `fechaLocal`; `:3766` `leerRegistroDeClases`.
- `tools/lib/formasVedadas.ts` -- `entradaVedada`, `registrarFormasVedadas`, `leerFormasVedadas`; actualizar la cabecera y el comentario de quién escribe (`npm run peticion`). **Ojo:** la cabecera del fichero del árbol es inmutable (solo añade): no cambiar `CABECERA_DE_FORMAS_VEDADAS`; solo el comentario del módulo.
- `tools/lib/documentacion.ts:829-967` `retirarCita` -- modelo de mover/vedar/devolver y del parte; `localizarPublicada` (l.134) se niega ante una atribuida, así que no se reutiliza.
- `tools/lib/alcance.ts:405-497` -- `fueraDeAlcanceTras`, `CitaFueraDeAlcance`; exportar `lineaDeTemas` (l.313) para el informe sin negativa.
- `tools/lib/obras.ts:1088` `ajustarTitulosDeObra(rutas, {autor, personaje}, formas)`; `src/lib/obras.ts` `formaDeObra`.
- `tools/canal.ts` + `tools/lib/cli.ts` (`posicionales`, `opcion`, `motivosDeArgumentosNoReconocidos`, `raizDeCorpusDe`) -- modelo de la orden: `principal(argumentos, ahora)` devuelve el código; repetidas → 2; `uso()`.
- `src/lib/clase.ts:45` `esAtribuida`; `src/lib/citaDelDia.ts` `esJornada`.
- `package.json:38` -- añadir `"peticion": "tsx tools/peticion.ts"`.
- Pruebas modelo: `tests/unit/canal.test.ts` (CLI, cabecera, AD-24), `tests/unit/formas-vedadas.test.ts:300-334` (fichero del árbol, `HEAD^1`, no familia), `tests/unit/documentacion.test.ts:593` (retirar). Builds con la puerta abierta: `tests/unit/personaje-donde-el-autor.test.ts` (atribuidas con y sin Personaje, una de siempre S1, Autor, Obra, Personaje Batman) y `tests/unit/pagina-de-personaje.test.ts` (Personaje A con página 2). Andamios: `tests/unit/ayuda/construir.ts` (`citaValida`, `ATESTIGUADA`, `conLaPuertaAbierta`, `PUERTA_DE_PRUEBA.BUZON_DE_PETICIONES = 'peticiones@ejemplo.org'`), `tests/unit/ayuda/relleno.ts` (`sembrarTemaPublicado`).

## Tasks & Acceptance

**Execution:**
- `src/lib/atribucion.ts` -- `lineaDeRetirada` pura, que lanza sin buzón -- un solo dueño de la redacción.
- `src/components/LineaDeRetirada.astro` -- NUEVO: props `sobre`, `slug`; llama a `lineaDeRetirada(…, BUZON_DE_PETICIONES)`; `<p data-pagefind-ignore="all" style=…>{pregunta}<a href={href}>{enlace}</a> ({direccion})</p>` -- el canal sin guion ni zona.
- `src/pages/cita/[slug].astro`, `src/pages/personaje/[slug]/[...page].astro` -- colocar la línea como dice Always.
- `src/lib/dominio.ts` -- comentario al día.
- `src/lib/superficies.ts`, `tests/unit/superficies.test.ts` -- reclasificar 3.2.6 y revisar la señal.
- `src/lib/umbrales.ts` -- las cuatro constantes en `undefined`.
- `tools/lib/corpus.ts` -- ficheros, rutas, exportar `añadirAlRegistro`. `tools/lib/alcance.ts` -- exportar `lineaDeTemas`.
- `tools/lib/peticiones.ts` -- NUEVO: conjuntos `SOLICITANTES`, `PETICIONES`, `RESOLUCIONES`, `RESULTADOS_DE_AUDITORIA`; cabeceras; `leer…`/`registrar…` de los dos registros; `tieneContacto(texto)`; `validarCitaDePeticion`; `retirarPorPeticion(rutas, slug, fecha)`; `atribuidasAlCierre(mes, clases, vedadas, publicadasHoy)`; `muestraDeAuditoria(slugs, mes, n)` (SHA-256 de `node:crypto`); `resumenPorMes`, `vencidas(…, plazo, hoy)`, `juicioDeSmC6(meses, {min, max})`; líneas del informe.
- `tools/peticion.ts` -- NUEVO: la orden con `anotar`, `resolver`, `auditar` y la consulta, `--corpus`, `--json`, `--ayuda`.
- `corpus/peticiones-de-retirada.yml`, `corpus/auditorias-de-atribuidas.yml` -- NUEVOS: cabecera (qué registra, solo añade, quién escribe, que ningún campo admite contacto, que ningún agente anota lo que no ha recibido o visto, AD-24, no fecha ni avisa) y lista vacía; iguales a las constantes de cabecera.
- `package.json` -- script `peticion`.
- `tests/unit/peticiones.test.ts` -- NUEVO: la matriz entera (CLI sobre un corpus temporal con `principal`), contacto con varias formas de correo y teléfono (y textos inocentes con cifras cortas o años), muestra estable y que cambia con el mes, plazo con y sin valor (por parámetro), juicio de SM-C6 (sin constantes, bajo el mínimo, subida, proporción), retirada por petición con NFR-5 informado sin negarse, ficheros del árbol (cabecera, vacíos, `HEAD^1`, no familia), AD-24 (ningún fichero de `src/` nombra los registros ni `tools/lib/peticiones`).
- `tests/unit/personaje-donde-el-autor.test.ts` -- `describe('35.8 …')` sobre su `dist/`: la línea (por su texto y su `href` `mailto:peticiones@ejemplo.org?subject=…`) en toda Página de Cita atribuida y en la de Personaje, y en ninguna otra página HTML del `dist/`; en la Cita, tras el `nav` de Rutas de salida y antes del `div[hidden]` de filtros, sin `data-zona` ni `target`, bajo `data-pagefind-ignore="all"`.
- `tests/unit/pagina-de-personaje.test.ts` -- la línea en `/personaje/a/` y `/personaje/a/2/`, tras la paginación.
- `tests/unit/atribucion.test.ts` -- `lineaDeRetirada`: textos, asunto codificado, lanza con `undefined` y con blanco.
- `AGENTS.md` -- sección «Corregir o retirar una Cita atribuida»: la línea y dónde va, la orden y sus subórdenes, el registro, la regla sin contacto, la retirada por petición sin NFR-5 y el `git add` a mano, la consulta y su plazo, la auditoría de SM-C6 y que ningún agente anota lo que no ha visto ni da valor a las constantes.

**Acceptance Criteria:**
- Given el Corpus real y `FECHA_JORNADA` fija, when se construye en la base y en la rama, then `diff -r` de `dist/` (sin `pagefind/`) no da diferencias.
- Given un sitio construido con la puerta abierta, when se recorre `dist/`, then la línea está en toda Página de Cita atribuida y toda página de Personaje (también la 2) y en ninguna otra.
- Given `BUZON_DE_PETICIONES` sin valor, when se compone la línea, then `lineaDeRetirada` lanza nombrando la constante.
- Given `npm run peticion` a secas sobre el árbol, when corre, then sale 0, no escribe y dice que no hay peticiones ni juzga plazo ni SM-C6 por falta de valores.

## Spec Change Log

## Review Triage Log

### 2026-11-14 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

Las cinco capas son externas y esta pasada no trae sus hallazgos: sin hallazgos que triar.

### 2026-11-14 — Review pass 2 (revisión 1 del bucle, con los hallazgos de las cinco capas)
- intent_gap: 0
- bad_spec: 0
- patch: 19
- defer: 1
- reject: 22
- addressed_findings:
  - '[medium] [patch] blind-hunter: atribuidasAlCierre recibía todas las Citas publicadas; una atribuida que pasó a siempre seguía contando y podía entrar en la muestra. Ahora `consultar` y `auditar` le pasan solo las atribuidas publicadas (`esAtribuida`).'
  - '[medium] [patch] blind-hunter + edge-case-hunter: una retirada contaba en SM-C6 sin haber movido nada (titular sobre una Cita ya ida, segunda petición del titular, `resolver … retirada` sobre una no publicada o ya no atribuida). `mesesDeLasRetiradas` cuenta solo el gesto que dejó su forma vedada `retirada` con el slug y la fecha del gesto, una vez por Cita.'
  - '[low] [patch] edge-case-hunter: `resolver … retirada` sobre una Cita publicada que ya no es atribuida decía «ya no estaba publicada»; ahora lo dice como es.'
  - '[medium] [patch] blind-hunter + edge-case-hunter + verification-gap: el deshacer tras no poder anotar la petición no devolvía el título de la Ficha de Obra. `retirarPorPeticion` guarda las Fichas antes de `ajustarTitulosDeObra` y su `devolver` mueve la Cita de vuelta y restituye las que cambiaron; el parte lo dice.'
  - '[low] [patch] blind-hunter + edge-case-hunter: `analizarPeticiones` juzga las relaciones: una resolución sigue a su petición en la lista y no la antecede en fecha (la entrada suelta que se va a añadir se juzga sin ellas).'
  - '[low] [patch] blind-hunter + edge-case-hunter: una fecha ISO, una fecha con puntos o unos años separados por espacio ya no son un teléfono.'
  - '[medium] [patch] blind-hunter: `tieneContacto` rechaza también un usuario de red social («@ana_perez») y la palabra «arroba». Las URL no, porque un motivo puede citar la fuente.'
  - '[low] [patch] blind-hunter: `anotar` rechaza con 1 una fecha anterior a la primera entrada `atribuida` de la Cita en el registro de clases.'
  - '[low] [patch] blind-hunter: anotar lo mismo el mismo día (Cita, solicitante, petición) se admite con un aviso, como en `canal`.'
  - '[low] [patch] blind-hunter: `juicioDeSmC6` distingue `sin-pareja` (no hay dos meses cerrados seguidos) de `bajo-minimo`, y la consulta dice cuál.'
  - '[low] [patch] blind-hunter: la consulta da las sin fuente de la auditoría junto a la proporción.'
  - '[low] [patch] blind-hunter: `auditar --json` sin valor de la muestra responde en JSON.'
  - '[low] [patch] blind-hunter + edge-case-hunter: `problemasDeLasConstantes` rechaza con 1 una constante con valor imposible (plazo negativo o no entero, muestra o mínimo no enteros positivos, proporción fuera de 0–1).'
  - '[medium] [patch] blind-hunter + edge-case-hunter: `lineaDeRetirada` lanza también con un buzón que no es una dirección de correo.'
  - '[low] [patch] blind-hunter: la prueba de `dist/` «y en ninguna otra» lee cada fichero HTML enumerado y no se salta ninguno.'
  - '[low] [patch] verification-gap: `mesesDeSmC6` con auditorías (la última del mes, mal atribuidas, sin fuente, proporción) y la consulta con una auditoría anotada.'
  - '[medium] [patch] verification-gap: el deshacer tras un registro que se lee pero no admite la entrada: exit 1, la Cita de vuelta, nada en `_revision/`, la Ficha y el registro como estaban.'
  - '[low] [patch] verification-gap: la retirada por petición de una atribuida con Obra pone al día el título de su Ficha y lo dice.'
  - '[low] [patch] ac-auditor: la consulta con una petición resuelta («rechazada el …») y que nunca propone el freno.'

Diferido: el cuerpo prerrellenado del `mailto:` (blind-hunter), redacción de UX de Héctor (bmad-ux).

Rechazados: `ajustarTitulosDeObra` sin guarda (no lanza: devuelve el fallo como línea); `entradaVedada` indefinida (solo con texto vacío, imposible en una Cita publicada); que la resolución case con lo pedido (decidir `retirada` ante una petición de corregir es legítimo); la tolerancia del salto de SM-C6, el denominador con `sin-fuente` y la Cita retirada dos veces en las atribuidas al cierre (supuestos ya diferidos a Héctor); la muestra recalculada (la auditoría guarda su muestra y la consulta lee la guardada); la dirección visible a los recolectores (AD-35 la exige como texto); la fragilidad de la aserción de orden (falla en voz alta); la contabilidad del spec de la pasada 1 (esta pasada la corrige); WCAG 3.2.6 (ya diferido); `import.meta.url` (patrón de todas las órdenes de `tools/`, la ruta del repositorio es ASCII); la relectura del Corpus en `retirarPorPeticion` (rendimiento, orden de una persona); una Cita de siempre publicada con una entrada `atribuida` vieja (el contrato admite «alguna entrada del registro»); las lecturas defendibles de intent-alignment (el diff toma las que fijan el contrato y los supuestos diferidos; ninguna contradice la épica); y del ac-auditor la Cita sin Rutas de salida, la parada de construcción sin buzón, los tokens de la línea, NFR-5 de punta a punta, «dist/ no cambia» como prueba y la e2e (la línea es incondicional tras las Rutas; la puerta de la 35.1b para antes; `tipografia-en-tokens` vigila los literales; el informe puro está probado; la verificación de `dist/` es manual por el contrato; la e2e es de Héctor).

## Design Notes

El orden de la retirada por petición pone la petición al final a propósito: si no se pudo retirar, no queda anotado que se retiró; si la petición no se pudo anotar, la Cita vuelve, y la forma vedada que queda lleva su slug, que no veda a esa misma Cita (`vedanALaAtribuida`). La forma vedada se escribe antes que la petición porque es lo que impide que la retirada vuelva como otra atribuida.

Contacto, dos señales: correo `/[^\s@]+@[^\s@]+\.[^\s@]+/u`; teléfono, siete cifras o más contando separadores (`+`, espacios, `.`, `-`, paréntesis) dentro de una misma secuencia, p. ej. `/\+?\(?\d[\d\s().-]{5,}\d/u` con al menos 7 dígitos en el tramo. Un año («1984») o «capítulo 12» no es teléfono.

## Verification

**Commands:**
- `npx vitest run tests/unit/peticiones.test.ts tests/unit/superficies.test.ts tests/unit/formas-vedadas.test.ts` -- expected: verde.
- `npx vitest run tests/unit/personaje-donde-el-autor.test.ts tests/unit/pagina-de-personaje.test.ts tests/unit/medicion.test.ts tests/unit/tipografia-en-tokens.test.ts` -- expected: verde.
- `npx vitest run tests/unit/atribucion.test.ts` -- expected: verde.
- `npx astro check` -- expected: 0 errores.
- `FECHA_JORNADA=2026-11-14 npm run build` en la base (worktree desacoplado en `.claude/v9-ralph/tmp-wt/`) y en la rama, `diff -r -x pagefind dist-base dist` -- expected: sin diferencias.
- `npm run peticion` en el árbol -- expected: exit 0, nada escrito (`git status` limpio).
- `npm test` (desacoplado con `correr.sh`) -- expected: verde.

## Auto Run Result

Status: done

**Resumen.** La línea de retirada (`LineaDeRetirada.astro`, redacción en `lineaDeRetirada` de `src/lib/atribucion.ts`, que para la construcción sin `BUZON_DE_PETICIONES`) al pie de toda Página de Cita atribuida y de toda página de Personaje; `npm run peticion` (`tools/peticion.ts`, lógica en `tools/lib/peticiones.ts`) con `anotar`, `resolver`, `auditar` y la consulta; los registros `corpus/peticiones-de-retirada.yml` y `corpus/auditorias-de-atribuidas.yml`, que solo añaden; la retirada por petición, que no se niega por NFR-5; las cuatro constantes de SM-C6 y el plazo en `undefined`; WCAG 3.2.6 reclasificado a `ux`; sección de `AGENTS.md`.

**Ficheros.**
- `src/components/LineaDeRetirada.astro` — nuevo: el canal `mailto:`, sin guion ni zona, con la presentación en `style`.
- `src/lib/atribucion.ts` — `lineaDeRetirada` (textos, asunto codificado, lanza sin buzón).
- `src/pages/cita/[slug].astro` — la línea tras las Rutas de salida en la atribuida; su importación, la última (en medio reordenaba el CSS de los Desplegables en las 4.424 Páginas de Cita).
- `src/pages/personaje/[slug]/[...page].astro` — la línea tras la paginación, en toda página.
- `src/lib/dominio.ts` — comentario de `BUZON_DE_PETICIONES` al día.
- `src/lib/superficies.ts`, `tests/unit/superficies.test.ts` — 3.2.6 pasa a `ux`; la composición del `mailto:` queda revisada en `REVISADO_SIN_DESMENTIR`.
- `src/lib/umbrales.ts` — `PLAZO_DE_RESPUESTA_A_RETIRADA_DIAS`, `MUESTRA_DE_AUDITORIA_SM_C6`, `MIN_ATRIBUIDAS_PARA_JUZGAR_SM_C6`, `MAX_PROPORCION_MAL_ATRIBUIDA_SM_C6`, en `undefined`.
- `tools/lib/corpus.ts` — ficheros y rutas de los dos registros; `añadirAlRegistro` exportado.
- `tools/lib/alcance.ts` — `lineaDeTemas` exportada.
- `tools/lib/formasVedadas.ts` — comentario: la retirada por petición también escribe (la cabecera del fichero no cambia).
- `tools/lib/peticiones.ts`, `tools/peticion.ts`, `package.json` — la orden.
- `corpus/peticiones-de-retirada.yml`, `corpus/auditorias-de-atribuidas.yml` — cabecera y lista vacía.
- `tests/unit/peticiones.test.ts` — nuevo (45 pruebas: la matriz, contacto, SM-C6, muestra, ficheros del árbol, AD-24).
- `tests/unit/atribucion.test.ts`, `tests/unit/personaje-donde-el-autor.test.ts`, `tests/unit/pagina-de-personaje.test.ts` — la línea, pura y sobre `dist/`.
- `AGENTS.md` — «Corregir o retirar una Cita atribuida».

**Revisión.** Sin hallazgos externos en esta pasada: 0 parches, 0 diferidos, 0 rechazados.

**Revisión de seguimiento recomendada:** false (0 parches; puntuación 0).

**Verificación.**
- `npx vitest run tests/unit/peticiones.test.ts tests/unit/atribucion.test.ts tests/unit/clase.test.ts` — verde.
- `npx vitest run tests/unit/superficies.test.ts tests/unit/personaje-donde-el-autor.test.ts tests/unit/pagina-de-personaje.test.ts tests/unit/tipografia-en-tokens.test.ts tests/unit/formas-vedadas.test.ts` — 184 verdes.
- `npx astro check` — 0 errores.
- `FECHA_JORNADA=2026-11-14 npm run build` en la base (1242122f79, worktree desacoplado, retirado después) y en la rama, `diff -r -x pagefind` — sin diferencias (tras mover la importación; la primera pasada dio el reorden de CSS).
- `npm run peticion` en el árbol — exit 0, nada escrito.
- `npm test` — 8.398 de 8.400; las dos rojas, de `clase.test.ts` (el literal `'atribuida'` y `.clase` en `tools/lib/peticiones.ts`), corregidas con `esAtribuida` y reverificadas por fichero en verde.

**Riesgos residuales.** Los supuestos del `deferred` (forma de la dirección, asunto, id, regla de salto de SM-C6, atribuidas al cierre sin git, mes de la retirada, auditoría completa) son de Héctor. La e2e (accesibilidad con atribuidas y Personajes) la corre Héctor: el barrido de 3.2.6 cambia de título al pasar a `ux`.

### Revisión 1 del bucle (pasada 2 de step-04, con los hallazgos de las cinco capas)

**Resumen.** 19 parches, 1 diferido, 22 rechazados; ningún `bad_spec` ni `intent_gap`. SM-C6 cuenta solo atribuidas (una que pasa a siempre deja de contar) y solo las retiradas que movieron la Cita, una vez por Cita; deshacer una retirada devuelve también el título de la Ficha de Obra; el registro de peticiones se juzga entre entradas; `tieneContacto` deja pasar fechas y años y rechaza usuarios de red y «arroba»; `anotar` rechaza una fecha anterior a la clasificación y avisa de la repetida; las cuatro constantes con valor imposible salen con 1; `sin-pareja` en el juicio; sin fuente en la consulta; `auditar --json` sin muestra; `lineaDeRetirada` exige una dirección de correo.

**Ficheros.**
- `tools/lib/peticiones.ts` — contacto, relaciones del registro, `devolver` con las Fichas, `mesesDeLasRetiradas`, `sin-pareja`, `publicadasHoy` de atribuidas.
- `tools/peticion.ts` — atribuidas publicadas, cota inferior de la fecha, aviso de repetida, `problemasDeLasConstantes`, mensajes de `resolver`, `--json` de `auditar`, sin fuente.
- `src/lib/atribucion.ts` — la forma del buzón.
- `tests/unit/peticiones.test.ts`, `tests/unit/atribucion.test.ts`, `tests/unit/personaje-donde-el-autor.test.ts` — las pruebas de cada parche y de los huecos de verificación.
- `AGENTS.md` — la sección al día.

**Revisión de seguimiento recomendada:** true (parches: 0 high, 6 medium, 13 low; puntuación 3 × 6 + 13 = 31).

**Verificación.**
- `npx vitest run tests/unit/peticiones.test.ts tests/unit/atribucion.test.ts tests/unit/formas-vedadas.test.ts tests/unit/clase.test.ts` — 220 verdes.
- `npx vitest run tests/unit/superficies.test.ts tests/unit/personaje-donde-el-autor.test.ts tests/unit/pagina-de-personaje.test.ts tests/unit/medicion.test.ts tests/unit/tipografia-en-tokens.test.ts` — 908 verdes.
- `npx astro check` — 0 errores.
- `FECHA_JORNADA=2026-11-14 npx astro build` en 81685aee266b978b8eeefa751f1906353b365bf8 (worktree desacoplado, retirado) y en el árbol, `diff -rq -x pagefind` — sin diferencias.
- `npm run peticion` en el árbol — exit 0, nada escrito.
- `npm test` — 194 ficheros, 8.418 pruebas verdes.

**Riesgos residuales.** Los de la pasada anterior, más el cuerpo del `mailto:` (diferido a Héctor). Una Cita retirada, devuelta a mano y retirada otra vez no deja una segunda forma vedada (el registro no repite una igual), así que esa segunda retirada no cuenta en SM-C6.

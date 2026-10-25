---
title: 'Historia 23.10 — La línea base se lee desde tools/, con la cuota de D1 a la vista'
type: 'feature'
created: '2026-10-25'
status: 'done'
baseline_revision: '6ae8a9a7a86b876414fbea20ab20344b3f173da0'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-23-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-23-9-toda-obra-cuenta-sus-vistas-se-indexe-o-no.md'
warnings: [oversized, multiple-goals]
deferred:
  - summary: 'La cuota de lectura de D1 (5 millones de filas leídas al día en el plan gratuito) y qué informa de ella la orden de la línea base: la espina no la nombra y epics.md la deja como pregunta abierta. Esta historia no declara esa cuota ni la informa; solo dice, en el docblock de la orden y en DESPLIEGUE.md §3, que cada lectura recorre la tabla un número fijo de veces (una por consulta).'
    evidence: 'epics.md, Notas de la Épica 23, «Preguntas abiertas» (l. 5050) y epic-23-context.md («Pregunta abierta … pendiente de bmad-architecture»); ARCHITECTURE-SPINE.md, «Cuotas del receptor», solo nombra escritura y tamaño.'
    owner: 'pendiente de Héctor (bmad-architecture)'
    severity: low
  - summary: 'Cuándo se cierra la línea base de SM-12 (difusión por destino): el PRD la deja abierta (§14, pregunta 9). La orden informa SM-12 sobre el tramo vigente de la lectura, sin línea base ni ventanas.'
    evidence: 'epics.md l. 4183: «Cuándo se cierra la línea base de SM-12 … (PRD §14, pregunta 9)».'
    owner: 'pendiente de Héctor (bmad-prd)'
    severity: low
  - summary: >-
      El criterio de la cuota de la 23.10 en epics.md dice que «al pasarlas las escrituras fallan en silencio hasta las 00:00 UTC», y eso solo es cierto de la cuota de filas escritas: la de tamaño (500 MB por base) no se renueva sola. El informe y DESPLIEGUE.md §3 ya distinguen las dos; corregir la letra del criterio es de Héctor (bmad-create-epics-and-stories o bmad-correct-course).
    evidence: |-
      epics.md, Historia 23.10, «Given la cuota de D1»; ac-auditor de la segunda revisión, hueco 2. src/lib/umbrales.ts ya describe bien CUOTA_DE_BYTES_POR_BASE_EN_D1 («pasada, las escrituras fallan y el Worker lo calla»), sin plazo.
    location: >-
      _bmad-output/planning-artifacts/epics.md (Historia 23.10)
    owner: 'pendiente de Héctor (bmad-create-epics-and-stories)'
    severity: low
---

<intent-contract>

## Intent

**Problem:** el receptor ya guarda lecturas, salidas con zona, búsquedas asentadas, vistas de Obra con marca y acciones con `primera` (23.2–23.9), pero no hay forma de leerlo salvo pegar SQL a mano de `DESPLIEGUE.md` §3, que reparte por el prefijo de la ruta, no parte las series por sus cortes, no descuenta las pasadas que escriben en producción y no dice cuándo una línea base se cierra ni cuánto queda de la cuota de D1.

**Approach:** `npm run medicion` sin subcomando pasa a ser una lectura de solo lectura: la cáscara (`tools/medicion.ts`) exige sesión, lee el Corpus y cinco recuentos agrupados de D1 con `wrangler` 4.151.1 `--remote`, más `d1 info`; un módulo puro nuevo, `tools/lib/lineaBase.ts`, descuenta, resuelve cada registro contra el censo y la declaración de `superficies.ts`, parte las series por los cortes de `umbrales.ts`, calcula tasas, líneas base, firmas y ventanas, y compone el informe. `umbrales.ts` gana las constantes con nombre (sin valor las de Héctor), `superficies.ts` la superficie de línea base, `lineasDeSm11` su «hoy» en UTC y la prueba estructural del `rowid` se estrecha.

## Boundaries & Constraints

**Always:**
- **Invocación** (`tools/lib/medicion.ts`). `argumentosDeMedicion([])` → `{ ok: true, subcomando: null }` (la lectura); un subcomando de `SUBCOMANDOS` sigue igual; todo lo demás —bandera, argumento suelto, también tras la lectura— es `ok: false` (código 2), con el uso `npm run medicion [-- desplegar | comprobar | local | ensayo]`. La lectura **no** pide `MEDICION_ENDPOINT` y no instala el aviso de interrupción. Orden de la lectura: invocación (2) → `whoami --json` con `exigirSesion` (sin sesión 2, ilegible 1) → Corpus con `conjuntoDelCorpus(rutasDelCorpus(…))` (si falla, 1) → consultas → informe por `stdout`, que termina con «Consulta: no se ha escrito nada.». Solo invoca `d1 execute medicion --remote --json --command` (vía `argumentosDeConsulta(sql, 'remota')`) y `d1 info medicion --json`; nada de `deploy`, `migrations`, balizas, `git`, huella ni disco. Sale 0 si leyó algo; 1 si ni una consulta ni `d1 info` se dejaron leer. La secuencia (`leer(efectos)`) vive en `tools/lib/medicion.ts` con `Efectos`, como `comprobar`.
- **El SQL**, cinco sentencias de solo lectura compuestas por una función (p. ej. `consultasDeLaLectura(hoy)`), cada una `SELECT <dimensiones>, COUNT(*) AS n FROM eventos WHERE jornada < '<hoy>' AND ruta <> '<RUTA_DE_COMPROBACION>' AND evento … GROUP BY <dimensiones>`, sin `ORDER BY`, sin `rowid`, con los eventos escritos desde `EVENTOS` del vocabulario: (1) `vista-de-cita`, `vista-de-superficie`, `vista-de-obra`, `lectura` por (jornada, ruta, evento, origen, via, indexable); (2) `salida-interna` por (jornada, ruta, zona); (3) `copiado`, `descarga-de-imagen` y las dos comparticiones por (jornada, ruta, evento, destino, primera); (4) `busqueda` por (jornada, ruta, tramo, filtros); (5) `busqueda-sin-resultados` por (jornada, consulta). `hoy` = `jornadaUtc(efectos.ahora())`, validada `^\d{4}-\d{2}-\d{2}$` antes de entrar en el SQL. Solo recuentos: ni sesiones ni recorridos (NFR-11).
- **Ausencia antes que cero.** Una consulta que falla va a `sinLeer` con su motivo (`leerConsulta` más la causa de `wrangler`), y toda cifra que dependa de ella se omite y se nombra; `d1 info` igual, por separado para filas escritas y tamaño. Una tasa sin denominador dice «sin denominador», nunca 0 %.
- **Descuentos**, en el módulo puro y para todo: fuera las filas de `RUTA_DE_COMPROBACION` (además del SQL) y las de cada (jornada, ruta) de `PASADAS_QUE_ESCRIBEN_EN_PRODUCCION`, comparando rutas con `rutaNormalizada`; la constante se lee (parámetro con valor por omisión), nunca se copia, y el informe nombra las pasadas descontadas.
- **Censo y superficie** (AD-13). Censo = `rutasPublicadas(conjunto)` normalizadas (portada y toda Obra, indexable o no; nunca páginas 2+). Una ruta del censo toma `superficieDeclaradaDe(ruta, superficies)`; jamás el prefijo, y sin `caracterDe`/`causaDelServicio` (no hace falta la lista indexable). Fuera del censo, contado por evento y nombrado por clase: «páginas 2+» (`esServicioPorForma`), «ya no se publica» (superficie `producto` declarada que no está en el censo: Cita o Autor retirados, Obra absorbida…), una de servicio o ajena por su `nombre` (la búsqueda, la página 404…), «sin superficie declarada» (la dirección rota que sirve el 404, o una ruta que `rutaNormalizada` rechaza). La unidad es la superficie declarada, portada incluida, nunca la familia; para la línea base, `superficieDeLineaBase(s)` = `s.lineaBase ?? s.nombre`, leída genéricamente, y cada superficie se informa también por separado.
- **Continuación** = salidas internas / lecturas, por superficie, por zona y por unidad de línea base, solo con lecturas; el informe la declara **cota inferior** (lo abierto en pestaña nueva no se mide).
- **La familia Obra.** Cada (ruta de la Página de Obra del censo, jornada) toma, para **todos** sus registros, la marca de sus `vista-de-obra` de esa jornada: un solo valor entre `indexable`, `no-indexable` y nulo → ese («indexable», «no indexable», «nula»); más de uno → «cambió»; ninguna vista de Obra → «sin marca». Nunca desde git.
- **Cortes de serie** (`umbrales.ts`, junto a `PRIMER_DESPLIEGUE_DE_OBRAS`): `DESPLIEGUE_DE_LA_LECTURA: string | undefined = undefined` (la llegada de la Épica 23); `SerieDeMedicion = 'sm8' | 'lectura' | 'busqueda'`; `CORTES_DE_SERIE_DECLARADOS` con dos entradas `{ jornada, que, series }` compuestas de constantes —la 23 parte `sm8`, `lectura` y `busqueda`; `DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS`, solo `sm8`—; `cortesQueLlegaron(declarados)` (filtra `undefined`, ordena por jornada, estable); `CORTES_DE_SERIE = cortesQueLlegaron(CORTES_DE_SERIE_DECLARADOS)`; `CORTES_DE_SM8` = su proyección sobre `sm8`. Ninguna fecha literal en esa lista; `umbrales.ts` sigue sin importaciones.
- **Tramos.** La orden parte cada serie solo por los cortes que la nombran, sin suponer cuántos hay: cada tramo nuevo empieza la primera jornada UTC completa tras la llegada; la jornada de llegada no entra en ningún tramo y se informa aparte como «cambió» (dos cortes en la misma jornada: una sola «cambió» con los dos motivos); un corte con jornada ≥ hoy no abre tramo y se dice; los tramos no se suman. SM-8 se informa por todos sus tramos; lo de la lectura (superficies, Obra, Cita, SM-12) sobre el **tramo vigente** de `lectura`, y las búsquedas sobre el de `busqueda`; sin ningún corte de la serie, el informe lo dice.
- **SM-8**: vistas `vista-de-cita` y `vista-de-superficie` (nunca `vista-de-obra`) con `origen`, de toda ruta (SM-8 no se reparte por superficie), por red, por evento y por tramo de `CORTES_DE_SM8`; sin ningún corte llegado lo dice; junto a Threads, «no se lee como personas mientras no conste quién publica sus enlaces».
- **SM-12** por destino D, de toda ruta: lecturas con `via` = D entre las comparticiones con destino D sin mirar `primera`, salvo la `comparticion-de-imagen` con destino `opaco` (la Imagen cuadrada, informada aparte, fuera de todo destino), más, para `instagram-historia`, las `descarga-de-imagen` con ese destino; nunca las descargas `opaco`. Facebook queda fuera de la comparación entre destinos (y se informa aparte, con el motivo) mientras `SM12_CON_FACEBOOK` sea `false`; la constante se lee como parámetro con valor por omisión. Dice que en Chrome para Android puede quedar por encima de la real y que puede pasar de uno.
- **Página de Cita** (unidad de su superficie): SM-5 = acciones con `primera` = `si` de `copiado` y de `descarga-de-imagen` **sin destino** / lecturas; SM-7 = comparticiones (de enlace y de imagen) con `primera` = `si` / lecturas, cota inferior en Chrome para Android; SM-3 = 1 − continuación de la Página de Cita; SM-C3 = SM-5 junto a SM-7; SM-C5 = continuación junto a SM-5; cada tasa con su denominador. Las mismas cifras de la portada y de la Obra van aparte, sin llamarse SM-5/SM-7.
- **Búsquedas**: asentadas por tramo y por filtros; SM-6 = tramo `0` / asentadas; SM-13 = salidas de zona `resultado` en las superficies donde hubo `busqueda` / asentadas, cota inferior; «no se comparan por firma: la búsqueda asentada no lleva tiempo mínimo ni marca, y `/buscar/` no emite vista»; las consultas sin resultados del tramo vigente, por recuento (FR-8).
- **Líneas base.** Por unidad de lectura y la de búsquedas: empieza el primer día del tramo vigente de su serie (sin corte: «no ha empezado», nombrando `DESPLIEGUE_DE_LA_LECTURA`), salta las jornadas de llegada de los juicios de su unidad que caen en el tramo («cambió», abajo), y se cierra la jornada en que lo acumulado alcanza `MIN_LECTURAS_DE_LINEA_BASE` (búsquedas asentadas en la de búsquedas). Estados: «sin mínimo declarado» (nunca se cierra), «abierta: N de MIN», «cerrada el J». Dice «cerrada», nunca «buena», y que la da por buena Héctor en `DESPLIEGUE.md` §3.
- **Firmas** (cada línea base de lectura, sobre sus jornadas): razón lecturas/vistas de la firma frente a la del resto de pares (ruta, jornada) de la unidad, con cuántos pares. Vistas de una carga por (ruta, jornada[, origen]) = máx(`vista-de-cita` + `vista-de-superficie`, `vista-de-obra`). **Threads**: el par con exactamente dos vistas de carga con origen `threads`, una sin origen y ninguna con otro. **Ráfaga** (solo la Página de Cita; en las demás unidades, «no aplica»): en la jornada en que `MIN_RUTAS_DE_CITA_EN_RAFAGA` rutas de la Página de Cita o más tienen exactamente una vista de carga, esas rutas. Sin pares con la firma, se dice.
- **Ventanas** (tabla `JUICIOS_POR_VENTANAS` en `lineaBase.ts`; una tasa nueva entra por su historia): SM-C3 (Página de Cita; SM-7 sube y SM-5 baja; llegada aún sin constante: la da la 25), SM-C5 (Página de Cita; continuación sube y SM-5 baja; `DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS`), continuación de los Directorios (`LINEA_BASE_DE_LOS_DIRECTORIOS`; misma constante; hasta la 26, «sin lecturas: los Directorios entran con la 26»), continuación de la portada por zona (una tasa por zona con salidas en el tramo; `DESPLIEGUE_DE_LA_PORTADA_DE_RETORNO`), SM-6 y SM-13 (búsquedas; aún sin constante: la da la 27.9). Una llegada sin constante es `undefined` en la tabla, y su historia la enchufa. Ventana = bloque de jornadas cerradas consecutivas del tramo, sin solaparse, que acumula `MIN_LECTURAS_DE_LINEA_BASE` de su unidad y salta, como la línea base, las llegadas de los juicios de su unidad; la última incompleta, «en curso: N de MIN». Si la llegada del juicio cae en el tramo y antes del cierre de la línea base (o sin línea base cerrada), las ventanas empiezan la jornada siguiente a la llegada, que no entra, y su referencia es la tasa del tramo antes de la llegada («frente a la serie propia de antes», y se dice; sin denominador → «sin referencia»); si no, empiezan tras el cierre y la referencia es la línea base. Dirección por tasa y ventana: sube, baja o igual frente a la referencia; la señal de SM-C3/SM-C5 «se da» en una ventana y «salta» en dos seguidas; basta la dirección y saltar no apaga nada. Sin mínimo o sin referencia, no hay ventanas o no hay dirección, y se dice.
- **Cuota**: filas escritas en 24 h de `d1 info` frente a `CUOTA_DE_FILAS_ESCRITAS_POR_DIA_EN_D1` (y que pecan por exceso), y `database_size` frente a `CUOTA_DE_BYTES_POR_BASE_EN_D1` (500 MB, `500 * 1000 * 1000`, la lectura más estrecha), con los nombres de las constantes, y que al pasarlas las escrituras fallan en silencio hasta las 00:00 UTC.
- **Metas**: ninguna cifra se compara con las de SM-3…SM-7 (65 %, 1,8, 3 %, 15 %, 2 %); el informe dice que están en suspenso.
- **`umbrales.ts` gana además**: `MIN_LECTURAS_DE_LINEA_BASE: number | undefined = undefined` (como `CONGELACION_DE_OBRAS`), `SM12_CON_FACEBOOK = false`, `MIN_RUTAS_DE_CITA_EN_RAFAGA = 100`, `PasadaEnProduccion { pasada, jornada, rutas }` y `PASADAS_QUE_ESCRIBEN_EN_PRODUCCION: readonly PasadaEnProduccion[] = []` (solo la 25.3 y la 25.7; la anota Héctor), `CUOTA_DE_BYTES_POR_BASE_EN_D1`; cada una con docblock que dice quién le da valor.
- **SM-11.** `lineasDeSm11` compone su «hoy» en UTC (`toISOString().slice(0, 10)`), y `DESPLIEGUE_DE_LA_LECTURA` no entra en `desplieguesQueMuevenSm11`.

**Block If:**
- Cumplir algo exige tocar `src/lib/vocabulario.ts`, `medicion/` (receptor, adaptador, migraciones, huella) o añadir un punto final de lectura.
- Cumplir algo exige dar valor a `MIN_LECTURAS_DE_LINEA_BASE` o a `DESPLIEGUE_DE_LA_LECTURA`, anotar una pasada en `PASADAS_QUE_ESCRIBEN_EN_PRODUCCION`, encender `SM12_CON_FACEBOOK` o anotar en `DESPLIEGUE.md` que una línea base es buena.
- Verificar algo exige correr la lectura de verdad contra el D1 de producción (`wrangler … --remote`).

**Never:**
- Correr `npm run medicion` (la lectura) contra producción, `desplegar`, `comprobar`, push o fusión; tocar `sprint-status.yaml`, `_bmad-output/planning-artifacts/` o `_bmad-output/specs/`.
- Que un módulo de `src/`, `integraciones/` o `astro.config.mjs` importe o nombre la lectura; tocar `tools/ingreso.ts` o `tools/lib/ingresos.ts` (el aviso diario sigue «no medible», AD-21).
- Ordenar por `rowid`, seleccionarlo o leerlo desde JavaScript; repartir por prefijo de ruta o por familia; escribir un cero por un fallo; decir «buena» de una línea base.
- Declarar ya las constantes de llegada de la 25 o de la 27, o las superficies `/autores/` y `/obras/` (son de sus historias; la etiqueta `LINEA_BASE_DE_LOS_DIRECTORIOS` sí entra, para la tabla de juicios).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Lectura sana | sesión; cinco consultas y `d1 info` responden | informe con cuota, descuentos, cortes, SM-8, superficies, fuera del censo, Obra, Cita, SM-12, búsquedas, líneas base, ventanas; «no se ha escrito nada» | sale 0 |
| Sin sesión / bandera desconocida | `loggedIn: false` / `--rapido` | no lee el Corpus ni consulta; lo dice | sale 2 |
| Una consulta falla | (2) devuelve `{ error }` | continuación, SM-3, SM-13, SM-C5 y las ventanas que la usan en `sinLeer` con el motivo; el resto sale | sale 0 |
| Nada se deja leer | las cinco y `d1 info` fallan | `sinLeer` de todas | sale 1 |
| Pasada en producción | entrada `{ jornada: J, rutas: [R] }` | no cuentan los registros de R en J; sí los de R en otra jornada y los de otra ruta en J | — |
| Fuera del censo | `/cita/retirada/`, `/autor/a/2/`, `/buscar/`, `/x-rota` | «ya no se publica», «páginas 2+», «la búsqueda», «sin superficie declarada», por evento | — |
| Dos superficies con la misma `lineaBase` | censo y superficies de prueba | sus lecturas se juntan en la línea base y salen también por separado | — |
| Obra con las dos marcas en J | `vista-de-obra` `indexable` y `no-indexable` | lecturas, salidas y acciones de esa ruta y J en «cambió» | — |
| Dos cortes de `sm8` | J1 < J2 | tres tramos que no se suman; J1 y J2 «cambió», fuera de todo tramo | — |
| Constante sin valor | `jornada: undefined` | no corta | — |
| Sin mínimo | `MIN` = `undefined` | «sin mínimo declarado»; ni cierre ni ventanas | — |
| Llegada antes del cierre | juicio con llegada L dentro del tramo | ventanas desde L+1, sin L, frente a la serie de antes | — |
| SM-12 con Facebook apagado/encendido | lecturas `via=facebook` | fuera de la comparación / dentro | — |

</intent-contract>

## Code Map

- `tools/medicion.ts:270-306` -- `principal`: hoy pide subcomando y `MEDICION_ENDPOINT` para `desplegar`/`comprobar`; `efectos` (l. 193) ya trae `wrangler`, `decir` y `ahora`. Aquí entra la lectura (sesión → Corpus → `leer` → informe), sin aviso de interrupción.
- `tools/lib/medicion.ts:25-110` (`WRANGLER`, `BASE_DE_DATOS`, `RUTA_DE_COMPROBACION`, `SUBCOMANDOS`, `argumentosDeConsulta`, `ARGUMENTOS_DE_INFORMACION`), `113-162` (el SQL: «Ningún SQL de aquí ordena»), `166-179` (`argumentosDeMedicion`, a cambiar), `262-299` (`leerConsulta`, `leerInformacion` con `escritas24h` y `tamaño`), `1024-1046` (`recuentos`, `jornadaUtc`, `jornadaAnterior`), `1159-1251` (`Parada`, `Efectos`, `causaDe`, `consultar`, `exigirSesion`), `1593` (`comprobar`, modelo de secuencia), `664-669` (mensaje de la huella que remite a «la lista de cortes de serie (Historia 23.10)»: nombrar `CORTES_DE_SERIE_DECLARADOS`).
- `tools/indexacion.ts:214` -- `conjuntoDelCorpus(rutas)` (con la Obra colgada; lo reusan `rastreo` y `canal`); `tools/lib/corpus.ts:342` `rutasDelCorpus`; `tools/lib/cli.ts:56` `motivosDeArgumentosNoReconocidos`.
- `tools/lib/indexacion.ts:798-860` -- `jornadaDeJuzgarSm11`, `desplieguesQueMuevenSm11` (tres constantes), `lineasDeSm11` (l. 852: «hoy» con `getFullYear/getMonth/getDate`, locales).
- `src/lib/publicado.ts:429-440` -- `rutasPublicadas` (portada, Citas, Autores, Temas, Colecciones y toda Obra; sin páginas 2+): el censo.
- `src/lib/superficies.ts:57-127` (`Superficie`: gana `lineaBase?`), `130-232` (`SUPERFICIES`; ninguna la declara hoy), `393-430` (`rutaNormalizada`, `superficieDeclaradaDe(ruta, superficies)`, `esRutaDeObra`, `esServicioPorForma(ruta, superficies)`). `PAGINA_DE_OBRA` (l. 129) no se exporta; `esRutaDeObra` sí.
- `src/lib/vocabulario.ts` -- solo lectura: `EVENTOS`, `ZONAS` (`resultado`), `TRAMOS` (`0`), `MARCAS_DE_OBRA`, `PRIMERA`; `src/lib/destinos.ts` `DESTINO_OPACO`, `DESTINO_DE_IMAGEN`, `IdDeDestino`; `src/lib/redes.ts` `Red` (`threads`).
- `src/lib/umbrales.ts:85-113` (SM-11 y las tres jornadas de despliegue, «string | undefined = undefined»), `360-389` (`CUOTA_DE_FILAS_ESCRITAS_POR_DIA_EN_D1`, `MIN_MS_VISIBLES_PARA_LA_LECTURA`); sin importaciones.
- `medicion/esquema.sql` -- solo lectura: columnas e índices (`jornada, evento`; `origen, jornada`).
- `tests/unit/orden-de-llegada.test.ts:240-566` -- `textosSql`, `NOMBRA_ROWID`, `ordenaPorRowid`, `ficherosDe` y el barrido de `tools/` (l. 551, con su lista de conocidos): base de la prueba estrecha.
- `tests/unit/medicion-orden.test.ts:122-140` (invocación: `[[], /Falta el subcomando/]` y `['--rapido']` cambian), `830-904` (cáscara con `npxDeMentira` y `correr`: modelo de las pruebas de salida 2/1).
- `tests/unit/medicion-secuencias.test.ts` -- efectos de mentira (`Efectos`) para `leer`.
- `tests/unit/indexacion.test.ts:1356-1404` -- pruebas de SM-11 con `new Date(2026, 11, 5)` (local: en CET es el 2026-12-04 UTC y fallará con el «hoy» en UTC; pasan a instantes UTC).
- `tests/unit/trafico.test.ts:741-768` -- modelo de «ningún módulo de src/ nombra la orden» con `git grep`.
- `DESPLIEGUE.md:343-880` -- §3: menciones «23.10» (l. 369, 387, 399, 565, 601, 670, 691, 712, 720, 746, 756, 822) y las consultas a mano; `AGENTS.md` «Desplegar el receptor de la medición».

## Tasks & Acceptance

**Execution:**
- `src/lib/umbrales.ts` -- las constantes de Always (cortes, pasadas, mínimo, Facebook, ráfaga, tamaño), con docblocks que digan quién les da valor y que `DESPLIEGUE.md` cita las pasadas; `cortesQueLlegaron` puro -- AD-9.
- `src/lib/superficies.ts` -- `lineaBase?: string` en `Superficie` (docblock: la 26.3 y la 26.4 la declaran en los Directorios), `superficieDeLineaBase` y `LINEA_BASE_DE_LOS_DIRECTORIOS = 'los Directorios'`; ninguna superficie cambia -- agrupación genérica.
- `tools/lib/medicion.ts` -- invocación con la lectura; `consultasDeLaLectura(hoy)`; `leer(efectos)` (sesión, las cinco consultas y `d1 info`, cada fallo a `sinLeer`, `Parada(1)` si nada se leyó); docblocks de cabecera al día (cinco recorridos de la tabla por lectura; lo que solo nombran `rowid` la comprobación y el barajado) -- AD-14, AD-22.
- `tools/lib/lineaBase.ts` (nuevo, puro) -- descuentos, censo y clases fuera del censo, marcas de Obra, tramos, tasas, SM-8, SM-12, búsquedas, líneas base, firmas, `JUICIOS_POR_VENTANAS` y ventanas, cuota; `componerLecturaDeMedicion` (estructura) y `lineasDeLecturaDeMedicion` (texto), con los valores de `umbrales.ts` como parámetros por omisión -- FR-56, AD-13.
- `tools/medicion.ts` -- la lectura en `principal` y su docblock (uso, códigos, red) -- cáscara.
- `tools/lib/indexacion.ts` -- «hoy» en UTC en `lineasDeSm11`; docblock -- AD-9.
- `tests/unit/linea-base.test.ts` (nuevo) -- con respuestas fijas: cada fila de la matriz; censo frente a prefijo (una ruta con prefijo `/cita/` fuera del censo no es Página de Cita); las cuatro clases fuera del censo; dos superficies de prueba con la misma `lineaBase`; las cinco marcas de Obra sobre lecturas, salidas y acciones; tramos (dos cortes → tres tramos, llegada fuera, dos en la misma jornada, `undefined` no corta, orden); SM-8 sin `vista-de-obra` y sin cortes; SM-12 en los dos estados de Facebook, con `instagram-historia` en el denominador, sin descargas `opaco` y con la cuadrada aparte; SM-5 sin descargas con destino y con `primera`; SM-3, SM-6, SM-13; línea base sin mínimo, abierta y cerrada sin «buena»; las dos firmas; ventanas, dirección, «salta» en dos seguidas y las contadas tras una llegada anterior al cierre sin su jornada; cuota con los nombres de las constantes; un fallo en `sinLeer` y nunca 0; ninguna meta de SM-3…SM-7 -- AC de la historia.
- `tests/unit/medicion-orden.test.ts` -- invocación (`[]` es la lectura; `['--rapido']`, `['desplegar', '--x']` siguen siendo 2); las cinco sentencias empiezan por `SELECT`, no escriben, no ordenan, no nombran `rowid`, excluyen la comprobación, cortan en `hoy` y nombran los eventos del vocabulario; cáscara: `--rapido` sale 2 sin llamar a `npx`, sin sesión 2 sin `MEDICION_ENDPOINT`, un `npx` que contesta `{"loggedIn":true}` a todo sale 1 -- invocación y cáscara.
- `tests/unit/medicion-secuencias.test.ts` -- `leer` con efectos de mentira: solo `whoami`, `d1 execute … --remote` y `d1 info`; sin sesión `Parada(2)` antes de consultar; una consulta fallida no para; todas fallidas `Parada(1)` -- la secuencia.
- `tests/unit/orden-de-llegada.test.ts` -- prueba estrecha: ningún texto SQL de `tools/` (sentencia con `SELECT … FROM`, `UPDATE … SET`, `INSERT … INTO`, `DELETE FROM`, `WITH`, `PRAGMA`) nombra `rowid` salvo `SQL_DE_BARAJADO` y el `SELECT CAST(rowid AS TEXT) AS fila, …` de `sqlDeLasBalizas`, ambos en `tools/lib/medicion.ts`; casos de control (un `SELECT rowid …` marca; la prosa de un mensaje no; las dos permitidas pasan); el barrido ve `tools/lib/lineaBase.ts` -- AD-13.
- `tests/unit/indexacion.test.ts` -- pruebas de SM-11 con instantes UTC; una con `process.env.TZ = 'Europe/Madrid'` (restaurado en `finally`) y `2026-12-04T23:30:00Z`, que comprueba antes que la jornada local difiere y exige «SM-11 se juzga desde el 2026-12-05.»; otra con `vi.doMock` de `umbrales.ts` (`DESPLIEGUE_DE_LA_LECTURA` y `DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS` con valor) e importación dinámica: `desplieguesQueMuevenSm11` no nombra la de la lectura -- AD-9.
- `tests/unit/superficies.test.ts` -- `superficieDeLineaBase` da `lineaBase` si la superficie la declara y `nombre` si no -- la declaración.
- `tests/unit/linea-base.test.ts` (también) -- `CORTES_DE_SERIE` ordenada; con `vi.doMock` de las dos constantes, `CORTES_DE_SM8` tiene esas dos entradas en orden y la de la lectura parte también `lectura` y `busqueda`; la lista declarada no lleva ninguna fecha literal (lectura del fuente de `umbrales.ts`); `git grep` de `lineaBase` y de la orden en `src`, `integraciones` y `astro.config.mjs` vacío -- AD-9, AD-14.
- `DESPLIEGUE.md` -- §3: subsección «Leer la línea base — Historia 23.10» con la orden, lo que lee y lo que no escribe, códigos, censo y clases, cortes (`CORTES_DE_SERIE`, `CORTES_DE_SM8`), cita de `PASADAS_QUE_ESCRIBEN_EN_PRODUCCION` (sin copiarla), cuota y tamaño, cinco recorridos por lectura, «cerrada» y nunca «buena», y un apartado vacío «Líneas base dadas por buenas» donde Héctor anota fecha, métrica y superficie (ningún agente); las menciones «hasta la 23.10» al día (la prueba del `rowid` ya vigila la lectura; la superficie y la Obra las resuelve la orden; SM-8 ya se parte por `CORTES_DE_SM8`; el tamaño lo informa la orden) -- documentación.
- `AGENTS.md` -- en «Desplegar el receptor de la medición», `npm run medicion` (la lectura): solo lectura con `--remote`, códigos 2 y 1, `tools/lib/lineaBase.ts`, las constantes que son de Héctor y que los cortes de serie viven en `umbrales.ts` -- memoria del proyecto.

**Acceptance Criteria:**
- Given la rama terminada, when corren `npx astro check` y por fichero `linea-base`, `medicion-orden`, `medicion-secuencias`, `orden-de-llegada`, `indexacion`, `superficies`, `huella`, `vocabulario`, `gestion`, `trafico` y `publicable-y-alcanzable`, then 0 errores y todo en verde.
- Given `npm test` en segundo plano, when termina, then todo en verde.
- Given el diff de la historia, when se mira, then el `git diff` desde la revisión base de la historia (`baseline_revision` del frontmatter) en `src/lib/vocabulario.ts`, `medicion/`, `tools/ingreso.ts` y `tools/lib/ingresos.ts` está vacío, ninguna superficie de `SUPERFICIES` cambia y `MIN_LECTURAS_DE_LINEA_BASE`, `DESPLIEGUE_DE_LA_LECTURA`, `PASADAS_QUE_ESCRIBEN_EN_PRODUCCION` y `SM12_CON_FACEBOOK` valen `undefined`, `undefined`, `[]` y `false`.
- Given un `PATH` con un `npx` de mentira, when se corre `npx tsx tools/medicion.ts` sin argumentos, then sin sesión sale 2 diciendo cómo iniciarla, y con un `npx` que no contesta consultas sale 1 nombrando lo que no se leyó; con `--rapido`, 2 sin invocar `npx`.

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

Las cinco capas de revisión son externas en este bucle (v8-ralph) y la invocación no traía ninguna sección «Hallazgos externos»: esta pasada no tiene hallazgos que clasificar. La revisión independiente llega después.

### 2026-10-25 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 20 (high 0, medium 10, low 10)
- defer: 0
- reject: 13 (high 0, medium 0, low 13)
- addressed_findings:
  - `[medium]` `[patch]` Las ventanas juntaban jornadas de los dos lados de una llegada posterior al cierre (blind-hunter): un cambio de la unidad corta el bloque en curso, que se nombra («cortada por el cambio del J … no se juzga») y rompe la cadena de «salta»; prueba con la llegada del 2026-11-06 tras un cierre del 2026-11-04.
  - `[medium]` `[patch]` La continuación de los Directorios nunca tendría dirección y su línea base empezaba con la 23 (ac-auditor): `JuicioPorVentanas.haceMedible`; la línea base de esa unidad empieza el día siguiente a `DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS` («no ha empezado: espera …» sin ella) y las ventanas se juzgan frente a ella; prueba con dos superficies de prueba que declaran `LINEA_BASE_DE_LOS_DIRECTORIOS`.
  - `[medium]` `[patch]` Un corte de ayer dejaba el tramo vigente rotulado «vacío: dos llegadas seguidas» y la línea base «abierta desde el <hoy>» con 0 (blind-hunter, edge-case-hunter): el tramo vigente vacío dice «empieza el J: aún no tiene ninguna jornada cerrada», y la línea base lo mismo; prueba de los dos vacíos.
  - `[medium]` `[patch]` La consulta sin resultados de un visitante se imprimía cruda (blind-hunter, edge-case-hunter): `legible` sustituye los caracteres de control C0/C1 y los de dirección por U+FFFD en todo texto de D1 que se imprime; prueba con ESC, salto de línea y U+202E.
  - `[medium]` `[patch]` Las constantes escritas a mano no se juzgaban (blind-hunter, edge-case-hunter): `problemasDeLaLectura` juzga las jornadas de los cortes, las pasadas y las llegadas (`esJornadaReal`), las rutas de las pasadas, el mínimo (entero positivo) y que ninguna superficie se llame «las búsquedas»; `componerLecturaDeMedicion` lanza nombrándolos y la cáscara sale con 1; una prueba exige que los valores del repositorio se sostengan.
  - `[medium]` `[patch]` Un `wrangler` que se cortaba (tope, `maxBuffer`, `npx`) tumbaba la lectura entera (edge-case-hunter): `leer` lo recoge por consulta y por `d1 info`, que van a «Sin leer» con su motivo; pruebas en `medicion-secuencias`.
  - `[medium]` `[patch]` La señal de SM-C3/SM-C5 sin una de sus direcciones salía «no se da» y rompía la cadena (edge-case-hunter): nuevo estado «sin dirección» («la señal no se puede juzgar…»), que no cuenta como «no se da».
  - `[medium]` `[patch]` Los valores por omisión de `umbrales.ts` no los probaba nada (verification-gap, ac-auditor): prueba con `vi.doMock` de `CORTES_DE_SERIE`, `PASADAS_QUE_ESCRIBEN_EN_PRODUCCION`, `MIN_LECTURAS_DE_LINEA_BASE` y `SM12_CON_FACEBOOK`, y otra sin opciones que comprueba `JUICIOS_POR_VENTANAS` y Facebook fuera.
  - `[medium]` `[patch]` Ninguna prueba calculaba con datos SM-C5, la continuación de la portada por zona, SM-6 ni SM-13 en ventanas (verification-gap, ac-auditor): cuatro pruebas con respuestas fijas, incluida la señal de SM-C5 («se da», «salta») y una zona de otra superficie que no cuenta.
  - `[medium]` `[patch]` El censo de la cáscara nunca se cotejaba con filas (verification-gap): prueba de la cáscara con un `npx` que devuelve una lectura en una Cita publicada y otra en una Obra que no se indexa, sacadas del Corpus de verdad, contadas en su superficie y «Fuera del censo: nada».
  - `[low]` `[patch]` La referencia «serie de antes» podía quedar por debajo del mínimo sin decirlo (blind-hunter, intent-alignment R7): `referenciaAcumulada` y «La serie de antes reúne N lecturas, por debajo del mínimo de una ventana (MIN)».
  - `[low]` `[patch]` El informe callaba las superficies a cero, y con las salidas sin leer las tomaba por cero (blind-hunter, ac-auditor): se informan todas las superficies con lectura —solo ellas tienen continuación—, también a cero, y todas las marcas de Obra.
  - `[low]` `[patch]` «ya no se publica» atribuía una historia a una errata (blind-hunter, edge-case-hunter): el informe dice que esa clase junta lo retirado con lo que nunca se publicó (la etiqueta del contrato se conserva).
  - `[low]` `[patch]` La prueba de las metas no podía fallar y la de las partes no miraba el orden (blind-hunter): expresión con el decimal del informe y autocomprobada, solo la línea del suspenso nombra las metas, y las partes en el orden de `DESPLIEGUE.md` §3.
  - `[low]` `[patch]` Ninguna prueba descontaba una pasada en `/buscar/` (blind-hunter): prueba de las búsquedas y las consultas sin resultados descontadas.
  - `[low]` `[patch]` Las unidades se resolvían con `!` al cargar y «las búsquedas» no estaba reservada (blind-hunter, edge-case-hunter): error con nombre si falta la superficie, y el invariante de `superficies.test.ts` lo reserva.
  - `[low]` `[patch]` `rutasPublicadas` y la composición corrían fuera de la guarda de la cáscara (blind-hunter): un fallo al componer sale con 1 nombrado, sin traza.
  - `[low]` `[patch]` `--rapido desplegar` decía «La lectura no lleva opciones» (blind-hunter): ahora «El subcomando va primero, y sin opciones: npm run medicion -- desplegar».
  - `[low]` `[patch]` `AGENTS.md` no decía que una sesión ilegible sale con 1 (blind-hunter): añadido, con el valor que no se sostiene, y remite a `DESPLIEGUE.md` §3.
  - `[low]` `[patch]` La continuación por zona de la portada con las salidas sin leer decía «ninguna tasa» (edge-case-hunter): «sin leer: las salidas internas»; sin zonas en el tramo, se dice.

Rechazados, con su motivo: la lectura a secas gasta cuota (la AC manda que `npm run medicion` sea la lectura `--remote`); la cuota de lectura y un estado de aviso (la AC solo pide escrituras y tamaño, y la de lectura ya está diferida a `bmad-architecture`); el resultado sin cota inferior de jornada (sin fallo presente con el tráfico de hoy; queda en riesgos); las series demasiado gruesas para la 25.2 (su historia decide si añade una serie; queda en riesgos); las líneas base no reproducibles y el censo de hoy (lectura elegida por la AC y el spec, como la serie de tráfico); el spec «done» antes de revisar y `sprint-status.yaml` (proceso del bucle); el «hoy» UTC de `lineasDeSm11` (lo exige la AC); la importación de `conjuntoDelCorpus` desde `tools/indexacion.ts` (patrón vigente de `rastreo` y `canal`); dos pasadas con la misma (jornada, ruta) (el total descontado es exacto); Facebook «fuera» como rótulo, la Obra agrupada en sus totales y las llegadas que enchufa cada historia (lecturas A de intent-alignment, coherentes con el spec); la prueba estructural de no leer el `rowid` desde JavaScript (opcional y sin lectura que vigilar).

### 2026-10-25 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 25 (high 1, medium 2, low 22)
- defer: 1 (low 1)
- reject: 10 (low 10)
- addressed_findings:
  - `[high]` `[patch]` Las pruebas fijaban valores que son de Héctor y pondrían la principal en rojo al dárselos (verification-gap, «Other findings»): `umbralesCon` exigía `DESPLIEGUE_DE_LA_LECTURA` y `DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS` en `undefined` (ahora sustituye la declaración tenga el valor que tenga); la prueba de la cáscara con el censo de verdad escribía sus filas el `2026-01-05`, que con el corte de la 23.11 cae en el tramo 1 (ahora la víspera UTC de hoy, con lo esperado sacado de `partirSerie` y los cortes del repositorio); y la de «sin opciones» fijaba Facebook fuera (ahora sigue `SM12_CON_FACEBOOK`). `AGENTS.md` lo dice.
  - `[medium]` `[patch]` Con `MIN_LECTURAS_DE_LINEA_BASE` sin valor el informe nunca decía «sin mínimo declarado», como pide la AC, porque toda línea base estaba «no ha empezado» (ac-auditor, hueco 3): la cabecera de las líneas base dice «sin mínimo declarado; ninguna se cierra».
  - `[medium]` `[patch]` El informe decía que pasada la cuota de tamaño las escrituras fallan hasta las 00:00 UTC, y esa no se renueva (blind-hunter): separa las dos consecuencias —la de filas escritas hasta las 00:00 UTC; la de tamaño hasta que se borren filas o cambie el plan—, en el informe y en `DESPLIEGUE.md` §3.
  - `[low]` `[patch]` El comentario de «sin dirección» decía que no rompía la cadena de «salta», y el código sí la rompe (blind-hunter): el comentario y `DESPLIEGUE.md` dicen lo que hace —dos ventanas con la señal separadas por una sin juzgar no son «dos seguidas»—. Con datos reales la secuencia no se puede dar —en una ventana los denominadores reúnen el mínimo, así que «sin dirección» afecta a todas las ventanas de un juicio o a ninguna—, y por eso no lleva prueba propia.
  - `[low]` `[patch]` Lo escrito a mano en `umbrales.ts` se juzgaba después de cinco recorridos de la tabla en remoto (blind-hunter, edge-case-hunter): `valoresDeLaLectura` y `problemasDeLaLectura` se preguntan en la cáscara antes de tocar nada, y el censo se saca del Corpus antes de las consultas.
  - `[low]` `[patch]` `legible` dejaba pasar separadores de línea, la marca de dirección árabe y caracteres de anchura cero (blind-hunter, edge-case-hunter): U+2028, U+2029, U+061C, U+200B y U+FEFF también se sustituyen; el receptor ya recorta la consulta a `MAX_CONSULTA`.
  - `[low]` `[patch]` Dos constantes lanzaban al cargar el módulo y podían tumbar todos los subcomandos de `npm run medicion` (blind-hunter, edge-case-hunter): las unidades se resuelven sin lanzar (`unidadDeLaPaginaDeCita`, `unidadDeLaPortada`), la tabla sale de `juiciosPorVentanas(superficies)` —`JUICIOS_POR_VENTANAS` es la del repositorio— y `problemasDeLaLectura` nombra la superficie que falta.
  - `[low]` `[patch]` Con la línea base cerrada antes de la llegada de lo que se juzga, las ventanas de antes daban la señal sin decir que no juzgan lo que llega (blind-hunter): se siguen contando desde el cierre, como pide la AC, y cada una lo dice («Antes de la llegada del J: no juzga lo que llega»).
  - `[low]` `[patch]` Las pasadas descuentan también a los visitantes de esas rutas ese día sin decirlo (blind-hunter): el informe y `DESPLIEGUE.md` lo dicen, y que lo compartido por dos pasadas se cuenta en la primera.
  - `[low]` `[patch]` Con más salidas que lecturas SM-3 salía negativo (blind-hunter, edge-case-hunter): el complemento de una tasa que pasa de uno no se calcula (`por-encima`) y se dice por qué.
  - `[low]` `[patch]` Con todas las consultas trayendo filas sin forma y `d1 info` sin cifras la orden salía con 0 (edge-case-hunter): `nadaSeLeyo` y la cáscara sale con 1, «No se leyó nada de D1».
  - `[low]` `[patch]` `MIN_RUTAS_DE_CITA_EN_RAFAGA` no se juzgaba (edge-case-hunter): entero positivo, en `problemasDeLaLectura`.
  - `[low]` `[patch]` Una ruta de pasada con `?…`, `#…` o sin superficie declarada pasaba y no descontaba nada (edge-case-hunter): se rechaza nombrándola.
  - `[low]` `[patch]` El informe se escribía a una tubería y la orden salía sin esperar (edge-case-hunter): la cáscara espera a que `stdout` acabe.
  - `[low]` `[patch]` La prueba estructural del `rowid` no veía `REPLACE INTO` (edge-case-hunter): entra en `ES_SENTENCIA`, con su caso de control.
  - `[low]` `[patch]` Ninguna prueba hacía fallar `vistasYLecturas` más allá de la Obra (verification-gap): SM-8, cada línea base de lectura, SM-12, el juicio y las líneas del informe salen «sin leer».
  - `[low]` `[patch]` Ninguna prueba hacía fallar `busquedas` ni `sinResultados` (verification-gap): dos pruebas, con las asentadas, SM-6, SM-13, la línea base de las búsquedas y las consultas sin resultados «sin leer», nunca «ninguna».
  - `[low]` `[patch]` Las notas «Sin contar …» no las probaba nada (verification-gap): prueba con las salidas sin leer, una pasada y las balizas.
  - `[low]` `[patch]` Faltaban pruebas de la revisión anterior (blind-hunter): la cáscara sale con 1 con filas sin forma, la llegada de los Directorios anterior al tramo, dos pasadas que comparten ruta y jornada y un «hoy» que no existe.
  - `[low]` `[patch]` El SQL de la lectura no se ejecutaba en ninguna prueba (ac-auditor, hueco 1; intent-alignment a): las cinco sentencias corren en un SQLite en memoria (`node:sqlite`) con la tabla de `medicion/migrations/`.
  - `[low]` `[patch]` La línea de las balizas decía «0 registros» con una consulta sin leer (ac-auditor, hueco 4): lleva «(sin contar …)», como las pasadas.
  - `[low]` `[patch]` Ninguna prueba llevaba una acción fuera del censo (ac-auditor, hueco 5): no cuenta en SM-5 ni SM-7 y sale fuera, por evento.
  - `[low]` `[patch]` Ninguna prueba leía `MIN_RUTAS_DE_CITA_EN_RAFAGA` por omisión (ac-auditor, hueco 6): entra en la prueba de `vi.doMock`.
  - `[low]` `[patch]` Facebook salía en la misma lista que los destinos comparados (ac-auditor, hueco 8; intent-alignment d): va en su línea, «Aparte», detrás de ellos, con el motivo.
  - `[low]` `[patch]` Las acciones de las superficies que no son la Página de Cita, la portada ni la Obra no salían en ningún sitio (intent-alignment f): cada superficie da sus acciones.

Diferido: la letra del criterio de la cuota en `epics.md` (pendiente de Héctor). Rechazados, con su motivo: la cuota de lectura (ya diferida a `bmad-architecture`); la cota inferior de jornada en el SQL (queda en riesgos; sin fallo con el tráfico de hoy); una prueba que clasifique toda constante `DESPLIEGUE_*` (cada historia enchufa su llegada, como dice el spec); salir con otro código cuando solo `d1 info` se leyó (la AC: 1 solo si no se lee nada); el commit del censo en el informe (`leer` no toca git, por contrato); el nombre `DESPLIEGUE_DE_LA_LECTURA` en «no ha empezado» (lo pide el spec, y es el primer corte de las dos series con línea base); el spec «done» y `sprint-status.yaml` (proceso del bucle); los miles sin punto con cuatro cifras (norma de `es-ES`, la de las demás órdenes de `tools/`); la portada por `superficieDeclaradaDe('/')` (es la declaración); y las lecturas de intent-alignment que no señalan defecto (R1–R10 salvo a, d y f).

## Design Notes

**Por qué cinco consultas y no una.** Una sola agrupación por todas las columnas daría lo mismo, pero un fallo la vaciaría entera: con cinco, una que falla deja en `sinLeer` solo las cifras que dependen de ella (AC «una consulta que falla»). Cada una recorre la tabla una vez, sin `ORDER BY` —se ordena en JavaScript—, y el informe no lee el `rowid` por ningún camino.

**Por qué el censo y no el prefijo.** `/cita/x/` puede ser una Cita retirada (sirve el 404) y `/autor/a/2/` una página de servicio: el prefijo los contaría en su familia. El censo de hoy los aparta y los nombra; cada pasada reatribuye el pasado con el censo de hoy, como el tráfico.

**Tramos, en un ejemplo** (cortes de `sm8` en J1 = 2026-11-02 y J2 = 2026-11-20, hoy 2026-12-01):

```
tramo 1: … – 2026-11-01   ·   2026-11-02 «cambió»   ·   tramo 2: 2026-11-03 – 2026-11-19
2026-11-20 «cambió»   ·   tramo 3: 2026-11-21 – 2026-11-30   (no se suman)
```

**Ventanas, en un ejemplo** (MIN = 300; lecturas de Cita 120/día; línea base cerrada el día 3 con 360): ventana 1 = días 4–6, ventana 2 = días 7–9, «en curso» = día 10 con 120 de 300. Con la llegada del juicio el día 2 (antes del cierre): ventanas desde el día 3, sin el 2, frente a la tasa del día 1.

**Las vistas de una carga.** La Obra indexable emite dos vistas por carga (`vista-de-superficie` y `vista-de-obra`); contar eventos inflaría sus firmas. `máx(cita + superficie, obra)` por par da una por carga en toda superficie.

## Verification

**Commands:**
- `npx astro check` -- expected: 0 errores.
- `npx vitest run tests/unit/<fichero>.test.ts`, uno a uno, para cada fichero del primer criterio -- expected: verde.
- `npm test` con `/Users/hec/brainlySabiduria/.claude/v8-ralph/correr.sh` -- expected: verde.
- `npx tsx tools/medicion.ts --rapido; echo $?` -- expected: 2, sin red.

**Manual checks (if no CLI):**
- Ningún `wrangler … --remote` corrido; `medicion/`, `src/lib/vocabulario.ts` y `corpus/` sin cambios; las constantes de Héctor sin valor.

## Auto Run Result

Status: done
Blocking condition: ninguna.

**Lo implementado.** `npm run medicion` sin subcomando es la lectura de la línea base, de solo lectura. La cáscara (`tools/medicion.ts`) acepta la orden a secas —sin `MEDICION_ENDPOINT` ni aviso de interrupción— y llama a `leer` (`tools/lib/medicion.ts`), que exige sesión (2 sin ella, 1 ilegible), lee el Corpus por una función que le pasa la cáscara (`conjuntoDelCorpus(rutasDelCorpus(…))`; 1 si falla), corre las cinco consultas de `consultasDeLaLectura(hoy)` con `--remote` y `d1 info`, y para con 1 solo si no se leyó nada. `tools/lib/lineaBase.ts`, nuevo y puro, compone el informe (`componerLecturaDeMedicion`) y su texto (`lineasDeLecturaDeMedicion`): descuentos (balizas y `PASADAS_QUE_ESCRIBEN_EN_PRODUCCION`), censo y clases de fuera del censo, marcas de Obra por (ruta, jornada), tramos por `CORTES_DE_SERIE`, SM-8, superficies y continuación por zona y por unidad de línea base, Página de Cita (SM-5, SM-7, continuación, SM-3, SM-C3, SM-C5) con portada y Obra aparte, SM-12 con Facebook según `SM12_CON_FACEBOOK` y la Imagen cuadrada aparte, búsquedas (SM-6, SM-13, consultas sin resultados), líneas base con firmas (Threads y ráfaga), ventanas de `JUICIOS_POR_VENTANAS`, cuota con sus dos constantes y la frase de las metas en suspenso. El informe acaba con «Consulta: no se ha escrito nada.».

**Ficheros.**
- `src/lib/umbrales.ts` — `DESPLIEGUE_DE_LA_LECTURA` (sin valor), `SerieDeMedicion`, `CorteDeSerie`, `CorteLlegado`, `CORTES_DE_SERIE_DECLARADOS` (dos entradas de constantes, sin fecha literal), `cortesQueLlegaron`, `CORTES_DE_SERIE`, `CORTES_DE_SM8`, `PasadaEnProduccion` y `PASADAS_QUE_ESCRIBEN_EN_PRODUCCION` (vacía), `MIN_LECTURAS_DE_LINEA_BASE` (sin valor), `SM12_CON_FACEBOOK = false`, `MIN_RUTAS_DE_CITA_EN_RAFAGA = 100`, `CUOTA_DE_BYTES_POR_BASE_EN_D1 = 500 * 1000 * 1000`, cada una con quién le da valor; sigue sin importaciones.
- `src/lib/superficies.ts` — campo `lineaBase?`, `LINEA_BASE_DE_LOS_DIRECTORIOS` y `superficieDeLineaBase`; ninguna superficie cambia.
- `tools/lib/medicion.ts` — invocación con la lectura (`subcomando: null`, `USO_DE_MEDICION`), `CONSULTAS_DE_LA_LECTURA`, `QUE_LEE`, `consultasDeLaLectura`, `FORMA_DE_JORNADA`, `leerInformacionDeLaCuota` (filas y tamaño por separado), `leer`; cabecera al día y el mensaje de la huella nombra `CORTES_DE_SERIE_DECLARADOS`.
- `tools/lib/lineaBase.ts` — nuevo: la composición pura y el informe.
- `tools/medicion.ts` — la lectura en `principal` y su docblock (uso, códigos, red).
- `tools/lib/indexacion.ts` — «hoy» de `lineasDeSm11` en UTC; docblocks.
- `tests/unit/linea-base.test.ts` — nuevo: 46 pruebas con respuestas fijas (cada fila de la matriz, censo frente a prefijo, clases fuera del censo, dos superficies con la misma línea base, las cinco marcas de Obra, tramos, SM-8, SM-12 en los dos estados, SM-5/SM-7/SM-3, SM-6/SM-13, líneas base, firmas, ventanas, cuota, sinLeer, metas, cortes de `umbrales.ts`, aislamiento por `git grep`).
- `tests/unit/medicion-orden.test.ts` — invocación, las cinco sentencias, `d1 info` por separado y la cáscara (2 con `--rapido` sin `npx`, 2 sin sesión sin `MEDICION_ENDPOINT`, 1 sin nada legible, 0 con todo leído y solo `whoami`, cinco `d1 execute --remote` y `d1 info`).
- `tests/unit/medicion-secuencias.test.ts` — `leer` con efectos de mentira que lanzan ante cualquier otro efecto.
- `tests/unit/orden-de-llegada.test.ts` — la prueba estrecha: ningún SQL de `tools/` nombra el `rowid` salvo `SQL_DE_BARAJADO` y la lectura de las balizas, en `tools/lib/medicion.ts`; casos de control; el barrido ve `tools/lib/lineaBase.ts`.
- `tests/unit/indexacion.test.ts` — SM-11 con instantes UTC, la prueba de `TZ=Europe/Madrid` a las 23:30 UTC y la de `vi.doMock` de las dos constantes.
- `tests/unit/superficies.test.ts` — `superficieDeLineaBase` y que una línea base declarada junte al menos dos superficies.
- `DESPLIEGUE.md` — §3: «Leer la línea base — Historia 23.10» con «Líneas base dadas por buenas» vacío para Héctor, y las menciones «hasta la 23.10» al día.
- `AGENTS.md` — «Leer la línea base (Historia 23.10)» dentro de «Desplegar el receptor de la medición».

**Desviaciones de la letra del spec, y por qué.**
- La consulta (5) agrupa por (jornada, **ruta**, consulta), no solo por (jornada, consulta): sin la ruta no se podían descontar las pasadas en producción, y el spec pide los descuentos «para todo». Sigue siendo un recuento sin sesiones; la ruta es siempre `/buscar/`.
- La prueba de `CORTES_DE_SM8` con las dos constantes con valor no usa `vi.doMock`: la lista se compone **dentro** de `umbrales.ts` con sus propias constantes, y un mock de las exportaciones no la alcanza. Se evalúa una copia del fuente con las dos constantes con valor (posible porque `umbrales.ts` no importa nada), y comprueba antes que el fuente las declara sin valor. La de `desplieguesQueMuevenSm11` sí usa `vi.doMock`, porque `tools/lib/indexacion.ts` importa las constantes.
- La prueba de `superficies.test.ts` fija un invariante duradero (una línea base declarada junta al menos dos superficies y no se llama como otra ni como «las búsquedas») en lugar de «ninguna la declara», que la 26.3 tendría que deshacer.
- (Revisión) La línea base de los Directorios no empieza el primer día del tramo vigente, como dice el contrato para toda unidad, sino el día siguiente a `DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS` (`haceMedible` en su juicio): es lo que dice la AC de epics.md —«empieza en la primera jornada UTC completa tras la llegada en vivo que la hace medible»— y lo único que deja juzgar su continuación «frente a su línea base» y que «los Directorios entren con la 26 sin tocar la orden». Para las demás unidades no cambia nada: la llegada que las hace medibles es la de la 23, el principio del tramo.
- (Revisión) Una ventana no salta una llegada acumulando a los dos lados: el bloque en curso se corta en ella y se nombra sin juzgarse. El contrato dice «bloque de jornadas cerradas consecutivas … que salta las llegadas»; saltar sin cortar juntaba en una ventana jornadas de antes y de después del cambio que se juzga.
- (Revisión) La señal tiene un cuarto estado, «sin dirección», cuando a una de sus dos tasas le falta dirección (sin leer o sin denominador): el contrato da «se da», «salta» y «no se da», y escribir «no se da» por una ausencia contradice «ausencia antes que cero».
- (Revisión) El informe deja de callar las superficies a cero y las limita a las que tienen lectura (las que declaran una vista), como pide la AC («solo en superficies con lectura»).
- (Revisión 3) La cuota recuerda que al pasarlas las escrituras fallan en silencio, pero separa los plazos: la de filas escritas hasta las 00:00 UTC; la de tamaño hasta que se borren filas o cambie el plan. La AC lo dice de las dos («hasta las 00:00 UTC»), y de la de tamaño no es cierto; la letra del criterio queda diferida a Héctor.
- (Revisión 3) Las ventanas de un juicio cuya línea base se cerró antes de su llegada se siguen contando desde el cierre, como dice la AC, pero cada una que acaba antes de la llegada lo dice («no juzga lo que llega»).
- (Revisión 3) `Tasa` gana el estado `por-encima`, solo para SM-3 cuando la continuación pasa de uno; cada superficie da también sus acciones (todo registro se reparte, y se ve); Facebook sale en su propia línea de SM-12, «Aparte»; los valores de `umbrales.ts` se juzgan en la cáscara antes de la sesión, que el contrato pone primero: es puro y no toca nada.
- (Revisión 3) La tabla de juicios se compone con `juiciosPorVentanas(superficies)`; `JUICIOS_POR_VENTANAS`, el nombre del contrato, es la del repositorio.

**Revisión.** Primera pasada: sin hallazgos (las capas externas no habían corrido). Segunda pasada (esta), con las cinco capas externas: 20 parches (10 medios, 10 bajos), 0 diferidos, 13 rechazados; ningún intent_gap ni bad_spec. Los parches, en el registro de triaje: ventanas cortadas por una llegada, línea base de los Directorios tras su llegada (`haceMedible`), tramo vigente que empieza hoy, texto de visitante saneado (`legible`), constantes escritas a mano juzgadas (`problemasDeLaLectura`, `esJornadaReal`; la cáscara sale con 1), `wrangler` cortado por consulta, señal «sin dirección», referencia por debajo del mínimo dicha, superficies con lectura a cero, aclaración de «ya no se publica», uso de `--rapido desplegar`, guarda de la composición en la cáscara, unidades con error nombrado, «las búsquedas» reservada, continuación por zona sin salidas nombrada, `AGENTS.md` y `DESPLIEGUE.md` §3 al día, y las pruebas que faltaban (valores por omisión con `vi.doMock`, SM-C5/portada por zona/SM-6/SM-13 en ventanas, el censo de la cáscara con filas de verdad, pasada en `/buscar/`, metas y orden de las partes). Recomendación de revisión de seguimiento: `true` (parches de esta pasada: 0 altos, 10 medios, 10 bajos; puntuación 3 × 10 + 10 = 40 ≥ 5).

**Revisión 3 (segunda con las capas externas).** 25 parches (1 alto, 2 medios, 22 bajos), 1 diferido, 10 rechazados; ningún intent_gap ni bad_spec. El alto: tres pruebas fijaban valores que son de Héctor —`DESPLIEGUE_DE_LA_LECTURA` y `DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS` en `undefined`, filas en una jornada fija que el corte de la 23.11 deja fuera del tramo vigente, Facebook fuera— y habrían puesto la principal en rojo el día de darles valor; ahora siguen el valor que tengan. Los medios: «sin mínimo declarado» en la cabecera de las líneas base, como pide la AC, y la cuota de tamaño, que no se renueva a las 00:00 UTC. Los bajos, en el registro de triaje: valores de `umbrales.ts` juzgados antes de tocar D1 (también `MIN_RUTAS_DE_CITA_EN_RAFAGA` y las rutas de las pasadas), unidades que no lanzan al cargar el módulo, `legible` con más caracteres, ventanas antes de la llegada rotuladas, SM-3 que no sale negativo, salida 1 con filas sin forma, la escritura del informe esperada, `REPLACE INTO` en la prueba del `rowid`, las acciones por superficie, Facebook aparte, las notas «sin contar» y once pruebas nuevas, entre ellas las cinco consultas ejecutadas en un SQLite con la tabla de las migraciones. Recomendación de revisión de seguimiento: `true` (parches de esta pasada: 1 alto, 2 medios, 22 bajos; un alto basta, y la puntuación es 3 × 2 + 22 = 28 ≥ 5).

Ficheros que toca la revisión 3: `tools/lib/lineaBase.ts` (unidades sin lanzar, `juiciosPorVentanas`, `valoresDeLaLectura`, `problemasDeLaLectura` con la ráfaga, las rutas de las pasadas y las superficies que faltan, `por-encima`, `antesDeLaLlegada`, acciones por superficie, `nadaSeLeyo`, `legible`, textos de la cuota, los descuentos, SM-12 y las líneas base), `tools/medicion.ts` (valores juzgados antes de leer, censo con el Corpus, `nadaSeLeyo`, escritura esperada, docblock), `tests/unit/linea-base.test.ts` (+15 pruebas y las que fijaban valores de Héctor), `tests/unit/medicion-orden.test.ts` (SQL en SQLite, filas sin forma, censo en la víspera UTC), `tests/unit/orden-de-llegada.test.ts` (`REPLACE INTO`), `DESPLIEGUE.md` §3 y `AGENTS.md`.

Ficheros que tocó la revisión 2: `tools/lib/lineaBase.ts` (cortes de ventana, `haceMedible`, «sin dirección», `referenciaAcumulada`, `problemasDeLaLectura`, `esJornadaReal`, `legible`, superficies con lectura, textos), `tools/lib/medicion.ts` (`leer` recoge un `wrangler` que lanza; uso con la bandera delante), `tools/medicion.ts` (guarda de la composición; códigos), las pruebas `linea-base` (+15), `medicion-orden` (+2), `medicion-secuencias` (+2) y `superficies` (reserva de «las búsquedas»), `DESPLIEGUE.md` §3 y `AGENTS.md`.

**Verificación (revisión 3).**
- `npx astro check` — 0 errores, 0 avisos, 20 pistas, ninguna en los ficheros de la historia (335 ficheros).
- Por fichero: `linea-base` (76), `medicion-orden`, `medicion-secuencias` y `orden-de-llegada` (281 juntos), `superficies` e `indexacion` (179 juntos): en verde.
- `npm test` en segundo plano (`correr.sh`, `logs/s-23/s23-10-r2-npm-test.log`): 132 ficheros, 6.048 pruebas, en verde (687 s), con `huella`, `vocabulario`, `gestion`, `trafico` y `publicable-y-alcanzable` dentro.
- `npx tsx tools/medicion.ts --rapido; echo $?` — 2, sin red; `--rapido desplegar` — 2. Con un `npx` de mentira en el borrador (nunca `--remote` de verdad): sale 0 y el informe lleva la cuota con los dos plazos, Facebook «Aparte» y «sin mínimo declarado; ninguna se cierra».
- A mano: ningún `wrangler … --remote` corrido; `git diff 6ae8a9a7a86b876414fbea20ab20344b3f173da0 -- src/lib/vocabulario.ts medicion/ tools/ingreso.ts tools/lib/ingresos.ts corpus/` vacío; `src/lib/umbrales.ts` no se toca en esta pasada: `MIN_LECTURAS_DE_LINEA_BASE`, `DESPLIEGUE_DE_LA_LECTURA`, `PASADAS_QUE_ESCRIBEN_EN_PRODUCCION` y `SM12_CON_FACEBOOK` siguen en `undefined`, `undefined`, `[]` y `false`, y ninguna entrada de `SUPERFICIES` cambia.

**Verificación (revisión 2).**
- `npx astro check` — 0 errores, 0 avisos (335 ficheros; ninguna pista en los ficheros de la historia).
- Por fichero: `linea-base` (61), `medicion-orden`, `medicion-secuencias` y `superficies` (251 juntos), `orden-de-llegada`, `indexacion`, `huella` y `vocabulario` (249 juntos): en verde.
- `npm test` en segundo plano (`correr.sh`, `logs/s-23/s23-10-r1-npm-test.log`): 132 ficheros, 6.030 pruebas, en verde (683 s), con `gestion`, `trafico` y `publicable-y-alcanzable` dentro.
- `npx tsx tools/medicion.ts --rapido; echo $?` — 2, sin red; `--rapido desplegar` — 2, «El subcomando va primero, y sin opciones: npm run medicion -- desplegar».
- A mano: ningún `wrangler … --remote` corrido; `git diff 6ae8a9a7a86b876414fbea20ab20344b3f173da0 -- src/lib/vocabulario.ts medicion/ tools/ingreso.ts tools/lib/ingresos.ts corpus/` vacío; `src/lib/umbrales.ts` no se toca en esta pasada, así que `MIN_LECTURAS_DE_LINEA_BASE`, `DESPLIEGUE_DE_LA_LECTURA`, `PASADAS_QUE_ESCRIBEN_EN_PRODUCCION` y `SM12_CON_FACEBOOK` siguen en `undefined`, `undefined`, `[]` y `false`, y ninguna entrada de `SUPERFICIES` cambia.

**Riesgos que quedan.**
- La lectura no se ha corrido nunca contra el D1 de producción (lo prohíbe la historia): la forma de lo que contesta `wrangler` 4.151.1 a `d1 execute --json` y a `d1 info --json` es la que ya leen `desplegar` y `comprobar`, y `database_size` se supone en bytes, como lo documenta `wrangler`. La primera lectura de verdad es de la 23.11.
- Leer filtra solo por `jornada < hoy`: cada lectura recorre la tabla entera cinco veces y devuelve toda la historia agrupada, que crece con jornadas × rutas; con el tráfico de hoy cabe de sobra en el tope de 64 MB de la cáscara, y un `wrangler` que se pase ya no tumba la lectura (va a «Sin leer»), pero una cota inferior por tramo será necesaria si la tabla crece. La cuota de lectura de D1 sigue sin informar (diferida).
- Las series son tres (`sm8`, `lectura`, `busqueda`): la llegada de la 25.2, que solo mueve el numerador de SM-5, partiría la `lectura` entera si entrara así; su historia decide si añade una serie propia de SM-5 (que tocaría `tools/lib/lineaBase.ts`).
- «ya no se publica» sigue juntando lo retirado con las erratas con forma de página: el informe lo dice, pero no las separa.
- El informe es largo y lista todas las superficies con lectura, marcas y destinos, también a cero; su formato no lo fija ningún criterio más allá de lo que prueban los tests.
- La prueba del SQL usa `node:sqlite`, sin bandera desde Node 22.13: el CI pide `node-version: '22'`, que resuelve a la última 22.x. Con una 22 anterior fallaría al importarlo.
- El día de una llegada de la 23 y el siguiente, la prueba de la cáscara con el censo de verdad no tiene jornada cerrada en el tramo vigente, y comprueba solo que nada cuenta: el reparto contra el censo lo siguen fijando las pruebas puras.
- La letra del criterio de la cuota en `epics.md` sigue diciendo «hasta las 00:00 UTC» de las dos cuotas (diferido, pendiente de Héctor).

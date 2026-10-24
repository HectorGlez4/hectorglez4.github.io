---
title: 'Historia 23.2 — El receptor sabe guardar lo que la v8 va a medir antes de que nadie lo envíe'
type: 'feature'
created: '2026-10-24'
status: 'done'
baseline_revision: 'baa0475751f5441892fc4dbf683f2c587c5cec21'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-23-context.md'
warnings: [oversized]
deferred: []
---

<intent-contract>

## Intent

**Problem:** el vocabulario de la medición vive mezclado con la emisión en `src/lib/medicion.ts`, solo tiene los siete eventos de la v7.1 y ningún campo nuevo; D1 tiene seis columnas creadas a mano con `esquema.sql`, sin migraciones; el receptor descartaría en silencio todo lo que la v8 va a enviar (llegaría a nulo, indistinguible de un cero), y no hay orden que aplique la migración, despliegue el receptor, lo compruebe con balizas, baraje el `rowid` ni deje una huella que ate el vocabulario del repositorio a lo desplegado.

**Approach:** separar el vocabulario entero de la v8 en un módulo puro (`src/lib/vocabulario.ts`, que solo importa `destinos.ts` y `redes.ts`) del que importan receptor, guion y `tools/`; partir los destinos en enlace e imagen; escribir las migraciones `0000`/`0001`; ampliar receptor y adaptador a las seis columnas nuevas sin perder la v7.1; hacer que el guion emita por evento exactamente las claves declaradas; crear `npm run medicion -- desplegar | comprobar | local | ensayo` con su parte pura probada en Vitest; apuntar el `webServer` de Playwright a un receptor local (`wrangler dev` + D1 local); y fijar todo con la prueba de correspondencia y la de la huella, que queda en rojo a propósito hasta la 23.3.

## Boundaries & Constraints

**Always:**
- `wrangler` se invoca solo como `npx --yes wrangler@4.151.1 …` con `cwd` `medicion/`, desde una constante única de `tools/lib/medicion.ts`; todo `d1 execute`/`d1 migrations` lleva `--remote` o `--local` explícito (nunca ninguno, nunca los dos).
- Solo la cáscara `tools/medicion.ts` toca red, procesos y disco; `tools/lib/medicion.ts` es puro y se prueba con respuestas fijas (AD-22). Ninguna prueba toca el remoto.
- El vocabulario no copia conjuntos: `via` y el `destino` de las comparticiones usan `DESTINOS_VALIDOS`; `origen`, `REDES_VALIDAS`; el de la descarga se compone de `DESTINO_OPACO` y `DESTINO_DE_IMAGEN`. Receptor, guion, huella y balizas de prueba se derivan de `CAMPOS_DE_EVENTO`; ningún nombre de evento ni valor se escribe a mano fuera del vocabulario.
- Cada columna nueva (`via`, `zona`, `tramo`, `filtros`, `indexable`, `primera`) es `TEXT` nula fuera de sus eventos; sin `CHECK`, sin JSON, sin hora. Un valor fuera de su conjunto, o un campo fuera de su evento, se descarta sin descartar el evento; `consulta` sigue siendo solo de `busqueda-sin-resultados`.
- El receptor sigue aceptando la v7.1 tal como llega (las cinco claves, `origen` en cualquier evento, `destino`/`datos` a `null`): `origen` se guarda como hoy, en todo evento.
- El guion emite por evento **exactamente** las claves que declara el vocabulario y que ya sabe producir (`origen`, `destino`, `datos`); un campo declarado sin valor legítimo va a `null`; los pendientes (abajo) no se emiten.
- La huella solo la escribe `desplegar`. Identificadores y comentarios en español con el glosario: Lectura (el acto medido; el tipo de página es «superficie de lectura»), Salida interna, Zona, Marca de origen, Marca de difusión.

**Block If:**
- `wrangler@4.151.1` no existe en npm, o no tiene `whoami --json`, `d1 migrations apply --local|--remote`, `d1 execute --json` o `d1 info --json` (se comprueba con `--help`/`--version`, nunca contra el remoto).
- Cumplir algo exige subir `MAX_BYTES_DE_GUION` (el presupuesto en línea) o tocar el D1, el Worker o el sitio en vivo.

**Never:**
- Correr `npm run medicion -- desplegar` o `comprobar`, `wrangler deploy`, `wrangler login`, cualquier `wrangler … --remote` o `whoami` sin `--help`; escribir `medicion/huella-del-vocabulario.json` a mano; push ni fusión. Las únicas invocaciones de la orden permitidas a un agente son las que salen antes de tocar la red: subcomando o bandera desconocidos y `comprobar`/`desplegar` sin `MEDICION_ENDPOINT` (`env -u MEDICION_ENDPOINT`), además de `local` y `ensayo`.
- Producir `lectura`, `primera`, `via`, `salida-interna`/`zona`, `busqueda`/`tramo`/`filtros`, `vista-de-obra`/`indexable` desde el guion o las islas (23.5–23.9); quitar `?de=` de la dirección (23.6); pintar `facebook`, `threads` o `instagram-historia`, cambiar el constructor de X o poner límites de longitud (25.1).
- Añadir `wrangler` o `@cloudflare/workers-types` a `package.json`; `node:sqlite` en una prueba versionada; migraciones que no sean aditivas o que se reviertan; un SQL de `tools/` que ordene por `rowid` o lo lea sin `CAST(rowid AS TEXT)`.
- Editar `_bmad-output/planning-artifacts/` o `_bmad-output/specs/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Campo nuevo válido | `{evento:'salida-interna', ruta:'/', zona:'listado'}` | `Registro` con `zona:'listado'`, las demás columnas nuevas `null` | — |
| Valor ajeno / fuera de su evento | `zona:'pie'` en `salida-interna`; `zona` en `vista-de-cita`; `primera` en una vista; `via` en `copiado`; `destino:'whatsapp'` en `descarga-de-imagen` | el evento se registra; ese campo, `null` | descartar el campo, nunca el evento |
| Descarga con destino | `descarga-de-imagen` con `destino:'instagram-historia'` | se guarda | — |
| Baliza v7.1 | `{evento:'copiado', ruta, origen:'tiktok', destino:null, datos:null}` | las seis columnas de siempre como hoy (`origen:'tiktok'`), las nuevas `null` | — |
| Guion, vista marcada | `vista-de-cita` en `/cita/x/?de=instagram` | carga `{evento, ruta, origen:'instagram'}` | `?de=` ajeno → `origen:null` |
| Guion, acción | `copiado` con `?de=instagram` | carga `{evento, ruta}`: las marcas viajan solo con vistas y lectura (AD-13) | — |
| Orden mal invocada | sin subcomando, subcomando o bandera desconocidos | lo dice, sale con 2, no toca nada | — |
| Sin `MEDICION_ENDPOINT` (o sin `http(s)://`) | `desplegar` / `comprobar` | lo dice, sale con 2, antes de cualquier red | — |
| Sin sesión de `wrangler` | `whoami --json` → `loggedIn:false` | lo dice, sale con 2 | `wrangler` que no arranca → 1 |
| Receptor que no cubre | `interpretar` de la rama no guarda algo de la huella (o, sin huella, de `origin/main`) | 1, sin escribir nada remoto | nombra cada diferencia |
| Balizas no vistas o `rowid` contiguo | lo leído no casa tras los intentos, o las filas de prueba son contiguas | 1, no baraja ni escribe huella, dice qué quedó aplicado | sin reintentar migraciones |
| Barajado sin cuota | `escritas24h + 3·filas > CUOTA_DE_FILAS_ESCRITAS_POR_DIA_EN_D1` | lo dice con las cifras, 1, sin barajar ni huella | se repite otro día, nunca troceado |
| Huella | `npm test` sin fichero / con vocabulario distinto | la prueba falla nombrando la orden / cada diferencia y la orden | — |

</intent-contract>

## Code Map

- `src/lib/medicion.ts:21-73` -- hoy dueño de `EVENTOS`, `Evento`, `EVENTOS_VALIDOS`, `esEventoValido`; pasan a `vocabulario.ts` y aquí se reexportan (los importan `superficies.ts:31`, las islas, `buscar.astro` y unas diez pruebas). Se queda `EventoDeVista` (67), `puntoFinal`, `ARRANQUE_DE_MEDICION`, `guionDeMedicion` (137-164, compone `e(v,t,z)` con las cinco claves para todo evento), `versionDelGuion`, `rutaDelGuionDeMedicion`.
- `src/lib/destinos.ts:14-40` -- hoja sin importaciones (lo fija `comparticion.test.ts:224-233`): `DESTINOS_CONOCIDOS` (4), `IdDeDestino`, `DESTINO_OPACO`, `DESTINOS_VALIDOS`, `esDestinoValido`. Importadores: `medicion/receptor.ts:15`, `src/lib/medicion.ts:21`, `src/lib/compartir.ts:16,22`.
- `src/lib/redes.ts:15-32` -- hoja: `PARAMETRO_DE_ORIGEN`, `REDES_VALIDAS`, `esRedValida`.
- `src/lib/compartir.ts:24-68` -- `Destino` y `DESTINOS` (tabla de constructores **y** lista pintada); `rotuloDeDestino`. Consumidores de `DESTINOS`: `src/islands/CompartirEnlace.astro:41,64`, `tests/unit/compartir.test.ts:4,60-103`, `tests/unit/espinas-de-ux.test.ts:13,176-189`, `tests/unit/comparticion.test.ts:6,55,84`, `tests/e2e/compartir-enlace.spec.ts:4,31,43,62,73,87,125`.
- `medicion/receptor.ts:13-113` -- `Registro` (seis campos) e `interpretar`; importa de `medicion.ts`.
- `medicion/worker.ts:52-79` -- el único `INSERT` (`rowid` aleatorio de la 23.12, seis `?`) y su `bind`; el comentario de las líneas 53-62 se conserva.
- `medicion/esquema.sql`, `medicion/wrangler.toml` -- seis columnas y dos índices; bloque `[[d1_databases]]` sin `migrations_dir`. No existe `medicion/migrations/`.
- `src/pages/medicion/[version].js.ts:30-42` -- para el build si el fichero pasa de `MAX_BYTES_GUION_DE_MEDICION` (`src/lib/umbrales.ts:198-205`, «Medido: 920 bytes» con el punto final de producción `https://medicion-sabiduria-de-bolsillo.sabiduriadebolsillo.workers.dev`; un prototipo de la composición por evento midió 1.249).
- `tests/unit/ayuda/medicion.ts` -- sandbox del guion (`emitir(evento, datos, destino)`, `busqueda` para `?de=`, `balizas()`); `tests/unit/ayuda/d1.ts` -- `d1QueApunta`, `peticionAlReceptor`, `sqlNeutralizado`, `listaTras`.
- Pruebas que cambian con la forma: `tests/unit/receptor.test.ts:17-28,53-60,96-109,162-183` (forma del `Registro`, importación del vocabulario); `tests/unit/comparticion.test.ts:83-85,112-123,127-148,185-220,235-248`; `tests/unit/medicion.test.ts:64-72` (`fuentesDeSrc` exime `lib/medicion.ts`), `105-122` (lista de eventos), `162-170` (claves de `copiado`), `315-324` (origen con lo encolado), `637-642` (cadena suelta `vista-de-…`); `tests/unit/orden-de-llegada.test.ts:141-163` («seis campos»); `tests/e2e/receptor.spec.ts:273-289,293-312` (claves del registro y de la carga).
- `tests/unit/andamiaje.test.ts:181-212,319-330` -- excepciones de red de AD-22 («esas siete»): `tools/medicion.ts` hace `fetch` y entra como octava.
- `tests/unit/orden-de-llegada.test.ts` -- barre toda cadena de `tools/`: una sentencia que ordena no nombra `rowid`, no lleva huecos ni deja el `ORDER BY` sin término. El SQL nuevo no ordena.
- `tools/avisar.ts:49-140` -- patrón de cáscara con `execFile`/`spawn` y copia temporal fuera del árbol; `tools/lib/cli.ts` -- `posicionales`, `motivosDeArgumentosNoReconocidos`.
- `playwright.config.ts:27-36` -- `webServer` único, sin `MEDICION_ENDPOINT`; `tests/e2e/receptor.spec.ts` y las pruebas que construyen su sitio no lo usan. No hay construcción de Lighthouse en el repositorio: es la medida a mano de la 23.11.
- `DESPLIEGUE.md` §3 -- 393 («aún por construir»), 412-418 (crear con `--file=esquema.sql`), 539-544 («No hay migración»), 546-627 (comprobaciones a mano). `AGENTS.md:23-27` (Playwright), escollos. `.gitignore` sin `medicion/.wrangler/`.
- `wrangler` 4.152 en caché (`~/.npm/_npx`): `whoami --json` falla con `{loggedIn:false}` sin sesión; `d1 info --json` da `rows_written_24h` (últimas 24 h, por horas); `migrations apply` confirma solo sin TTY y escribe en `d1_migrations`.

## Tasks & Acceptance

**Execution:**
- `src/lib/destinos.ts` -- `DESTINOS_DE_ENLACE` = `whatsapp, telegram, x, correo, facebook, threads` (sustituye a `DESTINOS_CONOCIDOS`; `IdDeDestino` pasa a ser su tipo), `DESTINO_DE_IMAGEN = 'instagram-historia'`, `DESTINOS_VALIDOS` = enlace + imagen + `opaco`; sigue sin importaciones -- FR-20, AD-13.
- `src/lib/vocabulario.ts` (nuevo) -- eventos (los siete + `vista-de-obra`, `lectura`, `salida-interna`, `busqueda`), `PARAMETRO_DE_ORIGEN` (reexportado) y `PARAMETRO_DE_DIFUSION = 'via'`, `ZONAS` (las dieciséis de `EXPERIENCE.md § Zonas de salida interna`), `TRAMOS` con cortes y rótulos y `tramoDe(total)`, `FILTROS` y `filtrosUsados({autor, obra, tema})` (null si hay Obra sin Autor), `MARCAS_DE_OBRA`, `PRIMERA`, `METRICA_DE_ACCION`, `DESTINOS_DE_DESCARGA`, `CAMPOS_DE_EVENTO` y `CLAVE_EN_LA_BALIZA` (Design Notes); solo importa las dos hojas; comentario junto a `TRAMOS`: cambiarlos mueve la huella y exige entrada en la lista de cortes de serie (23.10) -- AD-13, un solo dueño.
- `src/lib/medicion.ts` -- reexporta de `vocabulario.ts`; `guionDeMedicion` compone desde `CAMPOS_DE_EVENTO`: `origen` solo en los eventos que lo declaran, `destino` cotejado con el conjunto de su evento, `datos` solo en el que declara `consulta`, ninguna otra clave; comentarios al día -- AD-13, prueba de correspondencia.
- `src/lib/umbrales.ts` -- si el fichero, con el punto final de producción, pasa de `MAX_BYTES_GUION_DE_MEDICION`, subirlo a medida + ~400 en este diff; en todo caso, comentario con la medida nueva y por qué creció. Añadir `CUOTA_DE_FILAS_ESCRITAS_POR_DIA_EN_D1 = 100_000` (plan gratuito, «Cuotas del receptor» de la espina; cada índice cuenta una fila) -- AD-9.
- `src/lib/compartir.ts` -- `CONSTRUCTORES: { readonly [Id in IdDeDestino]: Destino }` con los seis (Facebook `https://www.facebook.com/sharer/sharer.php?u=` solo con el enlace, excepción declarada; Threads `https://www.threads.com/intent/post?text=&url=`) y `DESTINOS_OFRECIDOS` (los cuatro de hoy, en su orden, sacados de `CONSTRUCTORES`); `DESTINOS` desaparece -- el bloque de hoy idéntico.
- `src/islands/CompartirEnlace.astro`, `tests/e2e/compartir-enlace.spec.ts`, `tests/unit/compartir.test.ts`, `tests/unit/espinas-de-ux.test.ts` -- pasar a `DESTINOS_OFRECIDOS`; `compartir.test.ts` añade: claves de `CONSTRUCTORES` = `DESTINOS_DE_ENLACE`, ninguno para `instagram-historia` ni `opaco`, Facebook lleva el enlace y no el texto, Threads los dos, escapado; `espinas-de-ux.test.ts` exige que los `data-destino` de la Página de Cita construida sean exactamente los ofrecidos.
- `medicion/migrations/0000_tabla_de_partida.sql`, `medicion/migrations/0001_vocabulario_de_la_v8.sql` (nuevos) -- la `0000`, la tabla de producción tal cual (las seis columnas con sus tipos y `NOT NULL`, los dos índices, todo con `IF NOT EXISTS`); la `0001`, solo los seis `ALTER TABLE eventos ADD COLUMN … TEXT`, con un comentario por columna -- AD-14.
- `medicion/esquema.sql`, `medicion/wrangler.toml` -- esquema: estado acumulado (doce columnas en el orden de producción tras la `0001`, mismos índices) con cabecera «referencia; una base se crea aplicando `migrations/`»; `migrations_dir = "migrations"` en `[[d1_databases]]`.
- `medicion/receptor.ts` -- importa de `vocabulario.ts`; `Registro` con las doce columnas tipadas; `interpretar` recorre `CAMPOS_DE_EVENTO` del evento (clave de la baliza por `CLAVE_EN_LA_BALIZA`, valor solo si es cadena del conjunto; `consulta` recortada como hoy) y guarda `origen` en todo evento (compatibilidad con la v7.1, comentada) -- AD-13.
- `medicion/worker.ts` -- `INSERT INTO eventos (rowid, <doce columnas en orden del esquema>) VALUES (abs(random()), ?×12)` y `bind` en ese orden; `catch` y comentario de la 23.12 intactos.
- `tools/lib/medicion.ts` (nuevo, puro) -- constantes (`WRANGLER = 'wrangler@4.151.1'`, base `medicion`, `RUTA_DE_COMPROBACION = '/__comprobacion/'`, `RUTA_DE_LA_HUELLA = 'medicion/huella-del-vocabulario.json'`, `PUERTO_DEL_RECEPTOR_LOCAL = 8787`, `FILAS_ESCRITAS_POR_FILA_BARAJADA = 3`, intentos y esperas de la comprobación); argumentos de cada orden de `wrangler`; `huellaDelVocabulario(modulo)`, `componerHuella`/`leerHuella`, `diferenciasDeHuella`; `vocabularioDeLaPrincipal(modulos)` (con `vocabulario.ts` usa `huellaDelVocabulario`; sin él, la regla de la v7.1: `origen` en todo evento, `destino` en las comparticiones, `consulta` en la búsqueda sin resultados); `coberturaDelReceptor(interpretar, vocabulario)`; `balizasDePrueba(vocabulario)` (cubren todo par evento–campo–valor, `ruta` `/__comprobacion/`) con sus filas esperadas; `cotejarFilas`; `rowidAleatorio(filas)` (`'aleatorio'` si `max−min ≥ 2^32` sobre `BigInt`, `'contiguo'`, `'insuficiente'` con menos de dos); lectores de `whoami --json`, `d1 execute --json` y `d1 info --json`; `estadoDeLaTabla(columnas, aplicadas, ficheros)`; `cabeElBarajado`; `recuentos` y `compararRecuentos(antes, despues, hoy)`; `argumentosDeMedicion(argv)` y `puntoFinalDeComprobacion(entorno)`; el parte de lo aplicado -- AD-22.
- `tools/medicion.ts` (nuevo, cáscara) + `package.json` (`"medicion": "tsx tools/medicion.ts"`) -- `desplegar`, `comprobar`, `local` y `ensayo` según Design Notes; códigos 2 (invocación, punto final, sesión) y 1 (lo demás); escribe la huella solo en el último paso de `desplegar`; no hace commit -- AD-14.
- `playwright.config.ts` -- dos `webServer`: el receptor local (`npm run medicion -- local`, URL `http://localhost:8787`) y el sitio (`npm run build && node tests/servidor.mjs` con `env: { MEDICION_ENDPOINT: 'http://localhost:8787/' }`) -- construcciones de rama contra D1 local.
- `tests/unit/vocabulario.test.ts` (nuevo) -- pureza (con el compilador de TypeScript: `vocabulario.ts` solo importa `destinos.ts` y `redes.ts`, y estas no importan nada), conjuntos (16 zonas sin repetir, `tramoDe` en 0/1/9/10/29/30/1000, seis filtros y `filtrosUsados` con Obra sin Autor → null, `METRICA_DE_ACCION` = eventos con `primera`), destinos partidos y **la prueba de correspondencia** con `PENDIENTES` (Design Notes).
- `tests/unit/migraciones.test.ts` (nuevo) -- leyendo con `sqlNeutralizado`: la `0000` son las seis columnas de partida y los dos índices con `IF NOT EXISTS`; la `0001` solo `ALTER TABLE eventos ADD COLUMN`; columnas de `0000`+`0001` en orden = las de `esquema.sql` = `jornada, evento, ruta` + las de `CAMPOS_DE_EVENTO`; índices iguales; nombres `^\d{4}_[a-z0-9_]+\.sql$`; `migrations_dir` en `wrangler.toml`.
- `tests/unit/medicion-orden.test.ts` (nuevo) -- la parte pura con respuestas fijas: cada fila de la matriz de la orden, `--remote`/`--local` en todo `d1`, versión exacta, huella (forma, diferencias nombradas, cortes que la mueven), principal v7.1 y con vocabulario, cobertura, balizas que cubren cada valor, cotejo, `rowid` (contiguo con 19 cifras, disperso, uno), cuota justa y pasada, recuentos (cerrada distinta, del día que crece, del día que mengua).
- `tests/unit/huella.test.ts` (nuevo) -- sin `medicion/huella-del-vocabulario.json` falla diciendo que la escribe `npm run medicion -- desplegar` (23.3); con ella, exige forma válida y `vocabulario` igual a `huellaDelVocabulario()`, o falla nombrando cada diferencia y la orden. Queda en rojo hasta la 23.3, a propósito.
- `tests/unit/receptor.test.ts` -- además de ajustar la forma, una prueba por cada fila del receptor en la matriz (campo nuevo válido, valor ajeno, campo fuera de su evento, descarga con y sin destino, las siete balizas de la v7.1 tal como las envía su guion, registradas igual que antes y con las columnas nuevas a `null`) y que `receptor.ts` no escribe a mano ningún evento, zona, tramo ni filtro -- el receptor nuevo no pierde nada del sitio viejo.
- Pruebas existentes del Code Map -- ajustarlas a la forma nueva, sin rebajar lo que afirman; `medicion.test.ts:315-324` pasa a «la marca de origen viaja con la vista, también tras la cola, y no con el copiado»; `andamiaje.test.ts` admite `tools/medicion.ts` como octava excepción, con su motivo; `fuentesDeSrc`, o solo la prueba de la cadena suelta, exime también `lib/vocabulario.ts`.
- `DESPLIEGUE.md` §3 -- sin «No hay migración»: orden migración → receptor → sitio; `desplegar` paso a paso con su baliza, el barajado, su coste contra la cuota (si no cabe, 1 y otro día, nunca troceado) y que se repite en cada despliegue; `comprobar`; reversión (primero el sitio, después el receptor, las migraciones nunca); base nueva solo con `wrangler d1 migrations apply`; que mientras viva la rama de la 23 el receptor no se despliega desde la principal (si se hace, la huella queda rancia y la 23.3 se repite); recuperar D1 con Time Travel (7 días gratis, 30 de pago, sobrescribe lo escrito después; ninguna orden de `tools/` restaura producción); el receptor local, `ensayo` y la construcción para Lighthouse; la Historia 2.9 ampliada sin enmendarla; las comprobaciones a mano, remitidas a la orden.
- `AGENTS.md`, `.gitignore` -- sección breve de la orden (qué hace cada subcomando, códigos, actos de Héctor), escollo «tocar `vocabulario.ts` mueve la huella: `npm test` falla hasta repetir la 23.3», la línea de Playwright con el receptor local; ignorar `medicion/.wrangler/`.

**Acceptance Criteria:**
- Given la rama terminada, when corre `npm test` (en segundo plano), then todo pasa salvo `tests/unit/huella.test.ts`, que falla con el mensaje de «sin huella versionada» y la orden que la escribe; `npx astro check` da 0 errores.
- Given el sitio construido sin punto final, when se compara el bloque de compartir de la Página de Cita, then sus `data-destino` son los cuatro de hoy, en su orden; y construido con el punto final de producción, el fichero de medición cabe en su tope.
- Given `npm run medicion -- local` en marcha, when corre `npm run medicion -- ensayo`, then sale con 0 diciendo que cada evento y cada valor del vocabulario llegó a D1 local, que el `rowid` es aleatorio y que las balizas se borraron; y `PRAGMA table_info(eventos)` del D1 local da las doce columnas en el orden de `esquema.sql`.
- Given el `webServer` nuevo, when corren en `escritorio` `pagina-de-cita`, `kit`, `compartir-enlace` y `busqueda` (y `receptor.spec.ts`, con su sitio propio), then pasan, y el D1 local guarda las vistas que emitieron las páginas.
- Given `npm run medicion -- x`, `-- desplegar --rapido` y `env -u MEDICION_ENDPOINT npm run medicion -- comprobar`, when corren, then salen con 2 sin contactar con nada.

## Spec Change Log

## Review Triage Log

### 2026-10-24 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

Las cinco capas de revisión son externas en este bucle (v8-ralph) y esta pasada no trajo
ninguna sección «## Hallazgos externos — …»: sin hallazgos que clasificar. La revisión
independiente viene después.

## Design Notes

El vocabulario, en forma (los nombres exactos los fija el código):

```ts
const MARCA_DE_ORIGEN = { valores: REDES_VALIDAS, nulo: true };
const MARCA_DE_DIFUSION = { valores: DESTINOS_VALIDOS, nulo: true };
export const CAMPOS_DE_EVENTO = {
  'vista-de-cita': { origen: MARCA_DE_ORIGEN, via: MARCA_DE_DIFUSION }, // igual vista-de-superficie y lectura
  'vista-de-obra': { origen: …, via: …, indexable: { valores: MARCAS_DE_OBRA } },
  'salida-interna': { zona: { valores: ZONAS } },
  busqueda: { tramo: { valores: rótulos de TRAMOS }, filtros: { valores: FILTROS } },
  'busqueda-sin-resultados': { consulta: { valores: 'texto' } },          // llega como `datos`
  copiado: { primera: { valores: PRIMERA } },
  'descarga-de-imagen': { destino: { valores: DESTINOS_DE_DESCARGA, nulo: true }, primera: … },
  'comparticion-de-enlace': { destino: { valores: DESTINOS_VALIDOS }, primera: … }, // igual la de imagen
};
```

Valores: rótulos `0`, `1-9`, `10-29`, `30+` (desde 0, 1, 10, 30); filtros `ninguno`, `autor`, `tema`, `autor-tema`, `autor-obra`, `autor-obra-tema`; `indexable`/`no-indexable`; `si`/`no`; zonas `cabecera`, `atribucion`, `tarjeta-de-obra`, `siguiente`, `misma-obra`, `rutas-de-salida`, `chip-de-tema`, `colecciones`, `listado`, `paginacion`, `lista-de-obras`, `resultado`, `directorio`, `cita-del-dia`, `obras-de-portada`, `autores-de-portada`.

Huella, `medicion/huella-del-vocabulario.json`, JSON con dos espacios y salto final: `{ "escritaEl": "AAAA-MM-DD" (UTC), "commit": "<40 hex de HEAD>", "vocabulario": { "eventos": { evento: { campo: { "valores": [ordenados] | "texto", "nulo": bool } } }, "claveEnLaBaliza": { "consulta": "datos" }, "tramos": [{ "desde": 0, "rotulo": "0" }, …] } }`, eventos y campos ordenados: el mismo vocabulario da el mismo texto. `npm test` compara solo `vocabulario`.

Correspondencia (`vocabulario.test.ts`): para cada evento no pendiente, el sandbox emite sin marca, con cada `?de=` válido y uno ajeno, con cada destino de su conjunto y uno ajeno, y con `datos`; las claves de cada carga, salvo `evento` y `ruta`, son **exactamente** las declaradas menos los campos pendientes (por `CLAVE_EN_LA_BALIZA`); cada valor es de su conjunto, o `null` donde `nulo` o con entrada ajena; `interpretar` de cada carga guarda cada valor en su columna, y las claves del `Registro` ⊆ columnas de `esquema.sql`. `PENDIENTES = [23.5: evento lectura y primera en copiado/descarga/comparticiones; 23.6: via en vistas y lectura; 23.7: salida-interna con zona; 23.8: busqueda con tramo y filtros; 23.9: vista-de-obra con indexable]`; la prueba exige que los campos pendientes **no** salgan (sacarlos de la lista es parte de cada historia) y cubre los siete eventos de hoy.

`desplegar`, en orden, parando en el primer fallo con 1 y el parte de lo aplicado: argumentos → `MEDICION_ENDPOINT` → `whoami --json` → `git status --porcelain -- medicion src/lib` vacío y `commit` = `git rev-parse HEAD` → referencia: la huella versionada o, sin ella (dicho), el vocabulario de `origin/main` (los módulos por `git show` a una copia temporal fuera del árbol, importados y borrados) → `coberturaDelReceptor` → recuentos «antes» (`SELECT jornada, evento, COUNT(*) … WHERE ruta <> '/__comprobacion/' GROUP BY …`) y `PRAGMA table_info(eventos)` + `d1_migrations` contra `estadoDeLaTabla` (ni la de partida ni la migrada → 1 sin aplicar) → `d1 migrations apply --remote` → `wrangler deploy` → comprobación con balizas (hasta tres intentos: borrar restos de `/__comprobacion/`, enviar con `fetch` `POST` esperando 204, leer `SELECT CAST(rowid AS TEXT) AS fila, …`, cotejar) → `rowidAleatorio` → `DELETE` de las balizas → `d1 info --json` y `cabeElBarajado` → `UPDATE eventos SET rowid = abs(random())` → recuentos «después» y `compararRecuentos` (cerradas iguales, la del día solo crece) → escribir la huella con el vocabulario de la rama. `comprobar`: las mismas tres primeras comprobaciones, la huella versionada obligatoria, balizas desde su vocabulario, cotejo, `rowid`, borrado; 1 nombrando la diferencia y «la cierra repetir la 23.3». `local`: `d1 migrations apply --local` y `wrangler dev --port 8787` en primer plano, reenviando las señales. `ensayo`: la comprobación contra `http://localhost:8787/` y `--local`, con el vocabulario de `src/lib/` como referencia.

`estadoDeLaTabla`: «de partida» es `eventos` con exactamente las columnas de la `0000` y sin la `0001` en `d1_migrations` (o sin esa tabla); «migrada», las de `esquema.sql` con la `0001` anotada; cualquier otra cosa se nombra y para la orden antes de migrar, porque `ADD COLUMN` no es idempotente. La cuota del día se estima con `rows_written_24h` de `d1 info --json`, que cubre lo escrito desde las 00:00 UTC: la estimación peca por exceso, nunca por defecto; si falta el dato, no se baraja (1).

## Verification

**Commands:**
- `npx astro check` -- expected: 0 errores.
- `npx vitest run tests/unit/vocabulario.test.ts tests/unit/migraciones.test.ts tests/unit/medicion-orden.test.ts tests/unit/receptor.test.ts tests/unit/comparticion.test.ts tests/unit/compartir.test.ts tests/unit/orden-de-llegada.test.ts tests/unit/redes.test.ts tests/unit/andamiaje.test.ts` -- expected: verde; `tests/unit/huella.test.ts` -- expected: rojo con el mensaje de «sin huella»; por fichero, `medicion.test.ts` y `espinas-de-ux.test.ts` -- expected: verde.
- `npm test` en segundo plano con `correr.sh` -- expected: un solo fallo, el de la huella.
- `npm run medicion -- local` en segundo plano; `npm run medicion -- ensayo` -- expected: 0; en `medicion/`, `npx --yes wrangler@4.151.1 d1 execute medicion --local --json --command "PRAGMA table_info(eventos)"` -- expected: doce columnas; y en local, contar, `UPDATE eventos SET rowid = abs(random())`, volver a contar -- expected: mismos recuentos. Parar el receptor y comprobar el puerto 8787 libre.
- `npx playwright test tests/e2e/receptor.spec.ts --project=escritorio`; y con el `webServer`: `pagina-de-cita`, `kit`, `compartir-enlace`, `busqueda` en `escritorio` -- expected: verde, y después, en `medicion/`, `npx --yes wrangler@4.151.1 d1 execute medicion --local --json --command "SELECT evento, COUNT(*) AS n FROM eventos GROUP BY evento"` muestra `vista-de-cita`; puertos 4321, 4399, 4400 y 8787 libres al terminar.
- `npm run medicion -- x`, `npm run medicion -- desplegar --rapido`, `env -u MEDICION_ENDPOINT npm run medicion -- comprobar` -- expected: código 2.

**Manual checks (if no CLI):**
- Con `sqlite3`, el `esquema.sql` de `main` y luego la `0000`: `.schema` idéntico; con la `0001` encima: mismas columnas que `esquema.sql` de la rama aplicado en una base vacía.
- `MAX_BYTES_GUION_DE_MEDICION` frente a `guionDeMedicion` con el punto final de producción, anotado en el comentario y en el parte.

## Auto Run Result

Status: done
Blocking condition: ninguna.

Planificación cerrada (bmad-build-auto, alto tras planificar). Contexto de la épica en caché
(`epic-23-context.md`), continuidad de la 23.1 (`done`) y de la 23.12 (ya en la rama). Decisiones
que el plan dejaba al bucle: la huella vive en `medicion/huella-del-vocabulario.json`, JSON
canónico; la cuota de escritura entra con nombre en `umbrales.ts`; `local` y `ensayo` permiten
probar la orden contra `wrangler dev` sin tocar producción. Al cerrar la historia, la prueba de la
huella queda en rojo a propósito hasta la 23.3.

### Implementación (2026-10-24)

**Qué se hizo.** El vocabulario entero de la v8 sale a `src/lib/vocabulario.ts`, puro, que solo
importa `destinos.ts` y `redes.ts` y nombra sus conjuntos sin copiarlos: once eventos, las 16
zonas, los tramos con `tramoDe`, los seis filtros con `filtrosUsados`, la marca de Obra,
`primera`, `METRICA_DE_ACCION`, `DESTINOS_DE_DESCARGA`, `CAMPOS` (en orden de columna),
`CAMPOS_DE_EVENTO` y `CLAVE_EN_LA_BALIZA`. `medicion.ts` lo reexporta y compone el guion por
evento desde `CAMPOS_DE_EVENTO`: emite solo `EVENTOS_DEL_GUION` (los siete de hoy) y, de cada
uno, solo los campos que sabe producir (`origen`, `destino`, `consulta`→`datos`); las acciones
ya no llevan la Marca de origen. Los destinos se parten en enlace (seis, con constructor en
`CONSTRUCTORES`, Facebook solo con el enlace) e imagen (`instagram-historia`); la página sigue
pintando los cuatro de siempre (`DESTINOS_OFRECIDOS`). Migraciones `0000` (tabla de producción,
`IF NOT EXISTS`) y `0001` (seis `ADD COLUMN`), `esquema.sql` como referencia acumulada y
`migrations_dir`. El receptor recorre `CAMPOS_DE_EVENTO` y guarda la Marca de origen en todo
evento (compatibilidad con la v7.1); el Worker inserta las doce columnas. `npm run medicion --
desplegar | comprobar | local | ensayo` (cáscara `tools/medicion.ts`, parte pura
`tools/lib/medicion.ts`, `wrangler@4.151.1` con `--remote`/`--local` explícito). Playwright con
dos `webServer`: el receptor local y el sitio con `MEDICION_ENDPOINT=http://localhost:8787/`.

**Ficheros.**
- `src/lib/vocabulario.ts` (nuevo) — el vocabulario cerrado de la v8.
- `src/lib/medicion.ts` — reexporta el vocabulario; `EVENTOS_DEL_GUION`, `CAMPOS_DEL_GUION`, `camposQueEmite`; guion compuesto por evento.
- `src/lib/destinos.ts` — `DESTINOS_DE_ENLACE`, `DESTINO_DE_IMAGEN`; `DESTINOS_VALIDOS` = enlace + imagen + opaco.
- `src/lib/compartir.ts` — `CONSTRUCTORES` (seis) y `DESTINOS_OFRECIDOS` (los cuatro de hoy); desaparece `DESTINOS`.
- `src/islands/CompartirEnlace.astro` — pinta `DESTINOS_OFRECIDOS`.
- `src/lib/umbrales.ts` — medida nueva del fichero de medición (1.128 bytes con el punto final de producción, 1.096 con el de pruebas; tope 1.320 sin tocar) y `CUOTA_DE_FILAS_ESCRITAS_POR_DIA_EN_D1 = 100_000`.
- `medicion/migrations/0000_tabla_de_partida.sql`, `0001_vocabulario_de_la_v8.sql` (nuevos) — las migraciones.
- `medicion/esquema.sql`, `medicion/wrangler.toml` — estado acumulado de referencia; `migrations_dir`.
- `medicion/receptor.ts` — `Registro` de doce columnas; `interpretar` desde el vocabulario.
- `medicion/worker.ts` — `INSERT` de doce columnas con `rowid` aleatorio.
- `tools/lib/medicion.ts` (nuevo) — argumentos, SQL, lectores, estado de la tabla, huella, cobertura, balizas, cotejo, `rowid`, cuota, recuentos.
- `tools/medicion.ts` (nuevo) + `package.json` — la cáscara y `npm run medicion`.
- `playwright.config.ts` — dos `webServer`.
- `tests/unit/vocabulario.test.ts`, `migraciones.test.ts`, `medicion-orden.test.ts`, `huella.test.ts` (nuevos) — pureza y conjuntos, correspondencia con `PENDIENTES`, migraciones, la orden con respuestas fijas y un `npx` de mentira, la huella.
- `tests/unit/receptor.test.ts`, `comparticion.test.ts`, `compartir.test.ts`, `espinas-de-ux.test.ts`, `medicion.test.ts`, `orden-de-llegada.test.ts`, `redes.test.ts`, `andamiaje.test.ts` — forma nueva, filas de la matriz del receptor, `tools/medicion.ts` como octava excepción de AD-22.
- `tests/e2e/receptor.spec.ts`, `compartir-enlace.spec.ts` y comentarios de `pagina-de-cita`, `pagina-de-autor`, `pagina-404`, `portada`, `seo` — forma nueva y sitio construido con punto final.
- `DESPLIEGUE.md` §3, `AGENTS.md`, `.gitignore` — la orden, la reversión, Time Travel, el receptor local; escollo de la huella; `medicion/.wrangler/` ignorado.

**Revisión.** Capas externas sin hallazgos en esta pasada: 0 parches, 0 diferidos, 0
rechazados. `followup_review_recommended: false` (parches: 0 altos, 0 medios, 0 bajos;
puntuación 0).

**Verificación.**
- `wrangler@4.151.1` existe y tiene `whoami --json`, `d1 migrations apply --local|--remote`,
  `d1 execute --json`, `d1 info --json` y `dev --port --local` (comprobado con `--version` y
  `--help`, sin tocar el remoto).
- `npx astro check` — 0 errores, 0 avisos.
- `npx vitest run` de los nueve ficheros de la Verification — 345 en verde;
  `tests/unit/huella.test.ts` — en rojo con «Sin huella versionada … La escribe `npm run
  medicion -- desplegar` (Historia 23.3)»; `medicion.test.ts` (239) y `espinas-de-ux.test.ts`
  (10) — en verde.
- `npm test` (en segundo plano) — 129 ficheros en verde y 1 en rojo, el de la huella: 5.542
  pruebas pasan, 1 falla.
- `npm run medicion -- local` + `npm run medicion -- ensayo` — 0: «75 balizas enviadas, 75 filas
  leídas, y casan … el rowid es aleatorio y las balizas se borraron». `PRAGMA table_info(eventos)`
  del D1 local — las doce columnas en el orden de `esquema.sql`. Seis balizas a mano (tres
  `vista-de-cita` y tres `copiado` con la forma v7.1, `origen: tiktok` guardado en las dos),
  recuento, `UPDATE eventos SET rowid = abs(random())` y recuento — mismos recuentos, `rowid`
  distintos. Receptor parado y 8787 libre.
- `npx playwright test receptor.spec.ts pagina-de-cita.spec.ts kit.spec.ts compartir-enlace.spec.ts
  busqueda.spec.ts --project=escritorio`, con los dos `webServer` — 98 en verde, 4 saltadas por
  sus condiciones de siempre (proyecto móvil, datos). El D1 local guardó lo que emitieron las
  páginas: 40 `vista-de-cita`, 2 `vista-de-superficie`, 4 `comparticion-de-enlace` y 8
  `busqueda-sin-resultados`. Puertos 4321, 4399, 4400, 4402 y 8787 libres al terminar.
- `npm run medicion -- x`, `-- desplegar --rapido` y `env -u MEDICION_ENDPOINT npm run medicion --
  comprobar` — código 2, sin contactar con nada.
- A mano, con `sqlite3`: el `esquema.sql` de `origin/main` y encima la `0000` — `.schema`
  idéntico; con la `0001` encima — `PRAGMA table_info` idéntico al del `esquema.sql` de la rama en
  una base vacía, y los mismos dos índices.

**Riesgos que quedan.**
- `desplegar` y `comprobar` no se han corrido contra el remoto, por diseño: los corre Héctor en la
  23.3. Su parte pura está probada con respuestas fijas; la forma de `whoami --json` y de
  `d1 info --json` (`rows_written_24h`) es la que dice la spec, no se ha visto en vivo.
- La huella queda en rojo en `npm test` hasta la 23.3, a propósito.
- Solo se corrió el subconjunto de Playwright de la spec; el resto de la suite e2e se construye
  ahora con punto final (el receptor local) y no se ha barrido entera.

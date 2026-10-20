# Revisión v8.2 — contraste con la realidad (versiones y APIs)

> Lente de vigencia sobre la pasada corta v8.2 (2026-10-20) de `ARCHITECTURE-SPINE.md`, en el árbol de trabajo sin commitear, sobre 58a4b437. Fuentes leídas: la espina, las doce últimas entradas de `.memlog.md`, la puerta (`implementation-readiness.md`, puntos 1, 4 y 5 y las notas de «Arquitectura y espina»), el PRD v8.2 (FR-56 «Lectura con acción», SM-5, SM-7, SM-8, SM-12), las resoluciones del 2026-10-19 y el código (`medicion/`, `src/lib/medicion.ts`, `src/lib/umbrales.ts`, `src/lib/huecos.ts`, `tools/lib/avisar.ts`, `tools/lib/cambios.ts`, `public/islas/imagen.js`, `src/islands/`, `package.json` y `publicar.yml`). Cada afirmación se contrastó en la web: especificaciones WHATWG y W3C, documentación de SQLite, Cloudflare, GitHub, MDN y Android, y el código fuente de Chromium y WebKit en su rama principal. Las afirmaciones de SQL se probaron además con `node:sqlite` (SQLite 3.50.1, Node v24.3.0). No se consultó el D1 de producción.

## Veredicto

**Las cinco decisiones que nombran tecnología se sostienen en lo esencial, y ninguna se apoya en una API que no exista o no funcione como dice la espina.** El `INSERT` con `rowid` explícito y `abs(random())` funciona en SQLite, y por tanto en D1. `PerformanceNavigationTiming.type === 'back_forward'` sin `pageshow.persisted` es exactamente la carga sin caché de atrás y adelante, y en todos los motores que importan. Los cinco nombres de error de `navigator.share()` son los de la especificación. Lanzar `writeText` antes de `share()` es el orden correcto en Chromium y en WebKit, comprobado en su código. Y `replaceState` dentro de un `try` está justificado.

Lo que no aguanta el contraste son **cuatro huecos de alcance medio**, y ninguno exige rehacer una decisión de Héctor:

1. **Historial.** La letra de la convención de dirección, `replaceState` en la pausa más `pushState` al asentar, duplica entradas y pierde el estado asentado anterior.
2. **`back_forward`.** La regla cubre solo el estado con el que llega la página. Según la especificación HTML, los `popstate` siguientes de ese documento recreado vuelven a estados que el documento anterior ya registró.
3. **`DataError` no lo emite nadie.** Ni Chromium ni WebKit rechazan nunca con ese nombre. Un fallo de entrega llega como `AbortError`, así que «rechazo en el último momento → descarga» no puede ocurrir después de la hoja.
4. **La promesa de `share()` en Chrome para Android puede no resolverse nunca.** Lo dice el propio código de Chromium. Si el anuncio o la emisión esperan a `share()`, se quedan colgados.

Hay un quinto hueco medio, propio del `rowid`. Una vuelta atrás del receptor, que AD-14 permite, o un despliegue del receptor v7.1 desde la principal (punto 3 de la puerta) vuelve a numerar `max(rowid)+1`. Eso reabre el orden de llegada sin que la huella lo vea.

Siete hallazgos más son bajos.

## Hallazgos

### M1 — `replaceState` en la pausa y `pushState` al asentar duplican la entrada y borran el estado anterior (convención de dirección, AD-13)

**La letra.** La convención dice: «Mientras el estado no se asienta, la reescribe con `replaceState` […], y cada estado asentado entra en el historial con `pushState`». AD-13 lo repite: «`replaceState` solo reescribe la dirección dentro de la pausa de tecleo, mientras el estado no se asienta».

**Lo que hace la API.** `replaceState` sobrescribe la entrada **activa**, y esa entrada es la del último estado asentado. La especificación HTML lo dice en las *URL and history update steps*: con `historyHandling` «replace», la entrada sustituida es la activa. Al pie de la letra pasa esto:

1. Se llega a `/buscar/` (E0) y se teclea «amor». Tras la pausa, E0 pasa a valer `?q=amor`.
2. Al asentar se crea E1, también `?q=amor`.
3. Se teclea «odio». Tras la pausa, **E1** pasa a valer `?q=odio` y «amor» desaparece del historial.
4. Al asentar se crea E2, `?q=odio`.

El historial queda así: E0 `?q=amor`, E1 `?q=odio`, E2 `?q=odio`. Cada «atrás» desde un resultado necesita una pulsación muerta, y el estado anterior ya no se puede recuperar.

**Arreglo.** Una de dos:

- Al asentar, devolver la entrada activa a la dirección del último estado asentado (`replaceState`) y después hacer `pushState` del nuevo.
- La primera reescritura tras un estado asentado es un `pushState`, las siguientes de la ráfaga son `replaceState`, y al asentar no se escribe nada.

La primera respeta mejor «nada a mitad de ráfaga» (nota *ind-3* de la puerta). Lo decide la 27.4, pero la letra de la espina hoy induce el error.

### M2 — La regla de `back_forward` cubre la llegada, no los `popstate` que la siguen (AD-13, «Sin esa caché, tampoco»)

**Lo que dice la especificación.** Las entradas creadas con `pushState` comparten el *document state* de la entrada activa («document state: activeEntry's document state», *URL and history update steps*). Cuando el documento se destruye en vez de quedar en la caché, se anula y «se crea uno nuevo en su lugar» al volver a esa entrada (*browsing-the-web*, sección de session history entry).

**El caso.** El visitante asienta «amor» (E1) y «odio» (E2), pulsa un resultado y vuelve sin caché. Se crea un documento nuevo D3 para E2, de tipo `back_forward`, y la regla da «odio» por registrado. Si pulsa «atrás» otra vez, el paso de E2 a E1 es una navegación **dentro del mismo documento**, porque comparten *document state*. Llega un `popstate` con `?q=amor` que D3 no tiene en memoria. Lo asentará de nuevo al pulsar un resultado o al ocultarse.

El sesgo cae justo en la población que la v8.2 quería corregir: los navegadores de aplicaciones Android, sin caché de atrás y adelante (ver «Verificado»).

**Arreglo.** Marcar el registro en la propia entrada del historial: el objeto de estado de `pushState`/`replaceState` lleva `{registrada: true}`.

- `history.state` sobrevive a la recreación del documento, a la recarga y a la restauración de sesión.
- No sale del navegador, así que no es un identificador (NFR-11).
- Al llegar y en cada `popstate`, un estado cuya entrada lo marca no se asienta.

La comprobación de Navigation Timing queda como respaldo, para una entrada sin objeto de estado. Esto cubre también la recarga, que hoy la regla deja fuera (B5).

### M3 — `DataError` no lo emite ningún motor: un fallo de entrega llega como `AbortError` (AD-7, «Cada rechazo de `share()` tiene conducta»)

**La especificación** sí define `DataError`: «If an error occurs starting the target or transmitting the data […] Reject […] with an "DataError"». Pero **ningún motor lo emite**:

- **Chromium** (`third_party/blink/renderer/modules/webshare/navigator_share.cc`, rama principal) solo rechaza con `kNotAllowedError` si el error es `PERMISSION_DENIED`, y con `kAbortError` en cualquier otro caso. `INTERNAL_ERROR` sale como `AbortError` con el mensaje «Share failed», y la conexión rota como `AbortError` «Internal error: could not connect to Web Share interface.».
- **WebKit** (`Source/WebCore/page/Navigator.cpp`) rechaza toda hoja no completada con `AbortError` «Abort due to cancellation of share.». Un error al leer los ficheros sale como `AbortError` «Abort due to error while reading files.» (`ShareDataReader.cpp`).

**Consecuencia.** La rama `DataError → descarga` es código muerto en los dos motores. Un fallo **después** de abrir la hoja cae en «`AbortError` no registra nada»: no hay descarga ni mensaje. El visitante solo se queda con el enlace copiado.

Eso no cumple lo que promete el PRD: «si el navegador rechaza la entrega en el último momento, la imagen se descarga, el enlace queda copiado y el sitio lo dice (FR-17)». Las tres ramas que sí llegan a la descarga, `NotAllowedError` y `TypeError`, ocurren todas **antes** de la hoja.

**Arreglo.** Escribirlo en AD-7 como límite conocido: «`DataError` se conserva por la especificación; Chromium y WebKit entregan el fallo de transmisión como `AbortError` y no se distingue de cancelar». Y que Héctor decida si lo acepta así o si la Historia ofrece la descarga también tras un `AbortError`. El mensaje no sirve para distinguir: no es interoperable. La matriz de la 25.3 debería provocar un rechazo de Instagram para verlo.

### M4 — En Chrome para Android la promesa de `share()` puede no resolverse nunca (AD-7, «las dos se esperan después»)

**El hecho.** El código de Chromium salta, solo en Android, la comprobación de «otra compartición en curso», con este comentario: «This is due to a limitation on Android, where we sometimes are not advised when the share completes. This goes against the web share spec to work around the platform-specific bug». O sea, la promesa puede quedarse pendiente para siempre. Dos consecuencias para la letra de AD-7, «`writeText` se lanza antes de `share()` […] y las dos se esperan después»:

- **El anuncio.** Si «Enlace copiado» espera a las dos promesas juntas (`Promise.all` o `await` en serie con `share()` delante), en Android puede no llegar nunca.
- **La medición.** La compartición se emite hoy al resolver (`imagen.js` 157, `ImagenDeCita.astro` 288–289). Una que no resuelve no se cuenta, y SM-7 y SM-12 quedan por debajo en Chrome para Android.

**Arreglo.**

- Precisar en AD-7 que «Enlace copiado» depende solo de que `writeText` resuelva, y que nada de la interfaz espera a `share()`.
- Declarar en SM-7 y SM-12 que la compartición de Chrome para Android es una cota inferior, o decidir otro momento de emisión. Esto último es decisión de Héctor.

Que `InvalidStateError` «se ignora» sigue siendo correcto. En Android ese rechazo no llega a producirse, porque Chromium se salta la comprobación.

### M5 — Una vuelta atrás del receptor vuelve a numerar en orden de llegada (AD-13 «Ni el orden de llegada», AD-14)

**Comprobado con `node:sqlite`.** Sin `rowid` explícito, SQLite usa `max(rowid)+1` (*autoinc.html*). Tras barajar y tras el receptor nuevo, tres `INSERT` con la forma de la v7.1 salieron al final del `ORDER BY rowid`, consecutivos y en orden de llegada (`/cita/10/ /cita/11/ /cita/12/`).

**Dos caminos permitidos o previstos pasan por ahí:**

- la reversión de AD-14, que despliega primero el sitio y después **el receptor anterior**;
- y el despliegue del receptor desde la principal mientras viva la rama de la 23, que es el riesgo del punto 3 de la puerta.

La huella de AD-14 tampoco lo ve, porque el `rowid` no es vocabulario ni columna.

**Arreglo.**

1. **Orden.** El `UPDATE` que baraja va **después** de que el receptor con `rowid` aleatorio esté en vivo. Si no, lo que entre entre medias queda secuencial.
2. **Tras una vuelta atrás.** Se repite tras toda vuelta atrás o redespliegue de un receptor anterior. Cabe en el runbook de `DESPLIEGUE.md` §3 y en la vuelta atrás de la 23.3.
3. **Pruebas.** Una prueba de `medicion/` fija el texto del `INSERT`. Además, `npm run medicion -- desplegar` comprueba con `SELECT CAST(rowid AS TEXT) … WHERE ruta = '/__comprobacion/'` que las balizas de prueba recibieron un `rowid` aleatorio. El `CAST` evita la pérdida de precisión de B1.

### B1 — D1 no tiene `BigInt` en su API: un `rowid` aleatorio no cabe en un número de JavaScript

**D1.** Su documentación dice: «D1 supports 64-bit signed INTEGER values internally, however BigInts are not currently supported in the API yet. JavaScript integers are safe up to Number.MAX_SAFE_INTEGER». `abs(random())` da valores de hasta 2⁶³−1, así que `meta.last_row_id` y la salida `--json` de `wrangler` los redondean.

**Comprobado con `node:sqlite`.** `lastInsertRowid` volvió redondeado: `4834673076997199000` frente a `…183`. Y leer el `rowid` sin `setReadBigInts(true)` lanza `ERR_OUT_OF_RANGE` («Value is too large to be represented as a JavaScript number»). Así le pasará a una prueba de Vitest que aplique las migraciones con `node:sqlite`, que es el motor que propone la nota *arq-7* de la puerta.

**Colisión.** Un `rowid` repetido da «UNIQUE constraint failed: eventos.rowid». `worker.ts` se traga el error y el evento se pierde. La probabilidad es del orden de N/2⁶³ por inserción: despreciable, pero conviene que la espina la nombre.

**Arreglo.** Una línea en AD-13: el `rowid` no se lee nunca desde JavaScript, y si hace falta, se lee con `CAST(rowid AS TEXT)` o con `BigInt`. La alternativa es acotar con `abs(random()) % 9007199254740991`, que deja el valor exacto en JavaScript y mantiene la colisión despreciable (N/2⁵³).

### B2 — El `UPDATE` que baraja cuesta tres filas escritas por fila y cuenta contra la cuota diaria

D1 cuenta como fila escrita cada escritura en un índice: «Writes that include an indexed column add one extra row written» (página de precios). Cambiar el `rowid` reescribe la entrada en los dos índices de `esquema.sql`, así que el `UPDATE` cuesta unas N × 3 filas.

El plan gratuito tiene 100.000 filas escritas al día. Si se pasan, «you will not be able to run queries against D1» hasta las 00:00 UTC, y tampoco entran los `INSERT` del receptor. Hay además un límite de 30 s por consulta.

**Arreglo.** En la orden de la 23.3:

- contar las filas antes (`SELECT count(*)` cuesta N filas leídas, de 5 millones);
- barajar un día tranquilo;
- si N × 3 se acerca a la cuota, trocear por jornada (`WHERE jornada < ?`) en varios días.

La espina ya dice que «cada índice cuenta una más». Falta aplicarlo a este `UPDATE`.

### B3 — Time Travel de D1 guarda el orden de llegada durante 7 o 30 días, y no se apaga (AD-13, AD-14)

La documentación de D1 dice: «You do not need to enable Time Travel. It is always on». Se puede restaurar a cualquier minuto de los últimos 30 días en el plan de pago, o de 7 en el gratuito. La restauración es destructiva pero se puede deshacer.

Durante esa ventana, quien tiene la cuenta puede recuperar en qué minuto llegó cada fila, también las de antes de barajar. Barajar solo surte efecto entero cuando pasa la ventana.

**Arreglo.** Nombrarlo en AD-13 como límite, igual que la «pérdida nombrada» de AD-6. Ninguna orden de `tools/` restaura en producción para leer, y el orden de llegada solo deja de ser recuperable 7 o 30 días después de barajar. No cambia la decisión.

### B4 — `pushState` comparte el límite de frecuencia con `replaceState`, y `replaceState(null, …)` borra el estado (convención de dirección)

**El límite.** La convención pone solo `replaceState` «dentro de un `try`». Pero los navegadores aplican un solo límite a las dos llamadas:

- **Safari** lanza `SecurityError` hacia las 100 llamadas en 30 s.
- **Firefox** lanza a las ~200. El bug 1995636, corregido en la 149, subió el límite.
- **Chrome** las ignora sin lanzar y deja en la consola «Throttling navigation to prevent the browser from hanging».

**Arreglo.** `pushState` también va en un `try`, y su fallo no impide asentar ni emitir la búsqueda. La especificación permite además limitar cuántas entradas guarda una página (expulsión FIFO), lo que aquí es despreciable.

**El estado.** `replaceState(datos, …)` serializa siempre `datos` (*shared history push/replace state steps*), así que pasar `null` **borra** el objeto de estado de la entrada. La función pura que quita `de` y `via` tiene que conservar `history.state`. Si se adopta el arreglo de M2, eso es obligatorio.

### B5 — Detalles de Navigation Timing que la regla de `back_forward` no dice

- **Cuándo se lee.** El `type` se lee una sola vez, al cargar el documento. Una restauración desde la caché no crea entrada de navegación nueva y conserva el tipo original. Un documento que llegó por `back_forward` y luego se restaura desde la caché sigue diciendo `back_forward`, con `persisted` verdadero.
- **Restauración de sesión.** MDN y web.dev advierten que una pestaña duplicada o restaurada tras reiniciar el navegador puede heredar `back_forward`. Darla por registrada concuerda con FR-56 («que el navegador restaure la página no registra otra»), y conviene escribirlo.
- **Recarga.** No está cubierta: tiene tipo `reload` y vuelve a asentar. Ninguna documentación de Chrome dice qué tipo da la recarga de una pestaña descartada en Android. El arreglo de M2 lo cubre. Si no se adopta, hay que declarar el sesgo.
- **Safari.** wpt.fyi no tiene resultados de Safari para `nav2-test-navigation-type-backforward.html`: la ejecución salió con 0 de 0. Que Safari dé `back_forward` en la vuelta sin caché va a la matriz de dispositivos. En Safari es el caso raro, porque su caché de atrás y adelante está encendida por omisión.

### B6 — `share()`: ninguna conducta para un nombre imprevisto, y WebKit consume la activación antes de su `TypeError` (AD-7)

**Nombres imprevistos.** «Tres caen en la descarga, y ninguno más» deja sin conducta cualquier otro rechazo: un nombre fuera de la lista, o un `TypeError` síncrono si `navigator.share` no existe. Basta escribir qué hace la isla por omisión. Lo construido hoy manda todo lo que no es `AbortError` a la descarga (`imagen.js` 160).

**Activación.** WebKit consume la activación **antes** de comprobar `canShare` (`Navigator.cpp`, `consumeTransientActivation` antes del `TypeError`). La descarga de respaldo corre entonces sin activación, y que iOS la admita sin gesto va a la matriz de la 25.3.

### B7 — Intl: la espina no nombra ninguna API, y el código sí depende de la ICU de Node

**Lo que hay.** La espina no nombra Intl en ninguna parte. El código ordena con `localeCompare(…, 'es')`, que es `Intl.Collator` (más de cuarenta usos en `src/lib/obras.ts`, `publicado.ts` y `huecos.ts`), y usa `toLocaleUpperCase('es')`. Comprobado:

- **El orden.** `Intl.Collator('es')` trata la ñ como letra propia, que es lo que AD-3 pide al orden del Directorio: «Nunez < Núñez < Nuzzo < Ñandú < Oro».
- **La ICU.** El resultado depende de la ICU que trae Node: la 77.1 en la v24.3.0 local. El CI usa `node-version: '22'` sin fijar la versión menor (`publicar.yml` 73), así que «un veredicto del build es función del commit» (AD-12) es cierto con la misma versión de Node, no entre dos. No cambia nada hoy.
- **Los millares.** `(4421).toLocaleString('es')` da «4421», sin punto, por el `minimumGroupingDigits` 2 del CLDR español. `14421` sí da «14.421». `src/lib/formato.ts` ya lo evita con `milesEnEspañol`.

**El riesgo en los anuncios.** La convención de mensajes de estado pide que la función serializada con `String(…)` «no usa nada fuera de su cuerpo», así que no puede importar `formato.ts`. Si un recuento anunciado pasa de 999, como un `/buscar/` con muchos resultados, la tentación es `toLocaleString`, y daría otra cifra que la pintada.

**Arreglo.** Una línea en la convención: los números que se anuncian se forman como `milesEnEspañol`, nunca con `Intl`.

**De paso, sobre los topes de X** (resoluciones, valores por omisión). `twitter-text` v3 pondera los caracteres: la raya (U+2014) y las comillas latinas pesan 1, pero los puntos suspensivos `…` (U+2026) y los emojis pesan 2. Contar con `.length` no basta.

## Verificado

Esto se sostiene tal como lo escribe la espina:

- **SQLite y D1, el `rowid`:**
  - Un `INSERT` puede dar el `rowid` («To specify a ROWID manually, just include it in the list of values to be inserted»), y un `UPDATE` puede cambiarlo. Probado.
  - `random()` evita a propósito −9223372036854775808 desde la 3.3.5, así que `abs(random())` no desborda nunca. La documentación lo corrigió el 2025-07-25. `abs(-9223372036854775808)` sí lanza «integer overflow», probado.
  - No hace falta migración: `ALTER TABLE … ADD COLUMN` conserva el `rowid`.
  - La tabla `eventos` no tiene clave, ni `WITHOUT ROWID`, ni `INTEGER PRIMARY KEY`.
  - **Con `WITHOUT ROWID`** el `INSERT` fallaría con «table … has no column named rowid» y se perdería cada evento en silencio. Probado. Además exige `PRIMARY KEY`, y solo se llega ahí reconstruyendo la tabla, algo que las migraciones aditivas de AD-14 no permiten.
  - **Con `INTEGER PRIMARY KEY`** la columna es alias del `rowid` y el `INSERT` sigue funcionando. Probado.
- **Cuotas de D1:** las del plan gratuito coinciden con las «Cuotas del receptor» de la espina (100.000 filas escritas al día, 5 millones leídas, 500 MB por base, cada índice cuenta una más, corte hasta las 00:00 UTC), con Time Travel de 7 días. `jornadaDe` del receptor es UTC (`toISOString().slice(0, 10)`), así que `CORTES_DE_SM8` en jornada UTC es coherente.
- **Navigation Timing:**
  - Los tipos `navigate`, `reload`, `back_forward` y `prerender` están en Chrome 57, Firefox 58, Safari 15, Safari iOS 15.1 y WebView 57 (browser-compat-data).
  - Una restauración desde la caché no crea entrada de navegación y se distingue con `pageshow.persisted`. Una vuelta sin caché crea documento nuevo con tipo `back_forward` y `persisted` falso. La condición de AD-13 es la correcta.
  - En el WebView de Android la caché de atrás y adelante es opcional por aplicación (`WebSettingsCompat.setBackForwardCacheEnabled`, androidx.webkit 1.12, condicionada a `WebViewFeature.BACK_FORWARD_CACHE`, y sus ajustes en 1.15 como experimentales). Que en los navegadores de las aplicaciones Android falte, como supone la puerta, es lo esperable.
  - GitHub Pages sirve `/buscar/` con `cache-control: max-age=600` y sin `no-store`, así que la página puede entrar en la caché de atrás y adelante (comprobado sobre el sitio en vivo).
- **`navigator.share()`:**
  - La especificación W3C define `InvalidStateError` (documento no activo o compartición en curso), `NotAllowedError` (política `web-share`, sin activación transitoria o tipo de fichero bloqueado), `TypeError` (datos inválidos o ficheros no admitidos), `AbortError` (cancelación o «no share targets available») y `DataError`.
  - `share()` consume la activación según la especificación, Chromium (`ConsumeTransientUserActivation`) y WebKit (`consumeTransientActivation`).
  - Chromium rechaza con `NotAllowedError` más de 10 ficheros, más de 50 MiB y un nombre de fichero inseguro. Un PNG del sitio no llega a ninguno.
- **El orden `writeText` y después `share()`, en el mismo turno, es el correcto en los dos motores.**
  - **Chromium** (`clipboard_promise.cc`) comprueba el foco («Document is not focused.») y toma la activación de forma síncrona al llamar a `writeText`, antes de que `share()` la consuma, y escribe sin volver a mirar el foco.
  - **WebKit** (`Clipboard.cpp`) comprueba el gesto y escribe de forma síncrona.
  - Al revés, WebKit rechazaría `writeText` por falta de activación.
- **`replaceState` en un `try`** se justifica: Safari y Firefox lanzan `SecurityError` al pasar su límite.
- **El paso final tras Pagefind (AD-9)** se puede construir tal cual: `npm run build` es `astro build && pagefind --site dist --force-language es` y el CI lo corre (`publicar.yml` 83).
- **Techos del alojamiento:** GitHub Pages admite un sitio publicado de 1 GB como mucho y corta el despliegue a los 10 minutos. Cloudflare Pages admite 20.000 ficheros por sitio en el plan gratuito y 100.000 en los de pago.

## Fuentes

- SQLite: [core functions](https://www.sqlite.org/lang_corefunc.html) · [CREATE TABLE / rowid](https://www.sqlite.org/lang_createtable.html) · [AUTOINCREMENT y elección del rowid](https://www.sqlite.org/autoinc.html)
- Cloudflare D1: [límites](https://developers.cloudflare.com/d1/platform/limits/) · [precios y filas escritas](https://developers.cloudflare.com/d1/platform/pricing/) · [Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/) · [Worker API, tipos y BigInt](https://developers.cloudflare.com/d1/worker-api/)
- HTML: [History API, shared push/replace steps](https://html.spec.whatwg.org/multipage/nav-history-apis.html) · [session history, document state](https://html.spec.whatwg.org/multipage/browsing-the-web.html)
- Navigation Timing: [MDN `PerformanceNavigationTiming.type`](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceNavigationTiming/type) · [browser-compat-data](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/PerformanceNavigationTiming.json) · [web.dev, bfcache](https://web.dev/articles/bfcache) · [wpt.fyi, navigation-type](https://wpt.fyi/api/search?q=navigation-type&label=stable) · [WebKit bug 168057](https://bugs.webkit.org/show_bug.cgi?id=168057) · [acta W3C web-perf 2019-10-17](https://w3c.github.io/web-performance/meetings/2019/2019-10-17)
- Android WebView: [WebSettingsCompat](https://developer.android.com/reference/androidx/webkit/WebSettingsCompat) · [BackForwardCacheSettings](https://developer.android.com/reference/androidx/webkit/BackForwardCacheSettings)
- Web Share: [especificación W3C](https://w3c.github.io/web-share/) · [Chromium `navigator_share.cc`](https://chromium.googlesource.com/chromium/src/+/main/third_party/blink/renderer/modules/webshare/navigator_share.cc) · [Chromium `clipboard_promise.cc`](https://chromium.googlesource.com/chromium/src/+/main/third_party/blink/renderer/modules/clipboard/clipboard_promise.cc) · [WebKit `Navigator.cpp`](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/page/Navigator.cpp) · [WebKit `ShareDataReader.cpp`](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/page/ShareDataReader.cpp) · [WebKit `Clipboard.cpp`](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/Modules/async-clipboard/Clipboard.cpp)
- Límite de frecuencia del historial: [Mozilla bug 1995636](https://bugzilla.mozilla.org/show_bug.cgi?id=1995636) · [history-throttled](https://npmjs.com/package/history-throttled) · [azukiazusa, límite de replaceState](https://azukiazusa.dev/blog/history-replacestate-rate-limit)
- Alojamiento: [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) · [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
- X: [twitter-text config v3](https://raw.githubusercontent.com/twitter/twitter-text/master/config/v3.json)

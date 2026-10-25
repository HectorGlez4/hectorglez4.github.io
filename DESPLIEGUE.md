# Despliegue

Lo que el repositorio no puede hacer solo. Todo lo demás —construir, validar el corpus,
publicar y reconstruir a diario— lo hace `.github/workflows/publicar.yml` sin intervención.

Cada apartado dice **qué queda hecho en el repositorio** y **qué hay que hacer una vez a
mano**, con el detalle suficiente para repetirlo si hubiera que rehacerlo.

## 1. El dominio propio — Historia 7.1 (LC-1)

Hecho en el repositorio:

- `public/CNAME` declara `sabiduriadebolsillo.net`. Astro copia `public/` a `dist/` en
  cada build, así que el fichero viaja en todos los despliegues, incluida la
  reconstrucción diaria. No hay ningún paso del flujo que lo escriba: si lo hubiera,
  sería algo de lo que acordarse.

  **Publicando desde un flujo, GitHub no lee ese fichero.** El `CNAME` del artefacto fija
  el dominio propio solo cuando Pages publica desde una rama; con el despliegue por
  Actions el dominio se declara en los ajustes del repositorio y el fichero queda inerte
  para el hospedaje. Se comprobó: con el fichero ya dentro del artefacto y el sitio
  desplegado, la API de Pages seguía devolviendo `"cname": null`. Sigue siendo la fuente
  del dominio **para el sitio** —`dominio.ts` lo lee—, pero no configura nada por su
  cuenta.

- `src/lib/dominio.ts` lee ese mismo fichero y compone el origen del sitio. La canónica
  de cada página y todas las entradas del sitemap lo derivan de ahí.
- `SITE_URL` puede sobrescribirlo para construir en otro origen. Se comprueba con
  contenido, no con `??`: una variable de repositorio sin definir llega como cadena
  vacía y dejaría el sitio con canónicas relativas sin que nada fallara.

  **No se define mientras el sitio corra en su propio dominio.** Ponerla con el mismo
  valor que el `CNAME` deja el dominio escrito en dos sitios, y ninguno de los dos avisa
  si divergen: las canónicas se quedarían declarando el origen viejo mientras el sitio
  responde en el nuevo. Su sitio es el provisional —una previsualización, o el propio
  `github.io` antes de que el DNS apunte al ápice— y se borra en cuanto el dominio propio
  queda puesto.

Dónde vive el sitio, y por qué el nombre del repositorio no es decorativo:

- El repositorio se llama **`hectorglez4.github.io`**. GitHub sirve un repositorio con esa
  forma en la **raíz** del dominio; cualquier otro nombre se sirve bajo `/nombre-del-repo/`.
  La diferencia no es cosmética: el sitio entero escribe rutas absolutas —`/cita/…`,
  `/islas/imagen.js`, los recursos de `_astro`, el favicon—, y bajo un subdirectorio todas
  dan 404. La alternativa sería declarar `base` en `astro.config.mjs` y prefijar cada
  enlace a mano, para deshacerlo entero el día que el dominio propio devuelva el sitio a la
  raíz. Con esta forma, el `github.io` y el dominio propio son el mismo sitio en la misma
  raíz.
- **Settings → Pages → Source** está en **GitHub Actions**, no en *Deploy from a branch*.
  Es lo que exige `publicar.yml`: con la otra opción el flujo sube el artefacto y no se
  publica nunca, sin que nada falle.

A mano, una vez (necesita la cuenta del registrador y la del repositorio):

1. En el registrador de `sabiduriadebolsillo.net`, apuntar el ápice a GitHub Pages con
   cuatro registros `A`: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`,
   `185.199.111.153`. Y `www` como `CNAME` a `hectorglez4.github.io.`, con el punto final.
2. En **Settings → Pages** del repositorio, escribir `sabiduriadebolsillo.net` en *Custom
   domain* y esperar a que la comprobación pase.

   **En este orden, y no al revés.** Fijado el dominio antes de que el DNS apunte, GitHub
   deja de servir en `github.io` y redirige a un dominio que todavía no responde: el sitio
   queda inalcanzable hasta que propague. Con el DNS puesto primero, no hay ni un minuto
   caído.
3. Marcar **Enforce HTTPS** cuando GitHub termine de emitir el certificado (tarda desde
   unos minutos hasta 24 h desde que el DNS propaga). El ajuste se guarda al instante, pero
   la redirección de `http` a `https` tarda un rato más en aplicarse; no es un fallo.
4. Si venía definida una `SITE_URL` de alguna publicación provisional, borrarla y
   reconstruir. Mientras exista manda ella, y las canónicas seguirán declarando el origen
   anterior aunque el dominio propio ya esté puesto.

Con el ápice como dominio propio, GitHub Pages redirige `www` al ápice por su cuenta; no
hay nada que configurar en el sitio para eso.

El dominio es `.net`. No afecta al posicionamiento —los gTLD se tratan por igual—, pero sí
al reconocimiento. El `.com` no está libre: es del propio proyecto, responde 402 y caduca en
julio de 2027. **Se deja caducar**, por decisión del 2026-10-04
(`docs/superpowers/specs/2026-10-04-ciclo-1-medir-y-canal-design.md` §2.4): ni se renueva ni
se redirige al `.net`; lo único que se corrige es la bio de TikTok, que todavía apunta al
`.com`. Redirigirlo tampoco sería cosa del sitio —una segunda entrada en `public/CNAME` no es
posible, y GitHub Pages sirve un solo dominio propio—, así que la decisión no deja nada
pendiente en el repositorio.

Cómo comprobar que quedó bien, sin entrar en ningún panel:

```bash
dig +short A sabiduriadebolsillo.net            # las cuatro IPs de GitHub Pages
curl -sI https://sabiduriadebolsillo.net | head -1
curl -sI https://www.sabiduriadebolsillo.net | head -1   # 301 hacia el ápice
curl -sI https://hectorglez4.github.io | head -1         # 301 hacia el ápice
curl -s https://sabiduriadebolsillo.net | grep -o '<link rel="canonical"[^>]*>'
```

### La barra final, que es la única suposición del sitio sobre el hospedaje

El sitio construye con `build.format: 'directory'` y `trailingSlash: 'always'`: publica
`tema/el-amor/index.html` y anuncia `/tema/el-amor/` en la canónica, el sitemap y el RSS.
Eso descansa en una conducta de GitHub Pages que no se declara en ningún sitio del
repositorio — que sirva la forma con barra y **redirija la otra con un 301**. El servidor
de las pruebas la imita, pero un servidor que imita no prueba nada del hospedaje: si Pages
dejara de comportarse así, la suite seguiría verde y el sitio estaría roto.

Se comprueba después de cada despliegue, y son dos líneas:

```bash
# La forma que se anuncia: 200 directo, sin salto.
curl -sI https://sabiduriadebolsillo.net/tema/el-amor/ | head -1
# La otra: 301 hacia la de arriba. Nunca 404 — eso era el defecto que esto vigila.
curl -sI https://sabiduriadebolsillo.net/tema/el-amor | grep -iE '^(HTTP|location)'
```

Y que lo anunciado sirva directo, sin redirección intermedia, en todo el sitemap:

```bash
curl -s https://sabiduriadebolsillo.net/sitemap-0.xml \
  | grep -o '<loc>[^<]*</loc>' | sed 's|</\?loc>||g' \
  | while read -r u; do
      c=$(curl -s -o /dev/null -w '%{http_code}' --max-redirs 0 "$u")
      [ "$c" = 200 ] || echo "$c $u"
    done
```

### El techo de caché del hospedaje

GitHub Pages sirve **todo** con `cache-control: max-age=600` y no ofrece forma de
cambiarlo: no hay `_headers`, ni `netlify.toml`, ni panel donde tocarlo. Se comprueba en
un segundo, y conviene comprobarlo antes de creer a nadie —este documento incluido—:

```bash
curl -sI https://sabiduriadebolsillo.net/favicon.svg | grep -i cache-control
```

Diez minutos es un techo bajo para lo que no cambia nunca. Los `.woff2` de `_astro/`
llevan el hash del contenido en el nombre —cambiar la fuente cambia la URL—, así que
podrían cachearse un año sin riesgo de servir nada rancio, y hoy se revalidan cada diez
minutos. Es lo que PageSpeed señala como «Use efficient cache lifetimes».

**No se ha arreglado, y es una decisión de hospedaje y no de código.** Lo que costaría:
poner el dominio detrás de Cloudflare —la cuenta ya existe por el receptor de la medición,
§3— cambiando los NS en el registrador y activando el proxy, y ahí sí se declara una Cache
Rule con Edge TTL largo para `/_astro/*`. Lo que costaría a cambio: el dominio deja de
resolverse solo con los registros A de GitHub, y una caída o un cambio de Cloudflare pasa
a poder tirar el sitio. Hoy el sitio depende de un proveedor; con eso dependería de dos.

Mientras tanto, lo que sí está bajo control del repositorio es **cuánto** hay que
recachear cada diez minutos, y eso se redujo de 460 KiB a ~99 KiB recortando `subsets` y
`styles` en `astro.config.mjs`. La puerta que lo mantiene es `integraciones/cobertura.ts`.

### El techo de peso del hospedaje

GitHub Pages admite **1 GB por sitio publicado**, y `dist/` crece unos 95 KB por Cita nueva
—29 KB de su página, 64 KB de su Tarjeta Social y uno de Pagefind y listados— cuando su Autor
y su Obra ya tienen página; un Autor o una Obra nuevos añaden además la suya y su Tarjeta. Pasar el
techo no se ve al construir, se ve al publicar, y sin decir cuánto sobra. Por eso
`npm run build` termina con un paso que lo mide (Historia 24.2):

```
astro build && pagefind --site dist --force-language es && tsx integraciones/peso.ts
```

**Qué mide.** La suma de los tamaños de fichero de `dist/` —bytes, no los bloques de `du`,
que dependen del disco de quien construye— **después de Pagefind**, así que `dist/pagefind/`
cuenta: es lo que sube el despliegue. El veredicto se calcula **sin** los cinco ficheros que
rotan con la jornada —`index.html`, `404.html`, `kit/index.html`, `lote/index.html` y
`rss.xml`—, que se miden y se informan aparte, para que dos construcciones del mismo commit
en días distintos den el mismo veredicto. **Salvo unos bytes, hasta la 26.2**: la Cita del
Día de la portada entra en el índice de Pagefind, y `dist/pagefind/`, que sí cuenta, cambia
con ella —entre las jornadas del 24 y el 25 de octubre de 2026, 40 ficheros de
`dist/pagefind/` (39 con nombre nuevo y `pagefind-entry.json`) y 6 bytes de lo juzgado—. El veredicto solo podría cambiar de un día a otro con el peso a esa
distancia de un umbral.

Cada construcción que llega a medir escribe por la salida normal **cinco líneas de cifras**: la
primera, el peso y el número de ficheros de todo `dist/`, y si trae `pagefind/`; después, lo
que rota, lo juzgado con lo que queda hasta el umbral siguiente, la parte de las Tarjetas
Sociales (`tarjeta/`) y el número de PNG. Las cifras no son un aviso. Si falta alguno de los
cinco que rotan, la segunda línea lo nombra: si su página cambió de ruta, el fichero nuevo se
está juzgando con el resto (y la prueba construida que exige los cinco falla en `npm test`,
antes de subir nada). Sin `dist/`, con uno vacío o con uno que solo trae lo que rota no hay
nada que juzgar: no escribe cifras —ni «0 bytes» ni un margen inventado—, lo dice y sale con 1.
Los enlaces simbólicos se siguen, como hace el empaquetado del despliegue; lo que no es fichero
ni directorio hace fallar la lectura. Lo que el empaquetado excluye por nombre (`.git`,
`.github`) aquí se cuenta: si llegara a `dist/`, el paso mediría de más y nunca de menos.

**Las constantes**, en `src/lib/umbrales.ts`:

| Constante | Valor | Al cruzarla |
|---|---|---|
| `TECHO_DE_PESO_DEL_ALOJAMIENTO` | 1.000.000.000 bytes (1 GB decimal, la lectura estricta) | Lo pone GitHub Pages; solo fija que aviso y tope quedan por debajo |
| `AVISO_DE_PESO_DE_DIST` | 786.432.000 bytes (750 MiB) | Avisa por la salida de error —en Actions, con `::warning::`— y la construcción sigue; en el flujo de publicación, despliega. No decide nada |
| `TOPE_DE_PESO_DE_DIST` | 943.718.400 bytes (900 MiB) | `npm run build` sale con 1 nombrando el peso, el tope, cuánto lo pasa y la constante —en Actions, con `::error::`—; `upload-pages-artifact` no llega y **sigue servido el sitio anterior** |
| `TOPE_DE_PNG_DE_DIST` | sin valor | Sin valor solo informa del número. Con valor, pasarlo avisa y no rompe: es el disparador de la caché de PNG que AD-16 declara como deuda |

Los bordes son estrictos: igualar el aviso no avisa, igualar el tope avisa y no rompe,
pasarlo rompe. Aviso y tope los fijó Héctor el 2026-10-24; el del PNG lo fija él cuando
quiera, en un diff de una línea.

**La cifra de base**, el 2026-10-24 con 4.420 Citas: `dist/` pesa 466.937.424 bytes
(445,3 MiB; `du` dice 485 MiB) en 15.339 ficheros; lo juzgado, 466.839.655 bytes (445,2 MiB);
las Tarjetas Sociales, 298 MiB —el 66,9 % de lo juzgado— en 5.113 ficheros; 5.116 PNG. A
95 KB por Cita, el aviso salta hacia las 7.800 Citas, el tope hacia las 9.400 y el techo
hacia las 10.000. **Son cotas, no previsiones**: cuentan solo lo que añade una Cita, y cada
Autor u Obra nuevos que traiga la siembra suma su página y su Tarjeta (otros 64 KB), así que
los umbrales pueden llegar con menos Citas, nunca con más. La Épica 24 engorda la Página de Cita: **tras la 24.6 se vuelve a medir y
Héctor revisa los valores.**

Es una construcción local, sin `MEDICION_ENDPOINT` ni `SITE_URL`. La del flujo de publicación
pesa algo más, pero desde la Historia 23.1 apenas: el emisor de la medición ya no va en línea
en cada página —eran unos 650 bytes por página, del orden de 3,5 MB con las 5.288 de
entonces—, sino en un solo fichero, `/medicion/{versión}.js` (menos de 1 KB), y lo que va en
línea es el arranque, 65 bytes que llevan también las construcciones sin punto final. Lo que
añade el punto final es ese fichero y la etiqueta que lo pide en cada página, unos 50 bytes.
El paso en CI juzga esa construcción, que es la que se despliega; la cifra de base no se
compara con la del CI. `SITE_URL` no cambia nada mientras
el sitio corra en su dominio: no se define (§1) y el origen sale del mismo `CNAME` que en local.
Si se definiera para una previsualización, cada URL absoluta de cada página —canónica, Open
Graph, JSON-LD— y del sitemap cambiaría de largo, y con ella la medida.

**Lo que el paso no mide es el empaquetado.** `upload-pages-artifact` sube `dist/` en un tar,
que añade una cabecera de 512 bytes por fichero y por directorio y rellena cada fichero hasta
un múltiplo de 512: unos 15 MB hoy y unos 29 MB a la altura del tope, porque crece con el
número de ficheros y no con su peso. Qué compara GitHub con su 1 GB —el sitio, el tar o el
artefacto comprimido— no está comprobado; los 56 MB que separan el tope del techo cubren ese
relleno aunque cuente el tar.

**El número de ficheros se informa y no tiene umbral**, pero es el dato que decide una
mudanza: Cloudflare Pages corta a **20.000 ficheros** por despliegue. Cada Cita nueva añade
unos tres —su página, su Tarjeta y su fragmento de Pagefind—, y un Autor o una Obra nuevos
otros tantos, así que con los 15.339 de hoy ese límite llegaría hacia las 6.000 Citas o antes,
mucho antes que el de peso. Si el alojamiento se
cambia a Cloudflare Pages, el límite que muerde primero es ese.

Si salta el aviso, hay margen, y **qué hacer lo decide Héctor**: adelgazar `dist/` —dos
tercios son Tarjetas Sociales— o preparar la mudanza. Una mudanza a Cloudflare Pages ya no
cabe sin adelgazar: a la altura del aviso, hacia las 7.800 Citas, `dist/` trae unos 25.000
ficheros o más, por encima de sus 20.000.

Si salta el tope, **falla toda construcción**, no solo el despliegue: la diaria —la portada, el
RSS y el Kit se quedan en el último día desplegado—, la de Playwright en local
(`playwright.config.ts` corre `npm run build` antes de servir) y la de cualquier arreglo urgente, como
retirar una Cita. No hay bandera que lo salte, a propósito: el sitio publicado no cambia hasta
que `dist/` adelgace, se mude el alojamiento o Héctor mueva el tope. La caché de PNG de AD-16
no adelgaza nada: ahorra tiempo de construcción, y por eso su disparador es un recuento y no
un peso.

## 2. Search Console — Historia 7.2 (LC-2, LC-3)

Hecho en el repositorio:

- `/robots.txt` lo sirve `src/pages/robots.txt.ts` y declara
  `https://sabiduriadebolsillo.net/sitemap-index.xml`. La URL sale del mismo módulo de
  dominio que las canónicas, así que un cambio de dominio no puede dejarla apuntando al
  anterior.
- No lleva ningún `Disallow`. Lo que no debe indexarse lo dice cada página en su etiqueta
  `robots` y queda fuera del sitemap. Bloquearlo aquí además sería contraproducente: un
  rastreador que no puede descargar la página tampoco lee su `noindex`, y la URL se queda
  indexable sin descripción y sin forma cómoda de retirarla.

A mano, una vez (necesita la cuenta de Google y la del registrador):

1. En [Search Console](https://search.google.com/search-console), **Agregar propiedad →
   Dominio** y escribir `sabiduriadebolsillo.net`.

   Se elige propiedad de **dominio**, no de prefijo de URL: cubre de una vez el ápice, el
   `www`, `http` y `https`. Con prefijo de URL harían falta cuatro propiedades y las
   métricas saldrían repartidas entre ellas, que es justo lo que impediría medir SM-1.

2. Google reconoce que el DNS está en GoDaddy y ofrece validar por **Domain Connect**:
   un botón —*Lancer la validation* / *Iniciar la validación*— que abre GoDaddy, pide
   autorización y escribe el `TXT` por su cuenta. **Es la vía que se usó** el 2026-08-19.

   **Lo que se autoriza no es solo la verificación.** GoDaddy lo anuncia literalmente:
   *«autoriser Google à activer les services Domain Verification, Gmail Setup»*. El
   `scope` de la URL lo confirma: `domain-verification+gmail-setup`. Gmail Setup es el
   servicio que escribe registros `MX` para enrutar el correo del dominio hacia Google, y
   va en el mismo paquete aunque no se haya pedido. **Se comprobó después y no escribió
   ninguno**: el dominio no tenía `MX` antes y seguía sin tenerlos al terminar. Pero es un
   paquete, no una casilla, así que la comprobación de abajo forma parte del
   procedimiento y no es opcional.

   La alternativa manual sigue disponible y es la que hay que usar si algún día el
   proveedor no se detecta: cambiar el desplegable de proveedor a *Otro*, copiar el `TXT`
   del tipo `google-site-verification=…` y añadirlo en el registrador, en el ápice (`@`),
   junto a los cuatro registros `A` de la Historia 7.1. **No se sustituye ninguno**: un
   dominio admite varios `TXT` a la vez. Escribe un registro y no concede acceso a nadie.

3. Esperar a que termine. La validación tarda un minuto y el resultado es
   *«La propiedad ha sido validada»*, con método **proveedor de nombre de dominio**.

4. **Sitemaps → Agregar sitemap**, con la URL completa
   `https://sabiduriadebolsillo.net/sitemap-index.xml`.

   Recién enviado, el estado sale como **«No se ha podido obtener el sitemap»** con cero
   páginas. **Eso no es un fallo**: la columna *Última lectura* está vacía, que es la
   señal de que Google todavía no ha ido a buscarlo. Si hubiera intentado y fallado,
   habría fecha ahí. Se recomprueba a las 24-48 h; si para entonces hay fecha de lectura
   y sigue en error, entonces sí hay algo que arreglar.

   **Enviar también el sitemap hijo, y por qué** (hecho el 2026-08-21). El índice se leyó
   sin problema el 20/08 —«Operación efectuada»—, pero las URL no viven en el índice: viven
   en `sitemap-0.xml`, al que el índice apunta. Dos días después Google **seguía sin haber
   ido a buscarlo**: *Última lectura* vacía, y la inspección de URL decía «Google no
   reconoce esta URL, última exploración: no procede». Con 219 URL publicadas, solo la
   portada estaba indexada.

   No había nada que arreglar en el sitio —la prueba en directo de Search Console responde
   «**Google tiene acceso a esta URL**», y desde fuera son 200 con `application/xml`, XML
   válido, idéntico ante el agente de Googlebot y sin `Disallow`—. Lo que faltaba era que
   Google lo pusiera en cola. La forma de conseguirlo es **enviarlo como sitemap propio**,
   además del índice, en *Añadir un sitemap*:

       https://sabiduriadebolsillo.net/sitemap-0.xml

   Un dominio admite varios sitemaps y esto no sustituye ni rompe el índice: los dos quedan
   en la lista. Recién enviado sale otra vez con *Tipo: Desconocido* y «No se ha podido
   obtener», por lo mismo de antes — todavía no lo ha leído.

   **La lección que conviene no volver a aprender:** un índice de sitemaps «correcto» no
   significa que sus hijos se hayan leído. Lo que hay que mirar es la fila del **hijo**, y la
   columna que decide es *Última lectura*, no *Estado*.

5. No borrar el registro `TXT` después. Google revalida cada cierto tiempo y la propiedad
   se cae sin avisar si el registro ya no está. Tampoco retirar la autorización de Domain
   Connect en GoDaddy: es lo que sostiene el método de validación elegido.

Cómo repetirlo o comprobarlo desde fuera:

```bash
dig +short TXT sabiduriadebolsillo.net | grep google-site-verification
dig +short MX  sabiduriadebolsillo.net   # vacío: Gmail Setup no escribió nada
dig +short A   sabiduriadebolsillo.net   # las cuatro de la Historia 7.1, intactas
curl -s https://sabiduriadebolsillo.net/robots.txt
curl -sI https://sabiduriadebolsillo.net/sitemap-index.xml | grep -i content-type
```

Las dos comprobaciones del medio existen por el paquete de Domain Connect: la de `MX`
detecta que Gmail Setup haya enrutado el correo, y la de `A` que la escritura en la zona
no haya tocado lo que sostiene LC-1. Sin ellas, autorizar el paquete es un acto a ciegas.

La otra alternativa —subir el fichero HTML de verificación a `public/`— también funciona
con este alojamiento, pero verifica solo un prefijo de URL, así que no sirve para lo que
se necesita aquí.

## 3. El receptor de la medición — Historia 7.3 (LC-4)

El sitio emite eventos desde la Historia 2.9 y hasta ahora no iban a ninguna parte. Esto
les pone receptor; no reescribe la emisión.

Se eligió **Cloudflare Workers con D1** por lo que pide el criterio: poder consultar sin
exportar nada ni pedir permiso a un tercero. D1 es SQLite y se consulta con SQL desde la
terminal. Lo que se guarda y lo que se descarta **no depende de esa elección**: vive en
`medicion/receptor.ts`, que es una función pura y no sabe dónde corre. Cambiar de
plataforma es reescribir `medicion/worker.ts`, unas treinta líneas.

Hecho en el repositorio:

- `medicion/receptor.ts` — decide qué se registra. Importa el vocabulario cerrado de
  `src/lib/vocabulario.ts` en vez de copiarlo (desde la Historia 23.2; antes, de
  `src/lib/medicion.ts`): copiado, un evento nuevo en el sitio se descartaría en silencio aquí
  y el fallo aparecería como «esa métrica está a cero» semanas más tarde. Cada campo se guarda
  solo en los eventos que lo declaran y solo si es de su conjunto; fuera de eso se descarta el
  campo, nunca el evento. La Marca de origen se sigue guardando en todo evento, como la envía
  el guion de la v7.1, para que el receptor nuevo no pierda nada del sitio viejo.

  **Corte de serie: las acciones dejan de llevar `origen` el día que se despliega el sitio de
  la v8.** Su guion manda la Marca de origen solo con las vistas y la lectura (AD-13), así que
  desde ese día `copiado`, `descarga-de-imagen` y las dos comparticiones llegan con `origen`
  nulo. Ninguna consulta de esta sección reparte acciones por red, pero una que lo haga cambia
  de sentido esa jornada: lo de antes y lo de después no se comparan. Entra en la lista de
  cortes de serie de la Historia 23.10, con la jornada de despliegue del sitio.
- `medicion/worker.ts` — el adaptador. No lee ni una cabecera de la petición: ni IP, ni
  agente de usuario, ni referente, ni el país que la plataforma regala en `request.cf`.
  Inserta con `rowid` aleatorio (`abs(random())`, Historia 23.12), así que el orden de las
  filas no es el de llegada y no encadena los eventos de una misma persona —salvo para quien
  tenga la cuenta: Time Travel de D1 restaura a cualquier minuto de los últimos 7 días, 30
  en el plan de pago, y con eso la secuencia; es la pérdida que AD-13 nombra y acepta, y
  sobrevive al barajado: lo escrito antes de barajar se puede restaurar en su orden hasta
  que ese plazo caduca—.

  La regla para quien consulte: no ordenar por `rowid` ni leerlo sin `CAST(rowid AS TEXT)`.
  Por encima de 2^53 JavaScript redondea el entero, y un `WHERE rowid = ?` con el valor
  leído como número da en otra fila o en ninguna; el texto leído se devuelve como texto,
  `WHERE rowid = CAST(? AS INTEGER)`. `tests/unit/orden-de-llegada.test.ts` vigila la
  primera mitad en `tools/`, y más estricta que la regla: una sentencia que ordena no nombra
  el `rowid` —por ningún camino, ni un alias, ni una subconsulta—, no lleva huecos (un
  `${…}`, un operando que no es literal, una variable de terminal) y no deja el `ORDER BY`
  sin término. Lo que varía va enlazado con `?` o dentro de un literal. La segunda mitad, la
  lectura, no la vigila todavía (23.10), y nada vigila las consultas a mano de esta sección.
  Sin `ORDER BY` las filas salen en un orden cualquiera: un `LIMIT` no da las primeras ni
  las últimas, y lo reciente se pide por `jornada`; ninguna consulta de esta sección
  dependía del orden de llegada.

  Cuesta espacio y escrituras. Un `rowid` aleatorio ocupa unos 9 bytes en vez de 1–3, en la
  fila y en cada entrada de los dos índices, y las inserciones dispersas llenan menos las
  páginas: con 300.000 filas parecidas a las reales, en `sqlite3`, la base ocupó en torno a
  un 20 % más (49 MB frente a 41), y barajar lo ya escrito la creció algo más (50 MB).
  Barajar reescribe cada fila y sus dos entradas de índice, unas tres filas escritas por
  fila, que D1 cuenta contra la cuota de escritura del día (AD-13). D1 admite 500 MB por
  base en el plan gratuito; el tamaño de hoy lo da `npx --yes wrangler@4.151.1 d1 info medicion`, y lo
  informará la orden de la 23.10.

  El Worker en vivo inserta así desde el **2026-10-24 a las 23:13 UTC**, cuando lo desplegó el
  primer `npm run medicion -- desplegar` (construida en la 23.2, abajo), en la 23.3 y desde la
  rama de la Épica 23, que barajó también lo ya escrito («El primer `desplegar`», abajo); hasta
  entonces numeraba en orden de llegada. El orden importa: la 23.2 baraja solo
  después de comprobar con su baliza que el receptor en vivo ya inserta con `rowid`
  aleatorio, porque barajar con el Worker viejo dejaría lo que llegue después otra vez en
  orden de llegada. Por lo mismo, una vuelta atrás del Worker a una versión anterior a la
  23.12 vuelve a numerar en orden (`max(rowid)+1`), y lo que llegue entretanto lo baraja el
  siguiente despliegue que pase la comprobación. Lo comprueba `npm run medicion -- comprobar`,
  más abajo.
- `medicion/migrations/` — el esquema, en migraciones versionadas y solo aditivas (AD-14,
  Historia 23.2), que `migrations_dir` de `wrangler.toml` señala. La `0000` es la tabla de
  producción tal cual —seis columnas: jornada, evento, ruta, origen, destino y consulta, y
  sus dos índices—, toda con `IF NOT EXISTS`: en la base de producción no hace nada. La `0001`
  añade seis columnas, solo con `ALTER TABLE … ADD COLUMN`: `via`, `zona`, `tramo`,
  `filtros`, `indexable` y `primera`. Las dos están aplicadas en producción desde el
  2026-10-24 (23.3). Las migraciones nunca se revierten.
- `medicion/esquema.sql` — el estado acumulado de las migraciones, de **referencia**: doce
  columnas. Ninguna base se crea desde él. Cada columna después de `ruta` es de unos eventos
  —`origen` y `via`, las Marcas de origen y de difusión de las vistas y la lectura (FR-22);
  `destino` de una compartición o de la descarga que impuso el navegador (FR-20); `consulta`
  de una búsqueda sin resultados (FR-8); `zona` de una salida interna; `tramo` y `filtros`
  de una búsqueda asentada; `indexable` de una vista de Obra; `primera` de una acción— y llega
  `NULL` en el resto. Ninguna lleva `CHECK`, ni JSON, ni hora: el conjunto de cada una lo
  coteja el receptor desde `src/lib/vocabulario.ts`. No hay columna de visitante porque no hay
  visitante que guardar, y la marca de tiempo es la jornada y no el instante: un instante al
  milisegundo junto a una ruta poco visitada es, en la práctica, un identificador.
- `medicion/huella-del-vocabulario.json` — la huella del vocabulario desplegado. La escribe
  solo `npm run medicion -- desplegar`, y `npm test` falla si no casa con
  `src/lib/vocabulario.ts`: así el sitio no se despliega con un vocabulario que el receptor en
  vivo no conoce (AD-14). Nunca se escribe a mano. La primera la escribió el `desplegar` del
  2026-10-24 (23.3) y entró en la rama de la Épica 23 en `6aece9a77f`.
- `[observability] enabled = false` en `wrangler.toml`. El registro de acceso de la
  plataforma guarda IP y agente de usuario; apagarlo es parte de la propiedad, no una
  opción de rendimiento.

A mano, una vez (necesita una cuenta de Cloudflare):

```bash
cd medicion
npx --yes wrangler@4.151.1 login
npx --yes wrangler@4.151.1 d1 create medicion   # copia el database_id a wrangler.toml
npx --yes wrangler@4.151.1 d1 migrations apply medicion --remote
npx --yes wrangler@4.151.1 deploy               # imprime la URL del Worker
```

Así se hizo el 2026-09-02, con `--file=esquema.sql` en lugar de las migraciones, que no
existían. **Desde la Historia 23.2 una base nueva —local, de pruebas o recreada— se crea solo
aplicando `migrations/`**, nunca desde `esquema.sql`: así tiene el mismo `d1_migrations` que
la de producción —que lo tiene desde el 2026-10-24, con la `0000` y la `0001` (23.3)— y la
siguiente migración se aplica igual en las dos. Para la base que ya existe, lo de cada día es
`npm run medicion -- desplegar`, abajo.

**El paso que no está en esa lista y para el despliegue en seco** (hecho el 2026-09-02): la
cuenta necesita un **subdominio `workers.dev`**, que se elige una sola vez y lo comparten
todos sus Workers. Una cuenta recién creada no lo tiene. `wrangler deploy` intenta
registrarlo solo tomando el nombre del Worker, y falla si está cogido —el espacio de
nombres es global para todo Cloudflare— con «could not automatically register». El
`workers/onboarding` que nombra ese error **da 404**; la página que sirve es:

    https://dash.cloudflare.com/<account-id>/workers/subdomain

Se registró `sabiduriadebolsillo`, así que la URL del receptor es
`https://medicion-sabiduria-de-bolsillo.sabiduriadebolsillo.workers.dev` — nombre del
Worker (de `wrangler.toml`) más subdominio de cuenta. El aviso de esa página sobre dejar de
enrutar es sobre **renombrar** un subdominio en uso; con cero Workers desplegados no rompe
nada. Después de confirmar, el certificado tarda unos minutos: hasta que propaga, `curl`
falla con error de TLS (código 35) y no con un HTTP, que es un síntoma que no se parece a
su causa.

Después, en el repositorio del sitio: **Settings → Secrets and variables → Actions →
Secrets**, definir `MEDICION_ENDPOINT` con la URL que imprimió `wrangler deploy`. Sin esa
variable el build no escribe el fichero de medición ni lo pide ninguna página, y el sitio no
envía un solo byte — que es como corre en desarrollo y en las pruebas. Queda el arranque en
línea (`__medir` como cola), que no envía nada.

**La medición es un fichero, y eso tiene un coste aceptado** (Historia 23.1, AD-6). El
emisor se sirve como `/medicion/{versión}.js`, con la versión sacada del contenido —el
guion y el punto final que lleva dentro—, y cada página de producto o de servicio lo pide con
`<script src defer>` en el `<head>`. `/kit` y `/lote`, ajenas, no lo piden: lo que se copia o se
descarga ahí ya no se envía, y quedan fuera de toda serie (NFR-6). Con el techo de caché de §1 (`max-age=600`), cuando el guion cambia hay una ventana
de hasta **10 minutos** en la que un visitante con la página anterior en caché pide un fichero
que el despliegue nuevo ya no sirve: ese 404 no rompe nada —el arranque encola y la página
funciona igual—, pero las vistas y acciones de esa visita **no se envían**. Se acepta: el
guion cambia pocas veces, y siempre con un despliegue. Conservar el fichero anterior en el
despliegue para cerrar esa ventana **sigue aplazado**; no hay hoy nada que lo haga.

**La Lectura y `primera`** (Historia 23.5, FR-56, AD-13). En toda carga que emite vista, el
fichero emite además, como mucho, una `lectura`: cuando la página lleva
`MIN_MS_VISIBLES_PARA_LA_LECTURA` visible (8 s, en `src/lib/umbrales.ts`; sumando los ratos en
que lo está, contados desde que el fichero se activa) o antes, a la primera `pointerdown`,
`keydown`, `wheel` o `touchmove`. Nunca por `scroll`, y ocultarse o cerrarse no la crea: una
pestaña cerrada antes de tiempo sin tocarla no se leyó. La única que sale al ocultarse es la que
la carga ya debía: si una tarea larga retrasa el temporizador y la página se oculta con los 8 s
visibles cumplidos, la lectura sale entonces en vez de perderse. Lo que no emite vista —páginas 2+,
`/buscar/` y el 404— no emite lectura; desde la 23.9 la página 1 de la Obra que no se indexa sí
emite vista, y con ella lectura (abajo, «La vista de Obra»). La lectura
lleva la ruta y las dos Marcas de llegada, como la vista (abajo). Cada acción —`copiado`,
`descarga-de-imagen` y las dos comparticiones— lleva `primera`: `si` si es la primera de su
métrica en la carga (SM-5: copiado y descarga; SM-7: las dos comparticiones) y `no` si no; la
descarga que impone el navegador, la que llega con `destino`, lleva siempre `no` y no gasta la
primera. Esa descarga no entra ni en SM-5 ni en SM-7 (las dos enmendadas en la v8.2): una carga
cuya única acción fue ella no es lectura con acción, y es a propósito. El destino lo pone la isla
de la Imagen desde la Historia 25.2; **hasta entonces la descarga impuesta llega sin destino**,
con su `primera`, y cuenta en SM-5 como si la hubiera elegido el visitante. **Las dos las decide
solo el fichero**: ninguna isla las emite ni las calcula, y `__medir('lectura')` se descarta. Una
acción que llega sin lectura —un clic sin `pointerdown`, lo que se encoló antes de que llegara el
fichero— la emite antes, así que en una superficie con lectura toda acción con `primera='si'`
**sale** detrás de su lectura, en la misma carga. Es una garantía de la emisión, no de lo
guardado: una baliza que se pierde no se reintenta, y el receptor fecha cada evento en la jornada
UTC en que llega, así que una lectura de las 23:59:59 y su acción pueden caer en jornadas
distintas. Leída por jornada, la tasa puede pasar de uno junto a medianoche; se lee sobre varias.
Volver por la caché de atrás y adelante es una carga nueva: otra lectura posible, sin Marcas de
llegada y sin vista. Por eso las lecturas no son un subconjunto de las vistas —`lecturas/vistas`
puede pasar de uno— y el reparto de lecturas por marca no casa con el de vistas: la vuelta pierde
la marca.

**Las Marcas de llegada** (Historia 23.6, FR-22, AD-13): la de origen, `?de=<red>` —de qué cuenta
propia llega la visita— y la de difusión, `?via=<destino>` —por qué botón de compartir llegó—. El
fichero las lee **una sola vez**, al activarse y antes de la vista, cada una contra su conjunto
(las redes de `src/lib/redes.ts`; `DESTINOS_VALIDOS`), así que un valor ajeno llega nulo y la
vista sale igual; y las **quita de la dirección** con `history.replaceState`, sin recargar,
conservando el resto de la búsqueda, el fragmento y el `history.state` que hubiera. Viajan con las
vistas que declara la página y con la lectura —una vista que pidiera una isla saldría sin ellas—,
y **se olvidan al emitir la lectura** y al volver por la caché de atrás y adelante, que ya
olvidaba la de origen desde la 23.5. Lo que deja de contar otra vez la misma llegada al recargar,
al copiar la dirección de la barra o al volver a ella es que **salen de la dirección**: la entrada
del historial ya no las lleva. Sin punto final no hay fichero y la dirección se queda como llegó;
si el navegador no deja escribir en el historial, también, y los eventos salen igual con sus
marcas. **Lo mismo pasa si un bloqueador impide descargar el fichero**, y ahí se paga: esa visita
no se cuenta, la marca se queda en la barra, y quien copie la dirección la difunde con ella, así
que las visitas que traiga esa copia llegan —con su fichero— como si vinieran de la cuenta o del
botón. Se acepta: quitarlas en el arranque en línea, que corre siempre, lo haría crecer contra
`MAX_BYTES_DE_GUION` en todas las páginas, y la medición sigue siendo un plano aparte del que el
sitio no depende. La canónica y `og:url` no cambian: nunca llevaron consulta. **`via` nombra el
botón, nunca a quien comparte ni a quien abre** (NFR-11): no hay identificador de por medio, y un
`?via=` inventado llega nulo. La difusión **se cuenta sobre lecturas**, nunca con la sola vista:
una llegada con `?via=` que nadie leyó no es difusión. Los botones de compartir aún no componen
`?via=` —lo hace la Épica 25—, así que hasta entonces la columna llega casi siempre nula.

**La Salida interna** (Historia 23.7, FR-56, UX-DR111): por qué enlace siguió quien leía. El
fichero escucha los clics y emite, **como mucho una por carga**, una `salida-interna` con la ruta
de la página y la **zona** del enlace —una de `ZONAS` del vocabulario, la del contenedor más
cercano que la declara con `data-zona`—, y nada más: ni el destino, ni el texto pulsado, ni las
marcas. Es salida un clic en un enlace del mismo origen a otra ruta, con el botón principal, sin
modificador, sin `download` y sin que una isla se quede con el clic; un ancla, la propia ruta con
otra búsqueda o enviar un formulario no lo son, y un enlace sin zona —o en un contenedor exento,
`data-sin-zona`— no se registra ni gasta la salida de la carga. En una superficie con lectura la
salida sale **detrás de la lectura**: si la carga aún no la había emitido —un clic sin
`pointerdown`—, la emite antes, así que toda salida de una superficie con lectura tiene su lectura
en la misma carga (con la misma salvedad de la baliza perdida y la medianoche que SM-5). Volver
por la caché de atrás y adelante es una carga nueva, con otra salida posible. **Lo que se abre en
pestaña nueva no se mide** —el clic con Control o Meta, el botón central, un `target` ajeno—, y
tampoco un clic anterior a que el fichero se active —va con `defer`, después del análisis—, así
que **toda continuación es cota inferior**: dice al menos cuánto se siguió, nunca cuánto. Al revés,
un clic cuya navegación no llega a ocurrir —se detiene, o un `beforeunload` la cancela— cuenta como
salida y gasta la de la carga: es raro y se tolera. Las páginas
2+, `/buscar/` y el 404 no emiten lectura, así que sus salidas salen **sin lectura** y ahí no se
calcula continuación: se cuentan solas. Ninguna emite vista, y así las aparta la consulta de abajo: una salida entra en la
continuación solo si su ruta tuvo vista esa jornada. **El 404 no tiene ruta propia**: se sirve en
la dirección que se pidió —la de una Cita retirada, un Autor retirado, una Obra absorbida o una
errata—, que no suele tener vista, así que sus salidas quedan entre las sin vista de la familia de
esa ruta; su «Ver esta cita» se aparta además por la zona (`cita-del-dia` fuera de la portada),
también en una ruta que aún tuvo vista ese día, como la de una Cita retirada por el despliegue de
esa misma jornada. La superficie exacta la resuelve la 23.10 contra el censo. Los chips de
respaldo de las Rutas de salida —«Explorar por tema», los Temas del sitio cuando una Cita no tiene
hermanas ni Temas propios— cuentan como `chip-de-tema`, igual que los Temas de la Cita, y el
último recurso, «Sobre {Autor}», como `rutas-de-salida`. Las zonas que coloca la Épica 23 son once —`cabecera`,
`atribucion`, `chip-de-tema`, `colecciones`, `listado`, `paginacion`, `lista-de-obras`,
`resultado`, `cita-del-dia`, `rutas-de-salida` y `autores-de-portada`—; las otras cinco del
vocabulario llegan con las Épicas 24, 26 y 28, y hasta entonces no aparecen en la tabla. Como la
lectura, la serie empieza la **primera jornada UTC completa** tras la llegada en vivo de la 23.

**La vista de Obra** (Historia 23.9, FR-51, FR-52, AD-13, SM-11): la página 1 de **toda** Obra —se
indexe o no— emite una `vista-de-obra` con la marca `indexable`, que vale `indexable` o
`no-indexable` y dice **lo mismo que el `noindex` de esa página**: las dos cosas salen de la misma
lista de rutas indexables del build (FR-52 y, si rige, la congelación de `CONGELACION_DE_OBRAS`), que
la escribe en el atributo `data-indexable` del `<html>` junto a `data-vistas`; el fichero la lee
una vez al activarse y no la calcula ni la saca de la dirección. La comprobación de
`astro:build:done` (`tools/lib/indexables.ts`) para la construcción si una página 1 de Obra sale sin
marca, si la marca contradice su `noindex` o si otra página la lleva. La **Obra indexable** emite
dos vistas, en este orden: su `vista-de-superficie` de siempre —la de SM-8, como toda agregación de
producto— y la `vista-de-obra`; la lectura sale una vez, detrás de las dos, y las dos llevan las
Marcas de llegada. La **Obra que no se indexa** emite solo la `vista-de-obra`, y con ella gana lo
que hasta la 23.9 no tenía: una **lectura** (los 8 s o la primera interacción) y sus **salidas detrás
de ella**, así que desde entonces su continuación se calcula como la de las demás. Las **páginas 2+**
de una Obra no emiten vista ni llevan marca, y sus salidas siguen saliendo solas. La lectura, las
salidas y las acciones no llevan la marca: la lleva solo la vista de Obra, y para partir lo demás por
marca se toma la de las vistas de Obra de esa ruta y jornada (la consulta de abajo). Si un despliegue
cambia la indexabilidad de una Obra, esa ruta llega la jornada del cambio con las dos marcas —y, por el
techo de caché de §1 (`max-age=600`), puede seguir llegando con la vieja hasta 10 minutos, así que un
despliegue cerca de la medianoche UTC la alarga a los primeros minutos de la jornada siguiente—, y la
consulta la aparta como `cambio`. Una vista de Obra sin marca —el fichero la manda nula si el `<html>`
no traía una de las dos, o si la pidiera una isla— no debería llegar nunca; si llega, la consulta la nombra `nula`. Como la
lectura, la serie empieza la **primera jornada UTC completa** tras la llegada en vivo de la 23; leerla
—y partir la familia Obra— desde `tools/` es de la 23.10.

**La búsqueda asentada** (Historia 23.8, FR-56, FR-8, AD-13, SM-6, SM-13): una búsqueda **cuenta
una vez, cuando se asienta**, nunca por tecla ni por repintado. La asientan tres gestos en
`/buscar/`: enviar el formulario (Enter), pulsar un resultado —con el botón principal o el central
(que lo abre en otra pestaña y da `auxclick`, no `click`), con modificador o con el teclado— y
ocultarse la página (`visibilitychange` a `hidden`, con `pagehide` de respaldo: irse a otra página,
cambiar de pestaña, cerrarla). El botón secundario abre el menú contextual y no la asienta: abrir el
resultado desde ese menú, o con el central en un navegador sin `auxclick`, la asienta al ocultarse
la página. Lo que se asienta es lo que **se ve**: el texto y los filtros de la última búsqueda que
se pintó; lo escrito cuya búsqueda aún no se pintó no cuenta, vaciar el campo no deja nada, y una
página que no se llegó a ver —abierta de fondo y cerrada sin mirarla— no asienta nada. Sale
como mucho **una `busqueda` por estado distinto en la carga** —el estado es el texto recortado en
los extremos, con sus mayúsculas, y los filtros—, y la memoria de lo ya emitido vive en la propia
isla, sin almacenamiento ni cookie, y sobrevive a la caché de atrás y adelante. Lleva el **tramo
del total** de resultados (`0`, `1-9`, `10-29`, `30+`, los `TRAMOS` del vocabulario; el total de
Pagefind, no los 30 que se pintan) y los **filtros** (`ninguno` hasta la Épica 27); nunca el texto
ni el número. Con texto y sin resultados sale además, detrás, una `busqueda-sin-resultados` con la
consulta, el único texto libre (FR-8); un filtrado sin texto que no encuentra nada va al tramo 0 y
no la emite. **Si el índice no carga** —Pagefind no se descarga, o falla al iniciarse o al buscar—
no se pinta nada y nada se asienta: no es una búsqueda (SM-6); la búsqueda siguiente, también Enter
con el mismo texto, vuelve a pedirlo —con otra dirección (`pagefind.js?1`), porque el navegador
recuerda el fallo de un módulo por la suya, o desde una instancia nueva de Pagefind, que guarda el
error de su índice en la suya—. Un trozo del índice que no llega es otra cosa: Pagefind lo anota en
la consola y sigue, la búsqueda devuelve menos resultados o ninguno, y cuenta como tal (en el tramo
0, con su `busqueda-sin-resultados`, si no queda ninguno). El aviso de ese índice que no carga es de
la Épica 27.
**Volver o recargar no cuenta otra vez**: al asentar, la isla marca su entrada del historial con un
booleano (`asentada: true` en el objeto de estado, por `history.replaceState`, sin tocar la
dirección ni abrir entrada); una llegada con `?q=` cuya entrada lleva la marca —una vuelta atrás
sin la caché, una recarga, una pestaña restaurada o duplicada— la da por registrada, y sin objeto
de estado responde Navigation Timing: `back_forward` o `reload` cuentan como registradas, cualquier
otra carga no. Se aceptan tres laxitudes: la marca es de la entrada y no del texto —la isla no
escribe `?q=` en la dirección—, así que si se llega con `?q=A` y se asienta B, volver a esa entrada
da A por registrada; volver o recargar a una búsqueda que nunca se asentó —se llegó con `?q=` y se
fue antes de asentar— la da también por registrada, y no cuenta nunca; y asentar al irse por
navegación puede no dejar la marca (el documento ya se va), y entonces responde el tipo de
navegación. El fichero envía **cada** `busqueda` que recibe: la regla de una por estado es de la
isla, no del fichero, y el fichero no lee el historial. **Sin firma ni lectura:** `/buscar/` no
emite vista ni lectura y ninguna `busqueda` se ata a una carga, así que SM-6 y SM-13 son razones de
recuentos por jornada UTC, no de sesiones, y se leen sabiéndolo: un mismo visitante que busca tres
cosas son tres asentadas. **SM-13 no es una proporción, y se desvía en los dos sentidos.** Por
debajo: un resultado abierto en otra pestaña asienta la búsqueda y su salida no se mide, y varias
búsquedas asentadas en la misma carga comparten como mucho una salida. Por encima: una salida tras
volver —restaurada de la caché, que es carga nueva para la salida (23.7) pero no para la búsqueda,
o cargada de nuevo en una entrada ya marcada— cuenta sin `busqueda` nueva; resultado, atrás y otro
resultado son una asentada y dos salidas. La razón puede pasar de 1: se compara consigo misma a lo
largo del tiempo, nunca como «la fracción de búsquedas seguidas». Como la lectura, la serie empieza
la **primera jornada UTC completa** tras la llegada en vivo de la 23.

**Corte de serie de FR-8.** Hasta la Historia 23.8 la `busqueda-sin-resultados` salía en **cada
repintado vacío** —una por pausa del tecleo, con fragmentos a medio escribir—; desde la llegada en
vivo de la 23 sale solo al asentarse un estado con texto y sin resultados, una vez por estado y
carga. Los recuentos de antes y de después no se comparan: el registro de antes trae muchos más
fragmentos y repeticiones, y la jornada de llegada es mixta, con páginas abiertas que aún llevan la
isla anterior. El de después **también puede traer fragmentos**, menos: lo que se ve al ocultarse se
asienta, así que quien cambia de pestaña o de aplicación a mitad de escribir, con «sene» pintado sin
resultados, deja esa consulta. Para curar el Corpus sirven los dos, sabiendo que un fragmento no es
una petición; para contar, desde la primera jornada UTC completa.

**Corte de serie de SM-5 y SM-7.** Antes del despliegue del sitio de la Épica 23 no hay
`lectura` y `primera` llega nula, así que las tasas por lectura empiezan la **primera jornada
UTC completa** tras la llegada en vivo, y la jornada de llegada se informa aparte: es mixta, porque
las páginas que ya estaban abiertas con el fichero anterior siguen enviando acciones sin
`primera` y ninguna lectura. No se comparan con lo anterior; las consultas de acciones a secas
siguen valiendo para su propia serie. **La llegada en vivo de la Historia 25.2 es otro corte de
SM-5**: desde entonces la descarga impuesta llega con su `destino`, lleva `no` y deja de contar
como elegida, así que el numerador baja sin que cambie nada de los visitantes; el tramo de antes
y el de después no se comparan, y su jornada de llegada también se informa aparte. Hasta que la
23.10 lea la línea base desde `tools/` —con su lista de cortes—, se miran a mano (abajo).

Consultar, sin panel de nadie:

```bash
# Vistas de Página de Cita por jornada — SM-2, SM-3.
npx --yes wrangler@4.151.1 d1 execute medicion --remote --command \
  "SELECT jornada, COUNT(*) FROM eventos WHERE evento='vista-de-cita' GROUP BY jornada ORDER BY jornada DESC LIMIT 30"

# Lo que se llevaron: copiado y descarga — SM-5, en acciones.
npx --yes wrangler@4.151.1 d1 execute medicion --remote --command \
  "SELECT evento, COUNT(*) FROM eventos WHERE evento IN ('copiado','descarga-de-imagen') GROUP BY evento"

# Lecturas por jornada — FR-56, el denominador de la v8 (Historia 23.5).
npx --yes wrangler@4.151.1 d1 execute medicion --remote --command \
  "SELECT jornada, COUNT(*) FROM eventos WHERE evento='lectura' GROUP BY jornada ORDER BY jornada DESC LIMIT 30"

# SM-5 sobre lecturas de Página de Cita: lecturas con su primera acción de SM-5 —copiado o
# descarga elegida— frente a lecturas, por jornada. Cambia AAAA-MM-DD por la primera jornada UTC
# completa del tramo (tras la llegada de la 23 o, desde ella, de la 25.2); sin cambiarla no
# devuelve nada, nunca una jornada mixta. Las rutas de Cita van aquí por el prefijo, a mano, y
# una Cita retirada sigue contando: el informe de la 23.10 las resuelve contra el censo de la
# medición, nunca por el prefijo. La portada (`ruta='/'`), la Obra y los listados se leen con la
# misma consulta cambiando el filtro de `ruta`, y no se suman a la Cita.
npx --yes wrangler@4.151.1 d1 execute medicion --remote --command \
  "SELECT jornada, SUM(evento='lectura') AS lecturas, SUM(evento IN ('copiado','descarga-de-imagen') AND primera='si') AS con_accion FROM eventos WHERE jornada >= 'AAAA-MM-DD' AND ruta LIKE '/cita/%' AND evento IN ('lectura','copiado','descarga-de-imagen') GROUP BY jornada ORDER BY jornada DESC LIMIT 30"

# SM-7 sobre lecturas de Página de Cita: lecturas con su primera compartición, por jornada. La
# misma jornada de partida (la de la 23) y el mismo prefijo que la de SM-5.
npx --yes wrangler@4.151.1 d1 execute medicion --remote --command \
  "SELECT jornada, SUM(evento='lectura') AS lecturas, SUM(evento IN ('comparticion-de-enlace','comparticion-de-imagen') AND primera='si') AS con_comparticion FROM eventos WHERE jornada >= 'AAAA-MM-DD' AND ruta LIKE '/cita/%' AND evento IN ('lectura','comparticion-de-enlace','comparticion-de-imagen') GROUP BY jornada ORDER BY jornada DESC LIMIT 30"

# Difusión por botón, sobre lecturas — Historia 23.6. Cambia AAAA-MM-DD por la primera jornada
# UTC completa tras la llegada de la 23: la de llegada es mixta, con páginas abiertas que aún
# piden el fichero anterior, que no lee `?via=`. Cuenta lecturas con `via`, nunca vistas: una
# llegada con la marca que nadie leyó no es difusión.
npx --yes wrangler@4.151.1 d1 execute medicion --remote --command \
  "SELECT jornada, via, COUNT(*) lecturas FROM eventos WHERE evento='lectura' AND via IS NOT NULL AND jornada >= 'AAAA-MM-DD' GROUP BY jornada, via ORDER BY jornada DESC, lecturas DESC LIMIT 60"

# Salidas internas por zona y lecturas, por superficie — SM-4, Historia 23.7. Cambia AAAA-MM-DD
# por la primera jornada UTC completa tras la llegada de la 23; la jornada en curso (UTC) no
# entra, que aún no ha cerrado. La superficie va aquí por el prefijo de la ruta, a mano, hasta que
# la 23.10 la resuelva contra el censo. «Ver esta cita» fuera de la portada es el 404 y sale como
# «404»; las páginas 2+ salen como «paginas-2+», separadas de la familia de su ruta. `con_vista`
# dice si la ruta tuvo vista esa jornada: las salidas sin vista —páginas 2+, `/buscar/` y el 404 en
# la ruta que se pidió— salen aparte, sin lectura, y no entran en la continuación. Desde la 23.9 la
# página 1 de toda Obra tiene vista: la Obra que no se indexa entra con su lectura y sus salidas, sin
# tocar la consulta (`GLOB 'vista-*'` ya junta la `vista-de-obra`). Es por ruta y jornada UTC, no por carga: la salida de una carga que
# cruza la medianoche —vista un día, salida al siguiente— cae entre las sin vista si su ruta no
# tuvo otra vista ese día, y una ruta retirada a mitad de jornada pone con vista las salidas de su
# 404 por la cabecera y la Atribución. Las dos cosas son raras y quedan como están hasta la 23.10.
npx --yes wrangler@4.151.1 d1 execute medicion --remote --command \
  "WITH e AS (SELECT jornada, ruta, evento, zona FROM eventos WHERE jornada >= 'AAAA-MM-DD' AND jornada < date('now')), v AS (SELECT DISTINCT jornada, ruta FROM e WHERE evento GLOB 'vista-*'), s AS (SELECT CASE WHEN e.evento='salida-interna' AND e.zona='cita-del-dia' AND e.ruta<>'/' THEN '404' WHEN e.ruta GLOB '*/[0-9]/' OR e.ruta GLOB '*/[0-9][0-9]/' OR e.ruta GLOB '*/[0-9][0-9][0-9]/' THEN 'paginas-2+' WHEN e.ruta='/' THEN 'portada' WHEN e.ruta='/buscar/' THEN 'buscar' WHEN e.ruta LIKE '/cita/%' THEN 'cita' WHEN e.ruta LIKE '/autor/%' THEN 'autor' WHEN e.ruta LIKE '/tema/%' THEN 'tema' WHEN e.ruta LIKE '/coleccion/%' THEN 'coleccion' WHEN e.ruta LIKE '/obra/%' THEN 'obra' ELSE 'otra' END AS superficie, v.ruta IS NOT NULL AS con_vista, e.evento, e.zona FROM e LEFT JOIN v ON v.jornada = e.jornada AND v.ruta = e.ruta WHERE e.evento IN ('lectura','salida-interna')) SELECT superficie, con_vista, evento, zona, COUNT(*) n FROM s GROUP BY superficie, con_vista, evento, zona ORDER BY superficie, con_vista DESC, evento, n DESC"

# La continuación por superficie — SM-4, Historia 23.7: sus salidas frente a sus lecturas, solo en
# las rutas que tuvieron vista esa jornada y sin el «Ver esta cita» del 404, desde la misma jornada
# de partida y sin la de hoy. Las vistas se juntan una vez por ruta y jornada, como arriba, y no
# fila a fila con una subconsulta: así las filas del intervalo se leen un número fijo de veces y no
# una por cada lectura y cada salida, que es lo que cuenta la cuota de lectura de D1. Es cota
# inferior: la pestaña nueva no se mide.
npx --yes wrangler@4.151.1 d1 execute medicion --remote --command \
  "WITH e AS (SELECT jornada, ruta, evento, zona FROM eventos WHERE jornada >= 'AAAA-MM-DD' AND jornada < date('now')), v AS (SELECT DISTINCT jornada, ruta FROM e WHERE evento GLOB 'vista-*'), s AS (SELECT CASE WHEN e.evento='salida-interna' AND e.zona='cita-del-dia' AND e.ruta<>'/' THEN '404' WHEN e.ruta='/' THEN 'portada' WHEN e.ruta LIKE '/cita/%' THEN 'cita' WHEN e.ruta LIKE '/autor/%' THEN 'autor' WHEN e.ruta LIKE '/tema/%' THEN 'tema' WHEN e.ruta LIKE '/coleccion/%' THEN 'coleccion' WHEN e.ruta LIKE '/obra/%' THEN 'obra' ELSE 'otra' END AS superficie, e.evento FROM e JOIN v ON v.jornada = e.jornada AND v.ruta = e.ruta WHERE e.evento IN ('lectura','salida-interna')) SELECT superficie, SUM(evento='salida-interna') salidas, SUM(evento='lectura') lecturas, ROUND(1.0 * SUM(evento='salida-interna') / NULLIF(SUM(evento='lectura'), 0), 3) continuacion FROM s WHERE superficie <> '404' GROUP BY superficie ORDER BY superficie"

# Vistas, lecturas y salidas de la página 1 de Obra, por marca y jornada UTC — Historia 23.9, SM-11.
# Cambia AAAA-MM-DD por la primera jornada UTC completa tras la llegada de la 23; la de hoy no entra.
# La lectura y la salida no llevan marca: toman la de las vistas de Obra de su ruta y jornada, y una
# ruta que ese día llegó con más de una —un despliegue cambió su indexabilidad, o la caché de 10
# minutos de §1 sirvió la página de antes pasada la medianoche— sale como `cambio`. Una vista de
# Obra sin marca cuenta como marca `nula` (`COUNT(DISTINCT …)` y `MAX` se saltarían el NULL), así que
# una ruta que la mezcla con otra sale también como `cambio`. Solo entran las rutas con vista de Obra
# esa jornada, así que las páginas 2+ quedan fuera. La Obra indexable emite además su
# `vista-de-superficie`, que aquí no se suma: es la de SM-8. Es cota inferior, como toda continuación.
# Hasta cuatro filas por jornada —las dos marcas, `cambio` y `nula`—: `LIMIT 120` da al menos las
# últimas 30 jornadas.
npx --yes wrangler@4.151.1 d1 execute medicion --remote --command \
  "WITH e AS (SELECT jornada, ruta, evento, indexable FROM eventos WHERE jornada >= 'AAAA-MM-DD' AND jornada < date('now') AND ruta LIKE '/obra/%' AND evento IN ('vista-de-obra','lectura','salida-interna')), m AS (SELECT jornada, ruta, CASE WHEN COUNT(DISTINCT COALESCE(indexable,'nula')) > 1 THEN 'cambio' ELSE COALESCE(MAX(indexable),'nula') END AS marca FROM e WHERE evento='vista-de-obra' GROUP BY jornada, ruta) SELECT e.jornada, m.marca, SUM(e.evento='vista-de-obra') vistas, SUM(e.evento='lectura') lecturas, SUM(e.evento='salida-interna') salidas, ROUND(1.0 * SUM(e.evento='salida-interna') / NULLIF(SUM(e.evento='lectura'), 0), 3) continuacion FROM e JOIN m ON m.jornada = e.jornada AND m.ruta = e.ruta GROUP BY e.jornada, m.marca ORDER BY e.jornada DESC, m.marca LIMIT 120"

# Salidas desde los resultados de `/buscar/`, por jornada — el numerador de SM-13, Historia 23.7.
# La misma jornada de partida, sin la de hoy. El denominador, las búsquedas asentadas, llega con
# la 23.8: la tasa es la consulta siguiente.
npx --yes wrangler@4.151.1 d1 execute medicion --remote --command \
  "SELECT jornada, COUNT(*) salidas FROM eventos WHERE evento='salida-interna' AND ruta='/buscar/' AND zona='resultado' AND jornada >= 'AAAA-MM-DD' AND jornada < date('now') GROUP BY jornada ORDER BY jornada DESC LIMIT 30"

# SM-13, la búsqueda seguida — Historias 23.7 y 23.8: las salidas desde los resultados de
# `/buscar/` frente a las búsquedas asentadas, por jornada UTC. Cambia AAAA-MM-DD por la primera
# jornada UTC completa tras la llegada de la 23; la de hoy no entra. Es una razón de recuentos por
# jornada, no de sesiones —ninguna `busqueda` se ata a una carga—, y se desvía en los dos sentidos
# (§3, «La búsqueda asentada»): la pestaña nueva no mide su salida, y una salida tras volver atrás
# cuenta sin `busqueda` nueva. Puede pasar de 1; se compara consigo misma en el tiempo.
npx --yes wrangler@4.151.1 d1 execute medicion --remote --command \
  "SELECT jornada, SUM(evento='busqueda') asentadas, SUM(evento='salida-interna') seguidas, ROUND(1.0 * SUM(evento='salida-interna') / NULLIF(SUM(evento='busqueda'), 0), 3) sm13 FROM eventos WHERE ruta='/buscar/' AND (evento='busqueda' OR (evento='salida-interna' AND zona='resultado')) AND jornada >= 'AAAA-MM-DD' AND jornada < date('now') GROUP BY jornada ORDER BY jornada DESC LIMIT 30"

# SM-6, la búsqueda sin resultados — Historia 23.8: las asentadas en el tramo 0 frente a todas las
# asentadas, por jornada UTC, desde la misma jornada de partida y sin la de hoy. El numerador es el
# tramo 0 de la `busqueda`, no el registro de FR-8: un filtrado sin texto que no encuentra nada
# cuenta aquí y no deja consulta. Las búsquedas con filtros llegan con la Épica 27; hasta entonces
# `filtros` es siempre `ninguno`, y el desglose por filtros sale de añadirlo al `GROUP BY`.
npx --yes wrangler@4.151.1 d1 execute medicion --remote --command \
  "SELECT jornada, COUNT(*) asentadas, SUM(tramo='0') sin_resultados, ROUND(1.0 * SUM(tramo='0') / NULLIF(COUNT(*), 0), 3) sm6 FROM eventos WHERE evento='busqueda' AND ruta='/buscar/' AND jornada >= 'AAAA-MM-DD' AND jornada < date('now') GROUP BY jornada ORDER BY jornada DESC LIMIT 30"

# Lo que se buscó y no había, para decidir a quién sembrar — FR-8. Desde la 23.8 cada fila es una
# búsqueda asentada con texto y sin resultados, una por estado y carga; antes de la llegada de la 23
# salía en cada repintado vacío, con fragmentos a medio escribir y repeticiones (el corte de serie
# de FR-8, arriba). Para curar sirven las dos épocas; para contar o comparar, añade
# `AND jornada >= 'AAAA-MM-DD'` con la primera jornada UTC completa tras la llegada. Ya no es el
# numerador de SM-6, que sale de la `busqueda` (la consulta anterior).
npx --yes wrangler@4.151.1 d1 execute medicion --remote --command \
  "SELECT consulta, COUNT(*) c FROM eventos WHERE evento='busqueda-sin-resultados' GROUP BY consulta ORDER BY c DESC LIMIT 40"
```

Lo que este receptor **no** hace, y conviene que quede escrito: no comprueba el origen de
la baliza. Cualquiera que conozca la URL puede escribir en la tabla. Se aceptó a
conciencia — la comprobación de origen se salta con una orden de terminal, así que no
protege de nadie, y en cambio descarta eventos de verdad en silencio el día que cambie el
dominio. Si algún día la tabla se llena de ruido, la respuesta es un límite de frecuencia
en la plataforma, no una comprobación que aparenta seguridad.

### Consultar el canal propio — SM-8

Desde la Historia 20.1 hay **dos** eventos de vista para SM-8, y los dos llevan la marca de origen:
`vista-de-cita`, que emite solo la Página de Cita, y `vista-de-superficie`, que emiten una
sola vez la portada y la página 1 de Autor, Tema, Colección y Obra indexable. Las páginas 2+ de un
listado, `/buscar`, `/404`, `/kit` y `/lote` no emiten vista: son superficies de servicio o
internas (lo declara `src/lib/superficies.ts`), y las Piezas del Canal enlazan a la
página 1. Contar solo `vista-de-cita` dejaba fuera todo lo que el Canal trae a las
superficies de agregación.

Desde la Historia 23.9 hay un **tercer** evento de vista, `vista-de-obra`, y **no entra en SM-8**:
las consultas de abajo siguen filtrando `evento IN ('vista-de-cita','vista-de-superficie')`. La
Obra indexable emite las dos —su `vista-de-superficie` y su `vista-de-obra`—, y cuenta **una vez**,
por la de superficie, como hasta ahora; la que no se indexa no cuenta en SM-8, igual que antes,
aunque ahora emita su vista de Obra con la marca de origen. Sumar `vista-de-obra` contaría dos veces
la Obra indexable y metería en SM-8 páginas `noindex` que no medía.

**SM-8 sigue contando solo `origen` en las vistas**, y la Historia 23.6 es una causa de su **corte
de serie**: antes, recargar la página, copiar la dirección de la barra o volver a ella con la
marca puesta volvía a contar la llegada, porque `?de=` se quedaba en la dirección; desde la
llegada en vivo de la Épica 23 se cuenta una vez, así que el tramo de antes y el de después no se
comparan. La jornada del corte sale de la jornada de despliegue de la 23, que da la 23.11, y de
ella se compone la primera entrada de `CORTES_DE_SM8`, la lista de cortes que trae la 23.10 en
`src/lib/umbrales.ts` y que todavía no existe. Hasta entonces **se parte a mano**: a las dos
consultas de abajo se les añade `AND jornada < 'AAAA-MM-DD'` para el tramo de antes y
`AND jornada > 'AAAA-MM-DD'` para el de después, con esa jornada, y la de llegada, que es mixta
—páginas abiertas que aún piden el fichero anterior—, se lee aparte con
`AND jornada = 'AAAA-MM-DD'`. Sin partirla, una consulta que cruce esa jornada mezcla dos
instrumentos.

**Las llegadas a una página 2+ no cuentan.** Es un subrecuento conocido y aceptado: quien
entra por un enlace a `/autor/<slug>/2/` no deja fila de vista.

```bash
# Cuál de las cinco redes trae visitas, por jornada y por evento.
npx --yes wrangler@4.151.1 d1 execute medicion --remote --command \
  "SELECT jornada, origen, evento, COUNT(*) visitas FROM eventos \
   WHERE evento IN ('vista-de-cita','vista-de-superficie') AND origen IS NOT NULL \
   GROUP BY jornada, origen, evento ORDER BY jornada DESC, visitas DESC"

# El mes entero, por origen y evento, para decidir dónde va el tiempo del siguiente.
npx --yes wrangler@4.151.1 d1 execute medicion --remote --command \
  "SELECT origen, evento, COUNT(*) visitas FROM eventos \
   WHERE evento IN ('vista-de-cita','vista-de-superficie') AND origen IS NOT NULL \
   AND jornada >= date('now','-30 days') \
   GROUP BY origen, evento ORDER BY visitas DESC"

# Recuento por evento, todos los orígenes — aquí aparecería también una baliza de
# comprobación que no se hubiera borrado.
npx --yes wrangler@4.151.1 d1 execute medicion --remote --command \
  "SELECT evento, ruta = '/__comprobacion/' comprobacion, COUNT(*) n FROM eventos \
   GROUP BY evento, comprobacion ORDER BY evento"

# Proxy de profundidad: vista-de-cita / vista-de-superficie, POR JORNADA, últimos 30 días.
npx --yes wrangler@4.151.1 d1 execute medicion --remote --command \
  "SELECT jornada, \
     SUM(evento='vista-de-cita') citas, \
     SUM(evento='vista-de-superficie') superficies, \
     ROUND(1.0 * SUM(evento='vista-de-cita') / NULLIF(SUM(evento='vista-de-superficie'),0), 2) razon \
   FROM eventos WHERE ruta <> '/__comprobacion/' AND jornada >= date('now','-30 days') \
   GROUP BY jornada ORDER BY jornada DESC"

# La misma razón, separando lo que llega con marca de origen (el Canal) de lo que no.
npx --yes wrangler@4.151.1 d1 execute medicion --remote --command \
  "SELECT jornada, origen IS NOT NULL con_origen, \
     SUM(evento='vista-de-cita') citas, \
     SUM(evento='vista-de-superficie') superficies, \
     ROUND(1.0 * SUM(evento='vista-de-cita') / NULLIF(SUM(evento='vista-de-superficie'),0), 2) razon \
   FROM eventos WHERE ruta <> '/__comprobacion/' AND jornada >= date('now','-30 days') \
   GROUP BY jornada, con_origen ORDER BY jornada DESC, con_origen DESC"
```

**La razón es un agregado por jornada, no una sesión.** No hay identificador de visitante
ni lo habrá (AD-13), así que no se puede decir que *esta* visita a la portada siguió a
*esas* Citas: solo que ese día hubo tantas vistas de Cita por cada vista de superficie. Una
razón alta puede ser profundidad o puede ser tráfico que entra directo a la Cita sin pasar
por ninguna superficie; la cifra no distingue las dos cosas, y leerla como «páginas por
sesión» sería inventar el dato que la medición se niega a recoger. `NULL` en `razon` es
una jornada sin vistas de superficie, no un cero.

### Desplegar el receptor: migración, receptor, sitio — Historia 23.2 (AD-14)

Cuando cambian el vocabulario o las columnas, el orden es **migración, receptor, sitio**, y lo
cumple una orden. Un receptor que escribe una columna que no existe pierde cada evento; un
sitio que envía un campo que el receptor no coteja lo ve llegar a nulo, indistinguible de un
cero. La Historia 2.9 no se enmienda —el vocabulario sigue cerrado, sin cookie ni
identificador—: se amplía con cuatro eventos y seis campos, cada uno con su conjunto.

```bash
cd ~/brainlySabiduria                     # en la rama que cambia el vocabulario, árbol limpio
export MEDICION_ENDPOINT=https://medicion-sabiduria-de-bolsillo.sabiduriadebolsillo.workers.dev
npm run medicion -- desplegar             # acto de Héctor: migra, despliega, comprueba, baraja
git add medicion/huella-del-vocabulario.json && git commit   # la huella, con su mensaje
```

`desplegar` hace, en este orden, y se para con 1 en el primer fallo diciendo qué quedó
aplicado —sin reintentar migraciones ni despliegues—:

1. Comprueba la invocación, `MEDICION_ENDPOINT` (con `http(s)://`, y nunca la máquina propia:
   contra el receptor local está `ensayo`) y la sesión de `wrangler` (`whoami --json`). Sin
   cualquiera de las tres sale con **2**, antes de tocar nada.
2. Exige el árbol limpio en `medicion/` y `src/lib/`: la huella nombra el commit, y el commit
   tiene que contener lo que se despliega. Si lo único sin commitear es la huella de un
   `desplegar` anterior, lo dice así: se commitea antes de repetir.
3. Coteja el receptor de la rama contra lo que envía el sitio en vivo: **siempre** el
   vocabulario de `origin/main` —el que tenga este clon, sin `fetch`; la orden dice su commit y
   su fecha, así que conviene un `git fetch` antes— y, si la hay, también la huella versionada.
   Hasta la merge la principal es la v7.1, con la Marca de origen en las acciones, y eso lo
   pide aunque la huella ya sea de la v8. Si el receptor nuevo no guarda algo de eso, lo nombra
   y se para: **nunca se despliega un receptor que no cubra lo que emite el sitio en vivo**.
4. Cuenta las filas por jornada y evento (sin las balizas) y mira la tabla: si no es la de
   partida ni la migrada, la nombra y se para sin aplicar nada, porque `ADD COLUMN` no es
   idempotente. Mira también **la cuota antes de tocar nada** (paso 7, con las escrituras de las
   balizas ya sumadas): si hoy el barajado no cabría, sale con 1 sin migrar ni desplegar —migrar y
   desplegar para pararse después no ahorra nada: se repite otro día igual—. Dice el instante
   anterior a la migración.
5. Aplica las migraciones en remoto (`d1 migrations apply --remote`) y despliega el receptor
   (`wrangler deploy`), con `wrangler` 4.151.1 y `--remote` siempre explícito. Cada paso tiene un
   tope de 300 s: uno que no termina se corta, y el parte dice que **quizá** se aplicó.
6. **La baliza:** envía a `/__comprobacion/` una baliza por cada valor de cada campo de cada
   evento del vocabulario y, por evento, otra que tiene que dejar la fila vacía —valores que
   ningún conjunto admite en los campos del evento, y en los que **no** declara un valor válido
   de otro evento, que solo descarta un receptor que mira qué evento lleva cada campo—, más una
   de un evento inventado: lo que el receptor guarda y lo que tiene que descartar. La Marca de
   origen de los siete eventos de la v7.1 lleva un valor ajeno, porque el receptor la guarda en
   ellos por compatibilidad. Las envía sin seguir redirecciones —un `POST` redirigido llega como
   `GET`, que el receptor contesta con 204 sin escribir—, y si `MEDICION_ENDPOINT` redirige lo
   dice. Lee las filas con `CAST(rowid AS TEXT)` y las coteja con lo
   esperado, hasta tres veces —un receptor recién desplegado tarda en llegar a todas partes—.
   **Las borra siempre**, casen o no, y si no puede lo dice con la orden que las borra. Si dos
   `rowid` vecinos están cerca, el receptor en vivo numera en orden de llegada: se para y **no
   baraja**.
7. **El barajado:** `UPDATE eventos SET rowid = abs(random())`, que reescribe cada fila y sus
   dos entradas de índice, unas **tres filas escritas por fila**. Antes lo cuenta contra la
   cuota de escritura del día (`CUOTA_DE_FILAS_ESCRITAS_POR_DIA_EN_D1`, 100.000 en el plan
   gratuito), con las filas escritas en 24 h que da `d1 info --json`, que pecan por exceso, **y
   otras tantas de reserva** para lo que el sitio escriba hasta las 00:00 UTC: pasada la cuota,
   D1 rechaza cada `INSERT` hasta la medianoche y el Worker lo calla, así que un barajado que la
   agotara justo dejaría el resto del día a cero. Lo escrito en 24 h lleva sumadas las
   escrituras de las balizas de la orden (unas 1.566, por exceso), que `d1 info` puede no ver
   todavía. La cuota es de la cuenta: lo que escriba otra base D1 suya no está contado. Si no
   cabe, lo dice con las cifras y sale con 1: **se repite otro día, nunca troceado**. Dice el
   instante anterior al barajado.
8. Vuelve a contar, **da los recuentos de antes y de después** —una línea por jornada, que la
   23.3 anota con fecha en su spec— y exige que las jornadas cerradas sean idénticas y que la de
   hoy y la víspera solo hayan crecido (el reloj del Worker puede ir unos segundos por detrás al
   cruzar la medianoche): migrar y barajar no pierden ni inventan filas. No se copia ni se
   guarda ninguna.
9. Escribe la huella. No hace commit.

Cuando se para después de aplicar algo, el parte dice qué quedó aplicado y los instantes
anteriores a la migración y al barajado, con la orden de Time Travel de cada uno (abajo); no la
corre. Los instantes son del reloj de este equipo, y se escriben también al pasar: **si la orden
se corta con Ctrl-C** no llega a dar su parte, y lo que dice es dónde mirar —las líneas de arriba,
`d1_migrations`, `deployments list`— y la orden que borra las balizas si quedaron en la tabla.

**Si no llega ninguna baliza a la tabla** —el parte lo dice—, el Worker contesta 204 y no
escribe, por una de dos causas que el `catch` calla: el receptor que contesta no es el de esta
rama, o D1 rechaza su `INSERT` porque la tabla no tiene una columna —una migración sin
aplicar—. Lo distingue la versión desplegada, `npx --yes wrangler@4.151.1 deployments list` en
`medicion/`, junto con `PRAGMA table_info(eventos)`. Para volver a la última versión que
guardaba, por su identificador: `npx --yes wrangler@4.151.1 versions list` y `rollback <id>` —sin
identificador, `rollback` va a la versión anterior, que puede ser otra que tampoco guarde—.

Se repite en **cada** despliegue del receptor —el barajado es idempotente—, y después, con la
huella commiteada, se despliega el sitio. `npm test` está en rojo entre que la rama toca
`src/lib/vocabulario.ts` y que la huella entra: es lo que impide desplegar el sitio antes.

**Comprobar lo que hay en vivo**, sin desplegar nada:

```bash
npm run medicion -- comprobar   # acto de Héctor
```

Envía las balizas del vocabulario de la huella —las que guarda y las que descarta—, las coteja,
mira que el `rowid` sea aleatorio y las borra. Sale con 1 nombrando la diferencia si el receptor
en vivo no guarda lo que la huella dice, guarda lo que debía descartar o numera en orden de
llegada —un receptor anterior a la 23.12, también tras una vuelta
atrás—; lo cierra repetir la 23.3, `npm run medicion -- desplegar`. Es lo que sustituye a las
comprobaciones a mano con `curl` de las Historias 20.1 y 23.12.

**Mientras viva la rama de la Épica 23, el receptor no se despliega desde la principal.** Si se
hace, el receptor en vivo vuelve al vocabulario de la principal, la huella de la rama queda
rancia y la 23.3 se repite.

**Reversión, en el orden inverso**: primero el sitio, después el receptor
(`npx --yes wrangler@4.151.1 versions list` y `rollback <id>`, en `medicion/`). Las migraciones
nunca se revierten: las columnas nuevas quedan nulas y no molestan a un receptor anterior. Un
receptor anterior a la 23.12 vuelve a numerar en orden de llegada, y lo que llegue entretanto lo
baraja el siguiente `desplegar` que pase la comprobación.

**Recuperar D1 tras un error** es Time Travel: `npx --yes wrangler@4.151.1 d1 time-travel
restore medicion --timestamp=<instante>`, en `medicion/`, dentro de los 7 días del plan gratuito
o los 30 del de pago. **Sobrescribe todo lo escrito después** de ese instante, y devuelve el
orden de llegada de antes del barajado: es un acto de Héctor, y ninguna orden de `tools/`
restaura producción. Los instantes los da el parte de `desplegar`. Volver a antes del barajado
conserva las columnas nuevas. Volver a antes de la migración devuelve **también la tabla de
antes**, sin ellas: con el receptor nuevo en vivo cada `INSERT` fallaría en silencio, así que
antes se vuelve al receptor anterior (`versions list` y `rollback <id>`).

**El receptor local**, para probar sin tocar producción:

```bash
npm run medicion -- local    # migra el D1 local (medicion/.wrangler/) y arranca wrangler dev en :8787
npm run medicion -- ensayo   # en otra terminal: la comprobación de desplegar, contra el local
```

`ensayo` corre la secuencia de `desplegar` contra el D1 local, salvo lo que solo existe en remoto
—migrar, que ya hizo `local`, desplegar y `d1 info`— y la huella: recuentos, estado de la tabla,
balizas, `rowid`, recuento de filas, barajado y recuentos otra vez, con las respuestas de verdad
de `wrangler`. Sale con 0 si la tabla es la migrada, cada evento y cada valor del vocabulario
llegó al D1 local, lo ajeno se descartó, el `rowid` es aleatorio, las balizas se borraron y
barajar dejó los recuentos iguales. Corrida antes de la 23.3, es lo más cerca de producción que
se prueba el SQL de `desplegar`. El D1 local no se vacía nunca solo:
lo que dejan las pruebas se acumula en `medicion/.wrangler/`, que no se versiona y se puede
borrar entero (el siguiente `local` lo vuelve a migrar). Si `local` no puede migrarlo —un D1
local creado a mano desde `esquema.sql`, sin `d1_migrations`—, se borra igual. Las pruebas de Playwright levantan el mismo receptor local
y construyen el sitio con `MEDICION_ENDPOINT=http://localhost:8787/` (`playwright.config.ts`):
toda construcción de rama con medición —Playwright, y la de Lighthouse de la 23.11, que se hace
a mano con `MEDICION_ENDPOINT=http://localhost:8787/ npm run build` y el receptor local en
marcha— apunta a `wrangler dev` con D1 local, nunca a producción.

### El primer `desplegar` — Historia 23.3 (2026-10-24)

Corrió el **2026-10-24 a las 23:13 UTC** desde la rama de la Épica 23 (`v8/epica-23`, en
`b4303b0e7c`), sin huella versionada —era el primero—, así que cotejó el receptor de la rama
contra el vocabulario de `origin/main` (`ed5a3f47e2`), el que envía el sitio en vivo, y lo cubría.
Lo corrió el orquestador del bucle v8-ralph con autorización de Héctor del mismo día, después de
un `ensayo` en verde contra el D1 local, y salió con **0**. Quedó aplicado, en este orden:

- **Las migraciones, en remoto**: `0000_tabla_de_partida.sql`, que no cambió nada —la orden
  reconoció antes la tabla de partida— y dejó anotada la línea de partida en `d1_migrations`, y
  `0001_vocabulario_de_la_v8.sql`, con sus seis columnas a nulo en las filas de antes. Desde ese día
  la base de producción **tiene migraciones**: «No hay migración», lo que esta sección decía hasta
  la 23.2, ya no es cierto tampoco en producción, y su esquema es el de `medicion/migrations/` y no
  el `esquema.sql` del 2026-09-02.
- **El receptor**: `medicion-sabiduria-de-bolsillo`, versión
  **`23386626-a2b0-4c59-8d69-f78ab906ba10`**, con el vocabulario de la v8 y el `rowid` aleatorio
  de la 23.12. La versión que había antes es anterior a la 23.12 y numera en orden de llegada: si
  lo que envía el sitio de la v7.1 dejara de llegar, la vuelta atrás que pide la 23.3 es desplegar
  desde la principal el receptor de la principal, que conserva el `rowid` aleatorio; un `rollback`
  a esa versión volvería al orden de llegada (Reversión, arriba).
- **La baliza**: 87 balizas enviadas y 86 filas leídas —la del evento inventado no deja fila—, que
  casaron al primer intento; `rowid` aleatorio; las balizas, borradas.
- **El barajado**: 4.201 filas, unas 12.603 escrituras; con las 1.797 escritas en 24 h y otras
  tantas de reserva, 16.197 de las 100.000 del día. Los recuentos por (jornada, evento) de antes y
  de después coinciden en las 50 jornadas; están, con fecha, en el spec de la historia
  (`_bmad-output/implementation-artifacts/spec-23-3-la-migracion-y-el-receptor-llegan-antes-que-el-sitio.md`).
- **Los instantes para Time Travel**, del reloj del equipo: antes de migrar,
  `2026-10-24T23:13:16.949Z`; antes de barajar, `2026-10-24T23:13:45.352Z`. Sirven 7 días en el
  plan gratuito.
- **La huella**: `medicion/huella-del-vocabulario.json` (`escritaEl: 2026-10-24`, del commit
  `b4303b0e7c`), commiteada en la rama en `6aece9a77f` y nunca en la principal. Con ella
  `npm test` vuelve a verde en la rama.

Queda por leer, antes del merge de la 23.11, la primera jornada cerrada tras el despliegue —la
2026-10-25 UTC es la primera entera bajo el receptor nuevo—: sus eventos tienen que seguir
llegando como antes, porque el sitio en vivo sigue en la v7.1. El plan contratado de Cloudflare lo
revisa y lo anota aquí la 23.11; la cuota de este barajado se contó con la del plan gratuito.

### Consultar la compartición — SM-5, SM-7 y SM-C3

```bash
# Cuánto se comparte y hacia dónde — SM-7, FR-20.
npx --yes wrangler@4.151.1 d1 execute medicion --remote --command \
  "SELECT evento, destino, COUNT(*) n FROM eventos \
   WHERE evento IN ('comparticion-de-imagen','comparticion-de-enlace') \
   GROUP BY evento, destino ORDER BY n DESC"

# SM-C3 — si la compartición creció a costa del copiado, por jornada.
npx --yes wrangler@4.151.1 d1 execute medicion --remote --command \
  "SELECT jornada, \
     SUM(evento IN ('copiado','descarga-de-imagen')) llevarselo, \
     SUM(evento IN ('comparticion-de-imagen','comparticion-de-enlace')) compartirlo \
   FROM eventos GROUP BY jornada ORDER BY jornada DESC LIMIT 60"
```

`destino = 'opaco'` es una compartición por la hoja del sistema. La Web Share API no dice
a qué aplicación fue y no se intenta averiguarlo: cualquier forma de deducirlo —medir
tiempos, mirar qué pierde el foco— sería reconstruir el comportamiento del visitante por
la puerta de atrás. «Opaco» es un dato honesto: se compartió, y no se sabe adónde.


## 4. Encender las donaciones — Historia 14.2

Cerrar LC-4 es lo último que le falta al Umbral de las donaciones —«LC-1…LC-4
verificadas»—, así que quien acabe la sección 3 es quien se encuentra con esta.

**Encenderlas es un solo cambio de código:** poner `encendido: true` en el Modelo
`donaciones` de `src/lib/ingreso.ts`. Nada más que tocar. La invitación ya está construida y
la portada, `/buscar` y la 404 la piden por su cuenta; `git revert` de ese commit la apaga.
Lo que sí hay que hacer además del cambio son **dos comprobaciones antes** —el destino, a
ojo; el barrido de accesibilidad, con una orden— y **una después**, sobre el sitio ya
publicado. Las tres están abajo, en ese orden.

**Antes de hacerlo, abre el `destino` en el navegador y comprueba que es la página de
cobro correcta.** Hoy declara `https://ko-fi.com/sabiduriadebolsillo`, y esa dirección se
**supuso** por el nombre del dominio: no hay ninguna cuenta de Ko-fi escrita en el
repositorio de la que derivarla.

**Y a fecha de 2026-09-02 esa cuenta no existe** — lo confirmó Héctor, y con eso el Modelo
no se puede encender aunque sus cuatro condiciones de lanzamiento estén cumplidas desde ese
mismo día. Encender con este destino publicaría una invitación que lleva a ninguna parte, y
es justo el caso que ninguna puerta caza: bien formado y equivocado. Así que el primer paso
del encendido no es tocar el booleano, es **abrir la cuenta** —o cualquier otra pasarela— y
escribir su dirección real en esa línea. Ko-fi contesta `403` a `curl`, así que esta
comprobación no se automatiza desde aquí: se hace con un navegador y un par de ojos.

Este es el único requisito que pide **un ojo humano**, y lo es porque el destino es lo único
que ninguna puerta del repositorio puede cazar:

- Un destino **ausente o mal formado** —vacío, sin `https://`— detiene `astro build` con
  el mensaje que dice qué falta. Ese caso no llega a publicarse.
- Un destino **bien formado y equivocado** construye, despliega y publica sin que nada
  proteste. El visitante que quiso apoyar el sitio aterriza en una página que no existe, y
  el sitio no se entera.

### El segundo requisito: correr el barrido con el Modelo encendido

Es una orden y no un juicio, y va **antes** de cambiar el `false`:

```bash
npx playwright test tests/e2e/ingreso-accesible.spec.ts --project=escritorio
```

Hace falta porque **ninguna otra prueba mira la invitación**: la suite de accesibilidad barre
el sitio del repositorio, donde las donaciones están apagadas y la invitación no existe. Esta
construye un sitio con `encendido: true` en una copia temporal —el repositorio no se toca— y le
pasa axe a la portada, `/buscar` y la 404 con la invitación puesta. El porqué técnico está en
la cabecera de `tests/e2e/ingreso-accesible.spec.ts`; aquí solo hace falta saber que sin ella
se publica una invitación cuya accesibilidad no ha medido nadie.

El barrido es contra **WCAG 2.2 AA**, el suelo declarado (NFR-9), y no contra 2.1: le pide a
axe las etiquetas que declara `ETIQUETAS_DEL_BARRIDO` en `src/lib/superficies.ts` —las de 2.1 AA
y la de 2.2 AA—, las mismas que el barrido del sitio (Historia 23.4). Ninguna de las dos pruebas
de axe escribe la lista: subir el suelo es cambiarla ahí —y en `tests/unit/superficies.test.ts`,
que la fija—, y las dos lo heredan. Cada barrido comprueba además en su resultado que corrió
entero, así que uno acotado a un nodo o a unas reglas no sale en verde. De lo que añade 2.2, axe
solo comprueba 2.5.8 (`target-size`): 2.4.11 y 2.5.7 los da por cumplidos la UX y 3.2.6, 3.3.7
y 3.3.8 no aplican, con su motivo en la misma declaración.

Lo que conviene saber antes de teclearla:

- **Tarda minutos, no segundos.** La orden dispara el `webServer` de `playwright.config.ts`,
  que hace un `npm run build` completo del repositorio —Astro más Pagefind— con
  `reuseExistingServer: false`, y encima la prueba construye su propio sitio parcheado. Son
  dos construcciones seguidas.
- **Necesita libres el 4321 y el 4402.** El primero es el `webServer`; el segundo, el sitio
  encendido. Un `astro dev` o un `npm run test:e2e` abierto en otra terminal la tumba con
  EADDRINUSE, que no tiene nada que ver con accesibilidad. Quién ocupa un puerto:
  `lsof -nP -iTCP:4321 -sTCP:LISTEN`.
- **No cambia nada al correrse.** Las donaciones siguen apagadas en el repositorio y
  `git status` sale limpio; si no sale limpio, algo va mal y no es el encendido.
- **El CI no corre las pruebas de punta a punta.** `npm test` no la incluye y el flujo de
  publicación tampoco: esto no lo comprueba nadie por ti.

**Si sale en rojo, se aborta el encendido.** No se baja un umbral de axe, ni se excluye una
regla, ni se enciende «mientras tanto»: la invitación se publica accesible o no se publica.
Lo que falle se arregla en `src/components/Sostener.astro` —o se decide aparte— y se vuelve a
correr hasta verde.

Desde la Historia 23.4 el rojo puede venir de tres sitios, y el mensaje dice de cuál:

- **una violación**, con la regla y el selector del nodo. Ojo con una que no salía antes: la
  axe 4.14 corre `label-content-name-mismatch` con las etiquetas de 2.1, así que un enlace cuyo
  texto visible no está, tal cual, dentro de su nombre accesible falla. El aviso de pestaña
  nueva va **dentro** del nombre (`AVISO_DE_PESTAÑA_NUEVA`, Historia 22.10) y no lo rompe; un
  `aria-label` que reescriba el texto visible, sí;
- **«el barrido no corrió lo que pide»**, con `faltan` o `sobran`: el barrido se acotó —un
  `.include(` o un `.withRules(` añadido a la prueba— o la axe de la página no es la que se
  comprobó. No es un fallo de la invitación: se deshace el cambio de la prueba o se reinstala
  con `npm ci`;
- **«axe no supo decidir»**, con el selector: un objetivo que `target-size` no pudo medir, casi
  siempre por un vecino solapado fuera del orden de tabulación. Se arregla como una violación,
  separando o agrandando el objetivo según `DESIGN.md`; no se da por bueno.

### Y después de desplegar, abrir el sitio publicado

El encendido no termina en el commit. Cuando el despliegue acabe, abre
`https://sabiduriadebolsillo.net/`, baja al final de la columna y **pulsa la invitación**:

```bash
# Que la invitación viaje de verdad en lo publicado.
curl -s https://sabiduriadebolsillo.net/ | grep -o 'data-ingreso="donaciones"'
curl -s https://sabiduriadebolsillo.net/ | grep -o 'href="https://[^"]*"' | grep ko-fi
```

Los dos `grep` dicen que el bloque salió y con qué dirección; lo que no dicen es si esa
dirección lleva a alguna parte. Eso es justo el caso que ninguna puerta caza —destino bien
formado y equivocado— y solo se cierra abriéndolo con el navegador, una vez, el día del
encendido.

Comprobar el estado en cualquier momento, sin encender nada:

```bash
npm run ingreso            # estado, Umbral y cifra medida —o por qué no es medible
```

## 5. La lectura del estado de indexación — Historia 16.1

El sitio cumple desde hace tiempo la exigencia de *ser* indexable, y aun así el buscador ha
indexado 8 URL de 1.715. *Estar* indexado es una decisión suya, y hasta ahora esa cifra se
leía a ojo en el panel: sin serie, y mezclando 1.639 páginas de una frase con las ~75 de
agregación. Esto le pone instrumento — `corpus/serie-de-indexacion.yml`, una entrada por
jornada con el reparto **por familia**.

Hecho en el repositorio:

- `tools/indexacion.ts` consulta, agrega por familia e informa. **Consultar no registra**:
  la serie es idempotente por fecha, así que una consulta de tanteo anotada reemplazaría la
  lectura buena del día en vez de sumarse a ella.
- La propiedad **se deriva** del dominio (`sc-domain:` + lo que diga `public/CNAME`), así
  que no hay una segunda variable que pueda quedarse apuntando al dominio anterior.
- La red vive solo en la cáscara de `tools/` (AD-22) y **ningún módulo de `src/lib/` recibe
  el estado de indexación, ni por parámetro** (AD-24). Ningún paso de CI la ejecuta ni la
  commitea a `main`: si lo hiciera, el `push` dispararía el flujo de publicación y con él el
  aviso a los buscadores, anunciando una jornada en la que no cambió un byte.

```bash
npm run indexacion              # consulta e informa. No escribe nada.
npm run indexacion:registrar    # además anota la entrada de hoy.
```

A mano, una vez (necesita la cuenta de Google que ya es dueña de la propiedad):

1. En [Google Cloud](https://console.cloud.google.com/), crear un proyecto —o reutilizar
   uno— y **habilitar la API «Google Search Console API»**. Sin habilitarla, la credencial
   es válida y cada petición contesta que la API está deshabilitada para el proyecto.

2. **IAM y administración → Cuentas de servicio → Crear cuenta de servicio.** No necesita
   ningún rol de IAM: los permisos que le hacen falta no son de Google Cloud, sino de Search
   Console, y se conceden en el paso 4.

3. En esa cuenta, **Claves → Agregar clave → Crear clave nueva → JSON**. Se descarga una
   sola vez y no se puede volver a descargar. **No se versiona**: `corpus/` no es sitio para
   una credencial, y git es un almacén sin borrado.

4. **El paso que se olvida, y sin el que nada de lo anterior sirve:** en
   [Search Console](https://search.google.com/search-console), con la propiedad
   `sabiduriadebolsillo.net` abierta, **Configuración → Usuarios y permisos → Agregar
   usuario**, con la dirección de correo de la cuenta de servicio —la del campo
   `client_email` del JSON, que acaba en `.iam.gserviceaccount.com`— y permiso
   **Propietario** («Owner»).

   **No vale «Restringido», y el fallo es del peor tipo.** La matriz de permisos de Search
   Console le da al usuario restringido *fetch only* sobre la inspección de URL, y la
   inspección del estado en el índice —lo único que esta serie lee— le está vedada: la
   credencial se autentica sin problema, y **cada URL devuelve 403**. Que es exactamente lo
   mismo que se ve cuando el alta no se hizo, así que un permiso de menos se diagnostica como
   un alta olvidada y se pierde la tarde. La orden traduce ese 403 a un motivo escrito —«sin
   acceso a la propiedad»— que nombra las dos causas juntas por este mismo motivo.

   Sin ninguna alta, la credencial se autentica igual y la propiedad **no existe** para ella.
   Es un permiso de la propiedad, no del proyecto de Cloud, y por eso no lo cubre ningún rol
   de IAM.

5. Poner la clave en la variable `SEARCH_CONSOLE_CREDENCIALES`, que admite las dos formas
   en las que llega según de dónde salga:

   ```bash
   # En local: la ruta del fichero descargado, fuera del repositorio.
   export SEARCH_CONSOLE_CREDENCIALES="$HOME/.credenciales/sabiduria-search-console.json"

   # Donde un secreto es una cadena: el JSON entero, en una línea.
   export SEARCH_CONSOLE_CREDENCIALES='{"type":"service_account", …}'
   ```

   Se distinguen por la primera llave, no por una segunda variable. Sin la variable la orden
   **no escribe nada**, nombra lo que falta y sale con código **2** —propio, distinto del 1
   de cualquier otro rechazo— para que un guion pueda separar «falta la credencial» de «la
   lectura falló».

Cómo comprobarlo:

```bash
# Que la cuenta de servicio ve la propiedad, y que las cuatro familias contestan.
# 80 y no 4: el presupuesto sirve primero el suelo de 20 por familia y de la más pequeña a
# la mayor, así que con 4 peticiones las cuatro se van a Colección y Cita no se toca.
npm run indexacion -- --presupuesto 80

# Sin credencial: nombra lo que falta, no escribe y sale con 2.
env -u SEARCH_CONSOLE_CREDENCIALES npm run indexacion; echo "código: $?"
```

Cómo se lee el resultado de la primera, que **no** falla ni sale vacío cuando el alta falta:
la orden escribe siempre un informe, y lo que cambia es de qué lado caen las familias. Con el
alta puesta salen bajo su nombre con su reparto; sin ella —o con permiso de menos— salen todas
bajo «Familias sin leer» con el motivo «sin acceso a la propiedad (403)». Consultar no escribe
nada, así que esta comprobación se puede repetir sin ensuciar la serie.

Lo que conviene saber antes de leer la serie:

- **El dato llega con retardo.** Es el del último rastreo del buscador, no el de ahora. Una
  entrada de hoy describe lo que el buscador sabía la última vez que pasó.
- **La cuota manda.** 2.000 inspecciones al día y 600 por minuto **por propiedad**. Las
  ~1.716 URL de hoy son el 86 % de la cuota diaria: cabe una pasada y no dos, y la orden se
  toma sus minutos porque va espaciando las peticiones a propósito. Al pasar de ~2.000, la
  lectura pasa sola a **muestreo por familia** y escribe el tamaño de muestra en cada
  entrada.
- **Una familia que no se pudo leer se omite; jamás se escribe cero.** Aparece nombrada en
  `sinLeer` con su motivo. El cero real es casi el estado de partida, así que un cero
  fabricado sería indistinguible de él.
- **Junto al recuento va el diagnóstico.** Cada familia lleva su reparto por estado de
  cobertura, que viene en la misma respuesta y no cuesta ni una petición más. Es lo que
  distingue «Descubierta, actualmente sin indexar» —el buscador ni ha pasado— de «Rastreada,
  actualmente sin indexar» —pasó y la descartó—: las dos suman al mismo `noIndexadas` y piden
  remedios distintos.
- **La cifra que se compara con la meta de indexación es la de la familia Cita**, nunca el
  agregado del sitio.
- **Hoy la pasada completa cabe, y por poco.** Son 1.714 URL publicadas contra un techo de
  2.000, así que el presupuesto por omisión las lee todas. Al pasar de ~2.000 dejará de caber
  sin que nadie toque nada: la orden muestreará por familia y lo dirá en la entrada.

**La misma credencial sirve para `npm run trafico`** (Historia 20.2), que lee de Search
Analytics los clics, impresiones, CTR y posición por mes y familia y, con
`npm run trafico:registrar`, los anota en `corpus/serie-de-trafico.yml`. El alcance
(`webmasters.readonly`), la propiedad y la variable son los mismos, y sin la variable sale
igual con código **2** sin escribir nada. La cuenta dada de alta para la indexación no
necesita ninguna alta más.

**Y también sirve para `npm run demanda`** (Historia 20.3), que lee de Search Analytics las
impresiones y los clics **por página** de la ventana de 28 días —y, la primera vez, de los
meses cerrados que conserva la fuente— y los reparte por Autor, por Cita y por familia; con
`npm run demanda:registrar` los anota en `corpus/serie-de-demanda.yml`. Mismo alcance, misma
propiedad y misma variable, sin ninguna alta más; sin la variable sale con código **2** y no
escribe nada.

## 6. Pedir rastreo de unas pocas URL, y anotarlo — Historia 18.3 (FR-46)

Google conoce las 1.715 URL —el sitemap se lee, §2— y aun así indexa 2 de cada 80. No es un
problema de descubrimiento: es que un sitio nuevo y sin enlaces entrantes no recibe
presupuesto de rastreo. Search Console deja **pedir el rastreo de una selección corta**, y
esa petición es la única palanca que hay sobre ese presupuesto.

**Es un procedimiento manual y lo va a seguir siendo.** La API de inspección de URL informa
y no solicita, y la Indexing API solo admite ofertas de empleo y retransmisiones en directo:
hoy no hay vía legítima de automatizarlo. Si algún día la hubiera, es decisión de producto.

Hecho en el repositorio:

- `tools/rastreo.ts` **no pide nada**: anota en `corpus/peticiones-de-rastreo.yml` lo que ya
  se pidió. Se niega a anotar una URL que el sitio no publique, una de otro dominio, un lote
  de más de diez (§4.17 lo llama ruido) y una fecha que no pueda corresponder a una petición
  real. Un rechazo sale con código **1**; una bandera mal escrita, con **2**.
- El registro **solo añade**, al revés que `corpus/serie-de-indexacion.yml` (§5): aquélla
  mide un estado y reemplaza por fecha, éste registra actos y pedir la misma URL dos días
  son dos peticiones. Repetir la misma URL **el mismo día** se rechaza: es la misma petición
  escrita dos veces, no dos hechos.

```bash
npm run rastreo                                          # lista lo pedido. NO escribe nada.
npm run rastreo -- --registrar <url> [<url>...]          # anota lo que YA se cursó
npm run rastreo -- --registrar <url> --fecha 2026-09-04  # con su fecha real, si fue otro día
```

A mano, cada vez (necesita la cuenta de Google dueña de la propiedad):

1. En [Search Console](https://search.google.com/search-console), con la propiedad
   `sabiduriadebolsillo.net` abierta, pegar la URL en la **barra de inspección** de arriba.

2. Cuando termine la inspección, **Solicitar indexación**. Google hace una prueba en directo
   de un minuto y responde *«URL añadida a la cola de rastreo prioritario»*. Es una cola, no
   una promesa: puede tardar días y puede acabar en «Rastreada, actualmente sin indexar».

3. Repetirlo con las demás URL de la selección. **Como mucho una decena**, y elegidas: qué
   páginas representan al sitio es una decisión editorial, del mismo carácter que elegir la
   Cita del Día. Hay además un límite diario propio de la herramienta, no publicado, que se
   agota sin aviso claro.

4. **Y volver al repositorio a anotarlo, en la misma sesión.** Este es el paso que se
   olvida, y su olvido es silencioso:

   ```bash
   npm run rastreo -- --registrar \
     https://sabiduriadebolsillo.net/autor/miguel-de-unamuno/ \
     https://sabiduriadebolsillo.net/autor/baltasar-gracian/
   git add corpus/peticiones-de-rastreo.yml && git commit
   ```

   La orden se pega tal cual las URL que se acaban de inspeccionar, y escribe la ruta: el
   dominio tiene un solo dueño (`public/CNAME`) y repetirlo en cada línea sería un segundo
   sitio donde quedarse apuntando al dominio anterior.

**El modo más probable de fallo de todo esto es el paso 4 olvidado**, y no un fallo de la
orden. Pedir el rastreo y no anotarlo deja el trabajo hecho y el dato perdido: cuando la
serie de §5 muestre movimiento en una familia, sin el registro no habrá forma de saber si
esas URL entraron **porque se pidieron** o porque les tocaba — que es la única pregunta que
justifica seguir pidiendo. Ya pasó una vez: las dos peticiones del 2026-09-04 —Unamuno y
Gracián, las dos únicas URL del sitio con impresiones— se cursaron y no quedaron registradas
en ninguna parte, y esta historia existe por eso. La regla práctica: **la petición no está
terminada hasta que el `git commit` del registro está hecho.**

Y lo contrario tampoco: **nunca anotar una petición que no se cursó.** Una entrada inventada
es peor que no tener el registro, porque la serie le atribuiría a una petición un movimiento
que nadie provocó. Por eso `--fecha` no admite el futuro ni nada anterior al 2026-08-19, la
jornada en que se validó la propiedad (§2): antes de ella no había desde dónde pedir nada.

Cómo comprobarlo:

```bash
# Qué se ha pedido, por familia, cruzado con la serie de indexación. No escribe nada.
npm run rastreo

# Una URL que el sitio no publica: nombra el motivo, no escribe y sale con 1.
npm run rastreo -- --registrar https://sabiduriadebolsillo.net/tema/la-vida/2/; echo "código: $?"
```

**Lo que el cruce no dice, y conviene no leer de más.** El informe reparte lo pedido por
familia y pone al lado lo indexado de la última lectura de la serie, pero las dos cifras
**no se cruzan URL a URL**: la serie guarda recuentos y no qué URL inspeccionó, así que de
las indexadas de una muestra no se puede decir si alguna es de las pedidas. El informe lo
dice en pantalla en vez de insinuar lo contrario. Cerrarlo del todo exige que la lectura de
§5 anote las rutas que muestreó, y eso está anotado como trabajo diferido.

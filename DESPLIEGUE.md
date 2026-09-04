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
al reconocimiento: si el `.com` sigue libre, conviene registrarlo y redirigirlo desde el
registrador al `.net`, para que nadie se instale ahí con este nombre. Esa redirección se
hace en el registrador y **no** en el sitio: una segunda entrada en `public/CNAME` no es
posible, y GitHub Pages sirve un solo dominio propio.

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
  `src/lib/medicion.ts` en vez de copiarlo: copiado, un evento nuevo en el sitio se
  descartaría en silencio aquí y el fallo aparecería como «esa métrica está a cero»
  semanas más tarde.
- `medicion/worker.ts` — el adaptador. No lee ni una cabecera de la petición: ni IP, ni
  agente de usuario, ni referente, ni el país que la plataforma regala en `request.cf`.
- `medicion/esquema.sql` — seis columnas: jornada, evento, ruta, origen, destino y
  consulta. Las tres últimas son de un solo evento cada una —`origen` de la visita que
  viene de una cuenta propia (FR-22), `destino` de una compartición (FR-20), `consulta` de
  una búsqueda sin resultados (FR-8)— y llegan `NULL` en el resto. No hay columna de
  visitante porque no hay visitante que guardar, y la marca de tiempo es la jornada y no el
  instante: un instante al milisegundo junto a una ruta poco visitada es, en la práctica,
  un identificador.
- `[observability] enabled = false` en `wrangler.toml`. El registro de acceso de la
  plataforma guarda IP y agente de usuario; apagarlo es parte de la propiedad, no una
  opción de rendimiento.

A mano, una vez (necesita una cuenta de Cloudflare):

```bash
cd medicion
npx wrangler login
npx wrangler d1 create medicion            # copia el database_id a wrangler.toml
npx wrangler d1 execute medicion --remote --file=esquema.sql
npx wrangler deploy                        # imprime la URL del Worker
```

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
variable el sitio no instala la medición y no envía un solo byte — que es como corre en
desarrollo y en las pruebas.

Consultar, sin panel de nadie:

```bash
# Vistas de Página de Cita por jornada — SM-2, SM-3.
npx wrangler d1 execute medicion --remote --command \
  "SELECT jornada, COUNT(*) FROM eventos WHERE evento='vista-de-cita' GROUP BY jornada ORDER BY jornada DESC LIMIT 30"

# Lo que se llevaron: copiado y descarga — SM-5.
npx wrangler d1 execute medicion --remote --command \
  "SELECT evento, COUNT(*) FROM eventos WHERE evento IN ('copiado','descarga-de-imagen') GROUP BY evento"

# Lo que se buscó y no había, para decidir a quién sembrar — FR-8, SM-6.
npx wrangler d1 execute medicion --remote --command \
  "SELECT consulta, COUNT(*) c FROM eventos WHERE evento='busqueda-sin-resultados' GROUP BY consulta ORDER BY c DESC LIMIT 40"
```

Lo que este receptor **no** hace, y conviene que quede escrito: no comprueba el origen de
la baliza. Cualquiera que conozca la URL puede escribir en la tabla. Se aceptó a
conciencia — la comprobación de origen se salta con una orden de terminal, así que no
protege de nadie, y en cambio descarta eventos de verdad en silencio el día que cambie el
dominio. Si algún día la tabla se llena de ruido, la respuesta es un límite de frecuencia
en la plataforma, no una comprobación que aparenta seguridad.

### Consultar el canal propio — SM-8

```bash
# Cuál de las cinco redes trae visitas, por jornada.
npx wrangler d1 execute medicion --remote --command \
  "SELECT jornada, origen, COUNT(*) visitas FROM eventos \
   WHERE evento='vista-de-cita' AND origen IS NOT NULL \
   GROUP BY jornada, origen ORDER BY jornada DESC, visitas DESC"

# El mes entero, para decidir dónde va el tiempo del siguiente.
npx wrangler d1 execute medicion --remote --command \
  "SELECT origen, COUNT(*) visitas FROM eventos \
   WHERE evento='vista-de-cita' AND origen IS NOT NULL AND jornada >= date('now','-30 days') \
   GROUP BY origen ORDER BY visitas DESC"
```

### Consultar la compartición — SM-5, SM-7 y SM-C3

```bash
# Cuánto se comparte y hacia dónde — SM-7, FR-20.
npx wrangler d1 execute medicion --remote --command \
  "SELECT evento, destino, COUNT(*) n FROM eventos \
   WHERE evento IN ('comparticion-de-imagen','comparticion-de-enlace') \
   GROUP BY evento, destino ORDER BY n DESC"

# SM-C3 — si la compartición creció a costa del copiado, por jornada.
npx wrangler d1 execute medicion --remote --command \
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

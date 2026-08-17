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

2. Google da un registro `TXT` del tipo `google-site-verification=…`. Añadirlo en el
   registrador, en el ápice (`@`), junto a los cuatro registros `A` de la Historia 7.1.
   **No se sustituye ninguno**: un dominio admite varios `TXT` a la vez.

3. Pulsar **Verificar**. Si falla, es propagación: se reintenta al cabo de un rato.

4. **Sitemaps → Agregar sitemap**, con la ruta `sitemap-index.xml`.

5. No borrar el registro `TXT` después. Google revalida cada cierto tiempo y la propiedad
   se cae sin avisar si el registro ya no está.

Cómo repetirlo o comprobarlo desde fuera:

```bash
dig +short TXT sabiduriadebolsillo.net | grep google-site-verification
curl -s https://sabiduriadebolsillo.net/robots.txt
```

La alternativa —subir el fichero HTML de verificación a `public/`— también funciona con
este alojamiento, pero verifica solo un prefijo de URL, así que no sirve para lo que se
necesita aquí.

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
- `medicion/esquema.sql` — cuatro columnas: jornada, evento, ruta y consulta. No hay
  columna de visitante porque no hay visitante que guardar, y la marca de tiempo es la
  jornada y no el instante: un instante al milisegundo junto a una ruta poco visitada es,
  en la práctica, un identificador.
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

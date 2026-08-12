# Despliegue

Lo que el repositorio no puede hacer solo. Todo lo demás —construir, validar el corpus,
publicar y reconstruir a diario— lo hace `.github/workflows/publicar.yml` sin intervención.

Cada apartado dice **qué queda hecho en el repositorio** y **qué hay que hacer una vez a
mano**, con el detalle suficiente para repetirlo si hubiera que rehacerlo.

## 1. El dominio propio — Historia 7.1 (LC-1)

Hecho en el repositorio:

- `public/CNAME` declara `sabiduriadebolsillo.com`. Astro copia `public/` a `dist/` en
  cada build, así que el fichero viaja en todos los despliegues, incluida la
  reconstrucción diaria. No hay ningún paso del flujo que lo escriba: si lo hubiera,
  sería algo de lo que acordarse.
- `src/lib/dominio.ts` lee ese mismo fichero y compone el origen del sitio. La canónica
  de cada página y todas las entradas del sitemap lo derivan de ahí.
- `SITE_URL` puede sobrescribirlo para construir en otro origen. Se comprueba con
  contenido, no con `??`: una variable de repositorio sin definir llega como cadena
  vacía y dejaría el sitio con canónicas relativas sin que nada fallara.

A mano, una vez (necesita la cuenta del registrador y la del repositorio):

1. En el registrador de `sabiduriadebolsillo.com`, apuntar el ápice a GitHub Pages con
   cuatro registros `A`: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`,
   `185.199.111.153`. Y `www` como `CNAME` a `<usuario>.github.io.`.
2. En **Settings → Pages** del repositorio, escribir `sabiduriadebolsillo.com` en *Custom
   domain* y esperar a que la comprobación pase.
3. Marcar **Enforce HTTPS** cuando GitHub termine de emitir el certificado (tarda desde
   unos minutos hasta 24 h desde que el DNS propaga).
4. En **Settings → Secrets and variables → Actions → Variables**, definir `SITE_URL` con
   el valor `https://sabiduriadebolsillo.com`.

Con el ápice como dominio propio, GitHub Pages redirige `www` al ápice por su cuenta; no
hay nada que configurar en el sitio para eso.

Cómo comprobar que quedó bien, sin entrar en ningún panel:

```bash
curl -sI https://sabiduriadebolsillo.com | head -1
curl -sI https://www.sabiduriadebolsillo.com | head -1   # 301 hacia el ápice
```

## 2. Search Console — Historia 7.2 (LC-2, LC-3)

Hecho en el repositorio:

- `/robots.txt` lo sirve `src/pages/robots.txt.ts` y declara
  `https://sabiduriadebolsillo.com/sitemap-index.xml`. La URL sale del mismo módulo de
  dominio que las canónicas, así que un cambio de dominio no puede dejarla apuntando al
  anterior.
- No lleva ningún `Disallow`. Lo que no debe indexarse lo dice cada página en su etiqueta
  `robots` y queda fuera del sitemap. Bloquearlo aquí además sería contraproducente: un
  rastreador que no puede descargar la página tampoco lee su `noindex`, y la URL se queda
  indexable sin descripción y sin forma cómoda de retirarla.

A mano, una vez (necesita la cuenta de Google y la del registrador):

1. En [Search Console](https://search.google.com/search-console), **Agregar propiedad →
   Dominio** y escribir `sabiduriadebolsillo.com`.

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
dig +short TXT sabiduriadebolsillo.com | grep google-site-verification
curl -s https://sabiduriadebolsillo.com/robots.txt
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

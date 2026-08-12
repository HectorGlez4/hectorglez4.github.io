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

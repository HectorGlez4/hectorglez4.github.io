---
title: "Lente de vigencia — la espina v8 contra la web y contra el código instalado"
status: final
created: 2026-10-18
lens: 'verificación (Finalize, finalize_reviewers): ¿investigado o afirmado de memoria?'
against:
  - 'ARCHITECTURE-SPINE.md (árbol de trabajo, git diff del 2026-10-18)'
  - '.memlog.md (D-1…D-16)'
also_read:
  - 'reviews/reconcile-v8-prd.md y reviews/reconcile-v8-ux.md (no se repite lo que ya dicen)'
  - 'package.json, package-lock.json, node_modules/astro, node_modules/axe-core, medicion/, .github/workflows/publicar.yml, dist/ del 2026-10-16'
---

# Lente de vigencia — la espina v8 contra la web y contra el código instalado

**Fecha de todas las consultas:** 2026-10-18. Las líneas citadas son las de `ARCHITECTURE-SPINE.md` en el árbol de trabajo.

## Veredicto

**Pasa con hallazgos.** Lo que la espina dice haber verificado está bien verificado:

- las tres versiones «vigentes» que nombra: Pagefind 1.5.2, axe 4.14.0 y wrangler 4.151.1;
- las APIs de Pagefind en que se apoya;
- que `wcag22aa` enciende `target-size`;
- que `ADD COLUMN` no es idempotente.

Lo que falla es lo que **no** se miró, porque se dio por sabido. Hay cuatro casos:

- el techo de 1 GB de GitHub Pages, con `dist/` ya en 485 MB;
- que Astro mete en línea los guiones empaquetados pequeños, que es justo el mecanismo que AD-6 v8 da por externo;
- que la Historia de Instagram por la hoja del sistema existe, cosa que nadie ha confirmado;
- la semántica de orden de Pagefind, que deja la clave compuesta de AD-25 a medio definir.

**Recuento:** 1 alto · 1 medio-alto · 3 medios · 3 medio-bajos · 6 bajos. Ninguno contradice una decisión de Héctor.

---

## Método

- **Versiones:** se comparan tres fuentes:
  - la fila de la espina;
  - lo que resuelve `package-lock.json`;
  - lo que publica npm hoy (`npm view <paquete> version`).
- **Comportamiento de herramientas:** se lee en el código instalado (`node_modules/astro/dist/core/build/plugins/plugin-scripts.js`, `node_modules/axe-core/axe.js`) cuando decide un hallazgo, y si no, en la documentación oficial.
- **APIs de navegador:** se contrastan con tres fuentes:
  - la especificación W3C;
  - MDN, con su tabla de compatibilidad leída del JSON de `mdn/browser-compat-data`;
  - la documentación de Chrome, web.dev y WebKit.

### Versiones: espina, lockfile y npm

| Paquete | Espina (l. 384–398) | Lockfile | npm, 2026-10-18 | Juicio |
|---|---|---|---|---|
| astro | ^7.2.0 | 7.2.0 | **7.4.0** (2026-10-15) | Desfasado: la 7.4.0 sube el mínimo de Node (hallazgo 7) |
| Node.js | >=22.12.0 | — (local 24.3.0; CI `'22'`) | 22.23.3 LTS · 24 LTS · 26 Current | El suelo ya no es el de Astro 7.4 |
| typescript | ^5.9.0 | 5.9.3 | **7.0.2** | Bien quedarse en 5.9, pero sin decir por qué (bajo 13) |
| zod (vía `astro/zod`) | «la que fija Astro 7» | 4.4.3 | — | `content.config.ts` la importa por la vía obsoleta (bajo 12) |
| pagefind | ^1.5.2, «vigente» | 1.5.2 | 1.5.2 (2026-04-12) | ✓ |
| @astrojs/sitemap | ^3.7.3 | 3.7.3 | 3.7.4 | ✓ (parche) |
| sharp | ^0.35.3 | 0.35.3 | 0.35.5 | ✓ (parche) |
| googleapis | 178.0.0 fijada; «vigente el 2026-10-06: 183.0.0» | 178.0.0 | **186.0.0** | La cifra está fechada; la de hoy es otra (bajo 13) |
| yaml · tsx | ^2.9.0 · ^4.23.12 | 2.9.0 · 4.23.12 | 2.9.1 · 4.23.15 | ✓ |
| vitest | ^4.1.10 | 4.1.10 | **5.0.5** | Mayor nueva sin evaluar (bajo 13) |
| @playwright/test | ^1.62.1 | 1.62.1 | 1.64.1 | ✓ |
| axe (`@axe-core/playwright` → `axe-core`) | ^4.12.1; «vigente 4.14.0» | 4.12.1 → **~4.12.1** | 4.14.0 · 4.14.0 (2026-10-05) | La vigente no se alcanza sin subir el adaptador (hallazgo 6) |
| wrangler | por `npx`, sin fijar; «vigente 4.151.1» | — | 4.151.1 (`engines: node >=22.0.0`) | ✓ la cifra; ✗ sin fijar (hallazgo 8) |

---

## Hallazgos

### 1. ALTO — El sitio publicado se acerca al techo de 1 GB de GitHub Pages, y la espina no lo nombra

- **Espina.** La fila de Stack «Hosting del sitio: GitHub Pages» (l. 396) y el *Entorno operativo* (l. 465) no dan ningún límite. El único aviso de crecimiento está en *Deferred* (l. 528): el build que pase de cinco minutos.
- **Realidad.**
  - **El límite.** GitHub declara: «Published GitHub Pages sites may be no larger than 1 GB». Los despliegues caducan a los 10 minutos ([GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits), consultado el 2026-10-18).
  - **El tamaño de hoy.** `dist/` del 2026-10-16 mide **485 MB** con 4.421 Citas:
    - 308 MB son Tarjetas Sociales: 5.116 PNG de unos 60 KB;
    - 134 MB son Páginas de Cita: unos 29 KB de media, de los que 9,9 KB son `<style>` y 6 KB guion en línea;
    - 21 MB son Pagefind.
  - **El coste por Cita.** Cada Cita nueva suma unos 95–100 KB. Quedan unos 540 MB, así que el techo llega hacia las **9.500–10.000 Citas**.
- **Por qué ya no es remoto.**
  - **El ritmo.** El Corpus pasó de 1.895 a 4.421 Citas entre el 2026-10-08 y el 2026-10-18 (`git ls-tree` por fecha).
  - **Lo que espera.** `corpus/_revision/` tiene **576.427** candidatas sin decidir.
  - **Lo que suma la v8.** Engorda cada Página de Cita: hasta siete Tarjetas de Cita, la Tarjeta de Obra, `data-pagefind-filter`, `data-pagefind-sort` y metadatos. *Deferred* (l. 515) lo reconoce para NFR-7, pero no para el techo del alojamiento.
  - **Un fallo sin aviso previo.** Al pasar de 1 GB, el despliegue falla en la publicación, no en el build.
- **La salida obvia tiene su propio techo.** Cloudflare Pages admite 20.000 ficheros por sitio en el plan gratuito ([Pages limits](https://developers.cloudflare.com/pages/platform/limits/), actualizado el 2026-09-05). `dist/` ya tiene **15.339**, y cada Cita suma unos tres (HTML, PNG y fragmento de Pagefind).
- **Propuesta.**
  1. Escribir en *Entorno operativo* el techo de 1 GB y el plazo de 10 minutos.
  2. Crear en `umbrales.ts` un tope con nombre del peso de `dist/`, por debajo del límite y con margen. Una comprobación en `astro:build:done` lo mide: avisa al pasar del tope y rompe antes de llegar al límite. Es el patrón de AD-9 y AD-17.
  3. Dar a la entrada de *Deferred* «Estrategia de crecimiento del build» una segunda condición de reapertura: el peso de `dist/`, no solo el tiempo. Lo que más pesa es la Tarjeta Social por Cita, que es lo primero que se mira (paleta o compresión del PNG, AD-16).

### 2. MEDIO-ALTO — Astro mete en línea los guiones empaquetados pequeños: el plano de un guion lo decide su tamaño, no AD-6

- **Espina.** AD-6 v8 (l. 109) pone en la lista cerrada de **guiones externos** los «guiones empaquetados por Astro de las islas que necesitan `src/lib`», y añade que «`bytesDeGuionEnLinea` cuenta cero a un `<script src>`». La convención «Guiones» dice lo mismo (l. 370).
- **Realidad.**
  - **La documentación.** Dice de los `<script>` procesados: «If the script is small enough, Astro will inline it directly into the HTML» ([Astro, client-side scripts](https://docs.astro.build/en/guides/client-side-scripts/), consultado el 2026-10-18).
  - **El código instalado.** En Astro 7.2.0, `shouldInlineScriptChunk` (`node_modules/astro/dist/core/build/plugins/plugin-scripts.js`) mete en línea todo trozo que cumpla tres condiciones:
    - no tiene importaciones estáticas;
    - no tiene importaciones dinámicas;
    - pesa menos que `build.assetsInlineLimit`, que es 4.096 bytes en Vite por omisión.
  - **Este proyecto.** `astro.config.mjs` no toca ese valor.
  - **Sigue vivo en la serie 7.** La 7.3.6 corrigió precisamente los «inlined scripts».
- **Qué se cae.** El filtro de los Directorios y el disparador de la Historia pueden quedar por debajo de 4 KB, y una isla que no comparte módulo con otra sale de Rolldown sin importaciones. Esas islas no llegan como `<script src>`: van **dentro** del HTML y cuentan contra `MAX_BYTES_DE_GUION`. La Página de Cita ya está en unos 5,9 KB de los 6.656. Una edición que las haga crecer las vuelve a sacar a fichero. El fallo es visible, porque la prueba del tope o la de la lista cerrada se ponen en rojo, pero imprevisible: depende de cómo trocee el empaquetador, no de lo que declara la espina.
- **Propuesta.** AD-6 fija el plano por configuración. `vite.build.assetsInlineLimit` acepta una función que devuelve `false` para los `.js`, y deja el resto a la regla por omisión ([Vite, build options](https://vite.dev/config/build-options)). Astro respeta esa función (`shouldInlineAsset` en `util.js`). La prueba de la lista cerrada exige que cada guion empaquetado salga como `<script src>`.

### 3. MEDIO — Nadie ha confirmado que la Historia de Instagram llegue por la hoja del sistema, y la espina construye encima

- **Espina.** AD-7 v8 (l. 120) y AD-8 v8 (l. 127) fijan varias cosas: dos toques, `navigator.share({ files })`, una columna 9:16 en `tramos.ts`, su geometría y una prueba de cabida en los dos formatos.
- **Realidad.**
  - **Lo confirmado.** La API existe y es estable: [Web Share API, W3C Recommendation del 2023-05-30](https://www.w3.org/TR/web-share/), con `files` y `canShare()`.
  - **Lo no confirmado.** No se encontró ninguna fuente que confirme que Instagram ofrece **Historia** como destino de un fichero compartido desde la web.
  - **El único indicio, y es en contra.** Un hilo de la comunidad de desarrolladores de Meta, de hace un año y sin fecha exacta, dice que en iPhone Instagram ofrece Reels, Feed y Direct, que Feed da error y que Android funciona ([hilo](https://developers.secure.facebook.com/community/threads/1094504835445267/)).
  - **Lo que hacen las integraciones conocidas.** Llegan a Historias por vía nativa (`instagram-stories://share`, con registro en Meta), no por la web.
- **Qué se cae.** El PRD lo lista como supuesto en §15 («depende de versiones de aplicación y de sistema que el producto no controla»), pero la espina lo trata como hecho. Si en iOS no aparece Historia, la columna 9:16, su geometría y su prueba de cabida quedan construidas para un destino que solo existe en Android.
- **Propuesta.** No hace falta reabrir la decisión. La espina declara la condición: antes de que la Épica 25 construya el 9:16, la matriz de dispositivos comprueba el destino Historia en iOS Safari y Android Chrome con la versión de Instagram del día. Y escribe qué se conserva si en iOS no está, porque el cuadrado y el destino Feed sí funcionan por la misma vía.

### 4. MEDIO — La clave compuesta de `data-pagefind-sort` choca con tres reglas documentadas de Pagefind

- **Espina.** AD-25 v8 (l. 326): «`data-pagefind-sort` es una sola clave compuesta en el build: el orden del Directorio del Autor, después el de su lista de obras y después el del libro».
- **Realidad** ([Pagefind, sorts](https://pagefind.app/docs/sorts/) y [JS API sorting](https://pagefind.app/docs/js-api-sorting/), consultados el 2026-10-18):
  1. **Orden alfabético.** Si un solo valor no se lee como número, «all values will be sorted alphabetically». Una clave compuesta sin anchura fija ordena «10» antes que «9».
  2. **Páginas excluidas.** Las páginas sin la clave **se excluyen** del resultado cuando se ordena.
  3. **Adiós a la relevancia.** Ordenar «will override the default rankings».
- **Qué se cae.** Hay tres caminos que divergen: una clave de texto sin relleno da un orden del libro falso; ordenar una búsqueda con texto pierde la relevancia; y ordenar sin filtro hace desaparecer Autores, Temas, Obras y Directorios, que no llevan clave. Lo salva hoy que, con filtro, «solo salen Citas» (`EXPERIENCE.md`, l. 422), pero la espina no lo dice.
- **Propuesta.** AD-25 precisa tres cosas:
  - la clave es **un ordinal entero global** compuesto en el build, que Pagefind ordena como número; o, si es texto, de anchura fija;
  - se aplica solo a `search(null, …)` con filtros, nunca a una consulta con texto;
  - la llevan solo las Citas, a sabiendas.

### 5. MEDIO — `navigator.share` rechaza de cinco maneras y la espina gobierna dos; compartir gasta la activación

- **Espina.** AD-7 v8 (l. 120): «`NotAllowedError` cae en la descarga; `AbortError` no registra nada». Es complemento del punto 2 de «Huecos menores» de `reconcile-v8-ux.md`, que trató el orden de `writeText`.
- **Realidad.**
  - **La especificación** ([W3C, `share()`](https://www.w3.org/TR/web-share/)):
    - el paso 7 **consume** la activación;
    - `AbortError` sirve **para dos cosas**: la cancelación y que «no hay destinos» (pasos 13.1 y 13.4);
    - `DataError` es el fallo al entregar.
  - **MDN** ([`Navigator.share`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share)) añade `InvalidStateError`, cuando hay otra compartición en curso, y `TypeError`, cuando no admite ficheros.
  - **WebKit** confirma que `share()` consume la activación: la llamada siguiente que la exija falla ([The User Activation API, 2023-02-15](https://webkit.org/blog/13862/the-user-activation-api/)).
  - **Un hecho que matiza el PRD.** `navigator.userActivation.isActive` existe en Chrome 72, Firefox 120 y Safari 16.4 (`mdn/browser-compat-data`). La pérdida de la activación no se puede prever *antes del toque*, como dice el PRD, pero sí *dentro* del manejador.
- **Qué se cae.**
  - Un doble toque da `InvalidStateError` sin conducta declarada.
  - Un `DataError` deja al visitante sin imagen y sin aviso.
  - Si alguien copia el enlace **después** de `share()`, Safari rechaza `writeText` y «Enlace copiado» miente.
- **Propuesta.** Una línea en AD-7:
  - `writeText` se lanza **antes** de `share()` en el mismo manejador;
  - `InvalidStateError` se ignora;
  - `DataError` y `TypeError` caen en la descarga, como `NotAllowedError`;
  - `AbortError` no registra nada, a sabiendas de que incluye «sin destinos».

### 6. MEDIO-BAJO — La axe «vigente» no se instala sin subir el adaptador, y la vigente corrige `target-size` en lo que la v8 añade

- **Espina.** La fila de Stack (l. 394) dice «^4.12.1; *(v8)* el barrido pide `wcag22aa` (vigente de axe el 2026-10-18: 4.14.0)», y AD-17 (l. 225) lo repite.
- **Realidad.**
  - **Lo confirmado.** `wcag22aa` sí enciende `target-size`. En `axe-core` 4.12.1 instalado la regla lleva `enabled: false`, pero `matchTags` (`axe.js`, l. 20155) la ejecuta cuando la etiqueta pedida casa, sin mirar `enabled`. La documentación lo declara «disabled by default» ([rule-descriptions](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)).
  - **El candado.** `@axe-core/playwright@4.12.1` depende de `axe-core: ~4.12.1`, así que `npm update` no pasa de 4.12.x.
  - **Lo que trae la 4.14.0** (2026-10-05, [CHANGELOG](https://github.com/dequelabs/axe-core/blob/develop/CHANGELOG.md)):
    - «target-size: ignore overlapping links with the same destination»;
    - `label-content-name-mismatch` encendida por omisión.
- **Qué se cae.** La primera pasada con `wcag22aa` corre con la 4.12.1, y lo que mira es justo lo que la v8 añade: la Fila de Autor y el Resultado como enlace de bloque, y la Tarjeta de Obra. Un falso positivo de `target-size` acaba en una exención o en un rediseño que no hacía falta.
- **Propuesta.** El mismo commit que añade `wcag22aa` sube `@axe-core/playwright` y `axe-core` a 4.14.0. La fila de Stack dice lo instalado, no lo vigente.

### 7. MEDIO-BAJO — Astro 7.4.0 sube el mínimo de Node a 22.22.0; la fila de Stack sigue en 22.12

- **Espina.** La fila de Stack dice «Node.js >=22.12.0» (l. 385). Lo mismo dicen `package.json` (`engines`) y `tools/comprobar-node.mjs` (`VERSION_MINIMA = '22.12.0'`).
- **Realidad.** Astro 7.4.0, del 2026-10-15, trae «Increases the minimum Node.js version to 22.22.0» ([CHANGELOG de astro](https://raw.githubusercontent.com/withastro/astro/main/packages/astro/CHANGELOG.md), PR #18277).
- **Qué se cae.** `^7.2.0` admite la 7.4.0. Con la subida, la comprobación propia deja pasar un Node 22.12–22.21 con el que Astro ya no arranca. Hoy no muerde: el CI pide `'22'`, que resuelve a 22.23.3 ([Node.js releases](https://nodejs.org/en/about/previous-releases)), y en local corre 24.3.0.
- **Propuesta.** La fila de Stack nombra la versión del lockfile, que es la que se construye, y ata el suelo de Node al de la menor de Astro que se instale. `comprobar-node.mjs` se sube en el mismo commit que suba Astro.

### 8. MEDIO-BAJO — `wrangler` pasa a migrar la base de producción y sigue sin fijar

- **Espina.** AD-14 v8 (l. 186) y el diagrama del despliegue (l. 469) hacen de `wrangler d1 migrations apply --remote` el primer paso de todo cambio de vocabulario. La fila de Stack (l. 398) dice «por `npx`, sin fijar».
- **Realidad.**
  - **Lo confirmado** ([D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/), actualizado el 2026-06-08; [comandos de wrangler d1](https://developers.cloudflare.com/workers/wrangler/commands/d1/), actualizado el 2026-04-23):
    - `migrations_dir` y la tabla `d1_migrations`;
    - una migración que falla se revierte;
    - `apply` captura copia de seguridad.
  - **Lo que la documentación no dice.** No da el valor por omisión entre `--local` y `--remote`.
- **Qué se cae.** Con `npx wrangler` sin versión, cada ejecución usa la última publicada. Un cambio de valores por omisión o de formato de salida mueve **adónde** cae una migración o **cómo** lee `tools/` la línea base, sin ningún diff en el repositorio.
- **Propuesta.** Fijar la versión en las órdenes (`npx wrangler@4.151.1`) o en un `package.json` propio de `medicion/`, sin `@cloudflare/workers-types` (pitfall de `AGENTS.md`). Y que `--remote` vaya siempre explícito, como ya hace el diagrama.

### Bajos

9. **Prerenderizado.** AD-6 v8 dice que la vista sale «a partir de un `data-*` de la página» (l. 108), y AD-13 cubre `pageshow` con `persisted` (l. 172), pero no el prerenderizado.
   - **El hecho.** Chrome prerenderiza sin que el sitio lo pida desde la barra de direcciones, con confianza por encima del 50 %, y desde los marcadores. Recomienda retrasar la analítica hasta la activación con `document.prerendering` y `prerenderingchange` ([Prerender pages](https://developer.chrome.com/docs/web-platform/prerender-pages), actualizado el 2026-01-23). `document.prerendering` existe desde Chrome 108.
   - **Qué pasa.** La lectura no se cuenta, porque la página está oculta, pero la **vista** sí.
   - **Propuesta.** Una cláusula: la vista espera a la activación. Es barata y cabe en el mismo corte de la serie que ya pide `reconcile-v8-prd.md` (hueco 3).
10. **Límite de frecuencia de `replaceState`.** La convención de dirección (l. 368) no lo menciona, y la UX reemplaza la dirección a cada cambio del selector «mientras el mismo selector sigue cambiando» (`EXPERIENCE.md`, l. 260).
    - **El hecho.** MDN avisa de `SecurityError` «if the method is called too frequently» ([History.replaceState](https://developer.mozilla.org/en-US/docs/Web/API/History/replaceState)). WebKit lo ha aplicado como 100 llamadas en 30 s; el bug 257269 está resuelto y **no se confirmó el valor actual**.
    - **Propuesta.** Escribir la dirección tras la misma pausa de AD-9, y con `try`, para que una excepción no mate la isla.
11. **La URL versionada del guion de medición.** GitHub Pages sirve todo con `cache-control: max-age=600`; se comprobó con `curl -I` contra el sitio el 2026-10-18. Cada despliegue sustituye el sitio entero. Un HTML en caché de hasta 10 minutos apunta, tras un despliegue que cambie el guion, a un fichero que ya no existe, y esas vistas se pierden. Solo ocurre cuando cambia el vocabulario. Se acepta y se nombra, o se conserva el fichero anterior durante un despliegue.
12. **`z` por la vía obsoleta.** La fila de Stack dice «Zod (vía `astro/zod`)» (l. 387), pero `src/content.config.ts:5` importa `z` de `astro:content`. Los tipos de Astro 7.2.0 lo marcan `@deprecated`: «will be removed in Astro 7. Use `import { z } from 'astro/zod'`» (`node_modules/astro/types/content.d.ts`). La puerta de AD-1 cuelga de esa importación.
13. **Deriva de versiones sin consecuencia en la v8**, para que la fila no parezca al día:
    - **TypeScript 7.0.2** es la última, y `astro check` no la admite: Astro 7.3.4 «explains that TypeScript 7 is not currently supported». Quedarse en `^5.9` es correcto; conviene escribir el motivo.
    - Vitest 5.0.5, Playwright 1.64.1, googleapis 186.0.0 (la espina dice 183.0.0 «el 2026-10-06»), sharp 0.35.5, `@astrojs/sitemap` 3.7.4, tsx 4.23.15 y yaml 2.9.1.
14. **Cifras que ya no son de hoy, y una cosa fuera de la espina.**
    - **AD-16 (l. 204)** sigue diciendo «Hoy se rasterizan 38 Tarjetas; a las ~2.000 Citas… 53 veces». Hoy son 5.116 PNG y 4.421 Citas, así que la condición que la regla preveía ya se cumplió con creces. Ver el hallazgo 1.
    - **Fuera de la espina.** GitHub retiró Node 20 de los ejecutores el 2026-09-23, sin opción de seguir con él ([changelog](https://github.blog/changelog/2026-09-23-node-20-is-no-longer-available-in-github-actions)). `publicar.yml` usa `checkout@v4`, `setup-node@v4`, `upload-pages-artifact@v3` y `deploy-pages@v4`, todas hechas para Node 20. Su comentario de `fetch-depth: 0` habla de 31 MB de `.git`, y hoy son 348 MB.

---

## Comprobado, sin hallazgo

| Afirmación de la espina | Contraste | Fuente |
|---|---|---|
| Pagefind 1.5.2 es la vigente | 1.5.2, del 2026-04-12, marcada *Latest* | [releases](https://github.com/Pagefind/pagefind/releases), npm |
| «Desde la 1.5.0 la metadata se busca por defecto» y «no hay forma documentada de excluirla» (*Deferred*, l. 519) | La 1.5.0 dice «Pagefind now searches metadata by default!». `metaWeights` a `0.0` solo quita peso en el ranking; no se documenta quitar el campo de la coincidencia | [metadata](https://pagefind.app/docs/metadata/), [ranking](https://pagefind.app/docs/ranking/) |
| `filters()` y `search(null, …)` | Documentados: `filters()` carga los ficheros de filtro, y `null` filtra sin buscar | [JS API filtering](https://pagefind.app/docs/js-api-filtering/) |
| `wcag22aa` enciende `target-size` | Verificado en `axe-core` 4.12.1 instalado (`matchTags`) | `node_modules/axe-core/axe.js` |
| `wrangler` 4.151.1 vigente; `migrations_dir`; solo aditivas | Coincide; una migración que falla se revierte | npm; docs de D1 citadas arriba |
| `ADD COLUMN` no es idempotente | SQLite no admite `IF NOT EXISTS` en `ADD COLUMN`; una columna nula es válida | [ALTER TABLE](https://www.sqlite.org/lang_altertable.html) |
| La baliza sin cookies llega al receptor | `guionDeMedicion` envía una **cadena**, `text/plain`, sin comprobación previa de CORS. Chrome rechaza en `sendBeacon` un `Blob` de tipo no seguro desde la 59 | `src/lib/medicion.ts:126`; nota de `sendBeacon` en `mdn/browser-compat-data` |
| La búsqueda asentada se emite «al ocultarse la página» | Es la recomendación vigente: «consider the hidden state the last reliable time». `pagehide` no es fiable en móvil. Safari ≥ 14.1 dispara `visibilitychange` al salir | [Page Lifecycle API](https://developer.chrome.com/docs/web-platform/page-lifecycle-api) (2026-10-16); `mdn/browser-compat-data` |
| `pageshow` con `persisted` cuenta como carga nueva | Lo recomienda web.dev para la analítica. El montón de JS se restaura entero, así que la regla tiene que reiniciar a mano el acumulado, las marcas y «una por carga». El sitio es apto para la bfcache: no envía `no-store` | [bfcache](https://web.dev/articles/bfcache) (2026-10-16); cabeceras del sitio |
| Quitar `de` y `via` con `replaceState` cuenta una vez por llegada | `replaceState` reescribe la entrada actual del historial: atrás, adelante y recargar vuelven a la URL limpia. Exige el mismo origen | [History.replaceState](https://developer.mozilla.org/en-US/docs/Web/API/History/replaceState) |
| `<details>` como base sin guion de «Más opciones…» | Soporte universal: Chrome 12, Firefox 49, Safari 6 | `mdn/browser-compat-data` |
| Hoja del sistema detectada con `canShare({ files })` (addendum) | `canShare` con ficheros: Chrome 89 (escritorio completo desde la 128), Chrome Android 76, Safari 14. **Android WebView: no**, que es el caso del navegador de las aplicaciones de Meta en Android, y por eso el botón no aparece. Firefox de escritorio: tras una bandera | `mdn/browser-compat-data` (`api/Navigator.json`) |
| Cuota de URL Inspection | 2.000 al día y 600 por minuto por propiedad, sin cambios | [Search Console limits](https://developers.google.com/webmaster-tools/limits) (2025-08-28) |
| El receptor gratuito aguanta la v8 | D1 gratuito admite 100.000 filas escritas al día, y cada índice cuenta como una fila más. Con dos índices, unos 3 eventos por carga son unas 9 filas: caben unas 11.000 cargas al día, frente a unas 90 vistas al día de hoy | [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/) (2026-04-21); `medicion/esquema.sql` |
| Un guion de medición propio no lo tumban las listas de bloqueo | EasyPrivacy (versión 202610181723) no tiene ninguna regla con «medicion». Sus reglas genéricas de `workers.dev` son `/api/event` y `/js/script.js`, y el receptor contesta en la raíz | easylist.to, descargada el 2026-10-18 |

## Lo que no se pudo confirmar

- **Que Instagram ofrezca «Historia» al recibir un fichero desde la web**, en iOS y en Android (hallazgo 3).
- **La duración de la activación transitoria en Safari.** Los informes de WebKit dicen 5 s, y uno observa unos 750 ms entre el toque y su final. Lo que importa para AD-7 sí está confirmado: que `share()` la consume.
- **El tope actual de `replaceState` en Safari** (bajo 10).
- **Si Pagefind devuelve los valores de filtro en `result.data()`.** Habría permitido llevar `tipo` como filtro en vez de como metadato y cerrar la entrada de *Deferred* (l. 519); la documentación no lo dice.
- **Las fechas de fin de vida de Node 22 y 24.** La página de versiones no las rotula.

## Fuentes

Todas consultadas el 2026-10-18.

- Astro: [client-side scripts](https://docs.astro.build/en/guides/client-side-scripts/) · [CHANGELOG](https://raw.githubusercontent.com/withastro/astro/main/packages/astro/CHANGELOG.md) · código instalado 7.2.0
- Vite: [build options](https://vite.dev/config/build-options)
- Pagefind: [releases](https://github.com/Pagefind/pagefind/releases) · [metadata](https://pagefind.app/docs/metadata/) · [ranking](https://pagefind.app/docs/ranking/) · [sorts](https://pagefind.app/docs/sorts/) · [JS API sorting](https://pagefind.app/docs/js-api-sorting/) · [JS API filtering](https://pagefind.app/docs/js-api-filtering/) · [API](https://pagefind.app/docs/api/)
- axe-core: [rule-descriptions](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md) · [API](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md) · [CHANGELOG](https://github.com/dequelabs/axe-core/blob/develop/CHANGELOG.md)
- Cloudflare: [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/) · [wrangler d1](https://developers.cloudflare.com/workers/wrangler/commands/d1/) · [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/) · [Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
- GitHub: [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) · [Node 20 retirado de Actions](https://github.blog/changelog/2026-09-23-node-20-is-no-longer-available-in-github-actions)
- Web Share y activación: [W3C Web Share API](https://www.w3.org/TR/web-share/) · [MDN Navigator.share](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share) · [WebKit, The User Activation API](https://webkit.org/blog/13862/the-user-activation-api/) · [hilo de Meta sobre Instagram y Web Share](https://developers.secure.facebook.com/community/threads/1094504835445267/)
- Ciclo de vida: [web.dev bfcache](https://web.dev/articles/bfcache) · [Page Lifecycle API](https://developer.chrome.com/docs/web-platform/page-lifecycle-api) · [Prerender pages](https://developer.chrome.com/docs/web-platform/prerender-pages) · [MDN History.replaceState](https://developer.mozilla.org/en-US/docs/Web/API/History/replaceState)
- Compatibilidad: `mdn/browser-compat-data` 8.1.6 (`api/Navigator.json`, `Clipboard.json`, `Document.json`, `History.json`, `UserActivation.json`, `Window.json`, `html/elements/details.json`)
- Otros: [Node.js releases](https://nodejs.org/en/about/previous-releases) · [SQLite ALTER TABLE](https://www.sqlite.org/lang_altertable.html) · [Search Console limits](https://developers.google.com/webmaster-tools/limits) · EasyPrivacy (easylist.to) · registro de npm (`npm view`)

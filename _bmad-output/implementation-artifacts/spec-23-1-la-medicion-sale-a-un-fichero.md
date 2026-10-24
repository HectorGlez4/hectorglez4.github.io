---
title: 'Historia 23.1 — La medición sale a un fichero, y la Página de Cita no pierde su listón'
type: 'feature'
created: '2026-10-24'
status: 'done'
baseline_revision: '225114cf6638192b9c61f3aa8b53720c0e4e3d89'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-23-context.md'
warnings: [oversized]
deferred: []
---

<intent-contract>

## Intent

**Problem:** el guion de medición (`guionDeMedicion` + la llamada de vista) va en línea en cada página y se come ~630 de los 6.656 bytes de `MAX_BYTES_DE_GUION` de la Página de Cita; cada página elige su vista con la prop `vista`, las islas emiten con `window.__medir && …`, `CopiarCita` mete el slug por `define:vars` y no existe lista de guiones externos ni tope para ellos, así que las épicas 24–28 no tienen hueco en línea y un `<script src>` nuevo pasaría sin que nada lo contara.

**Approach:** el build genera el guion como fichero (`/medicion/{version}.js`, endpoint `.js.ts` desde `src/lib/medicion.ts`, sin fichero ni etiqueta sin `MEDICION_ENDPOINT`), el armazón abre siempre una cola `__medir` en línea y carga el fichero con `<script src defer>` en toda superficie `producto`/`servicio`; las vistas salen de `superficies.ts` a `data-vistas` del `<html>`; los guiones externos se declaran en una lista cerrada con tope en `umbrales.ts`; las islas pasan a `__medir(…)`, a `data-*` y a una sola función de anuncio de `src/lib/`; y las pruebas de ausencia se juzgan contra un sitio construido con punto final.

## Boundaries & Constraints

**Always:**
- El vocabulario y el punto final se importan de `src/lib/medicion.ts` al componer el fichero; nada se copia en `public/`. La carga que viaja no cambia: `{evento, ruta, origen, destino, datos}`, con `origen` leído de `?de=` y cotejado como hoy; `medicion/receptor.ts` no se toca.
- Emiten las mismas vistas que hoy: `vista-de-cita` la Página de Cita; `vista-de-superficie` la portada y la página 1 de Autor, Tema, Colección y Obra indexable; ninguna las páginas 2+, `/buscar/`, `/404`, la Obra no indexable, `/kit` ni `/lote`.
- El arranque va en **toda** página del armazón (también `/kit`, `/lote` y sin punto final): solo cola, sin memoria ni vocabulario. El fichero, al cargar —o en `prerenderingchange` si `document.prerendering`—, emite las vistas de `data-vistas`, después vacía la cola en orden y queda como `__medir`.
- Toda isla llama `__medir(…)` a secas; ninguna asigna `__medir`. Ningún guion en línea lleva datos de contenido (slug, texto, Obra): van en `data-*`; el de cada isla es idéntico byte a byte en su familia. Única exención: `src/islands/ImagenDelKit.astro`, nombrada en la prueba hasta la 25.4.
- Los comentarios explicativos van fuera de los guiones en línea (viajan al visitante y cuentan en el tope). Identificadores y comentarios en español, con el glosario.
- Cada tope de la lista cerrada se fija midiendo lo que cuenta (bytes UTF-8 sin comprimir del fichero y de lo que importa de forma estática) más ~400 bytes de margen, el precedente del comentario de `MAX_BYTES_DE_GUION`, con la medida escrita en su comentario.

**Block If:**
- Alguna superficie pública, construida con punto final, no cabe en `MAX_BYTES_DE_GUION` tras el cambio (subirlo no es de esta historia).
- Astro no emite el `<script is:inline src defer>` tal cual en el `<head>`, o `define:vars` + `set:html` no se combinan en `(function(){…})()` en Astro 7.2.0 (comprobado en el compilador 2.13.1 al planificar) y no hay otra forma sin copiar la función de anuncio.

**Never:**
- Tocar `medicion/` (receptor, worker, esquema, wrangler), añadir eventos o campos (`lectura`, `primera`, `via`, zonas…: son de la 23.2+), quitar `?de=` de la dirección (23.6), `assetsInlineLimit` (26.6), el `webServer` de `playwright.config.ts` (23.2), subir `MAX_BYTES_DE_GUION`, cambiar `public/islas/imagen.js` o `ImagenDelKit.astro`.
- `wrangler`, `--remote`, escribir en D1, el Worker o el sitio en vivo; push o fusión; editar `_bmad-output/planning-artifacts/` o `_bmad-output/specs/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Con punto final | build con `MEDICION_ENDPOINT` | existe `dist/medicion/{v}.js`; toda página `producto`/`servicio` lleva una sola `<script src="/medicion/{v}.js" defer>` en el `<head>`; `/kit` y `/lote`, ninguna; ninguna página lleva `sendBeacon` ni la URL en línea | — |
| Sin punto final | build sin la variable | `getStaticPaths` vacío: ni `dist/medicion/` ni etiqueta; quedan el arranque y `data-vistas` | nada se envía |
| Contenido cambia | otro punto final u otro guion | otro `{v}` | — |
| Cola | una isla llama antes de que cargue el fichero | al cargar: vistas, después la cola en su orden, cada una una vez | evento fuera del vocabulario: se descarta, como hoy |
| Sin `data-vistas` | página sin vistas declaradas | ninguna vista; la cola se vacía igual | — |
| Prerender | `document.prerendering` = true | nada hasta `prerenderingchange`; entonces las vistas una sola vez y la cola | — |
| Kit | dos `CopiarCita` en `/kit/` | cada botón copia su `data-carga`; el segundo vive | — |
| Guion ajeno | `<script src>`/`import()` en `dist/` fuera de la lista, de otro origen, o entrada sin tope | falla Vitest | — |

</intent-contract>

## Code Map

- `src/lib/medicion.ts:107-143` -- `guionDeMedicion(url)` (en línea hoy, 572 B) y `emitir()` (`window.__medir && …`); `EVENTO_DE_VISTA`/`Vista` (63-72) los usan solo `Medicion.astro` y `Armazon.astro`. Dueño de la composición: aquí van el texto del arranque, el del fichero y su versión.
- `src/components/Medicion.astro` -- instala hoy el guion en línea con la vista; pasa a emitir el arranque y, con punto final y superficie no `ajena`, la etiqueta externa.
- `src/components/Armazon.astro:41,64,160` -- prop `vista` y `<Medicion vista>`; ya declara `rutasIndexables` antes de `consecuenciasDe` (79-80). Aquí va `data-vistas` del `<html>`.
- `src/lib/superficies.ts:260-287,489` -- `Consecuencias`/`consecuenciasDe`: la quinta consecuencia (vistas) y si carga la medición (`caracter !== 'ajena'`) salen de aquí; sin importaciones hoy (puede importar `EVENTOS`; nunca cadenas `vista-de-…` sueltas: lo prohíbe `tests/unit/medicion.test.ts`).
- Páginas con `vista=`: `src/pages/index.astro:61`, `cita/[slug].astro:66`, `autor/[slug]/[...page].astro:89`, `tema/[slug]/[...page].astro:55`, `coleccion/[slug]/[...page].astro:124`, `obra/[autor]/[slug]/[...page].astro:101-107,127` (`emiteVista`).
- `src/pages/[clave].txt.ts` -- patrón de endpoint con `getStaticPaths` y tipo en el nombre (el censo de `publicable-y-alcanzable.test.ts:109-124` no exige declarar un `.js.ts`).
- `src/islands/CopiarCita.astro:93-126` -- `define:vars` con `INSTANCIA` (slug) y selector `[data-copiar="${INSTANCIA}"]`; anuncia con `requestAnimationFrame` a mano.
- `src/islands/ImagenDeCita.astro:167-297` -- `decir` local (anuncio), `window.__medir &&` (289, 294), `import(`/islas/imagen.js…`)`.
- `src/islands/CompartirEnlace.astro:77-98` -- `window.__medir &&` (83, 94); no anuncia.
- `src/pages/buscar.astro:150-…` -- `decir` local, `window.__medir &&` (197), `import('/pagefind/pagefind.js')`.
- `src/islands/ImagenDelKit.astro:48` -- `define:vars={{ INSTANCIA: cita.slug }}`: exención nombrada, no se toca.
- `src/lib/umbrales.ts:165-183` -- `MAX_BYTES_DE_GUION` y el precedente de ~400 B de margen.
- `tests/unit/ayuda/guion.ts` -- `bytesDeGuionEnLinea` (un `<script src>` cuenta 0); aquí van los ayudantes nuevos.
- `tests/unit/ayuda/medicion.ts` -- sandbox del guion (`new Function`); sin `document` hoy.
- `tests/unit/medicion.test.ts` -- builds `sitioMedido`/`sitioSinMedir` de `CORPUS_MEDIDO`; cuenta vistas por el texto de `emitir` y espera `window.__medir=function` (150-370).
- `tests/unit/ingreso-construido.test.ts:810` -- espera `window.__medir=function`; `redes.test.ts:38-55`, `comparticion.test.ts:44-49,113-157` usan el sandbox.
- `tests/unit/ayuda/construir.ts:99-` -- `construirConCorpus` con `entorno`, `conBusqueda` (Pagefind) y `paginaConstruida`.
- `tests/e2e/receptor.spec.ts` -- sitio con punto final + Pagefind en 4400, receptor Node en 4399, serie, solo `escritorio`.
- Pruebas de ausencia: `pagina-de-cita.spec.ts:132-170`, `portada.spec.ts:69-75`, `pagina-de-autor.spec.ts:99-106`, `pagina-404.spec.ts:89-96`, `seo.spec.ts:107-116`. Espías: `compartir-enlace.spec.ts:150-160`, `imagen.spec.ts:105`, `compartir-imagen.spec.ts:105,214`, `busqueda.spec.ts:288`. `kit.spec.ts:22-33` solo prueba `.first()`.
- `DESPLIEGUE.md:206-208` (guion en línea, ~650 B) y §3 (339-); `AGENTS.md`, convención de mensajes de estado.

## Tasks & Acceptance

**Execution:**
- `src/lib/umbrales.ts` -- añadir `MAX_BYTES_GUION_DE_MEDICION`, `MAX_BYTES_GUION_DE_IMAGEN` y `MAX_BYTES_GUION_DE_PAGEFIND`, cada uno medido + ~400 B, con la medida, qué cuenta y el precedente en su comentario -- AD-6, AD-9: tope con nombre en un diff visible.
- `src/lib/guiones.ts` (nuevo) -- `GUIONES_EXTERNOS`: tres entradas (`medicion`, con la página; `imagen`, `import()` al pulsar y al cargar en `/kit` y `/lote`; `pagefind`, `import()` al enfocar/filtrar/llegar con estado), cada una con su reconocedor de ruta del mismo origen y su tope importado de `umbrales.ts` -- la lista nombra entradas, no ficheros, y la 26/27 la amplían.
- `src/lib/anuncio.ts` (nuevo) -- `anunciar(region, texto)`: vacía la región y escribe en el siguiente fotograma; escrita para que `String(anunciar)` sea JS válido y corto -- dueño único del primer ritmo (UX-DR99); la 26 añade el segundo.
- `src/lib/medicion.ts` -- exportar el texto del arranque (cola), el del fichero (emisor de hoy + vistas desde `data-vistas` + espera a la activación + vaciado de la cola + sustitución) y su versión por contenido (hash puro, sin importar Node) con la ruta `/medicion/{v}.js`; quitar `emitir`, `EVENTO_DE_VISTA` y `Vista` si quedan sin uso; reescribir los comentarios que hablan del guion en línea -- AD-6, AD-13.
- `src/lib/superficies.ts` -- declarar en cada `Superficie` su vista (por `EVENTOS`) y exponer en `consecuenciasDe(ruta)` las vistas de la ruta (solo si su carácter efectivo es `producto`) y si carga la medición (`producto`/`servicio`) -- quinta consecuencia de AD-17.
- `src/pages/medicion/[version].js.ts` (nuevo) -- `getStaticPaths` con `puntoFinal(process.env)`: `[]` sin ella, una ruta con la versión con ella; `GET` sirve el fichero con `text/javascript; charset=utf-8` -- AD-6.
- `src/components/Medicion.astro`, `src/components/Armazon.astro` -- quitar la prop `vista`; arranque en línea siempre en el `<head>`; `<script is:inline src={ruta} defer></script>` solo con punto final y si la ruta carga la medición; `data-vistas` en el `<html>` (ausente sin vistas); comentarios al día -- ninguna página elige su vista.
- `src/pages/index.astro`, `src/pages/cita/[slug].astro`, `src/pages/autor/[slug]/[...page].astro`, `src/pages/tema/[slug]/[...page].astro`, `src/pages/coleccion/[slug]/[...page].astro`, `src/pages/obra/[autor]/[slug]/[...page].astro` -- quitar `vista=` (y en la Obra `emiteVista` con sus importaciones si quedan sin uso) -- la vista sale de la declaración.
- `src/islands/CopiarCita.astro` -- sin slug en el guion: el botón se encuentra por `document.currentScript` o delegación; `__medir(…)`; anuncia con `String(anunciar)` por `set:html` (ver Design Notes) -- AD-6, AD-12.
- `src/islands/ImagenDeCita.astro`, `src/pages/buscar.astro` -- su `decir` pasa a `String(anunciar)` por `set:html`; `__medir(…)` -- UX-DR99.
- `src/islands/CompartirEnlace.astro` -- `__medir(…)` -- AD-13.
- `tests/unit/ayuda/medicion.ts` -- el sandbox ejecuta arranque y fichero con un `document` simulado (`documentElement.dataset.vistas`, `prerendering`, `addEventListener`) y permite encolar antes de cargar; `redes.test.ts` y `comparticion.test.ts` se ajustan solo a su API.
- `tests/unit/ayuda/guion.ts` -- ayudantes: guiones externos de un HTML (`src` y especificadores de `import()`, también con plantilla) y bytes de un fichero de `dist/` con sus importaciones estáticas.
- `tests/unit/medicion.test.ts` -- `sitioMedido` con `conBusqueda: true` y una Cita de más de `MAX_CARACTERES_IMAGEN`; reescribir 2.9/20.1/retro sobre `data-vistas` y la etiqueta externa; cubrir cada fila de la matriz (sandbox: cola, sin `data-vistas`, prerender, evento ajeno; builds: con y sin punto final; función pura: otra versión con otro contenido) y añadir las pruebas de los AC de abajo marcadas «Vitest».
- `tests/unit/ingreso-construido.test.ts` -- el «instalador» pasa a ser la etiqueta externa.
- `tests/e2e/ayuda/espia.ts` (nuevo), `tests/e2e/compartir-enlace.spec.ts`, `tests/e2e/compartir-imagen.spec.ts`, `tests/e2e/imagen.spec.ts`, `tests/e2e/busqueda.spec.ts` -- espía por accesor (Design Notes) en vez de asignar `window.__medir`, que el arranque pisaría -- sobrevive con y sin el fichero.
- `tests/e2e/receptor.spec.ts` -- cola en orden, vistas una vez, prerender y la lista cerrada por superficie; las cinco pruebas de ausencia se mudan aquí y en su sitio queda una línea que lo dice (en `pagina-de-cita.spec.ts` se conserva y renombra la medida en línea).
- `tests/e2e/kit.spec.ts` -- pulsar el segundo `[data-copiar]` y comprobar portapapeles y rótulo de ese botón, el primero intacto.
- `DESPLIEGUE.md` -- §3: la pérdida aceptada de hasta 10 min de vistas (`max-age=600`) cuando cambia el guion, conservar el anterior sigue aplazado; 206-208: el arranque en línea y el fichero en vez de ~650 B por página. `AGENTS.md` -- la convención de mensajes de estado nombra `src/lib/anuncio.ts` y la de `__medir` (arranque, llamada a secas).
- `_bmad-output/implementation-artifacts/spec-23-1-la-medicion-sale-a-un-fichero.md` (Auto Run Result) y el comentario de la línea 23.1 de `sprint-status.yaml` -- bytes libres en la Página de Cita con Imagen y sin ella, construida con punto final, y los tres topes con su medida.

**Acceptance Criteria:**
- Given el sitio construido con punto final, when Vitest recorre `dist/`, then cada `<script src>` y cada `import()` de las páginas casa con una entrada de `GUIONES_EXTERNOS`, todos son del mismo origen, cada entrada tiene tope entero positivo y su fichero con sus importaciones estáticas cabe en él (Pagefind incluido), y el fichero de medición no importa nada.
- Given ese mismo sitio, when se mide una muestra de cada superficie pública (`superficiesDelBarrido`) más una Página de Cita sin Imagen, then todas quedan bajo `MAX_BYTES_DE_GUION` y el parte registra el hueco de la Cita con y sin Imagen.
- Given cualquier ruta construida, con o sin punto final, when se lee su `<html>`, then `data-vistas` es exactamente lo que declara `superficies.ts` para esa ruta (Vitest, con `declararRutasIndexables`).
- Given las páginas de una familia, when se comparan sus guiones en línea, then son idénticos byte a byte (salvo el de Imagen, ausente donde la Cita no la admite) y ninguno contiene el slug de una Cita, salvo `ImagenDelKit` en `/kit` y `/lote`, exención nombrada (Vitest).
- Given `CopiarCita`, `ImagenDeCita`, `CompartirEnlace` y `/buscar/` construidos, when se leen, then llaman `__medir(` sin `window.__medir &&`, entre los guiones en línea solo el arranque asigna `__medir`, y las tres que anuncian llevan el texto de `String(anunciar)`; ningún guion en línea usa `requestAnimationFrame` fuera de él (Vitest).
- Given `public/`, when se busca, then no contiene ningún nombre de evento ni `sendBeacon` (Vitest).
- Given el sitio de `receptor.spec.ts`, when se cargan la Página de Cita, la portada, la de Autor, la Obra no indexable, `/buscar/` y una ruta inexistente, then se descarga exactamente el guion de medición, una vez; `/kit/` no lo descarga; enfocar `/buscar/` y abrir la Imagen piden solo entradas de la lista.
- Given ese sitio y el fichero retenido con `page.route`, when se copia antes de que cargue, then llegan `vista-de-cita` y luego `copiado`, una vez cada uno (orden según `sendBeacon` envuelto en la página); y una página prerenderizada con reglas de especulación no emite vista hasta activarse y luego una sola, o la prueba se salta diciendo que el navegador no prerenderiza.

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

Las cinco capas de revisión son externas en este bucle (v8-ralph) y esta pasada no traía hallazgos
(«## Hallazgos externos — …» ausentes en la invocación): la revisión independiente viene después.

## Design Notes

Arranque y relevo, la forma (los nombres los fija el código):

```js
// en línea, armazón — solo cola
window.__medir=function(){__medir.q.push(arguments)};__medir.q=[]
// fichero /medicion/{v}.js
var q=__medir.q||[];function e(v,t,z){/* emisor de hoy */}
function a(){(document.documentElement.dataset.vistas||'').split(' ').forEach(function(v){v&&e(v)});window.__medir=e;q.forEach(function(x){e.apply(null,x)})}
document.prerendering?document.addEventListener('prerenderingchange',a,{once:true}):a();
```

Una isla que anuncia compone su guion en el frontmatter e inserta la función con `set:html`; `define:vars` queda solo para constantes que no son contenido (nombres de evento, `ETIQUETA`) y, combinado con `set:html`, Astro envuelve en `(function(){…})()`, así que `const` no choca entre las dos copias del Kit y `document.currentScript` sigue siendo el guion. `String(anunciar)` debe compararse en la prueba con espacios colapsados (Vitest y el build lo transforman con el mismo esbuild). Si el cuerpo sale a un fichero aparte (`?raw`), entra en los escaneos de `src/` de `medicion.test.ts`, `obras.test.ts` y `peso.test.ts`, y no lleva comentarios.

Espía de e2e: `Object.defineProperty(window,'__medir',{configurable:true,get:()=>espia,set:f=>{real=f}})`, con `espia` que apunta la llamada y la reenvía a `real`; así el arranque (`__medir.q` queda en `espia`) y el fichero lo atraviesan, y vale también cuando la 23.2 construya el `webServer` con punto final.

## Verification

**Commands:**
- `npx astro check` -- expected: 0 errores.
- `npx vitest run tests/unit/medicion.test.ts` (y por fichero: `ingreso-construido`, `redes`, `comparticion`, `publicable-y-alcanzable`, `espinas-de-ux`, `kit-construido`, `peso`, `obras`) -- expected: verde.
- `npm test` en segundo plano con `correr.sh` -- expected: verde.
- `npx playwright test tests/e2e/receptor.spec.ts --project=escritorio` y, con el `webServer`, `kit`, `copiar`, `imagen`, `compartir-enlace`, `compartir-imagen`, `busqueda`, `pagina-de-cita`, `portada`, `pagina-de-autor`, `pagina-404`, `seo` -- expected: verde (largas: `correr.sh`; puertos 4321, 4399, 4400 libres de ajenos).
- `npm run build` sin punto final -- expected: termina con el paso del peso; sin `dist/medicion/`.

## Auto Run Result

Status: done
Blocking condition: ninguna.

Planificación cerrada antes (bmad-build-auto, alto tras planificar); esta pasada implementa (step-03,
en línea, sin subagente) y finaliza (step-04 sin hallazgos).

**Qué se hizo.** El emisor de la medición sale de la página a un fichero, `/medicion/{versión}.js`,
que escribe el endpoint `src/pages/medicion/[version].js.ts` desde `guionDeMedicion` (versión por
FNV-1a del contenido; sin `MEDICION_ENDPOINT`, `getStaticPaths` vacío: ni fichero ni etiqueta). En
línea queda el arranque (`ARRANQUE_DE_MEDICION`, 65 B, solo cola) en toda página del armazón; el
fichero, al cargar o al activarse si `document.prerendering`, emite las vistas de `data-vistas`, se
instala como `__medir` y vacía la cola en orden. Las vistas salen de la declaración: cada `Superficie`
declara `vista` por `EVENTOS`, y `consecuenciasDe` expone `vistas` (solo con carácter efectivo
`producto`) y `cargaLaMedicion` (`producto`/`servicio`); desaparece la prop `vista` de las seis
páginas y `emiteVista` de la Obra. La lista cerrada `GUIONES_EXTERNOS` (`src/lib/guiones.ts`) nombra
medición, Imagen y Pagefind con sus topes en `umbrales.ts`. Las islas llaman `__medir(…)` a secas;
`CopiarCita` deja el slug y se encuentra por `document.currentScript`; las tres que anuncian llevan
`anunciar` de `src/lib/anuncio.ts`.

**Desviación de las Design Notes, sin bloqueo.** `define:vars` + `set:html` **no** se combinan en
Astro 7.2.0: compila con `@astrojs/compiler-rs` 0.3.2 (no con el 2.13.1 que se comprobó al
planificar), que emite el envoltorio y las constantes y **descarta el `set:html`** sin aviso —la isla
salía vacía; lo destapó la primera pasada de `medicion.test.ts`—. Hay otra forma sin copiar la
función de anuncio, así que el «Block If» no aplica: `guionQueAnuncia(constantes, cuerpo)` de
`src/lib/anuncio.ts` compone el mismo `(function(){const … = …;\n…})();` que pondría `define:vars`
(con el `<` escapado como Astro), mete `const anunciar = ${String(anunciar)};` y el cuerpo, y la
isla lo inserta con `<script is:inline set:html={…} />` sin `define:vars`. `CompartirEnlace`, que no
anuncia, conserva `define:vars` con hijos, que sí funciona.

**Bytes libres en la Página de Cita, construida con punto final** (`MAX_BYTES_DE_GUION` = 6.656, sin
cambiar): con Imagen, 5.629 B en línea → **1.027 libres**; sin Imagen, 1.953 B → **4.703 libres**.
Resto de la muestra de `superficiesDelBarrido`: portada, Autor, Tema, Colección, Obra y 404, 65 B
(6.591 libres); `/buscar/`, 3.535 B (3.121 libres).

**Los tres topes, medidos el 2026-10-24 + ~400 B** (precedente de `MAX_BYTES_DE_GUION`):
`MAX_BYTES_GUION_DE_MEDICION` = 1.320 (920 B con el punto final de producción, 886 con el de las
pruebas; no importa nada); `MAX_BYTES_GUION_DE_IMAGEN` = 7.550 (7.153 B, sin importaciones);
`MAX_BYTES_GUION_DE_PAGEFIND` = 45.950 (45.555 B con Pagefind 1.5.2, sin importaciones estáticas).

**Ficheros.**
- `src/lib/medicion.ts` — arranque, fichero, versión y ruta; fuera `emitir`, `EVENTO_DE_VISTA` y `Vista`.
- `src/lib/guiones.ts` (nuevo) — `GUIONES_EXTERNOS` y `guionExternoDe`.
- `src/lib/anuncio.ts` (nuevo) — `anunciar` y `guionQueAnuncia`.
- `src/lib/umbrales.ts` — los tres topes con su medida.
- `src/lib/superficies.ts` — `vista` por superficie, `cargaLaMedicion`, `ConsecuenciasDeRuta.vistas`.
- `src/pages/medicion/[version].js.ts` (nuevo) — el fichero, solo con punto final.
- `src/components/Medicion.astro`, `src/components/Armazon.astro` — arranque, etiqueta `defer` y `data-vistas`.
- `src/pages/{index,cita/[slug],autor/…,tema/…,coleccion/…,obra/…}.astro` — sin `vista=`.
- `src/islands/CopiarCita.astro`, `ImagenDeCita.astro`, `src/pages/buscar.astro` — guion compuesto con `guionQueAnuncia`, `__medir(…)`, sin comentarios dentro ni plantillas.
- `src/islands/CompartirEnlace.astro` — `__medir(…)`.
- `tests/unit/ayuda/medicion.ts` — sandbox con `node:vm`, `document` simulado, cola, `cargar()` y `activar()`.
- `tests/unit/ayuda/guion.ts` — guiones en línea, externos (`src` e `import()` con cadena, plantilla o concatenación), importaciones estáticas y bytes con importaciones.
- `tests/unit/medicion.test.ts` — reescrita: matriz entera, `data-vistas`, lista cerrada, listón, contenido en línea, islas; `sitioMedido` con Pagefind y una Cita sin Imagen.
- `tests/unit/{superficies,obra-indexable,espinas-de-ux,ingreso-construido}.test.ts` — las consecuencias nuevas, el 404 con solo el arranque, la etiqueta externa y el punto final en el fichero.
- `tests/e2e/ayuda/espia.ts` (nuevo) y `compartir-enlace`, `compartir-imagen`, `imagen`, `busqueda` — espía por accesor.
- `tests/e2e/receptor.spec.ts` — descargas por superficie, `/kit/`, Pagefind e Imagen en la lista, cola en orden, prerender y el Kit de dos copias (corpus con una Cita larga fijada y una corta apta).
- `tests/e2e/{pagina-de-cita,portada,pagina-de-autor,pagina-404,seo}.spec.ts` — las pruebas de ausencia se mudan a `receptor.spec.ts` con una línea que lo dice; la de la Cita conserva la medida en línea, renombrada.
- `tests/e2e/kit.spec.ts` — el segundo `[data-copiar]`; se salta, diciéndolo, el día que el Kit real no lleva alternativa (la versión fija corre en `receptor.spec.ts`).
- `DESPLIEGUE.md` §1 (peso) y §3 (fichero, pérdida aceptada de hasta 10 min con `max-age=600`, conservar el anterior sigue aplazado); `AGENTS.md` (anuncio y `__medir`).
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — solo el comentario de la línea 23.1 (bytes libres y topes); el estado lo mueve el orquestador.

**Verificación.**
- `npx astro check` — 0 errores, 0 avisos (21 pistas previas).
- `npx vitest run` de `medicion`, `ingreso-construido`, `redes`, `comparticion`, `publicable-y-alcanzable`, `espinas-de-ux`, `kit-construido`, `peso`, `obras`, `superficies`, `obra-indexable`, `compartir`, `andamiaje` — 13 ficheros, 588 pruebas en verde.
- `npm test` (con `correr.sh`) — 126 ficheros, 5.271 pruebas en verde.
- `npx playwright test` de `receptor`, `kit`, `copiar`, `imagen`, `compartir-enlace`, `compartir-imagen`, `busqueda`, `pagina-de-cita`, `portada`, `pagina-de-autor`, `pagina-404`, `seo` (los dos perfiles, `--workers=3`) — 326 en verde, 31 saltadas (las de `receptor` en móvil, el Kit de dos copias en el Corpus real y el prerender: el Chromium de las pruebas no prerenderiza), y 3 tiempos agotados en `seo.spec.ts` (bucles sobre las ~5.300 URL del sitemap, 30 s y 90 s). `seo.spec.ts` a solas, `--workers=1`, en `escritorio` y en `movil`: 9/9 y 9/9 en verde (≈10 s cada bucle): es la carga en paralelo, no el cambio (las páginas crecen ~110 B).
- `npm run build` sin punto final — termina con el paso del peso (466.029.738 B juzgados con lo que rota); no hay `dist/medicion/` ni etiqueta.

**Auditoría de la matriz.** Con punto final y Sin punto final: builds de `medicion.test.ts`. Contenido
cambia: `versionDelGuion`/`rutaDelGuionDeMedicion`. Cola, Sin `data-vistas`, Prerender y evento ajeno:
sandbox de `medicion.test.ts` (y la cola, además, en `receptor.spec.ts`). Kit: `receptor.spec.ts`,
Kit de dos copias. Guion ajeno: el detector sobre HTML sintético y el recorrido de `dist/`. Todas
corrieron y pasaron; el prerender en navegador se salta con su motivo y la fila la cubre el sandbox.

**Revisión.** 0 parches, 0 diferidos, 0 rechazados en esta pasada (capas externas sin hallazgos).
Recomendación de revisión de seguimiento: `false` (0 parches: alto 0, medio 0, bajo 0; puntuación 0).

**Riesgos residuales.**
- La ventana de hasta 10 minutos sin medición cuando cambia el guion (aceptada y escrita en §3).
- Si una versión futura de `compiler-rs` arreglara `define:vars` + `set:html`, `guionQueAnuncia`
  sigue valiendo; si alguien vuelve a juntarlos, la prueba de las islas de `medicion.test.ts` lo
  delata (la isla sale sin cuerpo).
- `seo.spec.ts` agota su tiempo bajo carga en paralelo con el Corpus de hoy: es previo a esta
  historia y no se ha tocado.
- El prerender real no se ha visto en un navegador: solo en el sandbox.

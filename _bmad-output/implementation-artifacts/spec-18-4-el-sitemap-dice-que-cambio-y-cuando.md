---
title: 'Historia 18.4 — El sitemap dice qué cambió y cuándo'
type: 'feature'
created: '2026-09-04'
status: 'in-review'
baseline_commit: '3c788b9cfe7a04689a82bd00491a4d4049547b90'
review_loop_iteration: 1
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-16-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** el sitemap publica **1.715 entradas `<loc>` a secas, sin un solo `lastmod`** —comprobado contra producción el 4/09—. El buscador usa esa fecha para decidir qué merece rastrear primero, y este sitio reconstruye a diario, así que **tiene el dato y no lo publica**. Con 2 URL indexadas de 80 medidas, es una señal gratis que hoy se está dejando sin dar.

**Approach:** el sitemap declara la fecha del último cambio real de cada superficie, derivada del **historial del repositorio** —donde vive el Corpus—, nunca de la hora de construcción.

## Boundaries & Constraints

**Always:**
- La fecha sale de **cuándo cambió el contenido**. Una fecha de build declararía 1.715 páginas nuevas cada día por la reconstrucción de AD-12: es falsa, y **peor que no declarar nada**, porque enseña al buscador a no hacer caso.
- Una superficie cuya fecha no se pueda determinar **omite el campo**. Es la regla de todo campo opcional aquí: nunca un centinela.
- Dos construcciones del mismo commit dan **las mismas fechas**.
- `src/lib/` no lee el sistema de ficheros (AD-5); el build no sale a la red (AD-22).

**Ask First:**
- ~~Poner `fetch-depth: 0` en el job que construye.~~ **Autorizado por Héctor el 2026-09-04**, con la medida delante: 31 MB de `.git`, 348 commits, 16 MB empaquetados — segundos, no minutos. El job de avisar ya lo hace hoy sin que se note.

**Never:**
- Usar la hora de construcción, ni un valor por defecto, ni «hoy» como sustituto.
- Reintroducir en `astro.config.mjs` cualquier decisión sobre **qué** se anuncia: eso lo declara `src/lib/superficies.ts` y la Historia 12.1 lo dejó en un solo sitio.
- **Meter el commit de `src/` en el máximo de cada superficie.** Es la exclusión consciente de esta historia, no un olvido: un rediseño de plantillas cambia el HTML de las 1.715 páginas y aquí no moverá ni una fecha. Se acepta a sabiendas, y por lo mismo que todo lo demás — al revés declararía las 1.715 como cambiadas cada vez que alguien toca una hoja de estilo, que es la misma inflación que la fecha de build y con menos excusa. Lo que se fecha es **el contenido**, que es lo que el buscador viene a releer; una plantilla nueva no da nada nuevo que leer. El día que un rediseño sí deba anunciarse, el canal es otro y no este campo.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Superficie con historial | Su fichero de Corpus tiene commits | Entrada con `lastmod` de su último cambio real | N/A |
| Reconstrucción sin cambios | Mismo commit, otro día | **Las mismas fechas** que la víspera | N/A |
| Fecha indeterminable | Sin historial para esa superficie | Entrada **sin** `lastmod`, y las demás con la suya | Se omite, no se rellena |
| Checkout superficial | CI sin historial | **Ninguna** fecha se inventa | Se avisa; el build no publica fechas falsas |
| Página derivada de varias fuentes | Autor, Tema, Colección | Fecha del cambio más reciente de lo que agrega | N/A |
| La portada | Rota a diario sin commit (AD-12) | Entrada **sin** `lastmod`: ninguna fecha del historial es cierta ahí | Se omite, no se rellena |
| `git` contesta que sí y no dice nada | Ámbito que no casa: código 0, salida vacía | Ninguna fecha, **y un aviso** con el mismo énfasis que el checkout superficial | Se avisa; no se omite en silencio |

</frozen-after-approval>

## Code Map

- `astro.config.mjs:108-162` -- el bloque de `sitemap()`. Hoy solo pasa `filter: anunciableEnElSitemap`, y su comentario dice que **ahí no se decide nada**. Esa propiedad no se toca: la fecha es un atributo de lo ya anunciado, no una decisión sobre qué se anuncia.
- `tools/avisar.ts:44,63,79` -- el precedente de leer git desde el proyecto: `execFile` promisificado, sin dependencia nueva. Y su cabecera ya razona que preguntar a git no es salir a la red.
- `.github/workflows/publicar.yml:50-69` -- el checkout del job que construye. Era superficial —un solo commit—, que es la razón de ser de la fila «Checkout superficial»: `git log` habría devuelto el árbol entero fechado hoy en CI aunque funcione en local. Ahora pide `fetch-depth: 0` con el motivo y la medida escritos.
- `.github/workflows/publicar.yml:176-180` -- el job de avisar **ya resolvió esto**: pide `fetch-depth: 0` con el comentario puesto. Hay precedente y hay motivo escrito.
- `src/lib/superficies.ts` -- de aquí sale qué es publicable y de qué familia. La fecha se deriva por superficie, y una Página de Autor o de Tema agrega varias Citas: su fecha es la más reciente de lo que agrega.
- `corpus/` -- las Citas, Autores, Temas y Colecciones son ficheros versionados. Su historial **es** la fecha de cambio del contenido; no hace falta inventar un campo nuevo en el esquema.
- `integraciones/cotejo.ts:59,88` y `integraciones/colecciones.ts:33,50` -- el patrón de la raíz, ya resuelto dos veces en este repositorio: arrancan con `process.cwd()` y lo **sustituyen por `fileURLToPath(config.root)`** en el gancho de configuración. La lectura del historial hace lo mismo, y por eso vive en `integraciones/` y no en `tools/lib/`: `git log` imprime rutas relativas a la raíz del **repositorio**, así que suponer el directorio de trabajo es un cruce que casa sólo por casualidad.
- `src/pages/cita/[slug].astro:38,55-57` -- su `getStaticPaths` pasa `autor` y la plantilla compone con `autor.nombre` el título, la `<meta description>` y el `application/ld+json`. Por eso el fichero del Autor entra en la composición de la Página de Cita: lo que se fecha es lo que la página renderiza.
- `src/pages/tema/[slug]/[...page].astro:68` y `src/pages/coleccion/[slug]/[...page].astro:144` -- las tarjetas de los listados también llevan el nombre del Autor, así que el mismo criterio se aplica a Tema y a Colección.

## Tasks & Acceptance

**Execution:**
- [x] Módulo que, dada una superficie, deriva su fecha del historial de los ficheros de Corpus que la componen -- puro sobre datos ya leídos, para que sus casos se prueben sin git. `tools/lib/cambios.ts`.
- [x] La lectura del historial, en la capa que puede tocar el disco y los procesos -- nunca en `src/lib/` (AD-5). Vive en `integraciones/historial.ts`, que es donde el gancho de Astro entrega la raíz del proyecto y donde el reparto «`integraciones/` lee, `tools/lib/` juzga» se cumple de verdad.
- [x] `astro.config.mjs` -- el `serialize` del sitemap añade `lastmod` cuando hay fecha y **omite el campo** cuando no. No toca `filter`.
- [x] `.github/workflows/publicar.yml` -- historial completo en el job que construye, con su comentario.
- [x] Prueba de que las entradas declaran `lastmod`, y de que dos construcciones del mismo commit dan las mismas fechas.
- [x] Prueba de que sin historial no se inventa ninguna fecha: el sitemap sale sin `lastmod` y no con uno falso. En dos ramas distintas y las dos construidas: sin repositorio, y sobre un **clon `--depth 1`**.
- [x] Prueba de que un `git log` que sale con código 0 y sin salida **avisa** en vez de omitirse en silencio.

**Acceptance Criteria:**
- Given el sitemap construido, when se inspecciona una entrada de Cita, then declara `lastmod` con la fecha del último cambio de esa Cita y no la del build.
- Given dos construcciones del mismo commit, when se comparan sus sitemaps, then las fechas son idénticas.
- Given un entorno sin historial, when se construye, then ninguna entrada lleva una fecha inventada.

## Design Notes

**El riesgo de esta historia no es el código: es que funcione en local y no en CI.** El checkout del job que construye es superficial, así que `git log` por fichero devuelve vacío allí y no aquí. Por eso la matriz tiene una fila para ese caso y por eso hay una tarea de flujo — y por eso el caso «sin historial» **omite** en vez de inventar: si el arreglo de infraestructura se olvida, el sitemap queda como está hoy, que es malo pero honesto, en vez de publicar 1.715 fechas falsas.

**Y el riesgo gemelo, que la primera implementación no vio: que no funcione en ninguna parte y nadie se entere.** Los dos modos de fallo que sí se comprobaban —copia superficial y `git` que revienta— son ruidosos. El tercero no: `git log -- <ámbito que no casa>` sale con **código 0 y sin salida**, y con eso las 1.715 fechas se omiten una a una como si cada superficie fuera un caso legítimo de «fecha indeterminable». La historia entera se queda en nada, el sitemap sale idéntico al de hoy y las pruebas siguen verdes. Basta un directorio de trabajo que no sea la raíz del repositorio. Por eso hay una fila más en la matriz, por eso el aviso pesa lo mismo que el del checkout superficial, y por eso la raíz se toma del gancho de Astro y las rutas de git se resuelven contra `--show-toplevel` en vez de contra el `cwd`.

**Lo que se fecha es lo que la página renderiza**, y ese criterio se aplica sin excepciones aunque incomode. Una Página de Cita compone su título, su meta descripción y sus datos estructurados con el nombre del Autor, así que el fichero del Autor entra en su composición: si no, corregir una semblanza reconstruye 181 páginas con HTML distinto y las 181 declaran una fecha de hace meses — la misma quema de señal que la fecha de build, en la dirección rancia. La inflación al revés está acotada y es cierta: sólo dispara cuando ese fichero cambia de veras, y cuando dispara, el HTML cambió.

**La portada es el caso que el criterio no puede satisfacer, y por eso sale sin fecha.** Es la única URL que cambia a diario sin commit —AD-12 rota la Cita del Día—, así que ninguna fecha del historial es cierta ahí, y sería falsa justo en la URL que el buscador visita a diario. Declarar «hoy» está prohibido por la historia entera; declarar el último commit del Corpus es afirmar por escrito que la portada no cambió desde entonces. Queda la regla de la propia historia: **cuando no se sabe la fecha, se omite el campo.** El descargo de «ya avisa `tools/avisar.ts`» no vale: ese canal es IndexNow —Bing, Yandex—, y el buscador cuyo rastreo se quiere ganar aquí es Google, que no lo consume.

**El coste, medido y no supuesto.** Una sola invocación de `git log --name-only` sobre los cuatro ámbitos del Corpus: **149 KB de salida y 0,06 s**. Lo que sí es O(Corpus) es `corpusParaFechar`, que **vuelve a leer y a analizar el Corpus entero** encima de lo que ya leen las colecciones de Astro — dos lecturas completas por construcción, dos construcciones al día, camino de unos 2.000 ficheros. Hoy no se nota junto a lo que tarda el build; el día que se note, lo que hay que compartir es esa lectura y no la invocación de git, que es la barata de las dos.

## Verification

**Commands:**
- `npx vitest run tests/unit/fecha-de-cambio.test.ts tests/unit/fecha-de-cambio-build.test.ts` -- expected: la matriz en verde, las seis filas.
- `npx astro check` -- expected: 0 errores.
- `npm test` -- expected: sin regresión.
- `npx astro build && head -c 600 dist/sitemap-0.xml` -- expected: entradas con `lastmod`, y la de la portada **sin** el campo.
- `grep -c '<lastmod>' dist/sitemap-0.xml` -- expected: una menos que `grep -c '<loc>'`, que es la portada.

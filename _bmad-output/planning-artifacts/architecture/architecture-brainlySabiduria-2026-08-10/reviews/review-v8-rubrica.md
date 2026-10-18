---
title: "Rúbrica — la espina v8 contra la lista de la buena espina"
status: final
created: 2026-10-18
lens: rubric walker (Finalize, puerta de revisión)
against:
  - 'ARCHITECTURE-SPINE.md en el árbol de trabajo (git diff, +199/−85)'
  - '.memlog.md (D-1…D-16 del 2026-10-18)'
read_first:
  - 'reviews/reconcile-v8-prd.md'
  - 'reviews/reconcile-v8-ux.md'
checked_against_code:
  - '.github/workflows/publicar.yml'
  - 'medicion/ (receptor.ts, worker.ts, wrangler.toml, esquema.sql)'
  - 'node_modules/astro/dist/core/build/plugins/plugin-scripts.js y util.js (Astro 7.2.0 instalada)'
  - 'astro.config.mjs, src/content.config.ts, src/lib/superficies.ts, tools/lib/indexacion.ts, tools/lib/cotejo.ts'
  - 'tests/unit/ayuda/guion.ts, tests/e2e/'
---

# Rúbrica — la espina v8 contra la lista de la buena espina

**Solo lectura** salvo este informe. Las líneas citadas son las de `ARCHITECTURE-SPINE.md` en el árbol de trabajo.

## Veredicto

**Pasa con tres altos, y ninguno contradice una decisión de Héctor.** Los dos cotejos ya encontraron lo que la v8 **estrecha** respecto a su entrada. Esta lente encuentra otra cosa: tres reglas que, tal como están escritas, **no se pueden exigir** en el entorno donde corre el proyecto.

1. Astro 7 decide por tamaño si un guion empaquetado va en línea o en fichero, así que la lista cerrada de AD-6 depende de una heurística del empaquetador.
2. El orden «migración, receptor, sitio» de AD-14 es una costumbre sin puerta, en un repositorio donde cada push despliega el sitio.
3. Las reglas de la v8 que viven en el navegador (lectura, marcas, una salida por carga, WCAG 2.2) solo las prueba Playwright, y el CI no lo ejecuta.

Detrás vienen seis medios y nueve bajos. El linter no da nada nuevo.

**Recuento: 0 críticos · 3 altos · 6 medios · 9 bajos.**

---

## 0. Linter

`lint_spine.py` da **29 hallazgos, todos de gravedad baja y todos falsos positivos**. Son los mismos 29 con que cerró la v7.1:

- 4 son `{planning_artifacts}` en `sources` (l. 13–16): es la variable de configuración de BMad.
- 25 son patrones deliberados de rutas y de nombres de fichero: `{slug}`, `{slug-autor}`, `{slug-obra}`, `{id-de-fuente}`, `{slug-de-obra}`, `{slug-de-pagina}`, `{fragmento}`, `{slug-tema}` y `{slug-coleccion}`, en las l. 286, 315, 323, 366 y 367.

No hay ningún `AD` duplicado, ninguno al que le falte Binds, Prevents o Rule, ni ninguna versión sin fijar que el linter cace. El `wrangler` sin fijar sí lo veo, pero por juicio (B6).

## 1. La lista, criterio por criterio

| Criterio | Juicio | Hallazgos |
|---|---|---|
| Fija los puntos reales de divergencia y no se deja ninguno | ◐ Fija los de la v8 que la entrada nombró. Se deja tres que aparecen al juntarlos con la tecnología: cuándo se aplica el orden de Pagefind, con qué conjunto de documentos localiza el cargador de posiciones y quién es dueño de las familias | M1, M2, M3 |
| Toda Rule es exigible y previene su divergencia | ✗ en tres. AD-6 (lista cerrada), AD-14 (orden de despliegue) y AD-13/AD-17 (comportamiento en el navegador) no tienen una puerta que alcance al entorno real | A1, A2, A3, B7 |
| Nada en Deferred deja divergir a dos unidades | ◐ La metadata de Pagefind se aplaza «a la historia que escriba los filtros», y hay dos historias que la escriben. Cinco aplazados tienen un disparador que ningún instrumento puede ver | M5, M6 |
| La tecnología está verificada | ◐ Las versiones, sí (comprobadas el 2026-10-18). El comportamiento que la regla presupone, no: el inlining de guiones de Astro, el orden de Pagefind sobre páginas sin clave y las cuotas de D1 | A1, M1, M4 |
| Ratifica el código brownfield, no lo contradice | ◐ Atribuye a `superficies.ts` un conjunto de familias que vive en `tools/lib/indexacion.ts`. La dirección de dependencias omite que el build depende de `tools/lib/`, y la v8 lo hace más hondo. Calla la traducción de FR-48, ya construida | M2, B2, B3, B8 |
| Cubre las capacidades de su fuente | ◐ FR-55 y FR-56, sí. NFR-7 v8 («se mide con todo ello puesto») no tiene dueño ni fila en el mapa. FR-44, FR-45, FR-46 y FR-49 se declaran no vinculados mientras AD-24 v8 los vincula | M6, B4 |
| Toda dimensión de su altitud está decidida, aplazada o abierta (despliegue, entornos, migraciones de D1, CI) | ◐ Despliegue y migraciones, decididos. **Silenciosos:** qué corre en CI y qué solo en local, quién aplica una migración en remoto, el orden de reversión, y el plan y las cuotas del proveedor del receptor | A2, A3, M4, B1 |

---

## 2. Altos

### A1 — Lo que AD-6 llama «guion empaquetado externo» Astro lo mete en línea cuando pesa menos de 4 KB

- **Espina.** AD-6 v8 (l. 109) mete los guiones empaquetados del filtro de los Directorios y de la búsqueda «en la lista cerrada de guiones externos, cada uno con su tope con nombre». La convención de Guiones (l. 370) dice: «Lo que necesita `src/lib` se empaqueta». La bitácora (D-9, l. 108) los da por «con hash».
- **Tecnología, comprobada en el código instalado.** En Astro 7.2.0, `plugin-scripts.js` (función `shouldInlineScriptChunk`) mete **en línea** todo guion procesado que cumpla tres condiciones: no tiene importaciones de otro trozo, no tiene `import()` y pesa menos que `vite.build.assetsInlineLimit`. Ese límite vale 4096 bytes por omisión (`util.js`), y `astro.config.mjs` no lo fija.
- **Qué diverge.**
  - Un filtro de Directorios que importe `normalizar` y `umbrales`, una vez empaquetado y minificado, cabe con holgura en 4 KB. Astro lo escribe como `<script type="module">…</script>` en `/autores/` y `/obras/`. `bytesDeGuionEnLinea` (`tests/unit/ayuda/guion.ts:16`) lo cuenta contra `MAX_BYTES_DE_GUION`, no contra su tope propio.
  - Que vaya en línea o en fichero depende además de **qué otros guiones existan**. Si la búsqueda y el filtro comparten `normalizar`, Rollup saca un trozo común, los dos pasan a tener importaciones y los dos salen a fichero. Construir la búsqueda cambia en silencio en qué cubo se mide el filtro de los Directorios.
  - Hoy no pasa: todos los guiones del sitio son `is:inline` (`src/islands/*.astro`, `buscar.astro:150`). La v8 trae los **primeros** guiones procesados, así que es una tecnología nueva para este código.
- **Consecuencia.** La historia que escriba la prueba de la lista cerrada la verá fallar o pasar según el tamaño de lo que construya, o la escribirá para no mirar. Es la «salida falsa» que la propia AD-6 v8 nombra en Prevents (l. 104), por otra puerta.
- **Propuesta (corrección clara).** Una línea en AD-6: los guiones procesados por Astro **siempre** se emiten como fichero. Se consigue con `vite.build.assetsInlineLimit` como función que devuelve `false` para `.js` y `undefined` para lo demás, que conserva el criterio actual de CSS y de recursos. Una prueba sobre `dist/` exige que ningún `<script type="module">` en línea salga del empaquetador. La alternativa es contar cada guion por su origen, vaya como vaya, que es más frágil.

### A2 — «Migración, receptor, sitio» no tiene puerta, y el fallo es en silencio

- **Espina.** AD-14 v8 (l. 187): «el orden es migración, receptor, sitio», con el receptor «comprobado con una baliza de prueba». Entorno operativo (l. 465–471): cada push a `main` despliega. AD-13 v8 (l. 177): la prueba de correspondencia exige que lo que emite el guion ⊆ el registro del receptor ⊆ las columnas del esquema.
- **Qué hay en el código.**
  - `medicion/receptor.ts:13` importa el vocabulario de `src/lib/medicion.ts`. Un cambio de vocabulario es, pues, **un solo commit** que cambia sitio y receptor a la vez.
  - El sitio se despliega solo al hacer push (`publicar.yml`). El receptor se despliega a mano con `wrangler` desde un árbol local.
  - `medicion/worker.ts` traga todo error de D1 («El almacén caído pierde el evento en silencio») y contesta 204 siempre, con `[observability] enabled = false`.
- **Qué diverge.**
  - **El sitio antes que el receptor**, que es el orden por omisión con despliegue al hacer push: el receptor viejo no tiene `lectura`, `salida-interna`, `busqueda` ni `vista-de-obra` en `EVENTOS`. `interpretar` los descarta y cada evento nuevo se pierde sin rastro hasta que alguien despliegue el receptor.
  - **El receptor antes que la migración**: el `INSERT` con columnas inexistentes lanza, el `catch` lo traga, y se pierden **todos** los eventos, también los viejos.
  - La prueba de correspondencia mira `esquema.sql`, que es el estado acumulado del repositorio, y no lo que está aplicado en remoto. Pasa en verde en los dos casos.
  - Es justo el cero indistinguible del cero real que AD-13 v8 dice impedir (l. 167).
- **Silencio de la espina.** No dice **quién** aplica una migración en remoto. Los agentes del bucle tienen sesión de `wrangler` desde el 11/10, según la memoria del proyecto, y el bucle hace push y despliega.
- **Propuesta (para Héctor).** Que el orden se cumpla por construcción y no por costumbre. Por ejemplo:
  - una orden de `tools/` que aplica la migración, despliega el receptor y escribe en un fichero versionado la **huella del vocabulario desplegado**;
  - `npm test` falla si la huella de `src/lib/medicion.ts` no coincide con ella, y un CI en rojo no despliega;
  - el coste es que, entre el commit del vocabulario y el de la huella, `main` queda en rojo y la reconstrucción diaria no despliega; hay que decidirlo sabiéndolo.
  - Y una línea más: aplicar en remoto y desplegar el receptor **es de Héctor**, como congelar o encender.

### A3 — Las reglas de la v8 que viven en el navegador solo las prueba Playwright, y el CI no lo corre

- **Espina.**
  - AD-13 v8 (l. 172–175): 8 s de visibilidad acumulada, `pageshow` con `persisted`, una salida por carga y después de la lectura, marcas leídas antes de la vista y quitadas con `replaceState`.
  - AD-17 v8 (l. 225): el barrido con `wcag22aa`.
  - AD-8 v8 (l. 127): cabida en los dos formatos.
  - Entorno operativo (l. 465): «nada se fusiona con el CI en rojo».
- **Qué hay en el código.** `publicar.yml` corre `npm run build`, `astro check` y `npm test`, que es Vitest. Las pruebas de medición en navegador (`tests/e2e/origen.spec.ts`, `marca.spec.ts`, `receptor.spec.ts`), el barrido (`accesibilidad.spec.ts`) y el de ingreso son de Playwright, y `AGENTS.md` dice que el CI no las ejecuta. La UX ya vio el caso del 9:16 (reconcile-v8-ux §1.8); la clase entera no la ha nombrado nadie.
- **Qué diverge.** Ninguna prueba de Node puede afirmar visibilidad acumulada, `pageshow` ni el orden lectura → salida. Una historia que rompa la lectura despliega con el CI en verde, y el plano de medición pierde o duplica en silencio. La frase de l. 465 promete una puerta que para estas reglas no existe.
- **Propuesta (para Héctor).** Una de dos, escrita en el Entorno operativo:
  - **(a)** un trabajo de CI que corra con Chromium las especificaciones de medición y del barrido en `--project=escritorio` antes de `desplegar`;
  - **(b)** declarar qué invariantes de la espina son **solo locales**, y que la historia que las toque las ejecuta antes del push, con la lista nombrada.
  Lo que no puede quedar es la frase de l. 465 sin calificar.

---

## 3. Medios

### M1 — `data-pagefind-sort`: en Pagefind, una página sin la clave desaparece de los resultados, y una clave compuesta se ordena como texto

- **Espina.** AD-25 v8 (l. 326): una sola clave compuesta, formada por el orden del Directorio, el de la lista de obras y el del libro. «Filtrar por una Obra devuelve sus Citas en el orden de su Página de Obra». AD-25 (l. 325) cuenta «el orden de la búsqueda» entre los lectores.
- **Tecnología** (pagefind.app/docs/sorts, comprobado el 2026-10-18):
  - las páginas sin la clave «se omiten de los resultados si se aplica ese orden»;
  - si un solo valor no es numérico, todos se ordenan alfabéticamente.
- **Qué diverge.**
  - **Cuándo se aplica.** Si la búsqueda ordena siempre, desaparecen de `/buscar/` los resultados de Autor, Obra, Tema, Colección y Directorio, que no llevan la clave. Si ordena solo con `search(null, filtros)`, una consulta con texto y filtro sale por relevancia. La espina no elige, y dos historias (la de filtros y la de Directorios) lo harán distinto.
  - **Qué forma tiene.** «Compuesta» invita a `12-3-45`, que se ordena como texto («12» antes que «2»).
- **Propuesta (corrección clara).** Una línea en AD-25: la clave es **un entero** —el rango global que `obras.ts` calcula en el build— y solo la llevan las Páginas de Cita. El orden se aplica solo cuando hay filtro de Autor u Obra y la consulta está vacía; con texto manda la relevancia. Una prueba fija la forma numérica.

### M2 — El dueño de las familias que nombra la espina no existe en el código

- **Espina.** Conjuntos cerrados (l. 376): «Las familias tienen su dueño en `superficies.ts` —desde la v8 con `directorio`—». AD-17 v8 (l. 222): «El conjunto cerrado de familias gana `directorio`». AD-27 v8 (l. 352): «Desde la v8 son seis familias».
- **Código.**
  - `src/lib/superficies.ts` no exporta ningún conjunto de familias: solo `SUPERFICIES` con su carácter.
  - El conjunto vive en `tools/lib/indexacion.ts:61`, con cuatro familias (`FAMILIAS`), más `FAMILIAS_DE_LA_SERIE` con `obra` (l. 74).
  - Tráfico, demanda, rastreo y canal usan las cuatro.
  - `src/lib/tipoDeResultado.ts`, que la v8 amplía con `directorio`, no puede importar de `tools/lib/` sin invertir la dirección de dependencias.
- **Qué diverge.** La historia de los Directorios añadirá `directorio`:
  - en `tools/lib/indexacion.ts`, contra la espina;
  - o en un conjunto nuevo de `superficies.ts`, dejando dos dueños.
  «Seis familias» no casa con el `obra` aparte de la serie.
- **Propuesta (corrección clara).** Decir que es una **migración**: hoy vive en `tools/lib/indexacion.ts` y se muda a `superficies.ts` con la historia de los Directorios; `tools/lib/` lo importa desde ahí. Y decir si `obra` y `directorio` son familias de todas las series o solo de algunas: el reconcile del PRD ya vio la asimetría (tabla, fila de AD-24).

### M3 — El cargador de posiciones: «el mismo localizador» no fija ni el conjunto de documentos ni su orden

- **Espina.** AD-23 v8 (l. 290–291): el **mismo localizador** que el cotejo («`indexOf` sobre las formas colapsadas»); en varios documentos, la posición del primero «en el orden de la Obra»; mientras no se capture el índice, el orden natural con romanos.
- **Código.**
  - El cotejo no localiza contra un documento, sino contra el **conjunto** que da `documentosDeCita` (`tools/lib/cotejo.ts:222`), casado por prefijo y sin biografías.
  - Ese conjunto sale ordenado con `localeCompare('es')` y el nombre corto primero (l. 241). No es el orden natural con romanos.
  - Además, un cargador de contenido de Astro no ve las otras colecciones. Tendrá que leer `corpus/citas/` en crudo, como el cotejo (`leerCitas`).
- **Qué diverge.** Un cargador que reconstruya el conjunto a su manera (por nombre exacto, sin el filtro de biografía) o que tome el primero del orden de `documentosDeCita` da posiciones que contradicen al cotejo, o el «primero» equivocado. La función del orden entre documentos no tiene dueño nombrado. La UX vio el caso de dos Fuentes (§1.7); este es anterior y de una sola Fuente.
- **Propuesta (corrección clara).**
  - El cargador obtiene el conjunto con `documentosDeCita` y lee las Citas con el mismo lector que el cotejo.
  - El orden entre documentos lo da una función con dueño nombrado (en `src/lib/obras.ts`, que `content.config.ts` puede importar), y `documentosDeCita` no se usa para ordenar.

### M4 — El plano de medición multiplica sus escrituras y la espina no dice ni el plan ni las cuotas del proveedor

- **Espina.** Stack (l. 397): «Cloudflare Workers + D1». Entorno operativo (l. 465): no hay capacidad ni plan. AD-13 v8 añade lectura, salida interna y búsqueda: una carga típica pasa de una fila a unas tres, y la Página de Obra indexable, a cuatro.
- **Tecnología** (developers.cloudflare.com/d1/platform/pricing y limits, comprobado el 2026-10-18). Con el plan gratuito de Workers, D1 admite 100.000 filas escritas al día y 500 MB por base. Al pasar el límite, las consultas fallan hasta las 00:00 UTC.
- **Qué diverge.** Con `worker.ts` tragando el error, pasar la cuota corta la serie a media jornada sin rastro. Es un cero fabricado de la misma clase que el de A2, y la v8 triplica la probabilidad. La espina no dice si el receptor va en plan gratuito o de pago, ni qué pasa al acercarse.
- **Propuesta.** Una línea en el Entorno operativo: el plan, las dos cuotas que muerden (filas escritas al día, tamaño de la base) y la regla. Por ejemplo, que la orden que lee la línea base desde `tools/` informe de las filas del día frente a la cuota y del tamaño de la base, para que llegar a la cuota se vea antes de perder eventos.

### M5 — Deferred: la metadata de Pagefind se aplaza a «la historia», y la escriben dos

- **Espina.** Deferred (l. 519): desde la 1.5.0, buscar el valor de un `data-pagefind-meta` devuelve toda página que lo lleva, «y no hay forma documentada de excluirla. Se resuelve con la historia que escriba los filtros y el orden de Pagefind».
- **Qué diverge.** Escriben metadata al menos dos historias:
  - la de filtros y orden (`autor`, el `tipo` de cada página);
  - la de Directorios, con el tipo `directorio` de AD-17 v8 (l. 223), cuyo rótulo es «Directorio».
  Buscar «directorio», «obra» o «cita» puede devolver cada página de ese tipo, y la que llegue segunda no sabrá qué decidió la primera. Es un aplazado que deja divergir a dos unidades.
- **Tecnología.** La documentación sí trae `ranking.metaWeights` (pagefind.app/docs/ranking): un peso 0 quita a ese campo su efecto en el orden. No dice que quite la coincidencia. Lo que sí excluye es no emitir el campo como `data-pagefind-meta`, o emitirlo dentro de `data-pagefind-ignore="all"`.
- **Propuesta (corrección clara).** Sacarlo de Deferred a AD-17: el tipo de resultado no viaja como metadata buscable. Viaja como `data-pagefind-filter`, o se deriva en el cliente desde la URL con `tipoDeResultado.ts`. `metaWeights` a 0 para todo campo que no deba puntuar, con una prueba de búsqueda sobre `dist/`.

### M6 — Cinco aplazados y un NFR con un disparador que nada mide

- **Espina y qué falta.**
  - **NFR-7 v8** («se mide con todo ello puesto», PRD l. 1362) no tiene fila en el mapa de capacidades (l. 473–502), que solo lleva NFR-1…6, NFR-8, NFR-9 y NFR-13. Ninguna AD dice quién lo mide ni dónde.
  - Deferred «Tope de bytes de HTML» (l. 515) se reabre «si NFR-7 medido se degrada»: no lo mide nadie.
  - Los filtros de Pagefind (l. 517) y la paginación de `/obras/` (l. 518) se reabren al pasar «un tamaño con nombre» que no tiene nombre. AD-9 diría que viva en `umbrales.ts`, y entonces haría falta una prueba que avise.
  - El índice de subpáginas (l. 516) se captura «con la primera Obra que salga desordenada»: no hay detector de desorden.
- **Por qué importa.** No dejan divergir a dos unidades hoy. Dejan que el disparador no se dispare nunca, y entonces el aplazado se vuelve una decisión tomada sin nadie.
- **Propuesta.**
  - Para cada uno, o el umbral con nombre en `umbrales.ts` y una prueba que **avise** sin romper, o la frase «se mira a mano en …».
  - Para NFR-7, una fila en el mapa con su instrumento, aunque sea manual (Lighthouse a 4G sobre una Página de Cita con la medición puesta), o un aplazado explícito.

---

## 4. Bajos

- **B1. «Migración» y «reversión» van en sentidos opuestos, y solo se escribe uno** (l. 465). La reversión «sigue siendo volver a desplegar un commit anterior del sitio o del receptor». Revertir el receptor con el sitio nuevo en línea reproduce el caso «el sitio antes que el receptor» de A2. Hay que escribir que la reversión va en el orden inverso, sitio y luego receptor, y que las migraciones no se revierten.
- **B2. FR-48, la traducción, sigue fuera de los binds y la v8 la cruza** (l. 321 y l. 510). AD-25 da a la Obra el «año cuando las Citas que lo declaran coinciden». El código y `AGENTS.md` añaden que el año de una traducción **nunca** cuenta, y la UX v8 extiende «sin traductor» a la Tarjeta de Obra, a las Obras de la portada y al 9:16 (EXPERIENCE § Obra traducida, reglas 3 y 5). `procedencia.traduccion` existe desde la Historia 19.1 y la espina no la nombra. Ratificarlo en AD-25: el año de la Obra excluye el de la traducción, y el traductor lo compone solo `atribucion.ts`.
- **B3. La dirección de dependencias no ratifica `tools/lib/`** (l. 43 y l. 60). La tabla dice que `tools/` es «Comodidad, no puerta», y la flecha solo conoce `corpus → esquema → lib → pages`. Pero `astro.config.mjs` importa `tools/lib/cambios.ts`, y las seis integraciones importan `tools/lib/corpus.ts`, `cotejo.ts`, `indexables.ts`, etc.: el criterio de la puerta del cotejo vive en `tools/lib/`. La v8 añade `content.config.ts → tools/lib/cotejo.ts`. Hay que decir que `tools/lib/` es una capa pura compartida por el build y por las órdenes, y que la red sigue solo en la cáscara (AD-22).
- **B4. Los binds de FR-44, FR-45, FR-46 y FR-49 contradicen AD-24 v8** (l. 307 y l. 510). Deferred dice que «no se vinculan… sin invariante nuevo». AD-24 v8 impone la familia `directorio`, sacada del censo y nunca del prefijo, a rastreo (FR-46), canal (FR-44 y FR-45) y demanda (FR-49). Hay que vincularlas o acotar AD-24.
- **B5. El grafo de alcanzabilidad no dice qué cuenta como enlace** (l. 154). Sobre el HTML crudo, un `<a>` dentro de `<template>` (el aviso de `/buscar/`, AD-6 l. 111) o de `<noscript>` lo contaría un analizador y no lo sigue un rastreador que no ejecuta guion. Hay que fijar que `superficiesInalcanzables` ignora `<template>` y cuenta `<noscript>`, o lo que se decida.
- **B6. `wrangler` sin fijar, ahora que tiene estado que migrar** (l. 398). Ejecutado con `npx`, toma la vigente, que es 4.151.1 el 2026-10-18. Con `d1 migrations apply` y su tabla de control, dos máquinas con versiones distintas aplicando migraciones es una divergencia evitable: conviene fijarlo en `devDependencies` como `googleapis`.
- **B7. AD-21 conserva una garantía que AD-14 v8 hace imposible** (l. 272). «Un paso del flujo diario de CI avisa cuando se cruza», y el paso existe (`publicar.yml`, «Avisar si algún Umbral…»). Con «No hay punto final de lectura» (l. 188) y los Umbrales escritos en sesiones, que Deferred da por no medibles (l. 513), ese paso dirá siempre «no medible»: «para que no dependa de acordarse» deja de ser cierto. El reconcile del PRD lo vio como bajo (§9). Aquí cuenta como Rule no exigible: hay que reescribir la cláusula como lo que es hoy.
- **B8. La semilla estructural omite piezas que las AD citan** (l. 416–442). Faltan `src/lib/ingreso.ts`, dueño de AD-20 y AD-21, y `src/lib/admision.ts`, la puerta del esquema que AD-1 v8 y AD-20 nombran. Faltan también `lote.astro`, que AD-17 declara, y `rss.xml.ts` y `[clave].txt.ts`, que existen y enumeran o anuncian contenido.
- **B9. Versiones.** Comprobado con `npm view` el 2026-10-18: Pagefind 1.5.2, axe 4.14.0 y `wrangler` 4.151.1 son las vigentes que dice la espina. Astro vigente es **7.4.0**, con `^7.2.0` y 7.2.0 instalada. No muerde, pero el comportamiento de A1 se comprobó en 7.2.0 y conviene reverificarlo si se sube. `wcag22aa` existe en axe desde antes de la 4.12.1 instalada.

---

## 5. Lo que ya vieron los cotejos, y esta lente confirma sin repetir

Confirmo y no reformulo:

- **reconcile-v8-prd:**
  - el alcance del guion de medición (§1);
  - NFR-5 frente a AD-18 (§2);
  - el corte de SM-8 por `defer` (§3);
  - la caché de atrás y adelante en la búsqueda (§4);
  - los 320 px (§5);
  - los lectores nuevos de la comprobación sobre `dist/` (§6);
  - la rotación y la clave de orden (§7);
  - la base nueva frente a la migración 0001 (tabla).
- **reconcile-v8-ux:**
  - las dos instancias de `medicion.ts` (§1.2);
  - las anclas y la «una por carga» (§1.3);
  - los anunciadores sin dueño (§1.4);
  - el callejón de `/buscar/` sin su fichero (§1.5);
  - el orden del selector de Autor (§1.6);
  - dos Fuentes en una Obra (§1.7);
  - la cabida del 9:16 (§1.8);
  - Pagefind fuera de la lista cerrada (§2).

A1 y M1 tocan la misma AD-6 y la misma búsqueda que esos hallazgos, pero por una causa distinta: la tecnología, no la entrada.

## Fuentes de la verificación en la web (2026-10-18)

- [Pagefind — CHANGELOG](https://github.com/Pagefind/pagefind/blob/main/CHANGELOG.md): 1.5.0 busca la metadata por defecto; la vigente es la 1.5.2.
- [Pagefind — Sorts](https://pagefind.app/docs/sorts/): sin clave, la página se omite; un valor no numérico pasa todos a orden alfabético.
- [Pagefind — Ranking](https://pagefind.app/docs/ranking/): `ranking.metaWeights`.
- [Pagefind — Indexing](https://pagefind.app/docs/indexing/): `data-pagefind-ignore="all"`.
- [Cloudflare D1 — Pricing](https://developers.cloudflare.com/d1/platform/pricing/) y [Limits](https://developers.cloudflare.com/d1/platform/limits/): 100.000 filas escritas al día y 500 MB por base en el plan gratuito.
- `npm view` para Astro, Pagefind, axe-core y `wrangler`. Código de Astro 7.2.0 en `node_modules/astro/dist/core/build/plugins/plugin-scripts.js` y `util.js`.

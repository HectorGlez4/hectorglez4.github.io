---
title: 'Ninguna Cita queda a más de tres saltos, y el build lo comprueba'
type: 'feature'
created: '2026-10-28'
status: 'done'
baseline_revision: '6c9624d5de5166166730fb75ed4076e5b7cb92ab'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-26-context.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Las órdenes que añaden o reordenan Citas de un listado (aprobar y alta al publicar en un Autor o una Obra, documentar cuando cambia la obra, obra reunir, restituir-grafia, recuperar al cambiar posicionesDeCitas) no comprueban si empujan a la página 2 a una Cita existente sin Tema ni Colección publicados.
    evidence: |-
      Con CITAS_POR_PAGINA = 50, una Cita nueva de un Autor ordenada antes por slug (o una Obra en orden del libro) desplaza el tramo; la que cae a la página 2 sin otro camino queda a 4 saltos en el modelo. Ni aprobar ni darDeAltaLote corren fueraDeAlcanceTras: la intención de la 26.8 fija para las que publican solo la regla de Tema, y las demás órdenes quedan fuera de la historia. Hoy lo caza el build (y la integración nombra la Cita), pero después del commit.
    location: >-
      tools/lib/revision.ts (aprobar), tools/alta.ts (darDeAltaLote), tools/lib/documentacion.ts, tools/lib/obras.ts (reunir, restituir-grafia), tools/recuperar.ts
    severity: medium
  - summary: >-
      `npx tsx tools/tema.ts quitar <tema> <slug> --corpus <dir>` (y `asignar`) toma la ruta del Corpus por un slug de Cita más.
    evidence: |-
      tools/tema.ts filtra los slugs con argumentos.slice(2).filter((a) => !a.startsWith('--')), que deja pasar el valor de --corpus; tools/lib/cli.ts ya tiene `posicionales(argumentos, conValor)` para esto. Anterior a la 26.8: la prueba de la orden se corre sin --corpus, desde el directorio del Corpus de prueba.
    location: >-
      tools/tema.ts:39,54
    severity: low
---

<intent-contract>

## Intent

**Problem:** NFR-5 (toda superficie de `rutasPublicadas` a ≤ `MAX_SALTOS_DESDE_LA_PORTADA` = 3 saltos de `/`) solo lo miran pruebas sobre un corpus de juguete y `tests/e2e/seo.spec.ts`, que el CI no corre; ningún build lo rompe, ninguna orden que retira lo mira, y el bloque que rota con la jornada (la Cita del Día) entra en el grafo, así que un veredicto podría cambiar sin commit (AD-11, AD-12).

**Approach:** Una sola marca `data-jornada` puesta por un solo componente; una función pura de `src/lib/publicado.ts` que compone el **grafo del modelo** desde las enumeraciones que pintan las páginas; una integración en `astro:build:done` que lee el grafo del `dist/` real (sin `data-jornada`, `<template>` ni `<noscript>`), exige que contenga el del modelo y corre `superficiesInalcanzables` sobre `rutasPublicadas`; las órdenes que retiran o publican consultan el modelo antes de escribir; y una prueba de dos jornadas fija que el veredicto y el HTML no dependen del día.

## Boundaries & Constraints

**Always:**
- El tope no se relaja: `MAX_SALTOS_DESDE_LA_PORTADA` sigue en 3 y ningún código de producción (build, órdenes) pasa otro `maximoDeSaltos`; solo las pruebas.
- Lo publicable es `rutasPublicadas(conjunto)` —Obras sin indexar incluidas—, nunca `caracterDe(ruta) === 'producto'`.
- El grafo del modelo lo compone **una** función de `src/lib/publicado.ts` (`grafoDelModelo`), pura (AD-5), con las enumeraciones que usan las páginas: `temasPublicados`+`citasDeTema`, `conjunto.colecciones[].citas`, `autoresPublicados`+`citasDeAutor`+`obrasDelAutor`, `obrasPublicadas`+`citasPorObra`, paginadas por `CITAS_POR_PAGINA` con los constructores de ruta de `superficies.ts`/`rutaDeLaObra`. Aristas, todas normalizadas con `rutaNormalizada`: `/` → Temas publicados y Colecciones publicadas; cabecera de **todo** nodo del modelo → `/`, `/autores/`, `/obras/`, `/buscar/`; cada página k de un listado → cada página j≠k del mismo listado y → las Citas de su tramo; página 1 de Autor → sus Obras; `/autores/` → todo Autor publicado; `/obras/` → toda Obra publicada (página 1). **Ni** `/`→Autores (la lista de la portada se va en la 28) **ni** Cita→Cita.
- El grafo de `dist/` y el de los veredictos ignoran los subárboles de un elemento con `data-jornada`, `<template>` o `<noscript>`; solo cuentan `<a href>` internos (raíz relativa o host de `SITIO`), sin `?…` ni `#…`.
- `data-jornada` lo emite solo `src/components/CitaDelDia.astro` (atributo sin valor). La portada y el 404 conservan `section.del-dia`, «Ver esta cita», `data-zona="cita-del-dia"` y su aspecto; la portada su `data-pagefind-ignore="all"`. El de `lote.astro` pasa a `data-dia-del-lote` en el mismo commit que su prueba.
- Órdenes que retiran (`retirarCita`, `quitarCitas`, `despublicarColeccion`, `quitarTema`): se validan como hoy (sus códigos de forma y de existencia primero) y, **antes de escribir nada**, comparan el modelo del Corpus actual con el resultante; si alguna Cita alcanzable pasa a inalcanzable, `ok:false` (código 1) nombrando cada Cita y cada Tema suyo que el cambio deja bajo `MIN_CITAS_POR_TEMA`, con su recuento. Lo que ya estaba fuera antes no bloquea.
- `aprobar` (revisar) y `darDeAltaLote` (alta, también `--seco`) no publican una Cita sin ningún Tema publicado, contado con `temasPublicados` sobre las publicadas **más** las que la misma pasada publicaría (punto fijo: quitar una rechazada puede dejar a otra sin Tema). La rechazada no se escribe en ningún sitio (en revisar sigue en `_revision/` intacta); el parte nombra la Cita y cada Tema que declara con su recuento; la orden sale con 1. Las demás de la pasada siguen como hoy.
- Ningún veredicto, aviso ni línea de registro de esta historia depende de `FECHA_JORNADA` ni de `corpus/portada.json` (la guarda de `tests/unit/peso.test.ts` debe seguir verde sin tocarla).
- Nombres en español; ningún literal de color/tipografía en componentes (tokens de `DESIGN.md`).

**Block If:**
- El Corpus real del worktree (`npm run build`) rompe la puerta nueva por una Cita o superficie fuera de alcance: HALT blocked — el contenido lo decide Héctor. (Medido en la planificación: 0 fuera en `dist/` y 0 en el modelo, sobre el Corpus del worktree y el de la principal.)
- Hacer pasar la prueba de dos jornadas exige cambiar algo visible fuera del subárbol `data-jornada` de la portada o del 404.

**Never:**
- No relajar el tope, no sustituir `tests/e2e/seo.spec.ts` (no se toca), no añadir `/`→Autores al modelo, no correr órdenes de retirar ni de publicar contra el Corpus real, no mover ni borrar nada de `corpus/`.
- No editar `_bmad-output/planning-artifacts/` ni `_bmad-output/specs/`; no tocar `sprint-status.yaml`.
- No leer `astro:content` desde la integración ni desde `tools/`: el Corpus se lee de disco.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Build sano | Corpus con todo a ≤3 saltos y plantillas intactas | Construye; registra una línea fija sin jornada: superficies publicadas medidas y aristas del modelo contenidas | — |
| Cita fuera | Portada parcheada sin la lista de Autores; Autor con >50 Citas; una en la pág. 2 sin Tema publicado ni Obra en pág. 1 | Rompe nombrando `/cita/<slug>` y su Tema con N Citas bajo `MIN_CITAS_POR_TEMA` | `logger.error` con el detalle, `throw` con titular y número |
| Arista perdida | `Paginacion.astro` parcheada sin los números | Rompe nombrando cada arista `origen → destino` que falta | Titular con el número; detalle completo en el registro |
| Cita del Día | Enlaces dentro de `[data-jornada]`, `<template>`, `<noscript>` | No cuentan para ningún grafo | — |
| Retirar sin efecto | `documentar --retirar` de una Cita cuya salida no deja a nadie fuera | Igual que hoy | Códigos de siempre |
| Retirar que deja fuera | Quitar el Tema/miembro/Colección/Cita que lleva a otra Cita bajo umbral | Código 1, nada escrito ni movido, nombra Cita(s) y Tema(s) con recuento | — |
| Aprobar la 15.ª | Tema con 14 publicadas; se aprueba 1 candidata con ese Tema (o varias que juntas llegan) | Se publica(n) | — |
| Aprobar sin Tema | Candidata sin Tema o con Temas que no llegan a 15 ni con la pasada | No se publica, sigue en `_revision/`; parte la nombra con sus Temas y recuentos | Salida 1 |
| Alta sin Tema | Entrada del lote sin Tema publicado | No se escribe (ni `citas/` ni `_revision/`); las demás siguen | Salida 1, también en `--seco` |

</intent-contract>

## Code Map

- `src/lib/publicado.ts:903` -- `superficiesInalcanzables` (BFS pura, se reutiliza tal cual); `:704` `rutasPublicadas`; `:155/163/190/194` enumeraciones; `:757` `obrasDelAutor`; `:771` `citasPorObra`; `:786` `obrasPublicadas`. Aquí van `grafoDelModelo(conjunto, citasDeCadaObra)` y `temasBajoUmbralDe(cita, citas, temas)` (Temas declarados no publicados, con recuento). Importa de `superficies.ts`; no importar `directorios.ts` (ciclo).
- `src/lib/superficies.ts:345-440,516` -- `rutaDeCita/Autor/Tema/Coleccion(slug, n)`, `rutaDePagina`, `rutaDelDirectorioDe{Autores,Obras}`, `rutaDeLaBusqueda`, `rutaNormalizada`. `src/lib/obras.ts:120` `rutaDeLaObra(obra, n)`.
- `src/components/Paginacion.astro` -- pinta todos los números (base de las aristas k→j). `ListaDeObras.astro:46` Autor→Obra. `FilaDeAutor.astro` filas de `/autores/`.
- `src/pages/index.astro` (sección `del-dia`, l. ~85-100; lista Autores l. ~150) y `src/pages/404.astro` (l. 55-63) -- pasan a `<CitaDelDia>`; sus estilos `.del-dia`, `.del-dia h2`, `.ir` deben seguir aplicando (moverlos al componente o pasarlos; el aspecto no cambia).
- `src/pages/lote.astro:104` -- `data-jornada={dia.jornada}` → `data-dia-del-lote`; `tests/unit/lote-construido.test.ts:107-109,187-195,285`.
- `integraciones/indexables.ts` -- patrón a copiar: `astro:config:setup` captura `raiz`, `astro:build:done` lee `dist/`, `logger.error` + `throw`. `tools/lib/indexables.ts:60` `rutaDeFicheroHtml`.
- `astro.config.mjs` (lista `integrations`) -- registrar la integración nueva con su comentario, tras `rutasIndexablesDelCorpus()`.
- `tests/unit/ayuda/enlaces.ts:161` -- `recorrerElementos`, tokenizador con pila (2,1 s y 0 rechazos sobre los 5.290 HTML reales). Mudarlo con sus tablas a `tools/lib/html.ts`; `enlaces.ts` lo reexporta.
- `tools/indexacion.ts:214` -- `conjuntoDelCorpus(rutas)`: mudar a `tools/lib/alcance.ts` y reexportar desde aquí (lo importan rastreo, demanda, medicion, trafico). `tools/lib/posiciones.ts:109` `leerPosicionesDelCorpus` (~2,2 s sobre el real).
- `tools/lib/documentacion.ts:806` `retirarCita`; `tools/lib/curacion.ts:425` `quitarCitas`, `:562` `despublicarColeccion`; `tools/lib/gestion.ts:666` `quitarTema`, `:910` `retirarAutor` (ya se niega con Citas publicadas: solo comentario). CLIs con `terminar` (`tools/lib/cli.ts:103`, ok:false → 1).
- `tools/lib/revision.ts:227` `aprobar` (bucle que mueve al validar; separar planificar/escribir) y `tools/revisar.ts` (pinta `rechazadas*`, `fallo` → 1). `tools/alta.ts:101` `darDeAltaLote` y su CLI (hoy sale 0 siempre).
- `tests/unit/publicable-y-alcanzable.test.ts:320-336` -- prueba que hoy mide `caracterDe === 'producto'`; su build ya trae Obra no indexable, páginas 2+ y Directorios.
- `tests/unit/peso.test.ts:511-620` -- guarda «solo cinco superficies leen la jornada»; `tests/unit/ayuda/construir.ts:99` `construirConCorpus` (opciones `jornada`, `ficheros`, `paginas`).
- Fixtures afectadas por la regla de Tema: `alta.test.ts`, `duplicados.test.ts`, `revision.test.ts`, `obras.test.ts`, `gestion.test.ts`, `aparato-al-aprobar.test.ts`, `cita-ajena-al-aprobar.test.ts`, `revisar-cli.test.ts`, `documentacion.test.ts`, `cotejo-build.test.ts`.
- Rojo previo conocido: `tests/unit/obra-pagina.test.ts:615` falla en la base (deferido de la 26.7); no es de esta historia.

## Tasks & Acceptance

**Execution:**
- `src/components/CitaDelDia.astro` -- crear: recibe Cita y Autor, emite `<section class="del-dia" data-jornada data-pagefind-ignore="all">` con `h2`, `BloqueDeCita` y «Ver esta cita» (`data-zona="cita-del-dia"`) -- único dueño de la marca (AD-12).
- `src/pages/index.astro`, `src/pages/404.astro` -- usar el componente; la selección sigue en la página -- un solo emisor.
- `src/pages/lote.astro`, `tests/unit/lote-construido.test.ts` -- renombrar a `data-dia-del-lote` -- la marca queda libre.
- `src/lib/publicado.ts` -- `grafoDelModelo` y `temasBajoUmbralDe` según Always -- AD-11.
- `tools/lib/html.ts`, `tests/unit/ayuda/enlaces.ts` -- mudar el tokenizador y reexportarlo -- lo necesita el build.
- `tools/lib/alcance.ts` -- crear: `conjuntoDelCorpus` (mudado), `modeloDelCorpus(rutas)` (conjunto + posiciones + grafo), `enlacesInternos(html)` (salta `data-jornada`/`template`/`noscript`), `grafoDeDist(paginas)`, `aristasQueFaltan(modelo, dist)`, `veredictoDeAlcance(...)` (Citas fuera con `temasBajoUmbralDe`), `fueraDeAlcanceTras(rutas, cambio)` (antes/después para las órdenes) y el texto de los partes -- una sola lógica para build y órdenes.
- `tools/indexacion.ts` -- reexportar `conjuntoDelCorpus` -- sin tocar a sus importadores.
- `integraciones/alcance.ts`, `astro.config.mjs` -- integración `astro:build:done`: contención + NFR-5; informa o rompe -- la puerta.
- `tools/lib/documentacion.ts`, `tools/lib/curacion.ts`, `tools/lib/gestion.ts` -- consultar `fueraDeAlcanceTras` antes de escribir en las cuatro funciones; comentario en `retirarAutor` -- NFR-5 en las órdenes.
- `tools/lib/revision.ts`, `tools/revisar.ts`, `tools/alta.ts` -- regla de Tema publicado con la pasada (planificar todo, punto fijo, escribir después); `rechazadasPorTema` en revisar; salida 1 en alta -- AD-11 v8.2.
- `tests/unit/alcance.test.ts` -- crear (puro): aristas del modelo (portada sin Autores, cabecera, todos los números, Autor→Obras, Directorios, tramos de 50), `enlacesInternos` ignora las tres marcas y anidadas, `aristasQueFaltan`, mensaje con Tema y recuento, `fueraDeAlcanceTras` solo lo nuevo.
- `tests/unit/alcance-construido.test.ts` -- crear (builds): sano con su línea; portada parcheada sin Autores → rompe nombrando Cita y Tema; `Paginacion.astro` parcheada → rompe nombrando aristas; `data-jornada` solo en `index.html` y `404.html`, una vez, con «Ver esta cita» dentro, y entre `src/` solo `CitaDelDia.astro` contiene la cadena.
- `tests/unit/dos-jornadas.test.ts` -- crear: dos `construirConCorpus` del mismo corpus con `jornada` distinta (≥2 aptas; exigir que la Cita del Día difiera); mismas salidas y mismas líneas `[WARN]`; todo `.html` idéntico salvo `/`, `/404`, `/kit`, `/lote`; `/` y `/404` idénticos tras quitar el subárbol `data-jornada`; `sitemap-0.xml` idéntico; `rss.xml` y no-HTML fuera; `grafoDeDist` igual en los dos.
- `tests/unit/publicable-y-alcanzable.test.ts` -- la prueba de alcance pasa a `rutasPublicadas` (Obra no indexable incluida) y se apoya en la línea de la integración.
- `tests/unit/{documentacion,curacion,gestion,documentar-cli,coleccion-cli}.test.ts` -- un caso de negativa por orden (no `autor retirar`) y uno sin efecto.
- `tests/unit/{revision,alta,revisar-cli}.test.ts` + fixtures listadas -- aprobar la 15.ª se admite; sin Tema → 1 sin escribir; adaptar fixtures (Tema publicado en el corpus de prueba) sin debilitar lo que miran.
- `AGENTS.md` -- un párrafo en «Known pitfalls»: la puerta NFR-5 del build, `data-jornada` de un solo componente y las negativas de las órdenes.

**Acceptance Criteria:**
- Given el `dist/` real, when termina el build, then rompe si una superficie de `rutasPublicadas` queda a >3 saltos o si falta una arista del modelo, nombrando cada una, y si no, informa con una línea que no depende de la jornada.
- Given una Cita fuera cuyo Tema cayó bajo `MIN_CITAS_POR_TEMA`, when rompe, then nombra ese Tema y cuántas Citas tiene.
- Given dos builds del mismo commit en jornadas que cambian la Cita del Día, when se comparan, then mismos veredictos y avisos, mismo sitemap, y el HTML solo difiere en el subárbol `data-jornada` de `/` y `/404` (y en `/kit`, `/lote`).
- Given las cinco órdenes que retiran y las dos que publican, when actúan sobre un Corpus de prueba, then se comportan según la matriz, sin escribir nada cuando se niegan.

## Spec Change Log

## Review Triage Log

### 2026-10-28 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

Pasada de finalización sin hallazgos: las capas de revisión de este bucle son externas y la revisión independiente llega después.

### 2026-10-28 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 17 (high 0, medium 7, low 10)
- defer: 2 (high 0, medium 1, low 1)
- reject: 23 (high 0, medium 0, low 23)
- addressed_findings:
  - `[medium]` `[patch]` Un slug repetido en `--aprobar` contaba dos veces para el Tema (blind-hunter, edge-case-hunter): `aprobar` planifica sobre `new Set(slugs)`; prueba en `revision.test.ts`.
  - `[medium]` `[patch]` Una Ficha de Obra que falla dejaba publicada, sin Tema, a otra que contaba con ella, en `aprobar` y en la pasada real de `darDeAltaLote` (blind-hunter, edge-case-hunter ×2, verification-gap): `aprobar` resuelve las fichas al planificar —la que choca con el disco ya no cuenta para nadie— y las dos órdenes vuelven a juzgar lo escrito y lo dicen en `publicadasSinTema`, con salida 1 (`revisar`, `alta`, `sembrar`).
  - `[medium]` `[patch]` Sin prueba de la Ficha que falla en una pasada que la necesita (verification-gap): caso en `revision.test.ts` con B antes que A, que falla sin la planificación.
  - `[medium]` `[patch]` Sin prueba de que `fueraDeAlcanceTras` mida solo lo nuevo (verification-gap): dos casos en `alcance.test.ts` sobre el Corpus al límite con una Cita ya fuera, uno por la orden `quitarTema`.
  - `[medium]` `[patch]` Un marcado que el tokenizador rechaza cortaba el build sin decir la página (blind-hunter, edge-case-hunter): `grafoDeDist` nombra la ruta; prueba pura.
  - `[medium]` `[patch]` `tools/sembrar.ts` salía con 0 con Citas sin Tema publicado (blind-hunter): sale con 1, como el alta (`sinTemaPublicado`).
  - `[medium]` `[patch]` El flujo de sembrado documentado no decía que aprobar exige Tema con página (blind-hunter): AGENTS.md (paso 3, con `--temas`) y la cabecera de `tools/revisar.ts`.
  - `[low]` `[patch]` La integración leía los ~5.300 HTML a la vez (blind-hunter): tandas de 64 y solo la lista de enlaces por página.
  - `[low]` `[patch]` Cabecera y uso de `tools/alta.ts` desfasados (blind-hunter): dicen dónde va la Cita sin Tema publicado, frente al Tema desconocido, y los códigos de salida.
  - `[low]` `[patch]` El «punto fijo» de `temaPublicadoConLaPasada` no podía iterar y los comentarios describían una cascada imposible; con ella, `temasBajoUmbralDe` podía dar `[]` a una Cita con Temas (blind-hunter, edge-case-hunter): una sola pasada, comentarios corregidos en `alcance.ts`, `revision.ts`, `alta.ts` y las pruebas.
  - `[low]` `[patch]` Las órdenes que retiran leen el Corpus entero y se niegan ante cualquier fichero ilegible sin que se dijera (blind-hunter): AGENTS.md.
  - `[low]` `[patch]` `titularDeAlcance` con «superficie(s)» y «arista(s)» (blind-hunter): `enNumero`.
  - `[low]` `[patch]` `temasBajoUmbralDe` contaba por Cita y `temasPublicados` por aparición (edge-case-hunter): cuenta por aparición.
  - `[low]` `[patch]` `grafoDelModelo` callaba las aristas de una Obra sin Citas en el mapa (edge-case-hunter): lanza nombrándola.
  - `[low]` `[patch]` `data-jornada` con dos dueños y guarda solo sobre `src/` (blind-hunter, intent-alignment): la guarda busca `MARCA_DE_JORNADA` en `src/` y `public/` y exige que el componente la emita.
  - `[low]` `[patch]` Una negativa de `quitarTema` con aserción condicional y sin instantánea (ac-auditor): incondicional y con antes/después.
  - `[low]` `[patch]` `tools/tema.ts quitar` sin prueba de la orden (ac-auditor): caso de salida 1 en `gestion.test.ts`.

Rechazados (sin cambio): el `data-pagefind-ignore` del 404 (la 404 es `servicio` y no lleva `data-pagefind-body`: Pagefind no la indexa y el atributo es inerte); diagnóstico de superficies que no son Cita (con el modelo contenido toda superficie del modelo está a ≤3 por la cabecera, así que una fuera viene con sus aristas que faltan en el mismo detalle); aristas Cita→Autor/Obra/Tema (la intención fija la lista); `rutaInterna` y la codificación (los slugs son ASCII por esquema); estilo del rótulo en tres copias (cosmético); `noscript`/`iframe` como texto crudo (especulativo, y el corte ya nombra la página); superficies no-Cita que una orden deja fuera (imposible en el modelo por la cabecera); las lecturas A–G de la auditoría de intención (implementan el `<intent-contract>`: dist para el alcance, modelo para las órdenes, diferencia antes/después, regla de Tema al publicar); dos jornadas que rompen, fila de Directorio y `<template>` en un build, Obra no indexable fuera, Corpus real en prueba (cubiertos por la misma función o por el build real); los tiempos de `seo.spec.ts` con varios trabajadores (ya anotados en 23.1, 26.3 y 26.5); y la pasada anterior sin hallazgos (esta es la revisión).

## Design Notes

- **Por qué el modelo no lleva `/`→Autores:** la lista lo enumera así y la historia existe para que quitar esa lista (Épica 28) no deje nada fuera sin verse. Con el modelo literal, la contención no se rompe al quitarla y la puerta NFR-5 del `dist/` es la que avisa; y las órdenes ya calculan con el sitio que quedará. Medido hoy: 0 Citas fuera también sin esa arista.
- **Antes/después en las órdenes:** «dejarían» se lee como causado por la orden; una Cita que ya estaba fuera del modelo no es efecto suyo y no bloquea (hoy no hay ninguna).
- **Lectura de disco en el build:** `conjuntoDelCorpus` + `leerPosicionesDelCorpus` (~3 s) y el tokenizador (~2 s) sobre lo real; anotar la medida en el commit. Si el modelo de disco y el `dist/` discreparan por orden de Citas, es la contención la que lo diría: `citasDeAutor/Tema` ordenan por slug y la Obra por `ordenDelLibro`, igual que las páginas.

## Verification

**Commands:**
- `npx vitest run tests/unit/alcance.test.ts` -- verde.
- `npx vitest run tests/unit/alcance-construido.test.ts tests/unit/dos-jornadas.test.ts tests/unit/publicable-y-alcanzable.test.ts tests/unit/lote-construido.test.ts tests/unit/peso.test.ts` -- verde (de uno en uno).
- `npx vitest run tests/unit/{revision,alta,revisar-cli,duplicados,obras,gestion,curacion,documentacion,documentar-cli,coleccion-cli,aparato-al-aprobar,cita-ajena-al-aprobar,cotejo-build,medicion}.test.ts` -- verde, por fichero.
- `npm run build` sobre el Corpus del worktree -- sale 0 con la línea de alcance; si rompe por NFR-5, Block If.
- `npx astro check` -- 0 errores.
- `npm test` (largo, con `correr.sh`/`esperar.pl`) -- verde salvo el rojo previo de `obra-pagina.test.ts:615`.

## Auto Run Result

Status: done
Blocking condition: ninguna. El Corpus real del worktree pasa la puerta nueva (5115 superficies publicadas a ≤3 saltos, 37398 aristas del modelo contenidas en `dist/`, 0 fuera también en el modelo sin la lista de Autores de la portada).

**Cambio implementado.** NFR-5 tiene puerta en el build y en las órdenes. `grafoDelModelo` y `temasBajoUmbralDe` en `src/lib/publicado.ts`; `tools/lib/alcance.ts` reúne la lectura del Corpus de disco (`conjuntoDelCorpus`, mudado desde `tools/indexacion.ts`, que lo reexporta), el grafo de `dist/` sin `data-jornada`/`<template>`/`<noscript>`, la contención, el veredicto con Tema y recuento, la comparación antes/después de las órdenes y la regla de Tema publicado con la pasada; `integraciones/alcance.ts` la corre en `astro:build:done`. La Cita del Día la pinta solo `CitaDelDia.astro`, único emisor de `data-jornada`; el lote usa `data-dia-del-lote`. `retirarCita`, `quitarCitas`, `despublicarColeccion` y `quitarTema` se niegan con 1 antes de escribir; `aprobar` y `darDeAltaLote` planifican la pasada entera y no publican una Cita sin Tema publicado (el alta sale con 1, también en seco).

**Ficheros.**
- `src/components/CitaDelDia.astro` — nuevo: la Cita del Día y el único `data-jornada`.
- `src/pages/index.astro`, `src/pages/404.astro` — usan el componente; el margen superior del bloque lo pone cada página con `:global` (4 y 6 unidades, como antes).
- `src/pages/lote.astro` — `data-dia-del-lote`.
- `src/lib/publicado.ts` — `grafoDelModelo`, `temasBajoUmbralDe`.
- `tools/lib/alcance.ts` — nuevo: toda la lógica de NFR-5 para build y órdenes.
- `tools/lib/html.ts` — nuevo: el tokenizador con pila, mudado de `tests/unit/ayuda/enlaces.ts` (que lo reexporta).
- `integraciones/alcance.ts`, `astro.config.mjs` — la puerta del build, registrada tras `rutasIndexablesDelCorpus()`.
- `tools/indexacion.ts` — reexporta `conjuntoDelCorpus`.
- `tools/lib/documentacion.ts`, `tools/lib/curacion.ts`, `tools/lib/gestion.ts` — negativas por alcance; comentario en `retirarAutor`.
- `tools/lib/revision.ts`, `tools/revisar.ts`, `tools/alta.ts` — regla de Tema publicado, `rechazadasPorTema`, salida 1.
- `tests/unit/alcance.test.ts`, `alcance-construido.test.ts`, `dos-jornadas.test.ts` — nuevas; `publicable-y-alcanzable.test.ts` mide `rutasPublicadas` y la línea de la integración; `lote-construido.test.ts` con la marca nueva.
- `tests/unit/ayuda/relleno.ts`, `tests/unit/ayuda/al-limite.ts` — nuevos andamios; fixtures adaptadas en `revision`, `alta`, `revisar-cli`, `duplicados`, `obras`, `gestion`, `aparato-al-aprobar`, `cita-ajena-al-aprobar`; negativas y casos sin efecto en `documentacion`, `curacion`, `gestion`, `documentar-cli`, `coleccion-cli`.
- `AGENTS.md` — párrafo en «Known pitfalls».

**Revisión.** Esta pasada no tiene hallazgos (capas externas): 0 parches, 0 aplazados, 0 rechazados. `followup_review_recommended: false` (parches: 0 high, 0 medium, 0 low; puntuación 0).

**Verificación.**
- `npx vitest run tests/unit/alcance.test.ts` — 19/19.
- `alcance-construido` 5/5, `dos-jornadas` 5/5, `publicable-y-alcanzable` 37/37, `lote-construido` 12/12, `peso` 56/56 (la guarda de la jornada, sin tocar).
- `revision` 30/30, `alta` 19/19, `revisar-cli` 4/4, `duplicados` 13/13, `obras` 117/117, `gestion` 59/59, `curacion` 44/44, `documentacion` 48/48, `documentar-cli` 19/19, `coleccion-cli` 14/14, `aparato-al-aprobar` 3/3, `cita-ajena-al-aprobar` 3/3, `cotejo-build` 20/20, `medicion` 545/545.
- `npm run build` sobre el Corpus del worktree — sale 0 con «NFR-5: 5115 superficies publicadas, todas a 3 saltos o menos de la portada; las 37398 aristas del modelo están en dist/.» (la integración tarda ~3 s; el modelo de disco, ~2,4 s).
- `npx astro check` — 0 errores, 0 avisos.
- `npm test` — 6679/6680; el único rojo es el previo de `tests/unit/obra-pagina.test.ts:615` («existe `.enlace-en-tinta`»), que ya fallaba en la base (26.7).

**Auditoría de la matriz.** Build sano, Cita fuera, Arista perdida y Cita del Día: `alcance-construido.test.ts` y `alcance.test.ts`. Retirar sin efecto y Retirar que deja fuera: `documentacion`, `curacion`, `gestion`, `documentar-cli`, `coleccion-cli`. Aprobar la 15.ª y Aprobar sin Tema: `revision.test.ts` y `revisar-cli.test.ts`. Alta sin Tema (también seco y la salida 1 de la orden): `alta.test.ts`.

**Riesgos residuales y lecturas.**
- En la prueba de dos jornadas, el grafo de `dist/` se compara fuera de `/kit` y `/lote` como orígenes: sus enlaces a la Cita de su jornada rotan fuera de cualquier `data-jornada` (son las herramientas de jornadas). La prueba fija además que ninguna otra página los enlaza, así que no pesan en ningún veredicto.
- `aprobar` y `darDeAltaLote` deciden la regla de Tema antes de escribir; si una Ficha de Obra falla a mitad de pasada (una colisión entre fichas nuevas del mismo lote), `aprobar` replanifica lo que queda, pero lo ya escrito no se deshace. Caso raro y anotado en el código.
- Una Cita sin ningún Tema ya no se publica por `revisar` ni por `alta` (incluye `tools/sembrar.ts`, que usa el alta). Las fixtures de prueba que publicaban sin Tema siembran ahora un Tema con página.
- La puerta lee el Corpus de disco en el build (~3 s) además del cargador de posiciones.

### Pasada de revisión del 2026-10-28 (capas externas)

**Cambio de esta pasada.** 17 parches (7 medium, 10 low), 2 aplazados, 23 rechazados; sin `intent_gap` ni `bad_spec`. Lo que cambia de comportamiento:

- `aprobar` cuenta una vez el slug repetido y resuelve las Fichas de Obra al planificar: la que choca con el disco ya no le da Tema a ninguna otra.
- `aprobar` y `darDeAltaLote` vuelven a juzgar lo que de verdad escribieron. Una Cita que se quedó sin Tema porque otra ficha chocó al escribir sale en `publicadasSinTema`, y `revisar`, `alta` y `sembrar` acaban con 1.
- `tools/sembrar.ts` sale con 1 cuando hay rechazadas por Tema.
- La regla de Tema es una sola pasada: el punto fijo no podía iterar.
- `temasBajoUmbralDe` cuenta por aparición, como `temasPublicados`.
- `grafoDelModelo` lanza ante una Obra sin sus Citas en el mapa.
- La integración lee `dist/` en tandas de 64.
- `grafoDeDist` nombra la página cuyo marcado no sabe leer.
- El titular del build se escribe con singular y plural.
- Documentación: AGENTS.md (aprobar con `--temas`, y la lectura entera del Corpus en las órdenes que retiran) y las cabeceras de `tools/revisar.ts`, `tools/alta.ts` y `tools/sembrar.ts`.

**Ficheros de esta pasada.**
- `tools/lib/revision.ts`, `tools/revisar.ts`: planificación con fichas, slugs únicos y `publicadasSinTema`.
- `tools/alta.ts`, `tools/sembrar.ts`: el nuevo juicio tras escribir, `sinTemaPublicado`, salida 1 y cabeceras.
- `tools/lib/alcance.ts`: una sola pasada, `grafoDeDist` que nombra la página y titular con `enNumero`.
- `src/lib/publicado.ts`: recuento por aparición y Obra sin Citas en el mapa.
- `integraciones/alcance.ts`: lectura por tandas.
- `AGENTS.md`: flujo de sembrado y órdenes que retiran.
- `tests/unit/alcance.test.ts`: página que no se deja leer y «solo lo nuevo» (dos casos).
- `tests/unit/revision.test.ts`: slug repetido y ficha que choca.
- `tests/unit/gestion.test.ts`: negativa con instantánea y la orden `tema quitar` con salida 1.
- `tests/unit/alcance-construido.test.ts`: guarda con `MARCA_DE_JORNADA` en `src/` y `public/`, y titulares nuevos.
- `tests/unit/ayuda/relleno.ts`: comentario.

**Seguimiento.** `followup_review_recommended: true`. Parches por severidad: 0 high, 7 medium, 10 low; puntuación 3×7 + 10 = 31 ≥ 5.

**Verificación.**
- `npx vitest run tests/unit/alcance.test.ts`: 22/22.
- `revision` 32/32, `alta` 19/19, `revisar-cli` 4/4, `duplicados` 13/13, `obras` 117/117, `gestion` 60/60, `curacion` 44/44, `documentacion` 48/48, `documentar-cli` 19/19, `coleccion-cli` 14/14, `aparato-al-aprobar` 3/3, `cita-ajena-al-aprobar` 3/3.
- `npm run build` sobre el Corpus del worktree: sale 0 con «NFR-5: 5115 superficies publicadas, todas a 3 saltos o menos de la portada; las 37398 aristas del modelo están en dist/.».
- `npx astro check`: 0 errores, 0 avisos; las 8 pistas son anteriores.
- `npm test`: 6683/6686. Fallaron los dos titulares de `alcance-construido`, que aún esperaban «superficie(s)»: se corrigieron y el fichero queda en 5/5 al volver a correrlo. El tercer fallo es el rojo previo de `obra-pagina.test.ts:615`.

**Riesgos residuales.**
- Quedan aplazados en el frontmatter:
  - las órdenes que añaden o reordenan Citas y pueden empujar a la página 2 a una Cita existente sin otro camino;
  - el `--corpus` de `tema quitar`/`asignar`, que la orden toma por un slug más.
- Una colisión entre dos fichas nuevas de la misma pasada sigue pudiendo dejar escrita una Cita sin Tema. Ahora se dice y la orden sale con 1, pero lo escrito no se deshace.


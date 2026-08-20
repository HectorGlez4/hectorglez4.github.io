---
title: 'Fix 11.1b — el año de Wikisource sale de donde la Fuente lo declara'
type: 'bugfix'
created: '2026-08-20'
status: 'ready-for-dev'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/spec-11-1-la-fuente-se-recupera.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-11-context.md'
warnings: []
deferred: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** El lector de año de Wikisource **no puede dispararse nunca**. Busca una línea `Año:` en la página renderizada, y Wikisource no la renderiza: el dato vive en los parámetros de la plantilla de encabezado del wikitexto (`|año = 1905`). Comprobado contra el índice de Wikisource: **0 páginas** con «Año de publicación» visible, y las que el buscador encuentra por `insource:"Año:"` —«Triste (Nervo)» con `|año = 1905`, *Motivos de Proteo* con `|año=1909`, «Amor de madre» con `|año=1893`— recuperan hoy sin año.

Esto bloquea la Historia 11.4. Wikisource es la única Fuente alcanzable —Gutenberg responde 503/504 y Cervantes Virtual 403—, así que toda Cita nueva saldría con Procedencia **parcial**, SM-C1 bajaría de su 52,6 % actual, y la propia historia declara fallida la sesión en la que eso ocurre.

**Approach:** Que la declaración que el documento versiona incluya también **las líneas literales del encabezado del wikitexto**, que es donde la Fuente declara su metadato. Se recuperan de la misma página y del mismo anfitrión, con `?action=raw`. La obra y el año se siguen derivando de la declaración versionada, al recuperar y otra vez al extraer, exactamente como hoy.

## Boundaries & Constraints

**Always:**
- El año sigue saliendo de **lo que la Fuente declara**, nunca de una bandera ni de una inferencia. El «So that» de la 11.1 no se toca: nadie puede teclear una Procedencia que la Fuente no dice.
- La declaración versionada sigue siendo **literal**: se guardan las líneas del encabezado tal cual, no un año ya interpretado. `extraer.ts` tiene que poder volver a derivar el mismo año del documento guardado, que es la puerta que impide componer el documento a mano.
- La segunda petición vive en `tools/recuperar.ts`, el único fichero con red del proyecto (AD-22), y hereda sus guardas: tiempo máximo, techo de tamaño, revalidación del anfitrión tras redirección, y la misma identificación.
- Si el wikitexto no se puede recuperar, o no declara año, **la recuperación sigue adelante sin año**, como hoy. Un metadato que falta no es un fallo.
- Solo `wikisource-es`. Gutenberg ya lee su `Original publication:` del propio texto plano y no se toca.

**Ask First:**
- Si cumplir esto exigiera una dependencia nueva, o pedirle el dato a una API que no sea el mismo anfitrión de la Fuente.

**Never:**
- No añadas `--año` ni ninguna bandera de Procedencia a ninguna orden.
- No derives el año del nombre del fichero, de la URL, ni de las fechas del Autor.
- No aceptes un año aproximado —«hacia 1905», «180?»—: las formas que ya delatan aproximación siguen dejando la candidata con obra y sin año.
- No cambies el formato del documento de forma que los ya versionados dejen de analizarse.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Encabezado con año | `Triste (Nervo)`, cuyo wikitexto trae `\|año = 1905` | Se recupera con **obra y año**, y `extraer` deriva el mismo 1905 del documento guardado | Sin error |
| Sin año declarado | «En paz», cuyo encabezado no lo trae | Obra sin año, como hoy | Sin error |
| Wikitexto inalcanzable | La segunda petición falla o expira | Se recupera igual, con obra y sin año, y se dice | Código 0 |
| Año aproximado | `\|año = hacia 1905` | Obra sin año | Sin error |
| Año imposible | `\|año = 3050`, o un número que no es un año | Obra sin año | Sin error |
| Documento ya versionado | Un `.txt` recuperado antes de este cambio | Se sigue analizando y extrayendo igual | Sin error |
| Coherencia de los dos derivados | Cualquier documento | El año que deriva `recuperar` y el que deriva `extraer` son **el mismo** | Sin error |

</frozen-after-approval>

## Code Map

- `tools/lib/documento.ts` -- `LectorDeFuente` (`region` / `declaracion` / `obra` / `año`), el mapa de lectores por Fuente, `ETIQUETA_DE_AÑO_WIKISOURCE`, `añoJuntoAEtiqueta`, `recorteDeEtiqueta`, `componerDocumento` y `analizarDocumento`. **La declaración es el contrato**: lo que se guarda entre los dos `---` es de donde salen obra y año las dos veces.
- `tools/recuperar.ts` -- la única llamada de red (AD-22), con `TIEMPO_MAXIMO_MS`, `TECHO_DE_TAMAÑO`, `MAXIMO_DE_REDIRECCIONES`, `IDENTIFICACION` y `TIPOS_ADMITIDOS`. La segunda petición va aquí y reutiliza esas guardas. Ojo: `?action=raw` devuelve `text/x-wiki`, que hoy no está en `TIPOS_ADMITIDOS`; esa lista es para el documento de la obra, no para el encabezado.
- `tools/extraer.ts` -- vuelve a derivar obra y año con los **mismos lectores puros**, de la declaración que el documento conserva. Si la declaración incluye el encabezado, esto funciona sin tocarlo.
- `tools/lib/extraccion.ts` -- `añoExacto`, la puerta que rechaza lo que no es un año exacto.
- `tests/unit/recuperar-cli.test.ts` y `tests/unit/extraer-cli.test.ts` -- los moldes, con sus servidores de mentira: ahí se fabrica la página y ahora también su wikitexto.

## Tasks & Acceptance

**Execution:**
- [ ] `tools/lib/documento.ts` -- que `declaracion` pueda recibir el encabezado del wikitexto y lo incorpore literal a la declaración versionada; que el lector de año de `wikisource-es` reconozca la forma `|año = NNNN` además de `Año:`. Rationale: es donde la Fuente lo declara, y guardarlo literal es lo que deja que `extraer` derive lo mismo.
- [ ] `tools/recuperar.ts` -- la segunda petición, con las guardas de la primera, y degradando sin ruido si no llega. Rationale: AD-22 — la red vive aquí y en ningún otro sitio.
- [ ] `tests/unit/documento.test.ts` -- la matriz sobre lo puro: año declarado, ausente, aproximado, imposible, y **que el año que deriva la recuperación es el mismo que deriva la extracción**.
- [ ] `tests/unit/recuperar-cli.test.ts` -- por la orden, con servidor de mentira: página con encabezado con año, sin año, y con el wikitexto inalcanzable.
- [ ] Una prueba de que un documento versionado **antes** de este cambio se sigue analizando y extrayendo.

**Acceptance Criteria:**
- Given una página de Wikisource cuyo encabezado declara el año, when la recupero, then el documento queda con obra **y año**, y la candidata extraída sale con Procedencia completa.
- Given ese mismo documento, when lo extraigo, then el año que deriva `extraer` es el mismo que dijo `recuperar`.
- Given una página sin año declarado, when la recupero, then queda con obra y sin año, sin error.
- Given que el wikitexto no se puede recuperar, when lo intento, then la recuperación termina bien, con obra y sin año, y lo dice.

## Design Notes

**Por qué el encabezado del wikitexto y no la API de datos estructurados.** El wikitexto es **la misma página, del mismo anfitrión**, y es donde su autor escribió el metadato. Pedirlo a otro servicio metería un segundo origen de verdad y un anfitrión que el conjunto cerrado de Fuentes no cubre. `?action=raw` es la misma URL con un parámetro.

**Por qué se guarda literal y no interpretado.** Es la puerta de la 11.1: la obra y el año se vuelven a derivar al extraer, de la declaración que el documento conserva, para que componer el documento a mano no sea más rápido que recuperarlo. Guardar `año: 1905` ya interpretado convertiría esa puerta en una cabecera editable.

## Verification

**Commands:**
- `npx astro check` -- expected: 0 errores.
- `npx vitest run` -- expected: verde; ninguna de las 1514 de la línea base perdida.
- `npx tsx tools/recuperar.ts "https://es.wikisource.org/wiki/Triste_(Nervo)" --corpus <temporal>` -- expected: obra «Triste (Nervo)» y **año 1905**.
- `npx tsx tools/recuperar.ts "https://es.wikisource.org/wiki/En_paz" --corpus <temporal>` -- expected: obra «En paz», sin año, sin error.

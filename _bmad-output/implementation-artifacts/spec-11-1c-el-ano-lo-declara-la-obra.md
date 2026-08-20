---
title: 'Fix 11.1c — cuando la página no declara el año, lo declara su obra'
type: 'bugfix'
created: '2026-08-20'
status: 'ready-for-dev'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/spec-11-1b-el-ano-sale-del-wikitexto.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-11-context.md'
warnings: []
deferred: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** En Wikisource, **la obra declara el año y la página declara el texto, y casi nunca son la misma página**. Barrido de 80 páginas con `|año`: las que traen año son índices —su cuerpo es una tabla de contenidos—, y las que traen texto son subpáginas sin año. El resultado es que una Cita de una obra famosa solo se puede sembrar con Procedencia **parcial**, lo que hunde SM-C1 y hace fallida la sesión por el criterio de la 11.4.

Medido, no supuesto: `Capítulos que se le olvidaron a Cervantes` declara `|año = 1895` y su cuerpo es el índice; su `Capítulo XLIII` trae **8.158 caracteres de texto** y ningún año. Lo mismo con *Libro de Buen Amor* (1330), *Tratado de la Pintura* (1827), *Ariel*, *Motivos de Proteo* y las *Rimas* de Bécquer. Es el patrón, no la excepción.

**Approach:** La subpágina **ya declara a qué obra pertenece**: `|título = [[Capítulos que se le olvidaron a Cervantes]]`, un enlace absoluto a la página de la obra en la misma Fuente. Cuando la página no declara año, se recupera **el encabezado de esa obra** y se guarda literal en la declaración del documento, junto al suyo. El año sale de ahí. Sigue siendo lo que la Fuente declara: la página dice cuál es su obra, y la obra dice su año.

## Boundaries & Constraints

**Always:**
- El año sigue saliendo de **lo que la Fuente declara**, encadenando dos declaraciones suyas. Ninguna bandera, ninguna inferencia.
- La declaración del documento guarda **las dos** literales, la de la página y la de su obra, distinguibles entre sí. `extraer` tiene que re-derivar el mismo año del documento guardado: es la puerta que impide componerlo a mano.
- **La obra la sigue declarando la página**, nunca el encabezado del padre. El padre aporta el año y nada más; si aportara también el título, una subpágina heredaría el nombre del índice y se perdería la distinción que la 11.1b acaba de ganar.
- Solo se pide el padre **cuando la página no declara año**. Una página que ya lo trae no gasta una petición.
- La petición vive en `tools/recuperar.ts` (AD-22) y hereda sus guardas: tiempo máximo, techo de tamaño, revalidación de anfitrión, identificación.
- Si el padre no se puede recuperar, o no declara año, **la recuperación sigue adelante sin año**, como hoy, y lo dice.

**Ask First:**
- Si hiciera falta encadenar más de un salto, o pedirle el dato a un anfitrión que el conjunto cerrado de Fuentes no cubra.

**Never:**
- **No derives el padre de la ruta de la página.** El único padre admisible es el que la página declara como enlace en su `|título`. Una subpágina cuyo `|título` es relativo (`[[../`) o no resuelve **no encadena**: queda sin año. Derivarlo de la URL es exactamente lo que la 11.1 prohíbe.
- No sigas un enlace a otro anfitrión, ni a otra Fuente, ni fuera del espacio principal.
- No encadenes en cadena: un solo salto, de la página a su obra. Si el padre tampoco declara año, se acabó.
- No toques Gutenberg: su `.txt` es la obra entera y ya declara su año.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Encadena | `Capítulos que se le olvidaron a Cervantes/Capítulo XLIII`, cuya obra declara 1895 | Documento con obra «Capítulos que se le olvidaron a Cervantes» **y año 1895**; `extraer` deriva lo mismo | Sin error |
| Ya trae año | «Triste (Nervo)», que declara `\|año = 1905` | Igual que hoy, y **no se pide el padre** | Sin error |
| Padre sin año | La obra declarada tampoco lo trae | Obra sin año, sin error, y se dice | Código 0 |
| Título relativo | «Ariel/Capítulo III», con `\|título = [[../` | **No encadena**: obra del `<h1>` y sin año | Sin error |
| Padre inalcanzable | La petición del padre falla o expira | Obra sin año, y se dice | Código 0 |
| Enlace a otro anfitrión | `\|título = [[:en:Something]]` o una URL externa | No encadena | Sin error |
| El padre no manda sobre la obra | La obra del padre difiere del `\|título` de la página | La obra es la que declara **la página** | Sin error |
| Coherencia | Cualquier documento encadenado | El año que deriva `recuperar` es el que deriva `extraer` | Sin error |

</frozen-after-approval>

## Code Map

- `tools/lib/documento.ts` -- `LectorDeFuente` con su cuarto argumento de encabezado, `lineasDeEncabezadoDeWikitexto`, `tituloDeclarado`, `añoDeclarado`, `segmentosDePlantilla`, `derivarDeLaDeclaracion` y `nombreDeDocumento`. La declaración es el contrato: lo que se guarda entre los dos `---` es de donde salen obra, página y año, al recuperar y otra vez al extraer.
- `tools/recuperar.ts` -- la segunda petición con `?action=raw` que introdujo la 11.1b, con `descargar()` ya parametrizado por tipos admitidos. La tercera es la misma llamada sobre otra página.
- `tools/extraer.ts` -- no debería hacer falta tocarlo: re-deriva con los mismos lectores puros.
- `tests/unit/documento.test.ts`, `tests/unit/recuperar-cli.test.ts`, `tests/unit/extraer-cli.test.ts` -- los moldes, con su doble de red.

## Tasks & Acceptance

**Execution:**
- [ ] `tools/lib/documento.ts` -- que la declaración admita el encabezado de la obra además del de la página, delimitados de forma que `obra()` lea **solo** el de la página y `año()` pueda caer al de la obra. Y el ayudante que dice, dado un encabezado, **qué página hay que pedir**: el destino del enlace de `|título`, solo si es absoluto, del espacio principal y de la misma Fuente.
- [ ] `tools/recuperar.ts` -- la petición del padre, solo cuando falta el año, con las guardas de las otras dos y degradando sin ruido.
- [ ] `tests/unit/documento.test.ts` -- la matriz sobre lo puro, incluida la coherencia recuperar/extraer y que el padre **no** puede cambiar la obra.
- [ ] `tests/unit/recuperar-cli.test.ts` -- por la orden, con doble de red: encadena, no encadena por relativo, padre sin año, padre caído, y **que una página con año no pide el padre** (contando peticiones).

**Acceptance Criteria:**
- Given una subpágina con texto cuya obra declara el año, when la recupero, then el documento queda con obra y año, y la candidata extraída sale con Procedencia completa.
- Given una página que ya declara su año, when la recupero, then no se pide ninguna página más.
- Given una página cuyo `|título` es relativo o no resuelve, when la recupero, then no se encadena y queda sin año, sin error.
- Given un documento encadenado, when lo extraigo, then el año que deriva `extraer` es el mismo que dijo `recuperar`.

## Design Notes

**Por qué esto no es inferir.** La página declara «pertenezco a esta obra» con un enlace que la propia Fuente resuelve, y la obra declara «soy de 1895». Las dos frases son suyas; encadenarlas no añade ninguna nuestra. Lo que sí sería inferir —y por eso está prohibido— es sacar el padre de la ruta `Obra/Capítulo`: ahí el que decide que existe un padre somos nosotros.

**Por qué las dos declaraciones se guardan.** Porque `extraer` vuelve a derivar del documento y tiene que llegar al mismo año sin red. Guardar solo `año: 1895` en la cabecera convertiría la puerta de la 11.1 en un campo editable.

**Lo que esto desbloquea, y por qué importa ahora.** El objetivo del Corpus pasó a ser tráfico, y el tráfico de un sitio de citas lo traen los autores conocidos. Sus obras están en Wikisource **paginadas**: Montalvo, el Arcipreste de Hita, Leonardo, Rodó, Bécquer, Hugo. Sin encadenar, ninguna se puede sembrar sin degradar SM-C1; con esto, todas.

## Verification

**Commands:**
- `npx astro check` -- expected: 0 errores.
- `npx vitest run` -- expected: verde; ninguna de las 1589 de la línea base perdida.
- `npx tsx tools/recuperar.ts "https://es.wikisource.org/wiki/Capítulos_que_se_le_olvidaron_a_Cervantes/Capítulo_XLIII" --corpus <temporal>` -- expected: obra «Capítulos que se le olvidaron a Cervantes» y **año 1895**.
- `npx tsx tools/recuperar.ts "https://es.wikisource.org/wiki/Triste_(Nervo)" --corpus <temporal>` -- expected: año 1905, sin pedir ninguna página más.

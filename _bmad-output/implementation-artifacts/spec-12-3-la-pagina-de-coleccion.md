---
title: 'Story 12.3 — La Página de Colección, sin canibalizar a la Cita'
type: 'feature'
created: '2026-08-19'
status: 'done'
baseline_revision: '04dc6e2a3cce9fbfd1f492c7ac17fb3c86a1b6e3'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-12-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-12-2-la-coleccion-declara-sus-miembros.md'
warnings: []
deferred:
  - summary: >-
      La mitad de UX-DR33 que necesita navegador —«sin desplazamiento horizontal a 360 px»—
      sigue en una prueba de Playwright que hoy se salta y que el CI no ejecuta.
    evidence: |-
      La mitad medible sobre el HTML emitido (que la página use el contenedor compartido y
      no declare anchura propia) sí pasó al plano unitario. La otra mitad exige medir el
      desplazamiento real, y en producción no hay ninguna Colección que visitar. Se
      ejercitó en una copia aislada del repositorio con una Colección sembrada —418 e2e en
      verde, axe incluido— pero eso no es una garantía que corra sola.
    location: >-
      tests/e2e/coleccion.spec.ts
    severity: medium
  - summary: >-
      La Página de Colección no existe en producción y no existirá hasta que se cure la
      primera Colección con la herramienta de la 12.4.
    evidence: |-
      `corpus/colecciones/` está vacío a propósito: curar es de Héctor. Diez de las doce
      pruebas de extremo a extremo de esta historia se saltan solas por eso, y la superficie
      se verifica con fixtures. No es un caso borde: es el estado de producción, y la
      portada se comporta bien en él —no menciona Colecciones en absoluto—.
    severity: low
  - summary: >-
      El texto íntegro de una Cita aparecerá en su Página de Colección, igual que ya aparece
      hoy en su Página de Tema y en la de Autor.
    evidence: |-
      La tarjeta compartida solo recorta por encima de 120 caracteres y la Cita más larga
      del Corpus mide 101, así que en producción no recorta nunca. La garantía de NFR-13 es
      la **canónica** —que sí se cumple y sí está probada sobre un build real—, no el
      recorte. Queda escrito para que nadie lea el recorte como el mecanismo.
    location: >-
      src/components/TarjetaDeCita.astro
    severity: low
---

<intent-contract>

## Intent

**Problem:** Lucía busca «frases cortas para reflexionar» y hoy tiene que rebuscar por Tema y por Autor hasta dar con ellas. La 12.2 dejó el modelo y la resolución; falta la superficie donde eso se ve.

**Approach:** Una Página de Colección en `/coleccion/{slug}` que **agrega y enlaza, pero no reproduce**: presenta sus Citas con el mismo componente de tarjeta que los listados de Autor y de Tema, y la canónica de cada Cita sigue siendo su propia página. Es la primera superficie pública nueva desde el Kit, así que estrena el dueño único de publicabilidad que construyó la 12.1.

## Boundaries & Constraints

**Always:**
- La presentación usa **`src/components/TarjetaDeCita.astro`**, el mismo componente que los listados de Autor y de Tema. No se compone una propia (AD-19).
- La canónica de cada Cita sigue siendo **su Página de Cita**, esté en cuantas Colecciones esté. Una Cita en varias Colecciones no genera contenido duplicado indexable (NFR-13).
- La Colección se declara en `src/lib/superficies.ts`, el dueño único de la 12.1, y de ahí derivan sitemap, `noindex`, índice interno y barrido. **Sin añadirla a ninguna lista aparte** (AD-17, UX-DR33).
- Una Colección por debajo de su umbral **no genera ruta**, exactamente como un Tema: el umbral se aplica en un solo sitio y la página no lo comprueba.
- URL legible, en español y sin identificadores opacos.
- Alcanzable por enlaces internos desde la portada, en un número acotado de saltos.
- El nombre de la Colección en Source Serif, como los de Autor y Tema; el resto en Inter (UX-DR31).
- El texto editorial describe el **criterio** y no adjetiva ni comenta ninguna Cita (UX-DR32).
- WCAG 2.1 AA y plenamente utilizable a 360 px (UX-DR33).

**Block If:**
- Cumplir un criterio exigiera componer una presentación de tarjeta propia, o que la página comprobara el umbral por su cuenta.

**Never:**
- **No enlazar de vuelta** desde la Página de Cita a sus Colecciones. UX-DR34 se recortó en validación a propósito: FR-28 dice que la Colección enlaza a las Citas, no al revés, y AD-18 invierte la dirección del Tema adrede. Un enlace inverso sería una superficie de diseño nueva y queda para una pasada de `bmad-ux`.
- No introducir migas de pan ni una jerarquía que el sitio no tiene: la Colección es navegación **lateral** (UX-DR34).
- No construir la herramienta de curación: es la 12.4.
- No sembrar Colecciones reales en `corpus/colecciones/`. Curar es de Héctor; las pruebas usan fixtures.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Colección publicada | Recuento resuelto sobre el umbral | `/coleccion/{slug}` presenta sus Citas con el componente compartido | Sin error |
| Cita en varias Colecciones | La misma Cita en tres | Su canónica sigue siendo su Página de Cita; sin duplicado indexable | Sin error |
| Colección bajo umbral | Recuento resuelto por debajo | La ruta **no se genera** y su URL da 404 | Sin error |
| Miembro retirado a revisión | Una Cita miembro sale del conjunto publicable | Desaparece de la página sin dejar hueco ni enlace roto | Sin error |
| Descubrimiento | Se parte de la portada | La Colección es alcanzable por enlaces internos en saltos acotados | Sin error |
| Barrido automatizado | La familia se declara publicable | Entra en el barrido de accesibilidad y móvil **sin tocar ninguna lista** | Sin error |
| Sin Colecciones publicadas | `corpus/colecciones/` vacío, como hoy | El sitio construye igual y no aparece sección vacía en la portada | Sin error |
| Nombre y criterio | Se compone la página | El nombre en Source Serif; el criterio descrito sin adjetivar Citas | Sin error |

</intent-contract>

## Code Map

- `src/pages/tema/[slug]/[...page].astro` -- **el patrón más cercano**. Su docstring dice lo que la Colección debe imitar: «aquí no hay ninguna comprobación de umbral: `temasPublicados` no devuelve el Tema, la ruta no se genera». Como el Tema agrupa a varios Autores, cada tarjeta lleva el nombre del Autor; la Colección también.
- `src/components/TarjetaDeCita.astro` -- `Props { cita: Cita; autor?: Autor }`. El `autor` se omite en la Página de Autor y **se pasa** en la de Tema. AD-19 obliga a reutilizarlo tal cual.
- `src/lib/publicado.ts` -- de la 12.2: `coleccionesPublicadas` y el conjunto publicable, que ahora **solo reparte Colecciones ya resueltas y filtradas**. La página no puede saltarse el umbral aunque quisiera; consúmelo y no lo compruebes.
- `src/lib/superficies.ts` -- de la 12.1, el dueño único. **Aquí se declara la familia de Colección**, y de esa única declaración salen sitemap, `noindex`, índice interno y barrido. Fíjate en cómo declaran su `reconoce` las familias de Autor y Tema, y en que `noPublicableEn` va anclado a la forma completa de una ruta paginada.
- `src/pages/index.astro` -- la portada, con `<h2>Temas</h2>` en chips y `<h2>Autores</h2>` en lista. Aquí entra el descubrimiento, y aquí hay que resolver qué pasa cuando no hay ninguna Colección publicada, que es el estado de hoy.
- `src/components/Paginacion.astro` -- lo usa el Tema. Decide si una Colección puede pasar de `CITAS_POR_PAGINA` y déjalo escrito.
- `tests/e2e/accesibilidad.spec.ts` -- deriva sus superficies de la declaración; la Colección debe entrar sola.
- `tests/unit/publicable-y-alcanzable.test.ts` -- de la 12.1: comprueba sobre un proyecto construido que lo publicable es alcanzable y que el sitemap coincide con lo anunciable. La Colección entra en ese lazo.
- `tests/unit/ayuda/construir.ts` -- el andamio; ya sabe sembrar Colecciones y documentos de Fuente.

## Tasks & Acceptance

**Execution:**
- `src/lib/superficies.ts` -- declarar la familia de Colección con su carácter de producto -- es el estreno del dueño único de la 12.1, y de esa declaración derivan las cuatro consecuencias sin tocar nada más.
- `src/pages/coleccion/[slug].astro` (nuevo) -- la página: nombre, criterio editorial y las Citas con `TarjetaDeCita`, pasando el Autor como hace el Tema. Sin comprobar el umbral: consume `coleccionesPublicadas` y las rutas que no existen dan 404 solas.
- `src/pages/index.astro` -- descubrimiento de Colecciones publicadas desde la portada, y **nada** cuando no hay ninguna, que es el estado de hoy.
- Estilos de la página -- nombre en Source Serif como Autor y Tema, resto en Inter, con los tokens de `DESIGN.md`. Sin literales de color ni de tipografía.
- `tests/unit/coleccion-pagina.test.ts` (nuevo) -- sobre un proyecto construido: la página presenta las Citas con el componente compartido; la canónica de una Cita en varias Colecciones sigue siendo su página; una Colección bajo umbral no genera ruta; retirar un miembro no deja hueco ni enlace roto; y sin Colecciones el sitio construye sin sección vacía.
- `tests/unit/publicable-y-alcanzable.test.ts` -- que la Colección entre en el lazo de alcanzable y en el del sitemap, con un fixture que publique una.
- `tests/e2e/coleccion.spec.ts` (nuevo) -- lo que solo se ve mirando: jerarquía visual, la serif solo en el nombre, y utilizable a 360 px. El barrido de accesibilidad debe recogerla **sin** que se la añada a ninguna lista; compruébalo.

**Acceptance Criteria:**
- Given una Colección publicada, when la visito en `/coleccion/{slug}`, then presenta sus Citas con `src/components/TarjetaDeCita.astro` y no compone una presentación propia.
- Given una Cita presente en varias Colecciones, when un rastreador recorre el sitio, then la canónica de esa Cita sigue siendo su Página de Cita y no se genera contenido duplicado indexable.
- Given una Colección publicada, when parto de la portada, then es alcanzable por enlaces internos en un número acotado de saltos, y su URL es legible, en español y sin identificadores opacos.
- Given el nombre de la Colección, when se compone la página, then va en Source Serif, como los nombres de Autor y de Tema, y el resto de la página en Inter.
- Given el texto editorial de la Colección, when lo leo, then describe su criterio y no adjetiva ni comenta ninguna Cita.
- Given la Página de Colección, when corre el barrido automatizado, then cumple WCAG 2.1 AA y es plenamente utilizable a 360 px, sin haberse añadido a ninguna lista aparte.
- Given una Colección por debajo de su umbral, when pido su URL, then da 404 porque su ruta no se ha generado.

## Spec Change Log

## Review Triage Log

## Design Notes

**El hueco de UX declarado, y con qué se sustituye.** UX-DR37 dice que `DESIGN.md` y `EXPERIENCE.md` están al 10/08 y **no describen la Página de Colección**. Esta historia se escribe con AD-19 como criterio en lugar de con una espina de UX que la cubra: la presentación es la del componente compartido, y punto. Una pasada de `bmad-ux` acotada puede refinarla después sin invalidar nada, siempre que respete UX-DR30.

**Por qué no hay enlace de vuelta.** UX-DR34 lo pedía en su redacción original y **se recortó en la validación final**: FR-28 dice que la Colección enlaza a las Citas y no al revés, y AD-18 invierte a propósito la dirección del Tema. Añadirlo sería inventar una superficie de diseño que nadie ha diseñado. Queda anotado para que nadie lo reintroduzca creyendo que falta.

**El sitio real no tendrá ninguna Colección.** `corpus/colecciones/` está vacío a propósito: curar es de Héctor. Así que esta historia se verifica con fixtures y el despliegue de la épica no mostrará ninguna Página de Colección hasta que él cree la primera con la herramienta de la 12.4. El caso «sin Colecciones publicadas» no es un borde: es el estado de producción, y la portada tiene que comportarse bien en él.

## Verification

**Commands:**
- `npx astro check` -- expected: 0 errores.
- `npx vitest run` -- expected: todo en verde; ninguna de las 1049 de la línea base perdida.
- `npm run build` -- expected: construye, con la puerta de la 11.2 intacta y sin sección de Colecciones en la portada.
- `npx playwright test` -- expected: 394 en verde más lo nuevo; el barrido recoge la Colección sola.

### 2026-08-19 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 12: (high 4, medium 4, low 4)
- defer: 3: (medium 1, low 2)
- reject: 8: (low 8)
- addressed_findings:
  - `[high]` `[patch]` Una bomba de relojería: `busqueda.spec.ts` afirmaba el conjunto **exacto** de tipos de resultado, así que habría fallado el día que se curase la primera Colección, por un motivo ajeno a lo que se estuviera haciendo. Demostrado con una Colección sembrada: la aserción antigua falla con `+ "coleccion"`. Ahora afirma contención más «ningún tipo desconocido», e importa la tabla en vez de llevar una segunda copia.
  - `[high]` `[patch]` La etiqueta «Colección» de la búsqueda no la comprobaba nada: borrarla etiquetaba cada Colección como «Cita» con todo en verde. Ahora la tabla tiene dueño y el tipo se **deriva** de ella, así que borrar una entrada da 2 errores de tipos. Verificado por mutación.
  - `[high]` `[patch]` La línea nueva de `rutasPublicadas` no la ejercitaba nadie y su docstring justificaba una premisa falsa: desde la 12.1 ni el sitemap ni la comprobación de enlaces la consumen. Corregido el docstring y añadidas tres pruebas que la ejercitan componiendo la entrada por el único camino que produce una Colección publicable.
  - `[high]` `[patch]` UX-DR31 no lo verificaba nada que se ejecute: la serif del nombre vivía en una prueba que siempre se salta y que el CI no corre. Pasó al plano unitario comparando el bloque de estilo del `h1` de Colección **byte a byte** contra el del `h1` de Tema. UX-DR33 se partió con honestidad: la mitad medible sobre el HTML al plano unitario, la que necesita navegador queda dicha como tal.
  - `[medium]` `[patch]` Se corrigió una **afirmación**, no el código: la prueba de «no genera duplicado indexable» usaba textos largos a propósito y no podía fallar, y las 38 Citas reales miden 120 o menos, así que la tarjeta nunca recorta en producción. La garantía es la canónica; el docstring ya no promete más de lo que el mecanismo da.
  - `[medium]` `[patch]` La prueba del barrido era frágil al orden y habría fallado el día que existiera una Colección alfabéticamente anterior al fixture.
  - `[medium]` `[patch]` Los dos `beforeAll` afirmaban antes de registrar el proyecto temporal, así que justo las ejecuciones que fallan dejaban basura; y había dos mecanismos de limpieza compitiendo.
  - `[medium]` `[patch]` El `criterio` era texto libre sin límite y va tal cual a la descripción de la página. El límite entra en la puerta de admisión, donde el editor puede arreglarlo, y no en la página, porque NFR-12 prohíbe recortarlo.
  - `[low]` `[patch]` El cast `as ColeccionPublicada` reintroducía la marca que la 12.2 construyó como puerta; sustituido por anotación derivada de `getStaticPaths`, y la mutación demuestra que el `as` compilaba en silencio. Comentario rancio; aserción negativa con el dominio escrito a mano; ausencia comprobada por subcadena en todo el documento; y la salida de «sin resultados» que no tenía Colecciones.

## Auto Run Result

Status: done

**Cambio implementado.** `/coleccion/{slug}` presenta las Citas de una Colección con el mismo componente de tarjeta que los listados de Autor y de Tema, con el nombre en Source Serif y el criterio editorial al pie. Agrega y enlaza pero no reproduce: la canónica de cada Cita sigue siendo su propia página. Paginada, porque el umbral es un suelo y no un techo.

**El estreno del dueño único.** Declarar la familia en `src/lib/superficies.ts` fue **una sola línea**, y de ella salieron el sitemap, el `noindex`, el índice interno y el barrido de accesibilidad, sin tocar ninguna lista. Verificado por mutación: retirar las rutas de Colección de la derivación hace que el barrido pierda la familia.

**Verificación.** `npx astro check` 0 errores sobre 143 ficheros. `npx vitest run` **1107/1107** en 42, frente a 1049/41 de la línea base. `npm run build` construye con la puerta de la 11.2 intacta, cero rutas de Colección y la portada en silencio. `npx playwright test` 398 pasan. Y en una copia aislada con una Colección sembrada, la suite completa de extremo a extremo: **418 pasan**, axe WCAG 2.1 AA incluido sobre la Página de Colección, que el barrido recogió solo desde la declaración.

**La aserción que hace cumplir AD-19.** El `<li>` que emite la Colección se compara **byte a byte** contra el que emite la Página de Tema para la misma Cita. Astro estampa un identificador por componente, así que una tarjeta copiada a mano no puede hacerse pasar por la compartida.

**Recomendación de nueva revisión: true.** Cuatro hallazgos de severidad alta.

**Riesgos residuales.** Los tres diferidos están en el frontmatter; el que más pesa es que la mitad de UX-DR33 que necesita navegador no corre sola mientras no exista una Colección real.

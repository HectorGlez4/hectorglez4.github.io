---
title: 'Story 12.3 — La Página de Colección, sin canibalizar a la Cita'
type: 'feature'
created: '2026-08-19'
status: 'ready-for-dev'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-12-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-12-2-la-coleccion-declara-sus-miembros.md'
warnings: []
deferred: []
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

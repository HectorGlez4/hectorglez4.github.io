---
title: '22.8 — Lo que cambia en una obra se anuncia, y la familia se mide aparte'
type: 'feature'
created: '2026-10-10'
status: 'ready-for-dev'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-22-context.md'
  - '{project-root}/AGENTS.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** La Obra existe y se indexa desde la 22.4, pero el aviso a los buscadores (`tools/avisar.ts`) no conoce sus rutas, la relación superficie→ficheros vive en dos sitios que no se vigilan entre sí (`rutasAfectadas` y `ficherosPorSuperficie`), la serie de indexación no mide la familia Obra, y el freno de SM-11 —congelar la familia— no tiene dato ni dueño: cada lector lo aplicaría a su modo.

**Approach:** Una relación con un solo dueño y dos lecturas fijadas inversas por prueba, que incluye la Página de Obra; el aviso anuncia las Obras cuyo estado anunciable cambió comparando la lista indexable de antes con la del sitemap; la serie mide la familia Obra con censo del sitemap y lee Autor y Obra enteras mientras rija SM-11; y la congelación es una declaración versionada en `src/lib/umbrales.ts`, compuesta por `npm run obra -- congelar|levantar`, que la regla de indexabilidad consume como dato y el rastreo consulta.

## Boundaries & Constraints

**Always:**
- AD-27: una relación «superficie → ficheros que renderiza» con un solo dueño; «rutas a avisar» es su lectura inversa. Una prueba sobre un corpus de ejemplo fija que, para todo fichero F y ruta R publicada, F ∈ ficheros(R) ⇔ R ∈ rutasAvisadas(cambio de F), con las excepciones nombradas en la prueba (`/` se avisa siempre). La Página de Obra = su ficha + sus Citas + el fichero de su Autor; su `lastmod` sale solo de ahí, y las fichas (`corpus/obras/`) se fechan con git como los demás ficheros.
- Aviso de Obras (FR-38): la Obra cuyas Citas o ficha o Autor cambian se avisa por la relación, y solo si es indexable después; las Obras hermanas del mismo Autor se anuncian **solo** si cambia su indexabilidad, detectado comparando la lista indexable de antes con la de después —nunca mapeando una Cita a todas las Obras de su Autor—. Se anuncia toda ruta de Obra cuyo estado anunciable cambió en cualquier sentido, incluida la que desaparece (absorbida, retirada, sin Citas, pasa a `noindex`). La lista de **después** sale del sitemap construido y desplegado (`{SITIO}/sitemap-0.xml`, el trabajo `avisar` corre tras desplegar y sin `dist/`; con `--sitemap <fichero>` se lee un fichero local); la de **antes**, de `obrasDelCorpusEnDisco` sobre el Corpus de `--desde` (copia temporal fuera del árbol, AD-21), que es la misma función de la construcción y no una reimplementación de la regla. Si una de las dos no se puede leer, no se avisa ninguna hermana por indexabilidad y se dice por qué; el resto del aviso sigue.
- Serie de indexación (FR-40, AD-24): familia `obra` con censo = rutas `/obra/…` del sitemap publicado, nunca una página `noindex`; sin sitemap legible la familia va a `sinLeer` con su motivo, jamás cero. Mientras `SM11_VIGENTE` (constante en `umbrales.ts`, hoy `true`) Autor y Obra se leen **enteras** y el muestreo reparte el resto del presupuesto entre las demás. Cada familia de la entrada anota su conjunto medido (`censo: publicadas | sitemap`); las entradas viejas sin el campo se siguen leyendo. El informe da la línea SM-11: proporción indexada de Obra frente a la de Autor de la misma lectura y, desde el 2026-12-05 (8 semanas tras el primer despliegue de la 22.4, el 2026-10-10), «toca juzgar SM-11: lo decide Héctor».
- Congelación (AD-25, AD-21): `CONGELACION_DE_OBRAS` en `src/lib/umbrales.ts`, junto a los números de FR-52: `undefined` o `{ desde: 'AAAA-MM-DD', indexables: readonly string[] }` con los **nombres de ficha** indexables al congelar. Vigente: indexable ⇔ cumple la regla **y** está en la lista (ninguna entra; las que dejan de cumplirla salen). Entra en `obrasIndexables`/`obrasDelConjunto` de `src/lib/publicado.ts` como dato, en las dos instancias (páginas e `integraciones/indexables.ts`), nunca leyendo la serie. `npm run obra -- congelar` reescribe solo ese bloque desde la lista indexable vigente; `levantar` lo devuelve a `undefined`; ninguna hace commit. `npm run rastreo -- --registrar` rechaza con código 1 toda URL de Obra mientras esté vigente, consultando la misma declaración por una función exportada (`congelacionVigente()` o equivalente) que queda para la 22.9 y las Piezas.
- Códigos de las órdenes: 2 la forma de la invocación, 1 lo que dice. Sin congelación declarada, `dist/` no cambia por esta historia salvo `lastmod` de Obras y Citas que la relación corrija.

**Block If:** Nada exige a Héctor: esta historia construye el freno y no congela; el repositorio queda con `CONGELACION_DE_OBRAS = undefined`.

**Never:** No congelar ni registrar lecturas reales. No enviar avisos en pruebas (`--ensayo` o funciones puras). No leer `corpus/serie-de-indexacion.yml` desde `src/`. No contar páginas `noindex` ni escribir cero por una familia sin leer. No mapear cada Cita a todas las Obras de su Autor. No tocar la regla de FR-52 (umbrales 2 y 0,9).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Cita nueva en Obra indexable | Cita añadida a «Cartas» (indexable antes y después) | se avisan la Cita, su Autor, sus Temas y la ruta de «Cartas»; ninguna hermana | — |
| Hermana cambia de estado | la Cita nueva baja «Brevedad» del 93 % al 89 % | se avisa además «Brevedad» (pasa a indexable) | — |
| Obra desaparece | su única Cita se retira | se avisa su ruta (desaparece) | — |
| Obra noindex tocada | Cita de una Obra no indexable antes y después | su ruta no se avisa | — |
| Sitemap ilegible | `fetch` falla | sin avisos de hermanas por indexabilidad; aviso de lo demás; mensaje con el motivo | sale 0 |
| Congelada, Obra nueva cumple | nombre fuera de la lista | no indexable (`noindex`, fuera del sitemap) | — |
| Congelada, Obra listada deja de cumplir | nombre en la lista, 1 Cita | no indexable | — |
| Congelada, rastreo | `--registrar /obra/x/y/` | rechazo, código 1, nombra la congelación | — |
| `congelar` dos veces / `levantar` sin congelación | — | rechazo, código 1, nada escrito | — |
| Familia Obra sin sitemap | `indexacion` sin red al sitemap | `obra` en `sinLeer`, ningún cero | — |

</intent-contract>

## Code Map

- `tools/lib/avisar.ts` -- `FamiliaAvisable` (L15), `DIRECTORIOS_AVISABLES` (L24, sin `corpus/obras`), `familiaDeFichero` (L32), `rutasAfectadas` (L72-118): la lectura «ficheros → rutas»; hoy sin Obra.
- `tools/avisar.ts` -- `rutasTocadas` (L88-167: `git diff --name-only`, slug de antes con `git show`), `rutasDelSitemapConstruido` (L205), `principal` (L230). CI: `.github/workflows/publicar.yml:170-193` (trabajo `avisar`, `fetch-depth: 0`, tras `desplegar`, sin `dist/`).
- `tools/lib/cambios.ts` -- `ficherosPorSuperficie(corpus)` (L159-235): la lectura «ruta → ficheros»; ya declara la Obra (L215-224). Asimetría conocida: Tema→Cita se avisa pero la Cita no lista el fichero del Tema. Candidato a dueño único.
- `integraciones/historial.ts` -- `fechasDeLasSuperficies` (L311); **L327 `ambitos` sin `rutas.obras`**: las fichas no se fechan con git (fallo a corregir), y `ficherosDelCorpus` (L286) sí las cuenta en la cobertura.
- `src/lib/publicado.ts` -- `obrasDelConjunto` (L478), `obrasDeLosDatos` (L495), `obrasIndexables` (L508, único llamante de `esObraIndexable`), `rutasIndexables` (L524). `src/lib/obras.ts` -- `esObraIndexable` (L130), `nombre` de ficha como identidad de URL.
- `src/lib/umbrales.ts` -- `MIN_CITAS_OBRA_INDEXABLE` (L46), `MAX_PROPORCION_OBRA_DEL_AUTOR` (L59): aquí van `CONGELACION_DE_OBRAS` y `SM11_VIGENTE`.
- `integraciones/indexables.ts` -- `obrasDelCorpusEnDisco(raiz)` (L55), declaración en `astro:build:start` (L74-78).
- `tools/lib/indexacion.ts` -- `Familia`/`FAMILIAS` (L53-56), `CensoPorFamilia` y `censoPorFamilia` (L198-226, comentario L213-217), `planDeInspeccion` (L271), `repartir` (L326), `resumirFamilia` (L461), `componerLectura`, `lineasDeLectura`. `tools/indexacion.ts` -- `leerIndexacion` (L238). `tools/lib/corpus.ts` -- `registrarLecturaDeIndexacion` (L1713), `leerSerieDeIndexacion` (L1683).
- `tools/rastreo.ts` (L143-171) y `tools/lib/rastreo.ts` `componerPeticiones` (L131, rechazo de `noindex` L250-258).
- `tools/obra.ts` -- `USO` (L50), `switch` (L96-172), `exactamente`; modelo `titularFicha` en `tools/lib/obras.ts` (L731) y `terminar` de `tools/lib/cli.ts`.
- Pruebas: `tests/unit/indexnow.test.ts`, `fecha-de-cambio.test.ts`, `fecha-de-cambio-build.test.ts`, `indexacion.test.ts` (exclusión de `/obra/` L145-149), `rastreo.test.ts` (L771-792), `obra-indexable.test.ts`, `obra-cli.test.ts`, `obra-pagina.test.ts`.

## Tasks & Acceptance

**Execution:**
- `tools/lib/cambios.ts` y `tools/lib/avisar.ts` -- un dueño de la relación (con Obra) y su lectura inversa para el aviso; corregir la asimetría Tema→Cita del lado que sea verdad en el marcado.
- `integraciones/historial.ts` -- fechar `corpus/obras/` con git.
- `src/lib/umbrales.ts`, `src/lib/publicado.ts` -- `CONGELACION_DE_OBRAS`, `SM11_VIGENTE`, la congelación como dato de la indexabilidad y la consulta exportada.
- `tools/lib/avisar.ts`, `tools/avisar.ts` -- Obras por relación filtradas por indexables de después; hermanas por diferencia de listas; `--sitemap`.
- `tools/lib/indexacion.ts`, `tools/indexacion.ts`, `tools/lib/corpus.ts` -- familia `obra` del sitemap, Autor y Obra enteras, `censo` por familia, línea SM-11.
- `tools/lib/rastreo.ts`, `tools/rastreo.ts` -- rechazo por congelación.
- `tools/obra.ts`, `tools/lib/obras.ts` -- `congelar` y `levantar`.
- Pruebas -- la de inversas; cada fila de la matriz; congelación en las dos instancias (paridad armazón/integración con congelación declarada en una copia del proyecto); CLI `congelar`/`levantar`; serie con familia Obra y `sinLeer`.
- `AGENTS.md` -- sección corta: congelar/levantar, qué consulta la declaración, y la familia Obra en la serie.

**Acceptance Criteria:**
- Given `npx vitest run` sobre los ficheros de prueba tocados, `npx astro check` y `npm run build`, when corren, then pasan y el build sigue diciendo «180 Obras publicadas, 81 indexables».
- Given `npx tsx tools/avisar.ts --desde HEAD~3 --ensayo --sitemap dist/sitemap-0.xml`, when corre, then compone el aviso sin enviar nada y sale 0.

## Design Notes

**Dónde vive la congelación.** SPEC §abiertas pregunta si es constante de `src/lib/` o fichero de `corpus/`; el criterio de la historia remite a «donde la espina la fija», y la espina (AD-25) dice literalmente «junto a los números de FR-52 en `umbrales.ts`». Se toma esa lectura: una constante es dato versionado, la leen las dos instancias sin colección nueva ni E/S en `src/lib/`, y congelar es un diff de una línea revertible con `git revert`, como encender un Modelo en `ingreso.ts`.

## Verification

**Commands:**
- `npx vitest run tests/unit/indexnow.test.ts tests/unit/fecha-de-cambio.test.ts tests/unit/indexacion.test.ts tests/unit/rastreo.test.ts tests/unit/obra-indexable.test.ts tests/unit/obra-cli.test.ts` (y los nuevos) -- expected: verde.
- `npx astro check` -- expected: 0 errores.
- `npm run build` -- expected: termina; «180 Obras publicadas, 81 indexables».
- `npx tsx tools/avisar.ts --desde HEAD~3 --ensayo --sitemap dist/sitemap-0.xml` -- expected: sale 0, no envía.

---
title: 'Historia 23.9 — Toda Obra cuenta sus vistas, se indexe o no'
type: 'feature'
created: '2026-10-25'
status: 'done'
baseline_revision: 'b51311c2da5367470efb2e8925dca3f62c2079c6'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-23-context.md'
warnings: [oversized]
deferred:
  - summary: 'Marcar en epics.md el criterio de la Historia 22.4 «emite `vista-de-superficie` con su marca de origen, como las demás agregaciones» como «(sustituido en la v8 por la Historia 23.9)»: `vista-de-superficie` sigue siendo «sí y solo si producto», como está construido.'
    evidence: 'Lo pide el criterio «Given la Historia 22.4» de la 23.9 en _bmad-output/planning-artifacts/epics.md (l. 5533-5535); AGENTS.md prohíbe editar a mano _bmad-output/planning-artifacts/.'
    owner: 'pendiente de Héctor (bmad-create-epics-and-stories)'
    severity: low
---

<intent-contract>

## Intent

**Problem:** el vocabulario (23.2) y el receptor desplegado (23.3) ya saben guardar `vista-de-obra` con su marca `indexable`, pero nadie la emite (`PENDIENTES` de la 23.9 en `tests/unit/vocabulario.test.ts`): la página 1 de una Obra que no se indexa (`noindex`) no emite ninguna vista, así que no tiene lectura ni continuación, y la familia Obra no se puede leer entera ni partir por lo que la página declaraba.

**Approach:** `src/lib/superficies.ts` declara que la página 1 de toda Obra emite `vista-de-obra` se indexe o no, con la marca `indexable`/`no-indexable` que sale de la misma lista de rutas indexables que su `noindex`; el armazón la escribe en el `<html>` junto a `data-vistas`; el fichero de medición la emite desde ahí como una vista más (con la marca leída del `<html>`), y la comprobación de `astro:build:done` exige que la marca coincida con el `noindex`.

## Boundaries & Constraints

**Always:**
- **Declaración.** La Página de Obra conserva su `vista` (`vista-de-superficie`, «sí y solo si producto», sin cambios) y declara además, en un campo propio, la vista de su página 1 **se indexe o no**: `vista-de-obra`. `consecuenciasDe(ruta)` da para la página 1 de una Obra `vistas: [vista-de-superficie, vista-de-obra]` y `marcaDeObra: 'indexable'` si es producto, y `vistas: [vista-de-obra]` y `marcaDeObra: 'no-indexable'` si es servicio por contenido (`causaDelServicio === 'contenido'`); para las páginas 2+ (servicio por forma) y toda otra ruta, ni `vista-de-obra` ni marca (la clave se omite). Los dos valores se nombran contra `MARCAS_DE_OBRA` del vocabulario, nunca como cadena suelta. La marca sale de la lista declarada (`declararRutasIndexables` ← `rutasIndexables`), así que sigue a FR-52 y a `CONGELACION_DE_OBRAS` sin recalcularlos, y sin lista rompe como hoy. El campo `vista` no admite `vista-de-obra` (tipo).
- **Marcado.** `Armazon.astro` escribe en el `<html>` `data-vistas` (con dos vistas en la Obra indexable, en ese orden) y, solo cuando hay marca, el atributo de la marca, cuyo nombre (`data-indexable`) es una constante de `src/lib/medicion.ts`. Se queda en `dist/` también sin punto final.
- **Fichero.** `vista-de-obra` entra en `EVENTOS_DE_VISTA` y en `EVENTOS_DEL_GUION`; `indexable` gana su fuente en `FUENTE_EN_EL_GUION`: el valor de ese atributo del `<html>`, leído **una vez al activarse** junto con `data-vistas`, con el nombre compuesto desde la constante y cotejado con `MARCAS_DE_OBRA` por la tabla (ajeno o ausente → `null`; el evento sale igual). La vista de Obra sale de `data-vistas` como las otras —con las Marcas de llegada, antes de la lectura— y hace de la página superficie con lectura. No entra en `EVENTOS_SOLO_DEL_FICHERO` ni en `METRICA_DE_ACCION`. Se mide el fichero con el punto final de producción y se anota en el comentario de `MAX_BYTES_GUION_DE_MEDICION`; si no cabe, se sube a lo medido más unos 400 bytes, con la medida y el porqué (precedente 23.5–23.7).
- **Comprobación del build** (AD-17, en `tools/lib/indexables.ts`, puro, y en `integraciones/indexables.ts`): `marcasDePagina` lee también la marca del `<html>`, y `desajustesDeIndexables` nombra, en la misma lista y con el mismo corte: una página 1 de Obra (declarada, `esRutaDeObra` y no `esServicioPorForma`) sin marca o con una fuera de `MARCAS_DE_OBRA`; una marca `indexable` con `noindex`; una `no-indexable` sin `noindex`; una marca en una página que no es la 1 de una Obra. La línea de registro y el titular nombran también la marca.
- **SM-8.** Sus consultas de `DESPLIEGUE.md` siguen filtrando `evento IN ('vista-de-cita','vista-de-superficie')`: `vista-de-obra` no entra, y la Obra indexable cuenta una vez, por su `vista-de-superficie`, como hoy.

**Block If:**
- Cumplir algo exige cambiar `src/lib/vocabulario.ts` o `medicion/` (movería la huella y pediría otro `desplegar`), tocar `ARRANQUE_DE_MEDICION` o `MAX_BYTES_DE_GUION`, cambiar el carácter, el sitemap, el `noindex` o el índice de Pagefind de alguna ruta, o colocar una zona o exención nueva.

**Never:**
- `vista-de-obra` o la marca en una página 2+ o en otra superficie, o una isla que pida `vista-de-obra` por `__medir` (sale solo de `data-vistas`); calcular la indexabilidad en el cliente, leerla de la dirección o de otra cosa que la lista declarada; escribir en el código de `src/` el nombre del evento o los valores de la marca como cadena suelta: se componen desde el vocabulario.
- Que `vista-de-obra` cuente en SM-8; leer la serie o partir la familia Obra desde `tools/` (es la 23.10).
- Editar `_bmad-output/planning-artifacts/` o `_bmad-output/specs/` (la marca de la 22.4 queda en `deferred`); tocar `sprint-status.yaml`; correr `npm run medicion -- desplegar|comprobar`, `wrangler … --remote`, push o fusión.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Obra indexable, página 1 | `data-vistas="vista-de-superficie vista-de-obra"`, marca `indexable`, sin `noindex` | `vista-de-superficie` {origen, via} y `vista-de-obra` {origen, via, indexable: `indexable`}, en ese orden; después, una sola `lectura` | — |
| Obra no indexable, página 1 | `data-vistas="vista-de-obra"`, marca `no-indexable`, `noindex` | solo `vista-de-obra` {…, indexable: `no-indexable`}; gana su `lectura` (8 s o interacción) y su salida sale detrás de ella | — |
| Página 2+ de una Obra | ni `data-vistas` ni marca | ninguna vista ni lectura; la salida, sin lectura, como hoy | — |
| Congelación vigente | Obra que cumple FR-52 y no está en la lista | `noindex`, marca `no-indexable`, solo `vista-de-obra` | — |
| Llegada `?de=instagram&via=whatsapp` a la indexable | las dos vistas y la lectura | las tres llevan las dos marcas; la dirección las pierde; un solo `vista-de-superficie` con origen (SM-8 como hoy) | — |
| Marca ajena o ausente en el `<html>` (entorno simulado) | `data-vistas="vista-de-obra"` | `vista-de-obra` sale con `indexable: null` | — |
| Marca puesta y vista que no la declara | `data-vistas="vista-de-superficie"` con marca | `vista-de-superficie` sin clave `indexable`; ni la lectura ni las acciones la llevan | — |
| Caché de atrás y adelante / prerender | `pageshow` con `persisted` / `prerendering` | ninguna vista nueva / nada hasta activarse y entonces las dos vistas, una vez | — |
| Build con la marca falsa | copia donde la marca no casa con el `noindex` | el build rompe nombrando la ruta y el desajuste | `astro:build:done` lanza |

</intent-contract>

## Code Map

- `src/lib/superficies.ts:31,46-91,147-166,287-311,485-538` -- `Superficie` (`vista?: EventoDeVista`, `indexablePorContenido`), la declaración de la Página de Obra (`PAGINA_DE_OBRA`, l. 99), `ConsecuenciasDeRuta.vistas`, `causaDelServicio` y `consecuenciasDe` (l. 531: hoy `vistas: caracter === 'producto' && vista ? [vista] : []`). Docblock de cabecera (l. 21-23) lista las consecuencias. `esRutaDeObra` (l. 400) y `esServicioPorForma` (l. 417) son las que necesita la comprobación.
- `src/lib/medicion.ts:45-62` (`EVENTOS_DE_VISTA`, `EventoDeVista`; su docblock ya anuncia la 23.9), `64-87` (`EVENTOS_DEL_GUION`, docblock «`vista-de-obra` llega con la Historia 23.9»), `102-131` (`FUENTE_EN_EL_GUION`, tipo `0|…|5`, docblock «`indexable` … llega con la Historia 23.9»), `229-241` (`ATRIBUTO_DE_ZONA`, precedente de constante de atributo), `392-519` (docblock de `guionDeMedicion`: paso 2 y «lo que viaja»), `547-560` (variables), `567-590` (comentario de nombres cortos), `596` (`m=[D&&o,t,z,y,D&&w,j]`: el índice de cada fuente), `621-627` (`a()`: lee `document.documentElement.dataset.vistas`, `W.indexOf(v)>=0&&e(v)&&(V=1)`).
- `src/lib/vocabulario.ts:44-59,176-178,260-264` -- solo lectura: `EVENTOS.vistaDeObra`, `MARCAS_DE_OBRA`, campos de `vista-de-obra` (`origen`, `via`, `indexable` con `nulo: false`). No se toca (huella).
- `src/components/Armazon.astro:60-85` -- declara la lista indexable, toma `consecuenciasDe(ruta)` y pinta `<html lang="es" data-vistas=…>`.
- `tools/lib/indexables.ts:17-90` -- `PaginaIndexable`, `marcasDePagina`, `desajustesDeIndexables` (filtra las declaradas), `titularDeDesajustes`; `integraciones/indexables.ts:105-130` las usa en `astro:build:done` y escribe «El sitemap, los `noindex` y Pagefind coinciden (N rutas indexables).».
- `src/lib/umbrales.ts:214-263` -- comentario y valor de `MAX_BYTES_GUION_DE_MEDICION = 3730`; hoy el fichero mide **3.487** bytes con `https://medicion-sabiduria-de-bolsillo.sabiduriadebolsillo.workers.dev` (243 libres; la 23.9 añade unos 180: la entrada de la tabla, el conjunto de dos marcas, `"vista-de-obra"` en `W` y la lectura del atributo).
- `tests/unit/ayuda/medicion.ts:144-165,207-214` -- opciones del entorno simulado y `documentElement` (solo `dataset.vistas`): gana la marca del `<html>`, leída como la lea el fichero.
- `tests/unit/medicion.test.ts:162-175` (2.9: `EVENTOS_DEL_GUION.length < EVENTOS_VALIDOS.length` deja de ser cierto), `555` (23.5: `EVENTOS_DE_VISTA` igual a dos), `1720-1737` (`CORPUS_MEDIDO`: «Cartas a Lucilio» indexable, «Sobre la brevedad de la vida» no, y paginada), `1788-1862` (`vistasDe`, `OBRAS`, «la Obra indexable declara la vista de superficie; la que no se indexa y su página 2, ninguna», «el `data-vistas` de cada ruta construida es exactamente el de `superficies.ts`», la guarda de cadena suelta `/vista-de-(cita|superficie)/`), `1904-1925` (sin punto final: quedan arranque y `data-vistas`), `2560-2565` (23.7: el suelo `sinLectura` no nombra `OBRAS[1]`, a propósito, para que la 23.9 lo saque «sin tocarla»), `2812-2830` (tope del fichero con el punto final de verdad).
- `tests/unit/vocabulario.test.ts:237-241` (`PENDIENTES`: solo la 23.9), `274-299` (`Entrada`, `producir`: las vistas salen de `data-vistas` en el entorno simulado), `318-447` (`escenariosDe`: zona, tramo y filtros solo en los eventos que los declaran), `458-478` («diez eventos de hoy»), `516-529` (`it.each` de pendientes: queda sin casos; Vitest 4.1 no falla con una tabla vacía).
- `tests/unit/superficies.test.ts:1011-1062` -- 23.1: tabla de vistas por ruta (la Obra indexable `[vistaDeSuperficie]`, la otra `[]`), «ninguna superficie que no es de producto declara una vista», «toda superficie de producto declara su vista».
- `tests/unit/obra-indexable.test.ts:217-242` (`consecuenciasDe` de `/obra/a/b/` y `/obra/a/c/` con `toEqual` exacto), `251-300` (la comprobación del build, pura, y `marcasDePagina`).
- `tests/unit/obra-pagina.test.ts:187-257` (construcción de la 22.4: CARTAS indexable; IRA, BREVEDAD, ENQUIRIDION, DISERTACIONES no; `/sobre-la-brevedad-de-la-vida/2/`; l. 201 y 812 leen la línea «El sitemap, los `noindex` y Pagefind coinciden»), `577-601` (la copia parcheada que rompe el build: precedente), `791-822` (22.8: copia con la congelación; CARTAS cumple FR-52 y sale).
- `tests/e2e/receptor.spec.ts:145-174` (el sitio: tres Citas de Séneca, todas de «Sobre la brevedad de la vida»: no hay Obra indexable), `414-512` (23.1: `OBRA_NO_INDEXABLE`; «la Obra que no se indexa carga el fichero y no emite ninguna vista» deja de ser cierto), `apuntarBalizas`/`balizasDe`/`esperarEvento`/`esperarAlFichero`, y el registro de `interpretar` con su columna `indexable`. Nada del fichero enlaza ni lee el título de la Obra de `seneca--dos` ni de `seneca--larga`.
- `DESPLIEGUE.md:486-500` (Lectura: «y, hasta la 23.9, la Obra que no se indexa»), `556-560` (Salida: «—hasta que la 23.9 le dé vista—»), `680-692` (comentario de la consulta de SM-4; su `v` usa `GLOB 'vista-*'`, que ya recoge `vista-de-obra`), `743-781` (SM-8: «dos eventos de vista»; las consultas filtran `IN ('vista-de-cita','vista-de-superficie')`).
- `AGENTS.md:37` (convención de la medición: «Qué vista emite una página lo declara su superficie…») y `AGENTS.md:660-661` («La vista de superficie (20.1) sale solo de la página 1 de una Obra **indexable**…»).

## Tasks & Acceptance

**Execution:**
- `src/lib/medicion.ts` -- `vista-de-obra` en `EVENTOS_DE_VISTA` y en `EVENTOS_DEL_GUION`; `ATRIBUTO_DE_INDEXABLE = 'data-indexable'` con su docblock; `indexable: 6` en `FUENTE_EN_EL_GUION` (y su tipo); el fichero lee la marca del `<html>` al activarse y la pone en la fuente 6; docblocks de la lista de vistas, de la del guion, de las fuentes, de `guionDeMedicion` y de sus variables al día -- FR-51, FR-56, AD-6, AD-13.
- `src/lib/superficies.ts` -- el campo de la vista con marca en `Superficie` (p. ej. `vistaConMarca?: typeof EVENTOS.vistaDeObra`), la Página de Obra lo declara, `vista` excluye `vista-de-obra`; `marcaDeObra?: MarcaDeObra` en `ConsecuenciasDeRuta`; `consecuenciasDe` según Always; docblocks (cabecera, campo, consecuencias) -- la declaración única (AD-17).
- `src/components/Armazon.astro` -- el atributo de la marca en el `<html>`, solo con marca, con el nombre de la constante -- el marcado que lee el fichero.
- `tools/lib/indexables.ts` y `integraciones/indexables.ts` -- la marca en `PaginaIndexable` (opcional) y en `marcasDePagina`; las cuatro clases de desajuste de Always en `desajustesDeIndexables`; la línea de registro y el titular nombran la marca; docblocks -- la puerta de `astro:build:done` (AD-17).
- `src/lib/umbrales.ts` -- medir el fichero y anotar la medida de la 23.9 en el comentario de `MAX_BYTES_GUION_DE_MEDICION` (subirlo solo si no cabe, según Always) -- tope visible en el diff.
- `tests/unit/ayuda/medicion.ts` -- opción para la marca del `<html>`; el `documentElement` simulado la ofrece por la vía que use el fichero -- el entorno de la correspondencia y de la matriz.
- `tests/unit/medicion.test.ts` -- `describe('Historia 23.9 — …')` en el entorno simulado: una prueba por fila de la matriz que le toca (indexable, no indexable con su lectura y su salida, marcas de llegada en las dos vistas, marca ajena y ausente, marca puesta con otra vista, caché, prerender); sobre `dist/` de `sitioMedido` y `sitioSinMedir`: la marca de cada página es exactamente `consecuenciasDe(ruta).marcaDeObra`, toda página 1 de Obra la lleva y casa con su `noindex` (`OBRAS[0]` `indexable`, `OBRAS[1]` `no-indexable`, `OBRAS[2]` ninguna); `OBRAS[1]` ya no está en `sinLectura`; y las consultas de SM-8 de `DESPLIEGUE.md` nombran `vista-de-cita` y `vista-de-superficie` y no `vista-de-obra`. Ajustar la 2.9 (el guion emite ya todo el vocabulario), la 23.5 (tres vistas en `EVENTOS_DE_VISTA`), la 20.1/23.1 de la Obra (indexable: las dos; no indexable: `vista-de-obra`; página 2: ninguna), la de sin punto final (queda también la marca) y la guarda de cadena suelta (`obra` entra; ve también lo citado entre comillas invertidas en los comentarios, así que los docblocks de `src/` fuera de `medicion.ts` y `vocabulario.ts` nombran `EVENTOS.vistaDeObra`, no la cadena) -- Vitest, que corre el CI.
- `tests/unit/vocabulario.test.ts` -- fuera la entrada 23.9 de `PENDIENTES` (queda vacía, con su comentario al día); la marca del `<html>` en `Entrada` y en `producir`; escenarios de cada valor de `MARCAS_DE_OBRA`, uno ajeno y ninguno, solo en los eventos que declaran `indexable`, con una prueba que lo exige; «once eventos de hoy» -- correspondencia de la 23.2.
- `tests/unit/superficies.test.ts` -- la tabla de la 23.1 con las vistas y la marca de la Obra (indexable, no indexable, página 2); la vista con marca solo la declara una superficie con `indexablePorContenido`, y ninguna `vista` es `vista-de-obra`; ningún carácter cambia -- la declaración.
- `tests/unit/obra-indexable.test.ts` -- los `toEqual` de `consecuenciasDe` con `vistas` y `marcaDeObra`; `marcasDePagina` lee la marca (presente, ausente, ajena); `desajustesDeIndexables` nombra cada una de las cuatro clases y calla cuando casan -- la comprobación, pura.
- `tests/unit/obra-pagina.test.ts` -- en la construcción de la 22.4, la marca y `data-vistas` de CARTAS (`indexable`, las dos), de las cuatro no indexables (`no-indexable`, solo la de Obra) y de la página 2 (ninguna); en la de la congelación, CARTAS `no-indexable` y solo `vista-de-obra`; en «lo que rompe el build», una copia con `Armazon.astro` parcheado para que la marca diga siempre `indexable`: el build rompe y nombra la Obra no indexable; las dos lecturas de la línea de registro, al día -- lo construido y la puerta.
- `tests/e2e/receptor.spec.ts` -- `seneca--dos` y `seneca--larga` pasan a «Cartas a Lucilio» (`procedencia: { obra: 'Cartas a Lucilio', año: 64 }`, `fuente` de Wikisource de esa obra): «Sobre la brevedad de la vida» queda con una Cita (no indexable) y «Cartas a Lucilio» con dos de tres (indexable). La Obra sale de la lista «carga el fichero y no emite ninguna vista» de la 23.1, y un `describe('Historia 23.9 — …')`: la indexable con `?de=instagram` da `vista-de-superficie` y `vista-de-obra` (`indexable`), en ese orden, las dos con el origen, la dirección sin la marca y una sola `vista-de-superficie` en el receptor; la no indexable da solo `vista-de-obra` (`no-indexable`), un `pointerdown` su `lectura` detrás, y un clic en el Autor de la Cabecera la `salida-interna` (`atribucion`) detrás de ella -- Playwright local.
- `DESPLIEGUE.md` -- §3: párrafo de la vista de Obra (la página 1 de toda Obra, la marca de su `noindex`, la lectura y las salidas que gana, la indexable con dos vistas, páginas 2+ sin vista), fuera las menciones «hasta la 23.9» de la Lectura, la Salida y el comentario de SM-4, y una consulta de vistas, lecturas y salidas de Obra por marca y jornada UTC desde la primera completa y sin la de hoy, con la marca de las vistas de Obra de esa ruta y jornada y «cambio» si llegan las dos (AD-13); SM-8: tres eventos de vista, la Obra indexable cuenta por su `vista-de-superficie` y `vista-de-obra` no entra.
- `AGENTS.md` -- la convención de la medición (la página 1 de toda Obra declara además `vista-de-obra`, con la marca del `<html>` que sale de la lista indexable y comprueba `astro:build:done`) y el párrafo de la Página de Obra al día.

**Acceptance Criteria:**
- Given la rama terminada, when corren `npx astro check` y por fichero `medicion`, `vocabulario`, `superficies`, `obra-indexable`, `obra-pagina`, `congelacion-de-obras`, `huella`, `receptor`, `espinas-de-ux`, `ingreso-construido`, `publicable-y-alcanzable` y `medicion-orden`, then 0 errores y todo en verde, con `git diff b51311c2da5367470efb2e8925dca3f62c2079c6..HEAD -- src/lib/vocabulario.ts medicion/` vacío y sin cambios en `caracter`, `reconoce`, `noPublicableEn` ni `indexablePorContenido` de ninguna superficie.
- Given `npm test` en segundo plano, when termina, then todo en verde.
- Given `npx playwright test tests/e2e/receptor.spec.ts --project=escritorio`, when corre, then pasa; y `receptor-local`, `origen`, `busqueda` y `pagina-404` siguen en verde con el `webServer`.
- Given el sitio construido, when se generan el sitemap, el `noindex` y el índice de Pagefind, then son los de antes: la comprobación de `astro:build:done` pasa en todas las construcciones de las pruebas, y ninguna expectativa de la 22.4 sobre esos tres conjuntos cambia (solo el texto de la línea de registro, que nombra la marca).
- Given el fichero con el punto final de producción, when se mide, then cabe en `MAX_BYTES_GUION_DE_MEDICION`, y el comentario de ese tope dice la medida.

## Spec Change Log

## Review Triage Log

### 2026-10-25 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

Las cinco capas de revisión son externas en este bucle (v8-ralph) y la invocación no traía ninguna sección «Hallazgos externos»: esta pasada no tiene hallazgos que clasificar. La revisión independiente llega después.

### 2026-10-25 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 15: (high 0, medium 0, low 15)
- defer: 0
- reject: 18
- addressed_findings:
  - `[low]` `[patch]` `consecuenciasDe` daba la marca indexable a cualquier causa que no fuera `contenido` (blind-hunter): la marca sale ahora de `marcaPorCausa`, un `switch` exhaustivo con `never`, y la causa tiene tipo propio (`CausaDelServicio`); una causa nueva no compila en vez de caer en la indexable.
  - `[low]` `[patch]` La causa del servicio se calculaba dos veces en `consecuenciasDe` (blind-hunter): se calcula una vez y el carácter sale de ella por `caracterPorCausa`, la misma regla que usa `caracterDe`.
  - `[low]` `[patch]` Una isla que pidiera `vista-de-obra` por `__medir` se llevaba la marca del `<html>` (blind-hunter, edge-case-hunter): la fuente 6 es ahora `D&&H`, como las Marcas de llegada, así que la marca solo viaja con la vista que declara la página y la de una isla sale nula; prueba nueva en el entorno simulado. El fichero pasa de 3.644 a 3.647 bytes (tope 3.730, sin mover), anotado en `umbrales.ts`.
  - `[low]` `[patch]` Dos aserciones rompían el mecanismo de `PENDIENTES` (blind-hunter, edge-case-hunter): la 2.9 exige ya solo que lo que emite el guion sea del vocabulario —lo completo lo exige la correspondencia, que conoce `PENDIENTES`— y la prueba de la vista de Obra comprueba que ni ella ni su marca están pendientes, en vez de exigir la lista vacía.
  - `[low]` `[patch]` La consulta de Obra por marca de `DESPLIEGUE.md` se saltaba las marcas nulas (blind-hunter, edge-case-hunter): `COALESCE(indexable,'nula')` en el recuento y en la marca, comentado; probada con `sqlite3` sobre el esquema y una tabla de muestra (dos marcas, `cambio` por las dos y por una nula con otra, `nula` sola, página 2 fuera).
  - `[low]` `[patch]` `LIMIT 90` limitaba filas y no jornadas (blind-hunter): `LIMIT 120`, con el comentario de que son hasta cuatro filas por jornada y al menos las últimas 30.
  - `[low]` `[patch]` La salvedad de `cambio` suponía un cambio «a mitad de jornada» (blind-hunter): el párrafo y el comentario de la consulta nombran el techo de caché de §1 (`max-age=600`), que puede alargar la marca vieja a los primeros minutos de la jornada siguiente.
  - `[low]` `[patch]` `informeDeCoincidencia` decía «(1 rutas indexables)» (blind-hunter, edge-case-hunter): singular y plural, con su prueba.
  - `[low]` `[patch]` La línea «página 1 de Obra sin marca válida» no decía qué se encontró (blind-hunter): cada ruta lleva al lado «(sin el atributo)» o el valor ajeno entre comillas; prueba al día.
  - `[low]` `[patch]` Las pruebas copiaban la expresión de la marca en vez de usar el lector de la puerta (blind-hunter): `medicion.test.ts` y `obra-pagina.test.ts` leen la marca con `marcasDePagina` de `tools/lib/indexables.ts`.
  - `[low]` `[patch]` «Y solo eso» de la copia que rompe el build solo descartaba una línea (blind-hunter): se exige el titular con «(1 desajuste)».
  - `[low]` `[patch]` La guarda de islas eximía `umbrales.ts` entero por un comentario (blind-hunter): el comentario de `MAX_BYTES_GUION_DE_MEDICION` ya no nombra los identificadores vigilados y `umbrales.ts` sale de los dueños.
  - `[low]` `[patch]` El entorno simulado tenía un `hasAttribute` del `<html>` que nadie llama, `dataset` con otra fuente que `getAttribute`, y su docblock sobre `ORIGEN_DEL_SANDBOX` (blind-hunter): fuera `hasAttribute`, `dataset` sale de los mismos atributos y la constante va antes del docblock, que queda sobre `medicionEnUnSandbox`.
  - `[low]` `[patch]` Las premisas del sitio de `receptor.spec.ts` no se comprobaban y el selector del Autor escribía el atributo de zona a mano (blind-hunter): cada prueba de la 23.9 comprueba primero el `noindex` de su Obra, con un mensaje que nombra los umbrales de FR-52, y el selector se compone con `ATRIBUTO_DE_ZONA`.
  - `[low]` `[patch]` La prueba de Vitest sobre `dist/` cotejaba marca y `noindex` solo en rutas con nombre (intent-alignment, ac-auditor): el recorrido de todas las rutas construidas exige además, en cada página con marca, que diga lo mismo que su `noindex`.

Rechazados (18): la puerta que nombra la Obra en vez de leer `vistaConMarca` (la spec prescribe ese predicado, una prueba de `superficies.test.ts` fija la Página de Obra como única declarante, y el predicado independiente para el build también si la Obra perdiera su declaración); comprobar `data-vistas` contra la marca en la puerta (las dos salen de la misma llamada a `consecuenciasDe` en la misma línea del armazón, no dependen del Corpus, y el CI las fija en la tabla de `superficies.test.ts` y en el `data-vistas` de cada ruta construida); el corte de la serie `obra` de la continuación (la medición de la Épica 23 llega en vivo en el mismo despliegue que la 23.9, y la serie empieza tras esa llegada: no hay datos de antes); el parche por cadena exacta de `Armazon.astro` (la precondición falla en voz alta; precedente de la 22.4); la spec cerrada antes de la revisión (es esta pasada); otras consultas de §3 que contarían dos vistas (comprobado: todo `GLOB 'vista-*'` es `SELECT DISTINCT jornada, ruta` y lo demás nombra sus eventos); el orden de `MARCAS_DE_OBRA` (lo fija literal `tests/unit/vocabulario.test.ts:189`, además de la huella); la carga útil probada solo en el entorno simulado y en Playwright local (por diseño: el CI no corre e2e y el entorno ejecuta el fichero de verdad); la prueba de zonas de la 23.7 sin tocar (lo pide la 23.7); las consultas de SM-8 sin ejecutar en pruebas; la falta de comparación antes/después de sitemap, `noindex` y Pagefind (la puerta corre en cada construcción y las expectativas de la 22.4 no cambian); el sitio de `receptor.spec.ts` y la lectura tras las dos vistas solo en el entorno simulado; `producir` sobre `/cita/una/`; el orden de las dos vistas (coherente con la spec); el criterio de la 22.4 en `epics.md` (ya diferido a Héctor en el frontmatter); `sprint-status.yaml` (lo lleva el orquestador; la spec prohíbe tocarlo); la copia rota que dispara una sola clase en un build real (las cuatro se prueban puras y el cableado con una); la cobertura de navegador solo en `escritorio`.

### 2026-10-25 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 16: (high 0, medium 0, low 16)
- defer: 0
- reject: 6
- addressed_findings:
  - `[low]` `[patch]` La marca no salía del mismo valor que el `noindex` (blind-hunter): `consecuenciasDe` la toma ya del `noIndexar` de las mismas consecuencias que pintan el `noindex` —no indexable si lo lleva, indexable si no—, y `marcaPorCausa` desaparece; una superficie de otro carácter que declarase la vista con marca no podría salir con `noindex` y marca indexable.
  - `[low]` `[patch]` La puerta de `astro:build:done` no miraba que la marca fuera con la `vista-de-obra` de `data-vistas` (blind-hunter, edge-case-hunter): `marcasDePagina` lee también `data-vistas` (`vistas`), y `desajustesDeIndexables` nombra una quinta clase, «marca de Obra y `vista-de-obra` de `data-vistas` por separado», con «la marca sin la vista» o «la vista sin la marca» al lado de cada ruta; pruebas puras de las dos.
  - `[low]` `[patch]` Faltaba afirmar que la página 1 de la Obra no indexable ya no está en `sinLectura` (blind-hunter, intent-alignment, ac-auditor): la prueba de zonas de la 23.7 exige ahora que ni `OBRAS[0]` ni `OBRAS[1]` estén ahí.
  - `[low]` `[patch]` Las pruebas de `dist/` de la 23.9 copiaban la expresión del `noindex` (blind-hunter): leen el `noindex` con `marcasDePagina(html).noindex`, el lector de la puerta.
  - `[low]` `[patch]` El `dataset` del `<html>` simulado solo exponía `vistas`, en contra de su docblock (blind-hunter): sale de todo `data-*` del `<html>`, sin el prefijo y en camello, como en el navegador.
  - `[low]` `[patch]` La consulta de Obra por marca metía el «Ver esta cita» del 404 servido en la ruta de una Obra absorbida o retirada (blind-hunter): aparta `zona IS 'cita-del-dia'`, que ninguna Página de Obra lleva, como SM-4, y el comentario dice que el resto de salidas de ese 404 entra ese día hasta la 23.10; probada con `sqlite3` sobre el esquema.
  - `[low]` `[patch]` Ninguna consulta leía las llegadas del Canal a la Obra que no se indexa (blind-hunter): `DESPLIEGUE.md` §3 gana la consulta de llegadas con origen a la página 1 de Obra por marca y red, desde la `vista-de-obra`, que no se suma a SM-8, y remite la difusión (`via`) a la consulta de difusión con `ruta LIKE '/obra/%'`; probada con `sqlite3`.
  - `[low]` `[patch]` Huecos de cobertura e2e (blind-hunter, intent-alignment): «Cartas a Lucilio» entra en los dos barridos de la 23.1 (descarga exactamente el fichero; una vista de superficie y ninguna de Cita), y la prueba de la Obra indexable llega con `?de=instagram&via=whatsapp`, exige las dos marcas de llegada en las dos vistas y en la lectura, y una sola lectura detrás de las dos.
  - `[low]` `[patch]` Las pruebas e2e de la 23.9 dependían de no pasar 8 s antes del gesto (blind-hunter): las dos fingen el reloj y lo paran antes de navegar, como la 23.5, así que la lectura sale solo del `pointerdown`.
  - `[low]` `[patch]` El docblock de `PENDIENTES` decía a la vez que la cierra la 23.11 y que ya está vacía (blind-hunter): dice que se planeó vaciarla en la 23.11, que la vació la 23.9 y que vacía es su estado de llegada.
  - `[low]` `[patch]` `AGENTS.md` describía la puerta a medias (blind-hunter): nombra el valor ajeno a `MARCAS_DE_OBRA` y la marca sin su vista, y que la marca viaja solo con la vista que declara la página —la que pidiera una isla sale nula—.
  - `[low]` `[patch]` La medida de `umbrales.ts` no nombraba el punto final de «las pruebas» (blind-hunter): da 3.602 con `https://ejemplo.invalid/e` y 3.600 con `http://localhost:8787/e`, y el margen de 83 con el de producción.
  - `[low]` `[patch]` El lector de la marca en `dist/` solo entendía comillas dobles y no escapaba el nombre (blind-hunter, edge-case-hunter): `atributoDelHtml` escapa el nombre y lee comillas dobles, simples, sin comillas y el atributo sin valor (vacío, que la puerta nombra como valor ajeno); pruebas de cada forma y de un atributo que solo empieza igual.
  - `[low]` `[patch]` `DESPLIEGUE.md` §3 confundía el campo con su valor (blind-hunter): nombra la columna `indexable` y sus dos valores como marcas de `MARCAS_DE_OBRA`, y la puerta con sus cinco clases.
  - `[low]` `[patch]` La prueba de SM-8 cortaba la sección por el siguiente `### ` y exigía las dos vistas a todo `evento IN (…)` (blind-hunter): corta por el siguiente encabezado de nivel 2 o 3 (no por los comentarios `# ` de las órdenes) y solo juzga los filtros que nombran una vista.
  - `[low]` `[patch]` Las acciones que el espinazo parte por marca no salían en la consulta de Obra (intent-alignment): el párrafo de la vista de Obra dice que la consulta cuenta vistas, lecturas y salidas porque la Página de Obra no emite hoy ninguna acción —viven en la Página de Cita—, y que si un día las emite se parten igual, por su ruta y su jornada.

Rechazados (6): el frontmatter y el registro «contradictorios» (`review_loop_iteration` vuelve a 0 en cada pasada nueva sobre una spec `done` y solo sube en un bucle `bad_spec`; el seguimiento recomendado es esta pasada; el título de cada entrada lo fija el flujo); descartar en el fichero la `vista-de-obra` que pida una isla tras activarse (edge-case-hunter, intent-alignment: se comporta como cualquier vista pedida por una isla —sin Marcas de llegada y aquí con la marca nula—, ninguna isla la pide y una prueba lo vigila sobre las fuentes; el guard costaría bytes de un fichero a 83 de su tope); las pruebas de Vitest sobre construcciones de prueba y la puerta probada en un build de verdad con una sola de sus clases (las clases son puras y están probadas una a una; el cableado, con una, y la puerta corre en cada construcción, también en la del `webServer` sobre el Corpus de verdad); las consultas de SM-8 sin ejecutar en pruebas (no hay lector de SM-8 en `tools/` hasta la 23.10; la sección se vigila sobre su texto y la auditoría las corrió con `sqlite3`); la comparación antes/después de sitemap, `noindex` y Pagefind sin prueba versionada (exigiría construir la línea base en el CI; la auditoría la hizo a mano y salieron idénticos, y la puerta y las expectativas de la 22.4 sin cambios cubren el criterio); el criterio de la 22.4 en `epics.md` (ya diferido a Héctor en el frontmatter: AGENTS.md prohíbe editarlo a mano).

## Design Notes

**Por qué un campo propio y no una segunda `vista`.** `vista` sigue siendo «sí y solo si producto» (20.1, y el criterio de la 22.4 que esta historia sustituye solo en lo que dice de la Obra). La vista de Obra sale con otra regla —la página 1, se indexe o no— y lleva una marca; meterla en `vista` haría que la Obra no indexable la perdiera, o que `vista-de-superficie` dejara de ser «solo producto».

**Por qué la marca va en su atributo del `<html>`.** El fichero no puede calcular la indexabilidad —no tiene el Corpus— y no debe deducirla de la dirección. AD-6 nombra tres piezas del marcado que quedan en `dist/`: el `data-*` de las vistas, las zonas y la marca indexable. Va donde va `data-vistas`, se lee una vez al activarse y es la misma que pinta el `noindex`, porque las dos salen de `consecuenciasDe`; la comprobación del build la coteja sobre el `dist/` real por si alguna vez dejan de salir del mismo sitio.

**El sitio de `receptor.spec.ts`.** Con tres Citas de una sola obra no hay Obra indexable (100 % de su Autor). Mover dos a «Cartas a Lucilio» da una indexable (2 de 3, menos del 90 %) y deja «Sobre la brevedad de la vida» con una Cita, no indexable por `MIN_CITAS_OBRA_INDEXABLE`, así que `OBRA_NO_INDEXABLE` sigue siendo la misma ruta. Añadir dos Citas en cambio volvería indexable la brevedad (3 de 5).

**La continuación de SM-4.** La consulta de §3 ya junta las vistas por `GLOB 'vista-*'`, así que desde la 23.9 la página 1 de la Obra no indexable entra en ella con su lectura y sus salidas, sin tocar la consulta: es lo que la 23.7 dejaba escrito «hasta la 23.9».

Orientativo (nombres y forma los fija el código):

```ts
const causa = causaDelServicio(ruta);
const caracter = causa === undefined ? superficie.caracter : 'servicio';
const vistas = caracter === 'producto' && superficie.vista ? [superficie.vista] : [];
if (superficie.vistaConMarca === undefined || causa === 'forma') return { ...consecuenciasDelCaracter(caracter), vistas };
return { ...consecuenciasDelCaracter(caracter), vistas: [...vistas, superficie.vistaConMarca],
  marcaDeObra: causa === 'contenido' ? NO_INDEXABLE : INDEXABLE };
```

## Verification

**Commands:**
- `npx astro check` -- expected: 0 errores.
- `npx vitest run tests/unit/<fichero>.test.ts`, uno a uno, para cada fichero del primer criterio -- expected: verde.
- `npm test` con `correr.sh` -- expected: verde.
- `npx playwright test tests/e2e/receptor.spec.ts --project=escritorio` y, con el `webServer`, `receptor-local`, `origen`, `busqueda` y `pagina-404` en `escritorio` -- expected: verde; puertos 4321, 4399, 4400, 4402 y 8787 libres al terminar.
- `npx tsx -e` que mida en bytes UTF-8 `guionDeMedicion('https://medicion-sabiduria-de-bolsillo.sabiduriadebolsillo.workers.dev')` -- expected: ≤ el tope.

**Manual checks (if no CLI):**
- `ARRANQUE_DE_MEDICION`, `MAX_BYTES_DE_GUION`, `src/lib/vocabulario.ts` y `medicion/` sin cambios; ningún fichero de `corpus/` tocado.

## Auto Run Result

Status: done
Blocking condition: ninguna.

**Qué se hizo.** La página 1 de **toda** Obra emite ahora `vista-de-obra`, se indexe o no, con la marca `indexable` o `no-indexable`. `src/lib/superficies.ts` lo declara en un campo propio de la Página de Obra, `vistaConMarca` (el campo `vista` ya no admite la vista de Obra: `Exclude<EventoDeVista, …>`), y `consecuenciasDe` da para la página 1 de una Obra `vistas: [vista-de-superficie, vista-de-obra]` y `marcaDeObra: indexable` si es producto, `vistas: [vista-de-obra]` y `marcaDeObra: no-indexable` si es servicio por contenido, y para las 2+ y toda otra ruta ni la vista de Obra ni la clave; la marca sale del mismo `noIndexar` que pinta el `noindex` de la página (desde la tercera pasada; antes, de la causa del servicio), así que sigue a la lista declarada (FR-52 y congelación) y sin lista rompe como antes. Los dos valores salen de `MARCAS_DE_OBRA` por desestructuración, nunca como cadena. `Armazon.astro` escribe la marca en el `<html>` con el nombre de `ATRIBUTO_DE_INDEXABLE` (`data-indexable`, nuevo en `src/lib/medicion.ts`), solo si la hay y también sin punto final. El fichero de medición añade `vista-de-obra` a `EVENTOS_DE_VISTA` y a `EVENTOS_DEL_GUION` (ya emite todo el vocabulario), da a `indexable` la fuente 6 —el atributo, leído una vez al activarse junto con `data-vistas`— y lo coteja con `MARCAS_DE_OBRA` por la tabla. La comprobación de `astro:build:done` (`tools/lib/indexables.ts`) lee también la marca y las vistas del `<html>` (`marcasDePagina`) y nombra en la misma lista sus cinco clases de desajuste —la quinta, desde la tercera pasada: la marca sin la `vista-de-obra` de `data-vistas`, o al revés—; la línea de registro (`informeDeCoincidencia`) y el titular la nombran. SM-8 no cambia: sus consultas siguen filtrando las dos vistas de siempre.

**Ficheros.**
- `src/lib/medicion.ts` — la vista de Obra en `EVENTOS_DE_VISTA` y `EVENTOS_DEL_GUION`; `ATRIBUTO_DE_INDEXABLE`; `indexable: 6` en `FUENTE_EN_EL_GUION`; el fichero lee la marca del `<html>` (variable `H`, `d` para el `<html>` en `a`); docblocks al día.
- `src/lib/superficies.ts` — `vistaConMarca` en `Superficie` y en la Página de Obra; `vista` sin la de Obra; `marcaDeObra?` en `ConsecuenciasDeRuta`; `consecuenciasDe` con la vista con marca; docblocks.
- `src/components/Armazon.astro` — el atributo de la marca en el `<html>`, por propagación de un objeto con la clave de la constante.
- `tools/lib/indexables.ts` — `marcaDeObra?` en `PaginaIndexable` y en `marcasDePagina`; las cuatro clases en `desajustesDeIndexables`; titular e `informeDeCoincidencia`.
- `integraciones/indexables.ts` — la línea de registro por `informeDeCoincidencia`; docblock.
- `src/lib/umbrales.ts` — la medida de la 23.9 en el comentario de `MAX_BYTES_GUION_DE_MEDICION` (3.644 bytes; el tope de 3.730 no se mueve).
- `tests/unit/ayuda/medicion.ts` — opción `indexable`: el `documentElement` simulado ofrece la marca por `getAttribute`, como el fichero la lee.
- `tests/unit/medicion.test.ts` — `describe` de la 23.9 en el entorno simulado (una prueba por fila de la matriz y la guarda de islas) y sobre `dist/` (marca exacta por ruta con y sin punto final, la de cada página 1 de Obra frente a su `noindex`, la Obra no indexable con vista y fichero, SM-8 en `DESPLIEGUE.md`); 2.9, 23.5, 20.1/23.1 de la Obra, sin punto final y la guarda de cadena suelta al día.
- `tests/unit/vocabulario.test.ts` — `PENDIENTES` vacía; la marca del `<html>` en `Entrada` y `producir`; escenarios de cada marca, ajenas y ninguna solo en el evento que declara `indexable`, con su prueba; «once eventos».
- `tests/unit/superficies.test.ts` — la tabla de la 23.1 con vistas y marca; carácter sin cambios; la marca sigue a la lista; la vista con marca solo en una superficie `indexablePorContenido`.
- `tests/unit/obra-indexable.test.ts` — `consecuenciasDe` exacto con vistas y marca; `marcasDePagina` con marca presente, ausente, ajena y fuera del `<html>`; las cuatro clases y su silencio; registro y titular.
- `tests/unit/obra-pagina.test.ts` — vistas y marca de CARTAS, de las cuatro no indexables y de la página 2; la congelación (CARTAS `no-indexable`, solo la de Obra); la copia con `Armazon.astro` que siempre marca `indexable` rompe el build nombrando la Obra; las dos lecturas de la línea de registro.
- `tests/e2e/receptor.spec.ts` — `seneca--dos` y `seneca--larga` pasan a «Cartas a Lucilio»; la Obra no indexable sale de la lista «sin vista»; `describe` de la 23.9 con dos pruebas.
- `DESPLIEGUE.md` §3 — párrafo de la vista de Obra; fuera los «hasta la 23.9» de la Lectura, la Salida y el comentario de SM-4; la consulta de vistas, lecturas y salidas de Obra por marca y jornada (probada con `sqlite3` sobre una tabla de muestra); SM-8 con el tercer evento, que no entra.
- `AGENTS.md` — la convención de la medición, el párrafo de la Página de Obra y la comprobación de `astro:build:done`.

**Revisión.** Primera pasada: 0 parches, 0 diferidos, 0 rechazados (capas externas sin hallazgos todavía). **Segunda pasada (revisión externa, 2026-10-25)**: 33 hallazgos tras deduplicar —blind-hunter 20, edge-case-hunter 1 propio (los otros cinco repetían los del blind-hunter), verification-gap ninguno, intent-alignment 9, ac-auditor 3 propios—; **15 parches aplicados** (todos bajos), **0 diferidos** nuevos y **18 rechazados**, con el detalle en el Review Triage Log. Recomendación de revisión de seguimiento tras esa pasada: `true` (0 altos, 0 medios, 15 bajos; puntuación 15 ≥ 5). **Tercera pasada (segunda revisión externa, 2026-10-25)**: 22 hallazgos tras deduplicar —blind-hunter 16, edge-case-hunter 1 propio (los otros dos repetían los del blind-hunter), verification-gap ninguno, intent-alignment 5 propios, ac-auditor ninguno propio (sus cinco huecos repetían otros)—; **16 parches aplicados** (todos bajos), **0 diferidos** nuevos y **6 rechazados**, con el detalle en el Review Triage Log. Recomendación de revisión de seguimiento: `true` (parches de esta pasada: 0 altos, 0 medios, 16 bajos; puntuación 3 × 0 + 16 = 16 ≥ 5).

Ficheros que toca la segunda pasada:
- `src/lib/superficies.ts` — `CausaDelServicio`; `caracterPorCausa`, que comparten `caracterDe` y `consecuenciasDe`; `marcaPorCausa`, exhaustiva; la causa se calcula una vez.
- `src/lib/medicion.ts` — la marca de la Obra solo viaja con la vista declarada (`D&&H`); docblocks.
- `src/lib/umbrales.ts` — la medida nueva (3.647 bytes, tope sin mover) y el comentario sin los identificadores vigilados.
- `tools/lib/indexables.ts` — el valor encontrado al lado de cada página 1 de Obra sin marca válida; singular en `informeDeCoincidencia`.
- `DESPLIEGUE.md` §3 — la marca nula y el `LIMIT 120` de la consulta de Obra por marca; la caché de §1 en la salvedad de `cambio`.
- `tests/unit/medicion.test.ts` — la 2.9 sin igualdad estricta; la vista de Obra pedida por una isla; `umbrales.ts` fuera de los dueños; marca leída con `marcasDePagina` y cotejada con el `noindex` en cada ruta construida.
- `tests/unit/vocabulario.test.ts` — la vista de Obra no pendiente, en vez de `PENDIENTES` vacía.
- `tests/unit/obra-indexable.test.ts` — el valor en la línea de la marca no válida; el singular.
- `tests/unit/obra-pagina.test.ts` — la marca con `marcasDePagina`; «(1 desajuste)» en la copia que rompe.
- `tests/unit/ayuda/medicion.ts` — sin `hasAttribute` en el `<html>`, `dataset` de los mismos atributos, docblock sobre `medicionEnUnSandbox`.
- `tests/e2e/receptor.spec.ts` — la premisa del `noindex` de cada Obra y el selector con `ATRIBUTO_DE_ZONA`.

Ficheros que toca la tercera pasada:
- `src/lib/superficies.ts` — la marca, del `noIndexar` de las mismas consecuencias; fuera `marcaPorCausa`; docblocks.
- `tools/lib/indexables.ts` — `atributoDelHtml` (nombre escapado; comillas dobles, simples, sin comillas o sin valor); `vistas` en `PaginaIndexable` y en `marcasDePagina`; la quinta clase de desajuste; docblocks.
- `src/lib/umbrales.ts` — la medida con cada punto final nombrado.
- `DESPLIEGUE.md` §3 — la columna `indexable` y sus valores; la puerta con sus cinco clases; las acciones; la consulta de Obra por marca sin el «Ver esta cita» del 404; la consulta de llegadas con origen a la página 1 de Obra.
- `AGENTS.md` — la puerta con sus cinco clases y la marca que viaja solo con la vista declarada.
- `tests/unit/obra-indexable.test.ts` — la quinta clase, en sus dos sentidos; `marcasDePagina` con `vistas`, comillas simples, sin comillas, sin valor y un atributo que solo empieza igual.
- `tests/unit/medicion.test.ts` — el `noindex` por `marcasDePagina`; la página 1 de las dos Obras fuera de `sinLectura`; la prueba de SM-8, por encabezado de nivel 2 o 3 y solo sobre los filtros de vistas.
- `tests/unit/ayuda/medicion.ts` — el `dataset` de todo `data-*` del `<html>`.
- `tests/unit/vocabulario.test.ts` — el docblock de `PENDIENTES`.
- `tests/e2e/receptor.spec.ts` — «Cartas a Lucilio» en los dos barridos de la 23.1; el reloj parado en las dos pruebas de la 23.9; la indexable con `?via=`, las marcas en las dos vistas y una sola lectura detrás.

**Verificación de la primera pasada.**
- `npx astro check` — 0 errores, 0 avisos (20 sugerencias ajenas a la historia).
- `npx vitest run` por fichero: `medicion` (491), `obra-pagina` (53) y, en una invocación, `vocabulario`, `superficies`, `obra-indexable`, `congelacion-de-obras`, `huella`, `receptor`, `espinas-de-ux`, `ingreso-construido`, `publicable-y-alcanzable` y `medicion-orden` (10 ficheros, 407): 12 ficheros, 951 pruebas en verde. `git diff b51311c2da5367470efb2e8925dca3f62c2079c6..HEAD -- src/lib/vocabulario.ts medicion/` vacío; ningún `caracter`, `reconoce`, `noPublicableEn` ni `indexablePorContenido` cambia.
- `npm test` (con `correr.sh`) — 131 ficheros, 5.918 pruebas en verde.
- `npx playwright test tests/e2e/receptor.spec.ts tests/e2e/receptor-local.spec.ts tests/e2e/origen.spec.ts tests/e2e/busqueda.spec.ts tests/e2e/pagina-404.spec.ts --project=escritorio` (con el `webServer`) — 92 en verde y 2 saltadas ajenas (el prerender de la 23.1 y la 3.1 del índice); las dos de la 23.9 en verde. Puertos 4321, 4399, 4400, 4402 y 8787 libres al terminar.
- `npx tsx -e` con `guionDeMedicion` y el punto final de producción — 3.644 bytes ≤ 3.730 (3.645 con la barra final; 3.612 con el de las pruebas).
- Comprobación a mano: `ARRANQUE_DE_MEDICION`, `MAX_BYTES_DE_GUION`, `src/lib/vocabulario.ts`, `medicion/` y `corpus/` sin cambios.
- Auditoría de la matriz: Obra indexable, no indexable (lectura por tiempo, por interacción y la salida detrás), página 2+, llegada con `?de=`/`?via=`, marca ajena o ausente (cuatro casos), marca con otra vista, caché y prerender tienen su prueba en el entorno simulado de `tests/unit/medicion.test.ts`; la congelación, en la construcción de la 22.8 de `obra-pagina` y en la marca que sigue a la lista de `superficies`; el build con la marca falsa, en «lo que rompe el build» de `obra-pagina` y en las cuatro clases puras de `obra-indexable`; las dos primeras filas, además, en Playwright. Todas corrieron y pasaron.

**Verificación de la segunda pasada.**
- `npx astro check` — 0 errores, 0 avisos (20 sugerencias ajenas a la historia).
- `npx vitest run tests/unit/vocabulario.test.ts tests/unit/superficies.test.ts tests/unit/obra-indexable.test.ts` — 3 ficheros, 180 pruebas en verde.
- `npm test` (con `correr.sh`) — 131 ficheros, 5.919 pruebas en verde (incluye `medicion`, `obra-pagina` y el resto de los ficheros del primer criterio).
- `npx playwright test tests/e2e/receptor.spec.ts tests/e2e/receptor-local.spec.ts tests/e2e/origen.spec.ts tests/e2e/busqueda.spec.ts tests/e2e/pagina-404.spec.ts --project=escritorio` (con el `webServer`) — 92 en verde y 2 saltadas ajenas; las dos de la 23.9 en verde. Puertos 4321, 4399, 4400, 4402 y 8787 libres al terminar.
- `npx tsx -e` con `guionDeMedicion` y el punto final de producción — 3.647 bytes ≤ 3.730 (3.648 con la barra final; 3.602 con `https://ejemplo.invalid/e`).
- La consulta de Obra por marca, con `sqlite3` sobre `medicion/esquema.sql` y una tabla de muestra: `indexable`, `no-indexable`, `cambio` (dos marcas, y una nula con otra) y `nula`, con la página 2 fuera.
- Comprobación a mano: `git diff b51311c2da5367470efb2e8925dca3f62c2079c6 -- src/lib/vocabulario.ts medicion/ corpus/` vacío; `ARRANQUE_DE_MEDICION`, `MAX_BYTES_DE_GUION` y los campos `caracter`, `reconoce`, `noPublicableEn` e `indexablePorContenido` sin cambios.

**Verificación de la tercera pasada.**
- `npx astro check` — 0 errores, 0 avisos (20 sugerencias ajenas a la historia).
- `npx vitest run tests/unit/vocabulario.test.ts tests/unit/superficies.test.ts tests/unit/obra-indexable.test.ts` — 3 ficheros, 180 pruebas en verde.
- `npm test` (con `correr.sh`) — 131 ficheros, 5.919 pruebas en verde (incluye `medicion`, `obra-pagina` y el resto de los ficheros del primer criterio).
- `npx playwright test tests/e2e/receptor.spec.ts tests/e2e/receptor-local.spec.ts tests/e2e/origen.spec.ts tests/e2e/busqueda.spec.ts tests/e2e/pagina-404.spec.ts --project=escritorio` (con el `webServer`, cuyo `npm run build` pasa la puerta de cinco clases sobre el Corpus de verdad) — 94 en verde y 2 saltadas ajenas (el prerender de la 23.1 y la 3.1 del índice); las dos de la 23.9 y las dos filas nuevas de la 23.1 en verde. Puertos 4321, 4399, 4400, 4401, 4402 y 8787 libres al terminar.
- `npx tsx -e` con `guionDeMedicion` y el punto final de producción — 3.647 bytes ≤ 3.730 (la pasada no toca el fichero).
- Las dos consultas de Obra de `DESPLIEGUE.md` §3, con `sqlite3` sobre `medicion/esquema.sql` y una tabla de muestra: por marca (`indexable`, `no-indexable`, `cambio`; la página 2 y el «Ver esta cita» fuera, una salida con zona nula dentro) y las llegadas con origen por marca y red.
- Comprobación a mano: `git diff b51311c2da5367470efb2e8925dca3f62c2079c6 -- src/lib/vocabulario.ts medicion/ corpus/` vacío; `ARRANQUE_DE_MEDICION`, `MAX_BYTES_DE_GUION` y los campos `caracter`, `reconoce`, `noPublicableEn` e `indexablePorContenido` sin cambios.

**Riesgos que quedan.**
- El fichero queda a 83 bytes de su tope: la próxima historia que le añada algo lo sube en su diff, con la medida.
- Una isla que pidiera `vista-de-obra` por `__medir` seguiría emitiéndola, ahora con la marca nula y sin Marcas de llegada (como cualquier vista pedida por una isla): ninguna lo hace, una prueba de `tests/unit/medicion.test.ts` lo vigila sobre el texto de las fuentes, y la consulta de Obra por marca la sacaría como `nula` o `cambio`. La tercera pasada lo deja así a propósito (ver el Review Triage Log).
- La consulta de Obra por marca aparta el «Ver esta cita» del 404 servido en la ruta de una Obra absorbida o retirada, pero no sus demás salidas (la cabecera) la jornada del cambio: es raro y queda, como en SM-4, para la 23.10.
- La consulta de Obra por marca reparte lecturas y salidas con la marca de las vistas de su ruta y jornada; una ruta que cambia de indexabilidad sale ese día —y, por la caché de 10 minutos, quizá los primeros minutos del siguiente— como `cambio`, y leer la familia Obra desde `tools/` es de la 23.10.
- Diferido para Héctor (en el `deferred` del frontmatter): marcar en `epics.md` el criterio de la Historia 22.4 como «(sustituido en la v8 por la Historia 23.9)» — pendiente de Héctor (bmad-create-epics-and-stories).

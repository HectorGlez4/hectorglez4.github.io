---
title: 'Historia 23.9 — Toda Obra cuenta sus vistas, se indexe o no'
type: 'feature'
created: '2026-10-25'
status: 'ready-for-dev'
review_loop_iteration: 0
followup_review_recommended: false
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

Status: ready-for-dev
Blocking condition: ninguna.

Planificación terminada y detenida tras planificar, como pide la invocación. La spec cumple el estándar «Ready for Development»: cada tarea nombra su fichero y su acción, los criterios van en Given/When/Then y observan `dist/`, la construcción y el receptor, y no quedan huecos de intención. Diferido para Héctor (en el `deferred` del frontmatter): marcar en `epics.md` el criterio de la Historia 22.4 como «(sustituido en la v8 por la Historia 23.9)» — pendiente de Héctor (bmad-create-epics-and-stories).

---
title: 'Los Directorios se miden como familia propia'
type: 'feature'
created: '2026-10-28'
status: 'done'
baseline_revision: '5984c1cb33cf0cf3f913098b8351767f1362f47c'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-26-context.md'
warnings: ['oversized']
deferred:
  - summary: >-
      La hoja de `Armazon` (4.151 bytes) ya no cabe en el límite de 4.096 de Astro y sale como `<link>`
      externo, así que `tests/unit/obra-pagina.test.ts` («existe `.enlace-en-tinta`…») no encuentra la
      regla en los `<style>` en línea y `npm test` sale con 1.
    evidence: |-
      Falla igual en la base 5984c1cb33cf0cf3f913098b8351767f1362f47c, sin ningún cambio de la 26.7 (probado
      con los cambios apartados). `shouldInlineAsset` de Astro 7.2 aplica 4096 a la CSS cuando la función
      `assetsInlineLimit` de la 26.6 devuelve `undefined`, y `dist/_astro/Armazon.*.css` mide 4.151 tras la
      cabecera de la 26.5. Decidir si la hoja vuelve en línea (NFR-7) o si la prueba lee también las hojas
      enlazadas no es de esta historia.
    location: >-
      tests/unit/obra-pagina.test.ts:615
    severity: medium
---

<intent-contract>

## Intent

**Problem:** `/autores/` (26.3) y `/obras/` (26.4) se publican sin familia: la indexación, el tráfico, la demanda, el rastreo y el canal los dejan en `fueraDelCenso`, «sin familia» u «otra», y el conjunto cerrado de familias vive repartido en `tools/lib/indexacion.ts` (cuatro + `obra`) y `tools/lib/avisar.ts` (seis). Historia 26.7, `epics.md` líneas 7303-7352 (autoritativo); AD-17, AD-24, AD-27; FR-40.

**Approach:** Mudar las seis familias (`cita`, `autor`, `tema`, `coleccion`, `obra`, `directorio`) a `src/lib/superficies.ts` como único dueño; cada serie declara su subconjunto como constante con nombre derivada de ellas; `censoPorFamilia` da los dos Directorios en `directorio`, y cada consumidor (indexación, tráfico, demanda, rastreo, canal, tipos de resultado, aviso) los cuenta y los nombra «Directorio».

## Boundaries & Constraints

**Always:**
- `src/lib/superficies.ts` exporta `FAMILIAS = ['cita','autor','tema','coleccion','obra','directorio'] as const` y `type Familia`; ningún otro fichero declara la lista ni la unión. Solo constante y tipo: ningún módulo de `src/` lee ni recibe una serie (AD-24).
- La familia de una URL sale del censo, nunca del prefijo: `censo.directorio` se compone con `rutaDelDirectorioDeAutores()` y `rutaDelDirectorioDeObras()` (los mismos constructores que `rutasPublicadas`). `/obras/` no es Obra ni `/autores/` Autor.
- Subconjuntos con nombre, derivados de `FAMILIAS` por filtro o igualdad, nunca reescritos a mano: indexación `FAMILIAS_DE_LA_SERIE` = las seis; tráfico, demanda, rastreo y canal, cada uno la suya (`FAMILIAS_DEL_TRAFICO`, `FAMILIAS_DE_LA_DEMANDA`, `FAMILIAS_DEL_RASTREO`, `FAMILIAS_DEL_CANAL`) = todas menos `obra`. El aviso: `FAMILIAS_DE_RUTA` = las seis y `FAMILIAS_DE_FICHERO` = las cinco con directorio en el Corpus + `documento` (`corpus/fuentes`), tipadas contra `Familia`; `src/lib/umbrales.ts` sigue sin familia. La medición no declara ninguno.
- Ausencia antes que cero: una familia `directorio` sin leer va a `sinLeer` con su motivo; las entradas viejas sin `directorio` se siguen leyendo; los códigos de salida no cambian (2 credencial/forma, 1 contenido).
- El `publicadas` de la entrada de indexación sigue sumando solo cita, autor, tema y colección (comparabilidad con la serie, como hizo la 22.8 con `obra`); `directorio` va en su familia con `censo: publicadas`.
- Mientras `SM11_VIGENTE`, Autor y Obra siguen en `enteras`; `directorio` entra en el suelo de las demás (2 URL, se lee entera).
- Tema en el canal sigue siendo «otra», y la Obra sigue sin contarse en tráfico, demanda, rastreo y canal.

**Block If:**
- Hace falta escribir cualquier fichero de serie o registro de `corpus/` (`serie-de-*.yml`, `peticiones-de-rastreo.yml`, `publicaciones-de-canal.yml`, `senales-externas.yml`) o correr una orden con `--registrar`/`anotar`/`senal` contra el Corpus real o Search Console: todo se prueba con fixtures en Vitest.

**Never:**
- Editar `_bmad-output/planning-artifacts/` ni `_bmad-output/specs/`.
- Un predicado por prefijo (`startsWith('/obra')`) para decidir familia, ni en código ni en pruebas.
- Cambiar SM-C2, la medición, `relacionDeSuperficies` (ya declara `directorio`) ni las cabeceras de los ficheros de serie de `tools/lib/corpus.ts`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Censo | Corpus de prueba | `censoPorFamilia(c).directorio` = `['/autores/','/obras/']`; unión del censo = `rutasPublicadas` sin `/` ni rutas `esRutaDeObra` | — |
| Indexación SM-11 | censo realista (cita ≫ 2000, autor ~150, obra ~80), presupuesto 2000, `enteras ['autor','obra']` | autor y obra enteras, `directorio` con 2 rutas y `muestreada: false` | — |
| Indexación fallo | inspector falla en `/autores/` | `sinLeer.directorio` con motivo; nada de cero | — |
| Tráfico / demanda | filas de `/autores/` (2 clics, 9 impr.) y `/obras/` (1, 4) | `familias.directorio` = {3, 13}; `fueraDelCenso` sin ellas; `familias.autor`/`obra` intactas | — |
| Rastreo | `--registrar /obras/` con `congelacion` vigente | se anota; el reparto lo cuenta en «Directorio: 1 pedidas de 2 publicadas» | — |
| Canal | `anotar … /autores/` y `senal … /obras/` | destino `directorio`, rotulado «Directorio», nunca «otra» | — |
| Aviso | alta de una Cita con Obra | `/autores/` y `/obras/` avisados con `familia: 'directorio'` en la relación; `/` avisada y ausente de la relación | — |

</intent-contract>

## Code Map

- `src/lib/superficies.ts` -- nuevo dueño de `FAMILIAS`/`Familia` (junto a los constructores de ruta, l. 297-416); `esRutaDeDirectorio` (l. 553) y su docblock «hasta la 26.7» se actualizan.
- `src/lib/tipoDeResultado.ts` -- `ETIQUETAS_DE_RESULTADO` (7 claves) pasa a tiparse como `Record<Familia | 'portada', string>` con `import type` (sin dependencia en tiempo de ejecución; la importa `Armazon.astro`).
- `src/lib/publicado.ts:698-703` -- docblock de `rutasPublicadas` que dice «hasta que la 26.7»; solo comentario.
- `tools/lib/indexacion.ts:53-101` -- `Familia`/`FAMILIAS` (4), `FamiliaDeLaSerie`, `FAMILIAS_DE_LA_SERIE`, `NOMBRE_DE_FAMILIA`, `CENSO_DE_FAMILIA`; `censoPorFamilia`/`censoDeLasCuatro` (l. 238-283); `planDeInspeccion` (l. 332); `FamiliaSinLeer<F = Familia>` (l. 647); `componerLectura` suma `publicadas` salvo `obra` (l. 721-726); `lineasDeLectura`.
- `tools/indexacion.ts:270-390` -- `leerIndexacion`: censo, `enteras` SM-11, `sinLeer`, `CENSO_DE_FAMILIA`. Sin cambio de lógica esperado.
- `tools/lib/trafico.ts:24-33,290-520` -- importa `FAMILIAS`; `familiaPorRuta`, `familiasPublicadas`, `agregarPorFamilia`, `componerLecturaDeTrafico`, `lineasDeTrafico` (`padEnd(10)` no cabe «Directorio:»).
- `tools/trafico.ts:158-216` -- `leerTrafico` con `censoPorFamilia`; reatribuye por el censo de hoy.
- `tools/lib/demanda.ts:28-45,163,211-215,403` -- `FAMILIAS`, `Familia`, `agregarDemanda` sobre `agregarPorFamilia`, `lineasDeDemanda`.
- `tools/lib/rastreo.ts:47,345-460,506-570` -- `familiaDeRuta`, `repartoPorFamilia`, `DestinoDePeticion` (`suelta` documentada con los Directorios), `lineasDeRegistro` («Sin familia —la portada y los Directorios no son de ninguna—»); la congelación usa `esRutaDeObra` (l. 290) y ya deja pasar `/obras/`.
- `tools/lib/canal.ts:317-385` -- `Destino`, `DESTINOS`, `NOMBRE_DEL_DESTINO`, `destinoDePublicacion` (solo cita/autor/coleccion de la familia).
- `tools/lib/avisar.ts:23-62` -- `FAMILIAS_DE_FICHERO`, `FAMILIAS_DE_RUTA` (ya seis) y su docblock «hasta que la 26.7»; consumidos por `tools/avisar.ts:496-545`, `tools/lib/cambios.ts:112,231` e `integraciones/historial.ts:97`.
- `tools/lib/cambios.ts:222-231` -- docblock de `Columna` que menciona la 26.7; solo comentario.
- `tests/unit/indexacion.test.ts:120-200,381` -- prueba censo↔`rutasPublicadas` que exime Directorios (l. 152-166); helper `censoDe` con cuatro familias.
- `tests/unit/trafico.test.ts:217,398-415` · `tests/unit/demanda.test.ts:180,297-316` · `tests/unit/rastreo.test.ts:405-426,835` · `tests/unit/canal.test.ts:320-333` -- fixtures `CensoPorFamilia` sin `directorio` y pruebas «hasta la 26.7» a reescribir.
- `tests/unit/indexnow.test.ts:146-171,363-379` -- constantes del aviso (fijadas enteras) y alta de Cita con Obra que ya avisa `/autores/` y `/obras/`.
- `tests/unit/tipo-de-resultado.test.ts:47-60` -- prueba de la 26.2 que fija las siete claves.
- `tests/unit/superficies.test.ts:1163` -- pruebas de `esRutaDeDirectorio`; lugar para fijar `FAMILIAS`.
- `AGENTS.md` -- §§ «Leer el estado de indexación», «Leer el tráfico orgánico», «Leer la demanda por página», «Pedir rastreo…», «Anotar lo que se publica en el canal».

## Tasks & Acceptance

**Execution:**
- `src/lib/superficies.ts` -- añadir `FAMILIAS` (seis, en ese orden) y `type Familia` con docblock (AD-17: una para los dos Directorios; la portada no es ninguna); actualizar el docblock de `esRutaDeDirectorio` -- dueño único.
- `src/lib/tipoDeResultado.ts` -- `ETIQUETAS_DE_RESULTADO` con `satisfies Record<Familia | 'portada', string>` (`import type`) y la clave sigue derivando `TipoDeResultado` -- las familias con resultado más `portada`.
- `tools/lib/indexacion.ts` -- quitar la declaración propia de `Familia`/`FAMILIAS`; `FamiliaDeLaSerie = Familia`, `FAMILIAS_DE_LA_SERIE = FAMILIAS`; exportar `type FamiliaDelCenso = Exclude<Familia,'obra'>` y su lista `FAMILIAS_DEL_CENSO` (claves de `CensoPorFamilia`); `NOMBRE_DE_FAMILIA.directorio = 'Directorio'`, `CENSO_DE_FAMILIA.directorio = 'publicadas'`; `censoPorFamilia` añade `directorio`; `componerLectura` suma en `publicadas` solo las cuatro de siempre (constante con nombre); default genérico de `FamiliaSinLeer` = `FamiliaDelCenso`; docblocks -- AC 1, 2, 3.
- `tools/lib/trafico.ts` -- `FAMILIAS_DEL_TRAFICO` derivada de `FAMILIAS` (sin `obra`) en lugar de la `FAMILIAS` de indexación; tipos `FamiliaDelCenso`; el relleno del rótulo calculado sobre el nombre más largo del subconjunto -- AC 4.
- `tools/lib/demanda.ts` -- `FAMILIAS_DE_LA_DEMANDA` igual derivada; `lineasDeDemanda` la recorre con el mismo relleno -- AC 4.
- `tools/lib/rastreo.ts` -- `FAMILIAS_DEL_RASTREO` derivada; `familiaDeRuta`/`repartoPorFamilia` sobre ella; `suelta` y la línea «Sin familia» hablan solo de la portada -- AC 5.
- `tools/lib/canal.ts` -- `FAMILIAS_DEL_CANAL` derivada; `Destino` gana `directorio` («Directorio») tras `coleccion` en `DESTINOS`; `destinoDePublicacion` lo devuelve por el censo; docblock -- AC 6.
- `tools/lib/avisar.ts` -- `FAMILIAS_DE_RUTA` = `FAMILIAS` importada; `FAMILIAS_DE_FICHERO` tipada con `satisfies` contra `Exclude<Familia,'directorio'> | 'documento'`; `FamiliaDeRuta = Familia`; docblocks -- AC 1.
- `src/lib/publicado.ts`, `tools/lib/cambios.ts` -- comentarios «hasta la 26.7» al día.
- Pruebas: `tests/unit/superficies.test.ts` fija `FAMILIAS` entera; cada prueba de serie (`indexacion`, `trafico`, `demanda`, `rastreo`, `canal`) fija que su constante ⊆ `FAMILIAS` (no igualdad), que incluye `directorio` y —salvo indexación— excluye `obra`; `indexnow.test.ts` sigue fijando las dos constantes del aviso enteras y añade la prueba sobre `relacionDeSuperficies`; `tipo-de-resultado.test.ts` fija que las claves = `[...FAMILIAS, 'portada']`; reescribir las pruebas «hasta la 26.7» y los fixtures `CensoPorFamilia`; cubrir cada fila de la matriz.
- `AGENTS.md` -- mencionar `directorio` en las cinco secciones de series (indexación: «son dos URL, se lee entera» y que `publicadas` sigue siendo las cuatro; tráfico/demanda: cuenta y reatribución; rastreo: `/obras/` admitida con Obra congelada; canal: «Directorio» en el desglose).

**Acceptance Criteria:**
- Given el repositorio, when se busca la declaración de familias, then solo `src/lib/superficies.ts` declara la lista/unión de las seis y `tools/lib/indexacion.ts` y `tools/lib/avisar.ts` la importan.
- Given `tests/unit/indexacion.test.ts`, when compara la unión del censo con `rutasPublicadas`, then solo exime `/` y las rutas `esRutaDeObra`, y los Directorios caen en `directorio`.
- Given una lectura de indexación sobre un censo con Directorios, when se compone, then la entrada trae `familias.directorio` con `censo: 'publicadas'` y `muestra: 2`, y una entrada antigua sin `directorio` se sigue leyendo.
- Given `npm run trafico` o `npm run demanda` con filas de los Directorios, when agregan, then las cuentan en `directorio` y no en `fueraDelCenso`, y `obra` no aparece.
- Given `CONGELACION_DE_OBRAS` definida, when se registra `/obras/` en rastreo, then se anota y la consulta la cuenta en «Directorio».
- Given una publicación o señal hacia un Directorio, when se consulta `npm run canal`, then el desglose dice «Directorio».
- Given cualquier fallo de estas órdenes, when salen, then conservan códigos 2/1 y ningún cero fabricado.

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

## Design Notes

**`publicadas` de la indexación sin `directorio`.** El total de la entrada es la cifra que se compara entre jornadas; sumarle dos URL partiría la serie en el día del merge. Es la misma decisión que tomó la 22.8 con `obra` y AGENTS.md la declara («suma solo las cuatro de siempre»). Se nombra el conjunto (p. ej. `FAMILIAS_DEL_TOTAL`) en vez de encadenar `!== 'obra' && !== 'directorio'`.

**Forma de los subconjuntos.** Derivar por filtro con guarda de tipo, p. ej.:

```ts
export const FAMILIAS_DEL_TRAFICO = FAMILIAS.filter(
  (f): f is FamiliaDelCenso => f !== 'obra',
);
```

Cada serie tiene su propia constante aunque hoy coincidan: si una deja de excluir `obra`, solo cambia la suya. La prueba fija ⊆, no igualdad, para que añadir una séptima familia no rompa las series que no la cuentan.

**Rótulos.** `«Directorio:»` mide 11; el `padEnd(10)` de tráfico y demanda dejaría la columna torcida. Calcular el ancho a partir de `NOMBRE_DE_FAMILIA` del subconjunto y ajustar las pruebas que fijen el espaciado.

## Verification

**Commands:**
- `npx vitest run tests/unit/superficies.test.ts tests/unit/tipo-de-resultado.test.ts` -- expected: verdes.
- `npx vitest run tests/unit/indexacion.test.ts`, `…/trafico.test.ts`, `…/demanda.test.ts`, `…/rastreo.test.ts`, `…/canal.test.ts`, `…/indexnow.test.ts`, `…/avisar-rango.test.ts`, `…/fecha-de-cambio.test.ts` -- de uno en uno; expected: verdes.
- `npx astro check` -- expected: 0 errores (abarca `tools/` y pruebas).
- `npm test` (desacoplado con `correr.sh`/`esperar.pl`) -- expected: `FINISHED EXIT=0`.
- `git status --porcelain corpus/` -- expected: vacío (ninguna serie ni registro tocado).

## Auto Run Result

**Resumen.** Las seis familias (`cita`, `autor`, `tema`, `coleccion`, `obra`, `directorio`) viven solo en
`src/lib/superficies.ts` (`FAMILIAS`, `Familia`). Cada serie deriva su subconjunto con nombre por filtro:
`FAMILIAS_DE_LA_SERIE` (las seis), `FAMILIAS_DEL_CENSO` (sin `obra`, claves de `CensoPorFamilia`),
`FAMILIAS_DEL_TOTAL` (las cuatro que suma `publicadas`), `FAMILIAS_DEL_TRAFICO`, `FAMILIAS_DE_LA_DEMANDA`,
`FAMILIAS_DEL_RASTREO` y `FAMILIAS_DEL_CANAL` (sin `obra`); el aviso usa `FAMILIAS_DE_RUTA = FAMILIAS` y
`FAMILIAS_DE_FICHERO` con `satisfies` contra `Exclude<Familia,'directorio'> | 'documento'`.
`censoPorFamilia` compone `directorio` con `rutaDelDirectorioDeAutores()` y `rutaDelDirectorioDeObras()`;
indexación, tráfico, demanda, rastreo y canal lo cuentan y lo rotulan «Directorio»; el `publicadas` de la
indexación sigue sumando solo las cuatro de siempre. `agregarPorFamilia` recibe el subconjunto de la serie
que llama (la demanda pasa el suyo). Los rótulos de tráfico y demanda se rellenan al nombre más largo del
subconjunto (`rotuloDeFamilia`), también «Total:».

**Ficheros.**
- `src/lib/superficies.ts` — `FAMILIAS` y `Familia`, dueño único; docblock de `esRutaDeDirectorio` al día.
- `src/lib/tipoDeResultado.ts` — `ETIQUETAS_DE_RESULTADO` `satisfies Record<Familia | 'portada', string>` (`import type`).
- `src/lib/publicado.ts`, `tools/lib/cambios.ts` — comentarios «hasta la 26.7» al día.
- `tools/lib/indexacion.ts` — sin declaración propia; subconjuntos derivados; `directorio` en censo, nombre y `CENSO_DE_FAMILIA`; total con `FAMILIAS_DEL_TOTAL`.
- `tools/lib/trafico.ts` — `FAMILIAS_DEL_TRAFICO`, `rotuloDeFamilia`/`anchoDeRotulo`, `agregarPorFamilia` con subconjunto.
- `tools/lib/demanda.ts` — `FAMILIAS_DE_LA_DEMANDA`, reparto y rótulos con ella.
- `tools/lib/rastreo.ts` — `FAMILIAS_DEL_RASTREO`; «Sin familia» solo para la portada.
- `tools/lib/canal.ts` — `FAMILIAS_DEL_CANAL`; destino `directorio` («Directorio»); Tema y Obra siguen «otra».
- `tools/lib/avisar.ts` — familias importadas de `superficies.ts`; `FAMILIAS_DE_FICHERO` tipada.
- `tests/unit/{superficies,tipo-de-resultado,indexacion,trafico,demanda,rastreo,canal,indexnow}.test.ts` — las pruebas «hasta la 26.7» reescritas, fixtures con `directorio`, ⊆ por serie, una fila de la matriz por prueba, y una prueba que niega cualquier otra declaración de la lista o la unión en `src/`, `tools/`, `integraciones/` y `medicion/`.
- `AGENTS.md` — las cinco secciones de series nombran la familia `directorio`.

**Revisión.** Las capas son externas y en esta pasada no traen hallazgos: 0 parches, 0 aplazados por
revisión, 0 rechazados. Recomendación de revisión de seguimiento: `false` (0 parches; puntuación 0).

**Verificación.**
- `npx vitest run tests/unit/superficies.test.ts tests/unit/tipo-de-resultado.test.ts` — 118/118.
- `npx vitest run tests/unit/indexacion.test.ts` 87/87; `trafico` 41/41; `demanda` 44/44; `rastreo` 54/54; `canal` 150/150; `indexnow` 36/36; `avisar-rango` 30/30; `fecha-de-cambio` 71/71.
- `npx astro check` — 0 errores, 0 avisos, 8 *hints* ajenos.
- `npm test` (desacoplado) — 6.612/6.613, `FINISHED EXIT=1`: el único rojo es `tests/unit/obra-pagina.test.ts` «existe `.enlace-en-tinta`», que falla igual en la base 5984c1cb sin los cambios de la 26.7 (aplazado arriba).
- `git status --porcelain corpus/` — vacío.
- Auditoría de la matriz: las siete filas tienen prueba y pasaron (censo e indexación SM-11/fallo en `indexacion.test.ts`; tráfico y demanda; rastreo con `CONGELACION_DE_OBRAS` simulada sobre la orden; canal con `anotar` y `senal` sobre la orden; aviso en `indexnow.test.ts`).

**Riesgos residuales.** La suite completa no sale en verde por el rojo previo de `obra-pagina.test.ts` (hoja
de `Armazon` sobre 4 KiB desde la 26.5), que la 26.11 tendrá que resolver antes de fusionar. Observado y
no tocado: en `tools/indexacion.ts` un 403 se reintenta, porque el motivo normalizado empieza por «sin
acceso» y la guarda mira `startsWith('permiso')`.

---
title: 'Story 11.2 — Ninguna Cita se publica sin aparecer en su documento'
type: 'feature'
created: '2026-08-19'
status: 'done'
baseline_revision: '8784d379de5deddf9efa4e9aec190b7ce5da1ce5'
review_loop_iteration: 1
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-11-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-11-1-la-fuente-se-recupera.md'
warnings: ['oversized']
deferred:
  - summary: >-
      `astro preview` no coteja: la integración engancha el build y el arranque de `dev`,
      pero `preview` sirve un `dist/` ya construido y no dispara ningún gancho.
    evidence: |-
      Se argumenta en el módulo que no hace falta, porque lo que `preview` sirve ya cruzó
      la puerta al construirse. Es cierto mientras nadie sirva un `dist/` traído de otro
      sitio. Queda anotado como decisión, no como olvido.
    location: >-
      integraciones/cotejo.ts
    severity: low
  - summary: >-
      El sembrado automático de documentos en las pruebas de build usa la presencia de un
      censo propio como señal de «no me siembres», y nada obliga a respetarlo.
    evidence: |-
      Una prueba futura que quiera medir el cotejo y no escriba su propio
      `pendientes-de-cotejo.yml` recibirá documentos automáticos y medirá otra cosa. Está
      en el docblock de `documentosDeFuenteDe`, pero es una convención, no una puerta.
    location: >-
      tests/unit/ayuda/construir.ts
    severity: medium
  - summary: >-
      El recuento de «pendientes» de la auditoría cambió de significado: ahora son Citas
      publicadas amparadas por el censo, no entradas del censo.
    evidence: |-
      Hoy ambas cifras coinciden (38 / 0 rancias). Si divergieran, el informe diría algo
      distinto de lo que decía antes. El cambio parece más correcto, pero conviene saberlo
      al leer series históricas del informe.
    location: >-
      tools/auditoria.ts
    severity: low
---

<intent-contract>

## Intent

**Problem:** La 11.1 hace que el metadato salga del documento, pero nada comprueba que el **texto** de la Cita esté de verdad en él. Una Cita puede publicarse citando una obra en la que esa frase no aparece, y el sitio la presenta como procedencia comprobada. Esa comprobación es la promesa entera del producto.

**Approach:** El build coteja el texto de cada Cita contra el cuerpo del documento de su Fuente y **rompe** si no aparece literalmente. Las 38 Citas anteriores a la v3, que no tienen documento, entran en una lista versionada y visible de pendientes de verificar que solo puede menguar; ninguna Cita nueva puede entrar en ella.

## Boundaries & Constraints

**Always:**
- El cotejo corre **en el build** y rompe la construcción. No se degrada a aviso.
- Vive **fuera de `src/lib/`**, que por AD-5 es puro y no lee disco.
- **Ningún camino de publicación lo esquiva**: una Cita escrita a mano directamente en `corpus/citas/` pasa por él igual que una sembrada.
- La comparación **colapsa espacios y nada más**. No pasa por `normalizar.ts`: un acento o un signo de puntuación que difieran hacen fallar.
- El fallo nombra la **ruta del fichero** y la **regla incumplida**.
- La lista de pendientes es versionada, legible, y el build informa de cuántas quedan.

**Block If:**
- Cumplir un criterio exigiera que `src/lib/` leyera disco, o que el build hiciera red.

**Never:**
- No añadir Citas a la lista de pendientes: es un censo cerrado de lo anterior a la v3, no un vertedero. Una Cita nueva sin documento **rompe el build**.
- No usar `normalizar.ts` ni ninguna comparación laxa en el cotejo.
- No tocar el texto de ninguna Cita para que cuadre. NFR-12 lo prohíbe.
- No recuperar documentos durante el build (AD-22).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Cita con documento, texto presente | Cita referencia su Fuente; su texto está en el cuerpo | El build pasa | Sin error |
| Cita con documento, texto ausente | El texto no aparece en el cuerpo | El build **falla** nombrando ruta y regla | Construcción abortada |
| Diferencia de un acento o un signo | «el» vs «él», o coma de más | El build **falla**: solo se colapsan espacios | Construcción abortada |
| Solo difieren espacios o saltos | Mismo texto con espaciado distinto | El build pasa | Sin error |
| Cita nueva sin documento | Cita en `corpus/citas/` sin referencia y fuera de la lista | El build **falla** pidiendo recuperar su Fuente | Construcción abortada |
| Cita anterior a la v3 | Slug presente en la lista de pendientes | El build pasa y cuenta la deuda | Sin error |
| Entrada rancia en la lista | Slug que ya no existe en `corpus/citas/` | El build **falla**: la lista solo mengua | Construcción abortada |
| Documento referenciado ausente | La Cita nombra un documento que no está en `corpus/fuentes/` | El build **falla** nombrando el documento que falta | Construcción abortada |
| Cita escrita a mano | Fichero creado a mano en `corpus/citas/` | Pasa por el cotejo igual que una sembrada | Igual que arriba |

</intent-contract>

## Code Map

- `src/content.config.ts` -- cablea las reglas a las colecciones; aquí es donde un fichero que las incumpla rompe el build (AD-1). El esquema de `citas` **no declara hoy** ningún campo de Fuente, aunque `tools/extraer.ts` lo escribe en las candidatas. Hay que declararlo.
- `src/lib/admision.ts` -- las reglas de admisión, puras, **sin lecturas de disco** (AD-5). Aquí van las formas del campo nuevo, no el cotejo.
- `astro.config.mjs` -- ya importa de `src/lib/dominio.ts` y declara `integrations: [sitemap(...)]`. Es el punto donde enganchar una integración que sí lee disco.
- `tools/lib/documento.ts` -- de la 11.1: `analizarDocumento(contenido)` devuelve `{ cabecera, declaracion, cuerpo }`, y `nombreDeDocumento(idFuente, obra)` da el nombre del fichero. **El cotejo va contra el `cuerpo`**, nunca contra la cabecera ni la declaración.
- `tools/lib/corpus.ts` -- `rutasDelCorpus()` incluye ya `fuentes`.
- `tools/extraer.ts` -- escribe `fuente: { id, nombre, licencia, url }` en cada candidata; ese es el campo que el esquema debe reconocer al publicarse.
- `tools/lib/revision.ts`, `tools/revisar.ts` -- la ruta de aprobación de la 9.2. **No mencionan `fuente`**: hay que comprobar que el campo sobrevive al pasar de `_revision/` a `citas/`.
- `tools/auditoria.ts`, `src/lib/salud.ts` -- la auditoría de la 1.8 que mide SM-C1; la deuda de cotejo debería poder verse desde ahí.
- `tests/unit/puerta-de-admision.test.ts` -- el patrón de pruebas de «fallo de build»: invocan `astro build` sobre un corpus de prueba y exigen que rompa.
- `tests/unit/andamiaje.test.ts` -- estructura del repositorio y guardián de AD-22.

## Tasks & Acceptance

**Execution:**
- `src/lib/admision.ts` -- declarar la forma del campo de Fuente de una Cita (identificador de Fuente y dirección), puro y sin tocar disco -- las reglas tienen un solo dueño y las herramientas importan estas mismas.
- `src/content.config.ts` -- cablear ese campo al esquema de `citas` -- sin declararlo, el dato que escribe la extracción se pierde al publicar y el cotejo no tiene de dónde agarrarse.
- `corpus/pendientes-de-cotejo.yml` (nuevo) -- censo versionado de las Citas anteriores a la v3 que todavía no tienen documento, con el motivo escrito arriba. Se coloca junto a `corpus/portada.json`, que ya es metadato del Corpus y no colección.
- `tools/lib/cotejo.ts` (nuevo, puro, sin disco) -- la comparación: colapsar espacios en ambos lados y comprobar aparición literal; y la decisión de qué documento le toca a cada Cita. Puro para poder probarlo entero sin construir.
- `integraciones/cotejo.ts` (nuevo) -- integración de Astro que en `astro:build:start` lee `corpus/citas/`, `corpus/fuentes/` y el censo, aplica `tools/lib/cotejo.ts` y aborta la construcción con el detalle. Vive fuera de `src/lib/` porque lee disco.
- `astro.config.mjs` -- añadir la integración a `integrations` -- es el único sitio por el que pasan todas las construcciones, así que ningún camino de publicación la esquiva.
- `tools/auditoria.ts` -- informar de cuántas Citas quedan pendientes de cotejo, junto a SM-C1 -- la deuda se cuenta donde ya se cuenta la salud del Corpus.
- `tests/unit/cotejo.test.ts` (nuevo) -- lo puro: colapso de espacios, diferencia por acento, por signo, texto presente y ausente, y elección del documento.
- `tests/unit/cotejo-build.test.ts` (nuevo) -- las pruebas de **fallo de build** con el patrón de `puerta-de-admision.test.ts`, cubriendo la matriz: texto ausente, acento distinto, Cita nueva sin documento, entrada rancia en el censo, documento ausente, y una Cita escrita a mano.
- `tests/unit/andamiaje.test.ts` -- el censo se fija por **identidad, no por recuento**: una constante con los 38 slugs de partida, y toda entrada del censo tiene que pertenecer a ese conjunto. Un tope por cardinalidad no cierra nada — en cuanto la 11.4 libere una entrada queda un hueco donde meter una Cita nueva sin que falle nada.

**Acceptance Criteria:**
- Given una Cita que referencia su documento, when se construye el sitio, then el cotejo comprueba que su texto aparezca literalmente en el cuerpo de ese documento.
- Given una Cita cuyo texto no se localiza en su documento, when se construye, then el build falla nombrando la ruta del fichero y la regla incumplida, y no se degrada a aviso.
- Given una Cita que difiere de su edición en un acento o en un signo, when corre el cotejo, then falla: la comparación colapsa espacios y nada más, y no pasa por `normalizar.ts`.
- Given una Cita escrita a mano en `corpus/citas/` sin pasar por el sembrado, when se construye, then pasa por el cotejo igual que una sembrada.
- Given una Cita nueva sin documento y fuera del censo, when se construye, then el build falla y le dice que recupere su Fuente.
- Given un slug del censo que ya no existe entre las Citas, when se construye, then el build falla: el censo solo mengua.
- Given el repositorio, when se busca dónde vive el cotejo, then no está en `src/lib/`, y `src/lib/` sigue sin leer disco.

## Spec Change Log

## Review Triage Log

## Design Notes

**Por qué un censo y no un cotejo opcional.** El título de la historia dice que ninguna Cita se publica sin aparecer en su documento, pero las 38 Citas anteriores a la v3 no tienen documento y quien se lo da es la 11.4, que es trabajo de Héctor y no del bucle. Hacer el cotejo opcional cuando falta la referencia dejaría el agujero que la historia existe para cerrar: bastaría no poner referencia. El censo invierte eso — la referencia es obligatoria, y la excepción es una lista **cerrada, contada y a la vista**, con un tope que solo se puede bajar. Decidido con Héctor el 19/08.

**El cotejo va contra el cuerpo.** El documento de la 11.1 tiene tres zonas separadas por `---`: cabecera, declaración y cuerpo. `analizarDocumento` las separa. Cotejar contra el fichero entero dejaría pasar una Cita cuyo texto coincidiera con una línea de la ficha.

**Colapsar espacios y nada más.** Una edición digital reparte los saltos de línea donde le conviene, así que el espaciado no puede decidir. Todo lo demás sí: un acento cambiado es otra palabra, y una coma de más es otra puntuación. `normalizar.ts` está para los slugs y ahí quitaría justo lo que aquí tiene que decidir.

## Verification

**Commands:**
- `npx astro check` -- expected: 0 errores.
- `npx vitest run` -- expected: todo en verde; ninguna de las 703 de la línea base perdida.
- `npm run build` -- expected: construye, con las 38 pendientes contadas y sin romper.
- `grep -rn "cotejo" src/lib/` -- expected: ninguna aparición; el cotejo no vive ahí.

### 2026-08-19 — Review pass
- intent_gap: 0
- bad_spec: 1: (high 1)
- patch: 16: (high 1, medium 8, low 7)
- defer: 3: (medium 1, low 2)
- reject: 5: (low 5)
- addressed_findings:
  - `[high]` `[bad_spec]` El censo se cerraba por **recuento** y no por identidad: en cuanto la 11.4 liberase una entrada quedaba un hueco donde meter una Cita nueva sin que fallase nada. La causa estaba en esta especificación, que pedía comprobar que el recuento no superase el tope. Enmendada a identidad, y el código pasa a atar cada Cita censada a la **huella de su texto**, con lo que reutilizar un slug tampoco hereda la exención.
  - `[high]` `[patch]` Una Cita en un subdirectorio de `corpus/citas/` esquivaba el cotejo entero y se publicaba: la colección de Astro enumera recursivamente y el lector del cotejo hacía un `readdir` plano. Dos revisores lo reprodujeron construyendo. Lector recursivo, y prueba de build con la Cita en subcarpeta.
  - `[medium]` `[patch]` El cotejo colapsaba `\s+` pero no los caracteres invisibles (guion blando, anchura cero, marca de orden). Las ediciones web los reparten, y habrían bloqueado el build en la 11.4 sin diferencia visible.
  - `[medium]` `[patch]` El trinquete del tope se imprimía en el build pero solo se aplicaba en una prueba unitaria.
  - `[medium]` `[patch]` `tools/alta.ts` y la aprobación de candidatas publicaban una Cita sin Fuente y la construcción siguiente moría: un build roto fabricado por la herramienta que debía impedirlo. Un solo dueño, `motivoParaNoPublicar`, para las tres puertas.
  - `[medium]` `[patch]` Un censo con YAML mal formado, o con `citas` que no fuese lista, reventaba con la traza de la librería o devolvía `[]` en silencio. Ahora nombra el fichero y la regla. Lo mismo para el frontmatter de una Cita.
  - `[medium]` `[patch]` La extracción podía emitir una Fuente sin dirección, produciendo candidatas que la admisión rechaza en bloque al aprobar.
  - `[medium]` `[patch]` El andamio de pruebas eximía del cotejo a todos los fixtures por omisión, invirtiendo la premisa de la historia para cualquier prueba futura. Ahora los fixtures son **legítimos**: el andamio les siembra su documento y las pruebas de build ejercitan el cotejo de verdad en vez de esquivarlo.
  - `[medium]` `[patch]` `yaml` pasó a ser dependencia de build y seguía en `devDependencies`: bajo `npm ci --omit=dev` la configuración de Astro no cargaba.
  - `[medium]` `[patch]` `tools/auditoria.ts` no tenía ninguna prueba y su recuento podía mentir en silencio; el cálculo se extrajo a una función pura y se probó.
  - `[low]` `[patch]` Rutas de fallo rotas en Windows; titular duplicado y plurales mal; tope congelado en las dos direcciones cuando la 11.4 tiene que poder bajarlo; mensaje genérico ante una clave sobrante en `fuente`; aserción que prohibía manejar errores en todo el módulo de la integración.

## Auto Run Result

Status: done

**Cambio implementado.** El build coteja el texto de cada Cita contra el cuerpo del documento de su Fuente y rompe la construcción si no aparece literalmente, sin degradarse a aviso. Vive fuera de `src/lib/`: la comparación pura en `tools/lib/cotejo.ts` y la lectura de disco en `integraciones/cotejo.ts`, enganchada en `astro.config.mjs`, que es el único sitio por el que pasan todas las construcciones. Las 38 Citas anteriores a la v3, que no tienen documento, quedan en un censo cerrado por identidad y huella, contado a la vista y que solo mengua.

**Verificación.** `npx astro check` 0 errores. `npx vitest run` **794/794** en 35 ficheros, frente a 703/33 de la línea base. `npm run build` construye e informa «0 Citas cotejadas contra su documento; 38 pendientes de cotejo de un tope de 38». `npx playwright test` **392 pasan, 12 saltadas**. Y a mano, los dos agujeros que la revisión encontró: una Cita colada en `corpus/citas/sub/` rompe la construcción nombrando su ruta, y un slug nuevo añadido al censo se rechaza por tope y por identidad.

**Recomendación de nueva revisión: true.** Dos hallazgos de severidad alta.

**Riesgos residuales.** Ninguna Cita del Corpus se coteja hoy de verdad: las 38 están censadas y `corpus/fuentes/` está vacío. El camino completo —documento real, Cita sembrada, cotejo en verde— solo se ejercita con documentos compuestos en las pruebas. La primera siembra real dirá si la retirada de marcado de la 11.1 deja el cuerpo lo bastante fiel; si no, el ajuste toca en `documento.ts`. Los tres hallazgos diferidos están en el frontmatter.

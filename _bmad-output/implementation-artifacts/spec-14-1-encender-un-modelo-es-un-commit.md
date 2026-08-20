---
title: 'Story 14.1 — Encender un Modelo de Ingreso es un commit'
type: 'feature'
created: '2026-08-20'
status: 'done'
baseline_commit: '47cf9f2aca5ea48b9194c9a6c9b67c6a9c3241fa'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-14-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-12-1-una-superficie-declara-en-un-solo-sitio.md'
warnings: []
deferred:
  - summary: >-
      El mando solo avisa hacia arriba: no hay ninguna señal que diga cuándo **apagar** un
      Modelo, que es el requisito que la historia declara como el de verdad.
    evidence: |-
      El módulo y `AGENTS.md` repiten que lo importante es poder apagar, y que la publicidad
      va vigilada por la contra-métrica —rebote de la Página de Cita y tiempo hasta el
      contenido—. El mando compara solo contra el Umbral y hacia arriba: un Modelo ya
      encendido devuelve `aviso: undefined` por construcción, no se lee ninguna
      contra-métrica, y tampoco se avisa de un Modelo encendido cuyo Umbral dejó de estar
      cruzado. La palanca existe y es de una línea; la señal que diría cuándo accionarla, no.
      Construirla exige que el receptor publique las dos series de la contra-métrica, que es
      el mismo paso que hoy falta para que haya cifra siquiera.
    location: >-
      tools/lib/ingresos.ts
    severity: medium
  - summary: >-
      El receptor no publica ninguna lectura, así que el camino «Umbral cruzado» del mando
      está probado y no ejercitado por ninguna infraestructura real.
    evidence: |-
      El Worker de `medicion/` contesta 204 a todo lo que no sea un POST de baliza: escribe y
      no se lee, y la cifra se saca hoy con `npx wrangler d1 execute`. El mando pide la
      lectura por HTTP a `MEDICION_ENDPOINT` y degrada diciendo que el receptor no la publica,
      que es la respuesta honesta y no una cifra inventada. La rama que compara con el Umbral
      se prueba contra un receptor de mentira levantado en `127.0.0.1`. Enseñarle al receptor
      a publicar esa cifra agregada —o leerla por `wrangler` desde `tools/`— queda fuera de
      esta historia y es lo que hará falta el día que LC-4 se cierre.
    location: >-
      tools/lib/ingresos.ts
    severity: medium
  - summary: >-
      `tools/lib/documento.ts` conserva un literal numérico de tope fuera de `umbrales.ts`.
    evidence: |-
      `MAX_ELEMENTOS_RETIRADOS = 5000` es anterior a esta historia y no es un Umbral de
      Activación, pero ensucia la verificación por grep que la especificación declara —«solo
      `src/lib/umbrales.ts`»— y es, en la letra de AD-9, un literal de regla con nombre que
      vive en `tools/`. Ninguno de los cuatro Umbrales nuevos está fuera de `umbrales.ts`.
    location: >-
      tools/lib/documento.ts
    severity: low
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** El sitio no tiene ningún Modelo de Ingreso, y ese es justo el momento de decidir cómo se encienden. Con dos ya sería tarde: el estado acabaría repartido entre una página, una configuración y un `if`, y existiría un interruptor que sabe encenderse y no sabe apagarse.

**Approach:** Construir el **dueño del estado** antes que el ingreso. Cada Modelo declara en un solo módulo versionado si está encendido, qué superficies lo admiten y contra qué Umbral se mide. Encenderlo es un diff y `git revert` lo apaga. Un mando de `tools/` y un paso del flujo diario **informan** de si un Umbral se cruzó; ninguno enciende nada.

## Boundaries & Constraints

**Always:**
- El estado de cada Modelo es **configuración versionada**: un diff lo enciende, `git revert` lo apaga, y git registra cuándo y por qué (AD-21).
- Los cuatro Umbrales de Activación viven en `src/lib/umbrales.ts` y en ningún otro sitio (AD-9). Ni en el mando, ni en el paso de CI, ni en ninguna página.
- Junto al estado vive su otro dueño: **qué superficie admite qué Modelo**. La Página de Cita y la Página de Colección no admiten ninguno, y eso se declara ahora aunque todo esté apagado.
- **El build jamás lee el plano de medición** (AD-14). Dos construcciones del mismo commit dan el mismo sitio, también con el receptor apagado o caído.
- **Un Modelo apagado es invisible, no latente** (UX-DR35): ni hueco reservado, ni espacio en blanco, ni marcador. Hoy están los cuatro apagados, así que esto es comprobable sobre el sitio construido.
- El mando informa **sin exportar datos**, con la misma lectura que la auditoría de salud del Corpus.
- El paso de CI **avisa y nunca falla el flujo**: la reconstrucción diaria del sitio en vivo no puede caerse porque el receptor no conteste.

**Ask First:**
- Si cumplir un criterio exigiera que el build consultara al receptor, o encender algún Modelo.

**Never:**
- **No codifiques «umbral cruzado ⇒ encender».** No vale para los cuatro: en la afiliación el Umbral gobierna **cuándo se solicita la cuenta**, un acto con reloj propio —3 ventas en 180 días, y la cuenta ya se cerró una vez por esa regla—, no el encendido del enlace.
- No alojes ningún Modelo en el armazón compartido: es una línea, aparece en todas partes e incluye la Página de Cita, que es lo primero que la épica prohíbe.
- No construyas la invitación de donación: eso es la 14.2, bloqueada por LC-4.
- No traigas ningún guion de tercero, ni prepares sitio para uno (AD-20).
- No decidas nada de lo que el contexto de la épica declara **abierto a propósito**: cobertura panhispánica, qué edición se enlaza, y Kindle/KDP.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Consultar el estado | Los cuatro Modelos apagados, que es hoy | El mando dice, por Modelo: apagado, su Umbral y la cifra medida —o que aún no es medible | Sin error |
| Receptor sin desplegar | `MEDICION_ENDPOINT` sin definir (LC-4 abierta) | Dice que la cifra no es medible todavía y nombra la condición que falta | Código 0 |
| Receptor caído | El endpoint existe y no responde | Lo dice y no inventa cifra | Código 0 |
| Umbral cruzado | La cifra supera el Umbral de un Modelo apagado | Avisa de que se puede encender, **y no lo enciende**; en la afiliación avisa de que toca *solicitar*, no encender | Sin error |
| Paso de CI | El flujo diario corre | Avisa si algún Umbral se cruzó y termina en verde pase lo que pase | Nunca falla el flujo |
| Build con todo apagado | Se construye el sitio | Ningún byte de `dist/` deriva de la medición, y ninguna superficie muestra hueco ni marcador | Sin error |
| Dos construcciones | El mismo commit, construido dos veces | El mismo sitio | Sin error |
| Encender un Modelo | Se cambia su estado a encendido en el módulo | El diff es de una línea y `git revert` lo apaga; nada más hay que tocar | Sin error |

</frozen-after-approval>

## Code Map

- `src/lib/superficies.ts` -- **el precedente exacto y el molde a seguir**: la Historia 12.1 declaró ahí, en un solo sitio, si una superficie es publicable, y de esa declaración derivan sitemap, `noindex`, Pagefind y el barrido de accesibilidad. El dueño del estado de los Modelos es su hermano, y la tabla de «qué superficie admite qué Modelo» se cruza con las familias que ya declara.
- `src/lib/umbrales.ts` -- AD-9, el único sitio con literales de regla de negocio. Ya tiene `MAX_BYTES_DE_GUION` (6656) y el patrón de constante documentada. Aquí entran los cuatro Umbrales: donaciones (LC-1…LC-4, **no numérico**), afiliación 2.000 sesiones orgánicas/mes, producto propio 5.000, publicidad acotada 25.000.
- `src/lib/medicion.ts` -- lo que el sitio **escribe**. Léelo para no romper la dirección única: el sitio escribe balizas y no lee de ahí ni en build ni en cliente.
- `medicion/worker.ts` y `medicion/esquema.sql` -- el receptor y sus columnas. El mando consulta **desde `tools/`**, que es donde vive la red (AD-22); el build no.
- `tools/auditoria.ts` -- el molde del mando que **solo informa**: la auditoría de salud del Corpus lee, resume y no cambia nada. `tools/lib/cli.ts` para la cáscara y `terminar`.
- `.github/workflows/publicar.yml` -- el flujo diario (05:15 UTC) y el de push a `main`. Ahí entra el aviso. **Ese flujo despliega el sitio en vivo**: el paso nuevo no puede hacerlo fallar nunca.
- `src/layouts/` -- el armazón compartido. Es donde **no** va ningún Modelo, y conviene una prueba que lo fije.
- `tests/unit/ayuda/construir.ts` -- `construirConCorpus`, `limpiar`. Para la prueba de reproducibilidad: construir dos veces el mismo corpus y comparar `dist/`.
- `tests/unit/superficies-construidas.test.ts` (y hermanas) -- el molde de las pruebas sobre el sitio ya construido.

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/ingreso.ts` (nuevo) -- el dueño único: los cuatro Modelos con su estado (hoy los cuatro `false`), qué dispara su Umbral (`enciende` o `solicita`) y qué familias de superficie los admiten. Puro, sin disco. Rationale: con dos Modelos ya sería tarde; el estado repartido es el fallo que la épica existe para no cometer.
- [x] `src/lib/umbrales.ts` -- los cuatro Umbrales, el de donaciones declarado como condición no numérica. Rationale: AD-9, y que el de afiliación no sea un número suelto es lo que impide leerlo como «cruzado ⇒ encender».
- [x] `tools/ingreso.ts` + `tools/lib/ingresos.ts` (nuevos) -- el mando que informa: estado, Umbral y cifra medida o el motivo de que no lo sea. Consulta el receptor desde `tools/`, degrada sin inventar y **no enciende nada**.
- [x] `.github/workflows/publicar.yml` -- el paso de aviso en el flujo diario, incapaz de tumbarlo. Rationale: si el aviso puede fallar, la reconstrucción diaria del sitio en vivo depende de que el receptor conteste, y eso es exactamente lo que AD-14 prohíbe.
- [x] `package.json` y `AGENTS.md` -- el guion `ingreso` y cómo se enciende un Modelo, fuera del bloque gestionado.
- [x] `tests/unit/ingreso.test.ts` (nuevo) -- la tabla: los cuatro apagados hoy, ninguna superficie de lectura admite ninguno, y que el estado no se pueda derivar de nada que no sea el módulo.
- [x] `tests/unit/ingreso-cli.test.ts` (nuevo) -- la matriz del mando: sin endpoint, con receptor caído, con umbral cruzado —y que en la afiliación el aviso diga *solicitar*, no *encender*.
- [x] `tests/unit/ingreso-construido.test.ts` (nuevo) -- sobre el sitio construido: ninguna superficie muestra hueco, marcador ni espacio reservado; el armazón compartido no aloja ningún Modelo; y **dos construcciones del mismo corpus dan el mismo `dist/`**.

**Acceptance Criteria:**
- Given el estado de un Modelo, when lo consulto, then es configuración versionada: encenderlo es un diff y `git revert` lo apaga.
- Given un Umbral cruzado en el receptor, when corre el flujo diario, then avisa, y ningún Modelo se enciende por su cuenta.
- Given el build, when se construye el sitio, then ningún byte de `dist/` deriva del plano de medición, y dos construcciones del mismo commit dan el mismo sitio.
- Given los cuatro Umbrales, when los busco, then viven en `src/lib/umbrales.ts` y en ningún otro sitio.
- Given todos los Modelos apagados, when recorro cualquier superficie, then no hay hueco reservado, espacio en blanco ni marcador.
- Given el estado de cada Modelo y su cifra, when los consulto, then los obtengo sin exportar datos.

## Spec Change Log

### 2026-08-20 — La exclusión de las superficies de lectura se estrecha a dos Modelos

**Qué decía.** «La Página de Cita y la Página de Colección no admiten ninguno», y su prueba
—«ninguna superficie de lectura admite ninguno»—.

**Por qué cambia.** Eso cerraba por omisión una excepción que el contexto de la épica da por
buena y ya resuelta aguas arriba: el enlace de afiliación **nace de la Procedencia ya
publicada**, que la Página de Cita ya muestra, y la exclusión se estrechó expresamente a la
publicidad. Escrita como «ningún Modelo», la regla obligaría a reabrir UX-DR36 el día de
solicitar la cuenta, en vez de a escribir una línea.

**Qué dice ahora.** Las superficies de lectura vedan **donaciones y publicidad acotada**, que
son los dos Modelos que añadirían superficie a una lectura. La afiliación queda admisible por
regla y **sigue sin superficie declarada**, porque falta decidir qué edición se enlaza.

**Qué no cambia: nada de lo que el código hace hoy.** Los cuatro Modelos siguen apagados, la
afiliación sigue con `admitidoEn: []` y ninguna superficie aloja nada. Lo que cambia es la
regla que juzga, y con ella el sitio donde mirará quien mañana quiera admitirla:
`MODELOS_VEDADOS_EN_LECTURA` en `src/lib/ingreso.ts`, y la sección de `AGENTS.md`.

## Design Notes

**El Umbral no siempre gobierna el encendido.** Es el hallazgo de la investigación de agosto de 2026 y el que más forma le da al interruptor. Amazon Afiliados cierra la cuenta que no logra 3 ventas cualificadas en 180 días, y la del proyecto **ya se cerró una vez** por eso. Se puede resolicitar con etiqueta nueva, pero solicitar arranca ese reloj otra vez. Así que en la afiliación el Umbral dispara «pide la cuenta», no «enciende el enlace», y un modelo de datos que solo sepa decir «cruzado ⇒ encender» obliga a mentir en una de las cuatro filas. Por eso cada Modelo declara **qué dispara** su Umbral.

**El aviso de CI es el único sitio donde esto puede romper algo en vivo.** El flujo que avisa es el que despliega. Un paso que consulte al receptor y falle tumbaría la reconstrucción diaria del sitio publicado por un problema del plano que el sitio nunca lee — la dependencia exacta que AD-14 existe para impedir. Que el aviso sea incapaz de fallar no es cortesía: es el criterio.

**Apagado tiene que ser indistinguible de inexistente.** No basta con no renderizar: no puede haber contenedor vacío, ni clase reservada, ni comentario. La prueba se hace sobre `dist/` con todo apagado, que es el estado de hoy, así que se escribe una vez y protege para siempre el momento en que algo se encienda.

## Verification

**Commands:**
- `npx astro check` -- expected: 0 errores.
- `npx vitest run` -- expected: verde; ninguna de la línea base perdida.
- `npm run build` -- expected: 53 páginas, sin superficie nueva.
- `npm run ingreso` -- expected: los cuatro apagados y la cifra declarada no medible, nombrando LC-4.
- `grep -rn "2000\|5000\|25000" src tools --include="*.ts"` -- expected: solo `src/lib/umbrales.ts`.
- `grep -rn "MEDICION\|medicion" src/pages src/layouts src/components --include="*.astro"` -- expected: nada nuevo; el build sigue sin leer del plano de medición.

### 2026-08-20 — Review pass
- intent_gap: 1 (resuelto por enmienda, sin rehacer código)
- bad_spec: 0
- patch: 24: (high 5, medium 15, low 4)
- defer: 1
- reject: 0
- addressed_findings:
  - `[intent_gap]` **La exclusión de superficies de lectura estaba escrita de más.** El «Always» decía que la Página de Cita y la de Colección no admiten **ningún** Modelo, y eso cerraba por omisión una excepción que el contexto de la épica da por buena y ya resuelta aguas arriba: el enlace de afiliación nace de la Procedencia **ya publicada**, que se muestra en la Página de Cita, y la exclusión se estrechó a la publicidad. Se resolvió por la vía conservadora, sin tocar nada de lo que hace el código —los cuatro siguen apagados y la afiliación sigue sin superficie— y cambiando la regla: `MODELOS_VEDADOS_EN_LECTURA` veda `donaciones` y `publicidad-acotada`, no cualquier Modelo, y el porqué queda escrito donde mirará quien mañana quiera admitirla.
  - `[high]` `[patch]` **Borrar el `env: MEDICION_ENDPOINT` del paso de CI dejaba la suite entera en verde** y apagaba el aviso para siempre — con un síntoma, «falta LC-4», indistinguible del estado legítimo de hoy, también el día que LC-4 se cierre.
  - `[high]` `[patch]` `milesEnEspañol` entró sin prueba directa y escribe todos los Umbrales: quitarle el `\B` hacía que el informe dijera «.2.000» sin que nada fallara, y devolver cadena vacía habría hecho **pasar vacíamente** las dos aserciones de «no inventa ninguna cifra», cuyo regex exige dígitos delante.
  - `[high]` `[patch]` **La espera acotada no la recorría ninguna prueba.** Los tres receptores de mentira eran «sin desplegar», «caído» —que rechaza la conexión— y «contesta»: ninguno aceptaba y se callaba, que es el único caso para el que existe `AbortSignal.timeout`. Sin él la orden no vuelve nunca en una terminal.
  - `[high]` `[patch]` `expect(peticiones).toBe(0)`, la única prueba de AD-14 sobre el build, no tenía control positivo: pasaba igual si el contador no supiera ver una petición.
  - `[high]` `[patch]` Camino de fuga del secreto: `fallo.message` de `fetch` incluye la dirección entera, y de stdout pasaba por `tee` al resumen del flujo.
  - `[medium]` `[patch]` El comentario afirmaba que la revisión al cargar impide construir el sitio con una superficie de lectura mal declarada. Hoy es falso —nada de `src/` importa el módulo— y lo será a partir de la 14.2.
  - `[medium]` `[patch]` La contradicción documental de LC-4 en el texto accionable: `MEDICION_ENDPOINT` es la dirección de **ingesta**, y el receptor contesta 204 a todo lo que no sea un POST, así que cerrar LC-4 seguirá sin publicar cifra. Ahora el informe nombra el paso que de verdad falta.
  - `[medium]` `[patch]` En CI faltaba `pipefail` —el código de salida era el de `tee`, así que un `tsx` roto pasaba en verde con resumen vacío—, el informe se colapsaba porque `$GITHUB_STEP_SUMMARY` se renderiza como Markdown, y una `pull_request` desde bifurcación confundía el secreto vacío con LC-4.
  - `[medium]` `[patch]` `interpretarLectura` admitía decimales que el informe truncaba en silencio, y no miraba el `content-type`; el ternario de `dispara` hacía caer cualquier valor futuro en «se puede encender»; las anotaciones no escapaban `%`, saltos ni `::`; y `revisarDeclaracionDeIngreso` no comprobaba el censo completo, los duplicados ni las entradas huérfanas tras un renombrado.
  - `[medium]` `[patch]` `modelosEn` sin control positivo, `modelosMarcadosEn` ciego al atributo sin comillas, el vigilante de imports ciego al import sin extensión, y `not.toContain(modelo.id)` sobre todo el HTML como bomba de relojería de contenido.
  - `[medium]` `[patch]` El campo `nota` —cuatro notas cuidadosamente redactadas— no llegaba a ninguna salida. Ahora se publica.
  - `[low]` `[patch]` Falta de `--ayuda`, `--json --anotar` sin prueba conjunta, sockets keep-alive que colgaban el `afterAll`, y EPIPE sin capturar.
  - `[defer]` **Nada avisa en la dirección contraria.** La historia declara que lo importante es poder **apagar**, y la contra-métrica que diría cuándo accionar esa palanca no existe: el mando solo compara hacia arriba. Queda registrado, no construido.

## Auto Run Result

Status: done

**Cambio implementado.** `src/lib/ingreso.ts` es el dueño único del estado de los cuatro Modelos —hoy los cuatro apagados—, de qué dispara cada Umbral y de qué superficies lo admiten. Encender uno es un diff de un booleano y `git revert` lo apaga. `npm run ingreso` informa sin escribir nada, y un paso del flujo diario avisa con tres cinturones para no poder tumbar el despliegue.

**Verificación.** `npx astro check` 0 errores. `npx vitest run` **1501/1501** en 55 ficheros, frente a 1414/52 al abrir la historia. `npm run build` con 53 páginas. `npx playwright test` **400 pasan**. `npm run ingreso` da los cuatro apagados y explica qué falta para que haya cifra; `--ayuda` sale con 0; `--json --anotar` deja stdout como JSON parseable.

**Recomendación de nueva revisión: false.**

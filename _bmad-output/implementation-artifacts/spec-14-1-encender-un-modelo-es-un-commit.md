---
title: 'Story 14.1 — Encender un Modelo de Ingreso es un commit'
type: 'feature'
created: '2026-08-20'
status: 'ready-for-dev'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-14-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-12-1-una-superficie-declara-en-un-solo-sitio.md'
warnings: []
deferred: []
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
- [ ] `src/lib/ingreso.ts` (nuevo) -- el dueño único: los cuatro Modelos con su estado (hoy los cuatro `false`), qué dispara su Umbral (`enciende` o `solicita`) y qué familias de superficie los admiten. Puro, sin disco. Rationale: con dos Modelos ya sería tarde; el estado repartido es el fallo que la épica existe para no cometer.
- [ ] `src/lib/umbrales.ts` -- los cuatro Umbrales, el de donaciones declarado como condición no numérica. Rationale: AD-9, y que el de afiliación no sea un número suelto es lo que impide leerlo como «cruzado ⇒ encender».
- [ ] `tools/ingreso.ts` + `tools/lib/ingresos.ts` (nuevos) -- el mando que informa: estado, Umbral y cifra medida o el motivo de que no lo sea. Consulta el receptor desde `tools/`, degrada sin inventar y **no enciende nada**.
- [ ] `.github/workflows/publicar.yml` -- el paso de aviso en el flujo diario, incapaz de tumbarlo. Rationale: si el aviso puede fallar, la reconstrucción diaria del sitio en vivo depende de que el receptor conteste, y eso es exactamente lo que AD-14 prohíbe.
- [ ] `package.json` y `AGENTS.md` -- el guion `ingreso` y cómo se enciende un Modelo, fuera del bloque gestionado.
- [ ] `tests/unit/ingreso.test.ts` (nuevo) -- la tabla: los cuatro apagados hoy, ninguna superficie de lectura admite ninguno, y que el estado no se pueda derivar de nada que no sea el módulo.
- [ ] `tests/unit/ingreso-cli.test.ts` (nuevo) -- la matriz del mando: sin endpoint, con receptor caído, con umbral cruzado —y que en la afiliación el aviso diga *solicitar*, no *encender*.
- [ ] `tests/unit/ingreso-construido.test.ts` (nuevo) -- sobre el sitio construido: ninguna superficie muestra hueco, marcador ni espacio reservado; el armazón compartido no aloja ningún Modelo; y **dos construcciones del mismo corpus dan el mismo `dist/`**.

**Acceptance Criteria:**
- Given el estado de un Modelo, when lo consulto, then es configuración versionada: encenderlo es un diff y `git revert` lo apaga.
- Given un Umbral cruzado en el receptor, when corre el flujo diario, then avisa, y ningún Modelo se enciende por su cuenta.
- Given el build, when se construye el sitio, then ningún byte de `dist/` deriva del plano de medición, y dos construcciones del mismo commit dan el mismo sitio.
- Given los cuatro Umbrales, when los busco, then viven en `src/lib/umbrales.ts` y en ningún otro sitio.
- Given todos los Modelos apagados, when recorro cualquier superficie, then no hay hueco reservado, espacio en blanco ni marcador.
- Given el estado de cada Modelo y su cifra, when los consulto, then los obtengo sin exportar datos.

## Spec Change Log

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

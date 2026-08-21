---
title: 'Story 14.2 — El visitante que quiere sostener el sitio encuentra cómo'
type: 'feature'
created: '2026-08-21'
status: 'done'
baseline_commit: '6043e1aa156a8b0505ca1a74e82d231a36de04f4'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-14-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-14-1-encender-un-modelo-es-un-commit.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** La 14.1 dejó el interruptor de las donaciones construido, apagado y con sus tres superficies declaradas, pero no hay nada que encender: ninguna página consulta el estado y la invitación no existe. Encender hoy sería cambiar un `false` sin que el sitio cambiara.

**Approach:** Construir la invitación en portada, búsqueda y 404 consumiendo `modelosEn(pagina)`, de modo que hoy no se pinte nada y el día que LC-4 cierre encender sea el diff de una línea que la épica promete. Se construye la superficie; no se enciende el Modelo.

## Boundaries & Constraints

**Always:**
- Se pinta solo si `modelosEn(pagina)` la devuelve —encendida *y* admitida ahí—; nunca por un `if` en la página.
- Todo lo que emita va dentro de un elemento con `data-ingreso="donaciones"` (`MARCA_DE_INGRESO`).
- Es un enlace, no un widget: cero JavaScript, cero guion de tercero, cero recurso remoto (AD-20).
- Va al final de la columna, fuera del flujo de lectura, con el filete del sistema (patrón de `RutasDeSalida.astro`).
- Con el Modelo apagado, `dist/` sale idéntico byte a byte al de hoy: sin hueco, contenedor ni clase reservada (UX-DR35).

**Ask First:**
- La URL de Ko-fi: se asume `https://ko-fi.com/sabiduriadebolsillo` por el dominio. **Sin verificar**; no hay ningún identificador social en el repo. Nada la renderiza con el Modelo apagado, pero verificarla es requisito del commit que encienda.
- Cualquier cambio a `encendido`, `MODELOS_VEDADOS_EN_LECTURA` o `SUPERFICIES_DE_LECTURA`.

**Never:**
- Encender las donaciones: `encendido` se queda en `false`. LC-4 la abre el dueño con `DESPLIEGUE.md`.
- Tocar `Armazon.astro`, ni hacer que ningún fichero de `src/components/` importe `ingreso.ts` (AD-20; la guarda no se relaja).
- Nombrar clases o identificadores con `ingreso` o con un id de Modelo.
- Añadir la invitación a Cita, Colección, Autor, Tema, Kit o lote.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Hoy — apagado | `encendido = false` | Las tres páginas no emiten marca, bloque ni contenedor; `dist/` sin `data-ingreso` | N/A |
| Encendido | `encendido = true`, `admitidoEn` intacto | Portada, `/buscar` y `/404` emiten el bloque con `data-ingreso="donaciones"` y el enlace | N/A |
| Encendido, superficie no admitida | `encendido = true` | Cita, Colección, Autor, Tema, Kit y lote siguen sin emitir nada | N/A |
| Encendido sin destino | `encendido = true`, `destino` ausente | La revisión de la declaración lo rechaza con mensaje propio | Fallo en `revisarDeclaracionDeIngreso` |

</frozen-after-approval>

## Code Map

- `src/lib/ingreso.ts:88-104` -- interfaz `Modelo`; aquí entra `destino?: string`.
- `src/lib/ingreso.ts:166-181` -- Modelo `donaciones`: `encendido: false`, `admitidoEn: ['index.astro','buscar.astro','404.astro']`.
- `src/lib/ingreso.ts:302` -- `revisarDeclaracionDeIngreso`, dueño de los fallos de declaración.
- `src/lib/ingreso.ts` -- `modelosEn(pagina)`, único punto de consulta; `MARCA_DE_INGRESO = 'data-ingreso'`.
- `src/pages/index.astro:143` -- insertar tras `</section>` de Autores, último hijo de `.pagina`.
- `src/pages/buscar.astro:120` -- insertar **tras** el cierre de `.salida`; dentro quedaría oculto salvo búsqueda vacía.
- `src/pages/404.astro:78` -- insertar tras la sección condicional de Temas.
- `src/components/RutasDeSalida.astro:96-100` -- precedente: `border-top: var(--grosor-filete) solid var(--filete)`, `margin-top: calc(var(--respiracion) * 1.5)`.
- `src/styles/tokens.css` -- `--siena`, `--tinta-apagada`, `--filete`, `--respiracion`, `--zona-de-toque: 44px`.
- `src/islands/CompartirEnlace.astro:51-52` -- único enlace externo del repo: `target="_blank"` + `rel="noopener noreferrer"`.
- `tests/unit/ingreso-construido.test.ts:158` -- UX-DR35 con vacío fijo; generalizar a forma duradera.
- `tests/unit/ingreso-construido.test.ts:170` -- huecos reservados; **no se toca** (de ahí que la clase no lleve `ingreso`).
- `tests/unit/ingreso-construido.test.ts:198` -- AD-20 sobre `src/components/`; **no se toca ni se relaja**.
- `tests/unit/ingreso-construido.test.ts:221` -- censo de consumidores, hoy `toEqual([])`; su comentario ya anuncia este cambio.
- `tests/unit/ayuda/construir.ts` -- `construirConCorpus` copia el proyecto a un tmpdir: permite construir con el Modelo encendido sin encenderlo en el repo.

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/ingreso.ts` -- añadir `destino?: string` a `Modelo` y `destino` a donaciones, documentado como sin verificar -- el destino es dato del Modelo, no de la página, y así no se repite en tres sitios.
- [x] `src/lib/ingreso.ts` -- en `revisarDeclaracionDeIngreso`, añadir un fallo para el Modelo encendido sin `destino`, junto a su hermano «encendido sin superficie» -- como el módulo se revisa al cargar y desde esta historia una página lo importa, encender sin destino **detiene el build**; ver Design Notes para el texto exacto.
- [x] `src/components/Sostener.astro` -- componente nuevo; recibe `href` por prop y emite el bloque con `data-ingreso="donaciones"` -- recibe primitivas y no importa `ingreso.ts`, para que la guarda AD-20 siga estricta.
- [x] `src/pages/index.astro`, `src/pages/buscar.astro`, `src/pages/404.astro` -- consultar `modelosEn('<su pagina>')` y renderizar `Sostener` solo si hay Modelo -- la página conoce su identidad; el componente no decide.
- [x] `tests/unit/ingreso-construido.test.ts:158` -- generalizar: lo marcado en una página debe estar encendido y admitido ahí -- si no, encender pone la suite en rojo y la promesa del diff de una línea es falsa.
- [x] `tests/unit/ingreso-construido.test.ts:221` -- sustituir el vacío por el censo exacto de las tres superficies -- lo pide su propio comentario: el valor está en ver quién entró.
- [x] `tests/unit/ingreso-construido.test.ts` -- prueba nueva: construir un proyecto temporal con `encendido: true` parcheado en la copia; el bloque sale en las tres superficies y en ninguna otra -- es lo único que demuestra la promesa central de la épica.
- [x] `tests/unit/ingreso.test.ts` -- cubrir la matriz: `destino` presente, encendido sin destino rechazado, apagado sigue sin admitir nada.
- [x] `AGENTS.md` -- en «Encender un Modelo de Ingreso», anotar que encender donaciones ya no exige tocar ninguna página.

**Acceptance Criteria:**
- Given el repositorio tal como queda, when `npm run build`, then `dist/` no contiene `data-ingreso` y es idéntico al de la rama base.
- Given un árbol con `encendido: true` como único cambio, when se construye, then portada, `/buscar` y `/404` muestran la invitación, ninguna otra superficie la muestra, y no hizo falta tocar ningún otro fichero.
- Given la invitación renderizada, when se inspecciona la página, then no hay `<script>` nuevo ni petición a dominio de tercero.
- Given `npm test` y `npm run check`, then pasan sin regresión sobre las 1733 pruebas de la línea base.

## Design Notes

**Por qué el componente recibe `href` y no el Modelo.** La guarda AD-20 (`:198`) prohíbe que un componente importe `ingreso.ts`, y el censo (`:221`) señala cualquier fichero de `src/` que lo mencione. Si `Sostener.astro` importara el tipo `Modelo`, entraría en el censo y habría que decidir si relajar la guarda. Con primitivas, la guarda sigue igual de estricta y el censo queda en las tres páginas — que es la lista que se quiere leer.

**La clase no puede llamarse `.ingreso` ni `.donaciones`:** `:170` las rechaza. Hoy pasaría igual —no se pinta nada—, pero rompería al encender. Propuesta: `.sostener`.

**Texto propuesto** (existe para quien la busque; no interpela, no es peaje):

```html
<aside class="sostener" data-ingreso="donaciones">
  <p>Sabiduría de Bolsillo se sostiene sin publicidad y sin muros.
     Si algo de lo que has leído aquí te ha acompañado, puedes apoyarlo.</p>
  <a href={href} target="_blank" rel="noopener noreferrer">Apoyar el sitio</a>
</aside>
```

**La puerta del destino — decidida por Héctor: que rompa el build.** El destino de Ko-fi es una suposición sin verificar, y encender el Modelo sin confirmarla publicaría una invitación que no lleva a ninguna parte. La comprobación va en `revisarDeclaracionDeIngreso`, junto a su hermano exacto —el que rechaza un Modelo encendido que no admite ninguna superficie—, y no en el componente: el módulo se revisa al cargar, así que desde esta historia el fallo **detiene `astro build`** en vez de esperar al renderizado. Se descartaron el `throw` en el componente (llega más tarde y solo si esa superficie se construye) y la vía de solo documentarlo.

```ts
if (modelo.encendido && modelo.destino === undefined) {
  fallos.push(
    `«${modelo.nombre}» está encendido y no declara destino, así que la ` +
      'invitación no lleva a ninguna parte. Declare su destino, o vuelva a apagarlo.',
  );
}
```

Cubierto por la cuarta fila de la matriz. Nota para quien lo pruebe: `revisarDeclaracionDeIngreso` acepta modelos por parámetro justo para poder afirmarlo sin encender nada en el censo real.

## Verification

**Commands:**
- `npm test` -- expected: 1733+ en verde, sin regresión
- `npm run check` -- expected: sin errores de TypeScript
- `npm run build` -- expected: build limpio; `grep -r 'data-ingreso' dist/` sin resultados
- `npm run ingreso` -- expected: sigue informando los cuatro apagados y LC-4 sin cerrar

## Suggested Review Order

**El estado y su puerta**

- El dueño del estado gana `destino`: dato del Modelo, no de la página.
  [`ingreso.ts:119`](../../src/lib/ingreso.ts#L119)

- La puerta decidida por Héctor: ausente, en blanco o no-`https` detienen el build.
  [`ingreso.ts:427`](../../src/lib/ingreso.ts#L427)

- El destino supuesto y sin verificar, con lo que exige el commit que encienda.
  [`ingreso.ts:206`](../../src/lib/ingreso.ts#L206)

- El comentario de cierre: la puerta que se prometía ya es real.
  [`ingreso.ts:455`](../../src/lib/ingreso.ts#L455)

**La invitación**

- Recibe primitivas y no importa el estado: así la guarda AD-20 sigue estricta.
  [`Sostener.astro:69`](../../src/components/Sostener.astro#L69)

- Por qué la presentación va en atributos y no en un bloque `<style>`.
  [`Sostener.astro:37`](../../src/components/Sostener.astro#L37)

- Región complementaria con nombre, y el aviso de pestaña nueva dentro del enlace.
  [`Sostener.astro:156`](../../src/components/Sostener.astro#L156)

**Las tres superficies**

- Ningún `if` propio: la portada delega en el cruce de las dos condiciones.
  [`index.astro:161`](../../src/pages/index.astro#L161)

- Fuera de `.salida`: dentro solo existiría para quien no encontró nada.
  [`buscar.astro:137`](../../src/pages/buscar.astro#L137)

- Después de las salidas: quien llega aquí primero necesita por dónde seguir.
  [`404.astro:93`](../../src/pages/404.astro#L93)

**Las guardas, y lo que la revisión les corrigió**

- La promesa central: encender es un diff de una línea, construido y comprobado.
  [`ingreso-construido.test.ts:470`](../../tests/unit/ingreso-construido.test.ts#L470)

- Encender mal no llega a publicar: construye de verdad y exige salida distinta de cero.
  [`ingreso-construido.test.ts:642`](../../tests/unit/ingreso-construido.test.ts#L642)

- El censo de consumidores, hoy exactamente las tres superficies.
  [`ingreso-construido.test.ts:141`](../../tests/unit/ingreso-construido.test.ts#L141)

**Periféricos**

- El gancho que permite construir encendido sin encender nada en el repositorio.
  [`construir.ts`](../../tests/unit/ayuda/construir.ts)

- La guarda del dominio, relajada por la coincidencia con el identificador de Ko-fi.
  [`dominio.test.ts`](../../tests/unit/dominio.test.ts)

- El procedimiento del encendido, y su único requisito manual.
  [`DESPLIEGUE.md`](../../DESPLIEGUE.md)

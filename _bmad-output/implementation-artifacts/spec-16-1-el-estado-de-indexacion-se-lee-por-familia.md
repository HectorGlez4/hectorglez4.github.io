---
title: 'Historia 16.1 — El estado de indexación se lee por familia y se versiona'
type: 'feature'
created: '2026-09-02'
status: 'done'
baseline_commit: '385f57227b0af94e7b64c9fe0849658aa8aee56c'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-16-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Google ha indexado 8 URL de 1.715 y ha descartado 1.534. La pregunta 8 de §14 del PRD —por qué las descarta— **solo se contesta comparando el reparto por familia a lo largo del tiempo**, y hoy esa cifra se lee a ojo en un panel que no deja serie y mezcla 1.639 páginas de una frase con 75 de agregación.

**Approach:** Una orden de `tools/` que consulta la indexación URL a URL, la agrega por familia y **anota una entrada versionada** en `corpus/`, imitando `sesiones-de-sembrado.yml`. Es el instrumento de la Épica 16: sin él, ni 16.2 ni 16.3 pueden decir si funcionaron.

## Boundaries & Constraints

**Always:**
- La escribe **una orden de `tools/`**. Ningún paso del build ni de CI la commitea a `main`.
- **Idempotente por fecha:** una segunda lectura de la misma jornada reemplaza a la primera. Esto mide un estado, no una sesión.
- **Una familia sin lectura lograda se omite; jamás se escribe cero.** El cero real es casi el estado de hoy y tiene que seguir siendo distinguible de la ausencia.
- La entrada registra el **estado de lectura por familia** y, cuando hubo muestreo, **su tamaño**.
- La red vive solo en la cáscara de `tools/` (AD-22). `tools/lib/` sigue puro.

**Ask First:**
- Dónde viven las credenciales y con qué mecanismo. Implica una cuenta de servicio de Google y un secreto, y es decisión de Héctor — como lo fue LC-4.
- Añadir una dependencia npm nueva. El proyecto tiene **cuatro** en producción y `medicion/worker.ts` sentó el precedente de declarar solo la superficie que se usa en vez de traer el paquete entero.

**Never:**
- Que ninguna función de `src/lib/` reciba el estado de indexación, ni por parámetro. Dos construcciones del mismo commit deben seguir dando el mismo sitio (AD-14, AD-24).
- Publicar un número cuando la fuente no está disponible.
- Comparar con SM-1 el agregado del sitio en vez de la familia Cita.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Lectura completa | Corpus por debajo del techo de cuota | Entrada con las cuatro familias y su reparto | N/A |
| Cuota insuficiente | Más URL que peticiones disponibles | Muestreo por familia, con el tamaño de muestra escrito | N/A |
| Fallo parcial | Una familia agota cuota o vence espera | Esa familia **se omite**; las demás se escriben | La entrada dice qué familia no se leyó |
| Segunda lectura del día | Ya hay entrada de hoy | Reemplaza la entrada de hoy | N/A |
| Sin credenciales | Variable de entorno ausente | No escribe nada y nombra lo que falta | Código de salida propio |
| Consulta sin registrar | Orden sin la bandera de registro | Informa y no toca el fichero | N/A |

</frozen-after-approval>

## Code Map

- `tools/objetivo.ts:112,235` -- el precedente: `--registrar` como bandera, y consultar **no** registra.
- `tools/lib/corpus.ts:857-875` -- `registrarSesionDeSembrado`: crea con `wx` para no truncar lo de otra ejecución, y lee antes de escribir. El escritor nuevo sigue este patrón.
- `corpus/sesiones-de-sembrado.yml:1-24` -- su cabecera explica qué mide y por qué. La nueva lleva la suya y **difiere en algo que hay que decir ahí**: aquélla solo añade, ésta reemplaza la entrada del día.
- `tools/recuperar.ts:529` -- la red hoy: `fetch` a pelo, sin cliente de proveedor. Y `medicion/worker.ts:28-38` es el precedente de declarar solo la superficie que se usa.
- `src/lib/superficies.ts` -- de aquí sale qué es publicable y de qué familia; la lista a inspeccionar se deriva, no se escribe.
- `package.json` -- cuatro dependencias de producción. **Ninguna de Google.**
- Restricción externa medida, no la vuelvas a comprobar: la Search Console API expone `Search Analytics`, `Sitemaps`, `Sites` y `URL Inspection`. **No hay informe de cobertura.** `URL Inspection` es una URL por petición, con **2.000/día y 600/minuto** por propiedad. Las ~1.716 de hoy son el 86 % de la cuota diaria.

## Tasks & Acceptance

**Execution:**
- [ ] `tools/lib/` -- módulo puro que, dado el conjunto publicable y un presupuesto de peticiones, decide **qué inspeccionar**: todo si cabe, o muestra por familia con su tamaño -- es la decisión que hay que poder probar sin red.
- [ ] `tools/lib/` -- el escritor de la serie, con reemplazo por fecha y omisión de familia sin lectura -- separado de la red para que sus casos se prueben con datos, siguiendo `registrarSesionDeSembrado`.
- [ ] `tools/` -- la orden: consulta, agrega por familia e informa; registra **solo** con su bandera. Sin credenciales, nombra lo que falta y no escribe.
- [ ] `corpus/` -- el fichero de la serie con su cabecera, diciendo qué mide, de dónde sale y **por qué reemplaza en vez de añadir**, a diferencia de la de sembrado.
- [ ] `DESPLIEGUE.md` -- el paso manual: qué credencial hace falta y que la cuenta de servicio debe darse de alta en la propiedad.
- [ ] Pruebas de la matriz: lectura completa, muestreo, fallo parcial, segunda lectura del día, sin credenciales, y consulta que no registra.

**Acceptance Criteria:**
- Given una entrada con una familia no leída, when se lee la serie, then esa familia está ausente y no aparece como cero.
- Given una serie con dos jornadas, when se comparan, then el reparto por familia es comparable y el tamaño de muestra consta en cada una.
- Given el sitio construido, when se compila, then ningún módulo de `src/lib/` conoce el estado de indexación y dos construcciones del mismo commit dan el mismo `dist/`.

## Design Notes

**Cliente de Google: `googleapis`, decidido por Héctor el 2026-09-02.** Se le presentó la alternativa —un JWT firmado con `node:crypto` y un `fetch`, cero dependencias nuevas, siguiendo el precedente de `medicion/worker.ts`— y eligió el SDK oficial. Queda registrado que se eligió, no que se pasara por alto.

**Entra como dependencia de desarrollo, no de producción.** El sitio no la importa: `tools/` corre por `tsx` en local y en CI, y nada de `src/` la toca. Ponerla en producción cambiaría lo que se instala para construir el sitio, que es justo lo que este proyecto vigila. La versión se **fija**, sin rango.

**El presupuesto de peticiones es el eje del diseño, no un detalle.** Con 1.716 URL y 2.000 peticiones diarias hoy cabe una pasada y no dos. El módulo que decide qué inspeccionar debe ser puro y probable sin red: ahí vive la única lógica interesante, y ahí se cruzará el techo pronto.

## Verification

**Commands:**
- `npx vitest run <las pruebas nuevas>` -- expected: la matriz entera en verde, sin red.
- `npx astro check` -- expected: 0 errores.
- `npm test` -- expected: sin regresión.
- `git status --short` -- expected: solo los ficheros de la historia.

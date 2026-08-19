# Protocolo del bucle de sprint — v3 (Épicas 11–14)

Estado durable del bucle autónomo de la v3. **Si el contexto se compacta o se limpia,
este fichero manda.** El otro origen de verdad es `sprint-status.yaml`; este fichero dice
*cómo*, aquel dice *por dónde vas*.

Sucede a `LOOP-PROTOCOL.md`, que gobernó la v1 y sigue siendo válido en todo lo que este
no contradiga.

Rama: `sprint/sabiduria-v3`. Un commit por historia. **`main` solo recibe épicas enteras.**

## Por qué la rama, y no `main`

`.github/workflows/publicar.yml` se dispara en cada push a `main`. Trabajar en `main`
significaría un despliegue por historia. Trabajando en rama y fusionando solo cuando la
épica está al 100 %, se cumple literalmente «desplegar cuando cada épica esté terminada»:
**una fusión, un despliegue, una verificación en vivo por épica.**

## Orden de ejecución

Sale de `sprint-status.yaml`. Dos historias **no las ejecuta el bucle** (ver «Bloqueadas»):

| # | Historia | Bucle |
|---|---|---|
| 1 | 11.1 La Fuente se recupera, y su metadato sale del documento | sí |
| 2 | 11.2 Ninguna Cita se publica sin aparecer en su documento | sí |
| 3 | 11.3 El objetivo de cada sesión sale del hueco, no del criterio | sí |
| — | 11.4 El Corpus alcanza volumen defendible | **no — Héctor** |
| 4 | 12.1 Una superficie declara en un solo sitio si es publicable | sí |
| 5 | 12.2 La Colección declara sus miembros, y la lista es blanda | sí |
| 6 | 12.3 La Página de Colección, sin canibalizar a la Cita | sí |
| 7 | 12.4 Curar una Colección desde la herramienta | sí |
| 8 | 13.1 Componer varias jornadas de una sentada | sí |
| 9 | 13.2 Una pieza que reúne varias Citas | sí |
| 10 | 13.3 Una Colección anuncia su propia pieza | sí |
| 11 | 14.1 Encender un Modelo de Ingreso es un commit | sí |
| — | 14.2 El visitante que quiere sostener el sitio encuentra cómo | **no — bloqueada por LC-4** |

Dentro de la Épica 12, **12.1 va primero**: 13.1 hereda de ella la declaración única de
superficie publicable, y 12.2 es la resolución blanda sobre la que se apoya todo lo demás.

## Puerta por historia — todo en local, cero minutos de CI

No se pasa a la siguiente historia sin las cinco. Ninguna toca GitHub Actions.

| # | Puerta | Comando | Aplica a |
|---|---|---|---|
| 1 | Tipos | `npx astro check` | todas |
| 2 | Unitarias | `npx vitest run` | todas |
| 3 | Build | `npm run build` | todas |
| 4 | Funcional E2E | `npx playwright test tests/e2e/<historia>.spec.ts` | historias con superficie web |
| 5 | UX en navegador | Chrome MCP contra `localhost:4321` | historias con superficie web |

Línea base al abrir la v3 (2026-08-19): `astro check` 0 errores / 118 ficheros;
`vitest` 588 pruebas en 31 ficheros, todas en verde; ~45 s. **Una puerta que tarda 45 s no
se salta**: si el bucle empieza a saltarse puertas «por tiempo», el fallo es del bucle.

Historias sin superficie web en la v3: 11.1, 11.2, 11.3, 13.1, 13.2, 13.3 y 14.1 son de
`tools/`, esquema o configuración — puertas 1–3 más pruebas de **fallo de build** donde el
criterio lo exija (11.2: una Cita que no aparece en su documento **debe** romper el build).
Con superficie web: 12.1, 12.3 y, cuando se encienda, 14.2.

## Al cerrar cada historia

1. `sprint-status.yaml`: la historia pasa a `done`; su épica a `in-progress` en la primera.
2. Commit en `sprint/sabiduria-v3`: `feat(<épica>.<historia>): <título>`.
3. Línea en `BITACORA.md` con lo verificado y lo que quedó fuera.

## Al cerrar cada épica — el único momento que gasta CI

Cuando **todas** las historias no bloqueadas de la épica están en `done`:

1. Puerta completa en local otra vez, sobre el conjunto: `npx astro check`,
   `npx vitest run`, `npm run build`, `npx playwright test` (la suite entera, no un fichero).
2. `sprint-status.yaml`: la épica pasa a `done`.
3. Fusionar `sprint/sabiduria-v3` en `main` y empujar. **Ese push es el despliegue.**
4. Esperar al flujo: `gh run watch` sobre la ejecución que dispara el push.
   Si sale en rojo, se arregla en la rama y se repite; no se deja `main` roto.
5. **Verificar en vivo** contra `https://sabiduriadebolsillo.net`:
   - `curl -sI https://sabiduriadebolsillo.net` → 200.
   - Las superficies nuevas de la épica responden 200 y con su canónica correcta.
   - Lo que la épica prometía indexable, en `sitemap-index.xml`; lo que no, fuera.
   - Chrome MCP sobre el dominio real, no sobre `localhost`, para las superficies nuevas.
6. Nota de cierre de épica en `BITACORA.md` con la URL viva comprobada.

Coste real: **una ejecución de ~2 min por épica**, más la reconstrucción diaria de las
05:15 UTC que corre igual y no depende del bucle.

## Bloqueadas — no las intenta el bucle

- **11.4 — El Corpus alcanza volumen defendible.** La propia épica la declara la única de
  la v3 que no ejecuta un agente de desarrollo: corre la tubería que construyen 11.1–11.3 y
  se cierra por resultado medido a lo largo de varias sesiones (seis Temas a ≥15 Citas,
  SM-C1 que no baja, tradición latinoamericana del 16,7 % al 40 %). El bucle **construye la
  tubería y para**. Sembrar publica contenido en un sitio público en vivo: es de Héctor.
- **14.2 — El visitante que quiere sostener el sitio encuentra cómo.** Su umbral es
  «LC-1…LC-4 verificadas». LC-1 está: el dominio sirve. **LC-4 no**: el secreto
  `MEDICION_ENDPOINT` no está definido en el repositorio y el Worker de Cloudflare no está
  desplegado. Eso pide una cuenta de Cloudflare y credenciales — de Héctor, no del bucle
  (`DESPLIEGUE.md` §3).

La Épica 14 se cierra por tanto **al 50 %**: 14.1 entra, 14.2 espera a LC-4.

## Condición de parada

Se sigue sin parar. Solo se detiene ante un **bloqueo real**: una decisión que no puede
tomarse sin Héctor, una dependencia externa que no existe, o un criterio de aceptación que
el stack no permite cumplir. **Un test en rojo no es un bloqueo: se arregla.**

Al terminar las once historias del bucle, emitir la promesa de finalización y parar.

## Lo que el bucle no decide

- El **valor del umbral mínimo de Colección**: vive en `src/lib/umbrales.ts` con un valor
  provisional **declarado como tal** (§14.4 del PRD lo deja abierto a propósito). El bucle
  no lo fija; sale de curar las tres o cuatro primeras Colecciones.
- **FR-31** (pieza en movimiento): puerta cerrada por SM-8, y SM-8 no existe mientras LC-4
  no reciba. No se construye.
- **UX-DR37**: `DESIGN.md` y `EXPERIENCE.md` no cubren la Página de Colección. Las
  historias de Colección se escriben con **AD-19** como criterio, no con una espina de UX.
  El bucle no inventa presentación: reutiliza `src/components/TarjetaDeCita.astro`.
- **No se construye un segundo calendario** para 13.1. `corpus/portada.json` ya tiene
  fijaciones y `citaDelDia.ts` ya les da prioridad desde la v1. Es la trampa que
  `RECONCILIACION.md` §2 nombra por su nombre.

## Decisiones de lanzamiento (Héctor, 2026-08-19)

- **Las bloqueadas se saltan y el bucle sigue.** No espera a 11.4 ni a 14.2.
- **Las épicas incompletas se despliegan igual.** La Épica 11 se fusiona con 11.1–11.3
  cerradas y 11.4 pendiente; la 14, con solo 14.1. En `sprint-status.yaml` esas dos épicas
  quedan en `in-progress`, no en `done`: se despliega lo construido, no se miente sobre el
  estado.
- **Tope de 60 iteraciones.**
- **El bucle no vuelve a parar a preguntar.** Ante una bifurcación que no sea puramente
  técnica, toma la opción **más conservadora y reversible**, la deja escrita en
  `BITACORA.md` y en el spec de la historia, y la resume al cerrar la épica. Decidido el
  19/08 tras la consulta de la 11.2.
- **Las 38 Citas actuales son deuda visible que mengua.** El documento de Fuente es
  obligatorio y ninguna Cita **nueva** se publica sin él, pero las 38 que ya estaban
  entran en una lista explícita y versionada de pendientes de verificar, que el build
  cuenta y que la 11.4 vacía. Ni se rompe la reconstrucción diaria, ni el cotejo se
  degrada a opcional.
- **Los minutos de CI no son el motivo.** El repositorio es público y los minutos de
  Actions son gratuitos e ilimitados. Se prueba en local porque una puerta de 45 s da mejor
  realimentación que un viaje de 2 min al CI, y porque mantiene `main` en verde — no por
  coste.

# Protocolo del bucle de Corpus — v4 (Meta de Corpus)

Estado durable del bucle autónomo de la v4. **Si el contexto se compacta o se limpia, este
fichero manda.** Los otros dos orígenes de verdad son `sprint-status.yaml`, que dice por
dónde va, y `npm run huecos`, que dice qué toca ahora.

Sucede a `LOOP-PROTOCOL-V3.md`, que sigue siendo válido en todo lo que este no contradiga.
Lo que sí contradice, y hay que decirlo antes que nada, está en «La regla que se levanta».

## Cambio de estrategia — 24/08/2026, decidido por Héctor

**El bucle trabaja directamente sobre `main`.** Cada push despliega, y eso es lo que se quiere:
publicar es desplegar, sin rama intermedia ni fusión por tramo. Lo que la v3 hacía por épica
—una fusión, un despliegue, una verificación en vivo— pasa a ser **una sesión, un despliegue**.

Lo que **no** cambia: la puerta completa se pasa antes de cada push. `main` no se deja en rojo.
Publicar más a menudo obliga a la puerta a ser más fiable, no menos.

El resto de este fichero se escribió con la rama `sprint/corpus-v4` en la cabeza. Esa rama
existió y llevó las dos primeras sesiones —15.1 y 15.2—; sus commits entraron en `main` por
rebase el 24/08 y desde ahí se trabaja sin ella.

---

Rama original: `sprint/corpus-v4`, abierta **desde `main`** (7918820) y no desde la rama de trabajo
del momento.

**Y en un worktree aparte**, que es lo que no era obvio: el 24/08/2026 había otra sesión
escribiendo `tools/extraer.ts`, `tools/lib/extraccion.ts` y `AGENTS.md` en
`/Users/hec/brainlySabiduria` sobre la rama `extraccion-sin-artefactos`. Un bucle que commitea,
fusiona y **despliega** compartiendo árbol con un escritor vivo se lleva por delante trabajo a
medio escribir y lo publica. El bucle vive por tanto en:

```
~/.config/superpowers/worktrees/brainlySabiduria/corpus-v4
```

Fuera del proyecto a propósito: un `.worktrees/` dentro del repositorio le habría aparecido a
la otra sesión en su `git status` y habría pedido tocar `.gitignore` en su rama. Cuando esa
sesión termine y su rama entre en `main`, este worktree rebasa sobre `main` antes de su
siguiente fusión.

## Por qué existe este bucle

El 24/08/2026 el Corpus cumplía **todos** los criterios medibles de la Historia 11.4 —ningún
Tema por debajo del umbral, tradición latinoamericana en el 41,2 % sobre un suelo del 40 %— y
`npm run huecos` cerraba con «No hay hueco que cerrar». Un bucle que deriva su trabajo del
hueco se quedaba sin trabajo que derivar.

Y mientras tanto, en el repositorio: **59 documentos de Fuente versionados, 489.690 palabras**,
de los que habían salido 252 Citas. Una Cita por cada 1.943 palabras recuperadas. La tubería
que construyeron las Historias 11.1–11.5 estaba entera y sin exprimir; las Épicas 12 y 13
—Colección, Página de Colección, curación, Pieza— estaban enteras y **sin usar una sola vez**.

La v4 no construye tubería. **Explota la que hay.**

## La Meta de Corpus

Decidida por Héctor el 24/08/2026. Vive en `src/lib/umbrales.ts` bajo AD-9 y la cruza con el
estado `src/lib/meta.ts`, que es su único dueño.

| Tramo | Al abrir la v4 | Meta |
|---|---|---|
| Citas publicadas | 252 | **1.000** |
| Temas publicados | 8 | **24** |
| Autores | 17 | **35** |
| Colecciones publicadas | 0 | **12** |
| Techo de concentración por Autor | 45,2 % (Gracián, 114 Citas) | **≤ 15 %** |

El techo es el número que impide alcanzar el volumen por el camino fácil. Sin él, mil Citas se
alcanzan minando más Gracián —el *Oráculo manual* son trescientos aforismos ya troceados, y
Machado hay que leerlo entero para sacar seis—, que es literalmente el sesgo que `objetivo.ts`
describe. **El techo no se cierra despublicando: se cierra diluyendo.** Con Gracián en 114 y el
techo en el 15 %, el Corpus tiene que llegar a 760 Citas para que su peso baje solo.

## El escalonado, que es por coste y no por importancia

Lo deriva `objetivoDeMeta` y lo enseña `npm run huecos` al final del informe. El bucle **no
elige tramo**: lee el que la política declara.

1. **Colecciones** — no siembra nada. Se curan sobre Citas ya publicadas: doce superficies
   indexables nuevas a coste de curación y con cero riesgo editorial. Dejarlo para el final
   sería pagar sembrado por páginas que ya se podían tener.
2. **Concentración** — antes de sembrar más, que lo que se siembre corrija el reparto.
3. **Autores** — el censo, que es lo que hace sostenible el techo de arriba.
4. **Temas** — la anchura. Después del fondo, porque un Tema nuevo nace pidiendo quince Citas
   y abrirlos con el censo corto los deja a todos cortos.
5. **Volumen** — lo que queda cuando la forma del Corpus ya es la buena.

El suelo de publicación sigue mandando por encima de todo esto: si `objetivoDeSesion` declara
un hueco —un Tema por debajo de quince, la tradición por debajo del suelo—, **eso va primero**.
La meta es una ambición; el suelo es una regla del producto.

## La orden que abre cada iteración

```
npm run huecos
```

Sale con el informe entero y cierra con dos bloques: «Objetivo de la sesión» (el suelo) y «Meta
de Corpus» (el tramo). Si el primero declara hueco, se cierra ese. Si dice «No hay hueco que
cerrar», manda el tramo de la Meta.

`npm run objetivo --registrar` **no** cambia en la v4: sigue registrando la sesión con el
objetivo del suelo, y su esquema no se toca. La Meta se lee de `huecos`, que es la orden cuyo
trabajo es decir qué falta.

## Puerta por sesión — todo en local

No se cierra una sesión sin las tres primeras. Las dos últimas, cuando la sesión toca superficie.

| # | Puerta | Comando |
|---|---|---|
| 1 | Tipos | `npx astro check` |
| 2 | Unitarias | `npx vitest run` |
| 3 | Build | `npm run build` |
| 4 | E2E | `npx playwright test` — obligatoria en el tramo de Colecciones |
| 5 | UX en navegador | Chrome MCP contra `localhost:4321` |

Línea base al abrir la v4 (24/08/2026): `astro check` 0 errores / 182 ficheros; `vitest`
1.749 pruebas en 60 ficheros.

**Una puerta que tarda un minuto no se salta.** Si el bucle empieza a saltarse puertas «por
tiempo», el fallo es del bucle.

## Al cerrar cada sesión

1. Commit en `sprint/corpus-v4`: `feat(meta): <lo que cerró la sesión>` para sembrado y
   curación, `feat(<épica>.<historia>)` si además tocó una historia del sprint.
2. Línea en `BITACORA.md` con lo medido: cifra antes, cifra después, y lo que quedó fuera.
3. `sprint-status.yaml` cuando un tramo entero se cierre.

## Al cerrar cada tramo — el momento que despliega

Decisión de Héctor del 24/08/2026: **fusión y despliegue por tramo**, como la v3 hacía por
épica.

1. Puerta completa en local sobre el conjunto, la suite de Playwright entera incluida.
2. `sprint-status.yaml`: el tramo pasa a `done`.
3. Fusionar `sprint/corpus-v4` en `main` y empujar. **Ese push es el despliegue.**
4. `gh run watch` sobre la ejecución que dispara el push. Si sale en rojo, se arregla en la
   rama y se repite; no se deja `main` roto.
5. Verificar en vivo contra `https://sabiduriadebolsillo.net`: las superficies nuevas del tramo
   responden 200 con su canónica correcta, y lo que el tramo prometía indexable está en
   `sitemap-index.xml`.
6. Nota de cierre en `BITACORA.md` con la URL viva comprobada.

**Dentro de un tramo largo se despliega igualmente cada 50 Citas publicadas.** `volumen` son
748 Citas y `concentracion` unas 500: esperar al final del tramo dejaría medio Corpus sin
publicar durante semanas, y un despliegue de setecientas páginas de una vez no es verificable
por nadie. Cincuenta es lo que cabe revisar de un vistazo en el sitemap.

## La regla que se levanta

`LOOP-PROTOCOL-V3.md` declara la Historia 11.4 como la única que el bucle **no** ejecuta, con
este motivo textual: «Sembrar publica contenido en un sitio público en vivo: es de Héctor».

Héctor la levanta el 24/08/2026, a sabiendas y por escrito. El bucle de la v4 siembra, cura,
commitea, fusiona y despliega. Queda escrito aquí y no saltado en silencio, porque de esta
regla salía el límite de hasta dónde llegaba el bucle sin él, y quien lea este fichero dentro
de tres meses tiene que poder ver que se movió a propósito.

Lo que la v4 **no** levanta, y sigue siendo de Héctor:

- **A quién se admite.** Ninguna política de este repositorio nombra un Autor para proponerlo,
  y la de la Meta tampoco: el tramo de concentración habla del «Autor más representado» y
  jamás de su nombre. La prueba de la Historia 9.3 que lo vigila sigue en verde.
- **LC-4 y la Historia 14.2.** Siguen bloqueadas: piden una cuenta de Cloudflare y credenciales.
- **El valor definitivo de `MIN_CITAS_POR_COLECCION`.** El PRD lo deja abierto y sale de curar
  las primeras Colecciones. El bucle las cura; el número lo mueve Héctor, mirándolas.

## Lo que el bucle no decide

- **No baja un umbral para alcanzar una meta.** Si un tramo no se alcanza con el umbral que
  hay, el tramo no se alcanza y se dice. Bajar `MIN_CITAS_POR_TEMA` para tener veinticuatro
  Temas sería cumplir la meta destruyendo lo que la meta persigue.
- **No inventa Fuente.** Ninguna Cita se publica sin su documento versionado y sin pasar el
  cotejo literal de la Historia 11.2 y la puerta de legibilidad de la 11.5.
- **No fabrica Colecciones de relleno.** Una Colección es un criterio editorial que merece
  página. Doce criterios que no existan no se inventan para llegar a doce: se cura lo que dé
  de sí el Corpus y se dice cuántas salieron.
- **Ante una bifurcación que no sea puramente técnica**, toma la opción más conservadora y
  reversible, la deja escrita en `BITACORA.md`, y sigue. No para a preguntar.

## Condición de parada

Tope de **150 iteraciones**. Se para antes solo ante un bloqueo real: una decisión que no puede
tomarse sin Héctor, una dependencia externa que no existe, o un criterio que el stack no permite
cumplir. **Un test en rojo no es un bloqueo: se arregla.**

Cuando `npm run huecos` declare el tramo `alcanzada`, emitir la promesa de finalización y parar.

## Sobre la Historia 11.4

Sus dos criterios medibles están cumplidos —ningún Tema por debajo del umbral, tradición
latinoamericana en el 41,2 %—. El tercero, «SM-C1 que no baja», mide sobre datos que no existen
mientras LC-4 esté abierta. Por eso **11.4 se queda en `in-progress` y no se marca `done`**: lo
que la sustituye como motor del bucle es la Meta de Corpus, no una comprobación que no se ha
podido hacer. Cerrarla sería afirmar algo que nadie ha medido.

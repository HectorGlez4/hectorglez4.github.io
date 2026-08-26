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

**Antes de diagnosticar un despliegue que no arranca, mirar si el servicio está en pie.**

```
curl -s https://www.githubstatus.com/api/v2/components.json
```

La 126.ª vio tres `startup_failure` seguidos sobre el mismo ref y luego un push que **no generó
ejecución ninguna**. Se comprobó, en este orden: que el fichero del flujo era idéntico al del commit
que había desplegado bien media hora antes; que solo hay un flujo; que Actions estaba habilitado con
todas las acciones permitidas; que Pages seguía en `build_type: workflow`; que el repositorio es
público, o sea sin cuota de minutos; y que la API no daba motivo. Todo correcto, y todo irrelevante:
**Actions estaba en `major_outage` y Pages en `degraded_performance`**.

El orden estuvo del revés. Se fue de lo específico a lo general —¿es mi commit? ¿el flujo? ¿la
configuración?— y la pregunta más barata y más amplia quedó para el final. **Lo barato y ancho
primero.** Un despliegue que falla sin motivo visible es antes un servicio caído que un repositorio
roto, y comprobarlo cuesta dos segundos.

**Y se corre con `set -o pipefail`.** En una tubería, `$?` es el estado del **último** proceso: un
`npx vitest run | tail -8` devuelve lo que devuelva `tail`, que es 0 casi siempre —comprobado:
`false | tail -1` sale con 0—. Durante 124 sesiones la puerta se juzgó leyendo el resumen impreso,
que suele coincidir con el estado y por eso nunca saltó. Discrepa justo cuando el programa muere
**después** de imprimir algo que parece bueno: la 124.ª vio una suite con «9 did not run» y «exited
with code 0» debajo. Una suite que no corre entera **no es verde**, aunque lo ponga.

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

---

## Dónde está el bucle — cierre de la 20.ª sesión (25/08/2026)

Veinte sesiones, veinte despliegues en verde, veinte verificaciones contra el dominio. Lo que el
bucle movió:

| | Al abrir la v4 | En la 20.ª sesión | **Ahora (60.ª)** |
|---|---|---|---|
| Citas publicadas | 252 | 452 | **761** |
| Temas publicados | 8 | 11 | **12** |
| Colecciones publicadas | 0 | 12 | **16** |
| Páginas del sitio | 277 | 492 | **806** |
| Autor más representado | 45,2 % | 25,2 % | **15,0 % — dentro del techo** |
| Citas cotejadas contra su documento | — | 430 | **740 (21 pendientes)** |
| Pruebas unitarias | — | — | **2015** |

**Historia 15.3 cerrada.** El techo de concentración se cerró **diluyendo, sin despublicar ni una
sola Cita**, y el Autor que lo abrió sigue teniendo las mismas 114 que tenía en el 45,2 %.

**Y dónde se paró, que es lo que importa para quien siga.** El tramo que la política declara ahora
es **«Admitir 19 Autores más»**, y es el que este fichero reserva más arriba: a quién se admite es
lo único que el producto no delega. Comprobado en la 48.ª sesión leyendo esta misma sección, en vez
de fiarse de la nota de una bitácora.

Lo que el bucle **sí** puede seguir haciendo sin esa decisión, medido y no supuesto:

1. **Ampliar Autores ya admitidos con otras de sus obras.** Es trabajo del bucle —así entraron los
   82 documentos— y de ahí salieron 309 Citas entre la 39.ª y la 47.ª.

   **La cantera NO está agotada, y decir que lo estaba costó trece sesiones sin crecer.** Medido
   contra la API de Wikisource en la 61.ª y la 62.ª, obra por obra de cada Autor declarado, cruzado
   con los documentos ya versionados: Quevedo tenía **diecisiete** textos de más de 8 KB sin
   recuperar, Gracián uno de 95 KB, Machado dos. Nadie lo había medido nunca; se repetía «están
   casi exprimidos» de bitácora en bitácora. **Mídase antes de repetirlo**, y con pausa entre
   peticiones: la API responde 429 si se la barre de golpe.

   Dos cosas se comprueban **antes** de invertir en un documento, y las dos cuestan una orden:

   - **`extraer --seco` y leer la línea del Autor.** Si dice «Autor sin cotejar», no se siembra
     todavía: primero se averigua **por qué**. En la 62.ª esa línea no señalaba un documento sin
     Autor, sino un lector que no sabía leer la firma en negrita de las páginas anteriores a
     `{{Encabezado}}` — y así son casi todas las páginas viejas de Quevedo.
   - **El techo de concentración, contra el recuento de Citas por Autor.** Gracián tiene 95 KB sin
     recuperar y solo cabe que dé **dos** Citas más; invertir ahí es tirar el trabajo. El margen
     está donde el Autor tiene pocas Citas, no donde tiene mucha obra.
2. **Curar Colecciones contra el Corpus que creció bajo ellas.** Sus miembros son una lista escrita
   a mano que no se actualiza sola. Las dieciséis se revisaron entre la 49.ª y la 52.ª —297 → 390
   miembros— y hay que volver a hacerlo cada vez que la siembra avance.
3. **Cotejar el censo cerrado.** Quedan 21. Cinco están en un documento del Corpus salvo por el
   salto de verso, y ésas esperan la decisión reservada; las otras dieciséis no aparecen en ninguna
   edición versionada.

**Un Tema número trece no llega**, y la razón está medida: el Corpus creció alimentando los mismos
doce, así que ningún asunto nuevo junta quince Citas sin solaparse con uno de ellos por encima de
lo que se solapan entre sí (máximo 33 %, mediana 6 %).

**Cómo se desbloquea, en una línea:** nombres de Autor o URL de Wikisource/Gutenberg. Con eso el
bucle recupera con `tools/recuperar.ts`, extrae, coteja, publica y despliega sin más intervención.


## Apéndice medido — el estado de la cantera al cerrar la 123.ª sesión

Esta sección **no cambia ninguna regla**: recoge lo que se ha medido entre la 108.ª y la 123.ª para
que nadie repita el barrido. Todo lo de abajo está comprobado contra las dos Fuentes, no supuesto.

### La segunda Fuente estaba admitida y sin usar

**Project Gutenberg** figura en el conjunto cerrado de Fuentes desde el principio —dominio público,
reutilización permitida— y en la 108.ª tenía **un solo documento de 143**. Abrirla dio 128 Citas en
quince sesiones. Da **libros enteros** donde Wikisource da capítulos: un documento puede producir
más de mil candidatas.

### La escala de géneros, medida y afinada

| género | rendimiento |
|---|---|
| ensayo aforístico (frases sueltas) | ~40 % |
| ensayo de tesis · periodismo de tesis | ~16 % |
| carta narrativa | ~13 % |
| periodismo de **coyuntura** con nombres propios | 6 % |
| costumbrismo con diálogo dialectal | 2 % |
| antología de un Autor **ya sembrado** | 0,7 % |
| novela, crónica, índice, entremés, **sátira alegórica** | ≈1 % o **0** |

Y tres matices que costaron sesiones aprender:

· **Dentro de una obra**, el tramo doctrinal rinde más que el histórico-coyuntural (104.ª), y **la
  densidad cae con la longitud de la frase** (115.ª): una sentencia de sesenta caracteres suele ser
  una tesis; una de doscientos ochenta, un procedimiento.
· **No se recuperan antologías de Autores cuya obra principal es verso** (120.ª): traen su poesía
  con los saltos perdidos, indistinguible de prosa para la tubería e inadmisible mientras la
  decisión del verso siga reservada.
· **Antes de recuperar un volumen, mirar qué más trae** (116.ª): uno anunciaba obra nueva y
  recopilaba además otra ya sembrada, con ortografía antigua que el cotejo literal no reconoce.

### Lo que queda por Autor, comprobado en las dos Fuentes

De los Autores admitidos con **margen amplio bajo el techo**, se comprobó uno por uno:

· Uno con 47 páginas sin recuperar: **todo entremeses**, más biografía escrita por otro.
· Uno con 92 páginas y sitio para 56: **todo sátira burlesca**; la mayor dio 403 candidatas y cero
  Citas. En la otra Fuente, novela picaresca y dos traducciones **al inglés**.
· Uno con sitio para 47: solo **novelas** y una traducción al inglés.
· Dos de la cola: **narrativa costumbrista**, medida al 2 %.
· Dos más: nada disponible.

**Ninguno tiene ensayo o prosa aforística sin tocar en ninguna de las dos Fuentes.**

### Lo que sí queda, y cuánto

· **510 candidatas legibles sin leer** de dos libros ya versionados —los tramos técnicos y
  coyunturales, que rinden poco pero no cero—.
· **Curar Colecciones** cada vez que la siembra avanza: sus miembros son listas escritas a mano.
· El **censo cerrado**: 21 Citas, de las que cinco esperan la decisión del verso y una está en otra
  traducción (98.ª).

### Y una obra descartada por lo que dice, no por cómo rinde

Entre las páginas disponibles de un Autor admitido hay un **panfleto antisemita**. No se recuperó y
no se recuperará: ninguna Cita de ahí cabe en este sitio. Queda escrito para que no se lea como un
descuido ni se «arregle» en una sesión futura.


## Apéndice medido — sembrar hacia un Tema, y por qué casi nunca sale (126.ª sesión)

El apéndice anterior midió el rendimiento **por género**. Este mide el rendimiento **por asunto**,
que es lo que hace falta cuando la meta que queda abierta es la de Temas y no la de Citas.

### La cantera es mucho mayor de lo que decía la cifra anterior

El apéndice de la 123.ª anota «510 candidatas legibles sin leer», y esa cifra era de **dos libros
concretos**. Medida sobre todo el conjunto en revisión, con el filtro de siempre —conectores fuera,
aparato de la Fuente fuera, longitud entre 80 y 220— son **3415 candidatas legibles y en rango**.

### Contar por asunto engaña en los dos lados, y ya está cuantificado

**Del lado publicado**, un asunto necesita del orden de **30-35 coincidencias por regex para dar 15
Citas reales**. Las que se caen lo hacen de tres maneras que conviene distinguir, porque la primera
no se arregla leyendo más:

· **el Tema que ya existe con otro nombre** —45 coincidencias de las que 26 ya estaban en un mismo
  Tema publicado—;
· **el regex flojo** —66 coincidencias que bajan a 8 al quitar `\bsolo\b`; 38 que bajan a 24 al
  dejar el sustantivo y quitar el adjetivo—;
· **la palabra que aparece al paso**, que es el resto.

**Del lado de la cantera**, el engaño es el mismo con otra cara: el asunto aparece en la frase pero
**la frase cuenta una historia**. Cuatro asuntos leídos de punta a punta, 232 candidatas:

| asunto | cantera | leídas | firmes | rendimiento |
|---|---|---|---|---|
| A | 67 | 54 | 2 | **4 %** |
| B | 45 | 45 | 6 | **13 %** |
| C | 59 | 20 | 2 | **10 %** |
| D | 61 | 18 | 2 | **11 %** |

El que prometía la cantera más limpia fue el peor: resultó **narrativa entera**. Lo que descarta una
candidata, una y otra vez, son tres cosas y no el tema: **empieza remitiendo** («Tal es…», «Éste
es…», «Muchas puede haber…»), **cita a otro** («Ya Locke notó…», «Yo os digo con Renan…»), o **trae
nombre propio y anécdota**.

### El tramo de Autores YA NO está reservado (134.ª, decidido por Héctor)

Durante toda la v4, «a quién se admite» fue **lo único que el producto no delegaba**. El 26/08/2026
Héctor lo delegó: «agrega más autores». El bucle elige.

Lo que **no** cambia, y hay que releerlo antes de cada alta:

· **La meta cuenta Autores que PUBLICAN**, no declarados —`src/lib/meta.ts` lo dice y lo razona—.
  Crear fichas vacías no mueve el tramo. Admitir es recuperar, versionar, extraer, leer y publicar.
· **El suelo del 40 % de tradición latinoamericana** sigue siendo un compromiso del PRD, y se mide
  sobre los admitidos, no sobre los sembrados.
· **Se elige por género medido, no por fama**: prosa doctrinal y aforística. Un nombre ilustre cuya
  obra disponible es novela o crónica entra para dar dos Citas.
· **Y se mira el volumen antes de crear la ficha** (116.ª): en la 134.ª, «Meditaciones» resultó ser
  una sátira política de otro Autor —título homónimo— y «Soliloquios», un índice sin texto. Las dos
  se retiraron antes de crear ningún Autor.

El camino, en orden: buscar la dirección donde sea —el navegador vale—, `recuperar` para descargar,
que es la única orden con red; comprobar la cabecera del documento; `autor crear` con tradición;
`extraer --autor`; leer; `revisar --aprobar`.

### Lo que descarta no es el conector, es el agujero (133.ª)

Durante 130 sesiones se apartó **todo** lo que empieza por conector. Demasiado grueso: se estaban
tirando dos de las mejores frases de un libro —«En resumen, no hay cuestiones pequeñas…», «En
general, puede afirmarse que no hay cuestiones agotadas…»—.

· **El deíctico señala algo ausente y deja un agujero** —«Tal es», «Esto», «Aquellos», «Éste es»,
  «Otro»—: sin lo anterior, la Cita no se entiende. **Se aparta.**
· **El marcador de cierre no señala nada** —«En resumen», «En general»—: la frase que le sigue está
  entera, y nadie se queda preguntando resumen de qué. **Se admite.**

No es un permiso: la mayoría de los conectores siguen apartando, porque la mayoría son deícticos.
Es la vara de la 129.ª —«una Cita es un fragmento que sigue diciendo lo mismo cuando se queda
solo»— aplicada a la primera palabra en vez de a la frase entera.

### Una obra no tiene un rendimiento: tiene tramos (133.ª)

Medido tres veces en tres obras distintas, y siempre igual: el tramo doctrinal rinde y el otro no.

| obra | dibujo |
|---|---|
| tratado (104.ª) | doctrinal **>** histórico-coyuntural |
| carta (131.ª) | doctrinal 33 % **→** dirigida a una persona 13 % |
| tratado (133.ª) | doctrinal 27 → 33 → **38 %** → polémica contra otra escuela **8 %** |

Cuando el rendimiento se desploma de golpe dentro de una obra que venía subiendo, **no es cansancio
del lector: es que empezó otro tramo**. Se mira qué clase de prosa es antes de abandonarla, y si
es disputa —citas ajenas, nombres propios, comillas sin cerrar— se cambia de obra sin más.

### Se elige OBRA, no firma (131.ª)

La cantera se contaba por Autor y se leía también por Autor. Pero **una firma tiene varias obras y
el rendimiento es del género**, así que leer «de tal Autor» es leer al azar entre sus libros. La
131.ª encadenó tres sondas al 23 %, al 8 % y al 13 % antes de ver que estaba leyendo una
**conferencia política** —nombres propios, coyuntura— mientras la prosa aforística de ese mismo
Autor estaba en otro volumen.

La cuenta por documento lleva una columna que la de por firma no tenía: **cuántas Citas ha dado ya
esa obra**. Es la que separa la veta exprimida de la intacta, y desmiente el total:

| cantera | ya publicadas | qué es |
|---|---|---|
| 210 | 7 | consolación doctrinal — **intacta y buena** |
| 261 | 2 | parábolas — **intacta y mala**: es el género del 1 % |

Un total alto no es una veta. Con la obra bien elegida —doctrinal, sin tocar— el rendimiento pasó
de 8-13 % a **33 %**.

Y dentro de una misma obra sigue valiendo lo de la 104.ª: la carta abre doctrinal y luego se dirige
a una persona con nombre; el primer tramo dio 33 % y el segundo 13 %.

### La longitud se invierte según el género (129.ª)

La 115.ª midió que **la densidad cae con la longitud de la frase**: una sentencia de sesenta
caracteres suele ser una tesis y una de doscientos ochenta, un procedimiento. Es cierto en prosa
aforística y doctrinal, y **se da la vuelta en el ensayo polémico**. Medido en una obra, tres tramos,
89 candidatas:

| tramo | leídas | firmes | rendimiento |
|---|---|---|---|
| 55-94 | 19 | 0 | **0 %** |
| 95-175 | 57 | 15 | 26 % |
| 176-260 | 13 | 7 | **54 %** |

El porqué se ve leyendo: en un ensayo que discute, **las frases cortas son el andamiaje del debate**
—«Nuestros adversarios, ¿niegan una verdad que sostenemos?», «Levantaremos otro enfrente»— y la
tesis necesita su cláusula entera para sostenerse sola. En prosa aforística pasa justo lo contrario.

Así que el tramo de lectura **no se fija de antemano**: se prueban dos bandas cortas de la misma
obra y se sigue por la que rinde. Costaba diecinueve candidatas averiguarlo y ahorra cientos.

### La conclusión, que es una cuenta cerrada

Sumando lo publicado y lo que la cantera puede dar, **ninguno de los cuatro asuntos llega a 15**.
Con el Tema abierto en la 125.ª son **18 de 24**, y los seis que faltan **no salen de aquí**: salen
de Autores nuevos, que es la decisión reservada. No se baja el umbral y no se estiran los juicios de
pertenencia, que es bajarlo por otra puerta.

Queda medido para que ninguna sesión futura repita las cuatro lecturas creyendo que no se han hecho.

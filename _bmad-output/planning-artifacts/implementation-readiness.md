# Puerta de preparación — Épicas 23 a 28 (la v8)

> Salida de `bmad-sprint-planning`. Pasada del 2026-10-19 sobre `epics.md` en 20d5082c (desde «## Requirements Inventory — v8», ~3909, hasta el final: 50 historias, de la 23.1 a la 28.5, más las enmiendas v8 de las Historias 2.1, 2.8, 3.1 y 4.1) y sobre `sprint-status.yaml` en be6335de. Se contrastaron con el PRD v8.1 (`prd.md` y `addendum.md`, c73ebbf8), la UX v8 (`DESIGN.md`, `EXPERIENCE.md` y `mockups/v8-*.html`, fd55d2bc), la espina v8 (58a4b437), el SPEC v8 (c255188f), el diseño `docs/superpowers/specs/2026-10-17-v8-cita-como-centro-design.md`, las resoluciones de Héctor del 2026-10-19 (ya volcadas en `epics.md`), `AGENTS.md`, `DESPLIEGUE.md`, el código real y el estado de `origin/main`. La skill produce este fichero y no se edita a mano: la pasada siguiente lo sustituye entero.

## Veredicto: CONCERNS

Ninguna historia exige inventar una decisión que cambie comportamiento, datos versionados, URL o métricas sin que algún artefacto la registre, y ninguna contradice un artefacto que mande sobre ella de un modo que impida empezar por la 23.1. Tres hallazgos llegaron a la verificación como `bloquea`: dos bajaron a `concierne` y uno a `nota`. El tablero ya recoge las seis épicas en `backlog`. Antes de `bmad-build` sobre la 23.1 conviene dejar escritos diez huecos, y un undécimo antes de la Épica 27. Casi todos están en la medición de la Épica 23 y en las condiciones para fusionarla. Dos piden un acto de Héctor que no puede esperar:

- **Anotar hoy la fecha de la reparación.** El registro da por hecho que la reparación «va antes». En realidad ya está en vivo desde el 2026-10-19 a las 09:22 UTC, pero no trae las constantes de SM-11 de las que dependen la 26.11 y la 28.5, y la principal local no la tiene.
- **Decidir qué hace D1 con el orden de llegada** antes de que la 23.2 congele el modelo de almacenamiento.

Cerrar todo esto primero o avanzar lo decide Héctor.

## Cómo se pasó

Hubo nueve lentes independientes:

- PRD y métricas (`prd`)
- espina de arquitectura (`arq`)
- UX (`ux`)
- SPEC y contrato (`spec`)
- referencias al código real, en dos mitades: Épicas 23–25 (`ref1`) y 26–28 (`ref2`)
- independencia y ambigüedades (`ind`)
- conflictos entre artefactos (`conf`)
- pre-mortem del constructor (`pm`)

Cada hallazgo pasó por dos verificadores adversarios. Uno intentó refutarlo con la fuente delante y otro juzgó si de verdad obliga a inventar algo y con qué gravedad. Al final, un crítico de completitud (`comp`) buscó lo que ninguna lente había visto.

En total salieron **127 hallazgos**: **100 sobreviven** y **27 se descartaron**. Además, **666 afirmaciones de las historias se comprobaron y resultaron correctas**.

Gravedad final de los supervivientes: **0 `bloquea`, 13 `concierne` y 87 `nota`**. Los proponentes habían dado 3 `bloquea`, 49 `concierne` y 48 `nota`. De los tres `bloquea`:

- *prd-1* (la línea base por superficie) bajó a `nota`: FR-56 ya da la regla.
- *pm-1* (las fechas de SM-11) bajó a `concierne`.
- *comp-1* (el rowid de D1) bajó a `concierne`: su arreglo no pide migración.

De los 49 `concierne` propuestos, 38 bajaron a `nota`. Fundidos los duplicados entre lentes, los 13 `concierne` quedan en once puntos.

Supervivientes por lente: `prd` 11 de 12, `arq` 8 de 12, `ux` 9 de 12, `spec` 10 de 13, `ref1` 9 de 11, `ref2` 10 de 13, `ind` 11 de 15, `conf` 9 de 12, `pm` 14 de 15 y `comp` 9 de 12.

## Lo que conviene registrar antes de la 23.1

Los diez puntos son `concierne`. Van por orden de peso y, a igual peso, por la primera historia a la que tocan.

### 1. El rowid de D1 guarda el orden de llegada y encadena la lectura con la salida de una misma persona (23.2, 23.7, 23.10) — *comp-1*

**Dónde:** `medicion/esquema.sql` 5–12: la tabla `eventos` no tiene clave ni `WITHOUT ROWID`, así que SQLite le pone un rowid creciente. `medicion/worker.ts` 53–66 hace un `INSERT` por baliza. En `prd.md` 1079, FR-56 dice: «ningún campo sirve para unir dos registros de la misma persona… una hora o un instante encadenarían una salida con la lectura que la sigue». Lo mismo en `addendum.md` 242, la espina (187, 203 y 212: «las migraciones no se revierten») y `epics.md` 5113–5114 (23.2: «ninguna lleva hora»), 5317–5318 (23.7: la salida va justo detrás de la lectura) y 5513 (23.10: la orden «no reconstruye sesiones»).

**El hueco:** el plan prohíbe la hora para que nada encadene una salida con la lectura que la sigue. Pero con una lectura humana al día (`prd.md` 1285 y 1473), `ORDER BY rowid` devuelve el recorrido entero: vista, lectura, salida interna con su zona, vista de la página siguiente. La v7.1 ya encadenaba vista y copiado; la v8 lo hace más fino al añadir la lectura y la zona. Ningún artefacto nombra el rowid (`grep` vacío en todo el repositorio). La 23.2 es la historia que fija el modelo de almacenamiento.

**Suposición que un colega daría por buena:** «Sin columna de hora, la jornada es la única unidad de tiempo y no hay nada que encadenar».

**Cierra:** una decisión de Héctor en AD-13 (`bmad-architecture`) antes de la 23.2, o una línea en la propia 23.2. El arreglo barato es un rowid aleatorio en el `INSERT` del Worker (`INSERT INTO eventos (rowid, …) VALUES (abs(random()), …)`), que no cambia la huella de columnas de AD-14 ni pide migración, más un `UPDATE` que baraje lo ya escrito. La otra salida es aceptarlo por escrito. La 23.10 no cambia: ya lee solo recuentos.

### 2. La reparación está en vivo sin las fechas de SM-11 que la 26.11 y la 28.5 dan por creadas (26.11, 28.5; acto de hoy) — *ind-1, pm-1*

**Dónde:**
- `origin/main` 67671d1293: en el run 39227057115 de «Publicar», el trabajo «Desplegar» terminó en *success* el 2026-10-19T09:22:50Z.
- `src/lib/umbrales.ts` 90–96, tanto en local como en `origin/main`, solo declara `SM11_VIGENTE`, `PRIMER_DESPLIEGUE_DE_OBRAS = '2026-10-10'` y `SEMANAS_HASTA_JUZGAR_SM11`. `tools/lib/indexacion.ts` 811–834 (`lineasDeSm11`) no nombra ninguna fecha nueva.
- `epics.md` 4141, 4621 y 4784: «Sin épica: las tres fechas nuevas de SM-11, que se construyen con la reparación de la publicación». 7212 (26.11): «sin ella, esta historia no empieza». 8074 (28.5): «la constante que la reparación de la publicación dejó».
- `prd.md` 1251 y 1330, `addendum.md` 395 y `SPEC.md` 144.
- `sprint-status.yaml` 381–382 nombra la reparación solo en un comentario.

**El hueco:** el registro dice que la reparación va antes, no que ya llegó sin lo que tenía encargado. Su diff no toca `umbrales.ts` ni `indexacion.ts`. Así, las tres constantes y la línea SM-11 del informe se han quedado sin dueño: ninguna historia ni entrada del tablero las construye. La regla «cada fecha se anota el día en que su despliegue llega al sitio en vivo» (`epics.md` 4141) ya se está incumpliendo justo con la fecha que más pesa: las Obras indexables pasan de 81 a 277 y los Autores de 65 a 135 (`SPEC.md` 144, `prd.md` 1330). La precondición de la 26.11 y la redacción de la 28.5 ya no se pueden cumplir tal como están escritas.

**Suposición que un colega daría por buena:** «La reparación dejó las constantes; en la 26.11 solo hay que rellenar la fecha».

**Cierra:** una decisión de Héctor, ya:
- anotar el 2026-10-19, que es la fecha del despliegue y no la del commit del 18/10, antes de que caduque el registro de Actions;
- decidir quién crea las constantes: un commit de mantenimiento en la principal o una historia en la 23.

Después, `bmad-create-epics-and-stories` corrige la precondición de la 26.11 y la 28.5. La forma sale de `umbrales.ts`: una cadena de jornada, como `PRIMER_DESPLIEGUE_DE_OBRAS`, y `undefined` mientras no haya fecha, como `CONGELACION_DE_OBRAS`. La línea SM-11 se prueba en unidad sin credencial (`tests/unit/indexacion.test.ts` 1274 y 1353).

### 3. Entre la 23.3 y el merge de la 23.11, la huella no ve un receptor que haya vuelto atrás (23.3, 23.11) — *pm-3, spec-13*

**Dónde:**
- `epics.md`:
  - 5135–5137 (23.2): la huella solo se escribe después de las balizas de prueba.
  - 5160–5161 y 5168–5170 (23.3): la vuelta atrás manda volver a desplegar «desde la principal el receptor que había» sin invalidar la huella.
  - 5176–5178.
  - 5529–5531 (23.11): solo `npm test`.
  - 5555–5558.
- `DESPLIEGUE.md` 280–285 y 392–395: `cd medicion && npx wrangler deploy` desde el checkout.
- La espina, 214: «la huella lo juzga contra lo desplegado, no solo contra el commit».
- `medicion/receptor.ts` 13–15.
- El precedente: el Worker se volvió a desplegar desde la principal el 2026-10-11.

**El hueco:** la huella es una foto del día de la 23.3, versionada en la rama. Durante semanas, la principal sigue con el receptor v7.1 y con un runbook que lo vuelve a desplegar desde el checkout. Un despliegue así descarta sin avisar `via`, `zona`, `tramo`, `filtros` e `indexable`. La 23.11 corre `npm test`, donde la huella pasa igual, y no envía ninguna baliza.

El daño se reparte así:
- Los cuatro eventos nuevos se verían sin filas desde la primera jornada (5555–5558).
- Lo caro son los campos nuevos de eventos que ya existen, como `via` en la vista. Llegan a nulo, que AD-13 no distingue de un cero, justo en el arranque del corte de SM-8.

**Suposición que un colega daría por buena:** «La huella commiteada garantiza que el receptor desplegado sabe guardar el vocabulario nuevo».

**Cierra:** `bmad-create-epics-and-stories`, en dos sitios:
- En la 23.11: el día del merge, repetir desde la rama la comprobación con balizas de la 23.2. La 23.2 no define un modo «solo comprobar»: hay que escribirlo, o volver a correr `desplegar` sin migraciones pendientes.
- En la vuelta atrás de la 23.3: escribir que la huella queda rancia y que la 23.3 se repite.

`DESPLIEGUE.md` §3 debería decir además que, mientras viva la rama de la 23, el receptor no se vuelve a desplegar desde la principal.

### 4. SM-5 y SM-7: ¿eventos o lecturas con acción? Si son lecturas, el tope va en la emisión (23.1, 23.5, 23.10, 25.7) — *prd-6*

**Dónde:**
- `prd.md`:
  - 1314 (SM-5: «≥ 3 % de las lecturas … generan una acción») y 1318 (SM-7).
  - 1310 (SM-3: «si una lectura pudiera aportar más de una salida, la cifra dejaría de ser una proporción»).
  - 1331 (SM-12: «la cifra puede pasar de uno»).
  - 1343 (SM-C3: «Suma de copiados y descargas»).
- `epics.md`:
  - 3979 y 5498 (23.10).
  - 5222 (23.5) y 5318 (23.7): «como mucho una por carga», solo para la lectura y la salida.
- La espina, 192–193.
- El código:
  - `src/islands/CopiarCita.astro` 107–112 emite en cada clic.
  - `DESPLIEGUE.md` 316–318 y 431–436 cuenta eventos.
- Los datos y el diseño:
  - `addendum.md` 358: «4 copiados (la misma Cita, el mismo día)».
  - El diseño, 516.

**El hueco:** la letra del PRD habla de proporción de lecturas con acción. Sin identificador (NFR-11), lo único que se puede calcular es eventos entre lecturas, y copiar tres veces suma tres. La 23.10 no dice cuál es el numerador ni avisa, como hace SM-12, de que la cifra puede no ser una proporción. Si Héctor quiere lecturas con acción, solo se pueden contar con un tope por carga en la emisión, común al copiado y a la descarga: eso es la 23.1 y la 23.5, no `tools/`. Si se añade después de la 23.11, se abre un corte en una línea base que se cierra por tamaño y no por calendario. Con unas 14 lecturas humanas en dos semanas, eso son meses.

**Suposición que un colega daría por buena:** «El numerador es el número de eventos de copiado y de descarga en las rutas `/cita/`».

**Cierra:** `bmad-prd`, para decidir si SM-5 y SM-7 cuentan eventos o lecturas con acción. Si son eventos, que lo declare como hace SM-12. Si son lecturas con acción, `bmad-architecture` añade a AD-13 el tope por carga antes de fusionar la 23.

### 5. Volver a `/buscar/` sin la caché de atrás y adelante registra otra vez la misma búsqueda (23.8, 27.4) — *prd-7*

**Dónde:**
- `prd.md`:
  - 1074 (FR-56: «Volver a un estado ya registrado, o que el navegador restaure la página, no registra otra») y 1069.
  - 1317 (SM-6) y 1334 (SM-13, que solo declara el sesgo de la pestaña nueva).
- La espina, 197, y `addendum.md` 239.
- `epics.md`:
  - 5388–5394 (23.8): solo `pageshow` con `persisted`.
  - 7486–7488 (27.4): «sin esa caché, la página se rehace desde la dirección, como una llegada».
- `SPEC.md` 139.

**El hueco:** los estados ya emitidos se guardan en memoria, así que solo sobreviven a una restauración con `persisted`. Donde no hay esa caché (cabe esperar los navegadores dentro de aplicaciones Android, que es donde la v8 supone que está la audiencia), cada «atrás» desde un resultado es una llegada con `?q=` que se asienta otra vez. Si la búsqueda había dado cero, deja además otra `busqueda-sin-resultados` con su texto.

Ejemplo: «resultado, atrás, resultado» da 2 salidas y 1 búsqueda con la caché, y 2 y 2 sin ella. SM-13 y SM-6 cambian así de denominador según el navegador sin que conste, y el registro de curación de FR-8 duplica textos.

**Suposición que un colega daría por buena:** «La caché de atrás y adelante está siempre; cualquier otra carga es una llegada nueva».

**Cierra:** `bmad-architecture` en AD-13, con una de dos salidas:
- tratar como ya emitido el estado inicial de una navegación `back_forward` sin `persisted`, sin identificador;
- declarar el sesgo en SM-6 y SM-13.

Después, el spec de la 23.8 y de la 27.4. Arreglarlo cuando la línea base ya esté abierta cuesta un corte en las dos series de búsqueda.

### 6. Lighthouse «con la medición encendida», la matriz de teléfonos y la 25.3 escriben en el D1 de producción (23.11, 24.6, 26.11, 25.3, 25.7) — *pm-6, spec-1*

**Dónde:**
- `epics.md`, las pruebas en cuestión:
  - 5534–5536 (23.11), 5917–5919 (24.6) y 7222 (26.11).
  - 6231–6233 (25.3, en el sitio en vivo a propósito).
  - 6524 y 6531 (25.7, por túnel).
- `epics.md`, lo que regula el receptor y la línea base:
  - 5084, 5252 y 5441: solo Playwright va «contra un receptor local».
  - 5462: solo se excluye `/__comprobacion/`.
  - 5504–5506: la línea base empieza en la primera jornada con filas.
  - 5562: un agente puede correr Lighthouse.
- `DESPLIEGUE.md`:
  - 296–297: la URL del receptor de producción.
  - 305–307.
  - 325–326: el receptor «no comprueba el origen de la baliza».
  - 399–414.
- El código:
  - `medicion/worker.ts` 44–55 y `medicion/esquema.sql`: no se guarda el host.
  - `src/islands/ImagenDeCita.astro` 171.
  - `src/components/Armazon.astro` 146: `og:url` es la canónica.

**El hueco:** sin `MEDICION_ENDPOINT` no hay medición, así que medir «con la medición encendida» obliga a dar un valor. El único receptor documentado es el de producción. El receptor no comprueba el origen y la tabla no guarda el host, de modo que cada carga, lectura, salida o compartición de prueba cuenta como una visita.

Hay tres agravantes:
- **La línea base puede empezar antes de tiempo.** El receptor v8 se despliega en la 23.3, antes del merge. Una pasada de Lighthouse en la 23.11 dejaría lecturas en rutas reales y haría empezar la línea base en una jornada que nunca estuvo en vivo.
- **Hay pruebas que tocan el vivo aunque la rama no mida.** La 25.3 registra `comparticion-de-imagen` en el sitio en vivo a propósito. El clic en la tarjeta de Facebook de la 25.7 lleva a la canónica en vivo aunque la rama vaya sin punto final.
- **Pesa mucho para lo poco que hay.** Con 2 comparticiones de imagen en seis semanas (`prd.md` 429), una tarde de pruebas puede ser la mayor parte de la línea base de SM-7 y SM-12.

Esas filas se pueden borrar con `wrangler` (`DESPLIEGUE.md` 413), pero solo si alguien anotó qué jornadas y qué rutas fueron.

**Suposición que un colega daría por buena:** «Construyo como el CI, con el secreto de producción, para medir lo real».

**Cierra:** `bmad-create-epics-and-stories`, en la 23.11, la 24.6, la 26.11, la 25.3 y la 25.7:
- Lighthouse, contra un receptor local o un punto final ficticio (el precedente es `tests/e2e/receptor.spec.ts` 93).
- En las pasadas que tienen que tocar el sitio en vivo, anotar jornada y ruta para borrarlas o para que la 23.10 las excluya.

Si hace falta probar la medición en el dispositivo, lo decide Héctor.

### 7. Nadie compara las firmas mecánicas antes de dar la línea base por buena (23.5, 23.10, 23.11) — *prd-2, pm-4*

**Dónde:**
- `prd.md` 1068 (FR-56, consecuencia verificable: «se compara qué proporción de las vistas llega a lectura en las firmas mecánicas… frente al resto», antes de fijar ninguna meta) y 1510 (§15).
- `addendum.md` 354–356 (la tabla de firmas) y 409; `SPEC.md` 232.
- `epics.md`:
  - 3937: el inventario de FR-56 no la recoge.
  - 4589: la cobertura tampoco.
  - 5253 (23.5): el único sitio de la v8 que la nombra, como disparador.
  - 5443–5515 (23.10) y 5517–5570 (23.11).
- `DESPLIEGUE.md` §3: no hay ninguna consulta de firmas.

**El hueco:** que 8 s o una interacción separen personas de máquinas es un supuesto que hay que contrastar en D1, y ninguna historia construye esa comparación, la corre o la pone a cargo de alguien. La 23.10 no da las lecturas por marca de origen, así que de su informe no sale la razón lectura/vista de Threads.

Las dos firmas no están igual de definidas:
- La de Threads tiene una definición que se puede usar a mano: «2 vistas con marca + 1 sin marca» por par ruta-jornada.
- La de la ráfaga solo dice «una vista por ruta en cientos de rutas», sin umbral ni ventana, y además sobre lecturas que no llevan hora.

La v8 cambia también el instrumento, porque la marca se cuenta una vez por llegada, así que la firma del 2026-10-16 puede no repetirse tal cual aunque la contaminación siga. Dentro de la propia v8, la 25.7 (SM-C3) y la 28.5 (portada) ya leen la línea base sin este cotejo.

**Suposición que un colega daría por buena:** «La comprobación la hace Héctor a mano; la orden no tiene que darla». Y la orden da la línea base por cerrada en cuanto llega al mínimo.

**Cierra:** `bmad-create-epics-and-stories`, con un criterio en la 23.10 o la 23.11 que pida la razón lectura/vista por firma y diga quién la mira y cuándo. La definición operativa de la ráfaga la pone `bmad-prd` o la decide Héctor. En la misma pasada se puede cerrar el caso parecido de las búsquedas asentadas (*comp-3*, en Notas).

### 8. «Dos ventanas seguidas» de SM-C3 y SM-C5: no hay ventana definida ni una serie que la orden entregue (23.10, 25.7, el juicio de la 24, 26.11, 28.5) — *prd-3, spec-11, ind-15*

**Dónde:**
- `prd.md` 1345–1346 (SM-C3 y SM-C5) y 1473 (§14, pregunta 9: abre solo el umbral de SM-C5).
- `SPEC.md` 219 y 249.
- `epics.md`:
  - 3988 y 3990.
  - 5462–5468 y 5496–5506 (23.10): jornadas cerradas en UTC; SM-C3 y SM-C5 van «junto a SM-5», sin ventanas ni rango.
  - 6579–6581 (25.7): «sin trabajo propio».
  - 4858–4860 (Épica 24): «contra su propia serie y contra SM-C5».
  - 7240 y 7248 (26.11), 8084 y 8096 (28.5).
- `DESPLIEGUE.md` 430–435: SM-C3, por jornada. La espina, 573.

**El hueco:** que una ventana es un bloque de jornadas cerradas consecutivas que reúne `MIN_LECTURAS_DE_LINEA_BASE` se deduce. Lo que falta es que la orden la entregue. Hay dos exigencias:
- La 25 se lee «con la orden de la 23.10, sin trabajo propio».
- La 24, la 26 y la 28 se juzgan «contra su propia serie».

Las dos piden una serie en el tiempo: por jornada, por ventanas a partir de la línea base o con un rango. Ningún criterio de la 23.10 la pide. Quien cumpla solo esos criterios entregará totales desde la línea base, y el juicio de los dos frenos, el de la 24 y el de la 25, quedará a ojo. «Saltar» tampoco tiene umbral en SM-C3, que dice «en proporción parecida»; el de SM-C5 está abierto en §14.

**Suposición que un colega daría por buena:** «La orden da totales acumulados y Héctor parte las ventanas a mano».

**Cierra:** el spec de la 23.10 en `bmad-build`: qué periodos informa, y que se lean igual para SM-C3 y SM-C5. En la pasada de métricas, `bmad-prd` dice qué es «saltar» en SM-C3. No toca ningún dato versionado, porque D1 conserva los recuentos por jornada.

### 9. SM-12 por destino mezcla en `opaco` la hoja de «Más opciones…» con la Imagen cuadrada, que no lleva enlace (23.10, 25.1, 25.2) — *spec-7, prd-5, conf-4*

**Dónde:**
- `prd.md`:
  - 1331 (SM-12; la Historia suma sus descargas «porque también esas dejan copiado el enlace con su marca»).
  - 93 (glosario).
  - 462 (FR-18: solo «Más opciones…» entrega `?via=opaco`).
  - 483 (FR-20: `opaco` es la hoja de «Más opciones…» y también la Imagen cuadrada).
  - 1333 (Facebook, fuera de la comparación).
- `SPEC.md` 79 y 219; `addendum.md` 283 y 402–406.
- `epics.md`:
  - 5478 (23.10: «entre las comparticiones de su destino»).
  - 5486–5489 (`SM12_CON_FACEBOOK`).
  - 6116–6117 (25.1) y 6198–6200 (25.2).
- `public/islas/imagen.js` 157: `navigator.share({ files: [fichero] })`.

**El hueco:** la Imagen cuadrada se comparte solo como fichero, así que ninguna llegada puede traer `?via=opaco` desde ella. La letra («toda superficie», «por destino») la mete en el denominador; el criterio que el PRD da para la Historia la sacaría.

Pesa por dos razones:
- **Puede vaciar la cifra.** Con 2 comparticiones de imagen y 0 de enlace en seis semanas (`prd.md` 429), las de imagen pueden ser casi todo el denominador de `opaco`, y la difusión de `opaco` queda en nada.
- **Cambiarla después cuesta.** La meta de SM-12 se fija sobre la línea base, así que cambiar la definición más tarde parte la serie.

El caso de Facebook, que tiene la misma forma, sí tiene su constante. Un detalle menor: cuando `writeText` falla en la Historia, el enlace marcado sigue disponible en el campo de copia manual (25.5), así que ahí no hay hueco.

**Suposición que un colega daría por buena:** «El denominador es toda compartición con destino `opaco`, de imagen y de enlace».

**Cierra:** `bmad-prd`, con una frase en SM-12: o se saca la `comparticion-de-imagen` de `opaco`, o se parte `opaco` por tipo. Si no, al menos el spec de la 23.10. D1 guarda el tipo de evento, así que no se pierde nada.

### 10. Ningún merge pide la suite entera de Playwright (23.11, 26.11, 25.7, 28.5) — *pm-9*

**Dónde:**
- `epics.md`:
  - 4142–4150: el Entorno operativo enumera seis familias cerradas.
  - Las condiciones de cada merge: 5532 (23.11), 6567–6571 (25.7), 7219–7221 (26.11), 8063 (28.5) y 7247 (Épica 27, solo en las notas).
- La espina, 523; `SPEC.md` 146.
- Que nadie más la corre:
  - `AGENTS.md`: «El CI no ejecuta `npm run test:e2e`».
  - `.github/workflows/publicar.yml` 96: solo `npm test`.
  - `tests/e2e/` tiene 22 ficheros `.spec.ts`.
- El precedente: `_bmad-output/implementation-artifacts/LOOP-PROTOCOL-V4.md` 163 exigía «la suite de Playwright entera incluida».

**El hueco:** cada historia de fusión enumera una lista cerrada de pruebas locales, y la v8 rompe el precedente escrito en la v4. La 23.1 cambia el guion de todas las páginas y la 26.5, la cabecera. En cambio, ninguna lista nombra copiar, compartir-enlace, kit, tarjeta, origen, dominio, coleccion, pagina-de-tema, marca ni seo. Esas pruebas pueden romperse en la rama, entrar en la principal y desplegarse con el siguiente push (`epics.md` 4141). Para la épica siguiente serían rojos heredados, indistinguibles de los suyos. El ejemplo de la cabecera es más débil de lo que parece: `Armazon.astro` 166 conserva `<a class="marca">`.

**Suposición que un colega daría por buena:** «Basta con las pruebas que nombra la historia de cierre».

**Cierra:** `bmad-create-epics-and-stories`: `npm run test:e2e` entero sobre la rama como condición de cada merge, escrito en el Entorno operativo o en cada historia de cierre.

## Lo que conviene registrar antes de la Épica 27

### 11. El ordinal de `data-pagefind-sort` no cabe en la precisión con que Pagefind ordena (27.1) — *comp-5*

**Dónde:**
- `epics.md`:
  - 7277–7279 (27.1): «un ordinal entero de ancho fijo con tres rangos»; «un rango que no cabe en su ancho rompe el build».
  - 7297: la prueba sobre `dist/` (claves numéricas, del mismo ancho y distintas).
  - 7302: Playwright.
- La espina, 360–363 (AD-25).
- Pagefind:
  - `node_modules/pagefind/package.json`: versión 1.5.2.
  - `pagefind/src/index/mod.rs`: las claves numéricas se comparan como f32.
- `.github/workflows/publicar.yml` 17–19 y 78–81.
- El hueco «sin Obra», en las resoluciones del 19/10.

**El hueco:** no están fijados ni el ancho ni la codificación. Pagefind 1.5.2 lee los enteros como i32 y ordena como f32, y el orden solo es exacto hasta 2^24 = 16.777.216.

Con el Corpus de hoy, tres rangos decimales dan 3+2+3 dígitos:
- 171 Autores;
- 59 Obras de Rafael Barrett, más el hueco «sin Obra»;
- 231 Citas de José Ingenieros en «El Hombre Mediocre», más el hueco «sin documento».

Eso suma unos 17,1 millones, así que las Citas de los últimos Autores del Directorio ya empatarían. Un ancho «holgado» (3+3+4) se sale de i32 y rompe casi todo el orden.

Las pruebas no lo cogen bien:
- La prueba sobre `dist/` pasaría igual.
- Solo Playwright podría notarlo, y depende de qué Obra elija.

El desborde por crecimiento saldría en el build del push de siembra, con el sitio anterior todavía servido (`publicar.yml` 78–81), y sin un aviso previo como el de la 24.2.

**Suposición que un colega daría por buena:** «Un ancho holgado hoy no se desborda nunca».

**Cierra:** el spec de la 27.1 en `bmad-build`:
- una codificación dentro del rango exacto de f32: un ordinal global denso (unas 4.420 Citas hoy) o una base mixta;
- una aserción contra 2^24 sobre `dist/`;
- un aviso y un tope con nombre en `umbrales.ts`, al modo de la 24.2.

## Notas: no cambian lo que haría el desarrollador, pero conviene saberlas

**PRD y métricas.**

- **El mínimo que cierra la línea base pierde el «de su superficie».** FR-56 dice «un mínimo de lecturas de su superficie —de búsquedas asentadas, en las de búsqueda—» (`prd.md` 1083). En cambio, la 23.10 (`epics.md` 5501–5504), el inventario de FR-56 (3937), CAP-24 (`SPEC.md` 139 y 219) y la espina (145 y 577) dicen «de lecturas», sin más. Como `/buscar/` no emite lectura (23.5), SM-6 y SM-13 solo se cierran leyendo FR-56. Basta una sola constante, y las historias que la usan ya la leen por superficie (25.7, 26.11, 28.5). Queda por decir qué hace SM-12 con una llegada a una Página de Obra (*prd-1, conf-1*).
- **Solo SM-8 tiene cortes fechados.** Lo que falta:
  - El ajuste de los 8 s «repite la línea base», pero sin fecha ni reinicio (`epics.md` 5253 frente a 5504).
  - Cambiar los cortes del tramo abre un corte «con fecha en `umbrales.ts`», sin constante ni lector (5130).
  - No se anota la llegada en vivo de la 25 ni de la 27.
  - La 28.5 dice «no se anota fecha» si llega después del juicio, y §15 la juzga «antes y después» (`prd.md` 1512).

  Hoy no le hace falta a ninguna historia: los datos ya marcan cada llegada (destinos de `via`, zonas nuevas, búsquedas filtradas sin texto) y cada push despliega. Lo que sí falta es que la 25 tenga la cláusula de la 24 para cuando llega antes de que la Página de Cita cierre su línea base (`prd.md` 1257) (*prd-4, pm-5*).
- **La jornada del corte mezcla filas de antes y de después** del despliegue, y no se dice en qué calendario se escribe la fecha. Lo natural es «desde la fecha, todo cuenta para el tramo nuevo», en jornada UTC (`medicion/receptor.ts` 53–55; `epics.md` 5462 y 5482) (*prd-10*).
- **La 23.10 se queda corta con varias métricas.** No nombra SM-3 (1 − continuación) ni SM-C4, que está fuera de estas épicas (`epics.md` 4623). Dice «SM-C3 y SM-C5 junto a SM-5», cuando SM-C3 es SM-5 leída junto a SM-7. Y no recoge que «cada tasa de la línea base va con su denominador» (`addendum.md` 363) (*prd-9*).
- **SM-5 y SM-7 se cuentan «en rutas `/cita/`»** (`epics.md` 5498; `SPEC.md` 219), en la misma historia que veda el prefijo (5466; espina 202). Así, una acción en una Cita retirada que se sirve desde caché contaría sin su lectura. Se arregla con un solo resolvedor contra el censo (*prd-11*).
- **Una salida puede llegar sin la lectura que la 23.7 da por emitida** (`epics.md` 5318). Pasa cuando no hay `pointerdown` ni `keydown` antes: un lector de pantalla en exploración, el control por voz o un `element.click()`. El invariante de la espina («la lectura se emite antes», 193) pide emitir la lectura pendiente en el clic. Las pruebas de Playwright simulan el clic con su `pointerdown` y no recorren este caso (*prd-8, ind-12*).
- **La búsqueda asentada no filtra máquinas.** Se asienta al ocultarse la página, sin tiempo mínimo ni interacción (`prd.md` 1077; espina 197; `epics.md` 5365 y 5388–5390). Así, SM-6 y SM-13 no tienen el filtro que la lectura da a las demás tasas. El riesgo es bajo: no hay ningún enlace estático a `/buscar/` con estado y un índice sin cargar no emite. Aun así, la 23.10 podría dar para las búsquedas la misma comparación por firma del punto 7 (*comp-3*).
- **Cuando el índice no carga, SM-13 recibe numerador sin denominador.** La 27.7 pinta los Directorios dentro de la zona `resultado` (`epics.md` 7669) y no emite la búsqueda (7680–7682). La 27.6 eximió por SM-13 las salidas sin resultados; la 27.7 no lo hace, ni dice en qué zona va el aviso del paquete caído (*spec-4*).
- **Un corte de SM-8 o dos.** El PRD (`prd.md` 1252 y 1325), el inventario (`epics.md` 3982) y CAP-24 (`SPEC.md` 221) hablan de uno. La cobertura y las historias (`epics.md` 4619, 4913, 5482–5485 y 7235) y AD-13 (201) hablan de dos. La orden parte la serie por cada entrada sin suponer cuántas hay, así que es solo letra que alinear en `bmad-prd` (*conf-9*).
- **Qué rechazos de `share()` llevan a la descarga.** AD-7 (espina 127), UX-DR75 (`epics.md` 4305) y la 25.5 (6388–6391) mandan a la descarga `NotAllowedError`, `DataError` y `TypeError`. `EXPERIENCE.md` 400 y `addendum.md` 272, 280 y 403 nombran solo el primero. Manda la espina; `bmad-ux` y `bmad-prd` lo ponen al día (*conf-7*).
- **La salida desde el 404 guarda la dirección rota tal cual** (`src/lib/medicion.ts` 125; `medicion/receptor.ts` 79–81, sin tope). Es el único texto que llega a D1 sin pasar por un vocabulario cerrado. Está previsto (`prd.md` 1072; `epics.md` 5467) y no entra en ninguna métrica. Fijar la ruta a `/404` o recortarla en el receptor es opcional (*comp-2*).
- **La cuota de lectura de D1 también corta.** La 23.10 vigila la de escritura (`epics.md` 5506–5508), pero el plan gratuito corta también a los 5 millones de filas leídas al día. Al pasar cualquiera de los dos límites no corre ninguna consulta hasta las 00:00 UTC, tampoco los `INSERT` del receptor. Con unas 90 vistas al día queda lejos, y acotar por jornada las consultas de la orden (con `eventos_por_jornada`, `esquema.sql` 15) y dar las filas leídas cuesta poco. «Unas tres filas por carga» (`epics.md` 4151 y 5557; `SPEC.md` 181) cuenta eventos; la espina (527) ya cuenta los índices (*comp-6*).

**Arquitectura y espina.**

- **Dónde se comprueba la marca indexable.** La 23.9 pide en Vitest que la marca indexable de `vista-de-obra` coincida con el `noindex` (`epics.md` 5418–5421). AD-17 v8 la suma a la comprobación de `astro:build:done` sobre el `dist/` real (espina 247 y 255; `integraciones/indexables.ts` 17–21 y 105). Las dos salen de `rutasIndexables` y cambian juntas, pero la revisión debe exigir también la del build. La 28.3 ya nombra la de AD-17 (*arq-1*).
- **Cinco familias o seis para el aviso.** La 26.7 da cinco (`epics.md` 7040) y AD-27 da seis (390). `FamiliaAvisable` (`tools/lib/avisar.ts` 17–40) es la familia del fichero, y las rutas avisadas salen de la relación, donde los Directorios entran por la 26.3 y la 26.4. Conviene que AD-27 separe la familia del fichero de la de la ruta (*arq-2, conf-5*).
- **Las decisiones 8 y 9 del 19/10 siguen abiertas en la letra.** `?autor=a&obra=b` y la exención de zona ya están en las historias (`epics.md` 5333–5335, 7505–7511 y 7744–7747). Aun así, AD-13 (196), el Deferred de la espina (574–576), el inventario de `epics.md` (4160–4163) y `SPEC.md` 251 las siguen dando por abiertas para `bmad-ux`, y la lista de alineación no las nombra. Hay que añadirlas a las de `bmad-architecture`, `bmad-spec` y `bmad-ux` (*arq-9*).
- **El vocabulario «sin importaciones».** Lo piden la espina (190–191) y `epics.md` (5096–5098), pero declara `via`, cuyo conjunto es `DESTINOS_VALIDOS` (`destinos.ts` 36), y el nombre `de`, que es `PARAMETRO_DE_ORIGEN` (`redes.ts` 15). Lo coherente es importar solo de esos dos módulos hoja, que no importan nada, lo que conserva la razón de la regla (`destinos.ts` 4–11). La prueba se escribe como «solo importa módulos sin importaciones», no con el literal de `comparticion.test.ts` 216. Copiar los conjuntos choca con «un solo dueño por conjunto» (`SPEC.md` 169) (*ref1-2*).
- **Las aristas del grafo del modelo.** Las que enumeran la 26.8 (`epics.md` 7106) y la espina (168; inventario 4053) no llegan a ninguna Cita, ni van de Autor a sus Obras. Al pie de la letra, toda Cita queda inalcanzable. La misma historia da la salida («desde las mismas enumeraciones que pintan las páginas», 7105), y NFR-5 fija Tema → página N → Cita (`prd.md` 1356). Hay que corregir la lista en AD-11 (*ref2-2*).
- **El aviso del índice que no carga cuenta en el grafo.** Va en el HTML inicial, fuera de `<noscript>` (`epics.md` 7660), así que sus enlaces sí cuentan, al revés de lo que afirma la 27.7 (7686). No cambia el veredicto, porque la cabecera ya enlaza los dos Directorios (*conf-12*).
- **Cuándo entra una búsqueda en el historial.** La Épica 27 y la espina dicen solo `replaceState` (`epics.md` 4137 y 4966; espina 408). La 27.4 (7476–7477) y UX-DR87 (4358) dicen que el estado asentado «entra en el historial». Se deduce: `pushState` por cada estado asentado y nada a mitad de ráfaga. Hay que alinear la letra de la espina (*ind-3*).
- **Quién tiene las seis Obras de la portada.** `SPEC.md` 169 se las da a `publicado.ts`. AD-12 (177 y 468) y la 28.3 (7925 y 7938) ponen la selección junto a `citaDelDia.ts`, sobre `obrasIndexables`. Es el mismo código; solo hay que precisar la letra (*spec-12*).
- **La caché de AD-16 no existe.** `SPEC.md` 180 y la espina (231) la dan en presente, pero no hay caché de PNG: se rasteriza en `src/pages/tarjeta/[slug].png.ts` 41–43, y la 25.6 lo dice (`epics.md` 6497). `GUIA-DE-ARRANQUE.md` 55 sigue dándola por verificada en la v3, y la 24.1 mide el build sin umbral (*spec-8*).
- **Lo que queda en `dist/` sin punto final.** La 23.1 dice que «lo único de la medición que queda en `dist/` es el arranque de `__medir`» (`epics.md` 5027). Pero el `data-*` de vistas (5042), las zonas (5329) y la marca indexable (5415–5421) son marcado del build, y la espina solo promete «no hay fichero ni etiqueta» (110). Las pruebas de zonas y de marca fallarían si se quitara (*comp-7*).
- **La huella del vocabulario no tiene ruta, forma ni arranque escritos** (`epics.md` 5127–5137; espina 213–214). Los criterios descartan un hash («nombra la diferencia», «cubre»), y el rojo aceptado de la 23.2 implica que se parte de una huella v7.1. Conviene que la orden no se salte el cotejo en silencio cuando no haya huella (*arq-4, pm-8*).
- **Con qué motor se aplican las migraciones en Vitest** (`epics.md` 5115). Ninguno está declarado. `node:sqlite` funciona sin bandera en el CI (`node-version: '22'`) y en local (v24.3.0), salvo en el suelo de `engines`, 22.12 (`package.json` 7). Un cotejo estructural del SQL, como hace hoy `receptor.test.ts` 138, también vale (*arq-7*).
- **El orden del selector de Obra.** Tiene que llegar ordenado del build (`epics.md` 7413), y AD-11 describe el mapa de rótulos sin orden (162). Basta emitir el JSON en el orden de `obras.ts`. La ruta del JSON, que necesita el paso final que mide su tamaño, la fija el spec de la 27.3 (*arq-6*).
- **Topes y tamaños sin valor.** Los topes de la lista cerrada de AD-6 (`epics.md` 5052, 6973 y 7318) y los tamaños de filtros y mapa (6872–6873 y 7447–7449) nacen sin valor ni regla. El precedente es «unos 400 de margen» (`umbrales.ts` 164), con la medida en el parte (*ind-6*).
- **Cómo se recupera D1.** La orden que migra y borra en producción (`epics.md` 5135–5136) no lo nombra. D1 Time Travel viene encendido (7 días en el plan gratuito), pero restaurar sobrescribe lo que el sitio escribió después. Basta una línea en `DESPLIEGUE.md` §3 (*comp-9*).
- **El corte de 10 minutos no es del build.** Es la espera de `deploy-pages` (`publicar.yml` 146–155), y la 24.1 lo usa para justificar medir el build (`epics.md` 5631). `construir` no tiene timeout; en el run 39240072019, construir tardó 15 min 24 s y desplegar, 11 s. Lo que alarga el despliegue (bytes y número de ficheros) ya lo mide la 24.2 (*comp-11*).

**Código real.**

- **`DESTINOS` es a la vez constructores y lista ofrecida** (`compartir.ts` 43–67; `CompartirEnlace.astro` 61–64). Meter ahí `facebook` y `threads` «sin botón», como pide la 23.2 (`epics.md` 5103–5105), rompería `compartir.test.ts` 61–66 y `espinas-de-ux.test.ts` 174–187. La salida es una lista de ofrecidos aparte; el diseño (490) da una tercera versión de la línea 82 de `comparticion.test.ts` (*ref1-1*).
- **La señal ajena con `?via=` necesita un campo nuevo** en `senales-externas.yml` (23.6, `epics.md` 5292–5295). `SenalExterna` (`tools/lib/canal.ts` 566–588) guarda el destino recortado y solo `marcado` por `?de=`. Hay patrón que seguir:
  - un booleano opcional que solo se escribe a `true`;
  - el cotejo contra `DESTINOS_VALIDOS`, con código 1;
  - las dos marcas, cada una por su lado (FR-22).

  El registro está vacío. `CODIGOS_DE_SENAL` se repite literal en tres sitios, y `canal.test.ts` 1304–1319 comprueba que coincidan (*ref1-3, conf-3*).
- **El inventario de pruebas de la 23.1 está incompleto** (`epics.md` 5073). Faltan:
  - `pagina-404.spec.ts` 89–96 y `seo.spec.ts` 107–116, cuya ausencia de guiones sigue en verde sin `MEDICION_ENDPOINT` (`playwright.config.ts` 31);
  - los espías con `addInitScript` de `compartir-enlace.spec.ts` 149, `compartir-imagen.spec.ts` 105 y 214, `imagen.spec.ts` 105 y `busqueda.spec.ts` 288, que el arranque de `__medir`, ahora siempre presente, sobrescribirá.

  Se arregla con `window.__medir = window.__medir || …` o cambiando el espía (*ref1-4*).
- **Las dos copias del Kit sin el slug.** Quitar el slug de `define:vars` en `CopiarCita` (`epics.md` 5064) obliga a enlazar de otra forma las dos copias del Kit (`CopiarCita.astro` 50–56 y 93): con `document.currentScript` o con un oyente delegado. `kit.spec.ts` 26 y 62 solo prueba `.first()`, así que una segunda instancia muerta pasaría. Lo mismo vale para `ImagenDelKit` en la 25.4 (*ref1-9*).
- **`datos` frente a `consulta`.** La baliza envía `datos` (`medicion.ts` 125) y el receptor guarda `consulta` (`receptor.ts` 47 y 76), así que la prueba «claves ⊆ registro ⊆ columnas» de la 23.2 (`epics.md` 5125) falla al pie de la letra. O se declara la correspondencia, o se renombra la clave y el receptor sigue aceptando `datos` (5121) (*ref1-10*).
- **Dónde vive el marcado del diálogo de la Historia.** No consta (`epics.md` 6364–6419). La convención de `AGENTS.md` (la región en el marcado desde la carga, dentro del `<dialog>`) lo pone en el HTML. Falta decidir entre reutilizar el `<dialog>` de `ImagenDeCita`, que está atado a un único `[data-imagen]` (`ImagenDeCita.astro` 174), o poner uno segundo (*ref1-11*).
- **El `import()` de Pagefind en un guion empaquetado.** Hoy la búsqueda no configura Pagefind (`buscar.astro` 172–173, sin `options()`). Al pasar a guion empaquetado (27.2), `import('/pagefind/pagefind.js')` no resuelve en Vite, porque Pagefind corre después de `astro build`. Hace falta `@vite-ignore` sobre el literal o `external`. Si se usa una variable, la lista cerrada de la 23.1 deja de ver el destino (*ref2-13*).
- **`ordenAlfabetico` no llega al `Autor` publicado si nadie lo añade:** `aplanarAutor` (`publicado.ts` 703–712) copia campo a campo. La 27.6 lo dice para `tradicion` (`epics.md` 7606). `astro check` y la puerta de la 26.1 lo detectarían (*ref2-12*).
- **La rama «sin ningún año» de la Fila de Autor es inalcanzable** (`epics.md` 6736): AD-1 hace obligatorio el año de fallecimiento (`admision.ts` 224–229; `publicado.ts` 75). La prueba va sobre la función pura con años opcionales, sin relajar el tipo (*ref2-4*).
- **Los ejemplos del filtro no existen en el Corpus que sirve Playwright.** No hay ningún Núñez ni ningún Autor publicado con ñ (Acuña e Ibáñez no tienen Citas), y «gon» da 6 y «gonz»/«gonza», 4, no «1 autor.». El pliegue de la eñe se prueba en `/obras/` («espana» frente a «Historia de la decadencia de España»), y el singular con «gongora». Una prueba ingenua «nunez == núñez» pasaría con dos listas vacías (*ref2-6, pm-13*).
- **`seo.spec.ts` también se pone en rojo entre la 26.3 y la 26.5** (152 y 210–211: toma lo publicado del sitemap, sin exención). El rojo aceptado solo nombra `publicable-y-alcanzable.test.ts`, así que la 26.5 debe quitar la exención en los dos (*ref2-7*).
- **«Todos los Modelos encendidos» rompe el build** (`epics.md` 6778 y 6868): `producto-propio` y `publicidad-acotada` declaran `admitidoEn: []` (`ingreso.ts` 438, 453 y 679–684). Se lee como «todos los que alguna superficie admite», igual que en `ingreso-construido.test.ts` 738. Que `/buscar/` «sigue admitiendo la publicidad» (7384) es la política de la espina (298), no la declaración (`ingreso.ts` 392, solo donaciones) (*ref2-8*).
- **No existe la lista de «superficies sin semblanza».** `atribucion.ts` (89–119) no la tiene, y AD-28 (399), la 26.3 y la 26.4 la dan por supuesta. Meter los Directorios en `SUPERFICIES_DE_LA_SEMBLANZA` rompería `semblanza.test.ts` 85–98 (*ref2-9*).
- **`barra-final.test.ts` no caza un `href="/autores/"` escrito a mano** (122 y 149–153), aunque la 26.3 dice que sí (`epics.md` 6719). Lo que sí caza es la forma mala sin barra, y la prueba de la cabecera de la 26.5 vigila el destino (*ref2-10*).
- **La negativa NFR-5 de `autor retirar` nunca puede saltar** (`epics.md` 7109–7112): `retirarAutor` ya se niega si el Autor tiene Citas publicadas (`gestion.ts` 727–734), así que su prueba no tiene caso que montar (*ref2-11*).
- **La «M» no lleva a José Martí.** La 27.2 justifica el orden del selector «para que la búsqueda por tecleo del control lleve con «M» a José Martí» (`epics.md` 7338), pero con el rótulo «José Martí» se llega con la «J». `EXPERIENCE.md` 256 lo explica bien. Una prueba escrita desde esa frase falla, así que hay que corregir la letra (*ind-4*).
- **axe sí comprueba 2.5.8.** La 23.4 lo cuenta entre lo que axe no comprueba (`epics.md` 5204), pero `target-size` lleva las etiquetas `wcag22aa` y `wcag258` en axe-core 4.12.1 (`axe.js` 33042–33047), y la propia historia cuenta con esa regla (5195) (*ind-11*).
- **En la 24.1 cambian también ficheros de `dist/pagefind/`.** «Solo cambian rutas `/obra/…»` (`epics.md` 5632) no se cumple con `npm run build` (`package.json` 14): reordenar el listado de las 277 Obras indexables cambia sus fragmentos y el índice. La comparación tiene que ser de HTML o nombrar `dist/pagefind/`, como ya hace `epics.md` 7126 en otra historia (*ref1-7, arq-10, ind-13*).
- **La regla que propone la clave de orden no está escrita** (`epics.md` 6627). La 26.10 (7184) implica el último apellido, y con esa regla unos treinta Autores caen en otra letra hasta que se revisen: Pérez Galdós en la G, Pardo Bazán en la B, Calderón de la Barca en la B, Ramón y Cajal en la C, Alfonso X el Sabio en la S… Publicar claves sin revisar está aceptado (`SPEC.md` 151; `addendum.md` 25) y corregir una no mueve ninguna URL. Una línea en la 26.1 haría reproducible el parte del lote (*ind-2*).
- **Lo tecleado vuelve a la página dentro de frases, y lo mismo el `?q=` de una dirección compartida** (`epics.md` 7008–7009, 7364 y 7624; 27.4). El sitio no tiene CSP y se sirve desde GitHub Pages. El código ya usa `textContent` y `createElement` (`buscar.astro` 182–245) y no hay `innerHTML` en `src/` ni en `public/islas/`. Un criterio y una prueba con un `?q=` que lleve marcado fijarían la convención (*comp-12*).
- **Las Tarjetas contiguas de la 24.6 romperán la prueba de los 8 px.** El verificador de un descartado (*conf-8*) vio que `tests/e2e/accesibilidad.spec.ts` 384–420 («las zonas de toque miden 44px con 8px de separación») solo exime las filas de `.hermanas`. Tarjetas de Cita separadas solo por el filete la harán fallar, y ni el inventario del diseño ni la 24.6 lo nombran.

**UX.**

- **El texto de ejemplo del Campo de búsqueda v8** (26.6, 27.2, 27.8, 28.1) no tiene regla. `/buscar/` y el 404 llevan «Por ejemplo: no hay camino» (`buscar.astro` 60; `404.astro` 50), que pusieron las Historias 3.1 y 4.3 sin que ningún artefacto lo diga, y las maquetas dejan la cuestión abierta (`v8-directorios.html` 529; `v8-pagina-de-tema.html` 511). Se conserva donde ya existe; en los Directorios y en «Buscar en…» queda a elección (*ux-1*).
- **El asunto del correo es siempre «Una cita»** (`compartir.ts` 66). Ningún artefacto da el de la Obra (`EXPERIENCE.md` 162), y la prueba de la 25.6 (`epics.md` 6506) no lo mira (*ux-2*).
- **El fallo de «Mostrar 30 más» sale lejos del botón.** Se escribe en la región del Recuento, encima de la lista (`EXPERIENCE.md` 248–249; `DESIGN.md` 346 y 351; `epics.md` 7554–7555), fuera de la vista de quien pulsó abajo, y oculta el recuento hasta el reintento (*ux-3*).
- **La frase del filtro que ya no existe** (`EXPERIENCE.md` 424) es falsa para la Obra de otro Autor (resolución 8; `epics.md` 7505–7507). Además promete «la búsqueda va sin él» cuando el filtro descartado era todo el estado y no corre ninguna búsqueda (7345). Se puede afinar en la misma pasada que el plural (*ux-4*).
- **El resultado de tipo portada repite la marca:** lleva `MARCA` de rótulo y de título (`epics.md` 6671 y 7817; `index.astro` 66), así que la marca suena dos veces (*ux-5*).
- **La Tarjeta de Cita de Tema y Colección junta Autor y Obra sin pausa para lectores de pantalla.** La «, » de `EXPERIENCE.md` 468 y `DESIGN.md` 243 está pensada solo para la Fila de bloque (*ux-6*).
- **La Cita que no cabe en el 9:16 reutiliza la frase y el reintento del generador que no llega** (`epics.md` 6405–6409; espina 137). Ese reintento nunca puede salir bien. Falta su fila en EXPERIENCE, junto a la 398 (*ux-10*).
- **Hay dos «Buscar» en la misma página:** el enlace de la cabecera y el botón del formulario conviven en la portada, el 404 y la página 1 de Obra, Autor y Tema (`EXPERIENCE.md` 122 y 443). Decir «pulsa Buscar» por voz es ambiguo, justo para quien se añadió el botón (*ux-11*).
- **La regla de rondas de la 28.3 no excluye la Obra de la Cita del Día** (espina 177; `epics.md` 7936–7942), así que algunos días sale dos veces en la primera mitad de la portada. La maqueta lo dejaba «[sin decidir]» (`v8-cabecera-y-portada.html` 836 y 1262). Lo decide Héctor a propósito, o se escribe una línea en AD-12 (*ux-12*).
- **Alineaciones de la UX que la lista de `bmad-ux` no nombra.** Las historias resuelven dos que no están registradas:
  - el título de pestaña de los Directorios: `EXPERIENCE.md` 80 dice «citas», frente a 84 y `epics.md` 6759;
  - los destacados de la búsqueda como chips: `EXPERIENCE.md` 302, frente a 7615.

  La Fila de Autor ya consta para `bmad-ux` (26.3), y el «Ver esta cita» del 404 solo lo deja de distinguir UX-DR105 (`epics.md` 4450). El `.memlog.md` de la UX no tiene ninguna entrada del 19/10 (*conf-10*).
- **Nombres cruzados en UX-DR79** (`epics.md` 4317): llama «Tarjeta de Cita» y «de Obra» a las Tarjetas Sociales, nombres que el glosario v8 da a otros componentes (`SPEC.md` 183). Es la misma limpieza que la de AD-16 (*conf-11*).

**Operación y tablero.**

- **La principal local y `origin/main` han divergido.** La local (be6335de3b) lleva 6 commits de planificación sin publicar, y `origin/main` (67671d1293) lleva los 8 de la reparación, con los 160 documentos retirados y los 95 de Parsoid rehechos. La rama de la 23 tiene que salir de las dos juntas, y `git merge-tree` da un árbol limpio. Fusionar `origin/main` en `main` y publicar la planificación, que es un acto de Héctor, va antes de abrir la rama (*pm-10*).
- **Nada vigila el peso de `dist/` en la principal hasta la fusión de la 24 con la 26,** porque la comprobación de la 24.2 llega con ella. El riesgo es bajo: la siembra está parada desde el 16/10 en 4.421 Citas, a unas 5.000 del techo de 1 GB, y una publicación fallida deja servido el sitio anterior.
  - **Unidad.** Los 485 MB son de `du` (485 MiB en bloques); en bytes son 445 MiB, y la 24.2 mide bytes. Conviene escribir la unidad.
  - **Valores.** Se proponen con datos de antes de la v8. La 24.6 los vuelve a medir, aunque no pide revisarlos.
  - **Adelantarla.** La 24.2 no cambia `dist/` (`epics.md` 5671), así que Héctor podría adelantarla a la principal.

  (*pm-2, spec-9, ref1-8*)
- **Hay dos actos de Héctor a mitad de cadena sin marca en el tablero.** Uno: los valores del aviso y del tope de la 24.2 (`epics.md` 5645–5646: «no se cierra sin los dos»), de la que cuelgan la 24.6, la 24.8 y toda la 26. Otro: si el pie no deja caber una Cita, el diff de `tramos.ts` de la 25.2 (6181), del que cuelgan la 25.4 y la 25.5. `sprint-status.yaml` 402 y 428 no llevan comentario (el precedente es la 360). Conviene pedir los dos valores antes de abrir la rama 24+26 (*pm-7*).
- **La Épica 27 no tiene historia de cierre ni fila en el tablero** (`sprint-status.yaml` 437–446, frente a la 23.11, la 26.11, la 25.7 y la 28.5). Su «Para fusionar» vive en las notas (`epics.md` 4971 y 7247), y la regla «un agente nunca fusiona» solo consta en la 23.11 (5562). Sus pruebas tienen dueño (27.1, 27.2, 27.5 y 27.8); lo que falta es quién fusiona y cuándo pasa a hecha. Y la 28.5 la da por fusionada (8058) (*spec-6, pm-5*).
- **NFR-7 «con todo lo de la v8 puesto» solo tiene puerta en la 23.11** (`SPEC.md` 47 y 182; `prd.md` 1362; `epics.md` 5536). La 24.6 y la 26.11 miden y anotan sin consecuencia (5919 y 7222), y la 25 y la 27 no miden, aunque el tope de guion las acota. El mapa de cobertura promete «cada épica mide a mano con lo suyo puesto» (4632) (*spec-2*).
- **Una docena de criterios dicen «queda anotado» sin decir dónde** (`epics.md` 5165, 5209, 5536, 5557, 5631, 5846, 5920, 6031, 7222, 7226, 7394 y 7454). Solo la 25.3, la 25.7 y la 26.5 lo dicen. Ninguna de esas cifras es un dato que lea el código, y el sitio natural es el spec de la historia. Dos casos piden atención:
  - la 23.3 tiene que contar las filas antes de lanzar `desplegar`, que no las cuenta;
  - la 23.11 compara Lighthouse con «la de la principal», que nadie mide antes.

  (*pm-15, ind-10*)
- **Lo que Héctor decida en la 25.3 se escribe «como criterio de la 25.5»** (`epics.md` 6248 y 6343), es decir, en el spec de la historia y no en `epics.md`. Si decide retirar la Historia en iOS, ninguna condición de la 25.5 distingue sistemas: haría falta leer el agente de usuario en el cliente, que NFR-11 no prohíbe (solo prohíbe transportarlo) (*ind-9*).
- **Cómo observar en la 25.7 si `?via=` sobrevive al clic de Facebook.** Con la 23 en vivo, el guion quita `via` de la dirección al cargar (`epics.md` 5266–5271), así que hay que mirarlo en D1, no en la barra de direcciones (6532). Si se mira mal, el error cae del lado conservador (*pm-12*).
- **La 26.10 no tiene condición de cierre:** todo Autor nuevo nace sin `ordenRevisado` (`epics.md` 6627). Eso retrasa que `epic-26` pase a hecha (*pm-14*).
- **La orden de solo lectura de la 24.8 no tiene nombre** (`epics.md` 6028–6031). `tools/avisar.ts --ensayo --desde --hasta` ya compone el aviso sin enviarlo (`avisar.ts` 5–7 y 343–386). Le faltan el reparto por familia y las fechas que cambian, y `AGENTS.md` tendrá que documentarla (*arq-12*).

## Ya registrado

Lo siguiente constaba antes de esta pasada y no se cuenta como hallazgo nuevo. Donde una nota lo agrava o lo amplía, se dice.

- **La reparación de la publicación va antes de cualquier merge, fuera de la v8.** Rojo desde el 2026-10-11. Dueño: Héctor. **Ha cambiado de estado:** está en `origin/main` y en vivo desde el 2026-10-19 a las 09:22 UTC, pero sin las constantes de SM-11 que tenía encargadas (punto 2) y sin haber llegado a la principal local (nota *pm-10*).
- **Alinear la letra de la espina con las resoluciones del 19/10.** Dueño: `bmad-architecture`. Puntos:
  - AD-9: el peso de `dist/` y los filtros se miden después de Pagefind.
  - AD-12: el 404 como la portada; la rotación con menos de seis Autores.
  - AD-13: la señal ajena con `?via=`; los cortes de SM-8 con la fecha de llegada en vivo.
  - AD-11: `alta` y `coleccion despublicar`; «huecos» en vez de «salud».
  - AD-7: el «destino Feed».

  La misma pasada puede recoger las notas de arquitectura: el Deferred de AD-13 con las decisiones 8 y 9 (*arq-9*), las familias de AD-27 (*arq-2, conf-5*), las aristas de AD-11 (*ref2-2*), «sin importaciones» en AD-13 (*ref1-2*), la escritura en el historial (*ind-3*), el dueño de las seis Obras (*spec-12*) y AD-16 (*spec-8*). Si Héctor lo decide, también el rowid (punto 1), la vuelta atrás sin caché (punto 5) y el tope por carga (punto 4).
- **Textos que faltan.** Dueño: `bmad-ux`.
  - el nombre de la previsualización cuadrada;
  - la frase de la descarga en iOS;
  - la frase plural de los filtros;
  - `/buscar/` con guion y sin paquete;
  - la línea de cifras con el censo vacío;
  - la portada sin ninguna apta;
  - UX-DR96;
  - los `[NOTE FOR PM]` ya contestados;
  - las menciones a WCAG 2.1.

  Se suman las notas de UX (*ux-1 a ux-12*, *conf-7*, *conf-10*, *conf-11*).
- **FR-9 «si rige la congelación».** Dueño: `bmad-prd`. Su próxima pasada puede recoger también los puntos 4, 7, 8 y 9 y las notas *prd-1, conf-1, conf-9*.
- **La ventana de SM-11** (Héctor, antes del 2026-12-05; PRD §14) y **las reuniones de Obra ya publicadas** (Héctor; `propuesta-reuniones-de-obra.md`).
- **Rojos aceptados:**
  - la prueba de huella, entre la 23.2 y la 23.3;
  - la exención por ruta de `/autores/` y `/obras/` hasta la 26.5. Esta exención alcanza también a `tests/e2e/seo.spec.ts`, que el registro no nombra (nota *ref2-7*).

## Descartados

- *prd-12*: la zona `siguiente` para las dos «Siguiente» ya está decidida en `EXPERIENCE.md` 337, `addendum.md` 238 y UX-DR111; la ruta del registro y el Corpus versionado en git las separan.
- *arq-3*: que la reparación construye las constantes de SM-11 está escrito (`epics.md` 4141 y 4784; `prd.md` 1251; `SPEC.md` 144). El hueco real es otro y queda en el punto 2.
- *arq-5*: la forma de la clave (el apellido, no «Apellido, Nombre») y la propuesta por último apellido constan (FR-15; 26.10), y corregirla no mueve ninguna URL. Queda como nota *ind-2*.
- *arq-8*: la fecha en vivo de SM-11 ya figura entre las desalineaciones del SPEC y de `epics.md` para `bmad-architecture`, y el PRD la fija (`prd.md` 1251 y 1257).
- *arq-11*: una construcción local no mide sin `MEDICION_ENDPOINT` (`DESPLIEGUE.md` 305–307). Lo que sí escribe en producción queda en el punto 6.
- *ux-7*: la Paginación recoge lo construido (`DESIGN.md` 300) y Héctor la cerró el 19/10 dentro del barrido de reflujo (`epics.md` 4935 y 7152).
- *ux-8*: EXPERIENCE pide «enlace de bloque», y los chips lo son. La Fila de bloque es de la portada (UX-DR62), y la 27.6 lo resuelve con la resolución del 19/10.
- *ux-9*: la variante elegida de la maqueta dibuja la línea de arriba en su sitio con el portapapeles fallido, y EXPERIENCE da por completa la lista de divergencias.
- *spec-3*: con la ficha «Miguel de Cervantes», la última palabra lleva a la C. La forma de la clave y el riesgo de publicar sin revisar constan (`SPEC.md` 151).
- *spec-5*: mirar solo `main` es una decisión de AD-13. La zona de la cabecera la exigen la 23.7 y la 26.5, y el pie, sin zona, no registra nada.
- *spec-10*: la espina asigna la detección de una Obra desordenada a quien revisa la Página de Obra paginada al sembrarla.
- *ref1-5*: la 10.3 no tiene ningún criterio sobre `canShare`. La separación de guiones la registran la 25.1, la espina (117) y la 25.5, y la Cita de la prueba cabe en X y en Threads.
- *ref1-6*: medido: `git log -p` sobre los cinco directorios tarda unos 1,2 s y `--name-only` sobre `corpus/fuentes/`, 0,14 s. Además, un documento no se reescribe (espina 389).
- *ref2-1*: `AGENTS.md` fija que `publicadas` suma solo las cuatro familias de siempre, y una prueba lleva esa regla en su nombre.
- *ref2-3*: la forma y la propuesta de la clave constan. `tools/sembrar.ts` es idempotente y no crea Autores nuevos.
- *ref2-5*: la historia ya fija el `h2` por letra, el `h3` por Autor, que el pie queda fuera y qué se comparte, que son las filas (`epics.md` 4930).
- *ind-5*: que los valores de la 24.2 los da Héctor consta en la historia, en las preguntas abiertas y en el SPEC. Lo que queda es la marca en el tablero, en la nota *pm-7*.
- *ind-7*: la norma de alcance de `bmad-build` no parte por capas, y partir o seguir se lo pregunta `bmad-build` a Héctor. Además, esas dos historias no son las más largas de la v8.
- *ind-8*: FR-56 da la regla («de su superficie», sobre búsquedas asentadas) y basta una sola constante. Queda como nota *prd-1, conf-1*.
- *ind-14*: el nombre de la orden no cambia nada, y la 26.11 corre cuando ya existe. Queda como nota *arq-12*.
- *conf-2*: fijar el mínimo antes de leer la primera línea base es una condición de merge escrita en la Epic List, la 23.11 y la espina, y no choca con «no bloquea construir».
- *conf-6*: AD-9 hace de `umbrales.ts` el único sitio de los literales. «Con su constructor» en AD-13 los saca de `destinos.ts`, no de `umbrales.ts`.
- *conf-8*: el inventario de pruebas del diseño, companion del SPEC, fija el criterio nuevo de las dos pruebas. El verificador destapó `accesibilidad.spec.ts` 384–420, que queda en Notas (Código real).
- *pm-11*: la espina (527) ya cuenta los índices: 11.000 cargas con 100.000 filas son unas 9 filas por carga, y la 23.10 pide la cifra que da la plataforma.
- *comp-4*: insertar el campo sin reservarle hueco está decidido y su desplazamiento, aceptado. El CLS calculado ronda 0,10, sin pasarlo, y medir CLS sería un requisito nuevo.
- *comp-8*: `wrangler` se fija en versión exacta en la orden (`npx wrangler@4.151.1`, según la espina y la 23.3), y aplicar y desplegar en remoto son actos de Héctor.
- *comp-10*: la reversión es de todo el sistema (orden inverso, migraciones sin revertir), SM-C5 tiene su palanca y `CORTES_DE_SM8` cubre cualquier despliegue que cambie el instrumento.

<!-- bmad:context -->
<!-- Verified 2026-08-17 against 372e23f. Managed by bmad-project-context; edits inside this block are replaced on refresh. Keep anything you want preserved outside the markers. -->

## Sabiduría de Bolsillo

Sitio panhispánico de citas célebres en español, estático, construido con Astro 7 sobre un corpus de dominio público en ficheros versionados. El sitio no tiene base de datos ni servidor de aplicación; el receptor de medición (`medicion/`, Worker de Cloudflare con D1) es un plano aparte que escribe y nunca se lee desde el sitio. La planificación vive en `_bmad-output/planning-artifacts/`, el contrato destilado en `_bmad-output/specs/`, y el seguimiento de historias en `_bmad-output/implementation-artifacts/sprint-status.yaml`.

## Policy

- Nunca edites a mano los artefactos de `_bmad-output/planning-artifacts/` ni de `_bmad-output/specs/` — vuelve a ejecutar la skill BMad que los produjo (`bmad-prd`, `bmad-architecture`, `bmad-ux`, `bmad-spec`, `bmad-create-epics-and-stories`); cada una deriva su salida del `.memlog.md` de su carpeta y un retoque a mano se pierde en la siguiente pasada.
- Nunca borres ficheros de `corpus/` para «limpiar» — git es el único almacén del contenido y no hay copia en otro sitio. Para retirar una Cita, muévela a `corpus/_revision/`.
- Commitea los artefactos de planificación aparte y antes de empezar una historia, nunca en el mismo commit que el código.

## Where things are

- Antes de tocar `src/lib/` o `corpus/`: lee `_bmad-output/planning-artifacts/architecture/architecture-brainlySabiduria-2026-08-10/ARCHITECTURE-SPINE.md` — cada AD nombra la divergencia que impide.
- Qué construir y con qué contrato: `_bmad-output/specs/spec-brainlySabiduria/SPEC.md`, con sus companions en el frontmatter.
- Al implementar una historia: `_bmad-output/planning-artifacts/epics.md` tiene sus criterios de aceptación; marca el avance en `sprint-status.yaml`.
- Decisiones visuales y de comportamiento: `_bmad-output/planning-artifacts/ux-designs/ux-brainlySabiduria-2026-08-10/DESIGN.md` y `EXPERIENCE.md`. Mandan sobre cualquier maqueta.
- Orden de construcción y verificación de la v3: `GUIA-DE-ARRANQUE.md`, junto a la espina.

## Running and verifying

- El CI no ejecuta `npm run test:e2e`: las pruebas de Playwright solo corren en local, y lo hacen contra el sitio ya construido por `tests/servidor.mjs`, no contra `astro dev`.
- Itera por fichero de prueba: la suite unitaria serializa a propósito (`fileParallelism: false`) porque cada prueba lanza un `astro build`.
- `astro check` abarca todo el repositorio, no solo el sitio: `medicion/` y las pruebas e2e entran en el mismo programa de TypeScript.

## Conventions that differ from defaults

- Nombra las entidades en español según el glosario del PRD §3: `Cita`, `Autor`, `Tema`, `Procedencia`, `Colección`. Nunca `quote`, `frase` ni `author`, tampoco en identificadores de código.
- Un campo opcional sin valor se omite del fichero; nunca cadena vacía ni `null`. La distinción entre procedencia completa, parcial y ausente es de presencia de campos.
- Ningún componente lleva valores literales de color o tipografía — usa los tokens de `DESIGN.md` como propiedades personalizadas de CSS.
- La familia serif se aplica solo a texto de Cita, nombre de Autor y nombre de Tema.

## Known pitfalls

- Al añadir una página a `src/pages/`, declárala en `src/lib/superficies.ts`: es el único sitio donde se dice si una superficie es publicable, y de ahí salen el sitemap, el `noindex`, el índice de Pagefind y el barrido de accesibilidad. Sin declaración el build se para. Antes eran tres sitios y había que acordarse de los tres; `/404` y `/buscar` acabaron `noindex` para el buscador de fuera y visibles para el de dentro (Historia 12.1). Desde la 22.4 la Página de Obra depende además de la **lista de rutas indexables**, que `superficies.ts` recibe por `declararRutasIndexables` y que se declara en **dos instancias** del módulo —`Armazon.astro` en las páginas e `integraciones/indexables.ts` en la configuración—; sin ella `caracterDe` lanza ante una Obra. Un guion o una prueba que pregunte por una ruta de Obra la declara antes (y la olvida después).
- No traigas `@cloudflare/workers-types`: sus globales redefinen `Buffer` y descompilan las pruebas que leen cabeceras PNG. Declara en `medicion/worker.ts` solo la superficie de D1 que uses.

<!-- /bmad:context -->

## Una sesión de sembrado, de principio a fin

El objetivo de cada sesión no se elige: sale del hueco del Corpus, con una política
determinista (Historia 11.3). La sesión empieza y termina con la misma orden:

```
npm run objetivo            # qué hueco toca cerrar, y de dónde sale. No registra nada.
npm run sesion:registrar    # al terminar de sembrar: anota la sesión y el resultado medido.
```

Registrar **no es opcional**: de `corpus/sesiones-de-sembrado.yml` sale la cadencia de
sembrado que declara la Historia 11.4, y es la única serie medida que existe. Una sesión
sin registrar no la cuenta nadie. Si dedicas la sesión a otra cosa, anúlala con su motivo
—`npx tsx tools/objetivo.ts --anular "<motivo>" [--elegido "<objetivo>"]`—; una anulación
sigue siendo una sesión corrida y cuenta igual para la cadencia.

Entre las dos órdenes, sembrar son tres pasos y ninguno acepta metadato tecleado:

```
# 1 — el documento, versionado
npx tsx tools/recuperar.ts "<url de la Fuente>"
# 2 — las candidatas, a corpus/_revision/
npx tsx tools/extraer.ts corpus/fuentes/<documento>.txt --autor <slug>
# 3 — decidir, una por una
npx tsx tools/revisar.ts
```

**`extraer` ya no acepta un `--autor` que el documento contradiga** (FR-23, Historia 11.1).
El documento declara quién firma en la misma declaración literal de la que salen la obra y
el año, así que la orden lo coteja contra el `nombre` de `corpus/autores/` y se niega, con
código 1, cuando no concuerdan: el mensaje pone delante las dos partes. También se niega
cuando el `--autor` no nombra a ningún Autor del Corpus —antes de leer el documento— y
cuando el documento declara un autor que la orden no sabe interpretar, que no es lo mismo
que no declarar ninguno. El hallazgo que la abrió está en
`_bmad-output/implementation-artifacts/deferred-work.md`: `--autor juan-montalvo` sobre «El
sable» —que declara «Manuel González Prada»— dio 32 candidatas atribuidas al Autor
equivocado, y el cotejo de la 11.2 las habría dado por buenas, porque el texto **está** en
ese documento.

Lo que esa puerta **no** cierra, y conviene no confiarle: no dice que la Cita sea del
Autor, dice que el documento y el Corpus llaman igual a quien firma el documento. Una copla
ajena citada dentro de la obra —el caso de Palma en «Predestinación»— sigue pasando. **Las
citas que la Fuente trae dentro no se publican**, y eso lo mira quien revisa. Tampoco
distingue a un Autor del homónimo que el Corpus no desambigua —«Séneca» concuerda con
«Séneca el Viejo»—; eso se cierra declarando el nombre completo en `corpus/autores/`.
Cuando el documento no declara autor —o firma «Anónimo», que es lo mismo—, el informe de
`extraer` lo dice —«Autor sin cotejar»— para que se vea que la puerta no actuó.

**Las biografías no son obras, y no se siembran.** La semblanza de un Autor sale de una Fuente
**mutable** —Wikipedia en español—, que solo entra por revisión: la misma orden, con el enlace
permanente de una revisión (`oldid=N`), y sin él se niega con código 1 sin pedir nada:

```
npx tsx tools/recuperar.ts "https://es.wikipedia.org/w/index.php?title=<Artículo>&oldid=<N>"
```

El título del artículo y la fecha de la revisión no salen de la URL tecleada: los **declara la
Fuente** (su API, por `revids=N`), y si la URL trae otro título la orden se niega nombrando los
dos. Descarga solo el wikitexto de esa revisión —nunca la página renderizada ni la dirección
viva— y lo versiona en `corpus/biografias/{fuente}--{titulo}--r{N}.txt`, con la revisión en el
nombre y en la cabecera, y la licencia **de esa revisión** (CC BY-SA 3.0 antes del 2023-06-29,
4.0 desde entonces): otra revisión es otro documento y no reemplaza al anterior. **El cotejo de
Citas no lee `corpus/biografias/`**, así que de una biografía no sale ninguna candidata ni se
documenta ninguna Cita, y una Cita cuya Fuente es mutable rompe el build.

El Autor declara su biografía con una orden, **nunca tecleando el campo**: lee la revisión de
la cabecera, comprueba que el documento es la biografía de una Fuente mutable y escribe
`biografia: { documento, revision }` en la ficha. El build rompe si el documento falta, no se
deja leer, no es de una Fuente mutable o no es esa revisión.

```
npx tsx tools/autor.ts biografia <slug-de-autor> <documento de corpus/biografias/>
```

**Con biografía, la `semblanza` de la ficha se coteja literal contra el cuerpo de esa revisión**
—misma comparación que las Citas, al menos 8 palabras y sin marcado de wikitexto; si no, el
build rompe nombrando el fichero de Autor—, y se publica solo en la página 1 de `/autor/{slug}/`,
fuera de Pagefind y con su atribución visible («Semblanza tomada de «Título» en Wikipedia en
español, revisión N · licencia», enlazada al permanente y a la escritura de la licencia).
Meta, JSON-LD y páginas 2+ dicen hechos del Corpus; qué superficie la porta lo decide
`src/lib/atribucion.ts`. La Tarjeta de Autor, de todos, lleva solo nombre, años y Citas documentadas.

## Leer el estado de indexación

El sitio cumple desde hace tiempo la exigencia de *ser* indexable y aun así el buscador ha
indexado 8 URL de 1.715. *Estar* indexado es decisión suya, y la única forma de saber si algo
lo mueve es comparar el reparto **por familia** a lo largo del tiempo:

```
npm run indexacion              # consulta, agrega por familia e informa. NO escribe nada.
npm run indexacion:registrar    # además anota la entrada de hoy en la serie.
```

La serie vive en `corpus/serie-de-indexacion.yml` y **es idempotente por fecha**: una segunda
lectura de la misma jornada *reemplaza* a la primera. Es la diferencia con
`sesiones-de-sembrado.yml`, que solo añade porque mide hechos acumulables; esto mide un estado.
Por eso consultar no registra: una consulta de tanteo anotada se llevaría por delante la
lectura buena del día.

**Una familia que no se pudo leer se omite y jamás se escribe como cero.** Sale nombrada en
`sinLeer` con su motivo. El cero real es casi el estado de partida, así que un cero fabricado
sería indistinguible de él — y la cifra que se compara con la meta de indexación es la de la
familia **Cita**, nunca el agregado del sitio.

Necesita `SEARCH_CONSOLE_CREDENCIALES` —la clave JSON de una cuenta de servicio, o la ruta del
fichero que la contiene— y que esa cuenta esté dada de alta **como propietaria** de la
propiedad en Search Console; un permiso de menos devuelve 403 en cada URL. El paso manual, con
sus trampas, está en `DESPLIEGUE.md` §5. Sin la variable la orden no escribe nada, nombra lo
que falta y sale con **código 2**, propio y distinto del 1 de cualquier otro rechazo, para que
un guion pueda separar «falta la credencial» de «la lectura falló».

La orden tarda minutos a propósito: la fuente concede 2.000 inspecciones al día y 600 por
minuto por propiedad, se pide una URL por petición y se van espaciando. Al pasar de ~2.000 URL
publicadas la lectura pasa sola a **muestreo por familia**, con el tamaño de muestra escrito en
cada entrada.

**La familia Obra** (Historia 22.8) se mide en esta serie y en ninguna otra todavía. Su censo
son las rutas `/obra/…` del **sitemap publicado** —nunca una página `noindex`—, que se pide al
sitio en línea o se lee de `--sitemap <fichero>`; sin sitemap legible, o con uno que no trae
ninguna Obra, la familia va a `sinLeer` con su motivo, jamás a cero. Cada familia de la entrada
anota qué conjunto midió, `censo: publicadas | sitemap` (las entradas viejas no lo traen y se
siguen leyendo), y el `publicadas` de la entrada suma solo las cuatro de siempre. Mientras
`SM11_VIGENTE` (`src/lib/umbrales.ts`), Autor y Obra se leen **enteras** después de reservar el
suelo de las demás —si no caben, se muestrean y se dice—, y el informe da la línea SM-11: Obra
frente a Autor de la misma lectura y, desde `PRIMER_DESPLIEGUE_DE_OBRAS` más
`SEMANAS_HASTA_JUZGAR_SM11`, «toca juzgar SM-11: lo decide Héctor».

## Leer el tráfico orgánico

Un sustituto de SM-2 sale de Search Console por mes, y se versiona igual que la indexación:

```
npm run trafico              # lee los 16 meses que conserva la fuente e informa. NO escribe nada.
npm run trafico:registrar    # además anota los meses leídos en la serie.
npm run trafico -- --meses 2 # solo los dos últimos (1–16), incluido el mes en curso.
```

La serie vive en `corpus/serie-de-trafico.yml`, **una entrada por mes** (`mes: "AAAA-MM"`) con
`leidoEl`, clics, impresiones, CTR y posición en total y por familia. Una segunda lectura del
mismo mes **reemplaza** a la primera: releer agosto en septiembre corrige agosto, no añade otra
fila. Se piden solo datos definitivos (`dataState: final`), que llegan con unos 3 días de
retardo: lleva `parcial: true` el mes en curso y también el anterior mientras su último día
caiga dentro de ese retardo. **Registra a partir del día 4 de cada mes**, que es cuando el
anterior queda cerrado. Un total que llega sin filas no es un cero: la fuente aún no tiene
datos definitivos, y el mes no se escribe.

**Son clics de Search Console, un sustituto de SM-2 y no sus sesiones.** Se comparan entre
meses de esta serie, nunca contra una cifra de sesiones. Y el `total` sale de una consulta sin
dimensiones, que no es la suma de las familias y difiere en los dos sentidos: la consulta por
página omite las filas anonimizadas (la suma queda por debajo) y agrega por página donde el
total agrega por propiedad (la suma puede quedar por encima).

La familia de una URL sale **del censo de lo publicado**, nunca del prefijo de la ruta. Lo que no
casa —la portada, páginas 2+, Citas retiradas, otro host como `www.`— se suma en
`fueraDelCenso`, que se escribe y se informa: nunca se descarta en silencio. La familia Obra no
se cuenta todavía, ni una familia sin URL publicadas. **Cada pasada reatribuye los meses
pasados con el censo de hoy**: una Cita retirada desde entonces pasa a `fueraDelCenso`.

**Ausencia antes que cero.** Un mes cuya consulta falla no se escribe y conserva su entrada
anterior; sale nombrado en `sinLeer` del informe con su motivo. Una familia cuya consulta por
página falla va a `sinLeer` de la entrada, salvo que el mes ya tuviera familias registradas: entonces
el mes entero se trata como sin leer y la entrada previa se conserva. Jamás se escribe cero por
un fallo; una familia leída sin filas sí es un cero real.

Usa la misma credencial que la indexación, `SEARCH_CONSOLE_CREDENCIALES`, con la cuenta dada de
alta **como propietaria** (`DESPLIEGUE.md` §5).
Sin ella no escribe nada y sale con **código 2**, igual que con una bandera desconocida o un
`--meses` mal formado; sale con **1** si no pudo leer el corpus o la serie, si no pudo leer
ningún mes o si falla la escritura, y en esos casos tampoco escribe nada. Ningún módulo de `src/` lee la serie (AD-24).

## Leer la demanda por página

FR-49 prioriza el sembrado por demanda, y la demanda sale de Search Console **por página** —
nunca por consulta, que llega anonimizada—, repartida por Autor, por Cita y por familia:

```
npm run demanda              # lee la ventana de 28 días e informa. NO escribe nada.
npm run demanda:registrar    # además anota las ventanas leídas en la serie.
npm run demanda:registrar -- --rellenar   # y los meses cerrados de los 16 que falten.
```

La serie vive en `corpus/serie-de-demanda.yml`, **una entrada por ventana** con `desde`,
`hasta`, `clase` (`"28-dias"` o `"mes"`) y `leidoEl`; la clave de reemplazo es el par
`desde`–`hasta`. La ventana de 28 días termina en el último día con datos definitivos —hoy
menos los 3 de retardo de `dataState: final`— y empieza 27 antes, así que dos lecturas del
mismo día dan la misma ventana y la segunda **reemplaza** a la primera. La **primera lectura**
—la serie no tiene ninguna entrada `mes`— lee además, una entrada cada uno, los meses
**cerrados** de los 16 que conserva la fuente; las siguientes, solo la de 28 días. **Tras la
primera lectura, la serie mensual solo crece con `--rellenar`**, que pide además los meses
cerrados de los 16 que falten en la serie: es la vuelta atrás de un mes que falló en la primera
lectura y la forma de añadir cada mes que se cierra después. Sin la bandera, ninguno se pide.

**Las ventanas de 28 días se solapan y no se suman** entre sí ni con las mensuales: cada una es
una foto de su ventana. Las fechas de la fuente van en hora del Pacífico, y la ventana se
calcula con el calendario local de quien ejecuta la orden.

**Atribución por el prefijo más largo.** Una ruta es de Cita si, normalizada, es
`/cita/<slug>` del host canónico —decodificada y en minúsculas—, esté publicada o retirada.
Su Autor es el slug de `corpus/autores/` que, seguido de guion, sea el prefijo más largo del
slug —`seneca-el-viejo-…` no es de `seneca`, y un slug igual al del Autor no es suyo—, por `autorPorPrefijo` de `tools/lib/autoria.ts`, el mismo dueño que usa retirar un
Autor. Una ruta de Cita sin prefijo de Autor va a `sinAutor` y el informe la nombra. Una Cita
con menos de `MIN_IMPRESIONES_POR_FILA` (5) impresiones no se versiona en `citas`: se suma en
`resto` —cuyo `filas` cuenta Citas, no filas de la fuente—, y sí cuenta en su Autor. El reparto por familia es el de la serie de tráfico
(`agregarPorFamilia`, con su `fueraDelCenso`), así que una Cita retirada cuenta en su Autor y,
por familia, fuera del censo.

**Ausencia antes que cero.** Una ventana cuya consulta falla, o cuyo reparto no se puede
componer, no se escribe —se conserva la entrada anterior si la había— y sale en el `sinLeer`
del informe con su motivo. Una ventana que llega **sin ninguna fila** sí es una lectura —toda
ventana que se pide ya salió del retardo de los datos definitivos— y se escribe sin Autores y
con `vacia: true`: «sin demanda» no es «no leído». La serie **no entra** en `src/lib/objetivo.ts` ni en `npm run huecos` en este ciclo,
y ningún módulo de `src/` la lee (AD-24).

Misma credencial que la indexación y el tráfico, `SEARCH_CONSOLE_CREDENCIALES`, con la cuenta
dada de alta **como propietaria** (`DESPLIEGUE.md` §5). Sin ella no escribe nada y sale con
**código 2**, igual que con una bandera desconocida; sale con **1** si no pudo leer el corpus o
la serie, si no pudo leer ninguna ventana o si falla la escritura, y entonces no escribe nada.

## Pedir rastreo de unas pocas URL, y anotarlo

Google conoce las 1.715 URL y aun así indexa 2 de cada 80: no es descubrimiento, es que un
sitio nuevo sin enlaces entrantes no recibe presupuesto de rastreo. Se puede pedir rastreo
de una selección corta en Search Console — **a mano, y solo una persona**: la API de
inspección informa y no solicita, y la Indexing API solo admite ofertas de empleo y
retransmisiones. La orden no pide nada; **anota lo que ya se pidió**:

```
npm run rastreo                                          # lista lo pedido. NO escribe nada.
npm run rastreo -- --registrar <url> [<url>...]          # anota lo que ya se cursó
npm run rastreo -- --registrar <url> --fecha 2026-09-04  # con su fecha real, si fue otro día
```

Sin el registro no sirve de nada haber pedido: cuando `corpus/serie-de-indexacion.yml`
muestre movimiento en una familia, esto es lo único que dirá si esas URL entraron **porque se
pidieron** o porque les tocaba. La consulta cruza los dos ficheros y dice de cada familia
cuántas de sus URL se pidieron frente a cuántas están indexadas.

`corpus/peticiones-de-rastreo.yml` **solo añade**, y es lo contrario de su vecina. La serie
mide un estado y por eso reemplaza por fecha; esto registra actos, y pedir la misma URL dos
días son **dos peticiones** — borrar la primera perdería justo el dato de si repetir sirve.

**La selección la escribe una persona.** La orden no elige y solo se niega a dos cosas: a
anotar una URL que el sitio no publique —una ruta inexistente, un listado paginado, la
búsqueda— y a anotar más de diez de golpe, porque §4.17 declara que pedir rastreo de 1.715
URL no es una petición, es ruido. Un rechazo sale con código 1; una bandera mal escrita, con
2. No se anota nada que no corresponda a una petición real: una entrada inventada es peor que
no tener el registro. Mientras la familia Obra esté congelada (`CONGELACION_DE_OBRAS`, Historia
22.8), toda URL de Obra se rechaza con 1, nombrando la congelación.

## Anotar lo que se publica en el canal

Se publica a diario en varias cuentas, y sin registro a los 90 días no se distingue «la
página no trae visitas» de «se publicó la mitad de las semanas». La orden no publica nada;
**anota lo que ya se publicó**, una publicación por invocación:

```
npm run canal                                                  # por semana ISO y red. NO escribe nada.
npm run canal -- anotar facebook foto /cita/<slug>/            # anota lo publicado hoy (marcado: false)
npm run canal -- anotar instagram foto https://<dominio>/cita/<slug>/?de=instagram   # marcado: true
npm run canal -- anotar tiktok reel - --fecha 2026-10-08 --nota "vídeo del Kit"      # sin enlace
```

La red es una del conjunto cerrado de `src/lib/redes.ts`; el formato, `foto`, `reel`, `pieza`
o `historia`; la ruta, una que el sitio **publica** —la juzga `rutasPublicadas`, igual que en
rastreo— o `-` si no enlaza. Se acepta la URL entera y se guarda la ruta. `--nota` se guarda tal
cual y se omite si no se da.

**El campo `marcado` es la mitad del cierre de la 18.2.** Vale `true` si el enlace tecleado
llevaba `?de=<red>` con la misma red de la publicación y `false` si no llevaba marca; un enlace
marcado para **otra** red se rechaza, porque sus visitas se atribuirían a otra cuenta. Lo que
va con `-` no lleva el campo. Pega el enlace del Kit, que ya sale marcado, y no la ruta a pelo.

Un rechazo de lo dicho —red ajena, formato desconocido, ruta no publicada, enlace marcado para
otra red, fecha futura, un Corpus o un registro ilegibles— sale con código 1; la forma de la
invocación —bandera mal escrita o repetida, argumentos de menos o de más, `--fecha` sin forma
de jornada, `--nota` vacía—, con 2. En ninguno de los dos casos se escribe nada.

`corpus/publicaciones-de-canal.yml` **solo añade**, como `peticiones-de-rastreo.yml` y al
revés que las series: dos fotos el mismo día en la misma cuenta son dos publicaciones. Se
escribe por `appendFile` tras validar el fichero y la entrada, y se relee después para
comprobar que la última entrada es la nueva; un fichero ilegible —o una entrada a mano con una
red, un formato o una fecha imposibles— se niega sin tocarlo. La consulta desglosa a dónde
enlaza cada semana y red —Cita, Autor, Colección, portada, «otra», «ya no se publica» y «sin
enlace»— con la familia sacada del censo, cuenta los días con `foto` y los enlaces marcados, y
da por red la racha actual y la máxima de semanas ISO **consecutivas** con foto los 7 días y
todo enlace marcado: «La 18.2 se cierra con 4: lleva N». Ningún módulo de `src/lib/` lo lee
(AD-24), y el fichero se versiona con su cabecera y la lista vacía: ningún agente anota
publicaciones que no ha hecho.

### Anotar una señal externa

La misma orden anota los enlaces hacia el sitio desde fuera (Historia 21.4), para que cuando
`serie-de-indexacion.yml` se mueva se sepa si antes hubo una señal y de qué clase:

```
npm run canal -- senal https://www.tiktok.com/@sabiduriabolsillo / --tipo propia     # la bio, hoy
npm run canal -- senal https://linktr.ee/sabiduriadebolsillo /?de=instagram --tipo propia --fecha 2026-10-08
npm run canal -- senal https://blog.ejemplo.org/resena /cita/<slug>/ --tipo ajena --nota "reseña"
npm run canal -- senal https://blog.ejemplo.org/resena /cita/<slug>/ --tipo ajena --retira 2026-10-09
```

`--tipo` es obligatorio: **propia** si el enlace lo puso Héctor —la bio de TikTok, el
Linktree, el campo web de Facebook—, **ajena** si lo puso un tercero. El origen es una URL
`http(s)` pública que no sea del dominio propio ni de ningún subdominio suyo, y se guarda tal
cual se tecleó. El destino se recorta y se juzga como la ruta de `anotar` —`rutasPublicadas`,
sin `?…` ni `#…`, ruta del censo— y lleva `marcado: true` solo si su cadena de consulta traía
`?de=<red>`. `--fecha` y `--nota` funcionan como en `anotar`, salvo que la fecha **puede ser
anterior al canal**: una bio o un enlace ajeno pueden existir de antes.

Código 1 si lo dicho se rechaza: un origen que no es una URL http(s) absoluta, que es del
dominio propio o de un subdominio suyo, localhost, una IP, un host sin punto o una URL con
usuario o contraseña; un destino que el sitio no publica; una marca ?de= de una red que no
existe, o más de una; una fecha futura; un --retira sin señal igual viva en esa fecha; o un
registro que no se deja leer. Código 2 si falla la forma de la invocación: sin --tipo o con
un tipo que no es propia ni ajena; una bandera desconocida o repetida; argumentos de menos o
de más; un --fecha o un --retira sin forma de jornada; una --nota vacía; --tipo o --retira
fuera de senal. Ninguno de los dos escribe nada.

Cada suborden lee solo su registro: un `senales-externas.yml` roto no impide `anotar`, ni un
`publicaciones-de-canal.yml` roto impide `senal`. La consulta enseña lo que pudo leer,
nombra lo que no y sale con 1.

`corpus/senales-externas.yml` **solo añade**, con la misma escritura que las publicaciones.
Anotar dos veces el mismo enlace —mismo origen, destino y tipo— se admite con un aviso
(«ya hay una igual del AAAA-MM-DD»), y la consulta cuenta **enlaces distintos**, no entradas.
**Una señal anotada por error se deshace con `--retira <fecha>`**, que anota una entrada
nueva con `retira:` y la misma terna; la consulta deja de contar la retirada. Nada se
reescribe.

La consulta `npm run canal` da un bloque «Señales externas» que separa propias de ajenas,
por fecha, con origen, destino y familia del destino, y señala la ajena que lleva `?de=`
(«copia un enlace del Kit»). **La 18.1 no se cierra con señales propias, sino con la primera
ajena**, y la consulta la nombra con su fecha, origen y destino. Las propias de la semana del
ciclo se anotan el día que se ponen; a los 14 días de la primera, se mira a mano en el
informe de Enlaces de Search Console si su dominio figura como dominio de referencia y se
anota a mano como comentario al final del fichero. La consulta dice si eso «aún no toca» o
está «pendiente desde AAAA-MM-DD». La orden no lee Search Console ni hace peticiones de red,
el sitio no lee el fichero (AD-24), y se versiona con su cabecera y `senales:` vacío: ningún
agente anota señales que no ha visto.

## Documentar una Cita ya publicada

Las Citas anteriores a la v3 se publicaron cuando la Procedencia se tecleaba, y siguen en
el censo de `corpus/pendientes-de-cotejo.yml` porque no tienen documento. Darles uno es lo
que hace la Historia 11.4, y se hace con esta orden — **nunca** editando el `.md` a mano y
borrando la línea del censo:

```
npx tsx tools/recuperar.ts "<url de la Fuente>"      # primero, el documento
npm run documentar -- <slug-de-cita> corpus/fuentes/<documento>.txt
npm run documentar -- <slug> corpus/fuentes/<doc>.txt --texto "<el texto literal de la edición>"
npm run documentar -- --retirar <slug> "<motivo>"
```

**Nada se escribe si el texto no aparece literal en el documento.** Es la puerta entera: si
documentar se pudiera hacer sin cotejar, sería teclear una Procedencia con más pasos. La
obra y el año salen del documento —no hay banderas `--obra` ni `--año`— y documentar
**saca la Cita del censo en el mismo gesto**, porque una Cita que declara Fuente y sigue
censada rompe la construcción, y un slug del censo sin Cita publicada también.

**Y la orden ya no ata una Cita a un documento firmado por otro** (FR-23). Coteja el Autor
que la Cita declara —por el `nombre` de su ficha en `corpus/autores/`— contra el que
declara el documento, con la misma comparación que usa `extraer`, y se niega con código 1
cuando no concuerdan; también cuando el documento declara un autor que no sabe interpretar.
Importa más de lo que parece porque documentar **descensa**: sin esta puerta, una Cita
atada al documento de otro no solo quedaba mal atribuida, sino que salía de
`pendientes-de-cotejo.yml` y quedaba registrada como verificada. Si el documento no declara
autor —o firma «Anónimo»—, documenta igual y el parte lo dice: «Autor: sin cotejar».

**Cuando el cotejo falla, casi siempre es la puntuación.** El texto se tecleó en la v1
normalizando comas y puntos finales, y la edición dice lo mismo con otros signos. Eso se
corrige con `--texto`, que restituye el texto literal de la edición: el texto nuevo también
tiene que aparecer literal en el documento —si no, se estaría inventando— y tiene que
parecerse al publicado por encima de `MIN_PARECIDO_PARA_CORREGIR` (0,85 sobre la forma
canónica de AD-3), que es lo que impide cambiar una Cita por otra de la misma página. El
slug **no** se recalcula aunque el texto cambie: es la URL (AD-4).

**De una obra traducida se conserva lo que la Fuente declara** (Historia 19.1). `recuperar`
registra el traductor en la cabecera del documento (`traductor:` y, si consta,
`añoDeTraduccion:`), y `extraer` y `documentar` escriben ya `procedencia.traduccion`
—traductor y, si consta, año—. El año es de la traducción **solo si sale del mismo bloque
que el traductor** (la página, la obra declarada o el índice); el de otro bloque sigue siendo
el de la Obra. Lo ya publicado se restituye con
`npm run documentar -- --restituir-traduccion`, que lee la declaración de cada documento
versionado sin reescribirlo, recorre también las candidatas de `corpus/_revision/` (las
cuenta aparte) y es idempotente. Lista sin tocarla la Cita cuyo año publicado no casa con el
declarado junto al traductor, la que ya trae una traducción distinta y la que aparece en
páginas que declaran traducciones distintas. Una Cita cuyo único año era el de la traducción
pasa a procedencia «parcial», y es lo cierto. `npx tsx tools/auditoria.ts` da la cifra de
Citas con documento de Autor `otra` sin traducción (con desglose por Autor en `--json`).
El traductor de Gutenberg no se lee todavía.

Lo que no es la misma Cita se retira, siempre con su motivo: `--retirar` **mueve** el
fichero a `corpus/_revision/` (AD-2) y lo saca del censo. No borra nada, y el motivo va en
el mensaje del commit — git es el único almacén (AD-10). Sin motivo la orden se niega, con
código 2: una retirada sin motivo no es una retirada, es una desaparición.

## Retirar un Autor

Un Autor que sale del Corpus se retira con su orden, **nunca con un `git mv` a mano**:

```
npx tsx tools/autor.ts retirar <slug> --motivo "por qué sale del Corpus"
```

**Descartar no basta, y por eso existe la orden.** El cruce por época cuenta como sembrado a
todo fichero de `corpus/autores/` —`slugsSembrados`, «sembrado gana a descartado»—, así que
un `epocas.ts --descartar` no surte efecto mientras la ficha siga ahí. El 2026-09-14 Fray Luis
de León y Tito Lucrecio Caro se descartaron y sus épocas los siguieron contando hasta mover
las fichas a mano.

La orden **mueve** la ficha a `corpus/_autores-retirados/` (AD-2): no borra, no sobrescribe
una ficha retirada con el mismo nombre, y devolverla es moverla de vuelta. **Se niega**, con
código 1 y sin mover nada, mientras algo del Corpus apunte al Autor, y lo dice todo a la vez:

- una Cita publicada suya —el build no tendría a quién atribuirla—;
- una candidata suya en `corpus/_revision/` —aprobarla publicaría una Cita sin Autor—;
- una Ficha de Obra suya, activa en `corpus/obras/` —una ficha cuyo Autor no existe rompe el
  build; se retira antes con `npm run obra -- retirar`— o retirada en `corpus/_obras-retiradas/`;
- un miembro de Colección, publicada o despublicada, o una fijación de `corpus/portada.json`,
  que sea Cita suya. Estos son slugs sueltos que pueden no resolver ya a ninguna Cita, así que
  se atribuyen por el prefijo del slug de Autor **más largo**: `seneca-el-viejo-…` no es de
  `seneca`. Una portada ilegible también bloquea, porque no se puede afirmar que no apunte a él.

Sin `--motivo` sale con código 2. El motivo va en el mensaje, y de ahí al del commit (AD-10).

**Retirar no escribe el descarte por época.** El motivo de un descarte —por qué la Fuente no
da Citas suyas— no es el de una retirada. La salida busca al Autor en
`corpus/candidatos-por-epoca.yml` por su slug y por su `tituloEnFuente`, y dice si ya consta
descartado o da la orden exacta que falta:
`npx tsx tools/epocas.ts --descartar <slug-de-candidato> --motivo "…"`.

## Las fichas de Obra

Cada Obra con Citas publicadas tiene una **Ficha de Obra** en
`corpus/obras/{slug-autor}--{slug-obra}.yml`, con `autor`, `titulo`, `formas` y, opcional,
`distintaDe` (Historias 22.1 y 22.2, AD-25). La identidad de la Obra es el par (Autor, forma
canónica de `normalizar`); el título es presentación. El nombre del fichero sale del título
**una sola vez**, al crear la ficha, sin la truncación de los documentos de Fuente, y no se
recalcula nunca: será la URL de la Página de Obra.

```
npm run obra -- sembrar                                      # crea las que falten. Idempotente.
npm run obra -- retirar <nombre-de-ficha> --motivo "…"       # la mueve a corpus/_obras-retiradas/
```

**Nadie escribe ni borra fichas a mano.** En `tools/lib/obras.ts` una sola función decide
qué ficha hace falta, en solo lectura (`resolverFichaDeObra`), y una sola la escribe
(`aplicarFichaDeObra`). `revisar` al aprobar, el alta y `documentar` cuando cambia la obra
**resuelven antes** de publicar la Cita —una colisión deja la Cita sin publicar, también en
el alta en seco— y **escriben la ficha después** de que la Cita esté escrita; `documentar` la
mete en su vuelta atrás. Busca la forma entre las activas y las retiradas, restaura la
retirada en vez de crear otra (salvo que una activa ya reclame alguna de sus formas), nunca
sobrescribe y se niega ante una colisión de nombre. Una obra cuya forma canónica es vacía
—«…»— no necesita ficha. Escribir una candidata en `_revision/` no crea ficha. El título de una ficha nueva es la grafía literal que más Citas usan (empate: la
primera alfabética), la regla `grafiaPorOmision` de `src/lib/obras.ts`.

**La excepción es `nota`** (Historia 22.6), el único campo de la ficha que se edita a mano y
solo lo escribe Héctor: una línea de 1 a `MAX_CARACTERES_NOTA_DE_OBRA` (160, en
`src/lib/umbrales.ts`) puntos de código tras recortar, sin saltos de línea, que la Página de
Obra pinta al pie de su página 1. Ninguna orden la rellena —ni `sembrar` ni la aprobación—, y
las que reescriben o mueven una ficha (`titular`, `separar`, `retirar`) la conservan. `reunir`
conserva la de la destino y **no hereda** la de la absorbida: se queda en
`corpus/_obras-retiradas/` y el parte lo dice.

El build (`integraciones/obras.ts`) **rompe** por una Obra publicada sin ficha —con la orden
que la crea—, por una forma reclamada por dos fichas, por un nombre sin forma de slug o
repetido (`.yml` y `.yaml`, o anidado), por un nombre cuyo prefijo no es su `autor` y por un
`autor` que no existe; una ficha sin Citas publicadas **avisa** y no rompe.
Retirar se niega, con código 1 y sin mover nada, mientras una Cita publicada o una candidata
la resuelva —una candidata ilegible también bloquea—; sin nombre o con el motivo ausente o en
blanco sale con 2. Cuando `documentar` deja sin Citas la ficha de la obra anterior, lo dice y
da la orden de retirarla.

`sembrar` informa además de los grupos de grafías equivalentes y de los pares en que una
forma es prefijo de otra del mismo Autor.

**`ediciones`** (Historia 22.9) es el otro campo que decide Héctor, y **no se escribe a mano**:
lo escriben sus dos órdenes, que lo validan con el esquema del build.

```
npm run obra -- edicion <ficha> <tienda> <impresa|electronica> <url> [--descripcion "<texto>"]
npm run obra -- quitar-edicion <ficha> <n>     # n: la posición, como la numera el parte de `edicion`
```

Corregir una edición es quitarla y volver a declararla. Sin ediciones el campo se omite —nunca
`ediciones: []`—. Las órdenes que reescriben o mueven una ficha (`titular`, `separar`, el
ajuste del título de `documentar`/`restituir-grafia`, `retirar`) las conservan; `reunir`
conserva las de la destino, no hereda las de la absorbida y lo dice. Cómo se encienden y qué
exige cada edición: «Encender la afiliación de libros».

### Una obra, un nombre (Historia 22.2)

```
npm run obra -- restituir-grafia <slug-de-cita>          # iguala la obra de una Cita del censo a la de su documento
npm run obra -- reunir <ficha-destino> <ficha-absorbida>  # una sola Obra: une formas, retira la absorbida
npm run obra -- separar <ficha> <ficha-otra>             # dos Obras distintas: distintaDe en las dos
npm run obra -- titular <ficha> "<grafía>"               # elige el título entre las grafías publicadas
```

**Literal** es una grafía de `procedencia.obra` igual —colapsando espacios y nada más— a la
`obra:` de la cabecera de **su** documento (`documentosDeCita`; con varias páginas basta una).
Una Cita sin documento no es literal. El build **rompe** cuando una Obra (Autor, forma) se
publica con dos o más grafías y alguna no es literal, nombrando los ficheros, las grafías, la
forma y la orden: `restituir-grafia` si hay un documento versionado de esa Obra, `documentar`
si no. **Avisa** de dos formas del mismo Autor en fichas distintas cuando una es prefijo de
palabra de la otra —se calla con `separar` (`distintaDe`) o reuniendo— y de un `titulo` que
ya no declara ninguna Cita publicada (la grafía efectiva pasa a ser la de `grafiaPorOmision`).

De las cuatro órdenes, **solo `restituir-grafia` reescribe una Procedencia**, y fuera de ellas
solo lo hace `documentar`. Lo hace solo sobre una Cita **del censo**, solo para igualarla a la
cabecera de un documento versionado del mismo Autor (cotejado como en `documentar`) con la
misma forma, **sin sacarla del censo**, y pone al día el `titulo` de la ficha en el mismo gesto
si deja de sostenerse. La puerta solo la sugiere cuando se dan esas condiciones; si no, sugiere
`documentar`. `reunir` no mueve ninguna Cita ni ningún documento,
se niega entre Autores distintos y avisa siempre de que la URL de la absorbida dará 404 cuando
las Obras tengan página. `titular` solo admite una grafía que declare alguna Cita publicada de
la Obra, tal cual. `documentar` y `documentar --retirar` también ponen al día el `titulo` en
el mismo gesto si deja de sostenerse. Un `distintaDe` que ya no nombra la forma de ninguna
ficha activa del Autor avisa como declaración rancia. Códigos: 2 es la forma de la invocación, 1 lo que dice.

**Reunir o separar no lo decide la orden ni ningún agente: lo decide Héctor.** Las reuniones
conocidas están propuestas, con sus datos y la orden exacta, en
`_bmad-output/implementation-artifacts/propuesta-reuniones-de-obra.md`.

### La obra se llama igual en todas partes (Historia 22.3)

Toda superficie nombra la obra con el **título de su Obra resuelta** (`cita.obra.titulo`), que
`src/lib/obras.ts` deriva con `resolverObras` y `src/lib/publicado.ts` cuelga en cada Cita:
la Atribución, lo copiado, el JSON-LD, la Tarjeta, la Imagen de Cita, la Imagen del Kit y la
Pieza. **Fuera de `src/lib/obras.ts` y `src/lib/admision.ts`, nada de `src/` ni de
`public/islas/` lee `procedencia.obra`**; lo fija una prueba de `tests/unit/obras.test.ts`.
El año que acompaña al título en la Atribución, lo copiado, la Imagen y la Tarjeta es el de la
Procedencia de **esa** Cita. El `isPartOf` del JSON-LD describe la Obra y lleva el año de la
Obra, y sin él va sin fecha.

El build **avisa** «Obra con años discrepantes» cuando las Citas de una misma ficha declaran
`procedencia.año` distintos, y nombra la ficha y los años. Significa que la Obra no tiene año:
se omite, nunca se elige uno ni se infiere, y el año de una traducción nunca cuenta. No rompe
y **todavía no se puede silenciar**. Decidir el año de la Obra —o corregir la Cita mal
fechada— queda para cuando la Obra tenga página.

### La Página de Obra (Historia 22.4)

Toda Obra con al menos una Cita publicada tiene página en `/obra/{slug-autor}/{slug-obra}/`
—los dos segmentos salen del nombre de su ficha partido por el primer `--` (`segmentosDeObra`),
y la ruta la compone `rutaDeObra` en `src/lib/superficies.ts`; `rutaDeLaObra` hace las dos cosas
desde una Obra resuelta—,
y el título de la Atribución enlaza a ella. **Existir no es indexarse** (FR-52): solo se
indexa con al menos `MIN_CITAS_OBRA_INDEXABLE` Citas y **menos** de
`MAX_PROPORCION_OBRA_DEL_AUTOR` de las de su Autor (los dos en `src/lib/umbrales.ts`; la regla,
`esObraIndexable` en `src/lib/obras.ts`). La que no se indexa es la misma página, sin marca,
con `noindex, follow`, fuera del sitemap y de Pagefind. **Nunca se declara en una ficha**: se
recalcula en cada build con el Corpus del día, y se corrige sola en los dos sentidos. Ante
duplicados se baja el tope; no se parchea una página.

`src/lib/superficies.ts` no calcula la lista: la recibe por `declararRutasIndexables` y, sin
ella, `caracterDe` **rompe** ante una Obra en vez de adivinar (`causaDelServicio` distingue
`forma` —páginas 2+— de `contenido`). Hay dos instancias de ese módulo y las dos la declaran
con la misma función: `Armazon.astro` en las páginas e `integraciones/indexables.ts` en la
configuración, que además escribe «N Obras publicadas, M indexables» y, en
`astro:build:done`, **rompe** si el sitemap, las páginas sin `noindex` y las que llevan
`data-pagefind-body` no son el mismo conjunto. Un script que pregunte `caracterDe` por una
ruta de Obra tiene que declarar antes la lista. Un slug de obra solo numérico rompe el build.

La vista de superficie (20.1) sale solo de la página 1 de una Obra **indexable**: «sí y solo
si producto». `npm run rastreo -- --registrar` juzga contra las rutas indexables y rechaza
una Obra con `noindex`; `npm run canal` acepta cualquier Obra publicada, porque una
publicación puede enlazarla. En el sitemap, la Obra lleva `lastmod` con el criterio de las
demás agregaciones: lo más reciente de su ficha, sus Citas y el fichero de su Autor.

Toda Página de Obra —indexable o no, y sus páginas 2+— declara su Tarjeta Social en
`/tarjeta/obra/{slug-autor}/{slug-obra}.png` (Historia 22.7): la de listado con el título en la
sans y «{n} citas de {Autor}, {año}», sin nota ni traductor. En `/buscar/`, el Autor del
resultado de Obra sale del metadato `data-pagefind-meta="autor"` del enlace de la Cabecera:
quitarlo o moverlo fuera de `data-pagefind-body` deja los resultados de Obra sin Autor.

### El aviso, la serie y la congelación (Historia 22.8)

Qué fichero compone qué página lo dice **una sola relación**, `relacionDeSuperficies` de
`tools/lib/cambios.ts` (AD-27): fecha el sitemap y, leída al revés, decide qué avisa
`tools/avisar.ts`. La Página de Obra es su ficha, sus Citas y el fichero de su Autor; una
Página de Cita incluye además los ficheros de sus Temas y la ficha de su Obra (lo que su
marcado pinta). `corpus/obras/` se fecha con git y entra en el `git diff` del aviso, igual que
`src/lib/umbrales.ts`: un commit que solo congela o mueve un umbral compara las listas igual.

Para el aviso, el estado de una Obra es uno: **indexable o no**. Una Obra tocada se avisa si
es indexable después —lo dice el sitemap desplegado, `{SITIO}/sitemap-0.xml`, o
`--sitemap <fichero>`— o si lo era antes; una hermana, solo si entra o sale de la lista
indexable. La lista de antes sale de `obrasDelCorpusEnDisco` sobre una copia temporal del
Corpus de `--desde`, con la congelación que regía en `--desde` (leída de su `umbrales.ts`) y
los umbrales de hoy —si el rango los cambió, se dice—. Sin una de las dos listas no se avisa
ninguna hermana, y lo que no se pudo decidir se nombra.

**La congelación** es `CONGELACION_DE_OBRAS` en `src/lib/umbrales.ts`, y el repositorio la
tiene en `undefined`. Mientras rija, una Obra se indexa si cumple FR-52 **y** su ficha está
en la lista: ninguna entra, las que dejan de cumplir salen; un nombre de la lista que ya no es
ninguna ficha activa avisa en el build. La aplica `obrasIndexables` en las dos instancias; la
consulta `congelacionVigente()` (`src/lib/obras.ts`) —el rastreo, y la usarán la 22.9 y las
Piezas—. Nunca se lee de la serie. **Congelar o levantar lo decide Héctor**, con su orden y un
commit — ningún agente congela:

```
npm run obra -- congelar     # reescribe solo ese bloque con la jornada y la lista indexable de hoy
npm run obra -- levantar     # lo devuelve a undefined
```

Ninguna hace commit; las dos se niegan con 1 y sin escribir si no hay nada que hacer
—también `congelar` cuando hoy no se indexa ninguna Obra—.

## Curar una Colección

Una Colección se cura con su orden, nunca escribiendo el YAML a mano:

```
npm run coleccion -- crear "Frases cortas para reflexionar" --criterio "Citas de una sola frase."
npm run coleccion -- asignar frases-cortas-para-reflexionar <slug-de-cita> [<slug-de-cita>...]
npm run coleccion -- quitar frases-cortas-para-reflexionar <slug-de-cita>
npm run coleccion -- estado frases-cortas-para-reflexionar     # cuántas Citas le faltan
npm run coleccion -- listar
npm run coleccion -- despublicar frases-cortas-para-reflexionar
npm run coleccion -- publicar frases-cortas-para-reflexionar
```

**Qué impone la orden que el build no puede imponer.** El esquema juzga un fichero: que
tenga nombre y criterio, que el criterio quepa en una descripción, que cada miembro tenga
forma de slug. Lo que ningún esquema puede ver es la relación entre ficheros, y ahí es
donde la orden es la única puerta que existe:

- **que un miembro esté publicado.** `miembros` es una lista de slugs y jamás una
  referencia dura de esquema —si lo fuera, mover una Cita a `corpus/_revision/` rompería el
  build—, así que el build no puede saber si un slug es una Cita en revisión. La orden sí, y
  la rechaza. Editar el YAML a mano **sí se salta esta regla**: el slug de una Cita en
  revisión pasa la construcción y desaparece en silencio del listado.
- **que el slug exista.** Una errata se rechaza al escribirla; al build le da igual y solo
  la cuenta después como desajuste.

Lo demás sí es comodidad: nombre, criterio y forma de los miembros los aplica el esquema
igual, se edite el fichero como se edite, y el build se rompe si se incumplen.

Despublicar **mueve** el fichero a `corpus/_colecciones-retiradas/`, como retirar una Cita
lo mueve a `corpus/_revision/` (AD-2). No borra nada y no toca ninguna Cita; `publicar` lo
trae de vuelta. Ese directorio **no se versiona con `.gitkeep`**, a diferencia de
`corpus/_revision/`, `corpus/fuentes/` y `corpus/colecciones/`: lo crea la propia orden la
primera vez que se retira algo, y versionarlo vacío exigiría un fichero en `corpus/` que
ninguna Colección real justifica todavía. Cuando se retire la primera de verdad, el
directorio entra en el repositorio con ella y la excepción desaparece sola.

Curar la primera Colección de verdad es de Héctor: `corpus/colecciones/` se versiona vacío
a propósito y ningún agente siembra Colecciones en él.

## Componer un lote de jornadas

Publicar un día cuesta dos minutos con el Kit, pero exige estar ahí ese día. Un lote deja
varias jornadas preparadas de una sentada:

```
npm run jornada -- fijar 2026-08-24 <slug-de-cita>
npm run jornada -- fijar 2026-08-24 <slug> 2026-08-25 <slug> 2026-08-26 <slug>
npm run jornada -- soltar 2026-08-25 [2026-08-26 ...]
npm run jornada -- listar
```

**No hay ningún calendario del lote.** `fijar` escribe en `corpus/portada.json`, que es
donde `src/lib/citaDelDia.ts` ya busca antes de rotar desde la v1. Por eso lo compuesto por
adelantado y lo que se compondría el día son lo mismo: derivan de la misma fijación, y no
hay dos orígenes entre los que desempatar. Si alguna vez hace falta añadir un segundo sitio
donde vive una jornada, la respuesta es que no.

**Lo versionado es la fijación, nunca el material.** El material se deriva en cada
construcción, así que cambiar la Cita de una jornada ya compuesta la recompone sola: no
existe nada guardado que pudiera quedarse viejo. Y el lote es reanudable, porque `fijar`
añade y jamás vacía: `listar` enseña hasta dónde se llegó.

**Qué impone la orden que el build no puede imponer.** `corpus/portada.json` no es una
colección y ningún esquema lo juzga, así que aquí la orden es la única puerta que hay:

- **que el slug sea una Cita publicada.** Una que sigue en `corpus/_revision/` se rechaza:
  una fijación no adelanta contenido en revisión.
- **que esté marcada apta para portada** (FR-15). Es la regla que más falta hace. `citaDelDia`
  busca la Cita fijada **entre las aptas** y, si no está, ignora la fijación y rota para no
  dejar la portada muda — de modo que fijar una Cita sin marcar no falla: publica otra cosa
  el día que toque, sin avisar a nadie. `listar` y `/lote` marcan también las fijaciones que
  se quedaron mudas después, por retirarse la Cita o perder su marca.
- **que la jornada no haya pasado.** Fijar un día vencido no publica nada, porque ninguna
  construcción vuelve a componer la Cita del Día de ayer. «Pasado» se juzga contra la más
  temprana de dos lecturas —la del calendario local de quien ejecuta la orden y la UTC del
  build—, así que solo se rechaza lo que ya pasó en las dos: a la una de la madrugada
  peninsular las dos discrepan, y rechazar por error el día que la persona tiene por futuro
  deja la orden inservible justo cuando se usa. Un día vencido de más no publica nada y sale
  marcado con «·» en `listar`. Si `FECHA_JORNADA` está en el entorno, manda sobre las dos y
  la orden lo avisa por la salida de error.

Fijar la misma Cita en dos jornadas se admite y se avisa: repetir puede ser intencionado,
pero casi siempre es un descuido al pegar una lista.

El material compuesto se mira en `/lote`, que es el Kit de las jornadas que vienen: `noindex`,
fuera del sitemap y de los dos buscadores, y por la misma declaración única de
`src/lib/superficies.ts`. `/kit` y `/lote` se enlazan entre sí —son la misma herramienta en
dos momentos— y ninguna superficie del producto enlaza a ninguna de las dos, que es lo que
significa que no se llega desde la navegación. Se entra escribiendo la dirección.

El marcado del material lo comparten las dos páginas en `MaterialParaPublicar.astro`. Los
datos ya los comparten por `materialDelKit`; con la vista duplicada, «indistinguible» sería
cierto solo por dentro y el lote acabaría enseñando otra cosa en cuanto alguien tocara el Kit.

**`corpus/portada.json` lo puede escribir una persona y ningún esquema lo juzga**, así que el
sitio lo lee por `src/lib/portada.ts`, que descarta lo que no entiende en vez de tumbar el
build. La orden, en cambio, rechaza y lo dice: delante de ella hay alguien que puede
corregir. Las dos preguntan a `esJornada`, el único dueño de qué tiene forma de jornada.
Antes de la Historia 13.1 una clave mal escrita era inerte porque solo se consultaba la de
hoy; el lote las enumera todas, y una como `manana:` tumbaba `npm run build` entero.

Fijar jornadas de verdad en el repositorio es de Héctor: `corpus/portada.json` se versiona
con `fijaciones` vacío a propósito y ningún agente fija jornadas en él.

## Componer una Pieza de Canal

El Canal propio sabía producir un solo formato: una Cita suelta. Una Pieza reúne varias
Citas del Corpus en una sola imagen, para cuando cuatro Citas del mismo Tema dicen juntas
algo que ninguna dice sola, o anuncia una Colección entera:

```
npm run pieza -- componer --red instagram <slug> <slug> [<slug>...]
npm run pieza -- componer --red x <slug> <slug> --salida /tmp/prueba.png
npm run pieza -- coleccion <slug-de-coleccion> --red instagram
```

**Se compone en `tools/` y su salida no se versiona** (AD-15). El plano lo fija quién
consume el artefacto: el build para lo que pide un tercero sin JavaScript (la Tarjeta
Social), el cliente para lo que pide alguien con el navegador delante (la Imagen de Cita), y
`tools/` para lo que **ningún visitante pide a demanda** — la Pieza la compone el editor
cuando decide qué Citas van juntas. (Que se componga de una en una o en tanda no viene al
caso: lo que sostiene AD-15 es quién la pide, no cuántas salen por invocación.) El PNG cae en
`piezas/`, que está en `.gitignore`: lo versionado es la decisión —qué Citas van juntas y a
qué cuenta—, nunca el artefacto. Repetir la misma orden sobrescribe la misma Pieza byte a
byte.

**Con `--salida` esa garantía deja de ser del sistema.** El fichero cae donde diga quien
invoca, que puede estar dentro del repositorio, así que el parte no afirma ahí que esté
ignorado: lo dice cuando es verdad —destino por omisión— y avisa de quién es la
responsabilidad cuando no puede saberlo. Una frase tranquilizadora sobre lo único que AD-15
manda vigilar es peor que ninguna frase.

**Una red por composición, y un solo enlace.** La Pieza declara un único destino y lo marca
con `enlaceConOrigen` (FR-22). En `componer` ese destino es **la portada**: una Pieza de tres
Citas no puede enlazar a una de ellas sin favorecerla, y la portada es la única superficie que
las contiene a todas sin elegir. En `coleccion` es **la Página de Colección**, y esa es la
diferencia entre las dos subórdenes. La ruta la da `rutaDeColeccion` en
`src/lib/superficies.ts`, donde está declarada la familia: escrita a mano aquí, un cambio de
ruta llevaría al visitante a un 404 semanas después de publicar, sin que nada fallara.
Publicarla en dos cuentas son dos composiciones, una por marca.

**Qué rechaza la orden, y por qué rechaza en vez de descartar.**

- **una Cita que pasa de `MAX_CARACTERES_IMAGEN`** no entra, por la misma regla que le niega
  Imagen de Cita (FR-10). Componer la Pieza sin ella y callarlo convertiría un error de
  selección en un artefacto publicado al que le falta una Cita, y eso no se ve hasta después
  de publicarlo. La orden nombra el slug y la regla.
- **lo que no cabe no se encoge.** El alto se calcula antes de componer nada. Si el apilado
  se pasa, la Pieza no se compone y la orden dice cuántas caben. No hay «ajustar un poco el
  tamaño»: los cuerpos salen de `src/lib/tramos.ts` y bajarlos sería devolverle a la
  plantilla la decisión que AD-8 le quitó. Ausencia antes que mutilación (NFR-12): jamás se
  recorta, abrevia ni se ponen puntos suspensivos.
- **una sola Cita** no es una Pieza: para eso está la Imagen de Cita, que compone el
  visitante en su navegador (AD-7).
- **una Cita cuyo Autor no está en el corpus, o cuya ficha no trae nombre.** Se compondría
  con un hueco donde va la firma, y «ninguna Cita aparece sin Autor» es criterio de
  aceptación de la épica entera.
- **texto más ancho que el lienzo.** El reparto en líneas no parte palabras nunca, así que
  una indivisible se sale por el lado y el PNG sale **bien** con la palabra cortada. Se mira
  el texto, el Autor y la procedencia, porque las tres se componen.
- **un slug repetido, uno inexistente, uno en `corpus/_revision/` o uno que no tiene forma de
  slug** —este último porque de él sale el nombre del fichero, y uno con `/` o `..` sacaría el
  PNG de `piezas/`, donde ya no está ignorado. Igual que `--salida`, que tiene que ser una
  ruta `.png` y no un directorio. Nada se escribe hasta que la selección entera vale.

**Los tamaños son una columna más de `src/lib/tramos.ts`** (`pixelesEnPieza`), no un número
escrito en la plantilla. El lienzo de la Pieza apila varias Citas, así que el cuerpo que le
toca a cada una no es el de la Imagen; calcularlo aparte es justo lo que la regla impide. El
lienzo —1080 cuadrado, margen 96— es el de la Imagen de Cita, y se declara **aparte a
propósito**: `public/islas/imagen.js` ya lo declara para sí porque vive fuera del empaquetado,
con URL estable, para que el `import()` diferido de AD-6 funcione, y no puede importar de
`src/`. Dentro del empaquetado el dueño es `src/lib/pieza.ts`, y de ahí lo hereda la Pieza de
Colección, que compone en el mismo lienzo y con la misma tabla.

El escapado del SVG, el reparto en líneas, la paleta y las familias los comparten la Tarjeta
y la Pieza en `src/lib/lienzo.ts`. Dos módulos que rasterizan no pueden tener dos algoritmos
de salto de línea ni dos paletas: empiezan idénticos y divergen a la primera corrección, y
entonces una Cita cabe en uno y no en el otro —o el filete queda de dos colores— sin que nadie
lo vea hasta poner las dos imágenes juntas. Las fuentes del rasterizado siguen siendo las del
sistema, como en la Tarjeta.

La atribución del texto para publicar sale de `src/lib/atribucion.ts`, la misma que se lleva
el visitante al copiar. Cada Cita lleva además su Autor **visible en la imagen**, uno por
Cita: una Pieza reúne Autores distintos y un pie común los atribuiría todos a uno.

### La Pieza que anuncia una Colección

`npm run pieza -- coleccion <slug> --red <red>` compone la misma plantilla con dos
diferencias, y son el contenido entero de la historia: el lienzo lleva **el nombre de la
Colección** como título —con el tratamiento que `DESIGN.md` le da al Nombre de Colección,
`headline-md` de
`_bmad-output/planning-artifacts/ux-designs/ux-brainlySabiduria-2026-08-10/DESIGN.md`— y el
enlace único apunta a su Página. Las Citas no se nombran en la orden:
salen de la pertenencia declarada, **en el orden en que el fichero las declara**, porque ese
orden es curación y no ordenación del sistema.

**Por qué el umbral no se comprueba en `tools/` —y no se puede— y por qué esta suborden
excluye en vez de rechazar está escrito una sola vez, en la cabecera de
`src/lib/coleccionEnPieza.ts`.** Léelo ahí antes de tocar la selección; aquí solo el resumen
operativo. No escribas un `if` con `MIN_CITAS_POR_COLECCION` en `tools/`: la Colección llega
por `coleccionesPublicadas` y la selección exige un tipo que solo esa función produce, así que
la regla no se recuerda, se compila.

**Todo lo que no entra se dice, y son tres listas distintas.** Las Citas excluidas con su
motivo —pasa de `MAX_CARACTERES_IMAGEN`, su Autor falta o no tiene nombre, tiene texto más
ancho que el lienzo, o ya no cabe en el apilado—; los miembros **declarados que no resuelven**,
que son erratas o Citas retiradas a `corpus/_revision/` y que no cuentan ni para el umbral ni
para la Pieza; y, cuando el nombre de la Colección es lo que no deja sitio a las Citas, se
nombra al nombre en vez de culparlas una por una. Si de todo eso no quedan dos Citas, no hay
Pieza.

Se rechaza, con código 1: una Colección **retirada** —que es estar en
`corpus/_colecciones-retiradas/` (AD-2)—, una que no existe, una cuyo fichero **no cumple el
esquema del build** —lo juzga `declaracionDeColeccion`, no una redacción propia de la orden, y
el nombre es justamente lo que la Pieza anuncia— y una **por debajo de su umbral**, diciendo
cuántas tiene y cuántas le faltan con el mismo renglón que `npm run coleccion -- estado`.
Códigos: **2** es la forma de la invocación (bandera desconocida, `--red` ausente, cero o dos
slugs) y **1** es lo que la invocación dice, incluido un slug con forma de ruta — igual que en
`componer`.

El PNG por omisión es `piezas/pieza-coleccion-<slug>.png`, con su propio constructor
(`nombreDePiezaDeColeccion`): el de las Citas sueltas une slugs con guion doble y resume la
cola como «y N más», que sobre una Colección borraría del nombre justo lo que anuncia.

## Encender un Modelo de Ingreso

Los cuatro Modelos —donaciones, afiliación de libros, producto propio y publicidad
acotada— tienen un solo dueño de su estado: `src/lib/ingreso.ts`. **Encender uno es cambiar
un `false` por un `true` ahí, y nada más**; `git revert` de ese diff lo apaga, y git registra
cuándo y por qué. No hay bandera de entorno, ni casilla de panel, ni consulta al receptor que
encienda nada, y no debe haberla: el requisito de verdad es poder **apagar** el mismo día un
Modelo que suba el ingreso degradando el rebote de la Página de Cita.

**Encender las donaciones ya no exige tocar ninguna página.** La invitación está construida
—`src/components/Sostener.astro`, y la portada, `/buscar` y `/404` preguntan por ella con
`modelosEnRuta('<su ruta>')`—, así que el commit del encendido es el booleano y nada más.

**Ese mismo commit tiene dos requisitos que el booleano no trae puestos**, y saltarse
cualquiera de los dos publica una invitación que no debería haberse publicado:

1. **Abrir el `destino` y comprobar que existe.** La dirección de Ko-fi que declara el Modelo
   se supuso por el nombre del dominio y nadie la ha abierto todavía. Es manual porque es lo
   único que ninguna puerta alcanza a comprobar, y conviene ver los dos casos por separado:

     · un destino **ausente o mal formado** —vacío, sin `https://`— **detiene la
       construcción**, así que no llega a publicarse;
     · un destino **bien formado y equivocado** construye y se publica sin que nada proteste,
       y el visitante que quiso apoyar el sitio aterriza donde no hay nada.

2. **Correr el barrido de accesibilidad con el Modelo encendido:**
   `npx playwright test tests/e2e/ingreso-accesible.spec.ts --project=escritorio`. Ninguna
   otra prueba mira la invitación: la suite de accesibilidad barre el sitio del repositorio,
   donde las donaciones están apagadas y no hay invitación que barrer. Esta construye un sitio
   parcheado —la copia temporal, nunca el árbol (AD-21)— y le pasa axe a las tres superficies
   con la invitación puesta. El CI no corre las pruebas de punta a punta, así que esto no lo
   comprueba nadie por su cuenta. Si sale en rojo, se aborta el encendido.

Los dos pasos están escritos también en `DESPLIEGUE.md` §4 —con lo que tarda la orden, los
puertos que necesita libres y la comprobación posterior al despliegue—, que es lo que se lee
el día de cerrar LC-4.

Hoy los cuatro están apagados. Para consultarlos:

```
npm run ingreso            # estado, Umbral y cifra medida —o por qué no es medible
npm run ingreso -- --json  # lo mismo como datos
```

La orden **informa y no enciende nada**: no escribe en ninguna parte. Sale con código 0 pase
lo que pase con el receptor —sin desplegar, caído o contestando cualquier cosa—, porque el
flujo diario que la llama con `--anotar` es el mismo que despliega el sitio en vivo, y un
aviso capaz de tumbarlo ataría la reconstrucción diaria a un plano que el sitio nunca lee
(AD-14).

**Hoy la cifra no es medible, y cerrar LC-4 no basta para que lo sea.** Falta LC-4 —el
receptor sin desplegar, `MEDICION_ENDPOINT` sin definir— y la orden lo dice nombrándola; pero
esa variable es la dirección de **ingesta de balizas** (`DESPLIEGUE.md` §3) y el receptor
contesta 204 a todo lo que no sea un `POST`: escribe y no publica. Para que haya cifra hace
falta un paso más que no es de esta historia: que el receptor publique una lectura agregada,
o leerla con `npx wrangler d1 execute`. La orden lo dice así en vez de fingir un cero.

**Junto al estado vive qué superficie admite qué Modelo**, en el mismo fichero y con la misma
identidad con la que se declaran en `src/lib/superficies.ts`. Las superficies de **lectura**
—la Página de Cita, la Página de Colección y, desde la 22.4, la Página de Obra— tienen dos Modelos vedados, y la declaración los
rechaza: **donaciones y publicidad acotada**. La exclusión nace de la invitación de donación,
que vive en portada, búsqueda y 404, y aguas arriba se estrechó a la publicidad, el único
Modelo que degrada la superficie que produce el ingreso.

**La admisión se nombra por superficie y se consulta por ruta** (Historia 17.5). `admitidoEn`
sigue diciendo el fichero de la superficie, pero las páginas preguntan
`modelosEnRuta('<su ruta>')`, que resuelve la ruta con el mismo predicado de
`src/lib/superficies.ts` y **excluye por forma** las páginas 2+ de un listado: admitir un
Modelo en el listado de Tema lo pone en `/tema/x/` y nunca en `/tema/x/2/`. La restricción es
solo de forma: lo que se declare servicio por contenido —el `noindex` de una Obra que repite
otra, 22.4— no restringe ninguna admisión. Por eso no hay forma de escribir «también la
página 2» en `admitidoEn`, y la prueba de `dist/` juzga cada ruta, no cada fichero.

**La Página de Autor no admite ningún Modelo, y la afiliación solo la Página de Obra** (AD-20
v7.1). `revisarDeclaracionDeIngreso` rechaza las dos cosas. La excepción que tenía la
afiliación en la Página de Cita se revocó: su enlace nacerá de la Procedencia en la Página de
Obra, que existe desde la 22.4 y es superficie de lectura —rechaza donaciones y publicidad—.
Es la **única** donde la afiliación puede admitirse, y desde la 22.9 la admite (página 1, se
indexe o no; nunca la 2+). **Qué edición se enlaza** se decide con la cuenta delante, ficha a
ficha.

### Encender la afiliación de libros (Historia 22.9)

Todo el camino está construido y apagado: el conjunto cerrado de tiendas `TIENDAS` en
`src/lib/ingreso.ts`, el campo `ediciones` de la Ficha de Obra juzgado por el esquema
(`src/lib/admision.ts`), `urlDeEdicion`, que añade la marca a la dirección al construir, y el
bloque «Ediciones en venta» (`src/components/EdicionesEnVenta.astro`) dentro de «Dónde leer
esta obra», tras la edición cotejada. El repositorio versiona **`TIENDAS` vacío**, y mientras lo
esté el esquema rechaza toda edición: ninguna ficha puede declarar una.

1. **La primera tienda, con su marca, la declara Héctor** en `TIENDAS`
   (`{ clave, nombre, dominio, parametro, marca }`). El repositorio es público y la marca queda a
   la vista: **ningún agente escribe una tienda ni una marca**.
2. **Las ediciones se declaran con su orden**, nunca escribiendo `ediciones` a mano:

   ```
   npm run obra -- edicion <ficha> <tienda> <impresa|electronica> <url> [--descripcion "<texto>"]
   ```

   La dirección va **sin** marca —el esquema rechaza la que ya trae el parámetro de la tienda— y
   tiene que ser `https://` del dominio de la tienda o de un subdominio suyo. Se niega con
   código 1 y sin escribir si la familia Obra está congelada (`CONGELACION_DE_OBRAS`, SM-11), si
   la tienda no es del conjunto o si el esquema la rechaza (otro dominio, un puerto, el
   parámetro de la marca en cualquier capitalización); con 2, la forma de la invocación. Si la
   Obra no tiene ninguna Cita cotejada, declara igual y avisa de que no se pintará.
   `quitar-edicion <ficha> <n>` la quita (1 si no hay esa posición).
   Las órdenes que reescriben una ficha conservan sus ediciones; `reunir` no hereda las de la
   absorbida y lo dice.
3. **Encender es el booleano**, y en lugar del `destino` que exigen los demás Modelos exige
   **al menos una tienda declarada**: sin ella el build se para. Una edición solo se pinta en
   una Obra con alguna Cita cotejada —la edición en venta nunca va sola (FR-54)—; si no la hay,
   el build avisa «Ediciones sin edición cotejada» nombrando la ficha. Apagada, `dist/` es
   idéntico con ediciones declaradas o sin ellas.
4. **Barrido de accesibilidad con el Modelo encendido**: el mismo
   `npx playwright test tests/e2e/ingreso-accesible.spec.ts --project=escritorio`, que ya barre
   la Página de Obra con dos ediciones de una tienda inventada en la copia.

**Retirar una tienda** de `TIENDAS` exige antes quitar con `quitar-edicion` todas sus ediciones
de **toda** ficha, activa en `corpus/obras/` o retirada en `corpus/_obras-retiradas/`: el
esquema rechaza una edición de una tienda que no existe, y eso rompe el build y cualquier orden
que lea las fichas (y restaurar una ficha retirada que la traiga).

**El programa de afiliados puede exigir su propia declaración literal en el sitio** —un texto
fijo, en un sitio concreto—. La del bloque («Enlace de afiliado: si compras, el sitio recibe una
comisión sin coste para ti.», en `EdicionesEnVenta.astro`) es la de `EXPERIENCE.md`, no la del
programa: el día de encender se comprueba contra las condiciones de la cuenta y, si piden otra,
se cambia antes del commit del encendido.

`npm run ingreso` dice cuántas tiendas hay («ninguna tienda declarada» hoy), y el Umbral de la
afiliación sigue disparando **solicitar** la cuenta, no encenderla.

**El tope de guion se mide donde se admite.** `tests/unit/ingreso-construido.test.ts` construye
una copia con todos los Modelos que alguna superficie admite encendidos y la medición puesta,
y exige que cada ruta con un `data-ingreso` quede bajo `MAX_BYTES_DE_GUION`. Admitir un Modelo
en una superficie nueva la mete en esa medida sin tocar la prueba.

Un Modelo no se aloja jamás en el armazón compartido: es una línea, aparece en todas partes e
incluye la Página de Cita.

**Lo que un Modelo ponga en una página va marcado con `data-ingreso="<id>"`.** No es
decoración: `tests/unit/ingreso-construido.test.ts` recorre el `dist/` construido y exige que
lo marcado en cada ruta esté encendido y admitido en esa ruta. La declaración la vigila `npm test` y
también el build: desde la 14.2 tres superficies importan `src/lib/ingreso.ts`, así que
`astro build` lo evalúa al cargar y una declaración que no se sostiene detiene la construcción.
Con todo apagado eso significa que un Modelo apagado es **invisible y no latente** (UX-DR35)
—ni hueco reservado, ni contenedor vacío, ni comentario—, y encendido significa que no puede
aparecer donde no se admite.

**Cuidado con el `<style>` de un componente de Modelo: se emite aunque no se renderice.** Astro
recoge los estilos por el grafo de importaciones, no por lo que se dibuja, así que un bloque
`<style>` en `Sostener.astro` dejaría su regla `.sostener` en el `<head>` de las tres páginas
con las donaciones apagadas — un hueco reservado en toda regla, y `dist/` dejaría de ser
idéntico al de antes. Por eso ese componente lleva la presentación en atributos `style`, dentro
del elemento marcado. Vale para cualquier Modelo que venga después: lo que emita empieza y
acaba dentro de su `data-ingreso`.

**Un Umbral cruzado no enciende nada, y en la afiliación ni siquiera habla de encender.**
Amazon Afiliados cierra la cuenta que no logra 3 ventas cualificadas en 180 días desde el
alta, y la del proyecto ya se cerró una vez por esa regla: allí el Umbral dispara *solicitar
la cuenta*, un acto con reloj propio. Por eso cada Modelo declara **qué dispara** su Umbral, y
por eso no se escribe en ningún sitio la equivalencia «cruzado ⇒ encender». Los cuatro
Umbrales viven en `src/lib/umbrales.ts` y en ningún otro: ni en la orden, ni en el paso de CI,
ni en ninguna página.

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

- Al añadir una página a `src/pages/`, declárala en `src/lib/superficies.ts`: es el único sitio donde se dice si una superficie es publicable, y de ahí salen el sitemap, el `noindex`, el índice de Pagefind y el barrido de accesibilidad. Sin declaración el build se para. Antes eran tres sitios y había que acordarse de los tres; `/404` y `/buscar` acabaron `noindex` para el buscador de fuera y visibles para el de dentro (Historia 12.1).
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
no tener el registro.

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

Lo que no es la misma Cita se retira, siempre con su motivo: `--retirar` **mueve** el
fichero a `corpus/_revision/` (AD-2) y lo saca del censo. No borra nada, y el motivo va en
el mensaje del commit — git es el único almacén (AD-10). Sin motivo la orden se niega, con
código 2: una retirada sin motivo no es una retirada, es una desaparición.

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
`modelosEn('<su pagina>')`—, así que el commit del encendido es el booleano y nada más.

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
—la Página de Cita y la Página de Colección— tienen dos Modelos vedados, y la declaración los
rechaza: **donaciones y publicidad acotada**. La exclusión nace de la invitación de donación,
que vive en portada, búsqueda y 404, y aguas arriba se estrechó a la publicidad, el único
Modelo que degrada la superficie que produce el ingreso.

**La afiliación de libros es la excepción, y está registrada.** Su enlace no se añade a la
Página de Cita: *nace* de la Procedencia ya publicada, que esa página ya muestra y que se
deriva en el build sin consultar a nadie. No interrumpe ninguna lectura porque no añade
superficie —convierte en enlace un dato que ya estaba escrito—, así que admitirla ahí el día
que se solicite la cuenta será una línea en `admitidoEn` y no una renegociación de UX-DR36.
Hoy no está admitida en ninguna superficie: falta decidir **qué edición se enlaza**, y eso se
decide con la cuenta delante.

Un Modelo no se aloja jamás en el armazón compartido: es una línea, aparece en todas partes e
incluye la Página de Cita.

**Lo que un Modelo ponga en una página va marcado con `data-ingreso="<id>"`.** No es
decoración: `tests/unit/ingreso-construido.test.ts` recorre el `dist/` construido y exige que
lo marcado en cada página esté encendido y admitido ahí. La declaración la vigila `npm test` y
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

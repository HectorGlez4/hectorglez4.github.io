# Bitácora del sprint — Sabiduría Diaria

Una línea por historia cerrada: qué se verificó y qué quedó fuera.
El protocolo del bucle está en `LOOP-PROTOCOL.md`.

---

## 1.1 — Andamiaje del proyecto

**Verificado.** Node 24.3.0 supera el mínimo 22.12; la comprobación está encadenada a
`prebuild` y `predev` y su comparación se prueba con versiones por debajo del mínimo
sin necesitar un Node antiguo instalado. `astro dev` arranca y sirve 200. `npm run build`
termina sin errores y produce `sitemap-index.xml` más `sitemap-0.xml`. Los diez
directorios de la espina existen. `astro check`: 0 errores. Vitest: 16 pruebas en verde.

**Decidido por el camino.** El dominio de `site` es provisional
(`https://sabiduria-diaria.es`, conmutable con `SITE_URL`) porque el definitivo no está
contratado; vive solo en `astro.config.mjs`, así que cambiarlo es una línea. Se fijó
`build.format: 'file'` y `trailingSlash: 'never'` para que las URL sean exactamente
`/cita/{slug}` sin barra final, como exige NFR-4.

**Fuera de alcance.** El `AGENTS.md` de la raíz declara en su bloque gestionado que
«no hay `package.json` todavía»; a partir de esta historia es falso. No se edita a mano
porque lo regenera `bmad-project-context`. Conviene volver a ejecutar esa skill al
cerrar la Épica 1.

---

## 1.2 — La puerta de admisión vive en el esquema

**Verificado.** Nueve pruebas construyen un proyecto aislado con un corpus fabricado y
comprueban el código de salida y el mensaje: una Cita válida construye; sin procedencia,
con procedencia que no documenta nada, sin texto, con `estadoDerechos` distinto de
`dominio-público` y con un Autor sin `añoFallecimiento` rompen el build. El mensaje trae
la ruta del fichero y la regla incumplida.

**Resuelto en el camino — dos hallazgos reales.**

1. El PRD §265 zanja la aparente contradicción entre «procedencia obligatoria» (1.2) y
   «Cita sin procedencia documentada» (2.1): *una Cita sin Procedencia no pasa a
   publicada, queda en revisión*. Así que el campo es obligatorio y debe documentar algo
   —obra, año o referencia—; «ausente» no es un estado que `corpus/citas/` admita. La
   distinción completa/parcial que audita la 1.8 es la presencia de `obra` **y** `año`.
2. `procedencia:` sin nada debajo —la forma natural de escribir «esto no lo tengo»— la
   lee YAML como `null`, y Astro lo reportaba como ``Expected type `object`, received
   `object` `` porque `typeof null` es `"object"`. El build fallaba, sí, pero con un
   mensaje inservible, incumpliendo el criterio de que indique la regla. Se preprocesa el
   nulo a objeto vacío para que responda el refinamiento con el texto de la regla.

**Decidido.** El `texto` de la Cita vive en el frontmatter y no en el cuerpo del markdown:
el procesador aplica SmartyPants y reescribiría comillas y guiones, lo que NFR-12 prohíbe.

**Hueco abierto.** Una Cita que referencia un Autor inexistente **no** rompe el build hoy:
Astro valida las referencias de forma perezosa y ninguna página consulta todavía las
colecciones. Queda anotado para cerrarlo en `publicado.ts`, que por AD-11 es el dueño del
conjunto publicable y el sitio natural de la integridad referencial.

---

## 1.3 — Lo no publicado no existe para el build

**Verificado sin escribir código de producción.** La historia salió en verde con el
esquema tal como lo dejó la 1.2, lo cual es la señal de que AD-2 se materializó donde
debía: las tres colecciones tienen por base `corpus/{citas,autores,temas}`, de modo que
`corpus/_revision/` no está al alcance de ninguna. No hay nada que filtrar porque no hay
nada cargado.

Seis pruebas lo fijan para que no se pierda. La más fuerte es la segunda: una Cita **sin
procedencia** colocada en `_revision/` **no** rompe el build. Por la Historia 1.2 sabemos
que en `corpus/citas/` lo rompería. Que no lo haga demuestra que el fichero no se carga
—no que exista un filtro que lo esquive—, y esa distinción es justo la que AD-2 protege.

Las demás: la sonda que enumera la colección no ve la Cita en revisión y sí la publicada;
la Cita en revisión no aparece en el sitemap; y mover el mismo contenido byte a byte de
`_revision/` a `citas/` la publica sin ningún otro cambio. Dos pruebas de código fijan que
no exista un campo booleano de publicación ni una colección con base en `_revision/`.

**Añadido al arnés.** `construirConCorpus` acepta ahora páginas sonda, que permiten leer
del HTML construido qué cargó de verdad cada colección sin esperar a que existan las
páginas reales de la Épica 2.

**Corregido después.** La suite completa falló una vez de forma intermitente en
«ninguna colección carga una Cita de `corpus/_revision/`». No era el producto: los
proyectos temporales enlazan el `node_modules` de la raíz en lugar de copiarlo, así que
todos comparten la caché de Vite y dos builds simultáneos la reoptimizan a la vez. Se
serializa la suite (`fileParallelism: false`). Cuatro pasadas completas seguidas en verde,
31 pruebas, ~10 s.

---

## 1.4 — Normalización canónica y slug inmutable

**Verificado.** 22 pruebas. La normalización quita diacríticos, pasa a minúsculas,
colapsa espacios y elimina puntuación —incluida la que solo usa el español: «», ¿ y ¡—;
«Corazón» y «corazon» coinciden. El slug de Cita sale del slug del Autor más siete
palabras del texto en forma canónica, solo admite minúsculas, dígitos y guiones, y el
mismo texto con otra puntuación da el mismo slug. Tres pruebas de código recorren todo
`src/` y fijan que nadie descomponga en NFD ni borre marcas combinantes por su cuenta, y
que `normalizar.ts` y `slug.ts` no importen `node:fs` ni Astro (AD-5).

**Decidido — la eñe se pliega a ene.** Descomponer en NFD convierte «ñ» en «n», y en
español la eñe es letra propia, no una ene acentuada: lingüísticamente es una pérdida. Se
acepta porque el propósito de la función lo exige. FR-7 promete que el visitante encuentre
«escribiendo como se escribe de verdad, sin acentos», y quien busca «español» teclea
«espanol»; conservar la eñe rompería esa búsqueda. Lo que AD-3 prohíbe no es tomar esta
decisión, sino tomarla dos veces y distinta en cada sitio.

**Decidido — la puntuación se sustituye por espacio, no por vacío.** Sustituir por vacío
convertiría «vida,es» en «vidaes», una palabra que no existe y que ninguna búsqueda
encontraría. Hay prueba que lo fija.

**Decidido — `slugDeCita` no admite Temas en su firma.** AD-4 prohíbe que el Tema
participe en la ruta de una Cita. Dejarlo fuera de la firma hace que lo prohibido no
pueda ni escribirse, en lugar de confiar en que nadie lo pase.

---

## 1.5 — Alta de Citas por lote

**Verificado.** 10 pruebas sobre corpus temporales en disco, más una pasada real del CLI:
las completas van a `corpus/citas/` con su slug generado y el nombre de fichero
`{slug-autor}--{fragmento}.md`; las incompletas a `corpus/_revision/`; el informe da una
frase por regla incumplida; un Autor inexistente se señala y **no** se crea; dos Citas del
mismo Autor que empiezan igual reciben slugs distintos sin tocar el de la que ya estaba;
`--seco` calcula el informe sin escribir nada.

**Estructural.** Las reglas de admisión se extraen a `src/lib/admision.ts`.
`content.config.ts` las cablea a las colecciones —ahí siguen siendo la puerta de AD-1— y
la herramienta importa **las mismas**. El motivo es concreto: una copia de las reglas en
`tools/` podría aceptar una Cita que el build rechaza después, y el editor descubriría el
desacuerdo al construir en lugar de al dar de alta. Hay prueba que fija que ninguna
herramienta redeclare el estado de derechos.

**Dos correcciones al pasar el CLI de verdad.** Omitir `procedencia` entera daba «expected
object, received undefined» —correcto y en inglés, pero no dice qué hacer—; ahora responde
con la regla. Y el registro que se escribe al fichero se construye explícitamente en lugar
de volcar la salida de `safeParse`: al validar, Zod rellena los campos con valor por
defecto y toda Cita habría salido con `aptaParaPortada: false` y `temas: []`, contra la
convención de omitir lo que no tiene valor, y además invitando a leer ese `false` como una
decisión tomada cuando es la ausencia de decisión.

**Aplazado a propósito.** El corpus real no se siembra todavía. Sembrarlo con las
herramientas —y no a mano— es la demostración honesta de que funcionan, así que se hace al
cerrar la 1.7, cuando exista también la gestión de Autores y Temas.

---

## 1.6 — Detección de duplicados en la ingesta

**Verificado.** 8 pruebas. Una Cita equivalente a otra ya publicada se señala **antes de
escribir nada** —se comprueba que ni `citas/` ni `_revision/` cambian—, y la tolerancia se
prueba por separado para puntuación, acentuación y mayúsculas. Un texto distinto no se
confunde. Con `--con-duplicados` se incorpora igualmente. El texto señalado sigue íntegro
en el informe: no se pierde, solo no se escribe.

**Decidido.** El índice se construye con la forma canónica de AD-3, la misma que usará la
búsqueda. Es el punto entero de la decisión: con dos criterios distintos, el corpus podría
acabar con dos Citas que la búsqueda presenta como una sola. Hay prueba que fija que
`alta.ts` importe `normalizar` y que no haya ninguna comparación artesanal —ni un
`toLowerCase()` suelto— que la esquive.

**Añadido sobre lo pedido.** La detección cubre tres orígenes y el informe los distingue:
lo ya publicado, lo que está en revisión y la repetición dentro del propio lote. Los dos
últimos no los pedía el criterio, pero un lote que trae la misma Cita dos veces es
exactamente el caso que describe la historia —incorporar un lote de un autor recién
entrado en dominio público— y detectarlo solo mañana, en el siguiente lote, sería llegar
tarde.

---

## 1.7 — Gestión de Autores y Temas

**Verificado.** 15 pruebas más una pasada real de las tres órdenes. Crear un Autor sin año
de fallecimiento se rechaza y **no deja un Autor a medias** en el corpus. Un Tema con
Citas publicadas no se elimina y el rechazo dice cuántas lo usan y cuáles. El marcado de
portada queda escrito en el fichero de la Cita, y al desmarcar el campo se omite en lugar
de escribirse como `false`. Una prueba compara el fichero antes y después de marcar y
exige que lo único que cambie sea esa línea: NFR-12 prohíbe que el sistema altere el texto
de una Cita publicada.

**Decidido.** Editar un Autor no renombra su fichero aunque cambie el nombre. El slug es
su URL pública y recalcularlo rompería los enlaces entrantes — el mismo razonamiento de
AD-4 aplicado al Autor, que la espina no dice explícitamente pero que NFR-4 exige igual.

**Corregido al pasar el CLI.** Omitir `añoFallecimiento` respondía «El año debe ser un
número entero», que ante un campo ausente deja al editor buscando un año mal escrito que
no existe. `añoEntero(mensaje)` pasa a ser una fábrica para que el mensaje del campo
obligatorio diga que falta y por qué importa.

**Añadido.** `src/lib/umbrales.ts` con los tres umbrales de AD-9 más el de Citas
relacionadas de UX-DR17, y una prueba que recorre `src/` y falla si alguien vuelve a
escribir 15, 300 o 50 como literal. `tools/tema.ts listar` muestra cuántas Citas tiene
cada Tema y cuántas le faltan para publicarse, que es la pregunta que se hace el editor
al mirar la lista.

---

## 1.8 — Auditoría de salud del Corpus

**Verificado.** 13 pruebas sobre la función pura más una pasada real contra el corpus
sembrado: 38 Citas publicadas, 52,6 % con procedencia completa, desglose por Autor
ordenado de peor a mejor salud. Una procedencia parcial cuenta como no completa y el
informe la separa de la ausente en lugar de agruparlas bajo un «sin verificar» común.

**Dos decisiones que el criterio no fijaba.**

1. **Un corpus vacío está al 100 %, no al 0 %.** No hay ninguna Cita sin verificar.
   Reportar 0 % haría saltar la alarma el día que se arranca el proyecto, cuando no hay
   nada que arreglar.
2. **El desglose se ordena de peor a mejor salud**, y a igual porcentaje va primero quien
   más Citas tiene. Ordenar por nombre obligaría a leer la lista entera para encontrar
   dónde actuar; así el orden de lectura es ya el orden de trabajo.

El informe explica además por qué el recuento de «sin procedencia» es cero: no es suerte
ni falta de medición, es que el esquema no admite publicar una Cita cuya procedencia no
documente nada. Un cero sin explicación se lee como «todavía no se ha medido».

---

## Cierre de la Épica 1 — siembra del corpus

**Sembrado con las herramientas, no a mano.** `tools/sembrar.ts` crea los Autores y Temas
y después da de alta las Citas **por la herramienta de alta**. Es deliberado: escribir los
ficheros directamente habría producido un corpus que no demuestra nada sobre las
herramientas y que podría contener cosas que el alta habría rechazado.

**Resultado:** 12 Autores, 8 Temas, 38 Citas publicadas, 0 en revisión. «La vida» (17) y
«El saber» (15) cruzan el umbral de 15; los otros seis Temas se quedan por debajo. Eso da
la Historia 2.5 verificable en los dos sentidos —un Tema publicado y uno que debe dar
404— contra el corpus real y no contra datos de prueba.

**La segunda ejecución señaló las 38 como duplicados y no reescribió nada**, que es la
idempotencia saliendo gratis de FR-14 sin código dedicado.

**ADVERTENCIA, y es importante.** La siembra es un punto de partida, **no un corpus
verificado**. La procedencia de cada Cita debe confirmarse contra una edición antes de
publicar el sitio: la promesa del producto es que la atribución está comprobada, y una
siembra sin comprobar la incumpliría desde el primer día. Donde el año no está establecido
con seguridad se ha omitido, dejando la Cita como **parcial** —que es la verdad— en lugar
de inventar una fecha que la haría figurar como completa. De ahí que la salud esté en el
52,6 % y no más alta: las 18 parciales son trabajo editorial pendiente, y el número está
ahí para que se vea.

`corpus/semilla/` se conserva en el repositorio como registro auditable de qué entró y con
qué datos. Vive fuera de `corpus/{citas,autores,temas}/`, así que ninguna colección lo carga.

---

## 2.1 — Página de Cita

**Verificado.** 146 unitarias, 40 funcionales en móvil y escritorio, y revisión visual en
Chrome a 1920 y en emulación móvil a 375. La Cita es el primer elemento visible sin
desplazar en 360×640; comillas angulares; Autor enlazado; obra y año cuando constan;
«Sin obra documentada» y «Sin año documentado» cuando no; tramo anunciado en `data-tramo`;
44px en escritorio y 36px en móvil para el tramo xl; suelo de 23px nunca cruzado; **cero
peticiones de script**; texto, Autor y procedencia en el HTML inicial; cabecera con solo
marca y búsqueda; ningún elemento con sombra; un solo `h1`; `figure`+`blockquote`+
`figcaption`; la serif solo en el texto citado.

**Dos defectos que solo se vieron mirando.**

1. **Tres columnas distintas.** Cabecera, contenido y pie calculaban cada uno su
   contenedor, y los bordes izquierdos caían en 651px, 595 y 737. Todas las pruebas
   funcionales seguían en verde porque todas sus afirmaciones sobre el contenido eran
   ciertas. Se ve de un vistazo y no lo ve ninguna aserción sobre texto.
2. **La causa de fondo era `ch`.** El `.contenedor` compartido usaba `max-width: 68ch`, y
   `ch` es relativa a la fuente del elemento: los mismos 68ch daban 841px en la cabecera
   (Inter a 17px) y 670px en el pie (13px). Para medir texto —que es para lo que sirve—
   `ch` es lo correcto y `--medida-prosa` sigue en `ch`; para fijar una columna de página
   no lo es. Se añade `--ancho-pagina: 45rem`. Hay prueba de regresión que exige un único
   borde izquierdo entre las cuatro regiones.

**Corregido en el arnés.** `astro preview` se demoniza en Astro 7: la orden vuelve
enseguida y deja el servidor de fondo, así que Playwright acababa hablando con un demonio
huérfano de una ejecución anterior que servía un `dist/` viejo —28 pruebas en rojo por una
causa que no se parecía en nada al síntoma—. Se sustituye por `tests/servidor.mjs`, que se
queda en primer plano y sirve como el alojamiento real, incluido el 404 con su estado.

**Cerrado el hueco de la 1.2.** `publicado.ts` verifica la integridad referencial y rompe
el build nombrando la Cita culpable y la entidad que falta. Era el sitio natural: por
AD-11 es el dueño del conjunto publicable.

---

## 2.2 — Copiado con atribución

**Verificado.** 7 funcionales más revisión en Chrome. Una pulsación deja texto y
atribución juntos en texto plano; nunca se copia una procedencia que no consta; el propio
botón confirma dos segundos y vuelve solo, sin notificación flotante; con el portapapeles
roto a propósito el texto se revela seleccionable y no aparece ningún mensaje de error
técnico; el botón mide 44px y su foco es visible.

**Resuelta la tensión entre 2.1 y 2.2.** La 2.1 exige que «la página no envía JavaScript»
y la 2.2 añade un botón que necesita algo. AD-6 la resuelve: hay tres islas hidratadas
bajo demanda. Lo que se prueba, entonces, es lo que de verdad sostiene NFR-2 y NFR-7 —que
no se descargue ningún fichero de script y que el contenido no dependa de ejecutar nada,
comprobado con JavaScript desactivado—, más un tope de 2 KB al código en línea para que no
crezca sin que nadie lo note.

**Decidido — isla en línea y no `import()` diferido.** Diferir la descarga tiene sentido
en el generador de Imagen, que son kilobytes de lienzo. Para un botón de copiar la
petición costaría más que el código que ahorra. Se cumple lo que AD-6 protege sin aplicar
el patrón más allá de donde compensa.

**Defecto de microcopia visto en el navegador.** La procedencia salía como «Sin obra
documentada. · Lema de sus escritos sobre la reforma penitenciaria»: mezclaba un punto con
un separador y dejaba la segunda mitad sin terminar. Ahora se compone como oraciones
completas separadas por punto y espacio. El punto se añade al presentar y no se guarda en
el corpus, para que el dato almacenado siga siendo el dato y no una frase.

**Estructural.** `src/lib/atribucion.ts` compone el texto plano, y lo consumirá también la
Imagen de Cita (5.1): si cada superficie lo compusiera por su cuenta, una publicaría
«Séneca, Cartas a Lucilio» y la otra «Séneca — Cartas a Lucilio, 65».

---

## 2.3 — Página de Autor

**Verificado.** 10 funcionales × 2 viewports, más revisión en Chrome. Semblanza visible;
todas las Citas publicadas del Autor enlazadas, con el número contrastado contra el
sitemap en vez de contra una constante repetida en la prueba; cada enlace del listado
devuelve 200, así que ninguna tarjeta apunta a un 404; lista real; un solo `h1`; la serif
solo en el nombre del Autor y en los fragmentos; sin paginación con pocas Citas; tarjetas
de 44px; cero scripts descargados. Un Autor sin Citas publicadas da 404 y no está en el
sitemap — sin comprobación en la página: `autoresPublicados` no lo devuelve y la ruta no
se genera.

**Decisión de microcopia, reversible.** El rótulo del listado decía «6 CITAS
DOCUMENTADAS». UX-DR21 pone los contadores en la misma lista que el emoji y la
gamificación. Es discutible —un número informativo no es una medalla— pero el número no
aporta nada que el listado de debajo no diga, así que el rótulo queda en «Citas
documentadas». Donde la cuenta sí hace falta es en la paginación, y ahí la exige UX-DR18.
Si Héctor prefiere el número, es una línea.

**Convención con excepción anotada.** El fichero de ruta es `[...page].astro`, en inglés,
porque `paginate()` de Astro exige ese nombre de parámetro. No aparece en ninguna URL —el
segmento público es el número—, así que la convención del español se mantiene donde
importa: en las rutas que ve el visitante y en los identificadores del dominio.

---

## 2.4 — Paginación de listados largos

**Verificado.** 10 pruebas de build sobre un corpus fabricado de 62 Citas de un Autor, más
revisión visual del sitio construido con ese corpus. Primera página con 50 tarjetas
exactas; segunda con las 12 restantes; controles Anterior/Siguiente numerados y sin
«Anterior» en la primera ni «Siguiente» en la última; la segunda declara
`noindex, follow`; cada página su propia canónica; y ninguna Cita se pierde ni se repite
entre páginas. Con exactamente 50 no aparece paginación y **no se genera** una segunda
página vacía.

**Decidido — no sembrar el corpus real para probar esto.** Habría hecho falta un Autor con
más de 50 Citas, es decir cincuenta atribuciones inventadas en `corpus/citas/`: justo lo
que el producto promete que no ocurre. El corpus fabricado vive en el arnés y se destruye
al terminar.

**Defecto visto en el navegador.** Entre el listado y los controles salían **dos filetes
paralelos** separados por un hueco: el de cierre de la última tarjeta y el `border-top` de
la paginación. UX-DR13 hace del filete de 1px el único separador del sistema, no dos
seguidos. La paginación pierde el suyo y se separa con aire. Hay prueba de regresión.

**Corregido en el arnés.** El serializador de fixtures emitía una lista vacía como
`clave:` a secas, que YAML lee como `null`, y el esquema respondía «Expected array,
received object» — `typeof null` otra vez. Y un `afterAll` que limpiaba sin comprobar
reventaba con un `TypeError` cuando el build había fallado, tapando el error de verdad.

---

## 2.5 — Página de Tema con umbral de publicación

**Verificado en los dos sentidos contra el corpus real.** «La vida» (17 Citas) y «El
saber» (15) se publican; los otros seis Temas se quedan por debajo. 14 funcionales: la
página publicada muestra Citas de varios Autores —se comprueba que hay más de un nombre
distinto—, cada enlace del listado devuelve 200, el nombre del Tema es el `h1` y va en
serif, y está en el sitemap. Un Tema por debajo del umbral da 404 y no aparece en el
sitemap.

**La prueba que cierra AD-11.** Se recorre el sitemap, se extrae cada `/tema/…` y se pide
cada uno: todos deben devolver 200. Es la divergencia concreta que AD-11 existe para
impedir —una superficie publica un Tema que otra no— comprobada de extremo a extremo en
lugar de por inspección del código.

**Sin comprobación de umbral en la página.** Como en la Página de Autor, el umbral no se
aplica aquí: `temasPublicados` no devuelve el Tema, la ruta no se genera, y el 404 sale
solo. La única diferencia con el listado de Autor es que cada tarjeta lleva el nombre del
Autor, porque un Tema agrupa a varios y sin el nombre no se sabe de quién es cada frase.

---

## 2.6 — Rutas de salida desde cada Cita

**Verificado.** 14 funcionales. Hasta cuatro Citas del mismo Autor, nunca la propia; chips
solo de Temas publicados —se comprueba con una Cita que pertenece además a «La adversidad»,
por debajo del umbral, cuyo chip no se renderiza—; y dos pruebas que recorren **las 38
Páginas de Cita del sitemap**: ninguna queda sin enlaces salientes internos y ninguno de
los destinos devuelve algo distinto de 200. Dos cargas seguidas dan el mismo orden: no hay
motor de recomendación.

**El caso que obligó a pensar.** Un Autor con una sola Cita cuyos Temas están todos bajo el
umbral no tiene hermanas ni chips, y FR-12 no admite excepciones. El respaldo son los
Temas publicados del sitio; y si ni eso existiera —un corpus recién nacido—, la ficha del
Autor. Sigue siendo navegación por Autor y Tema, que es lo único que FR-12 permite.

**Decidido — el orden deriva de Autor y Tema, no de un motor.** Entre las Citas del mismo
Autor van primero las que comparten Tema con la que se está leyendo. No es recomendar: es
preferir la más estrecha de las dos vecindades que ya existen en el modelo.

**Defecto visto en el navegador.** El enlace «Ver la ficha de Antonio Machado» ponía el
siena en tres sitios de la misma pantalla —búsqueda, botón de copiar y ese enlace— cuando
DESIGN.md lo acota a dos. Además duplicaba el enlace que la atribución ya ofrece. Retirado.

**Prueba corregida, no debilitada.** La de la serif comparaba contra una lista de
etiquetas, así que añadir rutas de salida la rompía sin que nada estuviera mal. Ahora
comprueba lo que dice la regla —que todo lo que va en serif sea texto de Cita, nombre de
Autor o nombre de Tema— y además exige que la serif esté aplicada de verdad, para que no
pase por vacío.

---

## 2.7 — Fundamentos de SEO

**Verificado.** 10 funcionales. El sitemap contiene las 38 Páginas de Cita, los 12 Autores
y los 2 Temas publicados; **todo lo que anuncia devuelve 200**; no contiene el Tema bajo
umbral ni las páginas 2+ de un listado; y ninguna de las URL que anuncia se declara
`noindex` —la contradicción de pedirle al buscador que indexe justo lo que se le pide que
no indexe—. Cada página declara su canónica con su propia ruta y `lang="es"` sin variante
regional. La Página de Cita expone `Quotation` con su `creator`, y **no** declara
`isPartOf` cuando la obra no consta: una obra inventada en datos estructurados es la
procedencia inferida que FR-2 prohíbe, con el agravante de que el buscador se la cree.

**La prueba que de verdad cierra NFR-5.** Un recorrido en anchura desde la portada
siguiendo enlaces reales, con tope de tres saltos, y comparación contra el sitemap: cero
páginas inalcanzables. No es una inspección del código, es el recorrido que haría un
rastreador.

**La portada deja de ser un marcador de posición.** NFR-5 no se puede cumplir con una
portada que no enlaza a nada, así que ya lleva los Temas publicados y todos los Autores.
La Cita del Día de la Historia 4.1 se pondrá encima; el descubrimiento de abajo se queda,
porque sin él la portada tendría una sola salida.

**Nota sobre los datos estructurados y AD-6.** El `ld+json` es un `<script>` en el marcado
pero no es JavaScript ejecutable: el navegador no lo descarga ni lo ejecuta. Hay prueba de
que la página sigue sin pedir ningún fichero de script.

---

## 2.8 — Accesibilidad y comportamiento responsive

**Verificado.** 19 pruebas × 2 viewports. **axe-core con las reglas wcag2a, wcag2aa,
wcag21a y wcag21aa: cero violaciones en las cuatro superficies** (portada, Cita, Autor,
Tema). Anillo de foco de 2px con 2px de separación, comprobado sobre el estilo calculado;
ningún elemento enfocable con el indicador suprimido; el enlace de salto es lo primero que
recibe foco; 360px sin desplazamiento horizontal; zoom al 200 % sin pérdida de contenido;
el ancho extra de escritorio da exactamente los mismos elementos que en tablet —ni una
columna lateral—; ninguna superficie muestra modal, aviso ni nada fijo que tape el
contenido; con `prefers-reduced-motion` no queda ni una transición viva, y sin él ninguna
pasa de 150 ms.

**Defecto encontrado y corregido.** El enlace del nombre del Autor en la atribución medía
unos 18px de alto —el tamaño de su caja de texto a 13px—, muy por debajo de los 44px de
UX-DR22, y es precisamente el enlace que abre la ruta de salida principal desde una
Página de Cita en móvil. Se agranda el área sensible con relleno y se devuelve el ritmo
vertical con margen negativo, así que la maquetación no se mueve un píxel.

**Contradicción del spec, resuelta y anotada.** EXPERIENCE.md pide «contenido primero,
acciones después, navegación al final». Leído como orden de toda la página, obligaría a
poner la cabecera detrás del `main` en el marcado y recolocarla con CSS — y eso desalinea
el orden visual del de foco, que es un incumplimiento de WCAG 2.4.3: arreglaría la letra
de un criterio rompiendo el de al lado, en la misma historia. Leído como el orden **dentro
de la Página de Cita** —Cita, luego copiar, luego salidas— es coherente y es lo que está
construido. Se prueba así, y la cabecera la resuelve el enlace de salto.

---

## 2.9 — Medición desde la primera página publicada

**Verificado.** 32 unitarias. El vocabulario es exactamente los cuatro eventos con nombre
y el guion **descarta en cliente** cualquier otro, así que una isla que invente un nombre
no consigue emitirlo: añadir uno exige modificar el módulo, que es lo que AD-13 quiere que
cueste. Una prueba recorre todo `src/` y falla si algún fichero que no sea `medicion.ts`
menciona `sendBeacon`, el punto final o el nombre de un proveedor.

**Decidido — baliza propia en vez del guion de un proveedor.** AD-13 fija propiedades, no
producto, y avisa de la divergencia peor: adoptar un proveedor que exija banner y
incumplir NFR-10 sin que nadie lo decida. Con un `sendBeacon` propio contra un punto final
configurable, «sin cookies y sin identificar al visitante» queda garantizado por
construcción y no por la casilla de configuración de un tercero. Hay pruebas de que el
guion no toca `document.cookie` ni almacenamiento, no genera identificadores y solo
transporta el evento y la ruta — ni referente, ni agente de usuario, ni pantalla, ni zona
horaria.

**Sin configurar, el sitio no envía nada.** Sin `MEDICION_ENDPOINT` no se inserta el
instalador, y hay prueba de build que lo comprueba sobre el HTML generado. El guardia
`window.__medir && …` de las islas sí está siempre, y debe estarlo: es lo que hace que
copiar funcione igual con la medición apagada.

**Qué queda para el despliegue.** Contratar el destino y apuntar `MEDICION_ENDPOINT`. Las
propiedades que debe cumplir están cerradas en el módulo, no en el contrato.

**Prueba afinada.** El tope de 2 KB al JavaScript en línea contaba también el `ld+json`
de los datos estructurados, que no es JavaScript ejecutable. Excluido: el código real de
las islas son 1 678 bytes.

---

## Cierre de la Épica 2

Las nueve historias cerradas. **206 unitarias y 162 funcionales en verde**, `astro check`
sin errores, y axe-core sin una sola violación WCAG 2.1 AA en las cuatro superficies.
UJ-1 está completo de principio a fin y UJ-3 entero.

---

## 3.1 y 3.2 — Búsqueda y resultado vacío (Épica 3 completa)

**Comprobado antes de decidir.** La tolerancia a acentos de Pagefind no se dio por
supuesta: se indexó el sitio y se consultó desde el navegador. `todavia`/`todavía` y
`sabiduria`/`sabiduría` devuelven lo mismo, y las mayúsculas también. Así que no hizo falta
inyectar texto normalizado oculto —que además habría sido texto invisible con fines de
indexación—; AD-3 se cumple sin ayuda.

**Defecto encontrado en esa misma comprobación.** «sabiduría» devolvía las 54 páginas del
sitio, porque la marca está en la cabecera de todas. Se acota el índice con
`data-pagefind-body` al contenido principal, y se marca `data-pagefind-ignore` en las
rutas de salida: sin eso, buscar un fragmento devolvía también las cuatro páginas que lo
llevan como Cita hermana. Hay prueba de que una consulta por la marca da menos de diez
resultados.

**Verificado.** 15 funcionales. Un fragmento de tres palabras localiza la Cita; sin
acentos y en mayúsculas se obtiene lo mismo; los resultados distinguen Cita, Autor y Tema
—y una consulta devuelve los tres tipos—; todo resultado lleva a una página que existe;
nada no publicado aparece. El código de Pagefind **no se descarga** hasta enfocar el
campo, y sí se descarga al enfocarlo: las dos mitades del criterio.

**Resultado vacío.** Temas y Autores destacados están en el HTML inicial, no se piden al
quedarse sin resultados; el mensaje sugiere reformular con menos palabras; no aparece
ningún texto de error técnico —hay prueba que busca «error», «undefined», «0 resultados»—;
y el evento `busqueda-sin-resultados` se emite **por el módulo de medición**, con la
consulta como texto y sin nada que identifique al visitante. La prueba espía el hueco de
`window.__medir`, que es justo el punto por donde AD-13 obliga a pasar.

**Defecto de coherencia encontrado por una prueba de la 2.7.** `/buscar` se declara
`noindex` pero entraba en el sitemap. Lo cazó la prueba que exige que nada de lo que el
sitemap anuncia se declare no indexable — escrita dos historias antes para otro caso.

---

## 4.1 — Portada con Cita del Día

**Verificado.** 14 unitarias sobre la selección y 6 funcionales sobre la portada. Dos
contextos de navegador independientes —sin estado compartido— ven la misma Cita, que es lo
que distingue una selección hecha en el build de una hecha en el cliente. La Cita
destacada se contrasta contra el corpus en disco, no contra una lista repetida en la
prueba. Cero scripts descargados y el texto viaja en el HTML inicial.

**La rotación, y por qué no necesita memoria.** El índice es el número de días desde la
época módulo el tamaño del conjunto apto. Recorre **todas** antes de repetir ninguna —hay
prueba con conjuntos de 1, 2, 7 y 38 elementos— sin recordar cuáles ya salieron, lo cual
exigiría un estado que AD-10 no permite tener. El conjunto se ordena por slug para que no
dependa del orden en que el build leyó el disco.

**La jornada, y el push a media tarde.** `jornadaDelBuild` devuelve la **fecha**, no el
instante: es la misma a las nueve de la mañana y a las once de la noche, así que dos
builds del mismo día dan la misma Cita y un despliegue a media jornada la conserva. Que
cambie al día siguiente sin publicar nada depende del disparador programado, que es la
4.2 — y conviene decirlo claro: **sin ese disparador esto sigue siendo correcto y la
portada se congela igual**. Es el fallo silencioso del que avisa AD-12.

**Decidido.** Una fijación manual que apunta a una Cita que ya no está apta se ignora y
la rotación sigue. Dejar la portada en blanco por una fijación obsoleta sería peor que
desobedecerla.

**Corregido en el arnés.** El harness de build no creaba `corpus/portada.json`, así que
seis pruebas de otras historias fallaron por una causa ajena a lo que medían.

---

## 4.2 — Reconstrucción diaria programada

**Verificado.** 9 pruebas que leen el flujo de trabajo y comprueban su lógica: existen los
dos disparadores —push a `main` y `schedule` diario a hora fija—; `desplegar` depende de
`construir`, así que un corpus roto no llega a producción; y **una prueba construye de
verdad un corpus inválido y comprueba que el build falla**, que es la otra mitad del
criterio: encadenar los trabajos no sirve de nada si el build no rompe.

La prueba que más dice: se construye el mismo corpus con `FECHA_JORNADA` de dos días
seguidos y se comprueba que la Cita destacada **cambia**. Eso cierra el criterio de que la
jornada avanza sin que nadie publique nada, sin necesidad de esperar a mañana.

**Decidido — el cron a las 05:15 y no a las 05:00.** A las horas en punto la cola de
GitHub Actions se llena y el retraso puede pasar de una hora; en una tarea diaria eso
significa saltarse la jornada. Hay prueba de que el minuto no es cero.

**Decidido — `FECHA_JORNADA` solo se rellena en la ejecución manual.** Si el disparador de
push pasara su propia fecha-hora, dos builds del mismo día podrían componer Citas
distintas. Vacío, `jornadaDelBuild` usa la fecha de hoy, que es la misma toda la jornada.

**LO QUE NO SE HA PODIDO VERIFICAR.** Que el disparador programado dispare de verdad solo
lo demuestra una ejecución real en GitHub, y este repositorio **no tiene remoto
configurado**. Queda comprobado el fichero y la lógica; queda pendiente ver una ejecución
el día del despliegue. Conviene mirarlo explícitamente: es el fallo del que avisa AD-12 y
no avisa de nada cuando ocurre.

El destino es GitHub Pages por ser estático y gratuito, que es lo único que la espina
exige. Cambiarlo es sustituir el trabajo `desplegar`; nada más del sitio lo sabe.

---

## 4.3 — La página 404 como puerta de entrada (Épica 4 completa)

**Verificado.** 9 funcionales. Una URL inexistente devuelve **404 de verdad** y sirve la
página propia, no la del alojamiento; trae el campo de búsqueda y la Cita del Día, y se
comprueba que es **la misma** que la portada; el enlace lleva a una página que existe; usa
el mismo armazón, el mismo papel y la misma alineación de columna; no descarga scripts; y
no está en el sitemap.

**La prueba de la voz.** Se busca activamente lo que no debe haber: el número 404, las
palabras «error», «not found», «servidor» o «solicitada», y cualquier exclamación. El
visitante ya sabe que algo no salió; lo que necesita es por dónde seguir.

**Épica 4 cerrada.** El motivo para volver existe: la portada cambia por jornada, el CI
tiene su disparador diario y un enlace roto es una entrada más en vez de una salida.

---

## 5.1 y 5.2 — Imagen de Cita y plantillas (Épica 5 completa)

**Verificado.** 17 funcionales × 2 viewports más 7 de build. El generador **no se descarga
hasta pulsar** y sí al pulsar —las dos mitades—; el lienzo es cuadrado de 1080; hay tres
plantillas y cambiar de una a otra cambia la composición; el diálogo se cierra con Escape,
tocando fuera y con el botón; la descarga es directa y produce un `.png`; y el evento sale
por el módulo de medición.

**La prueba que cierra AD-8.** La previsualización y el fichero descargado se comparan por
la huella del lienzo antes y después de descargar: son idénticas porque **son el mismo
lienzo**, no dos caminos que deban coincidir. Y el tamaño tipográfico llega en un atributo
calculado por `tramos.ts` —52px para esta Cita, según UX-DR19—, con una prueba de que el
generador no lleva ningún tamaño codificado a mano.

**La Cita de más de 300 caracteres.** El corpus real no tiene ninguna que pase de 101, y
añadir una frase inventada de 300 habría metido una atribución sin verificar en
`corpus/citas/`. Se comprueba con un corpus fabricado: en la Cita larga la acción **no
existe en el marcado** —no se oculta ni se deshabilita—, copiar sigue disponible, y el
texto se muestra íntegro, comprobado sobre el `blockquote` y no sobre el documento, porque
el `<title>` sí recorta y debe hacerlo.

**Dos defectos que solo se vieron mirando.**

1. **Los botones de plantilla salían sin estilo**, de unos 20px de alto en vez de 44. Los
   crea el guion, y Astro acota los estilos del componente con un atributo que solo pone
   al renderizar; los elementos creados en cliente no lo llevan. Se marcan `:global`. No
   lo veía ninguna prueba de accesibilidad porque todas miran la página con el diálogo
   cerrado — ahora hay una que lo abre.
2. **El guion de la isla se insertaba también en las Citas largas.** Abortaba solo, pero
   eran bytes muertos en cada página larga y dejaba en el marcado el rastro de una acción
   que ahí no existe. Lo cazó la prueba de que `data-imagen` no aparezca.

**Tope de JavaScript en línea, subido a conciencia.** De 2 KB a 6: las dos islas suman
unos 4,8 KB sin comprimir en un HTML de 25. El tope existe para detectar crecimiento que
nadie ha decidido; se sube cuando entra una isla a propósito, no cuando algo engorda solo.

---

# Cierre del sprint

**Las 24 historias de las cinco épicas, cerradas.** Verificación final sobre un `dist/`
reconstruido desde cero:

| Puerta | Resultado |
|---|---|
| `astro check` | 0 errores, 0 avisos |
| Unitarias y de build (vitest) | **247 en 15 ficheros** |
| Funcionales (Playwright, móvil y escritorio) | **260** |
| axe-core WCAG 2.1 AA | **0 violaciones en las 6 superficies** |
| Build | 55 páginas, índice de Pagefind incluido |

**Hueco cerrado en el barrido final.** Las pruebas de accesibilidad recorrían cuatro
superficies; `/buscar` y la 404 —que también son públicas— quedaban fuera. Añadidas: las
seis pasan axe sin una sola violación.

## Lo que queda pendiente, y no es poco

1. **La procedencia del corpus sembrado no está verificada.** Es lo más importante de esta
   lista. Las 38 Citas son un punto de partida razonado, no un catálogo comprobado contra
   ediciones. La promesa del producto es exactamente esa comprobación, así que **el sitio
   no debería publicarse hasta hacerla**. La auditoría de la 1.8 da hoy un 52,6 % de
   procedencia completa; ese número es el trabajo editorial pendiente, y está a la vista a
   propósito.
2. **El disparador diario del CI no se ha visto disparar.** El repositorio no tiene remoto,
   así que se ha verificado el fichero y la lógica, no una ejecución. Conviene mirarlo
   explícitamente el día del despliegue: es el fallo del que avisa AD-12 y, cuando ocurre,
   no avisa de nada.
3. **El proveedor de medición está por contratar.** El módulo cierra las propiedades —sin
   cookies, sin identificador, sin consentimiento— y sin `MEDICION_ENDPOINT` el sitio no
   envía nada. Falta apuntar el destino.
4. **El dominio es provisional.** `https://sabiduria-diaria.es` en `astro.config.mjs`,
   conmutable con `SITE_URL`.
5. **`AGENTS.md` está desactualizado.** Su bloque gestionado dice que no hay `package.json`
   y que no hay `uv` en la máquina; ambas cosas dejaron de ser ciertas. Lo regenera
   `bmad-project-context`, así que conviene volver a ejecutarla.

---

# v3 — Épicas 11 a 14

## 11.1 — La Fuente se recupera, y su metadato sale del documento

**Verificado.** `tools/recuperar.ts` es la primera y única dependencia de red del proyecto:
conjunto cerrado comprobado **antes** de pedir, revalidación del destino tras cada
redirección, tiempo máximo, techo de tamaño leído por trozos, `Content-Type`, juego de
caracteres tomado de la respuesta y `User-Agent` derivado de `public/CNAME`. El documento
se versiona en `corpus/fuentes/{id-de-fuente}--{slug-de-obra}.txt` con tres zonas:
cabecera de auditoría, declaración literal de la ficha de la Fuente, y cuerpo en texto
plano. `tools/extraer.ts` deriva obra y año **de la declaración**, no de la cabecera, y
antes de escribir nada comprueba que el documento lo produjo la recuperación: ruta dentro
de `corpus/fuentes/`, nombre que cuadra con la obra derivada, y `url` del conjunto cerrado.

703 pruebas en verde (588 al empezar), 0 errores de tipos, el build no descarga datos del
Corpus.

**Lo que costó dos vueltas.** La primera implementación pasó las puertas y estaba mal. La
extracción aceptaba **cualquier** fichero con cabecera y separador, así que un `.txt`
escrito a mano producía Citas con Procedencia inventada y licencia `dominio público`: la
superficie de tecleo se había mudado del `.yaml` a la cabecera del `.txt` sin cerrarse.
Cuatro capas de revisión coincidieron y dos lo demostraron ejecutándolo. La causa no
estaba en el código sino en la especificación, que fijaba la garantía en las banderas de
la orden en vez de en la cadena de derivación. Se revirtió entera y se re-derivó.

En la segunda vuelta apareció el mismo agujero un nivel más abajo: la `obra` quedaba atada
porque el nombre del fichero se deriva de ella, pero el **año** no lo ataba nada, y editarlo
a mano en un documento realmente recuperado cambiaba la Procedencia. De ahí la tercera zona
del documento: la declaración conserva literales las líneas con que la Fuente dice obra y
año, y el año se vuelve a derivar de ahí al extraer.

**Lo que quedó fuera, a propósito.** La cabecera no es una credencial y no lo pretende: lo
que estas comprobaciones impiden es el accidente y el atajo, no a quien edite ficheros con
intención. Lo que cubre ese hueco es el cotejo de la 11.2 y la contra-métrica SM-C1 de la
11.4. Los lectores por Fuente se han probado contra páginas escritas a mano y nunca contra
un servidor real —AD-22 lo prohíbe en las pruebas—, así que la primera recuperación de
verdad puede pedir ajustes en los selectores.

**Un hallazgo que no es de esta historia.** AD-22 dice que ningún paso del build descarga
nada, y el build **sí** descarga: `astro.config.mjs` usa `fontProviders.google()` para las
dos familias de UX-DR3, y `.astro/fonts/` guarda los `.woff2`. Es anterior a la v3. Queda
como excepción escrita y comprobada en el barrido de AD-22 —con su nombre y su motivo, en
vez de como punto ciego—, pero la divergencia entre la espina y la realidad sigue ahí y la
decide Héctor.

## 11.2 — Ninguna Cita se publica sin aparecer en su documento

**Verificado.** El build coteja el texto de cada Cita contra el cuerpo del documento de su
Fuente y rompe la construcción cuando no aparece literalmente, nombrando la ruta del
fichero y la regla. La comparación colapsa espacios —y los caracteres invisibles que las
ediciones web reparten— y nada más: un acento o una coma de diferencia hacen fallar, y no
pasa por `normalizar.ts`. Vive fuera de `src/lib/`, que por AD-5 sigue sin leer disco: lo
puro en `tools/lib/cotejo.ts`, la lectura en `integraciones/cotejo.ts`, enganchada en
`astro.config.mjs`, que es el único sitio por el que pasan todas las construcciones.

794 pruebas en verde (703 al empezar), 0 errores de tipos, 392 pruebas e2e.

**La decisión de producto: deuda visible que mengua.** Las 38 Citas anteriores a la v3 no
referencian ningún documento, y quien se lo dará es la 11.4, que es trabajo de Héctor. Un
cotejo obligatorio hoy habría tumbado la reconstrucción diaria de un sitio que ya está en
vivo; uno opcional habría dejado justo el agujero que la historia existe para cerrar,
porque bastaría no poner referencia. Se eligió lo tercero: la referencia es obligatoria y
las 38 entran en `corpus/pendientes-de-cotejo.yml`, un censo cerrado por **identidad y
huella del texto**, contado en cada build y en la auditoría, que solo mengua.

**Los dos agujeros que la revisión encontró y las pruebas no.** El primero: una Cita
colocada en un subdirectorio de `corpus/citas/` esquivaba el cotejo entero y se publicaba
—la colección de Astro enumera recursivamente y el lector del cotejo hacía un `readdir`
plano—. Dos revisores lo reprodujeron construyendo de verdad. Es la misma forma del fallo
de la 11.1: el guardián no cubría todo lo que el build publica, así que conviene mirarlo
en cada historia que añada una puerta.

El segundo era mío: la especificación pedía comprobar que el **recuento** del censo no
superase el tope, y eso no cierra nada. En cuanto la 11.4 libere una entrada queda un
hueco donde meter una Cita nueva sin que falle nada — el gesto «añádela al censo para
desbloquear el build» que el censo existía para prohibir. Se enmendó a identidad, y el
código fue más lejos de lo que pedí: ata cada Cita censada a la huella de su texto, con lo
que reutilizar un slug tampoco hereda la exención.

**Un cambio de método que conviene conservar.** Las pruebas de build ya no eximen del
cotejo a sus corpus de prueba: el andamio les siembra el documento que sus Citas dicen
tener, así que una decena de suites ejercitan ahora el cotejo de verdad en vez de
esquivarlo. Eximir por omisión invertía la premisa de la historia para toda prueba futura.

**Lo que quedó fuera.** Ninguna Cita del Corpus se coteja hoy de verdad —las 38 están
censadas y `corpus/fuentes/` está vacío—, así que el camino completo solo se ejercita con
documentos compuestos en las pruebas. La primera siembra real dirá si la retirada de
marcado de la 11.1 deja el cuerpo lo bastante fiel; si no, el ajuste toca en
`documento.ts` y no aquí. `astro preview` no coteja, a propósito: sirve un `dist/` que ya
cruzó la puerta al construirse.

## 11.3 — El objetivo de cada sesión sale del hueco, no del criterio

**Verificado.** `src/lib/objetivo.ts` es una política pura y determinista: consume lo que
`verHuecos` ya calculó y devuelve el objetivo de la sesión declarando de qué hueco sale.
Prioriza el suelo de tradición sobre los Temas cortos, porque un Tema corto se cierra
sembrando a cualquiera que ya esté y el hueco de tradición solo se cierra admitiendo
Autores nuevos — si ganase el Tema fácil, el hueco caro no se cerraría nunca, que es el
sesgo que la historia nombra. Dos llamadas sobre el mismo Corpus dan la misma frase.

882 pruebas en verde (794 al empezar), 0 errores de tipos.

**El conflicto entre artefactos, resuelto por escrito.** La cabecera de `src/lib/huecos.ts`
declaraba desde la v1 que la vista no propone Autores, porque «quién entra en el Corpus es
la única decisión que este producto no delega». La historia pide una política que diga a
qué Tema y a qué Autor dedicar la sesión. Se resolvió por el lado conservador: la política
dice **qué hueco** cerrar y caracteriza al Autor por **tradición**, nunca por nombre. Un
agente desatendido obtiene objetivo determinista; admitir a una persona concreta sigue
siendo de Héctor.

**Una cuenta que la versión ingenua habría fallado.** Cuántos Autores latinoamericanos
faltan no es «el 40 % de 12 son 4,8, faltan 3»: cada alta sube numerador **y** denominador,
así que hay que resolver (2+k)/(12+k) ≥ 0,40, que da 5. Prometer 3 habría dejado el suelo
sin alcanzar.

**Dos defectos de contrato que la revisión encontró.** El primero: la matriz de E/S
estrechaba el objetivo a un solo eje, así que en la rama de tradición —la que el Corpus
toma hoy y tomará durante toda la 11.4— no se decía dónde van las Citas, con seis Temas
por debajo del umbral. Ahora lleva los dos ejes: «Admitir Autores de tradición
latinoamericana… Sus Citas van al Tema «La virtud», al que menos le falta».

El segundo: el registro no tenía dónde poner un resultado, cuando el criterio de la 11.4
dice literalmente «registro su **resultado**». Cada entrada lleva ahora el resultado
medido —Citas publicadas, SM-C1 y porcentaje de tradición—, derivado del Corpus por la
propia orden y no tecleable. Con eso la 11.4 saca «cuántas Citas por sesión» de la
diferencia entre entradas consecutivas y puede detectar la sesión fallida que su criterio
define: SM-C1 que baja mientras el número de Citas sube.

**Lo que quedó fuera.** El registro es autodeclarado: `--registrar` lo ejecuta quien
quiera. El resultado medido lo mitiga mucho —dos entradas con el mismo recuento delatan
una sesión que no sembró— pero acoplarlo del todo sería que el alta registrase la sesión,
y eso es trabajo de la 11.4.

## Cierre de la Épica 11 — desplegada y verificada en vivo

Fusionada a `main` el 19/08 con 14 commits. El flujo `Publicar` salió en verde en un
minuto y el sitio quedó verificado en vivo: `sabiduriadebolsillo.net` responde 200, la
canónica es la suya, una Página de Cita responde 200, `www` redirige al ápice con 301, y
el sitemap desplegado trae **53 URLs, exactamente las 53 del build local**. La Épica 11 no
añade ninguna superficie pública —es herramienta y una puerta de construcción—, así que lo
que había que comprobar era que nada se rompiera, y nada se rompió.

Puertas antes de fusionar: `astro check` 0 errores sobre 132 ficheros, 882 pruebas
unitarias, 392 e2e, y `npm run build` correcto. Cero minutos de CI gastados hasta la
fusión: una sola ejecución para toda la épica.

**Queda abierta la 11.4**, y a propósito. No la ejecuta un agente de desarrollo: corre la
tubería que las tres construyen y se cierra por resultado medido a lo largo de varias
sesiones —los seis Temas a 15 Citas, SM-C1 que no baja, y la tradición latinoamericana del
16,7 % al 40 %—. Por eso la épica queda en `in-progress` y no en `done`: se despliega lo
construido, no se miente sobre el estado.

**Lo que la épica deja listo para esa siembra.** `npx tsx tools/objetivo.ts` dice a qué
hueco dedicar la sesión y a qué Tema van sus Citas; `tools/recuperar.ts` trae el documento
de la Fuente; `tools/extraer.ts` deriva de él la Procedencia y rechaza cualquier documento
que la recuperación no produjera; el build coteja que el texto aparezca literalmente; y
`--registrar` deja la sesión anotada con su resultado medido, que es de donde saldrá la
cadencia. Sembrar mal ya no es posible en silencio: es un build roto con la ruta del
fichero y la regla incumplida.

# v3 — Épica 12

## 12.1 — Una superficie declara en un solo sitio si es publicable

**Verificado.** `src/lib/superficies.ts` declara qué superficies tiene el sitio y cuál es
publicable, y de ese único valor derivan las cuatro consecuencias: entrada en el sitemap,
`noindex`, entrada en el índice interno de Pagefind y entrada en el barrido automatizado
de accesibilidad. Las tres que hablan de indexación salen **del mismo booleano**, así que
la incoherencia que motivó la historia ya no se puede escribir.

970 pruebas unitarias en verde (882 al empezar), 394 e2e, 0 errores de tipos.

**El defecto era real y estaba en producción.** Antes de empezar, en el `dist/`
construido: `404.html` y `buscar.html` llevaban a la vez `<meta name="robots"
content="noindex, follow">` y `data-pagefind-body`. Es decir, le decían al buscador de
fuera que no las indexara y aparecían en el de dentro. Pagefind indexaba 55 páginas
mientras el sitemap declaraba 53. El Kit se libraba solo porque en `kit.astro` sí se
habían puesto las dos banderas — y eso es justamente la prueba de que acordarse no basta:
el pitfall ya estaba escrito en `AGENTS.md` y aun así volvió a ocurrir. Ahora: **53 = 53**,
y cero páginas `noindex` en el índice interno.

**Dos defectos que la revisión encontró y las pruebas no.**

El primero, un caso de inferir semántica de la forma de la URL. Antes «página 2 de un
listado» venía de `pagina.currentPage > 1`, un dato real; la primera versión lo dedujo de
que la ruta acabara en dígitos. Pero el esquema de slugs de `admision.ts` admite un slug
enteramente numérico, así que `/autor/1984` se habría degradado a superficie de servicio y
habría desaparecido del sitemap sin que nadie lo decidiera. Anclada la condición a la
forma completa de una ruta paginada, y comprobado el caso sutil: `/autor/1984/2` —la
página 2 real de ese mismo autor— sigue degradándose bien.

El segundo importa más de lo que parece. La guarda contra que el barrido de accesibilidad
se vaciara entero vivía en la suite de Playwright, y `AGENTS.md` dice explícitamente que
el CI no la ejecuta: la garantía existía y no vigilaba nada en el único camino
automatizado que hay. Se llevó al plano unitario, sobre el proyecto que esa prueba ya
construía, junto con el lazo hermano del sitemap. Verificado por mutación: quitar
`filter: anunciableEnElSitemap` de `astro.config.mjs` hace fallar ahora tres pruebas en
`vitest`, y antes pasaba en verde.

**Lo que quedó fuera.** Cada declaración lleva dos identidades de la misma superficie —el
fichero y la expresión que reconoce su ruta— y nada comprueba que concuerden. «Acuérdate
de tres ficheros» se ha convertido en «mantén de acuerdo dos campos de una entrada», que
es mucho mejor pero no es nada. Y `publicado.ts` conserva una segunda enumeración de lo
publicado, por instancia del Corpus en vez de por familia de superficie, que nada cruza
con la primera.

## 12.2 — La Colección declara sus miembros, y la lista es blanda

**Verificado.** Una Colección declara sus miembros por slug en `corpus/colecciones/{slug}.yml`,
y la pertenencia se resuelve intersectando esa lista con el conjunto publicable. Es la
dirección inversa a la del Tema —que se declara en la Cita— y es a propósito: el Tema es
una propiedad de la Cita, la Colección es una decisión editorial sobre un conjunto y puede
cambiar sin que ninguna Cita cambie. Declararla en la Cita obligaría a editar decenas de
ficheros para crear una agrupación y otra vez para deshacerla.

1049 pruebas unitarias en verde (970 al empezar), 394 e2e, 0 errores de tipos.

Comprobado en directo: 21 miembros declarados —con un repetido, una errata y una Cita
retirada— resuelven a 18 y la Colección se publica; con solo 3 Citas publicables no se
publica, pese a los 21 declarados. El umbral manda sobre lo resuelto.

**El agujero que la revisión encontró, y por qué importaba tanto.** El conjunto publicable
repartía la lista **declarada** en crudo, y la resolución estaba exportada sin filtrar. Una
Página de Colección podía renderizar sin pasar jamás por el umbral — y la página sonda del
propio cambio ya enseñaba ese atajo, que es la forma que la 12.3 habría copiado por ser la
que encontraría en el repositorio. Se cerró quitando la entrada: el conjunto publicable
solo reparte lo ya resuelto y filtrado, así que no hay de dónde sacar una Colección
declarada. La marca de tipos que lo refuerza es el cinturón; la puerta es que no hay puerta.
Verificado por mutación: convertir la marca en un alias hace fallar `astro check`.

**Un hallazgo colateral que valía la historia entera.** El andamio de pruebas enlazaba
`node_modules` completo, y Astro guarda ahí el almacén de datos de contenido: cada build
temporal escribía en el almacén compartido del repositorio. El cargador limpia y repuebla
una colección cuando encuentra ficheros, pero cuando **no** encuentra ninguno se va sin
tocar el almacén — así que una colección vacía hereda lo que dejó la prueba anterior.
Llevaba ahí desde siempre, curándose sola en silencio porque las tres colecciones
existentes nunca estaban vacías. `corpus/colecciones/` vacío es el primer caso que lo
destapa: tras correr la suite, un `npm run build` en la raíz anunciaba una Colección salida
de un fixture. Arreglado, con prueba de regresión.

**Dos decisiones de criterio que conviene conservar.** No se preprocesa `miembros:` nulo a
lista vacía: tragárselo enseñaría a escribirlo, y el mensaje dice qué hacer en su lugar
—omitir el campo—. Y el nombre y el criterio se miden **recortados sin recortarlos**: un
`.trim()` reescribiría lo que el editor guardó, y NFR-12 lo prohíbe.

**Lo que quedó fuera.** La retirada de una Cita no es silenciosa: reimprime el aviso de
desajuste en cada build hasta que alguien quite el slug del fichero. Es divergencia
deliberada con la matriz de la especificación, y la culpa es del contrato: por AD-5 la capa
pura no lee disco, así que no puede distinguir un slug retirado de uno con errata, y dejar
de contar la retirada sería dejar de contar la errata. Y `corpus/colecciones/` vacío deja
dos avisos en cada construcción, uno de ellos engañoso; se investigó callarlos y exigiría
apoyarse en detalles internos de Astro sin garantía de versión, así que se aceptó el coste
y quedó escrito con las líneas literales en `src/content.config.ts`.

## 12.3 — La Página de Colección, sin canibalizar a la Cita

**Verificado.** `/coleccion/{slug}` presenta las Citas de una Colección con el mismo
componente de tarjeta que los listados de Autor y de Tema, con el nombre en Source Serif y
el criterio editorial al pie. Agrega y enlaza pero no reproduce: la canónica de cada Cita
sigue siendo su propia página. Va paginada, porque el umbral es un suelo y no un techo.

1107 pruebas unitarias en verde (1049 al empezar), 398 e2e, 0 errores de tipos.

**El estreno del dueño único de la 12.1, y funcionó.** Declarar la familia de Colección en
`src/lib/superficies.ts` fue **una sola línea**, y de ella salieron el sitemap, el
`noindex`, el índice interno de Pagefind y el barrido de accesibilidad, sin tocar ninguna
lista aparte. Comprobado por mutación: retirar las rutas de Colección de la derivación hace
que el barrido pierda la familia entera.

**La aserción que convierte AD-19 en algo mecánico.** El `<li>` que emite la Colección se
compara **byte a byte** contra el que emite la Página de Tema para la misma Cita. Astro
estampa un identificador por componente, así que una tarjeta copiada a mano no puede
hacerse pasar por la compartida. Una norma de estilo pasa a ser una puerta.

**Una bomba de relojería desactivada.** `busqueda.spec.ts` afirmaba el conjunto **exacto**
de tipos de resultado —cita, autor, tema— y habría fallado el día que se curase la primera
Colección, por un motivo que nada tendría que ver con lo que se estuviera haciendo en ese
momento. Se demostró sembrando una Colección en una copia aislada: la aserción antigua
falla con `+ "coleccion"`. Ahora afirma contención más «ningún tipo desconocido».

**Una afirmación corregida, que no el código.** La prueba de «no se genera contenido
duplicado indexable» usaba textos de más de 120 caracteres a propósito, y por eso no podía
fallar: la tarjeta solo recorta por encima de ese límite. Pero las 38 Citas reales miden
120 o menos —la más larga, 101—, así que en producción la tarjeta **nunca recorta**, y el
texto íntegro de una Cita ya aparece hoy en su Página de Tema y en la de Autor. Lo que
sostiene NFR-13 es la canónica, no el recorte, y ahora el docstring lo dice así.

**Lo que quedó fuera.** La mitad de UX-DR33 que necesita navegador —«sin desplazamiento
horizontal a 360 px»— sigue en una prueba que hoy se salta, porque producción no tiene
ninguna Colección que visitar; la mitad medible sobre el HTML sí pasó al plano que el CI
ejecuta. Se ejercitó todo en una copia aislada con una Colección sembrada —418 e2e en
verde, axe WCAG 2.1 AA incluido— pero eso no es una garantía que corra sola. La Página de
Colección no existirá en producción hasta que se cure la primera con la herramienta de la
12.4, y la portada se comporta bien en ese estado: no la menciona en absoluto.

## 12.4 — Curar una Colección desde la herramienta

**Verificado.** `npm run coleccion` crea una Colección con su nombre y criterio, le asigna
y le quita Citas —solo publicadas—, dice cuánto le falta para publicarse, la despublica
moviéndola a `corpus/_colecciones-retiradas/` y la vuelve a publicar. `npm run huecos`
enumera además las Colecciones cortas junto a los Temas, con la misma redacción: quien cura
una Colección y quien mira qué le falta al Corpus son la misma persona en el mismo momento.

1158 pruebas unitarias en verde (1107 al empezar), 398 e2e, 0 errores de tipos, y
`corpus/` intacto byte a byte tras correr la suite entera.

**Comodidad y no puerta, dicho con precisión.** Lo que la herramienta rechaza por forma lo
rechaza también el esquema, y lo comprueba una prueba que construye el fichero que la propia
herramienta escribió —verde— y luego le quita el `criterio:` a mano para verlo romper con el
mismo mensaje. Lo único que impone la herramienta sola es lo que ningún esquema puede ver:
que el miembro sea una Cita y que esté publicada. `miembros` es una lista de slugs y jamás
una referencia dura, y esa blandura es exactamente lo que hace que retirar una Cita no rompa
el build. `AGENTS.md` afirmaba que editar a mano no se salta ninguna regla; se corrigió,
porque sí se salta esa.

**Tres agujeros con pérdida de datos que la revisión encontró.** El primero: `escribirColeccion`
componía siempre `{slug}.yml`, pero el lector y el cargador de Astro aceptan `.yml` y
`.yaml`, así que un `asignar` sobre una Colección guardada como `.yaml` creaba un segundo
fichero con el mismo slug, informaba de éxito y ponía el build en rojo por la puerta que la
12.2 había construido. El segundo: un `asignar` sobre un fichero editado a mano borraba en
silencio las claves que el lector no reconoce, porque el esquema veía un objeto reconstruido
de tres campos y nunca el juego real. El tercero: una bandera mal tecleada —`--corpuss`— se
ignoraba y la orden escribía en el corpus **real**, justo lo contrario de la restricción que
más se había cuidado.

## Cierre de la Épica 12

Las cuatro historias cerradas, y a diferencia de la Épica 11 ésta queda en `done`: no tiene
ninguna bloqueada. Lo que entra es la cola larga con sitio donde aterrizar —una Colección se
declara, se resuelve blanda contra el conjunto publicable, se publica en su propia página
sin canibalizar a la Cita, y se cura sin escribir YAML—, más el dueño único de publicabilidad
que la 12.1 construyó y que las tres siguientes estrenaron sin tocar ninguna lista.

**La feature queda encendida pero sin encender.** `corpus/colecciones/` está vacío a
propósito: curar es decisión editorial y no la toma un agente. Así que el despliegue de esta
épica no muestra ninguna Página de Colección, y la portada no menciona la sección. La primera
Colección la crea Héctor con `npm run coleccion -- crear "…" --criterio "…"`, y ese día la
superficie aparece sola.

**Desplegada y verificada en vivo.** Fusionada a `main` el 19/08 con 10 commits; el flujo
`Publicar` salió en verde. Comprobado contra `sabiduriadebolsillo.net`: el sitio responde
200, el sitemap sigue con 53 URLs, `/coleccion/lo-que-sea` da 404 y la portada no menciona
Colecciones — las dos últimas por diseño, porque no hay ninguna curada.

Y el defecto que la 12.1 cerraba, comprobado **en producción**: `/404` y `/buscar` siguen
declarando `noindex` y ya **no** aparecen en el índice interno. Antes decían al buscador de
fuera que no las indexara y salían en el de dentro.

# v3 — Épica 13

## 13.1 — Componer varias jornadas de una sentada

**Verificado.** `npm run jornada -- fijar` deja varias jornadas preparadas escribiendo en
`corpus/portada.json`, y `/lote` muestra el material de cada una para publicarlo desde el
móvil, compartiendo componente con el Kit.

1277 pruebas unitarias en verde (1158 al empezar), 400 e2e, 0 errores de tipos, y
`fijaciones` sigue vacío en el repositorio.

**El contenido de la historia es lo que NO se construyó.** No hay segundo calendario ni
desempate: `corpus/portada.json` ya tenía fijaciones y `citaDelDia.ts` ya les daba prioridad
sobre la rotación desde la v1. El lote fija ahí, y «lo anticipado sustituye a lo de la
jornada» no se implementa — se cumple por construcción, porque ambos derivan de la misma
fijación. Es la trampa que `RECONCILIACION.md` §2 nombra, y se verificó enumerando cada
sitio donde el cambio crea la noción de jornada: ninguno mapea jornada a Cita.

**El precio de leer más.** Antes, una clave mal escrita en `portada.json` era inerte:
`citaDelDia` consultaba una sola clave. Al enumerarlas todas, el lote convirtió eso en
fatal — `"manana"` es lexicográficamente mayor que una fecha ISO, así que entraba, caía a
la rotación, y `Date.parse` daba `NaN` hasta hacer lanzar el build **entero**, incluida la
reconstrucción diaria del sitio en vivo. La orden validaba y el lector del sitio no. Ahora
ambos preguntan a `esJornada`, que además pasó a comprobar que la fecha exista de verdad:
`2026-02-31` casaba con la expresión regular y producía un índice `NaN` desde la v1.

**El rechazo que más vale.** Fijar una Cita no marcada apta para portada se rechaza
explicando la consecuencia: `citaDelDia` la ignoraría y ese día rotaría otra. Sin esa
comprobación, fijar «funciona», no falla nada, y el fallo aparece el único día que importa.

**Lo que la revisión enseñó sobre las pruebas.** El aviso de fijación muda —la
funcionalidad estrella, hacer visible un fallo silencioso antes de que llegue el día— no lo
renderizaba ninguna prueba: invertir el guardián dejaba la página avisando en las jornadas
correctas y callando en la muda, con la suite entera en verde. Y la igualdad con el Kit se
comprobaba sobre un solo enlace, mientras la vista estaba reimplementada a mano; ahora hay
componente compartido y la comparación cubre texto, tramo, Imagen, atribución y redes.

## Verificación de producción — 2026-08-20, antes de seguir con la Épica 13

Comprobado el despliegue vivo antes de abrir la 13.2, a petición de Héctor. Lo desplegado
en `main` es el cierre de la Épica 12 (`c976075`, flujo `Publicar` en verde, 19/08 18:41
UTC). La rama `sprint/sabiduria-v3` va cuatro commits por delante y **no está fusionada**:
13.1 todavía no está en vivo, y eso es lo esperado.

**Lo que responde.** `https://sabiduriadebolsillo.net` → 200. `www` → 301 al ápice, `http`
→ 301 a `https`. `sitemap-index.xml` → 200 `application/xml`, e igual ante el agente de
Googlebot. `sitemap-0.xml` lleva **53 URL**: portada, 12 Autores, 38 Citas y 2 Temas —
exactamente el conjunto publicable de hoy. Las Tarjetas Sociales sirven PNG y Pagefind
responde.

**Lo que no aparece, y así debe ser.** `/kit`, `/buscar` y `/404` responden 200 con
`noindex, follow` y ninguna está en el sitemap. `/lote` da 404 porque 13.1 vive en la rama.
`/coleccion/<slug>` no tiene índice y `corpus/colecciones/` se versiona vacío a propósito,
así que no hay ninguna Página de Colección todavía: la primera la cura Héctor.

**La zona DNS, intacta tras el paquete de Domain Connect.** Los cuatro registros `A` de
GitHub Pages siguen ahí, `www` sigue apuntando a `hectorglez4.github.io`, el `TXT` de
`google-site-verification` está presente, y **no hay ningún `MX`**: Gmail Setup, que venía
en el mismo paquete que la verificación, no escribió nada. Es la comprobación que
`DESPLIEGUE.md` §2 dejó como obligatoria justamente por ser un paquete y no una casilla.

**Lo que sigue bloqueado.** La baliza de medición no aparece en el HTML de producción:
`MEDICION_ENDPOINT` no está definida y el Worker no está desplegado, o sea que **LC-4 sigue
sin cerrarse** y con ella la 7.3 y la 14.2. Y el estado de lectura del sitemap en Search
Console no se puede comprobar desde fuera —hace falta la cuenta de Héctor—, así que la 7.2
se queda en `review` hasta que él mire la columna *Última lectura*.

## 13.2 — Una pieza que reúne varias Citas

`npm run pieza -- componer --red instagram <slug> <slug> [...]` compone una Pieza de Canal:
un PNG cuadrado de 1080 con varias Citas apiladas, cada una con su Autor visible, y por
salida estándar el texto para publicar con **un solo** enlace marcado por red. Vive en
`tools/` por AD-15 —composición que no pide ningún visitante a demanda— y **su salida no se
versiona**: lo versionado es la decisión de qué Citas van juntas, nunca el artefacto, que
puede quedarse viejo respecto al Corpus del que salió sin que nadie lo vea.

**Tres decisiones que la historia no traía dadas.** Ni el PRD ni la espina fijan formato de
Pieza. Se toma el lienzo que ya existía —cuadrado de 1080 con margen 96, el de la Imagen de
Cita— en vez de inventar un vertical: es lo conservador y lo reversible, y la 13.3 lo hereda
sin reabrir el debate. El destino es **la portada**, porque una Pieza de tres Citas no puede
enlazar a una de ellas sin favorecerla y el enlace tiene que ser uno; la 13.3 lo sustituirá
por la Página de Colección, y esa es justamente la diferencia entre las dos. Y una Cita
demasiado larga **se rechaza nombrando el slug y la regla** en vez de descartarse en
silencio: componer la Pieza sin ella y no decir nada convierte un error de selección en un
artefacto publicado al que le falta una Cita, y eso no se ve hasta después de publicarlo.

**Lo que enseñó la revisión: se medía el alto y nunca el ancho.** `repartirEnLineas` no
parte palabras nunca —por diseño, viene de la Tarjeta—, así que una palabra más larga que la
línea se emitía sola y salía del lienzo, y el PNG la publicaba cortada. Peor: el nombre del
Autor y la procedencia ni siquiera pasaban por el reparto, iban en un solo `<text>`, y una
obra como «Historia verdadera de la conquista de la Nueva España, 1632» se salía sin aviso.
La historia entera existe para impedir la mutilación del texto y se estaba colando por la
única dimensión que nadie miraba.

**El fallo más caro era de prueba, no de código.** La atribución visible es el criterio de
aceptación central, y del PNG solo se comprobaban firma, ancho, alto y peso. Un revisor
sustituyó el nombre del Autor por su slug y borró la procedencia: **32 de 32 pruebas
siguieron en verde**. La Pieza habría salido diciendo `SENECA` en vez de `SÉNECA`, sin obra
ni año, y la verificación no se habría enterado — porque el texto para publicar, que sí se
comprobaba, viene de otra función.

**Un dueño más, y uno que faltaba.** `escapar` y `repartirEnLineas` bajan a `src/lib/lienzo.ts`
con la paleta y las familias tipográficas, que estaban a punto de tener una cuarta copia; y
la procedencia compuesta —«obra, año»— pasa a salir de `procedenciaCompuesta` en
`atribucion.ts`, porque desde esta historia la escriben dos sitios: el pie que se publica y
la imagen. Con dos redacciones, una diría «Cartas a Lucilio 65» y la otra «Cartas a Lucilio,
65», y nadie lo vería hasta tenerlas delante.

**Verificado.** `npx astro check` 0 errores / 163 ficheros. `npx vitest run` **1356/1356** en
50 ficheros, frente a 1277/47 al abrir la historia. `npm run build` con las 53 páginas de
siempre: la Pieza no añade superficie. Y una composición real de tres Citas —una de ellas
sin procedencia— mirada a ojo: texto íntegro, atribución por Cita, sin coma suelta donde no
hay obra, y el PNG fuera de git.

## 13.3 — Una Colección anuncia su propia pieza

`npm run pieza -- coleccion <slug> --red <red>` compone la Pieza de una Colección: el mismo
lienzo de la 13.2 con dos diferencias, que son el contenido entero de la historia. El lienzo
lleva el **nombre de la Colección** como título, y el texto lleva un solo enlace a
`/coleccion/<slug>?de=<red>` en vez de a la portada.

**El umbral lo cierra el compilador, no un `if`.** `ColeccionPublicada` lleva una marca de
símbolo único no exportado, así que ningún módulo puede fabricar una: la única conversión de
todo el proyecto está pegada al `filter` que aplica `MIN_CITAS_POR_COLECCION`. Como la firma
de la composición exige ese tipo, «una Colección por debajo del umbral no produce Pieza» deja
de ser una regla que haya que recordar — y hay una prueba con `@ts-expect-error` que fija la
puerta. Es la lección de la 12.1 aplicada: una nota que hay que leer no es una puerta.

**Aquí sí se excluye, y por eso hay que decirlo.** En la 13.2 una Cita larga se rechaza,
porque Héctor la nombró. Aquí las Citas vienen de la pertenencia de la Colección, que puede
tener veinte, así que excluir es lo correcto — pero la salida enumera las tres listas: las
que entran, las que se quedan fuera con su motivo, y las declaradas que no resuelven.

**La revisión volvió a encontrar lo que la suite no ve.** Comentar una sola línea
—`cursor += titulo.alto`— dejaba **86 de 86 pruebas en verde** con el nombre de la Colección
impreso encima de la primera cita. La aserción que debía cazarlo solo comparaba
`y(título) < y(cita)`, y como el cuerpo de la Cita (44px) supera al del título (30px), seguía
siendo cierta bajo solapamiento total. La prueba de «la Pieza más llena» también sobrevivía,
porque el apilado terminaba antes y el hueco con la marca solo crecía.

**El mismo patrón, dos veces más.** Un nombre de Colección que se reparte en dos líneas podía
perder la segunda sin que fallara nada, porque todos los títulos de prueba cabían en una: la
misma mutilación que el módulo se niega a hacerle al texto de una Cita, en el único texto que
no tenía la prueba de «no falta ni una palabra». Y los miembros declarados que no resuelven
—erratas, o Citas movidas a `corpus/_revision/`— desaparecían del anuncio sin contarse ni
enumerarse, que es justo la exclusión que el curador no provocó.

**Un dueño más.** `/coleccion/<slug>` estaba escrito a mano en cuatro sitios y la Pieza iba a
ser el quinto — y el suyo es el peligroso, porque un destino equivocado no falla en ninguna
parte: da 404 a un visitante semanas después. Ahora los cinco derivan de `rutaDeColeccion`
en `superficies.ts`. De paso quedó corregida una afirmación falsa de su documentación: Astro
**no** valida los `href` internos, así que renombrar la ruta daría 404 con el build en verde.

**Verificado.** `npx astro check` 0 errores / 166 ficheros. `npx vitest run` **1414/1414** en
52 ficheros, frente a 1356/50 al abrir la historia. `npm run build` con 53 páginas.
`npx playwright test` **400 pasan**. Y una composición real contra una copia de `corpus/` con
una Colección de 16 miembros, mirada a ojo.

## Cierre de la Épica 13 — desplegada y verificada en vivo

Fusionada en `main` (`b28abfb`) y desplegada el 2026-08-20. El flujo `Publicar` (ID
32336776771) en verde: construir, comprobar tipos, pruebas y despliegue. Puerta completa en
local antes de fusionar: `astro check` 0 errores en 166 ficheros, **1414 pruebas unitarias**
en 52 ficheros, `npm run build` con 53 páginas, y **400 pruebas de Playwright**.

**Verificado contra `https://sabiduriadebolsillo.net`.** La portada responde 200 con
`last-modified` de este despliegue. `/lote` —la única superficie nueva de la épica— responde
200 con `noindex, follow`, **no aparece en el sitemap** (que sigue con las mismas 53 URL, o
sea que la épica no añadió nada indexable) y **ninguna superficie pública la enlaza**:
comprobado en portada, `/buscar` y `/404`. Revisada además en el navegador a 375px, que es el
consumidor real: resuelve el estado de hoy —sin ninguna jornada fijada— diciéndolo sin
quebrarse y enlazando al Kit.

**Lo que la épica levantó.** El Canal ya no exige presencia diaria: `npm run jornada` deja
varias jornadas preparadas de una sentada, y el repertorio pasa de la Cita suelta a tres
formatos. Las dos Piezas viven en `tools/` y su salida no se versiona.

**Lo que enseñó, dicho una vez.** Las dos historias de Pieza produjeron el mismo tipo de
hallazgo en la revisión, y conviene registrarlo como patrón: **una aserción que compara
posiciones relativas no prueba que dos cosas no se solapen**. En la 13.2 nadie miraba el
ancho; en la 13.3, comentar `cursor += titulo.alto` dejaba 86 pruebas en verde con el título
impreso encima de la primera cita. Las dos veces la suite entera daba luz verde a un
artefacto que se publica, y las dos veces la mutación fue lo que lo destapó.

**Tres asuntos que se quedan en parche y piden contrato.** No los cierra esta épica:

1. **`coleccionAdmisible` no acota la longitud de `nombre`.** `criterio` sí la tiene
   (`MAX_CARACTERES_CRITERIO`), y el motivo escrito en `umbrales.ts` —va literal a algo que no
   puede recortarlo, así que el único sitio sensato para acotarlo es la admisión, «donde el
   editor todavía lo está escribiendo y puede arreglarlo»— vale ahora palabra por palabra para
   el nombre, que desde la 13.3 va literal a un lienzo de 1080px. Hoy se puede curar una
   Colección cuya Pieza es imposible y no enterarse hasta componerla. No se inventó un umbral
   nuevo porque eso es decisión de contrato; se hizo legible el fallo en su lugar.
2. **`DESIGN.md` dice que el Nombre de Colección es «una sola línea» y la Pieza lo reparte.**
   La contradicción se resolvió en un comentario del código, que es el sitio equivocado para
   una decisión de UX contra un documento que manda sobre cualquier maqueta. Pide una pasada
   acotada de `bmad-ux`.
3. **El convenio de códigos de salida** —2 es la forma de la invocación, 1 es lo que la
   invocación dice— vive hoy en la cabecera de `tools/pieza.ts` y gobierna todo `tools/`.
   Debería estar en `AGENTS.md` o en la espina, o la próxima orden lo partirá de otra manera.

## 14.1 — Encender un Modelo de Ingreso es un commit

`src/lib/ingreso.ts` es el dueño único del estado de los cuatro Modelos —donaciones,
afiliación de libros, producto propio y publicidad acotada—, hoy los cuatro apagados. Cada
uno declara qué dispara su Umbral y qué superficies lo admiten, y encenderlo es un diff de un
booleano que `git revert` deshace. `npm run ingreso` informa sin escribir nada en ninguna
parte, y un paso del flujo diario avisa cuando un Umbral se cruza.

**El hallazgo de la investigación que le dio forma al interruptor.** Amazon Afiliados cierra
la cuenta que no logra tres ventas cualificadas en 180 días, y **la del proyecto ya se cerró
una vez** por esa regla. Se puede resolicitar con etiqueta nueva, pero solicitar arranca el
reloj otra vez. Así que en la afiliación el Umbral no gobierna el encendido del enlace:
gobierna **cuándo se pide la cuenta**. Un modelo de datos que solo supiera decir «cruzado ⇒
encender» obligaría a mentir en una de las cuatro filas, y por eso cada Modelo declara qué
dispara. El informe lo dice con esas palabras: «dispara la SOLICITUD, no el encendido».

**El aviso de CI es el único sitio donde esto podía romper algo en vivo**, porque el flujo
que avisa es el que despliega. Lleva tres cinturones —la orden no sale distinto de cero por
nada que haga el receptor, más `continue-on-error`, más `timeout-minutes`— y eso no es
cortesía: un paso que consultara al receptor y fallara tumbaría la reconstrucción diaria del
sitio publicado por un problema del plano que el sitio nunca lee, que es la dependencia
exacta que AD-14 existe para impedir.

**Una enmienda de contrato, y la razón de que valga la pena contarla.** El contrato decía que
la Página de Cita y la de Colección no admiten **ningún** Modelo. Eso cerraba por omisión una
excepción que el PRD ya había bendecido: el enlace de afiliación nace de la Procedencia **ya
publicada**, que se muestra en la Página de Cita, y la exclusión se había estrechado a la
publicidad. La corrección no cambia nada de lo que hace el sitio —siguen los cuatro apagados
y la afiliación sin superficie—, solo la regla: se vedan `donaciones` y `publicidad-acotada`,
no cualquier Modelo. Lo que importaba no era el efecto, que hoy es ninguno, sino que la
prohibición habría quedado escrita en un sitio donde nadie la habría vuelto a leer.

**La revisión, otra vez, encontró lo que la suite no ve.** Borrar las dos líneas del
`env: MEDICION_ENDPOINT` del paso de CI dejaba **la suite entera en verde** y apagaba el
aviso para siempre — y con un síntoma, «todavía no es medible: falta LC-4», indistinguible
del estado legítimo de hoy, así que nadie lo habría leído como avería, tampoco el día en que
LC-4 se cierre. Y la espera acotada no la recorría ninguna prueba: los tres receptores de
mentira eran «sin desplegar», «caído» —que **rechaza** la conexión— y «contesta»; ninguno
aceptaba y se callaba, que es el único caso para el que la espera existe.

**Una contradicción documental que el informe ahora dice en voz alta.** `MEDICION_ENDPOINT`
es la dirección de **ingesta** de balizas, y el receptor contesta 204 a todo lo que no sea un
POST: escribe y no publica. O sea que **cerrar LC-4 seguirá sin dar cifra** — hará falta un
paso más, enseñarle a publicar una lectura agregada o leerla con `wrangler d1 execute`. Eso
estaba escrito en el spec y no en el mensaje que lee quien ejecuta la orden. Ahora sí.

**Lo que no se construyó, y queda registrado.** Nada avisa en la dirección contraria. La
historia declara que lo importante es poder **apagar**, y la contra-métrica que diría cuándo
accionar esa palanca no existe: el mando solo compara hacia arriba. La palanca está; la señal
no.

**Verificado.** `npx astro check` 0 errores. `npx vitest run` **1501/1501** en 55 ficheros,
frente a 1414/52 al abrir la historia. `npm run build` con 53 páginas. `npx playwright test`
**400 pasan**. Y las tres salidas del mando a mano: el informe con los cuatro apagados,
`--ayuda` con código 0, y `--json --anotar` dejando stdout como JSON parseable.

## Cierre de la Épica 14 al 50% — desplegada y verificada en vivo

Fusionada en `main` (`ee5fd77`) y desplegada el 2026-08-20. El flujo `Publicar`
(ID 32340828532) en verde, **incluido el paso nuevo de aviso**, que corrió por primera vez
en el despliegue real y no tumbó nada. Puerta completa en local antes de fusionar:
`astro check` 0 errores, **1501 pruebas unitarias** en 55 ficheros, `npm run build` con 53
páginas, y **400 pruebas de Playwright**.

**Verificado contra `https://sabiduriadebolsillo.net`.** El sitio no cambió, que es
exactamente el criterio: 53 URL en el sitemap, las mismas de antes, y **cero marcadores** de
Modelo en portada, `/buscar`, `/404`, una Página de Cita, `/kit` y `/lote`. Un Modelo apagado
es invisible, no latente — comprobado sobre lo publicado, no sobre `dist/`.

**La épica se queda en `in-progress`, y es deliberado.** La 14.2 no entra: su Umbral es
«LC-1…LC-4 verificadas» y LC-4 sigue abierta. Se despliega lo construido y no se miente sobre
el estado.

---

## Lo que queda, y no lo puede hacer el bucle

El bucle de la v3 termina aquí: las once historias que le tocaban están cerradas, desplegadas
y verificadas en vivo. Lo que sigue pendiente necesita a Héctor, y esto es lo que necesita de
él, en orden de lo que desbloquea más.

**LC-4 — desplegar el receptor de medición.** `DESPLIEGUE.md` §3. Hoy `wrangler` no está
autenticado, el `database_id` sigue en `PENDIENTE` y la baliza no aparece en el HTML de
producción, así que `MEDICION_ENDPOINT` tampoco está definida. Pide una cuenta de Cloudflare
y conceder OAuth. **Desbloquea tres cosas a la vez**: la Historia 7.3, la 14.2 —cuyo coste de
implementación real es un enlace— y la única serie medida del proyecto.

Y un aviso que sale de la 14.1 y conviene no olvidar: **cerrar LC-4 no basta para que haya
cifra**. `MEDICION_ENDPOINT` es la dirección de ingesta de balizas y el receptor contesta 204
a todo lo que no sea un POST — escribe y no publica. Para que el mando de ingreso y el aviso
diario den un número hará falta un paso más: que el receptor publique una lectura agregada, o
leerla con `npx wrangler d1 execute`.

**7.2 — mirar Search Console.** Desde fuera está todo bien: el `TXT` de verificación en la
zona, el sitemap respondiendo 200 con `application/xml` e idéntico ante Googlebot, y sin
`Disallow`. Lo que no se puede ver sin la cuenta es la columna *Última lectura*. Si ya tiene
fecha y páginas, la 7.2 pasa a `done`; si tiene fecha y sigue en error, entonces sí hay algo
que arreglar.

**11.4 — sembrar.** La tubería está construida y probada (11.1–11.3): `npm run objetivo` dice
qué hueco toca, y `npm run sesion:registrar` anota la sesión. Lo que falta es correrla varias
sesiones hasta los seis Temas a ≥15 Citas y el 40 % de tradición latinoamericana. Sembrar
publica contenido en un sitio público en vivo, y eso es de Héctor por decisión de la épica.

**La primera Colección de verdad.** `corpus/colecciones/` se versiona vacío a propósito y
ningún agente siembra Colecciones. Hasta que exista una, la Página de Colección de la 12.3 y
la Pieza de Colección de la 13.3 están construidas y probadas pero no se han visto nunca con
contenido real — y el umbral provisional de `MIN_CITAS_POR_COLECCION` sale justamente de
curar las tres o cuatro primeras.

## 11.4 — Primera sesión de sembrado, y los tres tapones que destapó

Primera sesión real de la tubería que construyeron 11.1–11.3. **El Corpus pasa de 38 a 50
Citas, SM-C1 sube del 52,6 % al 64 %, la tradición latinoamericana del 16,7 % al 33,3 %, y
«La libertad» alcanza su umbral y se publica.** El sitio pasa de 53 a 67 páginas.

Pero lo que la sesión sobre todo produjo fueron **cuatro averías de la tubería**, tres de
ellas silenciosas. Ninguna se habría visto sin correrla de verdad.

**1. La tradición no se podía teclear.** El esquema admite `tradicion` desde la v1 y de ella
sale el suelo del 40 %, pero `tools/autor.ts` no la aceptaba: `DatosDeAutor` no tenía el
campo. `--tradicion latinoamericana` se tragaba en silencio, el Autor se creaba, la orden
decía «creado» y el fichero salía sin la clave. Pasaba de largo porque la orden **no tenía
guardián de banderas**: aceptaba cualquier `--loquesea` sin rechistar. Es el primer tapón, y
sin él los cinco Autores que pedía el objetivo no habrían contado para nada.

**2. El año de la Fuente no se podía leer.** El lector de año de Wikisource buscaba una línea
`Año:` en la página renderizada, y Wikisource no la renderiza: el dato vive en la plantilla de
encabezado del wikitexto. Comprobado contra el índice: **cero páginas** con la etiqueta
visible. Como Gutenberg responde 503 y Cervantes Virtual 403, Wikisource era la única Fuente
alcanzable, así que **toda Cita nueva habría salido con Procedencia parcial**, hundiendo SM-C1
y haciendo fallida la sesión por el criterio de la propia historia. De paso apareció que la
obra derivada era el título de la página —«Triste (Nervo)»— y no el de la obra —*Los jardines
interiores*—, con el desambiguador de Wikisource camino de la atribución del visitante.

**3. Un documento por obra dejaba sin cotejar la segunda página.** Al pasar a leer el
encabezado, dos poemas del mismo libro resolvían al mismo fichero y el segundo se quedaba sin
cuerpo. Se decidió **un documento por página**: el cuerpo versionado es el de una página, y la
11.2 coteja cada Cita contra el documento que la contiene. Y ahí se pagó la decisión: la
primera aprobación real tumbó el build con «falta `wikisource-es--el-estado.txt`» —un fichero
que **sí** estaba, con la página en el nombre—, porque el cotejo seguía buscando por la obra
sola. **La suite entera seguía verde**: todas sus fixtures usan obras de una página, donde el
nombre se colapsa y la diferencia no se ve. Ahora el cotejo busca todas las páginas de la obra
y hay siete pruebas que lo fijan.

**4. Las Citas aprobadas llegaban sin Tema.** La tubería de extracción no tenía forma de
declararlos: `alta.ts` los toma al crear, pero `revisar --aprobar` no, y no existía ninguna
orden que se los asignara a una Cita. Publicar por esa vía **no cerraba ningún hueco de
Tema**, que es el primer criterio de la 11.4. Ahora `--temas` acompaña a `--aprobar`, que es
cuando el revisor tiene la Cita delante; un Tema con errata **detiene el lote entero** sin
publicar nada, porque el esquema no ve si un slug de Tema existe y el build lo cazaría cuando
la Cita ya estuviera publicada.

**Y una avería que no es de código: el OCR.** El *Apéndice a Mis últimas tradiciones peruanas*
de Palma es un escaneo corrupto, y produjo 61 candidatas plagadas de basura —«enseiia»,
«Ileno», «For- mabalo», «qus», «tata\* rabuelos»—. **El cotejo literal las habría dado por
buenas**, porque aparecen literales en su documento: la puerta comprueba fidelidad al
documento, no que el documento sea legible. Se rechazaron las 61 a mano y se retiró el
documento. Queda historia abierta.

**Lo que la sesión enseñó sobre el rendimiento.** De 183 candidatas se publicaron 12. La
prosa narrativa es una fuente pésima para un sitio de citas —«Ante tan franca confesión no
quedaba al tribunal más que aplicar la pena» es un fragmento sin sentido fuera de su cuento—;
lo que rinde es prosa sentenciosa. Y el objetivo que propuso la 11.3 —Autores latinoamericanos
con Citas a «La virtud»— **no se pudo cumplir**: Wikisource no tiene obra fechada
latinoamericana que sirva a ese Tema. Los Autores entraron; las Citas fueron a «La libertad»,
el hueco que la cosecha sí podía cerrar. Queda registrado como desviación con su motivo en
`corpus/sesiones-de-sembrado.yml`, que es para lo que existe `--anular`.

## 11.4 — Segunda sesión: autores famosos, y el desbloqueo que la hizo posible

**El Corpus pasa de 50 a 70 Citas, SM-C1 del 64 % al 74,3 %, la tradición latinoamericana
del 33,3 % al 41,2 % —por encima del suelo comprometido—, y «La virtud» alcanza su umbral y
se publica.** El sitio pasa de 67 a 90 páginas. Entran José Enrique Rodó y Juan Montalvo.

**El criterio cambió, y encajó mejor de lo esperado.** Héctor pidió priorizar autores famosos
para traer tráfico, no cerrar el suelo panhispánico. Resultó que tiran para el mismo lado: los
dos ensayistas más citados que Wikisource tiene fechados y en dominio público son
latinoamericanos, así que la sesión cumplió el objetivo que la 11.3 proponía —dos Autores
latinoamericanos con sus Citas a «La virtud»— sin anularlo. La política de huecos decide
**dónde** va cada Cita; el criterio de fama, **de quién**.

**El tapón, y por qué era estructural.** Barrido de 80 páginas de Wikisource con `|año`: **las
que declaran año son índices —su cuerpo es una tabla de contenidos— y las que traen texto son
subpáginas sin año**. Es el patrón, no la excepción: *Capítulos que se le olvidaron a
Cervantes* declara 1895 y su cuerpo es el índice; su Capítulo XLIII trae 8.158 caracteres de
texto y ningún año. Lo mismo con *Libro de Buen Amor*, *Tratado de la Pintura*, *Ariel*,
*Motivos de Proteo* y las *Rimas* de Bécquer. Sin resolverlo, **ninguna obra famosa se podía
sembrar sin degradar SM-C1**, y una sesión que baja SM-C1 es fallida por el criterio de la
propia historia.

**La salida no fue relajar la regla, sino encadenar dos declaraciones de la Fuente.** La
subpágina ya dice a qué obra pertenece —`|título = [[Capítulos que se le olvidaron a
Cervantes]]`, un enlace absoluto— y esa obra dice su año. Las dos frases son de Wikisource;
encadenarlas no añade ninguna nuestra. Lo que sí sería inferir —y por eso está prohibido— es
sacar el padre de la ruta `Obra/Capítulo`: ahí el que decide que existe un padre somos
nosotros. Una subpágina con `|título` relativo no encadena y se queda sin año.

**Lo que enseñó sobre elegir fuente.** Rodó es la mejor cantera que ha entrado al Corpus:
*Motivos de Proteo* es literalmente un libro de meditaciones aforísticas, y de 65 candidatas
salieron 11 publicables —«Cada uno de nosotros es, sucesivamente, no uno, sino muchos»—. En
cambio *Capítulos que se le olvidaron a Cervantes* resultó ser una **continuación novelada del
Quijote**, no ensayo: de 141 candidatas, 9. La lección, ya vista con Palma, se confirma: lo que
rinde no es el autor famoso sino la **obra sentenciosa**, y conviene barrer por tipo de obra
antes que por nombre.

**Dos rechazos que valen más que las aprobaciones.** Una candidata era **Séneca citado por
Rodó** —«Yo mismo, en el momento de decir que todo cambia, ya he cambiado»—: publicarla la
habría atribuido a Rodó. Y varias de Montalvo son refranes que dice Sancho, no suyos. La
extracción no distingue la voz del autor de la voz que el autor cita, y **nada en la tubería lo
detecta**: el cotejo literal las da por buenas porque están en el documento. Es hermana de la
avería de OCR de la 11.5 y merece su propia historia.

**Verificado.** `npx astro check` 0 errores. `npx vitest run` **1617/1617** en 56 ficheros.
`npm run build` con 90 páginas y el cotejo literal en verde sobre las 20 Citas nuevas.

## 11.4 — Tercera sesión: el Oráculo manual, y todos los Temas por encima del umbral

**`npm run huecos` responde por primera vez: «Ninguno: todos los Temas del corpus llegan al
umbral».** El Corpus pasa de 70 a **107 Citas**, SM-C1 del 74,3 % al **83,2 %**, y el sitio de
90 a **131 páginas**. Los cuatro Temas que quedaban —«El tiempo», «La palabra», «La
adversidad» y «La amistad»— cruzan los 15 y se publican.

**La lección de la sesión anterior, aplicada.** En vez de buscar autores famosos, se buscaron
**obras sentenciosas**, y apareció lo obvio en cuanto se preguntó bien: el *Oráculo manual y
arte de prudencia* de Gracián (1647) son **300 aforismos**, ya está en el Corpus como Autor, y
—esto es lo que lo hizo inmediato— **declara `|año` en la propia subpágina**, sin necesidad de
encadenar. De 769 candidatas salieron 37 publicables, repartidas por el Tema que de verdad les
toca. Rendimiento del 4,8 %, frente al 6,4 % de Palma y el 17 % de Rodó: el número engaña,
porque aquí la cantera era enorme.

**Lo que la sesión rompió, y por qué está bien que lo rompiera.** Una prueba se puso en rojo:
`objetivo-cli.test.ts` exigía que la orden nombrara siempre algún Tema entre comillas. Daba
por hecho que **siempre habría un hueco**, y desde esta sesión no lo hay: la orden responde
«No hay hueco que cerrar», que es justo el estado que la épica persigue. La prueba pasa a
aceptarlo conservando su control positivo: o hay algo entrecomillado y son todos Temas, o la
orden declara que no hay hueco; callar las dos cosas sigue siendo fallo.

**Una arruga del registro, anotada y no arreglada.** `npm run sesion:registrar` se negó a
registrar: mide el hueco **al registrar**, no al empezar, así que **la sesión que cierra el
último hueco es precisamente la que no puede declararse cumplida**. Se registró con `--anular`
explicando que no fue una desviación del criterio sino del momento de la medición. Si la
cadencia de la 11.4 tiene que salir de sesiones medidas, esa arruga le quita una — y le quita
justo la mejor.

**El ornamento del original, otra vez el problema de la 11.5.** Muchas candidatas de Gracián
traen dentro el adorno que separa los aforismos en la edición —`🙝🙟 133.`— y comillas mal
escapadas. Se filtraron a mano, como el OCR de Palma. Es la tercera sesión seguida en que la
puerta de legibilidad que falta se paga leyendo candidatas una a una.

**Verificado.** `npx astro check` 0 errores. `npx vitest run` **1617/1617**. `npm run build`
con 131 páginas y el cotejo literal en verde sobre las 37 Citas nuevas.

## 11.4 — Cuarta sesión: crecer sin hueco que cerrar, y dos paráfrasis cazadas

**El Corpus pasa de 107 a 148 Citas, SM-C1 del 83,2 % al 87,8 %, y el sitio de 131 a 172
páginas.** Se sembró la segunda mitad del *Oráculo manual* (aforismos 151-300), repartida por
los siete Temas.

**Sembrar sin hueco.** Desde que todos los Temas pasaron el umbral, la política no propone
objetivo —responde «No hay hueco que cerrar»— y la sesión se registra por `--anular`. Es
correcto: la política existe para repartir el esfuerzo cuando escasea, no para prohibir
crecer. Pero conviene saber que **a partir de aquí toda sesión de crecimiento se registra como
desviación**, y eso ensucia la serie de la que la 11.4 tiene que sacar la cadencia.

**Dos paráfrasis cazadas, y es el mejor argumento que ha dado el cotejo.** Al intentar
documentar las 3 Citas de Gracián anteriores a la v3 contra la edición de 1647:

- El Corpus dice **«El sabio hace luego lo que el necio al fin.»**; el aforismo 268 dice
  **«Haga al principio el cuerdo lo que el necio al fin.»**
- El Corpus dice **«Saber y saberlo mostrar es saber dos veces.»**; eso no aparece en ninguno
  de los 300 aforismos.

Son **paráfrasis que circulan por internet atribuidas a Gracián**, no su texto. Estaban
publicadas desde la v1 y nadie lo había notado. Es exactamente el fallo que la Historia 11.2
existe para impedir, y la prueba de que el censo de 38 pendientes no es deuda formal: es deuda
real. La tercera, «Lo bueno, si breve, dos veces bueno», **sí** aparece literal.

**Lo que falta para poder saldar el censo.** No hay ninguna orden que **añada un documento de
Fuente a una Cita ya publicada**: `alta.ts` lo toma al crear y `revisar --aprobar` al aprobar,
pero una Cita de la v1 no puede documentarse sin editar su fichero a mano. Es el mismo hueco
que tenían los Temas antes de esta épica, y bloquea el último criterio abierto de la 11.4.

**Una torpeza propia, anotada porque enseña algo.** Extraje con comodines solapados
(`*oraculo*15*`, `*17*`…) y varios documentos se procesaron dos y tres veces: 2.192 candidatas
donde debía haber ~890, con el mismo texto repetido. `extraer` cuenta «Descartadas por
repetidas» **dentro de una ejecución**, no entre ejecuciones sucesivas sobre el mismo
documento. Se limpió rechazando todo y repitiendo una vez por fichero.

## 11.4 — Quinta sesión: equilibrar los Temas, no llenarlos

**El Corpus pasa de 148 a 197 Citas, SM-C1 del 87,8 % al 90,9 %, y el sitio de 172 a 221
páginas.** Ningún Tema estaba por debajo del umbral, así que el trabajo fue otro: **igualar**.
Se pasó de un reparto de 19-32 Citas por Tema a uno de **24-34**. «La libertad» y «La palabra»,
que iban con 19, quedan con 30 y 28.

**Minar la misma obra por lo que dice, no por lo que falta.** Los 300 aforismos del *Oráculo
manual* ya estaban recuperados, así que esta sesión **no gastó una sola petición de red para
Gracián**: se volvió a extraer de los documentos versionados y se buscó por lo que cada
aforismo trata —amistad, palabra, libertad, tiempo—. Es la ventaja de que el documento se
versione: la segunda pasada sobre una obra es gratis y se puede afinar el criterio sin volver
a la Fuente.

**El límite de una cantera se nota antes en unos Temas que en otros.** *Motivos de Proteo* dio
mucho para «El saber» y «La virtud» y casi nada para «La amistad» y «La palabra»: sus
capítulos 12-23 son alegóricos —el Faro de Alejandría, las provincias de Roma— y de 156
candidatas salieron 14. Gracián, en cambio, cubre los ocho Temas porque el *Oráculo* es un
manual de trato humano. Para equilibrar Temas hace falta una obra que hable de todos, no
varias que hablen de uno.

**Verificado.** `npx astro check` 0 errores. `npx vitest run` **1617/1617**. `npm run build`
con 221 páginas y el cotejo literal en verde sobre las 49 Citas nuevas.

## 11.6 — Documentar una Cita publicada, y el censo de 38 a 29

`npm run documentar <slug> <documento>` escribe la Fuente y la Procedencia **derivadas del
documento** y saca la Cita del censo **en el mismo gesto**, porque el censo exige que ocurran
juntos: una Cita que declara Fuente y sigue censada rompe la construcción. `--retirar <slug>
"<motivo>"` mueve a `corpus/_revision/` la que no supera el cotejo. **El censo baja de 38 a 29.**

**La enmienda que hizo útil la orden.** El contrato decía «no corrijas el texto de la Cita
para que cuadre», y al medir contra las Citas reales resultó que ese «Never» juntaba dos
cosas distintas. El Corpus decía «Hombres necios que acusáis a la mujer **sin** razón… que
culpáis**.**» y la edición de *Redondillas* dice «…a la mujer**,** sin razón… que culpáis**;**».
No es una paráfrasis: **es la misma cita con la puntuación normalizada al teclearla en la v1**,
y es el patrón general del censo. Con el contrato tal cual, la única salida habría sido
**retirar Citas verdaderas por una coma**.

Así que se separó *ajustar el texto hasta que pase* —que sigue prohibido— de *restituir el
texto exacto de la edición*, que es lo contrario de inventar y lo que el propio mensaje de la
11.2 ofrece. `--texto` lo hace con dos guardas: el texto nuevo tiene que **aparecer literal**
en el documento, y tiene que **seguir siendo la misma Cita**. El umbral (0,85 sobre la forma
canónica de AD-3) se fijó en el hueco entre los dos casos reales medidos: la corrección de Sor
Juana puntúa **1,00** y el par de Gracián que abrió todo esto —«El sabio hace luego…» frente a
«Haga al principio el cuerdo…»— puntúa **0,60**.

**Lo saldado, y lo que enseña cada caso.**

- **Retiradas dos Citas que no son de Gracián**, con su motivo: llevaban publicadas desde la
  v1. Es la primera vez que el proyecto retira contenido por falsedad y no por criterio.
- **Corregidas tres** contra su edición: Sor Juana, Machado y el propio Gracián, todas por
  signos de puntuación.
- **Documentadas cuatro** que ya aparecían literales.
- **La obra que declaraba la Cita no siempre era la obra.** «Quien a Dios tiene, nada le falta»
  declaraba «Poesías» y el documento declara «Nada te turbe»; «Hoy es siempre todavía» decía
  «Proverbios y cantares» y son los de *Nuevas Canciones*, no los de *Campos de Castilla*. Manda
  el documento, y por eso la orden lo dice antes de escribir.

**El límite estructural, que conviene no volver a descubrir.** Las cinco de Séneca **no se
pueden saldar**: el Corpus dice «La vida, si sabes usarla, es larga» y la traducción que aloja
Wikisource dice «Larga es la vida, si la sabemos aprovechar». Misma idea, **traducción
distinta**. Para un autor traducido no existe «la edición»: existe *una* traducción, y la que
circula no es la que está. Con las seis del Quijote pasa otra cosa —Wikisource solo tiene el
Quijote apócrifo de Avellaneda y una edición de 1905 sin texto—, y las de Ramón y Cajal y
Concepción Arenal no tienen obra alcanzable. **De las 29 que quedan, buena parte no es deuda
que se pague recuperando más documentos: es deuda que solo se salda retirando o cambiando de
Fuente**, y eso es decisión de Héctor.

## 11.6 — Gutenberg vuelve, y con él los seis del Quijote

Al preguntar por una **cuarta Fuente**, la comprobación previa dio otra respuesta: Gutenberg
—que ya está en el conjunto cerrado— **volvía a responder 200**. La caída de 503/504 del día
anterior era pasajera. No hizo falta ampliar el conjunto: bastó usar lo que ya estaba
declarado. **El censo baja de 29 a 23.**

`gutenberg--don-quijote.txt` (2,1 MB, el texto íntegro) salda las **seis** Citas de Cervantes,
y las seis estaban mal en algún detalle:

| El Corpus decía | Cervantes escribió |
|---|---|
| La pluma es **la** lengua del alma. | la pluma es lengua del alma |
| El que lee mucho y anda mucho, **ve** mucho y sabe mucho. | el que lee mucho y anda mucho, **vee** mucho y sabe mucho. |
| Bien predica quien bien vive**.** | Bien predica quien bien vive |
| Donde una puerta se cierra, otra se abre**.** | Donde una puerta se cierra, otra se abre |
| Cada uno es hijo de sus obras. | cada uno es hijo de sus obras. |
| La libertad, Sancho… dieron los cielos**.** | …dieron los cielos**;** |

La primera es la que más vale: **«la pluma es la lengua del alma» es una cita mal transmitida**
que circula por todas partes, y Cervantes no escribió ese segundo artículo. Llevaba publicada
desde la v1. Las demás son puntuación, mayúscula inicial de fragmento, y un arcaísmo —«vee»—
que alguien modernizó al teclear.

**Lo que enseña sobre las Fuentes.** Antes de admitir una cuarta conviene comprobar que las
tres declaradas responden: una de ellas estaba caída doce horas y eso bastó para dar por
imposible medio censo. La lección va a `DESPLIEGUE.md` como comprobación previa, no al
conjunto cerrado.

## 11.4 — La cadencia que sale de la serie, y la que no

Quinto criterio de la historia: «queda declarada la cadencia de sembrado que §14.3 del PRD
dejaba abierta, **y sale de sesiones medidas, no de una estimación**». La serie ya existe:
cinco sesiones registradas en `corpus/sesiones-de-sembrado.yml`.

| Sesión | Citas | Δ | SM-C1 | Δ |
|---|---:|---:|---:|---:|
| 20/08 12:23 | 50 | — | 64,0 % | — |
| 20/08 17:10 | 70 | +20 | 74,3 % | +10,3 |
| 20/08 21:07 | 107 | +37 | 83,2 % | +8,9 |
| 20/08 21:23 | 148 | +41 | 87,8 % | +4,6 |
| 21/08 06:03 | 197 | +49 | 90,9 % | +3,1 |

**Lo que la serie sí dice, y es lo que la historia pedía.** 147 Citas en cinco sesiones, media
de **36,8 por sesión**. Y el dato que cierra el segundo criterio: **SM-C1 no bajó ni una sola
vez** —64 → 74,3 → 83,2 → 87,8 → 90,9—, así que ninguna de las cinco fue de las que la 11.4
declara fallidas. El rendimiento por sesión **subió** mientras la Procedencia **mejoraba**, que
es exactamente lo contrario de crecer ensuciando.

**Lo que la serie no dice, y sería deshonesto declarar.** Las cinco sesiones ocurrieron en
**dieciocho horas**, corridas por un agente. «36,8 Citas por sesión» mide el rendimiento de un
agente con la tubería ya construida, **no la cadencia sostenible de una persona**, que es lo
que §14.3 dejó abierto. Declarar ese número como *la* cadencia sería sustituir la estimación
que la historia prohíbe por una medición que mide otra cosa —y sonaría a dato duro, que es
peor.

**Lo que sí se puede declarar hoy, con estas cinco:**

- El **techo por sesión no lo pone el esfuerzo, lo pone la cantera**. Las sesiones grandes
  (+41, +49) fueron las del *Oráculo manual*, 300 aforismos ya recuperados; las pequeñas
  (+20), las de obras narrativas. Predecir por «sesiones» es predecir mal: la unidad real es
  **la obra sentenciosa**, y una buena rinde 40-50 Citas.
- **La segunda pasada sobre una obra es gratis**, porque el documento queda versionado: la
  quinta sesión no gastó una sola petición de red.
- El coste que sí es constante es **la revisión editorial**: de 769 candidatas salieron 37, y
  de 2.192 salieron 41. Filtrar es el trabajo, extraer no.

**Qué falta para cerrar el criterio formalmente.** §14.3 vive en el PRD, y `AGENTS.md` prohíbe
editar a mano los artefactos de `planning-artifacts/`: hay que volver a pasar `bmad-prd` con
esto como entrada. Es de Héctor, porque cerrar una pregunta abierta del PRD con un número es
una decisión de producto y no de implementación. La medición ya está hecha y es esta.

## 11.5 — Un documento ilegible no siembra

La puerta que faltaba, y que en tres sesiones seguidas se pagó leyendo candidatas una a una.
El cotejo de la 11.2 comprueba que una Cita **es fiel a su documento**, no que el documento
**sea legible**: un escaneo con el OCR roto lo pasa entero, porque la basura aparece literal en
su fichero. Ahora la extracción mide el documento antes de proponer nada.

**Verificado sobre lo que importa, que es el lado sano.** Los cuatro documentos reales del
Corpus —Gracián, Rodó, Montalvo, Machado— pasan con **cero descartes por ilegible**. Era el
riesgo declarado de la historia: una puerta demasiado estricta habría empezado a descartar
arcaísmos, latín y nombres propios, y entonces el Corpus dejaría de crecer justo por donde más
vale.

**Y caza el documento que la originó.** Recuperado otra vez el *Apéndice a Mis últimas
tradiciones peruanas* de Palma, la orden no propone ni una candidata y dice por qué **con la
medida delante**:

> El documento no se puede leer: 82 de sus 2292 palabras traen señales de OCR roto (3,6 %, por
> encima del 2 % admitido). Señales vistas: palabra-partida, mayúscula-intercalada,
> carácter-ajeno, letra-suelta, impronunciable.

Y cierra explicando lo que ninguna otra puerta dice: «una Cita sacada de aquí saldría mutilada
y con la firma de su Autor, **y el cotejo literal la daría por buena porque la basura está en
el documento**».

**El documento se queda versionado.** Recuperar es archivar lo que la Fuente da, y un escaneo
malo sigue siendo registro válido de lo que hay ahí; lo que no puede es sembrar. Corregirlo a
mano sería inventar lo que la edición decía.

`npx vitest run` **1733/1733** en 59 ficheros, frente a 1644 de la línea base.

## 15.1 — El listón agresivo tiene nombre, y lo cruza un solo módulo

El día que el bucle se quedó sin trabajo. `npm run huecos` cerraba con «No hay hueco que
cerrar» y decía la verdad: ningún Tema por debajo del umbral y la tradición latinoamericana en
el **41,2 %** sobre un suelo del 40 %. Los criterios medibles de la 11.4, cumplidos. Y un bucle
que deriva su trabajo del hueco, sin nada que derivar.

Mientras tanto, en el repositorio: **59 documentos de Fuente versionados, 489.690 palabras**, de
los que habían salido 252 Citas — una por cada 1.943 palabras recuperadas. Y las Épicas 12 y 13
enteras, con Colección, Página de Colección, curación y Pieza construidas y **sin usar una sola
vez**. La tubería estaba puesta y sin exprimir.

**La Meta de Corpus.** 1.000 Citas, 24 Temas publicados, 35 Autores, 12 Colecciones. Vive en
`umbrales.ts` bajo AD-9 y la cruza `src/lib/meta.ts`, que es su único dueño. Va en un módulo
aparte de `objetivo.ts` a propósito: el suelo de publicación es una regla del producto —moverlo
rompe páginas vivas— y la meta es una ambición —moverla solo cambia la próxima sesión—. Ese
corte dejó **las 96 pruebas de la 11.3 intactas**, sin tocar una línea.

**El techo de concentración es la pieza que impide hacer trampa.** Gracián aportaba 114 de las
252 Citas: el **45,2 %**, y no por decisión editorial ninguna — el *Oráculo manual* son
trescientos aforismos ya troceados y Machado hay que leerlo entero para sacar seis. Es el sesgo
que `objetivo.ts` describe, materializado en una cifra. Sin techo, mil Citas se alcanzan minando
más Gracián. Con techo del 15 %, y como **una Cita publicada no se despublica**, el hueco se
mide en Citas de *otros*: el Corpus tiene que llegar a 760 para que su peso baje solo.

**Y no nombra a nadie, que es donde estuvo el filo.** El tramo de concentración tenía una excusa
buena para saltarse la regla de la Historia 9.3 —nombrar al que ya está no es elegir a quién
admitir— y no se la saltó: el informe dice «el Autor más representado» y el slug viaja solo en
el `--json`. La prueba que extrae todo lo entrecomillado del informe y exige que sea un nombre
de Tema sigue en verde sin tocarla.

El escalonado es por **coste**, no por importancia: Colecciones (no siembra nada), concentración,
Autores, Temas, volumen. Hoy el tramo es el primero — doce Colecciones sobre lo ya publicado.

`npx astro check` **0 errores / 182 ficheros**. Protocolo en `LOOP-PROTOCOL-V4.md`.

## 15.2 — Las cuatro primeras Colecciones, sin sembrar una sola Cita

El tramo más barato de la Meta, y el que llevaba dos épicas construido sin estrenar. Las
Épicas 12 y 13 dejaron página, umbral, curación y Pieza; `corpus/colecciones/` seguía con su
`.gitkeep` y nada más. Cuatro Colecciones después, el sitio pasa de **277 a 281 páginas** sin
haber recuperado ni un documento nuevo.

**Lo que la curación enseñó, que no estaba previsto.** Los criterios editoriales estrechos y
transversales **no llegan a quince**. El eje «decir frente a hacer» —Machado, Martí, Cervantes y
Gracián hablando de lo mismo— reúne nueve Citas, y ocho son de Gracián. Medidos los seis ejes
temáticos dentro de las 114 de Gracián, ninguno llega solo al umbral: amigos/enemigos 14,
fortuna/suerte 14, necios/vulgo 8, fama 8, callar/secreto 2. Es la concentración del Corpus
vista desde otro sitio: con 114 Citas de un Autor repartidas por todos los asuntos, y 252 en
total, casi cualquier corte fino se queda corto.

Las que sí salieron son las que **coinciden con la obra de un autor entero**, y esa es la
lección: hoy una Colección se sostiene cuando un libro entero trata de una cosa.

- **Empezar de nuevo** (22) — *Motivos de Proteo* de Rodó es, de principio a fin, un libro sobre
  cambiar de rumbo. Con el «Caminante, no hay camino» de Machado y Martí al lado.
- **Saber para ser libre** (17) — la tesis de Martí en *Maestros ambulantes* y *Educación
  popular*: la ignorancia como primera forma de la servidumbre.
- **El uniforme y la sotana** (17) — González Prada entero, que no escribió sobre otra cosa: el
  cuartel, la casaca y el altar. «Para un asesino, el cadalso; para un guerrero, la apoteosis».
- **Elogio de lo escaso** (15) — Montalvo entero, más el «Poderoso caballero es don Dinero» de
  Quevedo y los pobres de la tierra de Martí.

**Y un test en rojo que era una suposición caducada.** `coleccion-cli.test.ts` afirmaba
`expect(antes).toEqual(['.gitkeep'])` dentro del guardián que comprueba que una bandera con
errata no siembre en el corpus real. Esa línea fijaba un **estado transitorio del Corpus** —que
no hubiera Colecciones— en vez de un comportamiento de la orden, así que la primera Colección
curada la rompía por diseño. Se sustituye por lo que sí es comportamiento y además es más
fuerte: que la orden rechazada no haya dejado **su** fichero. El guardián de verdad, que el
directorio no cambie, no se toca.

`npx astro check` 0 errores; `npx vitest run` **1872/1872** en 60 ficheros; `npm run build` 281
páginas; `npx playwright test` **400 pasadas**, 14 saltadas. Las cuatro Colecciones responden en
`dist/coleccion/` y están en `sitemap-0.xml`.

**Verificado en vivo** (24/08/2026, ejecución 32777407793 en verde): las cuatro Páginas de
Colección responden 200 en `https://sabiduriadebolsillo.net/coleccion/…`, están las cuatro en
`sitemap-0.xml`, y la canónica de cada una apunta a sí misma —no canibaliza a ninguna Cita, que
era el criterio de la Historia 12.3—.

## 15.2 (cierre) — Doce Colecciones, y el tramo escala solo

Ocho más en una sesión: **4 → 12 de 12**, y `objetivoDeMeta` pasó por su cuenta al tramo
siguiente. El sitio va de **281 a 289 páginas**, y sigue sin haberse sembrado una sola Cita ni
recuperado un solo documento. **204 de las 252 Citas (81 %)** pertenecen ya a alguna Colección.

**Lo que desbloqueó las ocho.** La sesión anterior concluyó que los criterios estrechos no
llegan a quince, y era verdad a medias: lo que fallaba era buscarlos por palabra clave. Leídas
las 114 de Gracián de una sentada, las agrupaciones aparecen solas —el trato, la fortuna, los
amigos, la necedad, el silencio, la sazón— porque el *Oráculo manual* está escrito por temas
aunque no los rotule. Un `grep` de «callar|silencio» encontraba dos Citas; leyéndolo, el
silencio reúne diecisiete.

También cayó una restricción que yo mismo me había inventado: creía que una Colección no podía
solaparse con un Tema. La Historia 12.3 dice «sin canibalizar **a la Cita**», y de eso se ocupa
la canónica. Un Tema es un asunto; una Colección es un criterio, y «el silencio como cordura»
no es lo mismo que «la palabra» aunque compartan Citas.

Las ocho: **Amigos de los que fiarse** (19), **Prevenirse en la próspera** (19), **Los escollos
del trato** (17), **Achaques de necedad** (15), **El silencio es sagrado de la cordura** (20),
**Conocer las cosas en su sazón** (15), **La vida, si sabes usarla, es larga** (15) y **Cada uno
es hijo de sus obras** (17). Diez de las doce mezclan Autores; ninguna es una antología de uno
solo por accidente.

**Y el tramo siguiente ya está declarado, con su cifra:** «Sembrar 508 Citas de otros Autores:
ningún Autor puede pasar del 15 % del Corpus». Es el techo funcionando como se diseñó — no dice
que Gracián sobre, dice cuánto falta de los demás.

`npx astro check` 0 errores; `npx vitest run` **1910/1910** en 62 ficheros; `npm run build` 289
páginas y 12 en `dist/coleccion/`; `npx playwright test` **400 pasadas**, 14 saltadas.

**Verificado en vivo** (24/08/2026, ejecución 32779201262 en verde): las **doce** Colecciones
están en `sitemap-0.xml` del dominio y las nuevas responden 200. Con esto el tramo de
Colecciones de la Meta queda cerrado y `sprint-status.yaml` pasa 15-2 a `done` y 15-3 —el techo
de concentración— a `in-progress`.

## 15.3 — El techo empieza a diluir, y la extracción enseña su escala

Primera sesión del tramo de concentración. **252 → 268 Citas**, el sitio de **289 a 305
páginas**, y el Autor más representado baja del **45,2 % al 42,5 %**. El objetivo declarado pasó
de «sembrar 508 Citas de otros Autores» a 492 él solo: el techo funciona como se diseñó, sin que
nadie lo empuje.

**Lo primero fue lo que ya estaba.** `corpus/_revision/` tenía **66 candidatas pendientes** de
sesiones anteriores, extraídas y cotejadas, esperando decisión. Antes de extraer nada nuevo se
revisaron esas.

**Y de 64, entraron 16.** El resto no son Citas: son **prosa de enlace** de *La futura
esclavitud* y *Maestros ambulantes* —«La Futura Esclavitud se llama este tratado de Herbert
Spencer», «Nueva York, abril de 1884», «He ahí, pues, lo que han de llevar los maestros»—.
Fragmentos que su documento sostiene y que fuera de él no dicen nada. El criterio aplicado es el
que el propio sitio declara: una Cita se sostiene fuera de su obra. Se descartaron también las
que abren con conectivo —«Y el único camino…», «Pero cuando se serene este mar…»—: el conectivo
delata la dependencia.

Las que entraron son de las que aguantan solas: «Comieron y bebieron; pero no supieron de sí»,
«De ser siervo de sí mismo, pasaría el hombre a ser siervo del Estado», «Los hombres crecen,
crecen físicamente, de una manera visible crecen, cuando aprenden algo», «Nosotros diríamos a la
política: ¡Yerra, pero consuela!».

**Las dos candidatas del Autor que está por encima del techo se dejaron sin aprobar.** Aprobarlas
sería empujar en la dirección contraria a la del tramo. No se rechazan —son buenas— sino que
esperan a que el reparto lo permita. Decisión conservadora, escrita aquí como manda el protocolo.

**La escala de lo que queda, medida.** `extraer` en seco sobre el *Quijote* de Gutenberg —386.652
palabras, y su Autor con solo 6 Citas— propone **3.267 candidatas**, con 3.580 descartadas por
longitud, 30 por no estar en español, 12 por ilegibles y 1 repetida. Es el documento que más
diluye y el mayor pozo del repositorio, pero 3.267 candidatas no son una sesión de revisión: son
el trabajo de muchas. La sesión siguiente empieza por ahí, por lotes.

**Un hallazgo que no se toca todavía.** `rechazar` hace `rm` sobre el fichero de la candidata,
mientras que `despublicar` **mueve** a `_colecciones-retiradas` porque AD-2 dice que git es el
único almacén. Son dos criterios distintos para la misma clase de acto. Las 46 candidatas de
prosa de enlace se quedan por tanto pendientes en vez de borradas: borrar 46 ficheros en bloque
no es la opción reversible, y la discrepancia merece decidirse mirándola, no de pasada.

`npx astro check` 0 errores; `npx vitest run` **1910/1910** en 62 ficheros; `npm run build` 305
páginas; `npx playwright test` **400 pasadas**, 14 saltadas.

**Verificado en vivo** (24/08/2026, ejecución 32780763027 en verde): `sitemap-0.xml` del dominio
declara **305 URL**, exactamente las que el build produjo, y 48 de ellas son Citas del Autor
sembrado esta sesión. Las Citas nuevas responden 200.

## 15.3 (2.ª sesión) — Cuarenta de Séneca, y la concentración baja al 37 %

**268 → 308 Citas**, el sitio de **305 a 345 páginas**, y el Autor más representado pasa del
**42,5 % al 37 %**. El objetivo declarado cae de 492 a **452**.

**Por qué no se empezó por el Quijote.** Es el mayor pozo —386.652 palabras y su Autor con seis
Citas— pero propone 3.267 candidatas, y volcarlas a `_revision` crearía de golpe un montón
irrevisable. Se empezó por el documento pequeño de un Autor con pocas Citas, que diluye igual y
sí cabe en una sesión: *De la brevedad de la vida*, 9.198 palabras, **196 candidatas**.

**De 196 entraron 40, un 20 %.** El criterio, el mismo de siempre: que la frase se sostenga
fuera de su obra. Fuera quedan las que arrastran un pronombre sin referente —«Ésta no puede
inquietarse ni quitarse», «Estas cosas te abrirán el camino»—, las que abren con conectivo, y
las que **casi repiten una Cita ya publicada**: «Larga es la vida, si la sabemos aprovechar» se
descartó porque el Corpus ya tiene «La vida, si sabes usarla, es larga», que es la misma
sentencia en otra traducción. El detector de repetidas no la vio —son cadenas distintas— y la
habría publicado dos veces.

**Un defecto de la extracción, medido de paso.** Veintitantas candidatas llegan con el
encabezado del capítulo pegado al cuerpo: «Capítulo IX ¿Por ventura alguno…», «Capítulo XX
Recógete a estas cosas…». Ninguna se aprobó. Es exactamente lo que la otra sesión está
arreglando en `tools/lib/extraccion.ts`; cuando ese arreglo entre, este documento merece una
segunda pasada, porque varias de esas frases son buenas y hoy están inservibles por el prefijo.

**Y un test en rojo que era una mejora disfrazada.** `documento.test.ts` fijaba la lista de
documentos versionados **sin ninguna Cita que se cotejara contra ellos**: eran tres, y ahora son
dos. *De la brevedad de la vida* salió de esa lista porque estas cuarenta Citas sí salieron de
él por la extracción de la 11.1. Lo que sigue en el censo de pendientes de cotejo son las cinco
Citas viejas, no el documento. La lista mengua en la buena dirección y el test lo dice ahora con
esas palabras.

`npx astro check` 0 errores; `npx vitest run` **1910/1910** en 62 ficheros; `npm run build` 345
páginas; `npx playwright test` **400 pasadas**, 14 saltadas.

**Verificado en vivo** (25/08/2026, ejecución 32782544083 en verde): `sitemap-0.xml` del dominio
declara **345 URL**, las mismas que produjo el build, y las Citas nuevas responden 200.

## 15.3 (3.ª sesión) — Veinte de la *Respuesta a Sor Filotea*, y la concentración al 34,8 %

**308 → 328 Citas**, el sitio de **345 a 365 páginas**, el Autor más representado del **37 % al
34,8 %**, y el objetivo declarado de 452 a **432**.

Elegido este documento por dos razones que apuntan al mismo sitio: su Autora tenía **tres** Citas
y el Corpus solo cuenta con **cuatro Autoras, nueve Citas entre las cuatro**. Diluye y corrige a
la vez.

**De 196 candidatas entraron 20, un 10 % — la mitad del rendimiento de Séneca.** No es peor
extracción: es otro género. La *Respuesta* es una epístola erudita, y sus párrafos se apoyan en
citas latinas, en referencias patrísticas y en la carta a la que contesta. Un libro de aforismos
da una Cita de cada cinco; una carta de defensa, una de cada diez. Conviene saberlo antes de
estimar cuánto rinde un documento por su tamaño.

Entraron las que no necesitan la carta para entenderse: «Si Aristóteles hubiera guisado, mucho
más hubiera escrito», «¿qué os pudiera contar, Señora, de los secretos naturales que he
descubierto estando guisando?», «Bien dijo Lupercio Leonardo, que bien se puede filosofar y
aderezar la cena», «¡Rara demencia: cansarse más en quitarse el crédito que pudiera en
granjearlo!», «Mi entendimiento tal cual ¿no es tan libre como el suyo, pues viene de un solar?».

**Y otro casi-duplicado esquivado**, el segundo en dos sesiones: «Yo no estudio para escribir, ni
menos para enseñar… sino sólo por ver si con estudiar ignoro menos» se descartó porque el Corpus
ya publica «Yo no estudio para saber más, sino para ignorar menos». Van dos veces que el filtro
que salva al Corpus de repetirse es el juicio, no una puerta.

**Un número que conviene vigilar.** La suite de Playwright pasó con **396** en vez de las 400 de
la sesión anterior, sin un solo fallo y con las mismas 14 saltadas. Varios casos se generan a
partir del contenido —los que recorren Temas por debajo del umbral, por ejemplo, desaparecen
cuando no hay ninguno—, así que el recuento se mueve con el Corpus. Queda anotado aquí en cada
sesión precisamente para que una bajada **real** de cobertura se distinga de esta.

`npx astro check` 0 errores; `npx vitest run` **1910/1910** en 62 ficheros; `npm run build` 365
páginas; `npx playwright test` **396 pasadas**, 14 saltadas, 0 fallos.

**Verificado en vivo** (25/08/2026, ejecución 32783987321 en verde): `sitemap-0.xml` declara
**365 URL**, las mismas del build, y las Citas nuevas responden 200.

## 15.3 (4.ª sesión) — Treinta y cuatro de Unamuno, y la lista de documentos mudos baja a uno

**328 → 362 Citas**, el sitio de **365 a 399 páginas**, el Autor más representado del **34,8 %
al 31,5 %**, y el objetivo declarado de 432 a **398**.

**El mejor rendimiento hasta ahora: 34 de 176, un 19 %**, casi el doble que la epístola de la
sesión anterior y a la altura del libro de aforismos. *Del sentimiento trágico de la vida* es
prosa filosófica que **piensa en sentencias**: «Como a otros les duele una mano o un pie o el
corazón o la cabeza, a Spinoza le dolía Dios», «No basta curar la peste, hay que saber llorarla»,
«Lo más santo de un templo es que es el lugar a que se va a llorar en común», «Querer ser otro,
es querer dejar de ser uno el que es», «Hasta un axioma puede llegar a ser en ciertos casos una
impertinencia».

Con tres documentos medidos, la regla empieza a verse: **el rendimiento lo marca el género, no
el tamaño**. Aforismos ~20 %, prosa filosófica aforística ~19 %, epístola erudita ~10 %.

**Y la lista de documentos mudos baja de dos a uno.** `documento.test.ts` vuelve a rojo por
segunda vez en la noche y por el mismo motivo bueno: «Del sentimiento trágico» ya tiene Citas que
se cotejan contra él. Queda solo la letrilla de Quevedo, y **ese no se cierra sembrando**: es un
poema de una sola Cita, publicada antes de la v3 con otro nombre de obra. Pide `documentar`, no
`extraer`. Escrito así en el test para que quien lo lea sepa que el último caso es de otra clase.

`npx astro check` 0 errores; `npx vitest run` **1910/1910** en 62 ficheros; `npm run build` 399
páginas; `npx playwright test` **396 pasadas**, 14 saltadas, 0 fallos.

**Verificado en vivo** (25/08/2026, ejecución 32785220702 en verde): `sitemap-0.xml` declara
**399 URL**, las mismas del build, y las Citas nuevas responden 200.

## 15.3 (5.ª sesión) — Treinta de los *Proverbios y cantares*, y la concentración baja del 30 %

**362 → 392 Citas**, el sitio de **399 a 429 páginas**, el Autor más representado del **31,5 %
al 29,1 %** —por primera vez por debajo del 30 %— y el objetivo declarado de 398 a **368**.

Dos documentos pequeños, 171 candidatas, **30 aprobadas (17,5 %)**. Entraron «La verdad es lo que
es, y sigue siendo verdad aunque se piense al revés», «Confiemos en que no será verdad nada de lo
que sabemos», «Españolito que vienes al mundo, te guarde Dios», «Una de las dos Españas ha de
helarte el corazón», «Yo vivo en paz con los hombres y en guerra con mis entrañas».

**El defecto del encabezado, otra vez y peor.** Aquí el prefijo es el numeral romano del
proverbio: «XXIX Caminante, son tus huellas…», «LXVIII Todo necio confunde valor y precio». Y hay
un dato que lo confirma desde el otro lado: **varias de las numeradas duplican Citas que el
Corpus ya publica limpias** —«Todo necio confunde valor y precio», «Hoy es siempre todavía»,
«Despacito y buena letra»—, prueba de que el texto bueno está ahí y solo lo tapa el prefijo.
Ninguna se aprobó. Cuando el arreglo de `tools/lib/extraccion.ts` entre, estos dos documentos son
los primeros que merecen segunda pasada.

**Una decisión de juicio, escrita porque es discutible.** Se aprobó «Caminante, no hay camino,
sino estelas en la mar» aunque el Corpus ya publique «Caminante, no hay camino, se hace camino al
andar». Son dos versos consecutivos del mismo poema que circulan por separado y cada uno se cita
solo; el riesgo es que en un listado se lean como repetición. Se acepta ese riesgo: son dos Citas
distintas, no dos redacciones de una.

**Y la explicación del recuento de Playwright que se venía anotando.** Baja —400, 396, 394— y
**no es cobertura perdida**: `coleccion.spec.ts` tiene casos escritos para el estado «todavía no
hay Colecciones», guardados con `test.skip(PRIMERA !== undefined, …)`. Al curar las doce
Colecciones, esos casos pasan a saltarse porque su premisa dejó de ser cierta, que es exactamente
lo que deben hacer. El recuento seguirá moviéndose con el contenido; lo que hay que vigilar es un
**fallo**, no una bajada.

`npx astro check` 0 errores; `npx vitest run` **1910/1910** en 62 ficheros; `npm run build` 429
páginas; `npx playwright test` **394 pasadas**, 14 saltadas, 0 fallos.

**Verificado en vivo** (25/08/2026, ejecución 32786386775 en verde): `sitemap-0.xml` declara
**429 URL**, las mismas del build, y las Citas nuevas responden 200.

## 15.3 (6.ª sesión) — Cuatro Citas, y el hallazgo vale más que las cuatro

**392 → 396 Citas**, el sitio de **429 a 433 páginas**, el Autor más representado del 29,1 % al
**28,8 %**. La cosecha más pobre de la noche, y por un motivo que había que descubrir midiendo.

**Los documentos pequeños y densos se han agotado.** Medidos ya siete géneros, la curva es clara:

| Género | Documento | Candidatas | Aprobadas | Rendimiento |
|---|---|---|---|---|
| Aforismos | *De la brevedad de la vida* | 196 | 40 | 20 % |
| Prosa filosófica | *Del sentimiento trágico* | 176 | 34 | 19 % |
| Poesía aforística | *Proverbios y cantares* | 171 | 30 | 17,5 % |
| Epístola erudita | *Respuesta a Sor Filotea* | 196 | 20 | 10 % |
| Narrativa | *Capítulos que se le olvidaron a Cervantes* | 141 | 3 | **2 %** |
| Parábola | *Motivos de Proteo* 018/020/022 | 52 | 1 | **2 %** |

**Y la extracción re-propone lo ya publicado, que resulta ser una función y no un fallo.** De las
141 candidatas de los *Capítulos*, dieciséis eran las dieciséis Citas que el Corpus ya publica de
ese Autor. La revisión las marca una a una —«⚠ Duplica a … (**publicadas**). Decide tú»— y les
pone sufijo al slug. La puerta está donde debe estar: en la revisión, no en la extracción, porque
un duplicado a veces es una variante que interesa y la máquina no puede decidirlo.

**El tramo necesita otra estrategia, y conviene decirlo antes de gastar seis sesiones más.**
Faltan 364 Citas de otros Autores y quedan tres caminos, ninguno igual a los de esta noche:

1. **El *Quijote*, por lotes.** 3.267 candidatas, género narrativo, rendimiento esperado ~2 %:
   unas 65 Citas por todo el libro. Mucho trabajo de revisión para poco.
2. **Los once documentos restantes del *Oráculo manual***. Rendimiento alto —es el género denso—
   pero son del Autor que **ya está por encima del techo**: sembrarlos empeora el tramo.
3. **Recuperar Fuentes nuevas** con `npx tsx tools/recuperar.ts <url>`. Es el único camino que
   sirve a **dos** tramos a la vez: cada Autor nuevo dilui y acerca el censo de 17 a 35.

El tercero es el que toca, y no lo decide el bucle: recuperar de una URL es traer material de
fuera al Corpus, y **a quién se admite es la única decisión que este producto no delega**. Queda
escrito aquí para que Héctor lo vea al leer la bitácora.

`npx astro check` 0 errores; `npx vitest run` **1910/1910** en 62 ficheros; `npm run build` 433
páginas; `npx playwright test` **394 pasadas**, 14 saltadas, 0 fallos.

**Verificado en vivo** (25/08/2026, ejecución 32787723500 en verde): `sitemap-0.xml` declara
**433 URL**, las mismas del build.

## 15.3 (7.ª sesión) — El censo de pendientes de cotejo, diagnosticado entero

Sin Citas nuevas: el tramo pide Autores que este bucle no admite, así que la sesión se dedicó a
la otra deuda que la 11.4 tiene encomendada — **vaciar el censo de pendientes de cotejo**— y a
averiguar por qué no se vacía.

**El censo pasa de 23 a 22**, y el build ya lo canta: «374 Citas cotejadas contra su documento;
22 pendientes de cotejo de un tope de 38».

**Clasificadas las 23 contra los 59 documentos versionados**, comparando con espacios colapsados
y luego sin acentos ni mayúsculas, salen tres clases y ninguna es «falta trabajo»:

| Clase | Cuántas | Qué significa |
|---|---|---|
| **Solo signos** | 4 | El texto está en un documento y difiere en mayúsculas o puntuación |
| **No aparece** | 19 | El texto no está en ningún documento versionado |

**La clase «solo signos» es casi toda verso, y ahí está el nudo.** Las ediciones son poesía con
mayúscula al principio de cada renglón, y el cotejo colapsa los saltos de línea: restituir el
literal dejaría «Yo soy un hombre sincero **D**e donde crece la palma», con una mayúscula en
mitad de la frase que un lector lee como errata. Es una **decisión de producto** —si el Corpus
publica el verso como verso o normalizado— y no la toma el bucle.

La excepción se cerró: «La paciencia todo lo alcanza» difería **solo en la mayúscula inicial**, y
el Corpus ya publica Citas que empiezan en minúscula cuando la edición lo manda («cada uno es
hijo de sus obras»). Restituida a «la paciencia todo lo alcanza.», y de paso `documentar` corrigió
la obra: declaraba *Poesías* y el documento declara *Nada te turbe*. Manda el documento.

**La clase «no aparece» tiene dentro un caso que da la razón a toda la Historia 11.2.** «Yo no
estudio para saber más, sino para ignorar menos» **no está en la *Respuesta a Sor Filotea***. Lo
que la edición dice es «Yo no estudio para escribir, ni menos para enseñar…, sino sólo por ver si
con estudiar ignoro menos». La Cita publicada es la condensación popular, no el texto de su
Autora. Es exactamente lo que el cotejo existe para encontrar — y es la misma frase que dos
sesiones atrás estuvo a punto de publicarse **por segunda vez** desde el documento.

Las cinco de la brevedad de la vida son otra cosa: **otra traducción**. El documento versionado
dice «Larga es la vida, si la sabemos aprovechar» y el Corpus publica «La vida, si sabes usarla,
es larga». Ninguna de las dos es falsa; simplemente no salieron de la misma edición.

**Lo que el censo necesita, en tres decisiones que son de Héctor:** cómo se publica el verso; qué
se hace con las Citas que ninguna edición versionada respalda; y si se recupera la edición de la
que salió cada traducción huérfana.

`npx astro check` 0 errores; `npx vitest run` **1910/1910** en 62 ficheros; `npm run build` 433
páginas y 22 pendientes de 38; `npx playwright test` **394 pasadas**, 14 saltadas, 0 fallos.

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

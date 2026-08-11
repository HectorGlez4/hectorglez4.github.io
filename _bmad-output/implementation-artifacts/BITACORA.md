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

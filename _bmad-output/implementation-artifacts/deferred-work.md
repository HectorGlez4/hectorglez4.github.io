# Trabajo diferido

Hallazgos reales que no son de la historia que los sacó a la luz. Append-only.

- source_spec: `_bmad-output/implementation-artifacts/spec-14-2-el-visitante-encuentra-como-sostener.md`
  summary: Que `dist/` sea idéntico al de la rama base no lo comprueba nada automáticamente.
  evidence: |-
    La prueba de reproducibilidad de `ingreso-construido.test.ts` compara dos construcciones
    del **mismo** árbol, que es determinismo y no invariancia. La afirmación de UX-DR35 que
    de verdad importa —que añadir la invitación apagada no cambia un solo byte del sitio— se
    verificó a mano en la 14.2 (worktree en la línea base y `diff -rq`: 669 ficheros
    idénticos) y nada la mantiene cierta. Es la comprobación que cazó el bloque `<style>`.

- source_spec: `_bmad-output/implementation-artifacts/spec-14-2-el-visitante-encuentra-como-sostener.md`
  summary: La invitación no pasa nunca por el barrido de accesibilidad, ni siquiera el día que se encienda.
  evidence: |-
    `tests/e2e/accesibilidad.spec.ts` corre contra el sitio del repositorio, donde las
    donaciones están apagadas y el bloque no existe; y el flujo de CI no ejecuta los e2e.
    Así que la zona de toque de `--zona-de-toque`, el contraste de `--tinta-apagada`, el
    anillo de foco y el aviso de pestaña nueva solo se comprueban en el único estado en que
    no hay nada que comprobar. El gancho `ficheros` hace factible un barrido con el Modelo
    encendido.

- source_spec: `_bmad-output/implementation-artifacts/spec-14-2-el-visitante-encuentra-como-sostener.md`
  summary: La guarda del dominio de la Historia 7.1 se relajó más de lo que exigía el falso positivo.
  evidence: |-
    Pasó de `/sabiduriadebolsillo/i` a comparar contra `DOMINIO` entero, así que un
    `sabiduriadebolsillo.com` escrito a mano, o la etiqueta suelta concatenada con su TLD,
    ya no la disparan. El cambio lo forzó el identificador de Ko-fi, que coincide con la
    etiqueta del dominio. Un revisor lo comprobó y hoy no cuesta nada real —el control
    positivo nuevo fija que `DOMINIO` está bien formado—, pero es una guarda de la Épica 7,
    que sigue abierta, y la decisión de estrecharla otra vez es de su dueño.

- source_spec: `_bmad-output/implementation-artifacts/spec-14-2-el-visitante-encuentra-como-sostener.md`
  summary: La prueba que enciende el Modelo parchea la fuente con una expresión regular sensible al formato.
  evidence: |-
    `/(id: 'donaciones',[\s\S]*?)encendido: false,/` depende del orden de los campos y de que
    nadie reformatee ese literal. Sus dos aserciones prueban que **algo** cambió y que queda
    exactamente un `encendido: true`, no que cambiara la entrada de donaciones. Vive solo en
    pruebas, así que su fallo sería ruidoso y no silencioso.

- source_spec: sesión de sembrado del 2026-08-22
  summary: El suelo del 40 % de tradición latinoamericana cuenta autores declarados, no autores con Citas publicadas.
  evidence: |-
    `src/lib/huecos.ts:182` hace `const total = autores.length`, así que el porcentaje incluye
    a quien no ha publicado nada. Con el Corpus de 195 Citas, la herramienta informaba 7/17 =
    41,2 % —por encima del suelo—, pero dos de esos siete, Amado Nervo y Ricardo Palma, no
    tenían ni una Cita. Medido sobre autores que el visitante puede ver: 5/15 = 33,3 %, por
    debajo del suelo comprometido. Choca con la Historia 1.3, «lo no publicado no existe para
    el build», que es el principio del que sale todo lo demás. Decidir si el suelo se mide
    sobre declarados o sobre publicados es de producto, no de implementación; medirlo sobre
    Citas en vez de sobre autores es una tercera lectura, y hoy daría 36,3 %.

- source_spec: sesión de sembrado del 2026-08-22
  summary: `tools/recuperar.ts` no retira las plantillas de mantenimiento de Wikisource, y su texto llega a proponerse como Cita.
  evidence: |-
    Al recuperar «Nuestra América» y el «Prólogo al Poema del Niágara», el documento versionado
    se quedó con el aviso de Wikisource sobre fuente no especificada, y `tools/extraer.ts`
    propuso como candidatas frases suyas —«A menos que se añada información de derechos de
    autor y/o la fuente de este texto…»— atribuidas a José Martí. Ninguna puerta lo caza: es
    español perfectamente legible, así que la de la 11.5 lo pasa, y está literal en el
    documento, así que el cotejo de la 11.2 lo daría por bueno. Se puede publicar un aviso
    legal de Wikisource firmado por un Autor. Aparte de retirar la plantilla, la presencia de
    ese aviso es señal editorial de que la transcripción no declara su edición de origen, que
    es más débil de lo que piden FR-23 y FR-24; esta sesión descartó las dos fuentes por eso.

- source_spec: sesión de sembrado del 2026-08-23
  summary: Ricardo Palma está declarado como Autor y su obra es del género equivocado para el producto.
  evidence: |-
    Tres Tradiciones recuperadas —«Un litigio original», «Justos y pecadores» y
    «Predestinación»— dieron 266 candidatas y **una** Cita publicable: «Los amigos se parecen
    a las navajas de barba: sale una buena entre diez». Un rendimiento del 0,4 % frente al
    30 % de Martí (28 de 92). Palma escribe anécdota histórica: lo que la extracción propone
    es heráldica, nombres propios y trozos de trama. No es un hueco de sembrado, es que el
    Autor no cabe en un producto de sentencias, y conviene decidirlo antes de gastar más
    sesiones. Queda abierto qué hacer con un Autor declarado que no da Citas: hoy infla el
    suelo de tradición sin aportar nada, que es el hallazgo hermano de esta lista.

- source_spec: sesión de sembrado del 2026-08-23
  summary: Ni la extracción ni el cotejo distinguen lo que un Autor escribe de lo que un Autor cita.
  evidence: |-
    En «Predestinación», Palma introduce una copla ajena —«dijo bien el que dijo: El amor y la
    naranja se parecen infinito…»— y la extracción la propuso como Cita suya. El cotejo de la
    11.2 la habría dado por buena, porque aparece literal en su documento, y la puerta de
    legibilidad tampoco la ve. Es la misma familia que la plantilla de Wikisource del día
    anterior: el documento es fiel, y aun así la atribución sería falsa. Cazarlo automáticamente
    es difícil —haría falta detectar entrecomillado y verbos de decir—, pero al menos debería
    quedar escrito en el procedimiento de sembrado que las citas dentro de la fuente no se
    publican.

- source_spec: sesión de sembrado del 2026-08-23 (Montalvo)
  summary: `tools/extraer.ts` no coteja el `--autor` que se le pasa contra el autor que el documento declara en su cabecera.
  evidence: |-
    `corpus/fuentes/wikisource-es--el-sable.txt` trae `|autor=Manuel González Prada` en la
    cabecera que escribió `recuperar`, y la orden aceptó sin rechistar
    `--autor juan-montalvo`, proponiendo 32 candidatas atribuidas al Autor equivocado. El
    error se cazó por fuera —el texto habla de Dreyfus y de Kuropatkin, y Montalvo murió en
    1889—, no por ninguna puerta. El cotejo de la 11.2 las habría dado por buenas, porque el
    texto está literal en el documento. A diferencia de los otros hallazgos de esta familia,
    **este el sistema lo puede cazar solo**: el dato ya está recuperado y versionado. Bastaría
    con que `extraer` compare el `--autor` con lo que declara la cabecera y se niegue, o pida
    confirmación, cuando no concuerden.

- source_spec: sesión de sembrado del 2026-08-23 (Montalvo)
  summary: El deduplicado de la extracción mira dentro del lote, no contra las Citas ya publicadas.
  evidence: |-
    De 141 candidatas de los «Capítulos», 7 eran textos **ya publicados** de Montalvo, y el
    informe dijo «Descartadas por repetidas: 0». La guarda de la retro de la Épica 9 —sembrar
    `ocupados` con los slugs presentes en `corpus/citas/`— sí actuó, pero lo que hace es
    **renombrar en silencio** a `-2`: impide sobrescribir, no publicar por segunda vez. Un
    editor que apruebe sin mirar el sufijo deja el sitio con la misma sentencia dos veces,
    en dos URLs que solo difieren en un dígito, y con el mismo Autor. El único síntoma es ese
    sufijo, y no aparece en ningún recuento del informe.

- source_spec: sesión de sembrado del 2026-08-23 (Rodó)
  summary: La extracción propone las entradas del índice de una obra como Citas.
  evidence: |-
    De los 22 documentos de «Motivos de Proteo» salieron candidatas como «VI - De cómo el
    tránsito violento suele ser necesario», «X - Actitud en la desilusión y el fracaso» o
    «XXII - La inscripción del Faro de Alejandría»: son títulos de capítulo del índice, no
    prosa del autor. Pasan todas las puertas —están literales en el documento, son español
    legible y las firma quien firma el documento— y solo las para el ojo de quien revisa.
    Tienen una forma bastante reconocible: numeral romano al principio, seguido de guion o
    punto. No es urgente, porque descartarlas es barato, pero ensucia cada lote y el coste se
    paga en cada sesión.

- source_spec: Meta de Corpus v4 — tramo de concentración (15.3)
  summary: La Meta no se puede cerrar sin admitir Autores nuevos, y esa decisión no la delega el producto.
  evidence: |-
    No es una preferencia de método: es la cuenta. Para que el Autor más representado baje del
    techo del 15 %, el Corpus tiene que llegar a **760 Citas** y ninguna puede ser suya: faltan
    **308**. Con el techo puesto, en un Corpus de 760 ningún Autor puede pasar de 114, así que
    el segundo —hoy en 62— puede aportar como mucho **52 más**. Las **256 restantes no pueden
    salir de ningún Autor ya admitido**: los documentos densos de los demás están exprimidos
    (medidos siete géneros, del 20 % de los aforismos al 2 % de la narrativa) y los once que
    quedan sin tocar son del Autor que sobra, así que sembrarlos empeora el tramo.
    El bucle recupera, extrae, coteja y publica en cuanto haya nombres o URL. Lo único que no
    hace es elegirlos.

- source_spec: censo de pendientes de cotejo (11.2) — diagnosticado en la 7.ª sesión del bucle v4
  summary: El censo no se vacía porque las ediciones son verso, y eso pide una decisión de producto.
  evidence: |-
    Clasificadas las 23 del censo contra los 59 documentos versionados: **4 difieren solo en
    signos** y **19 no aparecen en ningún documento**. Las 4 son casi todas verso, y ahí está
    el nudo: las ediciones traen mayúscula al principio de cada renglón y el cotejo colapsa los
    saltos, así que restituir el literal dejaría «Yo soy un hombre sincero **D**e donde crece la
    palma», con una mayúscula en mitad de la frase que un lector lee como errata. Hay que
    decidir si el Corpus publica el verso como verso o normalizado. La única que se pudo cerrar
    —«la paciencia todo lo alcanza»— difería solo en la mayúscula inicial, y hay precedente
    publicado de Citas que empiezan en minúscula («cada uno es hijo de sus obras»).

- source_spec: censo de pendientes de cotejo (11.2) — misma sesión
  summary: Diecinueve Citas publicadas no aparecen en ninguna edición versionada, y una es una condensación popular.
  evidence: |-
    «Yo no estudio para saber más, sino para ignorar menos» **no está en la Respuesta a Sor
    Filotea**. Lo que la edición dice es «Yo no estudio para escribir, ni menos para enseñar…,
    sino sólo por ver si con estudiar ignoro menos». La publicada es la condensación que
    circula, no el texto de su Autora. Otras cinco son de **otra traducción**: el documento dice
    «Larga es la vida, si la sabemos aprovechar» y el Corpus publica «La vida, si sabes usarla,
    es larga». Ninguna es falsa; simplemente no salieron de la edición que el Corpus versiona.
    Caben tres salidas y son de Héctor: recuperar la edición de la que salió cada una,
    restituir el texto contra una edición versionada, o retirarlas.

- source_spec: tools/tema.ts — añadido `asignar` en la 14.ª sesión del bucle v4
  summary: Hay orden para poner un Tema a una Cita publicada, pero no para quitárselo.
  evidence: |-
    `tema asignar` se construyó porque el tramo de anchura lo pedía quince veces. Su simétrica
    no existe: si un Tema se asigna por error a una Cita, hoy se corrige editando el
    frontmatter a mano, que es justo lo que `asignar` vino a evitar. No es urgente —`eliminar`
    borra el Tema entero y la asignación es idempotente y comprobada— pero la asimetría está.

- source_spec: RETIRADA — Historia 12.3 / UX-DR37, anotada en la 21.ª sesión y desmentida en la 33.ª
  summary: RETIRADA. Se afirmó que el criterio de una Colección no se enseña al visitante, y es falso: sí se enseña.
  evidence: |-
    **Esta entrada estaba mal y se deja escrita en vez de borrarse, porque el error importa más
    que el hallazgo.**

    Se afirmó que el criterio aparecía «dos veces en la cabecera y cero en el cuerpo». Comprobado
    de verdad: el criterio **está en `<main>`**, al pie, después de las Citas y de la paginación.
    Y no es un descuido sino el diseño escrito: el propio comentario de la página lo dice —«El
    criterio, al pie y por debajo de todo lo citado en jerarquía visual (UX-DR32)»—. La página
    hace exactamente lo que su historia manda.

    **Dos errores de método, y los dos míos.** Primero, leí el texto de la página con un límite de
    700 caracteres y vi solo la cabecera de la lista; el criterio está al final de un documento
    mucho más largo. Segundo, conté las apariciones con `grep -c`, salió **2**, y **supuse** que
    eran `meta description` y `og:description` sin comprobar cuáles: eran la cabecera y el cuerpo.

    Es doblemente incómodo porque esa misma sesión y la siguiente presumieron de lo contrario:
    «comprobar antes de llamarlo fallo», dos veces con el buscador. La disciplina se aplicó donde
    el fallo no existía y se saltó donde sí creí verlo. **Una comprobación que solo se hace cuando
    el resultado sorprende no es una comprobación.**

    Lo único que queda en pie, y es de producto y no de defecto: el criterio va **al pie**, así
    que quien llega de un buscador ve título y lista antes que la razón de la lista. Eso es una
    decisión tomada (UX-DR32), no un olvido, y cambiarla sería revisar la jerarquía visual de esa
    página, no arreglar nada.

- source_spec: Historia 13.3 — visto al componer la primera Pieza de Colección, 32.ª sesión del bucle v4
  summary: El orden de los miembros de una Colección es una decisión editorial que nadie ha tomado.
  evidence: |-
    `pieza coleccion` compone con las primeras Citas **en el orden declarado en el fichero**, y
    dice cuáles quedan fuera: de las 29 de «Cuatro mujeres» entraron **3**. Ese orden decide, por
    tanto, qué se publica en redes y qué no.

    Y en las dieciséis Colecciones curadas ese orden es **alfabético por slug**, porque `asignar`
    añade en el orden en que se le pasan los slugs y los lotes salieron de barridos ordenados. En
    «Cuatro mujeres» el azar salió bien —dos de Concepción Arenal y una de Rosalía, un trío que se
    sostiene— pero es azar: en otra Colección las tres primeras pueden ser las tres más flojas, o
    tres del mismo Autor.

    Faltan dos cosas, y son distintas. Una es de producto: decidir si el orden de una Colección
    significa algo —«las tres que van a la Pieza»— o no significa nada. La otra es de herramienta:
    hoy no hay forma de reordenar los miembros salvo editando el YAML a mano, que es justo lo que
    `asignar` vino a evitar.

- source_spec: FR-19 — contado en vivo en la 34.ª sesión del bucle v4
  summary: Solo las Páginas de Cita llevan og:image; la portada y los listados se comparten sin imagen.
  evidence: |-
    Contando `og:image` por superficie sobre el dominio: **Cita 1, Tema 0, Colección 0, Autor 0,
    portada 0**. Compartir cualquiera de ellas en WhatsApp, X o LinkedIn da un enlace pelado sin
    previsualización, y la que más duele es la portada: es lo que se comparte cuando se recomienda
    el sitio entero.
    La Cita la tiene porque la Historia 10.1 genera su Tarjeta en el build. Para las demás no hay
    imagen que apuntar: la Pieza de una Colección (13.3) se compone a demanda y `piezas/` está
    fuera del control de versiones a propósito (AD-15), así que no se sirve.
    Caben dos salidas: generar en el build una imagen por Tema, Colección y Autor —como ya se
    hace con las Tarjetas de Cita—, o poner una imagen de marca fija como respaldo, que hoy no
    existe: `public/` solo tiene el `favicon.svg`.

    **RESUELTA el 25/08 (53.ª sesión) por la primera salida, y conviene decir con qué regla.**
    De las dos, la segunda pide **inventar un activo de marca** que nadie ha diseñado; la primera
    no inventa nada: reutiliza la paleta, el filete y la marca que ya dibuja `svgDeTarjeta`, y
    toma el texto de lo que **cada página ya declara** en su `<meta>` —el criterio de la
    Colección, la semblanza del Autor, la descripción compuesta del Tema—. Esa es la opción
    conservadora y reversible que la regla del bucle manda tomar en una bifurcación así, y es
    reversible entera: tres ficheros de ruta y tres líneas en las plantillas.

    Hecho: `svgDeTarjetaDeListado` con seis pruebas en rojo primero, y tres rutas —
    `/tarjeta/tema/`, `/tarjeta/coleccion/`, `/tarjeta/autor/`— que salen de los mismos filtros
    de publicación que las páginas, para no generar una imagen que ninguna página enlace.
    Medido tras el build: **12 Temas, 16 Colecciones y 16 Autores**, los publicados exactos.

    **Lo que sigue sin imagen, y sigue siendo decisión de Héctor:** la portada, el buscador y el
    404. No tienen nombre ni bajada que dibujar —no son *una* cosa, son la entrada al sitio— y
    ahí sí hace falta decidir qué enseña el sitio cuando lo que se comparte es el sitio.

- source_spec: Historia 11.4 — destapado en la 35.ª sesión del bucle v4 al cuadrar el sitemap
  summary: Hay un Autor admitido desde la primera sesión de sembrado y nunca sembrado: cero Citas, cero documentos.
  evidence: |-
    Salió de una resta: **16 Páginas de Autor en el sitemap y 17 Autores en `corpus/autores/`**.
    El Autor entró en el commit «feat(11.4): primera sesión de sembrado, y los tapones que
    destapó», con su semblanza y su tradición declaradas, y **nunca se recuperó un documento
    suyo**: `corpus/fuentes/` no tiene ninguno. Es un tapón de aquella sesión que se quedó puesto.

    **El bucle no lo siembra, y conviene decir por qué no es pereza.** Recuperar una Fuente para
    un Autor **ya admitido** sí sería su trabajo —así entraron los 59 documentos—, y la orden lo
    permite: `recuperar` acepta Wikisource, que es la Fuente de casi todo el Corpus. Lo que no es
    del bucle es **elegir qué obra suya representa al Autor**, y aquí no hay atajo:

    · Su libro más citado existe en Wikisource, pero la página es un **índice de 99 enlaces y 495
      palabras**, no un texto: exactamente el caso que esta misma lista ya tiene anotado sobre los
      índices de obra. Recuperarla sembraría entradas de índice, no Citas.
    · Sembrarlo de verdad pide recuperar poemas **uno a uno** y decidir cuáles. Eso es construir
      el canon de un Autor desde cero, y es la decisión editorial que el producto no delega.

    Lo que hace falta de Héctor es una línea: **qué obras suyas entran**. Con las URL, el bucle
    recupera, extrae, coteja y publica sin más intervención. Mientras tanto el Autor no estorba
    —no tiene página, no está en el sitemap y ya no cuenta para la meta— pero está declarado y no
    dice nada.

- id: puerta-de-legibilidad-demasiado-laxa-con-el-ocr
  summary: >-
    CERRADO A MEDIAS en la 157.ª. La puntuación rota ya tiene puerta —punto intruso y espacio
    antes del signo, `tienePuntuacionRota`—; las palabras rotas siguen pasando y siguen
    esperando el léxico.
  evidence: |-
    **157.ª — lo que se cerró y lo que no.**

    Las dos objeciones de abajo son ciertas de una heurística **elegida a ojo**, así que no se
    eligió a ojo: se midieron seis señales contra las 1632 Citas publicadas, que son el patrón
    de lo que no debe morderse, y sólo ascendió la que no muerde ninguna.

    | señal | publicadas | candidatas | |
    |---|---|---|---|
    | punto intruso, ≥4 letras delante | **0** | 10 | entra |
    | espacio antes de coma, punto y coma o punto | **0** | 5 | entra |
    | **cuatro consonantes seguidas** | **24** | 308 | **fuera** |
    | mayúscula dentro de palabra | 0 | 0 | fuera: no encuentra nada |
    | palabra sin vocales | 0 | 4 | fuera: dos de las cuatro sin explicar |

    Las cuatro consonantes son **el aviso de abajo convertido en cifra**: «construido» lleva
    «nstr». El miedo era correcto, y ahora tiene número.

    **Sigue abierto**: «indivicluo», «porpue», «laspocas» y «manifilesto» pasan igual. Son
    palabras bien puntuadas y mal escritas, y para ésas hace falta el léxico. Lo que sigue
    esperando de Héctor es lo mismo que decía el apunte original: si se acepta versionar un
    diccionario del castellano y convivir con sus falsos positivos en Gracián y Quevedo.

    ---

    **Apunte original:**

    Medido sembrando «La instrucción del obrero»: `extraer` informó de **«Descartadas por
    ilegibles (OCR roto): 1»** y entre las 31 candidatas que sí escribió venían al menos cinco
    con la palabra partida o fundida:

    · `laspocas` — dos palabras fundidas («las pocas»)
    · `manifilesto` — letra intrusa («manifiesto»)
    · `indivicluo` — «cl» por «d» («individuo»), el error de OCR más típico que hay
    · `porpue` — «p» por «q» («porque»)
    · `piensenlo` — fusión con el pronombre
    · `De que el pueblo no tenga bastantes. ideas` — punto intruso a mitad de frase

    **Ninguna se publicó**, porque esta sesión leyó las 31 una por una. Ese es justo el problema:
    la puerta existe para el día que nadie lea. El Corpus tiene 59 documentos y los que vengan de
    ediciones escaneadas traerán más de esto.

    **Lo que no se hace aquí, y por qué.** El arreglo obvio —un léxico del español -- es una
    decisión de producto con coste real: hay que elegir el diccionario, versionarlo y aceptar que
    marcará como rotas palabras de 1650 que son correctas (el Corpus tiene a Gracián y a Quevedo).
    Una heurística sin diccionario tiene el fallo contrario y peor: descartaría Citas buenas en
    silencio. Ante esa bifurcación la regla del bucle manda la opción reversible, que es medir y
    anotar en vez de apretar una puerta a ojo.

    Con los seis ejemplos de arriba el arreglo se puede diseñar y probar en rojo primero.

- id: la-retirada-exige-motivo-y-no-lo-guarda
  summary: `documentar --retirar` valida el motivo, lo imprime y lo tira; la Cita retirada queda en revisión indistinguible de una candidata nueva.
  evidence: |-
    Comprobado en `tools/lib/*` — `retirarCita(rutas, slug, motivo)` rechaza el motivo vacío
    con «Una retirada sin motivo no es una retirada: es una desaparición», y después **no lo
    escribe en ninguna parte**: mueve la Cita a `corpus/_revision/` con su frontmatter intacto
    y el motivo solo sale por pantalla.

    El resultado se ve hoy en el Corpus. Las **16 Citas retiradas el 25/08** están en la cola de
    revisión, con su texto, su Autor, sus Temas y su `fuente`, exactamente igual que una
    candidata recién extraída. Nada en el disco dice que **no deben aprobarse nunca**: el
    documento del que salieron ya no está en `corpus/fuentes/`, porque su página no declara
    Autor en ninguna forma legible.

    Las 16, todas de la misma obra («El intelectual y el obrero»):
    casi-todos-los-revolucionarios · casi-todos-vivimos-girando · el-descredito-de-una-revolucion ·
    el-mayor-inconveniente-de-los-pensadores · la-justicia-consiste-en-dar · la-justicia-nace-de-la-sabiduria ·
    la-resignacion-y-el-sacrificio · las-revoluciones-vienen-de-arriba · los-intelectuales-sirven-de-luz ·
    nos-parecemos-a-los-marineros · pero-modificarse-con-los-acontecimientos · que-idea-no-se-degrada ·
    que-reformador-no-se-desprestigia · si-el-hombre-pudiera-convertirse · solo-hay-un-trabajo-ciego ·
    toda-revolucion-arribada

    **Por qué no se arregla sobre la marcha.** No se borran: borrarlas deshace justo lo que AD-2
    quiere al mandar que retirar sea mover. Y guardar el motivo en el fichero obliga a decidir
    antes si una Cita retirada **es una candidata más** —y entonces el motivo es una nota que
    `revisar` debe enseñar y la aprobación debe respetar— o **es otra clase de cosa**, con su
    sitio propio fuera de la cola. Eso es una decisión de producto, no un ajuste, y la regla del
    bucle manda anotar en vez de elegir por su cuenta.

    Lo que hace falta de Héctor es una línea: **¿retirada = candidata con nota, o estado propio?**
    Con eso el arreglo se escribe con prueba en rojo primero.

- source_spec: NFR-5 contra UX-DR18 — medido en la 56.ª sesión del bucle v4
  summary: Doce Páginas de Cita no se alcanzan en tres saltos desde la portada, y arreglarlo obliga a doblar una de dos reglas declaradas.
  evidence: |-
    `tests/e2e/seo.spec.ts` lo dice desde hace sesiones y yo no lo veía: **doce Páginas de Cita
    quedan a más de `MAX_SALTOS_DESDE_LA_PORTADA` (3)**. Son la cola de los dos Autores con más
    Citas. La aritmética, medida:

    · El paginador enlaza **solo a la anterior y la siguiente**, y así lo declara **UX-DR18**
      —«Anterior y Siguiente numeradas»— en la cabecera de `src/components/Paginacion.astro`.
    · `CITAS_POR_PAGINA` son 50, así que un Autor con 113 Citas tiene **tres** páginas.
    · portada → `/autor/{slug}` (1) → `/autor/{slug}/2` (2) → `/autor/{slug}/3` (3) →
      **la Cita (4)**. Fuera del límite.

    No es una prueba caduca ni un fallo del código: **las dos reglas del producto se han vuelto
    incompatibles al crecer el Corpus**. Con 456 Citas ningún listado pasaba de dos páginas y las
    dos convivían; con 761 ya no.

    **Las dos salidas, y por qué ninguna la toma el bucle:**

    · **Enlaces numerados en el paginador** («1 2 3»). Deja la tercera página a 2 saltos y sus
      Citas a 3. Arregla NFR-5 sin tocar ningún umbral, pero **contradice UX-DR18**, que es una
      decisión de diseño escrita y no un detalle de implementación.
    · **Subir `CITAS_POR_PAGINA`** hasta que ningún listado pase de dos páginas —hoy harían falta
      ~120—. No toca UX-DR18, pero es **mover un umbral para que algo pase**, que es exactamente
      lo que la regla dura del bucle prohíbe, y además alarga las páginas de listado, que es una
      decisión de lectura.

    **Vuelto a medir el 26/08 (74.ª sesión), con el Corpus en 1000 Citas: eran doce otra vez.**
    Lo que la 57.ª predijo —«volverá a pasar cada vez que el Corpus crezca»— pasó: los listados
    ordenan por slug, los dos Autores mayores llegaron a tres páginas y su cola alfabética volvió
    a caer fuera. Se acotaron **de doce a seis** por el mismo camino que entonces, que no dobla
    ninguna regla: seis Citas entraron en Colecciones cuyo criterio cumplen —«la instrucción del
    pueblo como condición de su libertad» se llevó tres, «obrar como quien se es» dos, «el acierto
    tiene hora» una—, y la portada enlaza las dieciséis Colecciones, así que un miembro está a dos
    saltos.

    **Las seis que quedan no encajan en ningún criterio**, y se dice cuál es la tentación que se
    rechaza: una de ellas habla de la multitud, y hay una Colección sobre la multitud —pero dice lo
    contrario que el criterio, y meterla ahí sería hacerle decir a la Colección algo que no dice.
    Otra defiende la igualdad de las mujeres, y hay una Colección de mujeres —pero es de mujeres
    **autoras**, no de textos sobre ellas. Forzar cualquiera de las dos sería la misma falta que
    inventar una Colección de relleno.

    **Y el remedio por Colecciones se agota.** Ha servido dos veces y cada vez cubre menos: las
    Citas que quedan fuera son, por construcción, las que ningún criterio editorial reunió. La
    decisión de una línea sigue haciendo falta, y ahora con más urgencia, porque el número crece
    con el Corpus.

    **Acotado antes, el 25/08 (57.ª sesión): de doce Citas inalcanzables quedaban cuatro.** Seis entraron
    en Colecciones cuyo criterio cumplen —la portada enlaza las dieciséis, así que un miembro está
    a dos saltos— y eso no dobla ninguna regla. Las cuatro que quedan no encajan en ningún
    criterio, y forzarlas sería la misma falta que inventar una Colección de relleno.

    La causa de fondo queda medida: los listados ordenan por slug, así que **la cola alfabética
    cae siempre en la última página**. Volverá a pasar cada vez que el Corpus crezca.

    Lo que hace falta de Héctor es una línea: **¿el paginador puede enseñar los números de página,
    o las páginas de listado admiten más Citas?** Con cualquiera de las dos, el arreglo es de una
    sesión y con prueba en rojo primero — la prueba ya existe y ya está en rojo.

    **RESUELTO el 26/08 (93.ª sesión), y conviene decir por quién.** Esta entrada llevaba treinta y
    cinco sesiones esperando una línea de Héctor, y en ese tiempo el número no se quedó quieto:
    **3 → 12 → 6 → 30**. El salto a treinta llegó cuando los Autores mayores pasaron de 150 Citas y
    apareció la **página 4**, que mete la cola a cinco saltos en vez de a cuatro.

    Una decisión que empeora sola mientras espera deja de ser una decisión aplazable, así que se
    tomó aquí, por la regla del bucle que manda elegir **lo más conservador y reversible** ante una
    bifurcación que no es puramente técnica. De las dos opciones que esta misma entrada planteaba:

    · subir `CITAS_POR_PAGINA` es **mover un umbral para que algo pase** — prohibido, y además
      decide por el lector cuánto listado se traga de una vez;
    · enseñar los números **contradice UX-DR18**, que es una decisión escrita, pero no toca ningún
      umbral y **se revierte borrando un bloque** de `src/components/Paginacion.astro`.

    Se tomó la segunda, **añadiendo y no sustituyendo**: el «Página N de M» que UX-DR18 nombra
    sigue donde estaba y los números van al lado, para que lo contradicho sea lo mínimo —«solo
    anterior y siguiente»— y no la forma del control. Cuatro pruebas primero en rojo en
    `tests/unit/paginacion.test.ts`, y el porqué escrito en el propio componente, no solo aquí.

    **Medido después, sobre `dist/`: de 1210 páginas, 0 Páginas de Cita fuera de los tres saltos**
    —las tres que el recuento señala son `/404`, `/kit` y `/lote`, que no son páginas del Corpus—.
    Y el arreglo no caduca: los números dejan cualquier página del listado **a un salto de la
    primera**, así que la profundidad ya no crece con el Corpus, que es lo que hacía volver esto
    cada vez. Lo que la 57.ª predijo —«volverá a pasar cada vez que el Corpus crezca»— deja de
    aplicar por construcción, no por haber acertado con un número.

    **Lo que sigue siendo de Héctor: revertirlo.** Si UX-DR18 vale más que la comodidad de llegar,
    se borra el bloque `.numeros` y el `<ol>` del componente y todo vuelve exactamente a como
    estaba —y entonces esta entrada se reabre con el remedio por Colecciones ya declarado agotado.


- source_spec: barrido de verificación de la 158.ª sesión del bucle v4
  summary: >-
    Nueve de los veintidós apuntes describían un mundo que ya no existe, y uno estaba
    contestado a propósito en el código. Este fichero es append-only y nadie había verificado
    nunca qué seguía siendo cierto.
  evidence: |-
    **El problema no era que faltasen arreglos: era que el índice mentía.** Es el mismo fallo
    que `sprint-status.yaml` diciendo `backlog` durante doce sesiones mientras la historia
    avanzaba de 16 a 34 Autores. Un apunte que ya no es cierto no es inofensivo: gasta la
    sesión que lo lee y le quita credibilidad a los que sí lo son.

    Comprobados uno a uno contra el código de hoy:

    | apunte | comprobación | estado |
    |---|---|---|
    | `extraer` no coteja el `--autor` con la cabecera | la orden imprime «Autor cotejado: el documento declara X y el Corpus, Y» | **cerrado** |
    | hay orden para poner un Tema y no para quitarlo | `tools/tema.ts quitar` existe | **cerrado** |
    | un Autor admitido y nunca sembrado, cero Citas | los 35 Autores declarados publican | **cerrado** |
    | el deduplicado mira dentro del lote, no lo publicado | `extraer` informa «Ya eran Cita publicada» | **cerrado** |
    | el índice de una obra se propone como Cita | lo caza `esAparatoDeLaFuente` | **cerrado** |
    | doce Páginas de Cita a más de tres saltos | el paginador enseña los números; `seo.spec.ts` en verde | **cerrado** |
    | la Meta no se cierra sin admitir Autores nuevos | Héctor lo delegó; 35 de 35 puestos | **cerrado** |
    | Ricardo Palma, género equivocado | sigue declarado y con **una** Cita | **abierto**, y es el caso de la firma que no rinde |
    | ni la extracción ni el cotejo distinguen lo que un Autor cita | `esTrozoDeCitaAjena` caza la comilla sin pareja | **cerrado a medias** |
    | la plantilla de mantenimiento de Wikisource llega a candidata | está en `APARATO_DE_LA_FUENTE` | **cerrado** |

    ## Y uno que NO era una pregunta abierta

    El apunte «el suelo del 40 % cuenta autores declarados, no autores con Citas publicadas»
    dice que decidirlo «es de producto». **Ya estaba decidido, y en el sentido contrario al que
    yo iba a implementar.** `src/lib/meta.ts` lo escribe donde toca:

    > «`huecos.tradicion.total` sigue contándolos a todos y **está bien que así sea**: el suelo
    > del 40 % mide *a quién se ha admitido*, que es un compromiso tomado en el momento del
    > alta, no a quién se ha sembrado. Son dos censos distintos y hay una prueba que lo fija.»

    Y la prueba existe —`tests/unit/meta-de-corpus.test.ts`, «y el equilibrio de tradición sigue
    contándolos a todos, que es otra pregunta»— con su propio aviso dentro: «por eso este caso
    está escrito: para que quien toque uno vea que el otro no le sigue».

    Yo iba a cambiarlo, y con argumentos que parecían buenos: la Historia 1.3 —«lo no publicado
    no existe para el build»—, la coherencia con `meta.ts`, y una medida a favor —**51,4 % de
    las dos formas hoy**, o sea un no-op verificable, que es el momento más seguro para tocar
    algo—. Lo único que lo paró fue ir a **citar** el comentario antes de contradecirlo.

    La lección, y va también al protocolo: **una medida que dice «es inofensivo» no dice nada
    sobre si es correcto**. Antes de cambiar una conducta se lee el comentario que la explica,
    porque el proyecto lleva razones escritas en los dos sitios y ninguna medida las sustituye.

    ## Lo que queda abierto de verdad

    Cuatro del `spec-14-2`, que es la historia que sigue en `review`; el orden de los miembros de
    una Colección; el `og:image` fuera de las Páginas de Cita; y los tres que esperan una línea
    de Héctor: **el verso**, **retirada = candidata con nota o estado propio**, y **si se acepta
    versionar un léxico del castellano**.


## Deferred from: code review of spec-11-5-el-documento-ilegible-no-siembra (2026-08-28)

- `PUNTO_INTRUSO` exige espacio tras el punto, así que se le escapa «leerlo.hay», que es un
  defecto de escaneo corriente. Aflojar a `\s*` cazaría también `Excmo.señor`, así que pide su
  propia medición contra las Citas publicadas antes de tocarlo.
- `tools/recuperar.ts` recorta el nombre del documento a 60 caracteres. Dos obras largas
  distintas pueden dar el mismo nombre, y entonces la puerta nueva niega una obra **nueva**
  diciendo que ya se retiró. Comparar la `obra` de la cabecera del retirado lo resolvería.
- En `tools/recuperar.ts`, `yaVersionado` se comprueba antes que `yaRetirado`: si el mismo
  documento está en las dos carpetas, se reutiliza como «Ya versionado» y la retirada nunca se
  nombra.
- Quedan **351 candidatas versionadas** con las comillas descompensadas en `corpus/_revision/`.
  La puerta impide publicarlas, pero nada las trabaja: ni informe, ni purga, ni cola aparte.
- El flujo de CI corre `build`, `astro check` y `vitest`, pero **no** el E2E. La garantía nueva
  de que toda página del sitemap declara imagen sólo se comprueba cuando alguien corre Playwright
  en local.
- Las señales contables de la 11.5 viven ahora en dos módulos: las seis de `src/lib/legibilidad.ts`
  y la de puntuación en `tools/lib/extraccion.ts`. La cabecera de `legibilidad.ts` sigue diciendo
  «para eso están las seis señales», y `medirLegibilidad` no puede informar de la séptima.

## Deferred from: code review of la barra final y la marca del sitio (2026-08-31)

- `svgDelIcono()` vive en `src/lib/marca.ts`, y todos los demás compositores de SVG que el
  build rasteriza —`tarjeta.ts`, `pieza.ts`— son hermanos de `lienzo.ts` y consumen su paleta.
  Un `src/lib/icono.ts` encajaría con la forma establecida y quitaría de `marca.ts` —que
  importa el armazón de toda página— la dependencia de la paleta del ráster. Es refactor de
  colocación, no defecto: no cuesta nada en ejecución, porque el sitio es estático.
- No hay manifiesto web ni `/favicon.ico`. Android al «añadir a la pantalla de inicio» se queda
  sin icono, y algún rastreador antiguo pide `/favicon.ico` antes que nada. El caso que abrió
  el trabajo —el icono del resultado de Google— lo cubre `/icono/48.png`, así que esto es
  ensanchar el alcance, no cerrarlo.
- `theme-color` mete un segundo declarante del color de fondo: `PALETA.papel` en
  `src/lib/lienzo.ts` y `--papel` en `src/styles/tokens.css` escriben `#faf7f0` cada uno por su
  cuenta, y ninguno falla si el otro cambia. La duplicación es anterior a este cambio —la
  paleta del ráster ya existía—; lo que hace `theme-color` es añadirle un consumidor más.

- source_spec: none
  summary: Una prueba que verifique la INVARIANCIA del dist/ con el Modelo apagado, no solo su determinismo.
  evidence: |-
    Separado del barrido de accesibilidad con el Modelo encendido en la sesión del
    2026-09-02, por el control de alcance de bmad-build: son dos entregables
    independientes. Se eligió el barrido primero porque encender las donaciones es
    inminente —los cuatro LC quedaron verificados ese día— y el barrido es la guarda del
    estado al que se entra; la invariancia protege el estado del que se sale. Sigue
    valiendo, y no poco: los otros tres Modelos —afiliación, producto propio y publicidad—
    siguen apagados y heredan la misma promesa de UX-DR35. El hallazgo original, con su
    evidencia, está más arriba en este mismo fichero (source_spec: spec-14-2).

- source_spec: `_bmad-output/implementation-artifacts/spec-barrido-de-accesibilidad-con-el-modelo-encendido.md`
  summary: Dos punteros a «DESPLIEGUE.md §3» para el requisito manual del encendido, que vive en §4.
  evidence: |-
    `tests/unit/ingreso.test.ts:227` y `tools/lib/ingresos.ts:99` mandan a §3, que es la
    medición; el requisito de encendido es §4. Preexistente —ninguno de los dos lo tocó
    esta sesión—, y sale a la luz porque §4 acaba de ganar un segundo requisito. Quien siga
    el puntero lee el apartado del receptor y no encuentra lo que busca.

- source_spec: `_bmad-output/implementation-artifacts/spec-barrido-de-accesibilidad-con-el-modelo-encendido.md`
  summary: Dos ficheros e2e lanzan un `astro build` cada uno y `fullyParallel` no los serializa.
  evidence: |-
    `tests/e2e/ingreso-accesible.spec.ts` y `tests/e2e/receptor.spec.ts` construyen ambos un
    proyecto temporal. `playwright.config.ts` declara `fullyParallel: true` sin fijar
    `workers`, así que pueden coincidir compartiendo `node_modules`. `vitest.config.ts`
    desactiva `fileParallelism` exactamente por ese motivo, y ahí está el precedente. Hoy no
    ha fallado —la tirada de comprobación salió en verde—, así que es riesgo medido y no
    avería: conviene decidirlo con una medida, no de oído.

- source_spec: `_bmad-output/implementation-artifacts/spec-18-3-el-registro-de-lo-que-se-pidio.md`
  summary: La serie de indexación guarda recuentos y no qué URL inspeccionó, así que la atribución que la 18.3 promete no es computable.
  evidence: |-
    `LecturaDeFamilia` es publicadas/muestra/indexadas/noIndexadas/estados. No queda rastro
    de QUÉ URL se inspeccionaron. Con muestreo —que desde la 16.1 es el único modo posible,
    porque el techo es el reloj y no la cuota— la pregunta que la Épica 18 existe para
    contestar, «¿entró esta URL porque la pedí o porque le tocaba?», no tiene respuesta en
    disco: la muestra puede no incluir ninguna de las pedidas, y nada lo dice.
    El informe de la 18.3 se corrigió para no fingir que sí. El arreglo de fondo es de la
    16.1 —que la entrada de la serie anote las rutas muestreadas, o al menos las indexadas
    de la muestra—, y tiene coste: hoy la entrada es un recuento por familia y pasaría a
    llevar del orden de decenas de rutas por jornada, en un fichero versionado que crece a
    diario. Decidir si eso vale el tamaño es de producto.

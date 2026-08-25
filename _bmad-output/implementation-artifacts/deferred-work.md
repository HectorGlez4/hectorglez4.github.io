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

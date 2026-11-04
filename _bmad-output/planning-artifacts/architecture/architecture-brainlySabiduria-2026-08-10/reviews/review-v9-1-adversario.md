---
type: architecture-review
lens: adversarial
target: ARCHITECTURE-SPINE.md (v9.1: AD-32…AD-35 y las enmiendas v9.1 de AD-1, AD-20, AD-23, AD-25, AD-27, AD-30)
date: 2026-11-04
reviewer: agente (lectura sola; no edita la espina)
---

# Revisión adversaria de la v9.1 — la Cita atribuida, el Personaje, la Variante y la retirada

**Veredicto:** la v9.1 no está lista para construirse. Una historia puede cumplir todos los AD
y aun así abrir la vía que AD-32 dice cerrar: blanquear como atribuida una candidata de dominio
público que no pasó el cotejo. Además, «derechos vigentes» no tiene dueño ni fecha, y la Obra de
un Personaje cambia de URL o se multiplica. Hay cuatro agujeros críticos y seis altos. Para cada
uno propongo la regla que lo cierra.

Método: para cada caso doy dos historias (A y B) que cumplen la letra de la espina, la de hoy y
la v9.1, y que construyen cosas incompatibles, o un camino que esquiva una puerta. Lo he
contrastado con el código de hoy: `src/content.config.ts` (`autor: reference('autores')`
obligatorio, `añoFallecimiento` obligatorio, `estadoDerechos` restringido a dominio público),
`integraciones/historial.ts` (con una copia superficial **no declara fechas y avisa**, no
rompe), `tools/lib/cambios.ts` (`CAMPOS_QUE_PINTA` / `CAMPOS_QUE_NO_FECHAN`, listas explícitas),
`tools/lib/autoria.ts` (`autorPorPrefijo` solo recorre `corpus/autores/`) y AGENTS.md
(`corpus/_revision/` **no se versiona**).

---

## Críticos

### C1. La puerta «una atribuida no casa con una candidata ni con una retirada» lee un directorio que no se versiona, y el blanqueo pasa por el propio fichero

- **Historia A**, la siembra de la atribuida (FR-68), sigue a AD-32: el build rompe si una
  atribuida casa por FR-14 con una candidata de `corpus/_revision/`.
- **Historia B** es la de siempre: `revisar --aprobar` sobre una candidata de `_revision/`.
- **El camino.** Una candidata de Quevedo, Cervantes o Palma falla el cotejo y se queda en
  `_revision/`. A mano o con un agente, se le añade `personaje: sancho-panza` y
  `clase: atribuida`, y se aprueba. La candidata con la que tendría que «casar» es **ella
  misma**: al aprobarla, ha salido de `_revision/`. Su primer commit en `corpus/citas/` ya dice
  `atribuida`, así que el historial no ve ningún cambio de clase (C4). Y la Personaje-con-Autor
  de dominio público es justo el caso que FR-65 admite («una Cita de Sancho en el Quijote
  también lo es»).
- **Divergencia de reproducibilidad.** `_revision/` no se versiona (decisión del 2026-10-16), y
  en CI está vacío. El mismo commit **rompe en local**, con las candidatas regeneradas, y
  **pasa en CI**. Que `dist/` dependa de ficheros sin versionar contradice AD-2, AD-10 y el
  paradigma.
- **Regla propuesta:**
  1. Ninguna puerta del build lee `corpus/_revision/`.
  2. El cruce entre clases de FR-14 se hace contra un registro **versionado y que solo añade**
     de las formas canónicas de toda candidata de la clase de siempre que se rechaza o falla el
     cotejo, y de toda Cita retirada (`corpus/formas-vedadas-a-atribuida.yml`). Lo escribe la
     misma orden que rechaza o retira.
  3. **La exención del cotejo vale solo cuando el dueño de la Obra tiene derechos vigentes o no
     hay Autor.** Una atribuida con Autor de dominio público (Sancho con Cervantes) tiene que
     localizarse en un documento de ese Autor si declara Obra, o el build rompe. Así, lo único
     que la clase blanda deja publicar sin cotejo es lo que de verdad no se puede cotejar.
  4. El build compara además cada atribuida con **las publicadas de la clase de siempre**. Hoy
     AD-32 solo nombra candidatas y retiradas.

### C2. «Derechos vigentes» no es un hecho con dueño: depende del calendario y de la jurisdicción, y contradice AD-1

- **Historia A**, la de la Cita atribuida de un Autor vivo, hace opcional `añoFallecimiento` en
  el esquema del Autor y añade un `estadoDerechos` nuevo en la Cita. Lo hace porque el PRD lo
  pide: «Su Estado de Derechos es propio».
- **Historia B** cumple la regla de AD-1, que la v9.1 no enmienda: `añoFallecimiento`
  obligatorio y `estadoDerechos` solo `dominio-público`. La «puerta por clase» de AD-1 se
  enmendó en la Cita, no en el Autor, que no tiene clase.
- **Divergencia.** A rompe el esquema de B. La Tarjeta de Autor, la Referencia (AD-28), las
  épocas y el Directorio dan por hecho los años.
- **Segunda divergencia.** AD-20 v9.1 dice que `obras.ts` **deriva** si una Obra tiene derechos
  vigentes «de su dueño». Una historia lo calcula como `añoFallecimiento + 70` contra el año del
  build. Otra usa 80, el plazo español de quien murió antes de 1987. Una tercera usa 100, el de
  México. En un sitio panhispánico, ¿qué ley rige? Las tres «derivan del dueño».
- **Tercera, la del calendario.** El 1 de enero, sin ningún commit, una Obra pasa a dominio
  público. Entonces:
  - la «venta sola» de FR-70 desaparece (AD-20: sin edición cotejada, la venta se oculta);
  - el incipit pasa a estar permitido (AD-30);
  - el `lastmod` y el aviso no se enteran (AD-27);
  - dos construcciones del mismo commit dan dos sitios, que es justo lo que impiden AD-12 y
    AD-16.
- **Cuarta, una corrección del año.** Si se corrige `añoFallecimiento` de un Autor (de 1960 a
  1930), sus atribuidas pasan a tener un dueño de dominio público. Si se corrige al revés, sus
  Citas de siempre pasan a tener un dueño protegido. Ninguna puerta lo mira.
- **Regla propuesta:**
  1. Un solo dueño, `derechosVigentes(dueño, AÑO_DE_DERECHOS)` en `src/lib/`.
  2. `AÑO_DE_DERECHOS` es una constante de `umbrales.ts` que Héctor mueve con un commit, como la
     congelación. Nunca es la fecha del build.
  3. El plazo y la jurisdicción son constantes con nombre. Que sean de Héctor es su
     `[ASSUMPTION]`.
  4. El esquema del Autor es una unión discriminada: o `añoFallecimiento` con el dominio público
     calculado, o `vivo: true`. Un Autor `vivo` solo puede tener Citas atribuidas, y lo juzga el
     build sobre el Corpus entero.
  5. `estadoDerechos` de la Cita deja de ser un campo independiente. O lo determina `clase` en
     la unión del esquema, o se retira. Dos campos que codifican la clase son dos dueños.
  6. El commit que mueve `AÑO_DE_DERECHOS` entra en la relación de AD-27, como `umbrales.ts`, y
     fecha las Obras cuyo estado cambia.

### C3. La Obra de un Personaje se multiplica por personaje y cambia de URL cuando se sabe el Autor

AD-33 dice: «Si la Cita trae Autor, el dueño es el Autor; si solo trae Personaje, el Personaje».
El dueño se decide **por Cita**, y la identidad de la Obra es (dueño, forma).

- **Pareja 1.** Una Cita de Batman y otra del Joker, de *El caballero de la noche*, sin Autor.
  La historia de alta crea `corpus/obras/batman--el-caballero-de-la-noche.yml` y
  `corpus/obras/joker--el-caballero-de-la-noche.yml`. Son dos Páginas de Obra y dos URL para la
  misma película, lo que AD-33 dice impedir.
- **Pareja 2.** Más tarde llega una Cita de la misma película con Autor (Christopher Nolan, o el
  guionista). Su dueño es el Autor, así que nace una tercera Obra. Si alguien añade `autor` a las
  Citas viejas, su Obra pasa a resolverse a otra identidad. El nombre de la ficha (prefijo
  `batman--`) ya no coincide con su dueño, y el build rompe («prefijo no es su autor»). La otra
  salida es crear otra ficha, y la URL se mueve. Las dos contradicen AD-4 y AD-25 («no se
  recalcula nunca»).
- **Regla propuesta:**
  1. **El dueño es de la ficha, no de la Cita.** Se fija al crearla y no cambia.
  2. La ficha declara `dueño` (un Autor o un Personaje) y, opcionales e informativos, `autor` y
     `personajes`. Ninguno de los dos interviene en el nombre.
  3. Una Cita se resuelve por su forma canónica entre las fichas cuyo dueño es su Autor, o, si
     no tiene Autor, entre las que la listan por alguno de sus Personajes.
  4. El build rompe si dos fichas sin Autor reclaman la misma forma canónica, o si una Cita
     casa con dos fichas.
  5. Saber el Autor de una Obra de Personaje es escribir `autor` en la ficha con una orden. Ni
     se reasigna el dueño ni se mueve la URL.

### C4. La inmutabilidad de la clase por el historial de git falla en tres sitios

AD-32: «El build lee el historial de cada fichero de Cita (el mismo de
`integraciones/historial.ts`) y rompe si su `clase` cambió».

- **Copia superficial y copias de prueba.** `historial.ts`, con una copia superficial, **no
  declara fechas y avisa**, no rompe. Es su diseño, porque el `lastmod` puede degradarse sin
  mentir. Una historia que reutiliza ese lector hereda la degradación: en una copia superficial
  la puerta **pasa en silencio**. Las pruebas unitarias construyen copias del Corpus
  (`construirConCorpus`) sin historial útil, así que la puerta o rompe todas las pruebas o se
  salta. Las dos son incompatibles con una puerta.
- **Baja y alta con el mismo slug.** Retirar mueve el fichero a `_revision/` (un borrado). Darlo
  de alta de nuevo con **el mismo slug** y la otra clase es una alta, no un cambio. AD-32 dice
  «con otro slug», pero nada lo impone.
- **El primer commit es la publicación.** Lo que pasa en `_revision/`, sin versionar, es
  invisible (C1).
- **Regla propuesta:**
  1. La clase es **estructural**, al modo de AD-2: o un directorio por clase, o un campo cuya
     única escritura es la orden de alta.
  2. Un registro versionado de slugs publicados alguna vez, con su clase, que solo añade
     (`corpus/slugs-publicados.yml`, o derivado del historial **solo en CI**). Ningún slug se
     publica con otra clase que la que tuvo.
  3. **La puerta rompe en CI si la copia es superficial.** No se degrada a aviso como la fecha.
     En local y en las copias de prueba se omite y se dice.
  4. El historial se lee **por slug a través de los borrados**, no por ruta viva.

---

## Altos

### A1. Las 4.970 Citas sin `clase`: la migración choca con la convención de ausencia, con la relación de AD-27 y con la propia puerta

- **Historia A** hace `clase` obligatoria y escribe `clase: siempre` en las 4.970. Ese commit
  cambia un campo de cada Cita. `tests/unit/fecha-de-cambio.test.ts` obliga a clasificarlo. Si
  va en `CAMPOS_QUE_PINTA`, el commit refecha y avisa 4.970 Páginas de Cita, que es el ruido que
  AD-27 existe para evitar. Además, la puerta de inmutabilidad ve «ausente → siempre» y rompe en
  4.970 ficheros. Si no lo ve como cambio, tampoco ve «ausente → atribuida».
- **Historia B** la deja opcional, con la ausencia como «siempre», siguiendo el precedente de
  `aptaParaPortada: default(false)`.
- **Regla propuesta:**
  1. `clase` se omite en la de siempre y **solo se escribe `atribuida`**. `clase: siempre`
     escrito es un error del esquema: una sola representación.
  2. La puerta compara con la ausencia normalizada a «siempre».
  3. `clase`, `personaje`, `atestiguaciones` y `variante` se clasifican en `CAMPOS_QUE_PINTA` o
     en `CAMPOS_QUE_NO_FECHAN` **en la espina, no en la historia**. Mi propuesta:
     - `clase`, en `NO_FECHAN`, porque es inmutable;
     - `variante` y `personaje`, en `PINTA`, para la Página de Cita y los listados;
     - `atestiguaciones`, según se pinten. Ahora mismo **la espina no dice si se pintan**, y dos
       historias lo decidirán al revés.

### A2. Una vez dada de alta, la atribuida no tiene camino de cambio con dueño

- **El hueco.** FR-65 dice: «la Obra se añade cuando se sabe». Ni `documentar` (que es cotejo)
  ni `revisar` ni el alta tocan una Cita ya publicada para añadirle Obra, Autor o Personaje, o
  para cambiar la Variante. La función única que crea fichas (AD-25) solo la llaman aprobar,
  alta y documentar.
- **Divergencia.** Una historia lo hace a mano: edita el YAML, sin ficha y sin topes. El build
  rompe por «Obra sin ficha» o pasa de `MAX_ATRIBUIDAS_POR_OBRA`. Otra amplía `documentar` para
  atribuidas, y entonces el censo y el cotejo de AD-23 tienen que saltarse por `esAtribuida`
  dentro de una orden pensada para cotejar.
- **El texto es mutable sin puerta.** Cambiar el `texto` de una atribuida, por ejemplo al
  intercambiar principal y Variante cuando aparece la versión mexicana (FR-67), no pasa por
  `MIN_PARECIDO_PARA_CORREGIR`: esa medida solo la aplica `documentar --texto`. Así se puede
  sustituir una frase por otra en la misma URL.
- **Regla propuesta:**
  1. Una sola orden, `npm run atribuida -- {obra|autor|personaje|variante|texto} …`, es el único
     camino de cambio. Llama a `resolverFichaDeObra` y repite los topes.
  2. Todo cambio de `texto` o de `variante` exige `MIN_PARECIDO_PARA_CORREGIR` contra lo
     publicado, y el build lo comprueba con el historial, como la clase.
  3. La espina declara qué campos de una atribuida son mutables.

### A3. Los topes no topan: la Cita sin Obra se escapa, y las ramas se suman

- **Sin Obra no hay tope por Obra.** `MAX_ATRIBUIDAS_POR_OBRA` no limita la atribuida sin Obra,
  y la Obra es opcional. Un Personaje sin Obra puede acumular un número ilimitado.
- **La espina y el PRD no dicen lo mismo.** El PRD pone el tope «por Obra **con derechos
  vigentes**». La espina dice «por Obra». Una historia aplica el tope a las atribuidas de Sancho
  en el *Quijote*, que es de dominio público; otra no.
- **Dos ramas.** Cada una añade una atribuida a una Obra que está en su tope menos uno. Las dos
  pasan, y la principal rompe al fusionarlas. Como lo juzga el build, una siembra puede tumbar
  el despliegue diario. AD-18 lo evita para las retiradas, no para las altas.
- **Regla propuesta:**
  1. Un tope por dueño (`MAX_ATRIBUIDAS_POR_DUEÑO`) además del tope por Obra.
  2. El ámbito «Obra con derechos vigentes o sin Autor» explícito en la espina.
  3. La orden de alta y la de aprobar juzgan el tope antes de escribir, con el Corpus entero. El
     build lo repite y rompe nombrando la Obra.

### A4. Una retirada por derechos puede quedar bloqueada por NFR-5, y las atribuidas inflan los Temas

- **Historia A**, la de FR-69: «una petición de un titular de derechos se atiende retirando
  primero».
- **Historia B**, la 26.8 de hoy: `documentar --retirar` **se niega con código 1** si deja un
  Tema bajo `MIN_CITAS_POR_TEMA`, y el build rompe por NFR-5.
- **El caso.** Un Tema que llega al mínimo gracias a las atribuidas. Retirarlas por una petición
  legal queda bloqueado, o deja varadas Citas de siempre. A la vez, las atribuidas hacen
  publicables Temas que la clase de siempre no sostenía: es la vía barata que SM-C2 vigila.
- **Regla propuesta:**
  1. `MIN_CITAS_POR_TEMA` (y la publicabilidad del Tema) se cuenta **solo sobre la clase de
     siempre**. La atribuida alcanza la portada por su Personaje o su Autor desde el Directorio
     (FR-65: «a dos saltos»), y el grafo de AD-26.8 lo incluye.
  2. La orden de retirada por petición registrada **nunca se niega** por NFR-5. Si la retirada
     deja una Cita varada, la orden lo informa, y esa Cita la resuelve Héctor antes del siguiente
     despliegue.

### A5. El espacio de slugs compartido solo prohíbe que dos slugs sean iguales, pero la atribución por prefijo no ve a los Personajes

- **El fallo.** `autorPorPrefijo` solo recorre `corpus/autores/`. Ejemplo con un Autor real:
  `juan-manuel` (Don Juan Manuel). Un Personaje `juan-manuel-<apellido>`, de telenovela, publica
  Citas `juan-manuel-<apellido>--…`. Con eso:
  - la demanda (FR-49) las suma a **Don Juan Manuel**;
  - `autor.ts retirar juan-manuel` queda bloqueado por fijaciones o miembros de Colección que
    son del Personaje;
  - si las Citas pasan a llevar Autor, el prefijo del slug sigue siendo el del Personaje.
- **Regla propuesta:**
  1. El espacio de slugs de Autores y Personajes es **sin prefijos** entre sí: ningún slug de uno
     es prefijo-con-guion de un slug del otro, y el build lo comprueba.
  2. O, mejor, `autorPorPrefijo` pasa a `dueñoPorPrefijo` sobre la unión, con su tipo, y toda
     lectura por prefijo (demanda, retirar, Colecciones, portada) la consume.
  3. Declarado en AD-33.

### A6. Las atestiguaciones: «anfitriones distintos» no es «fuentes independientes», y dos historias cuentan anfitriones distintos

- **Historia A**, la orden de alta, cuenta anfitriones por el dominio registrable.
- **Historia B**, el esquema, cuenta `hostname`. Entonces `starwars.fandom.com` y
  `batman.fandom.com` son dos, `es.` y `en.wikiquote.org` son dos, y `m.` y `www.` son dos. Lo
  que el alta acepta, el build lo rechaza, o al revés.
- **Independencia.** Los agregadores que copian a BrainyQuote (Goodreads, AZQuotes, sitios de
  frases) cuentan como independientes. La espina solo excluye «la semilla y el propio».
- **Forma.** Las URL son páginas mutables, sin revisión. AD-26 no deja entrar una Fuente mutable
  sin revisión, y la espina no dice por qué esta sí: no se cotejan.
- **Regla propuesta:**
  1. Una sola función de `src/lib/` (`anfitrionDeAtestiguacion`), con la tabla de dominios
     registrables declarada (sin lista pública de sufijos en tiempo de build). La usan el esquema
     y la orden.
  2. Un conjunto cerrado de anfitriones que no cuentan, en `umbrales.ts`: la semilla, sus
     espejos y los agregadores conocidos.
  3. Cada atestiguación es `{url, consultadaEl}`. Que no se descarga es explícito, y que una URL
     muerta no despublica también.
  4. La espina dice si se pintan, por A1.

---

## Medios

### M1. Huecos de la relación de AD-27 con el Personaje

AD-27 v9.1 compone la Página de Personaje y «una Cita con Personaje compone su Personaje». Le
faltan estas composiciones, y dos historias las decidirán distinto:

- **Los listados de Autor, Tema y Colección pintan el nombre del Personaje** en la atribución de
  la Tarjeta de Cita, con el orden Personaje, Obra, Autor de AD-33. Componen `corpus/personajes/`.
- **`/autores/`** (la sección de Personajes) y **`/obras/`** (las Obras cuyo dueño es un
  Personaje) componen los ficheros de Personaje.
- **La Página de Obra de un Personaje** compone el fichero del Personaje, no el de un Autor.
- **El cambio de `AÑO_DE_DERECHOS`** (C2) fecha las Obras cuyo estado cambia.
- **Un commit que solo toca `corpus/peticiones-de-retirada.yml`** no emite aviso, por la
  cláusula de AD-24 para las series. Hoy AD-35 cita AD-24 sin decirlo.

**Regla propuesta:** que la espina enumere estas composiciones y la exención del registro.

### M2. Forma de `peticiones-de-retirada.yml`

- **Historia A** escribe la resolución en la misma entrada de la petición, reescribiendo.
- **Historia B** solo añade, por `appendFile` con relectura, como `publicaciones-de-canal.yml`.
  Petición y resolución serían dos entradas.
- **Campos que faltan.** La espina no lleva «clase de quien pide» (que SM-C6 necesita) ni «nunca
  datos de contacto» (FR-69).
- **Validación de la Cita.** Si la Cita se valida como «ruta publicada», como en el rastreo, la
  resolución de una ya retirada se rechaza.
- **El `mailto:`.** Publica una dirección personal en miles de páginas, con su spam.
- **Regla propuesta:**
  1. Entradas de dos tipos que solo se añaden: `peticion` (id, fecha, slug, `quienPide` de un
     conjunto cerrado y motivo, sin contacto) y `resolucion` (id de la petición, fecha y acto).
  2. El slug se valida contra lo publicado **o** el historial de retiradas.
  3. La dirección del `mailto:` es una constante declarada en `src/lib/` de un buzón propio del
     proyecto.

### M3. Semblanza y clave de orden del Personaje

- **La semblanza.** AD-33 manda la semblanza del Personaje a AD-26, que exige una revisión de
  una Fuente mutable. FR-66 admite también «la escribe una persona que responde de ella». Una
  historia rompe el build ante una semblanza escrita a mano; otra la publica.
- **La clave de orden.** FR-66 da al Personaje clave de orden con la regla del Autor, pero AD-1
  v8 exige su presencia solo sobre `autoresPublicados`.
- **Regla propuesta:**
  1. AD-26 gana una segunda procedencia admisible solo para el Personaje,
     `semblanzaPropia: {responde: …}`, escrita por una orden.
  2. AD-1 exige la clave de orden sobre `personajesPublicados`.

### M4. El 40 % latinoamericano, las épocas, la política de objetivo y las series cuentan clases mezcladas

- **El 40 %.** El suelo usa `tradicion` del Autor. Las Citas de Personaje sin Autor no la tienen.
  Una historia las saca del denominador; otra las cuenta como no latinoamericanas. Y una siembra
  de personajes de la ficción mexicana (FR-68, pregunta 21) llenaría el 40 % sin una sola Cita
  cotejada.
- **Las épocas.** El cruce por época (`candidatos-por-epoca.yml`, `slugsSembrados`) necesita
  `añoFallecimiento`. Un Autor vivo rompe el cruce o queda invisible.
- **La política de objetivo** (`npm run objetivo`, Historia 11.3) elige el hueco sin saber de
  clases.
- **Las series.** El `publicadas` de la serie de indexación suma cuatro familias. Una historia
  mete ahí al Personaje y otra no, y la serie deja de ser comparable.
- **Regla propuesta:**
  1. El 40 %, el hueco y las épocas se calculan **solo sobre la clase de siempre**, como SM-C1,
     y la espina lo dice.
  2. `personaje` es familia propia en las series y **no entra** en el `publicadas` de la entrada,
     como la Obra y el Directorio.
  3. `/obras/` agrupa las Obras de Personaje en una sección aparte, tras las de Autor, con el
     orden de la sección de Personajes de `/autores/`.

### M5. La Variante y el salto

- **El salto en la atribuida.** AD-34 dice que la Variante «sigue la regla del salto de AD-29».
  La puerta del salto vive dentro del cotejo, y la atribuida no se coteja «aunque declare
  Fuente». Una historia salta la puerta junto con el cotejo, y entonces un `\n` tecleado a mano
  pasa. Otra aplica «sin documento no hay saltos», y entonces nunca hay saltos.
- **`region`.** No es un conjunto cerrado. Una historia escribe «España», otra «es-ES».
- **Pagefind.** No se dice si la Variante entra bajo `data-pagefind-body`, ni con qué peso.
- **Regla propuesta:**
  1. La atribuida y su Variante no llevan nunca `\n`, y lo exige el esquema.
  2. `region` es un conjunto cerrado de `src/lib/` (por ahora `espana`).
  3. La Variante va en el cuerpo indexado, no en un metadato, como recuerda la trampa de
     Pagefind de AGENTS.md.

---

## Bajos

- **B1. `esAtribuida` como único lector.** El esquema, para elegir la puerta, la puerta de
  inmutabilidad y el cotejo de `integraciones/`, que lee el Corpus en crudo con `tools/lib/` y
  no con las entradas de Astro, son tres lectores más de `clase`. Propuesta: el predicado vive en
  `src/lib/clase.ts` sobre la forma cruda `{clase?}`, y lo importan `publicado.ts`, el esquema y
  `tools/lib/`. La espina enumera esos lectores como consumidores.
- **B2. Datos estructurados de la Obra de un Personaje.** `spokenByCharacter` es de `Quotation`.
  El `about` o `CreativeWork` de la Página de Obra de un Personaje no tiene `author`, y una
  historia pondría al Personaje como `author`, que es falso (NFR-3). Propuesta: sin Autor, el
  `CreativeWork` va sin `author` y con `character`.
- **B3. La Obra de dominio público con atribuidas.** La Página del *Quijote* mezclaría
  atribuidas (sin posición, al final por slug) con cotejadas. La frase «N de sus M citas no
  tienen documento cotejado» contaría las atribuidas. Propuesta: el recuento de edición cotejada
  se hace solo sobre la clase de siempre.
- **B4. La medición de la Página de Personaje.** «Se mide como la Página de Autor», pero la
  superficie `producto` declara su `vista`. Si la vista es nueva, toca el vocabulario y la huella
  la despliega Héctor. Propuesta: reutilizar `vista-de-superficie`, para no tocar el vocabulario.

---

## Las reglas que cierran lo crítico, en una línea cada una

1. Ninguna puerta lee `_revision/`. Las formas vedadas a la atribuida van en un registro
   versionado. Una atribuida con Autor de dominio público y Obra declarada se coteja igual.
2. `derechosVigentes(dueño, AÑO_DE_DERECHOS)` con un dueño único, una constante movida por
   commit, el plazo y la jurisdicción declarados, el Autor como unión `añoFallecimiento | vivo`
   y `estadoDerechos` determinado por la clase.
3. El dueño de una Obra es de la ficha, se fija al crearla y no cambia. Las Citas sin Autor se
   resuelven por `personajes`, y no puede haber dos fichas sin Autor con la misma forma.
4. La clase es estructural, con un registro de slugs y clases que solo añade. La puerta rompe en
   CI con una copia superficial y se omite, avisando, en local y en las pruebas.

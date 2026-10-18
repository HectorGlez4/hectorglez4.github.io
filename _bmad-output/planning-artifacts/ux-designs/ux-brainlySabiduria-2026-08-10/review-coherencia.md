# Revisión de coherencia — pasada v8 de bmad-ux

Fecha: 2026-10-18. Solo lectura sobre el repositorio: no se ha tocado ninguna espina, maqueta ni fuente.

## Alcance y método

Se leyeron enteros:

- Las dos espinas recién destiladas: `DESIGN.md` (407 líneas) y `EXPERIENCE.md` (460 líneas), junto con el `git diff` de la pasada.
- La bitácora `.memlog.md`, con las entradas 114–128 del 18/10, que son decisiones de Héctor y mandan.
- El PRD v8: §0, §2.3 (UJ-1…UJ-6), §3, FR-1…FR-12, FR-17…FR-22, FR-48, FR-51…FR-56, §6.7, §7 (cabecera), §8, §9, §10, §11 y §12.
- El addendum de la v8 entero.
- El diseño `docs/superpowers/specs/2026-10-17-v8-cita-como-centro-design.md`: §5–§9, §14 y el apéndice.
- Las seis maquetas `mockups/v8-*.html`, pasadas a texto y cotejadas, con sus notas y sus marcas «[sin decidir]». Son idénticas byte a byte a sus copias de `.working/`.

Las líneas citadas son las del árbol de trabajo a 2026-10-18. Se comprobaron contra el código y el Corpus dos afirmaciones de hecho: los contrastes de `§ Colors` y la presencia de traductor en las Citas publicadas.

## Veredicto

Las espinas recogen todas las decisiones de Héctor del 18/10 con la variante exacta, y siguen el PRD v8 en lo esencial. Antes de escribir historias hay que cerrar **dos contradicciones de comportamiento**:

- la unidad del recuento de la Lista de Obras;
- qué filtros envía «Buscar en esta obra».

Hay además **ocho desajustes de grado medio** en microcopia, en la regla del siena, en los UJ que se separan del PRD y en hechos que ya no son ciertos. Ninguno obliga a rehacer una decisión.

## Recuento por gravedad

| Gravedad | Hallazgos |
|---|---|
| Crítica | 0 |
| Alta | 2 (1–2) |
| Media | 8 (3–10) |
| Baja | 14 (11–24) |
| **Total** | **24** |

Eje de cada hallazgo: (1) espinas frente al PRD y su addendum; (2) DESIGN frente a EXPERIENCE; (3) espinas frente a la bitácora; (4) maquetas frente a espinas.

---

## Hallazgos

### Alta

**1. La Lista de Obras: la unidad del recuento, a la vista o solo para el lector de pantalla.** Eje (2) y (3).

- **Ubicación:** `DESIGN.md:283` frente a `EXPERIENCE.md:162`. Afecta también a `DESIGN.md:325` y `EXPERIENCE.md:219`.
- **Problema:**
  - DESIGN dice que en la Página de Autor va «la cifra sola a la vista, y la unidad para el lector de pantalla», y que solo el Directorio de Obras la reutiliza «con la unidad a la vista».
  - EXPERIENCE dice que el mismo componente lleva «la unidad visible —«27 citas», «1 cita»—» también en la Ficha de Autor, porque es la Fila de Obra del Directorio [ASSUMPTION].
  - Héctor (bitácora 123) decidió 6C solo para la Fila de Obra de `/obras/`. La propia maqueta 6C dice «si la Página de Autor la adopta…», y `v8-pagina-de-obra.html` (4B) dibuja la Lista de Obras de Sor Juana con la cifra sola.
  - Con las dos espinas así, una historia sobre `ListaDeObras.astro` puede construir cualquiera de las dos cosas.
- **Corrección:** en `EXPERIENCE.md:162`, sustituir
  «*(v8)* con la unidad visible —«27 citas», «1 cita»—, como la fila del Directorio de Obras, que es este mismo componente [ASSUMPTION]»
  por
  «en la Ficha de Autor, la cifra sola a la vista y la unidad para el lector de pantalla, como está construido; *(v8)* en el Directorio de Obras, el mismo componente con la unidad a la vista —«27 citas», «1 cita»— (variante 6C). Que la Página de Autor la adopte también está sin decidir y es de Héctor [ASSUMPTION].»
  Si Héctor prefiere la unidad visible en las dos, el cambio va en `DESIGN.md:283`: «la cifra sola a la vista, y la unidad para el lector de pantalla» pasa a «la cifra con su unidad a la vista —«27 citas», «1 cita»— *(v8)*».

**2. «Buscar en esta obra» envía solo `obra`, y el selector de Obra no existe sin Autor.** Eje (1), (2) y (4).

- **Ubicación:** `EXPERIENCE.md:204` («con el filtro en un campo oculto»), frente a `EXPERIENCE.md:200`. También `DESIGN.md:310` y `addendum.md:313`.
- **Problema:**
  - `EXPERIENCE.md:200` dice que el selector de Obra «no existe hasta elegir un Autor» y que «cambiar o quitar el Autor quita la Obra elegida».
  - Desde la Página de Obra, el formulario lleva un solo campo oculto (`obra=…`), como dibuja `v8-pagina-de-obra.html`. Se llega a `/buscar/?obra=…` sin `autor`: hay un filtro puesto que ningún selector visible muestra.
  - El recuento de `EXPERIENCE.md:202` («23 citas de José Martí en Maestros ambulantes.») necesita además el Autor.
  - `v8-buscar.html` (decisión 8) lo marca «[sin decidir]»: dos campos ocultos, o que `/buscar/` deduzca el Autor del nombre de la ficha.
- **Corrección:**
  - En `EXPERIENCE.md:204`, tras «con el filtro en un campo oculto», añadir: «—en la Obra, dos, `autor` y `obra`, porque el selector de Obra depende del de Autor [ASSUMPTION]; si `/buscar/` deduce el Autor del nombre de la ficha, lo decide Arquitectura—».
  - En `EXPERIENCE.md:200`, añadir: «Si la dirección trae `obra` sin `autor`, el Autor se toma de la Obra y los dos selectores se ven puestos [ASSUMPTION].»
  - En `DESIGN.md:310`, cambiar «el filtro en un campo oculto» por «el filtro en campos ocultos —dos en la Obra—».

### Media

**3. El rótulo de tipo «Directorio»: DESIGN lo fija y EXPERIENCE lo delega.** Eje (2) y (4).

- **Ubicación:** `DESIGN.md:307` y `DESIGN.md:309` frente a `EXPERIENCE.md:205`.
- **Problema:**
  - DESIGN fija, sin etiqueta, el rótulo «Directorio» y los «Resultados de búsqueda de tipo «Directorio»».
  - EXPERIENCE dice que «su rótulo de tipo y qué parte de su lista se ignora los fija Arquitectura».
  - La bitácora (124) eligió la variante 7C, «los dos Directorios como resultados de tipo Directorio», pero `v8-buscar.html` (7C) marca «[sin decidir] El rótulo «Directorio»». El addendum (`addendum.md:428`) solo difiere a Arquitectura el tipo de resultado en Pagefind, que es mecanismo; el texto visible es de UX.
- **Corrección:**
  - En `EXPERIENCE.md:205`, sustituir «su rótulo de tipo y qué parte de su lista se ignora los fija Arquitectura» por «se rotula «Directorio» (variante 7C) [ASSUMPTION]; el tipo de resultado en Pagefind y qué parte de su lista se ignora los fija Arquitectura».
  - En `DESIGN.md:307`, añadir [ASSUMPTION] tras «desde la v8, «Directorio»».

**4. La regla del siena, a la letra, pone «Siguiente cita de esta obra» en siena.** Eje (2) y (3).

- **Ubicación:** `DESIGN.md:139` frente a `DESIGN.md:140` y a la bitácora 117.
- **Problema:**
  - La frase nueva dice: «Cuenta como actuar lo que mueve al visitante dentro de la misma página o del mismo listado, igual que la paginación».
  - «Siguiente cita de esta obra →» recorre el listado de la Obra, en el orden del libro. Leída a la letra, la regla lo manda a siena, que es justo la variante 1C que Héctor descartó.
  - La línea 140 lo pone en tinta. Las dos frases chocan.
- **Corrección:** en `DESIGN.md:139`, sustituir esa frase por: «Cuenta como actuar lo que mueve al visitante dentro de la misma página —las letras de salto de los Directorios y el salto «Dónde leer esta obra ↓» de la Cabecera de Obra, los dos en siena por decisión de Héctor (18/10)— o entre las páginas de un mismo listado, que es la paginación. Ir a otra Página de Cita, aunque sea la siguiente de su Obra, es navegación que informa y va en tinta (abajo).»

**5. «Siguiente cita de {Tema} →» no compone con los nombres de Tema.** Eje (4), además de la microcopia que el PRD deja a UX (prd.md:123).

- **Ubicación:** `DESIGN.md:246`, `EXPERIENCE.md:129`, `EXPERIENCE.md:294` y `EXPERIENCE.md:404`. Aparece como divergencia en `EXPERIENCE.md:268`.
- **Problema:**
  - Los 24 Temas empiezan por «El» o «La». La plantilla da «Siguiente cita de El amor →» —sin la contracción «del», en 7 Temas— o «Siguiente cita de La vida →» —con mayúscula a media frase, en 17—.
  - `v8-pagina-de-cita.html` lo marca «[sin decidir] La forma del rótulo» y dibuja «Siguiente cita sobre la vida →».
  - El recuento de `/buscar/` ya fija la otra forma (`EXPERIENCE.md:202`): «sobre la prudencia», con el Tema en minúscula, «como en «Citas sobre {Tema}»».
- **Corrección:** fijar «Siguiente cita sobre {tema} →», con el nombre del Tema en minúscula dentro de la frase, como en el recuento —«Siguiente cita sobre la vida →»— y marcarlo [ASSUMPTION] para Héctor.
  - Cambiarlo en las cuatro ubicaciones.
  - Quitar de `EXPERIENCE.md:268` la primera divergencia («rotula «Siguiente cita sobre la vida →»…»): la maqueta pasa a coincidir.
  - Si Héctor prefiere «de», hay que escribir la regla de la contracción: «Siguiente cita del amor →».

**6. UJ-6 y el paso 8 de UJ-3 se separan del PRD sin [NOTE FOR PM] en el propio flujo.** Eje (1) y (3).

- **Ubicación:** `EXPERIENCE.md:395` (cabecera de UJ-3), `EXPERIENCE.md:403` (paso 8), y UJ-6 en `EXPERIENCE.md:427-431`. Se comparan con `prd.md:59` y `prd.md:68`.
- **Problema:**
  - **UJ-3.** La cabecera dice «ampliado en la v8, con el texto nuevo del PRD», pero el paso 8 —«Obras», el Directorio de Obras, Gracián y WhatsApp— no está en el PRD.
  - **UJ-6** enmienda el PRD en tres puntos:
    - teclea «mar» en el campo, en vez de «salta a la «M»… teclea «mar»»;
    - busca «enseñanza» en vez de «escuela»;
    - el cero del Directorio se dice con una frase y una salida a la búsqueda, donde el PRD dice que el filtro «lo dice con su recuento a cero». Es, además, lo que `EXPERIENCE.md:63` pone en la columna «No».
  - La bitácora 128 dice que las dos van al PRD. Solo `EXPERIENCE.md:44` lleva [NOTE FOR PM], y solo para el Directorio de Obras de UJ-3.
- **Corrección:**
  - (a) En `EXPERIENCE.md:395`: «*(ampliado en la v8: los pasos 2–4, con el texto nuevo del PRD; el 8, por decisión de Héctor del 2026-10-18, pendiente de llevarse al PRD [NOTE FOR PM]; reescrito en la v7.1)*».
  - (b) Al final de UJ-6, tras `EXPERIENCE.md:432`: «[NOTE FOR PM] Este flujo enmienda el UJ-6 del PRD en tres puntos, por decisión de Héctor del 2026-10-18: teclea «mar» en el campo, que va encima de las letras, en vez de saltar a la «M»; busca «enseñanza», porque «escuela» da cero en *Maestros ambulantes*; y el cero del Directorio se dice con una frase y la salida «Buscar «x» en las citas», no con el recuento. Va a la pasada corta de `bmad-prd` con FR-12.»
  - (c) En `EXPERIENCE.md:431`, «el recorrido acaba en ese estado» pasa a «el recorrido que escribe hoy el PRD acaba en ese estado».

**7. «Más opciones…» sin guion: tres versiones distintas.** Eje (1), (2) y (4).

- **Ubicación:** `EXPERIENCE.md:133` y `EXPERIENCE.md:307`, frente a `DESIGN.md:253`. Se cruza con `v8-pagina-de-obra.html` y con `addendum.md:276`.
- **Problema:**
  - **EXPERIENCE** dice dos cosas a la vez: «Sin guion se ven todos los destinos de enlace» y «cómo se pliegan y cómo se ven desplegados está sin fijar». En la línea 307 añade: «sin JavaScript se ven igual».
  - **DESIGN** fija el aspecto desplegado «donde no hay hoja del sistema, y sin guion» [ASSUMPTION].
  - **La maqueta de la Obra** dibuja cerrado el `<details>` del addendum: sin guion, Telegram, X y Correo no se ven hasta abrirlo.
  - **FR-18** (prd.md:462) solo pide que estén en el HTML inicial.
- **Corrección:**
  - En `EXPERIENCE.md:133`, sustituir «Sin guion se ven todos los destinos de enlace, porque los tres están en el HTML inicial (NFR-2); cómo se pliegan y cómo se ven desplegados está sin fijar.» por «Sin guion, los seis destinos de enlace están en el HTML inicial (NFR-2): WhatsApp, Facebook y Threads a la vista, y Telegram, X y Correo tras «Más opciones…», que sin guion los despliega al pulsarlo, como donde no hay hoja. Cómo se ven desplegados lo fija `DESIGN.md` [ASSUMPTION]; el mecanismo del pliegue —el `<details>` del addendum u otro— lo cierra Arquitectura.»
  - En `EXPERIENCE.md:307`, «sin JavaScript se ven igual» pasa a «sin JavaScript se despliegan igual».

**8. Las Rutas de salida no dicen que van fuera del cuerpo de Pagefind.** Eje (1).

- **Ubicación:** `EXPERIENCE.md:135-137`, frente a FR-12 (`prd.md:363`): «La búsqueda interna no devuelve una Página de Cita por el texto de las Citas que enlaza: solo por el suyo.»
- **Problema:** `EXPERIENCE.md:129` lo dice de la Tarjeta de Obra, que no lleva texto de Cita. No lo dice de «De la misma obra» ni de «Más de {Autor}», que son los bloques que llevan hasta siete fragmentos de otras Citas.
- **Corrección:** en `EXPERIENCE.md:137`, sustituir «Todo se compone en el build y es determinista.» por «Todo se compone en el build, es determinista y va fuera del cuerpo de Pagefind: la búsqueda no devuelve una Página de Cita por el texto de las Tarjetas que enlaza (FR-12).»

**9. Obra traducida: dos hechos que ya no son ciertos.** Eje (1).

- **Ubicación:** `EXPERIENCE.md:276` y `EXPERIENCE.md:284`.
- **Problema:**
  - La línea 276 dice que «hoy ninguna Cita publicada trae traductor». El 2026-10-18, 307 Citas publicadas llevan `procedencia.traduccion`.
  - El [NOTE FOR PM] de la línea 284 dice que la Atribución de Horacio dice «Odas, 1909.» y que 1909 es el año de la traducción. La Historia 19.1 lo resolvió, como dice AGENTS.md (`--restituir-traduccion`). `corpus/citas/horacio--a-que-vienen-las-tristes-lamentaciones-si.md` declara `obra: "Odas"` y `traduccion: { traductor: "Germán Salinas", año: 1909 }`, sin año de la Obra.
  - Un [NOTE FOR PM] que pide arreglar algo ya arreglado hace perder una pasada del PRD.
- **Corrección:**
  - En `EXPERIENCE.md:276`, sustituir «aunque hoy ninguna Cita publicada trae traductor» por «en la v7.1; desde la Historia 19.1 la Procedencia guarda aparte el traductor y el año de la traducción, y el 2026-10-18 los traen 307 Citas publicadas».
  - Sustituir el párrafo [NOTE FOR PM] de `EXPERIENCE.md:284` por: «**Resuelto por la Historia 19.1.** El año de una traducción vive en `procedencia.traduccion`, y una Cita cuyo único año era el de la traducción queda con Procedencia parcial. La Cabecera de Obra y la Tarjeta de Obra de las «Odas» de Horacio van, por eso, sin año.»
  - Antes de escribir la frase literal de la Atribución, comprobarla contra lo construido.

**10. La Cita del Día de la portada no dice si lleva la Línea de la Fuente.** Eje (1).

- **Ubicación:** `DESIGN.md:334` y `EXPERIENCE.md:228`.
- **Problema:**
  - FR-9 (`prd.md:281`) da a la Cita del Día «la misma» Tarjeta de Obra que su Página de Cita. FR-12 (`prd.md:348`) pone esa tarjeta «después de su atribución y de la línea que dice de qué Fuente se tomó su texto».
  - Ninguna espina dice si la Cita del Día lleva la Línea de la Fuente, ni dónde va respecto a «Ver esta cita».
  - `v8-cabecera-y-portada.html` (3A) anota que «La Cita de hoy no lleva Línea de la Fuente porque no tiene documento», con lo que la llevaría si lo tuviera.
- **Corrección:**
  - En `DESIGN.md:334`, tras «con su Atribución», añadir: «y, si consta, su Línea de la Fuente, pegada a la Procedencia como en la Página de Cita [ASSUMPTION]».
  - En `EXPERIENCE.md:228`, cambiar «la Cita, su Atribución y «Ver esta cita»» por «la Cita, su Atribución, su Línea de la Fuente si consta y «Ver esta cita»».

### Baja

**11. El subrayado tiene una sola fuente, y esa fuente no lista tres enlaces que DESIGN subraya.** Eje (2).

- **Ubicación:** `EXPERIENCE.md:369`, frente a `DESIGN.md:334`, `DESIGN.md:335` y `DESIGN.md:336`.
- **Problema:** la bitácora 106 declara § Accessibility Floor única fuente del subrayado. DESIGN subraya «Ver esta cita», «Las {n} obras →» y «Los {n} autores, de la A a la Z →», y esa fuente no nombra ninguno de los tres.
- **Corrección:** en `EXPERIENCE.md:369`, en la frase «*(v8)* Lo llevan los tres enlaces de la cabecera…», añadir «, «Ver esta cita» de la Cita del Día y los cierres «Las {n} obras →» y «Los {n} autores, de la A a la Z →» de la portada,» como enlaces de texto en su propia línea.

**12. El cuerpo de las letras de salto se da por decidido sin estarlo.** Eje (3) y (4).

- **Ubicación:** `DESIGN.md:321`, «en `{typography.body-md}` con peso 600».
- **Problema:** `v8-directorios.html` marca «[sin decidir] el cuerpo de la letra»: la Paginación usa `caption`. La bitácora 123 no lo decide, y la línea va sin [ASSUMPTION].
- **Corrección:** añadir [ASSUMPTION] tras «con peso 600».

**13. La tabla de Maquetas, incompleta en dos filas e inexacta en una.** Eje (4).

- **Ubicación:** `EXPERIENCE.md:271` (`/buscar/` v8) y `EXPERIENCE.md:269` (Historia de Instagram).
- **Problema:**
  - `v8-buscar.html` no marca ninguna variante como recomendada. De la decisión 8 dibuja A y B sin elegir, así que «recomienda «Buscar en este Tema» al pie» no se puede comprobar en el fichero.
  - Faltan en esa fila dos divergencias: la decisión 8A dibuja «Buscar en…» con botón secundario «Buscar», donde `DESIGN.md:310` lo deja sin botón [ASSUMPTION]; y la maqueta deja varias cosas sin decidir que la fila no nombra.
  - La fila de la Historia dice «Ninguna anotada», y la maqueta deja sin decidir si la línea de arriba se queda cuando falla el generador.
- **Corrección:**
  - En `EXPERIENCE.md:271`, la columna de divergencias pasa a: «Cuatro: dibuja la cabecera provisional; dibuja «Buscar en…» con un botón secundario «Buscar», donde `DESIGN.md` lo deja sin botón [ASSUMPTION]; deja sin elegir el lugar de su decisión 8, que fija la Página de Obra v8; y pone en la serif el texto tecleado. Deja sin decidir el orden de las opciones de Autor, el texto de la primera opción de cada selector, el rótulo de la última tanda y si la etiqueta del campo nombra la obra.»
  - En `EXPERIENCE.md:269`, añadir a lo que deja sin decidir: «y si la línea de arriba se queda en el fallo del generador».

**14. En la portada, los encabezados parten en tres lo que es un solo bloque.** Eje (2).

- **Ubicación:** `EXPERIENCE.md:228` («Cita, Tarjeta de Obra y acciones son un solo bloque»), frente a `EXPERIENCE.md:365`, que hace `h2` a «De la obra» y a «Compartir en» en toda superficie.
- **Problema:** en la portada, esos dos `h2` quedan hermanos de «La cita de hoy», y el lector de pantalla oye tres secciones. La maqueta lo dibuja así.
- **Corrección:** en `EXPERIENCE.md:365`, añadir: «En la portada, «De la obra» y «Compartir en» bajan a `h3`, dentro de «La cita de hoy» [ASSUMPTION].»

**15. «Temas de la Obra»: la columna Dónde no recoge el orden de la v8.** Eje (2).

- **Ubicación:** `EXPERIENCE.md:174`.
- **Problema:** dice «después del listado». Desde la v8, los Temas van después de «Compartir en» (`EXPERIENCE.md:168`, `DESIGN.md:297`).
- **Corrección:** «Página de Obra, solo la primera página, después de «Compartir en»».

**16. Las zonas de FR-56 se nombran en unas filas sí y en otras no.** Eje (1).

- **Ubicación:** varias filas de EXPERIENCE.
  - Nombran su zona: `:118`, `:129`, `:135`, `:136`, `:143`, `:205`, `:217` y `:228`.
  - Callan la suya, aunque FR-56 y `addendum.md:238` la dan:
    - la Atribución (`:127`) y «de {Autor}» de la Cabecera de Obra (`:172`), que registran `atribucion`;
    - la Paginación (`:144`), `paginacion`;
    - la Lista de Obras (`:162`), `lista-de-obras`;
    - el Chip de Tema (`:145`), `chip-de-tema`;
    - las Colecciones (`:146`), `colecciones`;
    - las Obras de la portada (`:229`), `obras-de-portada`;
    - los Autores destacados (`:230`), `autores-de-portada`.
  - Tampoco se dice qué zona registra «Buscar «x» en las citas» del Directorio.
- **Problema:** quien lea solo una de esas filas puede pensar que su enlace no registra salida.
- **Corrección:** quitar las menciones sueltas y escribir una vez, en § Interaction Primitives: «Qué zona registra cada enlace lo fija FR-56, con el conjunto cerrado de `salida-interna` del addendum v8; cada enlace, la más concreta que lo contiene.» Si se quieren conservar, añadir la zona en cada una de las filas que la callan.

**17. El nombre accesible del Diálogo de la Historia no coincide con el de su botón.** Eje (2).

- **Ubicación:** `EXPERIENCE.md:134`, «su nombre accesible lo toma del botón que lo abre, «Historia de Instagram»».
- **Problema:** el nombre accesible del botón es «Compartir en Historia de Instagram», porque el prefijo va en `.solo-para-lectores` (`EXPERIENCE.md:133`). Si el diálogo lo toma del botón con `aria-labelledby`, se llama así.
- **Corrección:** escribir «Compartir en Historia de Instagram», o decir que el diálogo toma solo el texto visible del botón.

**18. «Mostrar 30 más» cuando faltan menos de 30.** Eje (1) y (4).

- **Ubicación:** `EXPERIENCE.md:203`.
- **Problema:** la espina no dice qué rótulo lleva el botón en la última tanda. La maqueta 5A lo marca «[sin decidir]», y el PRD (prd.md:123) pide que el texto final no prometa más de lo que da.
- **Corrección:** añadir «Si quedan menos de 30, dice «Mostrar las {n} que faltan» [ASSUMPTION]», o declarar que el rótulo no cambia y por qué.

**19. El recuento con filtros, en singular.** Eje (2).

- **Ubicación:** `EXPERIENCE.md:202`.
- **Problema:** el singular solo está escrito para la búsqueda sin filtros («Un resultado.»).
- **Corrección:** añadir «En singular: «Una cita de José Martí en Maestros ambulantes.» [ASSUMPTION]».

**20. El aire de las Rutas de salida no es múltiplo de la unidad en móvil.** Eje (2).

- **Ubicación:** `DESIGN.md:261`, frente a `DESIGN.md:191` («múltiplos de `{spacing.unit}`. Sin excepciones.»).
- **Problema:** «a vez y media la respiración» da 60 px en móvil (40 × 1,5), que no es múltiplo de 8. Lo construido hace lo mismo: `src/components/RutasDeSalida.astro:88`.
- **Corrección:** en DESIGN, «a 8 × `{spacing.unit}` en móvil y 12 × en escritorio». Si se quiere conservar lo construido, declararlo como excepción en `DESIGN.md:191`.

**21. El criterio de Colección: «una línea» en el PRD, una frase de varios renglones en EXPERIENCE.** Eje (1).

- **Ubicación:** `EXPERIENCE.md:146`, frente a FR-9 (`prd.md:289`, «Cada Colección lleva su criterio en una línea»).
- **Problema:** EXPERIENCE da una frase «que puede ocupar de dos a cuatro renglones». La maqueta ya lee «en una línea» como «una frase, no un renglón», pero la espina no lo dice.
- **Corrección:** añadir ««En una línea» de FR-9 se lee como una frase, no como un renglón, y nunca se recorta [NOTE FOR PM: precisarlo en la pasada corta]».

**22. El orden de los ocho Autores destacados, sin decidir y sin marca.** Eje (4).

- **Ubicación:** `EXPERIENCE.md:230` y `DESIGN.md:336`.
- **Problema:** las dos filas callan el orden. Solo la tabla de Maquetas (`EXPERIENCE.md:267`) dice que está sin decidir, y la maqueta los ordena como el Directorio.
- **Corrección:** en `EXPERIENCE.md:230`, añadir «Su orden está sin decidir; la maqueta los ordena como el Directorio de Autores».

**23. Las espinas no citan el addendum entre sus fuentes.** Eje (1).

- **Ubicación:** el frontmatter, `sources:` de `DESIGN.md:4-7` y de `EXPERIENCE.md:4-9`.
- **Problema:** el addendum v8 trae la lista de decisiones diferidas a UX, que esta pasada cierra, y no figura entre las fuentes.
- **Corrección:** añadir `"{planning_artifacts}/prds/prd-brainlySabiduria-2026-08-10/addendum.md"` a las dos.

**24. Un [ASSUMPTION] sobre algo que fija el PRD.** Eje (1).

- **Ubicación:** `EXPERIENCE.md:315`, «su página 1 lleva el salto, compartir y «Buscar en esta obra», como la indexable (FR-51). [ASSUMPTION]».
- **Problema:** FR-51 (prd.md:951-954) y FR-18 (prd.md:458, «se indexe o no») ya fijan esas tres cosas.
- **Corrección:** quitar ese [ASSUMPTION]. Si la etiqueta se refería a otra cosa de la frase, moverla tras esa cosa.

---

## Comprobado sin hallazgo

- **Bitácora, entradas 115–128.** Las catorce están en las espinas con la variante exacta. Una sola diferencia, la del rótulo de 7C (hallazgo 3). En concreto:
  - cabecera 1A + 2A (105 px, una fila desde 600 px);
  - portada 3A con la redacción 1 y la marca 4A;
  - Tarjeta de Obra 1A, «Compartir en» 2C y Rutas de salida 3A;
  - Historia A, con la imagen 9:16 en B y la cuadrada en B, y los tramos 80/64/52/42 a probar;
  - Página de Obra 1A, 2B y 3A; «Buscar en» 4B y 5A;
  - las ocho variantes de los Directorios y las siete de `/buscar/`;
  - el siguiente Autor por Tema, con su [NOTE FOR PM];
  - por encima de 300 caracteres, sin explicación, también en la portada;
  - los derivados de la entrada 127.
- **Addendum, «De UX».** Las siete decisiones diferidas están cerradas en las espinas.
- **Compartición.** El mecanismo de la Historia —primero el portapapeles y después la hoja, sin texto; `AbortError` frente a `NotAllowedError`; `pointer: coarse` y `canShare` con un PNG de prueba— está recogido sin contradicción.
- **Línea de cifras.** Recogida sin contradicción.
- **Componentes.** Los nombres son los mismos en las dos espinas: Tarjeta de Obra, Bloque «Compartir en», Diálogo de Imagen en la Historia de Instagram, Selectores de filtro, Recuento de resultados, Letras de salto, Fila de Autor, Fila de Obra y Cabecera de grupo. Los grupos de Components y de Component Patterns van en el mismo orden.
- **Contrastes de `§ Colors`, recalculados.** Tinta sobre papel 16,00; tinta apagada 7,26; siena 6,26; blanco sobre siena 6,70; contorno 3,66; y las tres parejas enlace frente a texto, 2,20, 1,16 y 2,56. Todos como se declaran.
- **Lo que fijan los FR.** Los FR-7, 8, 9, 10, 11, 17, 18, 20, 21, 51, 52, 54 y 55 están en las espinas tal como los fija el PRD. Las únicas enmiendas son las de FR-12 y UJ-6, que llevan [NOTE FOR PM] o lo piden en el hallazgo 6.

## Pendientes ya registrados que no se cuentan

Los registra la bitácora (101, 105) y no los abre la v8:

- «Sin obra documentada» con y sin punto final;
- «Una de sus 27» frente a la plantilla «{n} de sus {total}»;
- la Tarjeta Social, rasterizada en Georgia, frente a «Dos familias, sin excepciones»;
- la fila de DESIGN de «Temas de la Obra» y la del material del Kit y del Lote;
- «Volver a las letras» y el salto del contenido al insertar el campo de filtro, que ya figuran en la fila de los Directorios.

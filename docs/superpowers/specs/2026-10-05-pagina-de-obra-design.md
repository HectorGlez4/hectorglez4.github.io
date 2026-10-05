---
title: 'La Obra tiene página — y es donde vivirá el enlace de compra'
created: 2026-10-05
status: diseño aprobado por Héctor el 2026-10-05 en cinco secciones; texto pendiente de su revisión
origen: >-
  Petición de Héctor del 2026-10-05 («páginas para las obras que den paso a los enlaces
  de afiliados»), cuatro preguntas de alcance y un panel de diseño de tres propuestas
  independientes juzgadas por tres lentes (espina, buscador, editor). Ganó por unanimidad
  la derivación con ficha-ancla; se le injertó el campo `formas` de otra propuesta.
---

# La Obra tiene página — y es donde vivirá el enlace de compra

Este documento es un diseño, no un artefacto BMad, y no sustituye a ninguno. Lo aprobado
aquí va a `bmad-prd`, `bmad-architecture`, `bmad-ux` y `bmad-create-epics-and-stories`, y
de ahí a `bmad-build` historia a historia. Nada de lo que sigue se escribe a mano en
`_bmad-output/`.

## 1. Lo que se pidió

Héctor quiere una Página de Obra con URL propia que haga tres cosas a la vez: captar
búsquedas por obra, ser el sitio donde vive el enlace de compra de esa obra, y dejar leer
juntas las Citas de una obra. Hoy la Obra **no es superficie**: AD-25 la deriva de
`procedencia.obra`, la aplazó como página propia con la condición «que las 35 Páginas de
Autor estén indexadas», y la Épica 17 solo la lista dentro de la Página de Autor.

Héctor la reabre a sabiendas, con la condición original sin cumplir (Autor indexado: 18
de 65). El diseño responde a eso midiendo la familia aparte y fijando un criterio de
parada (§7).

## 2. Decisiones tomadas el 2026-10-05

1. **La página es completa:** indexable, comercial y navegable.
2. **Toda obra con Citas publicadas tiene página**, sin umbral que la excluya, pero
   cuidando la doble indexación y la duplicación.
3. **La edición en venta la elige Héctor**, obra por obra, en una ficha versionada en
   `corpus/obras/`. Sin ficha con ediciones no hay enlace.
4. **Se planifica ahora y se construye después de las Historias 20.1–20.3**, para que la
   serie de indexación por familia pueda medir qué le pasa a la familia nueva. El enlace
   de compra nace apagado.
5. **Enfoque:** derivada, con ficha-ancla (§3).
6. **Regla de indexación:** al menos 2 Citas y menos del 90 % de las Citas de su Autor
   (§4).
7. **«Dónde leer esta obra» va al pie**, después de las Citas (§5).
8. **El enlace de compra vive solo en la Página de Obra**, debajo de la edición cotejada
   gratuita (§6).

## 3. Identidad, URL y ficha

**La identidad no cambia.** Una Obra es el par (Autor, forma canónica del título) con la
normalización única de AD-3, como dice AD-25. El ámbito es el Autor, nunca global.

**La URL tiene dos segmentos:** `/obra/{slug-autor}/{slug-obra}/`, y las páginas 2+
`/obra/{slug-autor}/{slug-obra}/{n}/`. El segmento de Autor hace explícito el ámbito —dos
Autores pueden tener unas «Odas»— y evita que una obra de título numérico se confunda con
una página del listado, la trampa que `src/lib/superficies.ts` ya documenta para Autor,
Tema y Colección. El constructor `rutaDeObra` vive con los otros cuatro.

**La ficha fija la URL (AD-4).** Cada Obra tiene un fichero
`corpus/obras/{slug-autor}--{slug-obra}.yml`. Su nombre se calcula una vez con
`slugDeObra` y **no se recalcula nunca**; el build casa ficha y Obra derivada por (Autor,
forma canónica), no por el nombre del fichero. Es la misma mecánica con la que Autor, Tema
y Colección ya cumplen AD-4. Una URL derivada del título en cada build es exactamente lo
que AD-4 prohíbe: corregir una tilde la movería.

La ficha mínima tiene tres campos:

- `autor` — referencia a `corpus/autores/`.
- `titulo` — la grafía que se publica en todo el sitio.
- `formas` — las formas canónicas de `procedencia.obra` que esta ficha reclama. Por
  omisión, solo la de su título.

Campos opcionales, que **solo escribe Héctor**:

- `ediciones` — las ediciones en venta (§6).
- `nota` — hasta 160 caracteres que describen la obra o su edición y no la califican. Es
  la única prosa propia de la página; §5 del PRD la admite porque la firma una persona.
  Un agente nunca la escribe.
- `distintaDe` — declara que dos títulos parecidos son obras distintas. Silencia el aviso
  de prefijo de AD-25 para ese par. Caso conocido: los dos «Proverbios y cantares» de
  Machado, que son dos secuencias distintas. Reunir las dos formas en las `formas` de una
  misma ficha también silencia el aviso: es la decisión contraria, escrita en el mismo
  sitio.

**Nadie escribe las fichas a mano.** `npm run obra -- registrar --todas` genera las 182
fichas mínimas para que Héctor revise el diff. Después, las órdenes que publican Citas
crean la ficha cuando llega una Obra nueva, sin decidir nada.

**Puertas del build:**

- Una Obra derivada sin ficha **rompe** la construcción, y el mensaje da la orden exacta
  que falta (patrón AD-1).
- Una ficha que no resuelve ninguna Cita publicada **avisa y no rompe** (patrón AD-18):
  retirar una Cita a `corpus/_revision/` no puede tumbar el build.
- Dos fichas no pueden reclamar la misma forma del mismo Autor: rompe.
- Se conserva la puerta ortográfica de AD-25: dos grafías de Citas que normalizan igual
  rompen, nombrando ficheros y formas. Hoy solo ocurre con «Respuesta a Sor/sor Filotea de
  la Cruz».

**Por qué `formas` y no reescribir Citas.** El documento de Fuente de una Cita se nombra a
partir del título de su obra: `documentoDeCita` en `tools/lib/cotejo.ts` llama a
`nombreDeDocumento(fuente.id, obra)`. Corregir `procedencia.obra` a mano deja a la Cita
sin documento y rompe el cotejo. Con `formas`, unir «Del sentimiento trágico de la
vida/I» con «Del sentimiento trágico de la vida», o reunir las 35 fábulas de Fedro bajo
una sola Obra, es editar una ficha: ninguna Cita ni ningún documento se mueven.

**Un solo título por Obra en todo el sitio.** La Atribución de la Página de Cita pasa a
mostrar el `titulo` de la ficha, enlazado a la Página de Obra. Hoy imprime el literal de
la Procedencia, que es por lo que se ve «/I». Es el mismo principio que DESIGN.md aplica
a la familia tipográfica: vestir la misma entidad de dos formas según dónde aparezca es
divergencia sin motivo.

## 4. Publicabilidad e indexación

**Existir y ser indexable son dos cosas.** Toda Obra con al menos una Cita publicada
**existe**: tiene URL, contenido, entra en `rutasPublicadas` y es alcanzable desde la
Atribución de sus Citas y desde la lista de obras de su Autor.

Es **indexable** —carácter `producto`: sitemap, sin `noindex`, índice de Pagefind— solo si
cumple las dos condiciones:

- **reúne al menos `MIN_CITAS_PARA_INDEXAR_OBRA = 2` Citas publicadas.** Una página con
  una sola tarjeta repite esa Cita y nada más, y competiría con su canónica (NFR-13);
- **sus Citas son menos del `MAX_PROPORCION_OBRA_DEL_AUTOR = 90 %` de las de su Autor.**
  Una Obra que es casi todo su Autor lista lo mismo que la Página de Autor con otra
  cabecera, y el buscador plegaría una en la otra.

Si falla cualquiera, es `servicio`: existe, lleva `noindex, follow`, queda fuera del
sitemap y de Pagefind, y entra en el barrido de accesibilidad. Es el mismo estado que ya
tienen las páginas 2+ de todo listado, aplicado por contenido en vez de por forma de ruta.

Medido sobre el Corpus del 2026-10-05:

| Regla | Indexables | Con `noindex` |
|---|---|---|
| ≥ 2 Citas y < 100 % del Autor | 84 | 98 |
| **≥ 2 Citas y < 90 % del Autor** (elegida) | **82** | **100** |
| ≥ 2 Citas y < 80 % del Autor | 80 | 102 |

De las 100 con `noindex`, 42 son la única obra de su Autor, unas 56 tienen una sola Cita
(35 de ellas, fábulas sueltas de Fedro) y 2 son casi-duplicados: «Reglas y consejos sobre
investigación científica» (109 de las 110 Citas de Cajal) y la «Respuesta a sor Filotea»
(21 de 23 de Sor Juana). Siguen indexables «Marco Bruto» (82 % de Quevedo) y el «Oráculo
manual» (70 % de Gracián): «frases del Oráculo manual» es otra búsqueda que «frases de
Gracián».

**La regla se corrige sola.** El día que Cervantes tenga una segunda obra con Citas, la
página del Quijote pasa a indexarse sin tocar nada. Si las fábulas de Fedro se reúnen con
`formas`, la cuenta cambia y la regla la recalcula.

**La canónica es siempre la propia.** Ninguna Página de Obra declara canónica a otra URL,
y la de cada Cita sigue siendo su Página de Cita (AD-19, FR-28). Las Citas se muestran
con `TarjetaDeCita`, recortadas, nunca íntegras.

**Dónde vive la regla, y la enmienda a AD-17.** Hoy la publicabilidad condicional existe
solo por expresión regular en `superficies.ts`, que es puro y no puede saber cuántas
Citas tiene una Obra. La regla por contenido pertenece al dueño del contenido (AD-11):
una función pura `esIndexable` en un módulo nuevo `src/lib/obras.ts`, con los dos números
en `src/lib/umbrales.ts` (AD-9). `superficies.ts` sigue siendo el único sitio donde una
superficie se declara y el único que convierte carácter en consecuencias: la Página de
Obra declara que parte de sus rutas son servicio por contenido, y `superficies.ts` recibe
ese conjunto como parámetro sin calcularlo. El filtro del sitemap, que es síncrono, lo
recibe de una integración de build que aplica la misma función pura, al patrón de las
integraciones de cotejo y de colecciones. Una prueba sobre `dist/` exige que el sitemap
anuncie exactamente las rutas sin `noindex`.

**Si aparecen duplicados, se baja el tope; nunca se parchea una página.** La serie de
indexación dirá si suben «Duplicada» o «Rastreada, no indexada» en la familia.

## 5. Contenido de la página y enlaces entrantes

**Bloques de la primera página, en orden:**

1. **Cabecera de Obra**, de tres líneas como máximo. El título en Inter —DESIGN.md ya
   fija que el título de una Obra nunca va en serif; hoy no hay token de titular en Inter
   y lo define la pasada de UX—. Debajo, «de {Autor}» enlazado a su Página de Autor. El
   año, solo si las Citas lo declaran y coinciden: hoy en 31 obras. Si discrepan, aviso en
   el build y se omite; nunca se infiere.
2. **Listado** con `TarjetaDeCita`, sin repetir el nombre del Autor, ordenado como en la
   Página de Autor y paginado a partir de `CITAS_POR_PAGINA`.
3. **Temas** que tocan sus Citas, como chips.
4. **«Dónde leer esta obra»**, al pie. Siempre muestra la Fuente cotejada con su licencia,
   enlazada cuando la obra tiene una sola URL de Fuente y nombrando cuántas páginas cuando
   tiene varias. Debajo, las ediciones en venta con el Modelo encendido (§6).
5. **La nota** de la ficha, si existe, en tinta apagada.

Las páginas 2+ llevan solo título, Autor y listado.

**No se compone prosa.** Ni sinopsis, ni contexto de la obra, ni adjetivos (§5 del PRD).
Todo sale de hechos derivados y plantillas fijas, la misma clase de texto que la
`description` de la Página de Autor. El título de pestaña y la `<meta description>` se
redactan en la pasada de UX, que decide también entre «frases» y «citas»: las consultas
medidas usan «frases» ocho veces y «citas» dos, y AGENTS.md veda «frase» en identificadores
pero no en microcopia.

**Lo que la distingue de la Página de Autor:** el sujeto es una obra, con su año, la
Fuente y licencia contra la que se cotejó el texto, los Temas de esa obra y dónde leerla
entera. Ninguno de esos datos está en la Página de Autor.

**Datos estructurados:** `CollectionPage` con `about` de tipo `CreativeWork` —no `Book`:
muchas obras del Corpus son poemas, fábulas, discursos o capítulos—, con `author` apuntando
al `@id` de la Persona de la Página de Autor, `datePublished` si hay año, y `mainEntity`
con la lista de Citas. La Página de Cita ya emite `isPartOf` con la obra; gana el mismo
`@id`, de modo que las dos hablan de la misma entidad. La Tarjeta Social de la Obra lleva
solo hechos («{n} citas de {Autor}, {año}»), nunca la nota (AD-28).

**Enlaces entrantes desde el primer día:** la Atribución de cada Página de Cita enlaza la
obra a su Página de Obra —cambia la regla «Procedencia no enlazada» de EXPERIENCE.md—, y
la lista de obras de la Página de Autor enlaza cada entrada. La familia recibe enlace
interno de 1.890 Citas sin depender del sitemap.

## 6. El enlace de compra, construido y apagado

**Un solo sitio.** El enlace vive en «Dónde leer esta obra», en la primera página de la
Página de Obra. No aparece en la Página de Cita ni en la lista de obras del Autor. Siempre
debajo de la edición cotejada gratuita, nunca en su lugar: el visitante ve la edición que
se verificó y, al lado, la que se puede comprar. Es la respuesta a la mitad editorial de
la pregunta 7 de §14 del PRD.

**Una línea por edición**, en el orden de la ficha: «Edición impresa en {tienda}», con la
declaración comercial en la misma línea —«Enlace de afiliado: si compras, el sitio recibe
una comisión sin coste para ti»— y `rel="sponsored noopener"`. Todo dentro de un único
elemento `data-ingreso="afiliacion-de-libros"`, con la presentación en atributos `style`:
la lección de `Sostener.astro` es que un bloque `<style>` emitiría su regla con el Modelo
apagado.

**De dónde sale cada dato:**

- **La ficha** declara `ediciones: [{ tienda, url, descripcion? }]`: la tienda, la URL
  limpia del producto y, si se quiere, «Cátedra, 2015». La elige Héctor.
- **La etiqueta de afiliado es del Modelo, no de la obra.** Un conjunto cerrado `TIENDAS`
  —nombre, dominio, etiqueta— vive junto al Modelo en `src/lib/ingreso.ts`, y una función
  pura compone la URL final en el build. La orden rechaza una URL de otro dominio o que ya
  traiga una etiqueta pegada.
- **Varias tiendas.** El público del canal está en México, Colombia y Perú, y Amazon
  Afiliados no existe en Colombia ni en Perú. Qué tiendas entran lo decide Héctor cuando
  llegue la historia; añadir una es un diff. La única condición es AD-20: la tienda da una
  URL, nunca un guion.

**Apagado, invisible y no latente (UX-DR35).** Sin línea, hueco, contenedor ni CSS. La
página se construye idéntica con y sin `ediciones` en las fichas, y
`tests/unit/ingreso-construido.test.ts` ya lo vigila sobre `dist/`.

**Cambios en `src/lib/ingreso.ts`:** `admitidoEn` de `afiliacion-de-libros` pasa de `[]`
a la Página de Obra **ahora**, con `encendido: false`; su comentario —«falta decidir qué
edición»— se reescribe, porque la decide la ficha. `revisarDeclaracionDeIngreso`, que hoy
exige un `destino` a todo Modelo encendido, acepta para este las tiendas.

**El orden de los actos, por la cuenta que ya se cerró.** El Umbral sigue disparando
*solicitar* la cuenta, no encender. Las ediciones se curan **antes** de solicitarla,
porque el reloj de 3 ventas en 180 días empieza ahí. El día del encendido se repiten los
dos requisitos de las donaciones: abrir cada URL y correr el barrido de accesibilidad con
el Modelo encendido (DESPLIEGUE.md §4). Para empezar basta con las indexables que más
Citas tienen, como «Marco Bruto», el «Oráculo manual» o «La mujer del porvenir». Ojo: el
Quijote es la única obra de Cervantes en el Corpus y queda con `noindex`, así que su enlace
de compra no tendría tráfico de buscador hasta que Cervantes tenga una segunda obra.

**Repositorio público.** Las etiquetas de afiliado quedarán visibles en él. No son
secretos, pero se dice antes de escribir la primera.

## 7. Medición

La familia Obra se mide aparte desde el primer despliegue:

- **Serie de indexación:** `obra` entra como quinta familia en `FAMILIAS` y en
  `censoPorFamilia`, **contando solo las indexables**. Una página con `noindex` no puede
  indexarse, y contarla fabricaría un cero.
- **Vista de superficie (20.1):** la Página de Obra emite `vista-de-superficie`.
- **Series de tráfico y demanda (20.2, 20.3):** reconocen la familia por el censo.
- **`lastmod` y aviso (18.4, 16.2):** el mapeo de fichero a rutas añade la ficha y los
  ficheros de sus Citas a la ruta de la Obra.

**Criterio de parada:** si a las 8 semanas del primer despliegue la proporción indexada de
la familia Obra es peor que la de Autor, no se añade nada más a la familia hasta entender
por qué.

## 8. Qué cambia en cada artefacto

Cada pasada por su skill y en su commit, antes de la primera historia:

- **`bmad-prd`.** Glosario: «Obra» deja de ser solo derivada sin página; entra «Ficha de
  Obra». Feature nueva con cuatro FR: la Página de Obra, la regla de indexación por
  contenido, la ficha que fija la URL, y «Dónde leer esta obra». Enmiendas: FR-35 (el
  enlace vive en la Página de Obra, edición por ficha, varias tiendas, declaración en la
  misma línea), FR-42 (cada entrada de la lista enlaza a la Página de Obra) y FR-43 (la
  superficie de la afiliación pasa a ser la Página de Obra). §5: «no componemos sinopsis
  de una obra». §6: alcance nuevo. §14.7: contestada en su mitad editorial; la viabilidad
  sigue abierta.
- **`bmad-architecture`.** AD-25 reescrito: la Obra es superficie, con ficha-ancla,
  `formas`, `distintaDe` y publicabilidad por contenido; conserva la identidad y la puerta
  ortográfica. AD-17 enmendado: una superficie puede ser servicio por contenido; la regla
  vive en el dueño del contenido y `superficies.ts` la recibe sin calcularla. Deferred: se
  retira «la Obra como superficie propia» y se registra la reapertura con su condición
  original sin cumplir; se añade la redirección de una Obra retirada (condición: la
  primera Página de Obra indexada). Menciones en AD-11, AD-19, AD-20, AD-24 y AD-27, y en
  la Structural Seed.
- **`bmad-ux`.** EXPERIENCE.md: la Página de Obra en la arquitectura de información; los
  patrones «Cabecera de Obra» y «Dónde leer esta obra»; la Atribución enlaza la obra;
  estados de Obra con `noindex`. DESIGN.md: un token de titular en Inter. Y la redacción
  del título de pestaña, con la decisión entre «frases» y «citas».
- **`bmad-create-epics-and-stories`.** Una épica nueva con las historias de §9. La 17.3 se
  reduce a consumir la derivación y enlazar con `rutaDeObra`.
- **`bmad-sprint-planning`.** La épica entra en el tablero detrás de 20.1–20.3.
- **`bmad-project-context`.** AGENTS.md gana «Registrar y curar una Obra»: las órdenes,
  que el nombre de la ficha es la URL y no se renombra, que `ediciones` y `nota` son de
  Héctor, y que la etiqueta de afiliado va en el Modelo, nunca en la URL de la ficha.

## 9. Historias, en orden de construcción

1. **Commit de corpus:** unificar la grafía de «Respuesta a Sor/sor Filotea de la Cruz».
   Es lo único que se toca en Citas, y va antes porque la puerta ortográfica rompería.
2. **La Obra se deriva y la puerta corre en el build.** `src/lib/obras.ts` puro —identidad,
   Citas, año, Fuente, Temas; grafías rompen, prefijos avisan— ejecutado sobre el Corpus
   entero desde una integración de build. Todavía sin página.
3. **La ficha fija la URL.** Colección `obras` con esquema, `formas` y `distintaDe`; las
   puertas de §3; `tools/obra.ts registrar|listar|estado|retirar`; la ficha se crea al
   publicar una Cita con Obra nueva. *De Héctor:* revisar el diff de las 182 fichas, y
   decidir sobre «/I» de Unamuno, las fábulas de Fedro y los dos «Proverbios y cantares».
4. **La regla de indexación por contenido.** Los dos umbrales, `esIndexable`, la enmienda
   de AD-17 en `superficies.ts`, el sitemap que recibe el conjunto, y la prueba sobre
   `dist/`.
5. **La Página de Obra existe y se alcanza.** La página, la Atribución enlazada, los datos
   estructurados, el tipo `obra` en el buscador interno, `vista-de-superficie` y la Tarjeta
   Social. El barrido de accesibilidad la cubre por la declaración.
6. **La lista de obras del Autor enlaza a la Obra** (la 17.3, reducida).
7. **La familia se mide.** `lastmod`, aviso, rastreo y las tres series. *De Héctor:* una
   lectura de indexación tras el primer despliegue y otra a las 6 semanas.
8. **Ediciones en venta, construidas y apagadas.** `TIENDAS`, la composición de la URL,
   `tools/obra.ts edicion`, el bloque bajo `data-ingreso`, `admitidoEn`, y la construcción
   en los dos estados. *De Héctor:* elegir las tiendas y curar las primeras ediciones.

**Fuera de la épica, todo de Héctor:** solicitar la cuenta con las ediciones curadas,
encender con un commit, abrir cada URL y correr el barrido con el Modelo encendido.

## 10. Riesgos

- **Se reabre contra la condición de AD-25** (Autor indexado: 18 de 65). Las 82 URL
  indexables pueden no moverse. Lo acota la medición aparte y el criterio de parada de §7.
- **Duplicación residual** en obras que dominan a su Autor sin pasar del 90 %: «Marco
  Bruto» es el 82 % de Quevedo y el «Oráculo manual» el 70 % de Gracián. Se vigila en la
  serie; si sube «Duplicada», se baja el tope.
- **Dos lectores de la misma regla** —la página y la integración del sitemap—. Si divergen,
  el sitemap anuncia una página con `noindex`. Lo cierra la prueba sobre `dist/`.
- **Una Obra fusionada después de indexada deja un 404.** Las colisiones conocidas se
  resuelven antes del primer build con `/obra/`, y la redirección queda aplazada con
  condición.
- **La viabilidad comercial sigue abierta:** geografía del programa, reloj de 180 días, y
  la edición gratuita al lado baja la conversión a propósito. La página se construye por
  su valor propio y no depende de que el enlace llegue.
- **La nota puede derivar hacia la sinopsis** que §5 prohíbe. Lo acotan el tope de 160
  caracteres, que solo la escribe Héctor, y que la Tarjeta Social no la usa.
- **La 17.3 pasa a depender de las historias 2 y 3.** Si la épica se retrasa, la lista de
  obras del Autor se retrasa con ella.

## 11. Lo que este diseño no decide

- Qué tiendas entran en `TIENDAS` y si tienen programa en México, Colombia y Perú.
- La redacción del título de pestaña y la elección entre «frases» y «citas» (`bmad-ux`).
- Si las fábulas de Fedro se reúnen bajo una Obra, y cómo se titula.
- Cuándo se solicita la cuenta de afiliado.
- La redirección de una Obra retirada, hasta que se cumpla su condición.

## 12. Ruta

1. Héctor revisa este texto. Se commitea aparte, antes de cualquier historia.
2. `bmad-prd`, `bmad-architecture` y `bmad-ux`, cada una en su commit, con §8 como
   entrada.
3. `bmad-create-epics-and-stories` escribe la épica con sus criterios de aceptación;
   `bmad-sprint-planning` la pone en el tablero detrás de 20.1–20.3.
4. `bmad-build`, historia a historia, cuando 20.1–20.3 estén hechas.

## Apéndice: alternativas consideradas

- **Ficha como puerta de publicación.** Sin ficha no hay página, y la Obra única de un
  Autor no tiene URL propia. Era la más limpia para AD-17, pero deja sin página al Quijote,
  a El Criterio y a las Odas, contra la decisión 2. Dos de tres jueces la descalificaron
  por eso.
- **Derivada sin ficha, con canónica hacia la Cita o el Autor.** No pide curar nada, pero
  recalcula la URL del título en cada build, contra AD-4, y trata la duplicación con una
  canónica que el buscador puede ignorar: 98 páginas indexables y duplicadas. Se rescató de
  ella la observación del acoplamiento entre el título y el nombre del documento de Fuente,
  que es lo que justifica `formas`.

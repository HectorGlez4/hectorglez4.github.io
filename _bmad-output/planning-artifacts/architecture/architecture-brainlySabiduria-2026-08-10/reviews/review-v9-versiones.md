# Revisión de la v9 — contraste con la realidad (versiones y tecnología externa)

Fecha: 2026-11-03. Alcance: las partes v9 de `ARCHITECTURE-SPINE.md` (AD-29, AD-30, AD-31 y los «Enmendado en la v9») que descansan en tecnología externa o en la forma de los ficheros del proyecto. Solo lectura; lo único escrito es este fichero.

**Veredicto global:** las afirmaciones sobre Wikidata, Pagefind, el código y Amazon se sostienen; lo que no se sostiene es la forma que AD-29 y AD-30 suponen en los documentos de `corpus/fuentes/`: la definición de párrafo/estrofa y la restitución de saltos fallan en una parte medible del Corpus y hay que corregirlas antes de construir.

| # | Tema | Veredicto |
|---|------|-----------|
| 1 | Wikidata: revisión fija, propiedades, precisión, CC0 | **confirmado**, con dos precisiones (P407 y rangos) |
| 2 | Pagefind 1.5: `ignore="all"` y espacios | **confirmado** |
| 3 | Reparto por `\s+` y plegado de `\s` en el código | **confirmado**, con una precisión (desplazamientos) |
| 4 | Párrafo = bloque de líneas no vacías | **corregir** |
| 5 | Amazon: 3 ventas en 180 días; Creators API 10 en 30 | **confirmado** |

---

## 1. Wikidata (AD-31)

**Revisión fija como JSON.** Confirmado. `Special:EntityData/Q{ID}.json?revision=N` está documentado en Wikidata:Data_access («You can request specific revisions of an entity with the `revision` query parameter»). Prueba real del 2026-11-03 sobre Q480 (*Don Quijote*): se pidió la revisión 2547995236 (no la última, que es 2558010319); dos descargas dieron bytes idénticos y el JSON trae `lastrevid: 2547995236` y `modified: 2026-09-20T18:44:57Z`, los de la revisión pedida, no los de hoy. La API `action=query&prop=revisions` da los `revid` con su `timestamp`.

- Inmutabilidad: una revisión de MediaWiki no se edita; RevisionDelete solo **oculta** contenido, resumen o usuario, y es reversible. Una revisión ocultada dejaría de descargarse, no cambiaría: no afecta a un documento ya versionado. La página de acceso avisa de que esos puntos de acceso «are not guaranteed to be stable interfaces», y el formato JSON es «reasonably stable» bajo la Stable Interface Policy: irrelevante para el build, que lee el fichero versionado y no la red (AD-22), pero el extractor de `tools/lib/` debería aceptar la forma documentada y fallar nombrando el fichero ante otra.
- **Precisión 1 — la propiedad de lengua.** La espina no nombra identificadores (bien). Si la historia usa P364, se equivoca: P364 es «original language of film or TV show», y su descripción dice textualmente «Deprecated for written works and songs; use P407 ("language of work or name") instead». Para una obra literaria la lengua es **P407**. Q480 la trae con P407 (`Q5364419`, «español medio») y además un P407 `Q1321` («español») con rango **deprecated**.
- **Precisión 2 — los rangos.** Las declaraciones llevan `rank` (`preferred`, `normal`, `deprecated`). AD-31 dice «un único valor»; tiene que decir qué valores cuentan: los no `deprecated` y, si hay `preferred`, solo esos (la regla de los clientes de Wikibase). Sin eso, Q480 tendría dos lenguas y la regla dejaría la lengua en blanco por un valor que Wikidata da por equivocado.
- P50 «author» («use on works, not humans»), P136 «genre» y P577 «publication date» son los que dicen ser. Q480 trae **cuatro** P136 (p. ej. `Q1159457`, «novela de caballerías») y **dos** P577 (`+1605-00-00`, `+1615-00-00`, precisión 9): con la regla de AD-31 el Quijote no tendría año, y eso es lo que pide la pregunta 13; la regla del género (¿todos?, ¿uno?) no la fija la espina y conviene decirla.
- Precisión del tiempo: 7 siglo, 8 década, **9 año**, 10 mes, 11 día (12–14 sin uso). «Precisión de año o mejor» = `precision >= 9`. Confirmado. El calendario (`calendarmodel`, Q1985727 gregoriano proléptico o Q1985786 juliano) no cambia el año para precisión 9 en obras de la Edad Moderna, pero el extractor debería leer el año de la cadena `time` sin convertir de calendario.
- La revisión de una obra trae solo identificadores (`Q5682`, `Q1159457`); las etiquetas en español hay que sacarlas de la revisión de cada entidad referida: confirma la necesidad de `vigentes.yml`.
- Licencia: los datos estructurados de los espacios principal y de propiedades están «available under the Creative Commons CC0 License». Confirmado.

Fuentes: https://www.wikidata.org/wiki/Wikidata:Data_access · https://doc.wikimedia.org/Wikibase/master/php/docs_topics_json.html · https://www.mediawiki.org/wiki/Help:RevisionDelete · https://www.wikidata.org/wiki/Property:P364 · https://www.wikidata.org/wiki/Property:P407 · https://www.wikidata.org/wiki/Property:P50 · https://www.wikidata.org/wiki/Property:P136 · https://www.wikidata.org/wiki/Property:P577 · https://www.wikidata.org/wiki/Special:EntityData/Q480.json?revision=2547995236 (etiquetas y descripciones leídas por `wbgetentities` el 2026-11-03).

## 2. Pagefind 1.5 (AD-17, AD-29, AD-30)

Confirmado. La documentación de indexado: `data-pagefind-ignore` (o `="index"`) excluye el texto «while still processing filters and metadata within the element»; `="all"` «will exclude the element and its children from all processing», filtros y metadatos incluidos. Es lo que la espina exige para pasaje, incipit y bloques que enumeran.

Saltos y espacios: en el analizador de la 1.5.1 (`src/fossick/parser.rs`) `SPACE_SELECTORS = ["br"]` empuja un espacio al abrir un `<br>`, así que dos versos separados por `<br>` no se funden en una palabra; el texto se copia en crudo y el espacio repetido se normaliza después (`normalize_content`). Un `\n` en el texto o un `<br>` dan la misma palabra separada: la búsqueda no cambia con los saltos. Confirmado, con la reserva de que `normalize_content` (en `mod.rs`) no se leyó línea a línea; la prueba de búsqueda sobre `dist/` que la espina ya prevé lo fija.

Fuentes: https://pagefind.app/docs/indexing/ · https://docs.rs/crate/pagefind/1.5.1/source/src/fossick/parser.rs

## 3. El reparto en líneas y el plegado de espacios (código)

Confirmado contra el árbol:

- `src/lib/lienzo.ts:108` y `:136` hacen `texto.split(/\s+/)`; `public/islas/imagen.js:38`, `texto.split(/\s+/)`. Un `\n` se pierde en los dos: lo que dice el «Prevents» de AD-29 es cierto.
- `tools/lib/cotejo.ts:53`, `colapsarEspacios`: `texto.replace(INVISIBLES, '').replace(/\s+/gu, ' ').trim()`; `src/lib/normalizar.ts:39`, `.replace(/\s+/gu, ' ')`. El salto se pliega como espacio en el cotejo y en la forma canónica: lo que dice AD-29 de cotejo, duplicados y slug es cierto.

**Precisión.** `localizar` devuelve la posición en el **cuerpo colapsado** (tipo marcado `Colapsado`). AD-30 pide un pasaje que sea «un trozo literal del documento, con sus saltos», y AD-29 restituye saltos con «el tramo que da el mismo localizador». Las dos cosas necesitan pasar del desplazamiento colapsado al del texto crudo; la espina debería decir que ese mapa sale de la misma función que colapsa (un solo dueño), no de una segunda búsqueda sobre el crudo.

## 4. La forma de los documentos de `corpus/fuentes/` (AD-30, y AD-29 por extensión) — corregir

Muestreo completo de los 1.426 documentos (267 Gutenberg, 1.159 Wikisource) el 2026-11-03, tomando el cuerpo tras la última línea `---` de la cabecera. Hay **tres formas distintas**, no una:

1. **Gutenberg, prosa envuelta a ~72 columnas** con párrafos separados por línea en blanco (263 de 267; p. ej. `gutenberg--a-flor-de-piel-frases.txt`, `gutenberg--7-de-julio.txt`, línea máxima 134). Aquí «párrafo = bloque de líneas no vacías» **se cumple**. Pero los saltos interiores son **del envuelto, no del autor**.
2. **Wikisource, un párrafo por línea** con línea en blanco entre párrafos (unos 740; líneas de hasta 1.700 caracteres). La definición se cumple.
3. **Wikisource en verso con una línea en blanco entre cada verso** (unos 143 documentos, p. ej. `wikisource-es--a-cordoba.txt`, el soneto de Góngora: cada verso es su propio bloque y los cuartetos no se distinguen de los tercetos). Aquí «en verso, la estrofa» **no se cumple**: el bloque es el verso. Otros poemas sí traen la estrofa como bloque (`wikisource-es--a-una-nariz.txt`), así que conviven las dos formas.

Y una cuarta, minoritaria pero real: **párrafos contiguos sin línea en blanco** en 213 documentos (15 %; p. ej. `wikisource-es--la-conquista-del-pan.txt`, 606 pares de líneas largas seguidas; `wikisource-es--plenitud--plenitud-v-el-signo.txt`, todo el cuerpo en un bloque). Ahí un «bloque» abarca varios párrafos.

Cifras de bloques sobre los 495.120 del Corpus (longitud colapsada): mediana 143, p90 770, p99 2.194; **21.690 bloques pasan de 1.200 caracteres**, así que con el tope `[ASSUMPTION]` de 1.200 parte de las Citas de prosa larga no tendrán pasaje, sobre todo en los documentos de la cuarta forma.

Consecuencias que la espina tiene que recoger:

- **AD-30.** La definición de párrafo no es una sola regla sobre el texto plano tal como está: o la función única de `tools/lib/` reconoce las formas (verso con blanco entre versos, párrafo por línea, envuelto), o la forma se declara por documento en la cabecera al recuperar, que es quien sabe de dónde salió el texto (`tools/lib/documento.ts` ya distingue `<div class="poem">`). Tal como está, en el verso de la forma 3 el «pasaje» de una Cita de un verso es la propia Cita, y la regla «si coincide con la Cita colapsada, no hay pasaje» lo deja sin pasaje; en los de la forma 4 el pasaje es un trozo de varios párrafos, a menudo por encima del tope.
- **AD-29 (restitución).** «Toma del documento el tramo … y solo cambia espacios por saltos» **metería en las Citas en prosa de Gutenberg los saltos del envuelto a 72 columnas**, que la regla «una Cita sin documento, o cuyo documento no trae los saltos, no cambia» no excluye: el documento sí trae saltos. Y en la forma 3 el tramo trae `\n\n` entre versos, que la propia AD-29 prohíbe («ninguna línea vacía dentro de una Cita»). La restitución tiene que limitarse a documentos declarados en verso y convertir cualquier tramo de espacio con salto en un solo `\n`; la comprobación «colapsado idéntico antes y después» no detecta ninguno de los dos errores, porque los dos colapsan igual.

Fuente: el propio Corpus (`corpus/fuentes/`, recuento con un guion de solo lectura el 2026-11-03).

## 5. Amazon Afiliados (FR-35, AD-20 v9)

- **3 ventas cualificadas en 180 días.** Confirmado por la ayuda oficial: tras solicitar hay 180 días para referir ventas; con tres ventas cualificadas se revisa la solicitud, y la solicitud «can be withdrawn if there were not enough qualifying sales for 180 days after your application was submitted», sin reponer la cuenta ni el ID. El PRD dice «en los 180 días siguientes a la solicitud»: coincide. Se comprobó en `amazon.com` (y aparece igual en `associates.amazon.ca`); para `amazon.es` no se leyó su página, aunque el PRD solo afirma que es un programa aparte con su propio plazo.
- **Creators API, sucesora de la PA-API, con 10 ventas en 30 días.** Confirmado: la introducción oficial pide «at least 10 qualifying sales within the past 30 days to access the PA API through the Creators API», y el aviso de retirada dice que la PA-API 5 «has been deprecated and is being replaced by the Creators API» y que quien siga llamándola recibe 403. La fecha exacta del cierre no consta en esa página (fuentes de terceros dan 30 de abril o 15 de mayo de 2026); el PRD no la cita, así que no hay nada que corregir.

Fuentes: https://affiliate-program.amazon.com/help/node/topic/G8TW5AE9XL2VX9VM · https://affiliate-program.amazon.com/help/node/topic/G7MJTPEP9NC3YKMG · https://affiliate-program.amazon.com/creatorsapi/docs/en-us/introduction · https://affiliate-program.amazon.com/creatorsapi/docs/en-us/paapiv5-deprecation

---

## Qué corregir, en una línea cada uno

1. AD-30: «párrafo = bloque de líneas no vacías» no vale para el verso de Wikisource con blanco entre versos (~143 documentos) ni para los 213 con párrafos contiguos sin blanco; la forma tiene que declararse por documento o reconocerse en la función única.
2. AD-29: la restitución de saltos metería los saltos del envuelto a 72 columnas de Gutenberg en Citas en prosa y `\n\n` entre versos de Wikisource; limitarla a documentos en verso y reducir cada salto a un solo `\n`, porque la comprobación por texto colapsado no detecta ninguno de los dos.
3. AD-31: decir que solo cuentan las declaraciones no `deprecated` (y las `preferred`, si las hay), y que la lengua de una obra escrita es P407, no P364 (en desuso para obras escritas); fijar también qué se hace con varios géneros.
4. AD-29/AD-30 (precisión): el pasaje y la restitución necesitan pasar del desplazamiento colapsado de `localizar` al del texto crudo; ese mapa tiene que salir del mismo dueño que colapsa.

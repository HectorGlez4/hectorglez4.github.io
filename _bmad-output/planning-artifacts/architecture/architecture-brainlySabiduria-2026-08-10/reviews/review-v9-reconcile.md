# Revisión v9 — reconciliación de entrada (PRD v9 → espina v9)

- **Fecha:** 2026-11-03
- **Objeto:** `ARCHITECTURE-SPINE.md`, cambios marcados *(v9)*: AD-29, AD-30, AD-31 nuevos; enmiendas a AD-3, AD-8, AD-13, AD-20, AD-23, AD-24, AD-25, AD-27, AD-28; mapa de capacidades y Deferred.
- **Entrada:** `prd.md` §4.22 (FR-57…FR-62), §4.23 (FR-63, FR-64), FR-10, FR-35, §6.8, §14 (preguntas 11–17), §15 (supuestos v9).
- **Método:** cada consecuencia verificable del PRD v9 que tiene dimensión de arquitectura (quién es su dueño, dónde vive, qué invariante impide que dos unidades diverjan) se busca en la espina. Se ignoran las decisiones visuales que el PRD delega en UX (variante de Chicago, topes de FR-64, orden de bloques, ancho de columna, acciones en fila). Se contrastaron dos hechos con el código del checkout principal: el formato de `corpus/fuentes/` y la Tarjeta Social actual.

## Veredicto

**CONCERNS.** La espina aterriza el esqueleto de la v9 con buen criterio: un solo localizador para pasaje y orden (AD-30), el salto como U+000A con una sola traducción a « / » (AD-29), revisiones fijas de Wikidata con `vigentes.yml` (AD-31), la banda reservada del dominio (AD-8), los dos eventos retenidos en `PENDIENTES` (AD-13), la clave revisada como condición para invertir el nombre (AD-28) y la fecha de consulta del cliente (AD-28, AD-12). Pero hay **un hueco de fondo** que rompe tres FR a la vez —la espina no distingue el salto de verso del salto de maquetación de la Fuente—, **una contradicción** directa con §6.8 sobre quién declara las tiendas, y varias consecuencias calladas de FR-62, FR-58 y FR-59 que no tienen dueño o tienen dos.

## Hallazgos, por gravedad

### A. Bloqueantes o de fondo

**A1. El salto de verso y el salto de maquetación son indistinguibles (FR-63, FR-59, FR-61 → AD-29, AD-30).**
AD-29 restituye los saltos tomando «del documento de la Cita el tramo que da el mismo localizador y solo cambia espacios por saltos»; AD-30 publica el pasaje como «trozo literal del documento, con sus saltos» y corta el incipit «en fin de frase o de verso». Los 268 documentos de Gutenberg del Corpus están **partidos a ~70 columnas** (comprobado en `corpus/fuentes/gutenberg--7-de-julio.txt`): cada fin de línea es maquetación, no verso. Aplicada tal cual, la restitución convertiría en verso toda Cita en prosa de Gutenberg, el pasaje se pintaría con cortes arbitrarios y el incipit cortaría «en fin de verso» a media frase, que es justo lo que FR-61 y NFR-12 vedan. El PRD lo dice para el verso («Una Cita en verso se lee en sus versos»), y su supuesto de §15 («Los de Wikisource los traen; los de otras Fuentes no se han mirado») es exactamente el punto que la arquitectura tenía que cerrar. Falta una regla con dueño: **qué saltos de un documento son de verso** —por Fuente declarada (Wikisource sí, Gutenberg no salvo marca), por declaración del documento, o por una función única de `tools/lib/` que despliegue los párrafos de prosa antes de localizar—, usada a la vez por la restitución, el pasaje y el incipit. Sin ella, las tres unidades divergen o fallan juntas.

**A2. Declarar las tiendas es un acto de Héctor, y la espina lo da a una historia (FR-35, §6.8 → AD-20).**
AD-20 v9 añade un `[ASSUMPTION]`: «Los demás campos de la tienda —clave, nombre, dominio y parámetro…— los puede escribir una historia». §6.8, «Los actos de Héctor, que no son construcción», abre con «declarar las tiendas, todavía sin marca», y FR-35 «Afiliación sin reloj» lo pone entre lo que se hace ya, no entre lo que construye una historia. Además `AGENTS.md` dice «ningún agente escribe una tienda ni una marca». El supuesto contradice el PRD; debe retirarse, o subirse como pregunta a Héctor en vez de resolverse en la espina.

### B. No aterrizado

**B1. FR-62: la orden no filtra por edición cotejada ni da sus columnas (→ AD-24).**
La enmienda de AD-24 fija lectura sin escritura, cota inferior, «sin cifra» y congelación, pero omite:
- «No pone en la lista ninguna Obra sin edición cotejada como lista para curar» (FR-54). La espina dice «cada Obra sale "sin cifra"»; el PRD, «lista las Obras **con edición cotejada**». La derivación de «tiene edición cotejada» ya tiene dueño (`obras.ts`, AD-20 v7.1): la orden debe consumirla, no recalcularla, y la espina no lo dice.
- De cada Obra: si tiene edición cotejada, cuántas ediciones declara su ficha y si su familia está congelada.
- La demanda «de sus Citas **y la de su página**». La espina define la demanda como «la suma de la de sus Citas» como regla, no como estado transitorio hasta que la familia Obra entre en la serie (§6.7); y la orden tiene que decir que es solo de Citas.
- La resolución Cita → Obra en `tools/` debe pasar por `resolverObras` (AD-25), y una Cita retirada que sigue en la serie no tiene Obra resoluble: no se dice adónde va.

**B2. «Cómo citar» en la Página de Obra no tiene isla ni regla de edición (FR-58 → AD-28, AD-6).**
- AD-28 pone la fecha de consulta en «la isla de copiar que ya existe». Esa isla es un guion en línea de `src/pages/cita/[slug].astro`; **la Página de Obra no tiene ninguna isla de copiar** (tiene la de compartir). La página 1 de Obra necesita copiar tres Referencias y fecharlas: o una isla nueva en esa superficie, con su tope medido (AD-6) y su lugar en la prueba de `ingreso-construido` (la Obra admite afiliación), o la extensión de la de compartir. El `[ASSUMPTION]` de «no hace falta isla nueva» solo mira la Página de Cita.
- La Referencia de una **Obra** (no de una Cita) usa «el traductor y su año, si su Fuente los declara» y «la edición cotejada». Una Obra puede tener varias Fuentes y varios traductores. La espina compone las tres «con los campos de Fuente de la Cita» y no dice de qué Cita o qué Fuente en la de Obra. Debe atarse a la misma regla que «Dónde leer esta obra» (Fuente que más Citas aporta, AD-23) y, con traducciones discrepantes, omitirse, nunca elegir.
- Que sea **solo la página 1** de la Obra no consta.

**B3. El pasaje cambia sin fechar (FR-59, FR-47 → AD-27, AD-30).**
AD-30 hace que `obras.ts` elija la aparición «que cuenta —la misma que ordena—», y esa elección depende de la Fuente que **más Citas aporta** a la Obra (AD-23). Una Cita hermana nueva de otra Fuente puede cambiar qué Fuente gana y, con ella, el pasaje de una Página de Cita que no se tocó. AD-27 v9 compone en la Página de Cita «sus documentos», no las hermanas, que siguen siendo navegación por la excepción de FR-47. El PRD dice que «el pasaje es texto que la página afirma, no navegación»: el texto afirmado cambia y ni el `lastmod` ni el aviso lo saben. Hace falta o bien elegir la aparición del pasaje sin depender de hermanas (p. ej. por la Fuente propia de la Cita, la de su Procedencia), o bien componer en la relación lo que decide esa elección. Lo mismo vale, en menor grado, para el traductor de la Ficha técnica (AD-31) si se elige por la Fuente dominante.

**B4. El lector del cuerpo de los documentos: dos reglas que se contradicen y una sin dueño (FR-59, FR-61 → AD-23, AD-30).**
- AD-23 v8, sin enmendar, dice que el cargador de posiciones guarda las apariciones «sin ordenarlas ni elegir, **y nunca el texto**». AD-30 le hace entregar el pasaje. La cláusula de AD-23 tiene que enmendarse o una prueba existente la defenderá contra la v9.
- AD-30: «Nadie más lee el cuerpo de un documento para publicarlo», pero el incipit lo exige y la espina no dice quién lo extrae: qué cargador lee `incipit.documento` desde `desde`, con qué función de corte y bajo qué excepción a «`src/` no importa de `tools/lib/`» (AD-31 dice que la de Wikidata es la *segunda* excepción, con la de posiciones; el incipit sería una tercera o va dentro de la de posiciones, y no se dice).

**B5. La búsqueda con saltos: la garantía se apoya en algo que Pagefind no usa (FR-63, FR-7 → AD-29).**
AD-29 afirma que con saltos «el veredicto del cotejo, la detección de duplicados, **Pagefind** y el slug son los mismos», porque `colapsarEspacios` y `normalizar` pliegan el salto. Pagefind no pasa por `normalizar.ts`: indexa el HTML renderizado. Que «partes,» y «Y» sigan siendo dos palabras depende de **cómo se pinte el salto en el HTML**, y eso la espina no lo fija (véase B6). Falta la invariante —y la prueba de búsqueda sobre `dist/`, que ya existe para el tipo de resultado— de que una Cita con saltos se encuentra por las palabras a cada lado del salto.

**B6. Cómo se pinta el salto en el HTML no tiene dueño (FR-63 → AD-29).**
AD-29 cubre almacenamiento (U+000A), lienzo (`lienzo.ts`, `imagen.js`), salidas de una línea (« / ») y el Fragmento (`<br>`). No dice cómo lo pintan la Página de Cita, el `BloqueDeCita` de portada y 404, la Tarjeta de Cita de los listados, el pasaje y el incipit: `white-space: pre-line` en un componente y `<br>` en otro es exactamente la divergencia que su «Prevents» nombra («una unidad… con `<br>`»). Basta una regla: una sola forma en HTML, de un solo dueño, y una prueba sobre `dist/`.

### C. Aterrizado a medias

| Consecuencia del PRD | Dónde debía | Estado | Qué falta |
|---|---|---|---|
| FR-57 «Sin JavaScript el fragmento se lee y se selecciona en la página» | AD-28, AD-6 | Parcial | La espina dice que el Fragmento es HTML compuesto en el build y escapado, pero no que su **código** esté en el HTML inicial como texto seleccionable (p. ej. `<pre>`/`<textarea readonly>`). Si además se pinta una vista previa con su `<a>` a la canónica dentro de `<main>`, ese enlace necesita zona o exención (AD-13), y una exención nueva es de Héctor (UX-DR111): la espina debería decir que la vista previa, si la hay, no lleva enlace vivo o qué zona lleva. |
| FR-57 «Una Cita que no cabe en ningún límite… se ofrece igual» | AD-8, AD-28 | Implícito | No se dice que el Fragmento no se ata al corte de `tramos.ts` («incluido el corte que oculta la acción», AD-8). Una línea lo evita. |
| FR-58 «la forma que el estilo da al verso» (FR-63) | AD-29 | Parcial | Una sola función da « / » a las tres Referencias. Vale si los tres estilos coinciden; MLA marca el cambio de estrofa con « // », y AD-29 prohíbe línea vacía dentro de una Cita, así que una Cita que cruza estrofas pierde ese corte en todas partes. Decidir si una Cita puede cruzar estrofa y, si sí, cómo se guarda el corte. |
| FR-58 invertir «apellido e iniciales» con la clave revisada | AD-28 | Parcial | `ordenAlfabetico` es una clave de una palabra («Álvarez», «Argüelles»), no el apellido completo («Álvarez Quintero», «Cervantes Saavedra»). La espina dice «invierte como pide cada estilo» sin decir de qué se saca el apellido y las iniciales. O la clave revisada pasa a ser el apellido de citación —y eso cambia lo que Héctor revisa—, o hace falta otro campo con su orden. Sin regla, dos historias invertirán distinto. |
| FR-59 «Si el pasaje no dice más que la Cita, no hay bloque» | AD-30 | Aterrizado, con un borde | «Si coincide con la Cita colapsada». Un párrafo que solo añade el punto final o unas comillas que la Cita no lleva sí «coincide» en lo que dice y no en lo colapsado: saldría un bloque que no dice más. Precisar la comparación (forma canónica de AD-3, o tolerancia de puntuación en los bordes). |
| FR-59 «Dos Citas del mismo párrafo muestran el mismo pasaje» | AD-30 | Implícito | Se sigue de una sola función de párrafo y una sola aparición elegida, pero no hay prueba que lo fije, y B3 lo puede romper (dos Citas del mismo párrafo en Fuentes que ganan distinto). Una prueba sobre el Corpus lo cierra. |
| FR-59 / §15 «si el pasaje pasa el techo, se ofrece de otra forma, que decide la arquitectura» | AD-30, Deferred | No decidido | La espina mide el peso antes de publicar, pero no nombra la forma alternativa (§15 sugiere fuera del HTML inicial, que AD-6 permite porque el pasaje no es la Cita). Al menos nombrarla como Deferred con disparador. |
| FR-59 / FR-61 «lleva la Fuente de la que se tomó y su licencia» | AD-28 | Parcial | AD-30 remite a `atribucion.ts`, pero la enmienda v9 de AD-28 no añade pasaje e incipit a la **enumeración de superficies** donde puede aparecer texto ajeno, que es la regla de AD-28. |
| FR-60 «si la edición cotejada es una traducción, su traductor» | AD-31, AD-25 | Parcial | «El traductor sigue saliendo de la Fuente», sin decir cuál cuando la Obra tiene varias Fuentes o traducciones (mismo hueco que B2). |
| FR-60 género y lengua con varios valores | AD-31 | No dicho | La fecha tiene regla («con más de uno, ninguno»); género y lengua no. Una entidad con dos géneros dará dos salidas según la historia. |
| FR-61 «no empieza por un prólogo» y «cotejada solo desde un capítulo posterior no tiene incipit» | AD-30 | Aterrizado por persona | Lo garantiza que una persona declare `desde` «tras el título y el aparato»: es la alternativa de la pregunta 16. Falta decir, como en AD-31 y en la clave de orden, que la orden la corre Héctor y ningún agente. |
| FR-10 «la Tarjeta Social **si lo lleva**» | AD-8 | Ambiguo | La enmienda enumera la Tarjeta Social entre los lienzos «que llevan el dominio», pero hoy `src/lib/tarjeta.ts` no lo pinta. No queda claro si la v9 decide añadirlo (cambio de todas las Tarjetas, AD-16) o si la enumeración es condicional. Decirlo. |
| FR-35 «lo mismo vale para el salto a "Dónde leer esta obra"… idéntico con el Modelo apagado y encendido» | AD-20 | No dicho | La prueba de dos estados que fija AD-20 v9 compara apagado con/sin tiendas y ediciones; no fija que el salto (y la Tarjeta de Obra) sea idéntico **apagado frente a encendido**. |
| FR-35 «sin precios ni portadas de la tienda» | AD-20 (esquema, AD-1) | No dicho | Lo sostiene que el esquema de `ediciones` no tenga campo para ello; la espina no lo fija como puerta. Bajo. |

### D. Aterrizado correctamente (verificado)

- FR-57: HTML estático, sin `script`/`img`/`iframe`/`link`/`style`/`class`, canónica sin `?de=`/`?via=`, saltos como `<br>`, fuera de Pagefind; evento retenido hasta el receptor (AD-28, AD-13). No es Destino de Compartición: entra como acción, no como destino.
- FR-58: nombre sin invertir con clave sin revisar, en los tres estilos; «lo que no consta se omite» sin completar con otra Cita, la Ficha técnica ni el conocimiento general; fecha del cliente y, sin JS, sin fecha y dicho; evento fuera de SM-5/SM-7/SM-C3 (AD-28, AD-13, AD-12). Revisar la clave fecha las páginas que la pintan (AD-27).
- FR-59: mismo localizador y mismo conjunto de documentos que el cotejo; párrafo con una sola definición; sin documento o sin localizar, sin bloque; tope con nombre y sin recorte; fuera de Pagefind y del JSON-LD; nunca en la Imagen, lo copiado ni el Fragmento (AD-30, AD-23).
- FR-60: revisiones fijas en `corpus/wikidata/`, el build sin red (AD-22), una revisión vigente por entidad referida, sin identificador ni etiqueta en otra lengua, cotejo del autor de la entidad, año discrepante avisa sin corregir, cambios de revisión fechan la Obra (AD-31, AD-27).
- FR-61: sin declaración no hay incipit, nunca inferido del orden del libro; tope con nombre; si la primera frase no cabe, no hay; fuera de Pagefind (AD-30).
- FR-63: U+000A como única forma guardada; una sola traducción a « / »; slug y cotejo invariantes; restitución como la reescritura que AD-23 admite, con texto colapsado idéntico; los dos repartos con prueba de igual número de líneas; tramos con saltos (AD-29, AD-8). Salvo A1, B5 y B6.
- FR-14: una sola medida de parecido, la decisión es de una persona (AD-3).
- FR-10: banda reservada por construcción, prueba que nombra Cita y formato, el reparto lo cambia Héctor (AD-8).
- FR-35: marca opcional, encendido con tienda sin marca rompe, `dist/` idéntico apagado con y sin marca/ediciones, congelación que oculta ediciones sin perderlas (AD-20, AD-25). Salvo A2.
- §14: la 13 (varias fechas → ninguna) y la 16 (incipit declarado por persona) se resuelven en la espina dentro de lo que el PRD permite; la 15 (SM-5) se respeta; la 11, 12, 14 y 17 no tienen dimensión de arquitectura.

## Acciones recomendadas (para la próxima pasada de `bmad-architecture`)

1. **AD-29/AD-30:** regla única de «qué salto es verso», con dueño en `tools/lib/`, usada por la restitución, el pasaje y el incipit; Gutenberg (columnas partidas) excluido o desplegado antes (A1).
2. **AD-20:** retirar el `[ASSUMPTION]` de que una historia escribe las tiendas; declararlas es acto de Héctor (A2).
3. **AD-24:** la orden de FR-62 lista solo Obras con edición cotejada (de `obras.ts`), con sus tres columnas, y la demanda de página cuando la familia entre (B1).
4. **AD-28/AD-6:** isla de copiar/fechar en la página 1 de Obra con su tope; regla de Fuente y traductor para la Referencia de Obra; regla de apellido para invertir (B2, C).
5. **AD-27/AD-30/AD-23:** elegir la aparición del pasaje sin depender de hermanas o componerlas; enmendar «nunca el texto»; nombrar el lector del incipit (B3, B4).
6. **AD-29:** una sola forma de pintar el salto en HTML y una prueba de búsqueda en `dist/` a ambos lados del salto (B5, B6).

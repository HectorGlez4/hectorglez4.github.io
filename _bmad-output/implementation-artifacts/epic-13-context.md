# Epic 13 Context: El canal deja de exigir presencia diaria

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

El Kit Diario resolvió la publicación en las cuentas propias, pero dejó dos límites: solo produce un formato y exige que Héctor esté presente cada mañana. Esta épica levanta los dos. Por un lado, componer varias jornadas de material de una sola sentada, de modo que una semana ocupada deje de ser una semana sin publicar — olvidar un día deja de ser perder ese día. Por otro, ampliar el repertorio de Piezas de Canal más allá de la Cita suelta: una pieza que reúne varias Citas y una pieza que anuncia una Colección entera. Todo lo que se construye aquí es material de salida para las cuentas, nunca una superficie indexable, y todo vive en la herramienta del editor: el sitio publicado no cambia por esta épica salvo en las fijaciones de jornada que el lote deja escritas.

## Stories

- Story 13.1: Componer varias jornadas de una sentada
- Story 13.2: Una pieza que reúne varias Citas
- Story 13.3: Una Colección anuncia su propia pieza

## Requirements & Constraints

**Composición anticipada.** El material compuesto por adelantado tiene que ser indistinguible del que compondría la jornada, y sustituirlo si ambos existen. Cambiar la Cita del Día de una jornada ya compuesta recompone su material en lugar de dejarlo obsoleto. El lote es reanudable: se puede dejar a medias y retomarlo otro día, con el mismo criterio que la aprobación por lote del sembrado.

**El lote es superficie interna.** No es indexable ni alcanzable desde la navegación pública, igual que el Kit Diario. Un solo operador.

**Atribución, siempre.** Cada Cita de una pieza conserva su atribución visible; ninguna aparece sin Autor. Vale igual para la pieza de varias Citas y para la de Colección.

**Integridad del texto.** La plantilla no altera, recorta ni abrevia el texto de ninguna Cita. Ausencia antes que mutilación: si no cabe, la Cita no entra en la pieza — nunca se acorta para que quepa.

**Exclusión por longitud.** Una Cita que supera el límite de caracteres para admitir Imagen queda fuera de la selección de una pieza, exactamente por la misma razón por la que no admite Imagen de Cita.

**Un único enlace de destino, marcado por red.** Cada pieza declara un solo destino, con la marca de origen por cuenta que ya usa el Kit. La página de destino es siempre la misma URL canónica con o sin marca, y la marca no altera lo que ve el visitante.

**Pieza de Colección.** Su destino es la Página de Colección, no una Cita suelta. Una Colección por debajo de su umbral no produce pieza: no se anuncia lo que no está publicado.

**Fuera de alcance a propósito.** La pieza en movimiento (vídeo) **no entra en esta épica**. Su puerta es SM-8 — ninguna cuenta de imagen fija demostrando visitas medibles, ningún motor de vídeo — y es el candidato preferente al recorte de la v3. No elijas encoder, no prepares abstracciones «por si acaso»: lo único ya decidido de ella es dónde vivirá.

**Puerta de publicación de la v3.** Se puede construir en cualquier orden, pero nada se publica ni se comparte en las cuentas hasta que LC-1…LC-4 estén verificadas. Ninguna historia de aquí la abre ni está bloqueada por ella.

## Technical Decisions

- **No construyas un segundo calendario.** Es la trampa nombrada explícitamente en la reconciliación aguas arriba, y viene de una redacción del addendum que daba por indeciso algo ya resuelto en la v1. `corpus/portada.json` ya tiene fijaciones de jornada y `src/lib/citaDelDia.ts` ya les da prioridad sobre la rotación desde entonces. El lote **fija jornadas ahí** y no necesita mecanismo nuevo. La exigencia de que «lo anticipado sustituya a lo de la jornada» se cumple por construcción, porque el Kit y el lote derivan de la misma fijación: no hay desempate que diseñar, y diseñarlo crea la divergencia clásica de «cuál manda el martes».
- **Las piezas viven en `tools/`, y su salida no se versiona.** El plano de composición lo fija quién consume el artefacto: el build es para lo que pide un tercero sin JavaScript (Tarjeta Social), el cliente para lo que pide alguien con navegador delante (Imagen de Cita, Imagen del Kit), y `tools/` para composición por lote que nadie pide a demanda — ahí caen las cuatro Piezas de Canal, incluida la de vídeo. **Lo versionado es la decisión, es decir, la fijación de jornada.** No metas artefactos generados en el repositorio.
- **Tramos tipográficos de una sola fuente.** Los tamaños salen de `src/lib/tramos.ts`, nunca de valores escritos en la plantilla de la pieza. Es la misma tabla que consumen la Página de Cita, el generador de Imagen y la Tarjeta Social; que una pieza calcule el suyo aparte es exactamente lo que la regla existe para impedir.
- **El lote hereda el dueño único de superficie publicable.** La declaración construida en la Story 12.1 es la que da al lote su `noindex` y su exclusión del sitemap. No añadas una entrada a mano en la configuración de Astro ni una bandera propia: la superficie declara en un solo sitio que no es publicable y todo lo demás deriva.
- **Enumerar contenido pasa siempre por el conjunto publicable.** Las Piezas de Canal derivan de `src/lib/publicado.ts` como cualquier otra superficie que enumere contenido; ningún módulo de `tools/` aplica un umbral por su cuenta ni filtra Colecciones directamente. Eso es lo que hace que «una Colección por debajo de su umbral no produce pieza» sea cierto sin comprobación duplicada.
- **Una pieza no es una superficie indexable.** La regla de que ninguna agregación reproduce el texto íntegro de una Cita vincula a superficies del sitio, no a material de salida: una pieza reúne Citas íntegras a propósito y no compite por la canónica de nada. No apliques ahí el componente de tarjeta ni el fragmento acotado.
- **Sin tecnología nueva.** El stack es el de la v2; esta épica no introduce ninguna dependencia de cómputo nueva (esa era la de FR-31, que queda fuera).

## UX & Interaction Patterns

- **Hueco de diseño declarado.** La espina de UX describe las superficies de la v1 y no cubre el Kit Diario ni el lote. Las historias se escriben con las reglas de atribución, tramos e integridad del texto como aceptación, en lugar de con una especificación visual.
- **El consumidor del lote es el editor con el móvil**, igual que el Kit: la superficie tiene que seguir siendo alcanzable y utilizable desde ahí, sin herramientas ni acceso al repositorio para el gesto de publicar.
- **Tipografía de la pieza.** El texto citado va en la serif; la atribución y todo lo que es voz del sistema, en Inter. El nombre del Autor lleva el tratamiento de atribución, no el de la Cita.

## Cross-Story Dependencies

- 13.1 va primera: fija jornadas y establece la superficie interna del lote, que las otras dos usan como sitio desde el que componer.
- 13.1 depende de la Story 12.1 (dueño único del carácter publicable) para su `noindex` y su exclusión del sitemap. Si 12.1 no está, no la reimplementes aquí.
- 13.3 depende de la Épica 12 completa: necesita la Colección publicada, su umbral resuelto y su Página de Colección como destino del enlace.
- 13.2 y 13.3 comparten plantilla y reglas; compón 13.2 primero y deriva 13.3 de ella en vez de duplicar la composición.
- Toda la épica se beneficia del volumen de la Épica 11 —una pieza de varias Citas necesita varias que merezcan ir juntas— pero no está bloqueada por ella.

# Epic 19 Context: El Corpus se abre a los clásicos

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

El Corpus creció por lo que estaba disponible y no por lo que se busca: González Prada aporta 154 Citas y García Lorca, 1. Con la demanda ya medida, esta épica gira el catálogo hacia filosofía antigua y teología, en profundidad por Autor. Para eso el bucle de sembrado deriva de la Fuente a quién buscar, lee bien la obra escaneada y el verso, y conserva lo que la Fuente declara de una traducción sin presentarlo nunca como dato de la Obra. Al final, y solo si se cumple una condición de indexación, añade la Época como eje de navegación por Autores. De la 19.2 a la 19.13 están construidas o en `review`. Lo que queda abierto es la **19.1**, reescrita en la v7.1 y adelantada para ir antes de la Página de Obra (22.4); la 19.3 y la 19.4 siguen en backlog.

## Stories

- Story 19.1: De una obra traducida se conserva lo que la Fuente declare *(reescrita en la v7.1)*
- Story 19.2: El bucle siembra clásicos con meta propia
- Story 19.3: La profundidad por Autor llega a la obra y a la biografía
- Story 19.4: La Época agrupa a los Autores que comparten tiempo y escuela
- Story 19.5: La época se declara desde la Fuente, y el hueco sale de ella
- Story 19.6: La cola de revisión se ordena por probabilidad, no por alfabeto
- Story 19.7: El lector entiende la obra escaneada, que es donde viven los clásicos
- Story 19.8: El clásico firma con un solo nombre
- Story 19.9: El Autor se lee del Índice del escaneo
- Story 19.10: Los géneros que faltaban en la categoría de Autor
- Story 19.11: La numeración de verso del escaneo no se versiona
- Story 19.12: El verso se lee por frase, no por renglón
- Story 19.13: Un título largo no deja sin nombre a las páginas de su obra

## Requirements & Constraints

**Traducción (19.1). Es visibilidad, no una puerta.**
- Si la cabecera del documento de Fuente declara traductor o año, los dos quedan en la Procedencia como **traducción** (traductor y año de la traducción), aparte del año de la Obra. Hoy la recuperación solo conserva título y autor. El traductor se guarda sin el marcado de la Fuente: «[[Germán Salinas]]» queda «Germán Salinas».
- **Corregir lo ya publicado entra en el alcance.** El 2026-10-09 se midieron 63 Citas de 4 Obras que publican como año de la Obra el de su traducción: Odas 35 (Salinas, 1909), Consolación a Marcia 14 (1884), La Eneida 8 (1869) y Fedro 6 (1871). Además hay 64 Citas traducidas sin año. Las de documento versionado se restituyen desde su cabecera, y el año que hoy publican pasa a ser el de la traducción. Todo va en un commit propio.
- Una Cita sin documento no cambia. El año de la Obra se omite si la Fuente no lo da y nunca se infiere.
- Una Cita de obra traducida sin traductor ni año se publica igual. La comprobación de derechos sigue en el conjunto cerrado de Fuentes, que exige una licencia de reutilización. El dato vive en la edición y no en la obra: Fedón lo declara y Critón, de la misma edición, no.
- El informe de salud cuenta las Citas de obra traducida que no traen traductor ni año. Es una cifra y no un error, y las de Séneca aparecen ahí.
- Queda fuera rastrear ediciones para completar lo ya publicado. Tampoco se traducen Citas: solo entra texto en español de una edición identificable.

**Sembrado de clásicos (19.2, 19.5, 19.6).** Los Autores de tradición `otra` tienen meta propia y se cuentan aparte. El suelo panhispánico se mide sin ellos. El bucle prioriza por demanda y no por disponibilidad. El techo de concentración por Autor rige sin excepción. Toda sesión queda registrada. Una época termina cuando cada candidato está sembrado o descartado con motivo. La cola de revisión nunca oculta candidatas y su orden es estable.

**Lectura de la Fuente (19.7–19.13).** Solo se declara lo que la Fuente atribuye. El Autor nunca se infiere por la ruta, nunca se edita a mano un documento versionado y toda Cita publicada sigue literal en su documento tras regenerarlo.

**Época (19.4).** Agrupa Autores y no Citas, y un Autor pertenece a lo sumo a una. Una Época sin Autores publicados no se publica. **No se construye** hasta que alguna familia de la serie de indexación supere el 20 %.

## Technical Decisions

- **Restituir el literal, nunca inferir.** La única reescritura admitida de una Procedencia publicada es restituir lo que declara la cabecera del documento versionado. El cotejo corre en el build, colapsa espacios y nada más.
- **Un campo opcional sin valor se omite** del fichero, nunca como cadena vacía ni `null`. Una traducción sin año lleva solo el traductor, y una Obra sin año propio no lleva año.
- **La red solo vive en la capa exterior de `tools/`.** `src/lib/` y el build son puros sobre lo ya versionado y nunca descargan nada.
- **La Obra va a tener un único dueño.** La Épica 22 introduce `obras.ts`, que resuelve cada Cita a su Obra y deriva el año «cuando las Citas que lo declaran coinciden». Por eso el año de una traducción no puede seguir guardado como año de la Obra antes de que exista la Cabecera de Obra. Hoy componen la obra por su cuenta la Atribución, los datos estructurados, la Tarjeta Social, la Imagen de Cita y la Imagen del Kit.
- **Lo copiado y la atribución** salen de `src/lib/atribucion.ts`. Lo que una Pieza o una imagen rasterizan sale de `src/lib/lienzo.ts`.
- Todo literal numérico de regla de negocio vive en `src/lib/umbrales.ts`. Si la Época llega a construirse, se declara en `src/lib/superficies.ts`, y su conjunto publicable sale de `src/lib/publicado.ts`.

## UX & Interaction Patterns

La regla de la traducción, que es lo nuevo en la 19.1:
- **Atribución** de la Página de Cita: «Odas. Traducción de {traductor}, 1909.». Es una frase propia: el año de la traducción va con el traductor, y junto al título solo va el año de la Obra.
- **Lo copiado:** ««…» — Horacio, Odas, trad. de {traductor}, 1909.»
- **Imagen de Cita, Tarjeta Social y Pieza de Canal:** no nombran al traductor.
- El año de una traducción nunca se presenta junto al título como si fuera de la Obra.
- La Cabecera de Obra (22.4) no nombra al traductor y omite el año si solo consta el de la traducción. «Dónde leer esta obra» (22.6) dice «en la traducción de {traductor} ({año})», una línea por traducción. Las dos reglas se construyen en esas historias y no en la 19.1, pero dependen del dato que deja la 19.1.

## Cross-Story Dependencies

- **Orden del tablero:** 20.1–20.3 → **19.1** → 22.1–22.3 → 22.4. La Página de Obra no se construye hasta que esté hecha la 19.1, porque si no afirmaría «de Horacio · 1909».
- La 19.3 consume la semblanza y la lista de obras de la Épica 17 y no las reimplementa. La 17.1 y la 17.2 van antes.
- La 19.4 depende de la declaración única de superficies (12.1) y de la serie de indexación (Épica 16 y 20.4), que impone su condición de arranque.
- La 19.5 sustituye al listón numérico que la 19.2 dejaba pendiente. La 19.6–19.13 operan sobre las herramientas de sembrado de la Épica 9 y el cotejo FR-23 de la Épica 11.

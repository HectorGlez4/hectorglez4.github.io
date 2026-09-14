# Epic 19 Context: El Corpus se abre a los clásicos

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

El Corpus (1.639 Citas de 35 Autores) está invertido respecto a la demanda: creció por lo que era fácil de extraer —González Prada aporta 154 Citas, García Lorca 1— porque hasta septiembre de 2026 no había demanda medida. Esta épica gira el catálogo hacia lo que más se busca: filosofía antigua y teología, en profundidad por Autor. Conserva lo que la Fuente declara de una obra traducida, hace que el bucle de sembrado derive a quién buscar de los huecos y de la demanda con una meta propia para los clásicos (sin diluir el compromiso panhispánico), apoya la profundidad por Autor en la semblanza y la lista de obras ya especificadas, y añade la Época como eje nuevo de navegación que agrupa Autores.

## Stories

- Story 19.1: De una obra traducida se conserva lo que la Fuente declare
- Story 19.2: El bucle siembra clásicos con meta propia
- Story 19.3: La profundidad por Autor llega a la obra y a la biografía
- Story 19.4: La Época agrupa a los Autores que comparten tiempo y escuela
- Story 19.5: La época se declara desde la Fuente, y el hueco sale de ella
- Story 19.6: La cola de revisión se ordena por probabilidad, no por alfabeto
- Story 19.7: El lector entiende la obra escaneada, que es donde viven los clásicos
- Story 19.8: El clásico firma con un solo nombre
- Story 19.9: El Autor se lee del Índice del escaneo (sin construir)
- Story 19.10: Los géneros que faltaban en la categoría de Autor
- Story 19.11: La numeración de verso del escaneo no se versiona

De la 19.5 a la 19.11 salieron de diagnósticos del bucle; su detalle vive en cada `spec-19-*.md`. Las cifras del objetivo de arriba son las de la planificación: hoy el Corpus publica 1.891 Citas.

## Requirements & Constraints

**Traducciones (visibilidad, no puerta)**
- Si el encabezado del documento de Fuente trae `traductor` o `año`, deben quedar en la Procedencia. Hoy la recuperación solo conserva título y autor y descarta el resto.
- Una Cita de obra traducida sin traductor ni año **se publica igual**. No rompe el build ni bloquea otras historias. El dato vive en la edición y no en la obra (en la misma edición, una obra lo declara y otra no), y exigirlo dejaría en falta 165 Citas de Séneca ya publicadas.
- La verificación de derechos sigue en el conjunto cerrado de Fuentes: cada Fuente declara su licencia y se rechaza si no permite reutilización. No se duplica a nivel de Cita.
- El informe de salud cuenta cuántas Citas de obra traducida no traen traductor ni año, como cifra y no como error.
- Fuera de alcance: rastrear ediciones para completar lo ya publicado.

**Sembrado de clásicos**
- Los Autores de tradición `otra` tienen **meta propia**, contada aparte en el informe de huecos.
- El suelo del 40 % de tradición latinoamericana se mide sobre todos los Autores **menos** los de tradición `otra`. Los Autores sin tradición declarada **sí cuentan** en el denominador, porque es la lectura conservadora. El suelo no baja, cambia su denominador.
- Entre dos Autores admisibles se prioriza por **demanda**, no por disponibilidad. Consultar qué Autores concentran demanda en sitios de la competencia es lectura legítima para priorizar, pero nunca extracción de texto.
- El techo de concentración por Autor rige sin excepción. La profundidad por Autor obliga a que el total crezca en paralelo, y el bucle debe decir cuántas Citas más caben de ese Autor.
- El resto de la puerta de admisión se aplica igual: dominio público, año de fallecimiento del Autor, Procedencia y cotejo contra el documento versionado.
- Toda sesión queda registrada en la serie de sembrado.
- No se traducen Citas ni se rastrean sitios de citas: una traducción del editor produce una Cita cuya Procedencia no consta en ninguna edición.

**Profundidad por Autor**
- La Página de Autor de un clásico trae semblanza con fuente citada, lista de obras y Citas. Todo eso ya lo especifica la Épica 17, y esta épica lo consume sin reimplementarlo.

**Época**
- Agrupa **Autores**, no Citas. Eso la distingue del Tema y evita que compita con la Página de Cita.
- Un Autor pertenece a lo sumo a una Época. Ejemplos: filosofía antigua, patrística, escolástica, y las que pida el catálogo.
- Una Época sin Autores publicados no se publica ni se indexa.
- **Condición de construcción:** no se construye hasta que la serie de indexación muestre alguna familia por encima del 20 % indexado. Añadir superficies a un sitio que no se rastrea gasta en la dirección contraria.

## Technical Decisions

- **La red solo vive en la capa exterior de `tools/`.** `tools/lib/`, `src/lib/`, el esquema y las páginas son puros sobre datos ya recuperados, y ningún paso del build descarga nada. La extracción de traductor y año sale del documento ya versionado.
- **Documentos de Fuente:** están en `corpus/fuentes/{id-de-fuente}--{slug-de-obra}.txt`, con un documento por par (Fuente, obra). El cotejo literal corre en el build, y al reutilizar un documento se compara la obra declarada en la cabecera. La extracción de metadato está construida sobre las plantillas de encabezado de Wikisource.
- **Campos opcionales:** un dato ausente se omite del fichero, nunca como cadena vacía ni `null`. Una Procedencia completa, parcial o ausente se distingue por los campos presentes. Si faltan traductor o año, simplemente no aparecen.
- **Informes de `tools/`:** `salud.ts` y `huecos.ts` informan al editor y no deciden por él. La política de objetivo de sesión es determinista (mismo estado, mismo objetivo), declara de qué hueco sale y admite anulación registrada.
- **Umbrales:** todo literal numérico de regla de negocio vive solo en `src/lib/umbrales.ts`. La meta propia de clásicos y el techo por Autor no pueden quedar como literales sueltos.
- **Conjunto publicable:** `src/lib/publicado.ts` es el único dueño de lo que se publica y se puede alcanzar. La enumeración de Épocas publicables y sus Autores deriva de ahí, y ningún módulo filtra por su cuenta.
- **Carácter publicable de la superficie:** la Época lo declara en un solo sitio, y de esa declaración derivan el sitemap, el `noindex` y el barrido de accesibilidad y móvil. Añadir la superficie no puede exigir tocar un segundo fichero.
- **Obra:** se deriva del campo `obra` de las Procedencias publicadas y no es superficie propia.
- **Nomenclatura:** entidades en español y en singular según el glosario (`Época`, `Autor`, `Procedencia`, `Fuente`).

## UX & Interaction Patterns

- La Época es un tercer eje de recorrido junto a Autor y Tema, para el visitante que busca «filósofos estoicos» sin saber un nombre. La navegación sigue siendo lateral y sin jerarquía ni migas de pan.
- Como la Época enumera Autores, no despliega Citas. No existe espina de UX específica para esta superficie.
- En la Página de Autor, la ficha va primero (semblanza con atribución visible y lista de obras) y solo en la primera página del listado, según lo definido en la Épica 17.

## Cross-Story Dependencies

- La 19.1 ya no bloquea a las demás.
- La 19.2 es operación sobre las herramientas de sembrado de la Épica 9 y la política de huecos de la Historia 11.3, ya construidas. No añade FR nuevos.
- La 19.3 requiere que antes estén hechas las Historias 17.1 (Fuente mutable por revisión) y 17.2 (semblanza con fuente y atribución).
- La 19.4 va la última. Depende de la declaración única de publicabilidad (Historia 12.1) y de la serie de indexación de la Épica 16, que debe superar el 20 % en alguna familia.

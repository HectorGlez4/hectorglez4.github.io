# Epic 17 Context: La Página de Autor responde a quién fue

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

La Página de Autor es la única superficie de contenido con impresiones medidas, y todas las consultas que alcanzan el sitio son de Autor, varias de ellas biográficas («quién fue unamuno»). Esta épica le da lo que esa consulta pide: una Ficha de Autor que abre la página con una semblanza que sitúa al Autor **con fuente citada y atribución visible**, y la lista de su obra en este Corpus enlazada a cada Página de Obra. Para eso admite primero una Fuente **mutable** (un artículo de enciclopedia) en el mecanismo de cotejo, que se diseñó para documentos fijos, sin que el build se rompa el día que alguien edite el artículo. Deja además la admisión de Modelos de Ingreso expresada por ruta, de modo que encender la afiliación no cuele enlaces comerciales en la Página de Autor.

## Stories

- Story 17.1: Una Fuente mutable entra por revisión, y su documento no comparte espacio con las obras
- Story 17.2: La semblanza sitúa al Autor, publica su atribución, y sale de la Tarjeta
- Story 17.3: La Página de Autor enumera su obra *(reescrita en la v7.1)*
- Story 17.4: La ficha abre la página, y solo la primera
- Story 17.5: Un Modelo se admite por ruta, y el tope de guion se mide donde se admite *(reescrita en la v7.1)*

## Requirements & Constraints

- **Semblanza (tríada, una a una):** cuándo vivió (años de nacimiento y fallecimiento), en qué corriente escribió (tradición declarada) y por qué se le cita en este Corpus. Lo que la fuente no sostenga se **omite**, nunca se rellena. No cubre vida privada, polémicas ni recepción crítica.
- **El sistema no compone prosa sobre una persona real.** La semblanza procede de una fuente citable admitida o la escribe una persona que responde de ella. Una semblanza sin procedencia declarada **no se publica**, y el sistema no genera otra en su lugar. Un Autor sin fuente citable conserva la semblanza breve que ya tiene, sin hueco.
- **Fuente prevista:** Wikipedia en español (CC BY-SA 4.0, como Wikisource-es). ShareAlike alcanza al texto derivado de la semblanza, no al Corpus. A diferencia de Wikisource, aquí el texto es prosa original de contribuyentes vivos: la atribución exige enlace visible, no metadato en el YAML.
- **Atribución publicada, visible:** enlace a la revisión concreta y su licencia. Guardada y no mostrada no atribuye nada.
- **Licencia por superficie:** la semblanza ajena no se reproduce en superficies que no pueden portar su atribución. La Tarjeta Social de Autor se compone solo con hechos derivados del Corpus —nombre, años, recuento de Citas documentadas—, sin semblanza ni bajada escrita por el sistema. Hoy la semblanza aparece en seis sitios (cuerpo, `<meta description>`, JSON-LD `description`, índice de Pagefind, páginas 2+, PNG de la Tarjeta); cada uno hay que revisarlo.
- **Lista de obras:** derivada de las Procedencias publicadas; ninguna Ficha de Obra añade una obra sin Citas. Enumera Obras, no Citas (ninguna Cita dos veces en la misma URL). Cada entrada: título de su ficha, recuento, enlace a su Página de Obra (también si esta es `noindex`); año solo cuando las Citas que lo declaran coinciden, nunca inferido. Pie: «Y una cita sin obra documentada.» / «Y {n} citas sin obra documentada.», sin línea si no hay ninguna. Nunca reescribe la Procedencia para unir o separar obras.
- **Sin ingreso en la Página de Autor:** la lista se publica idéntica con la afiliación encendida o apagada; comprobado construyendo en ambos estados.
- **Rendimiento y guion:** la Página de Autor con ficha sigue bajo `MAX_BYTES_DE_GUION` y no carga guion de tercero; el tope se mide en **toda** superficie que admita un Modelo.

## Technical Decisions

- **Fuente mutable solo con direccionamiento por revisión.** Se recupera **por el origen de esa revisión** —el wikitexto en bruto de MediaWiki, `action=raw` con su `oldid`—, nunca por la página renderizada ni por la dirección viva: el permalink renderizado resuelve plantillas y transclusiones en vivo; el wikitexto de una revisión es inmutable byte a byte. Solo `tools/` toca la red; el build no descarga nada.
- **La revisión es parte de la identidad del documento:** o entra en la clave del documento, o el cotejo **rompe el build** cuando la revisión declarada en el fichero del Autor no es la del documento versionado. Sin esto, actualizar la revisión en el Autor reutilizaría el documento viejo y publicaría una procedencia falsa sin fallar nada.
- **Dónde vive la semblanza y su documento:** la semblanza sigue en `corpus/autores/{slug}.yml` y **gana procedencia**: fuente, identificador de revisión y licencia; el fichero del Autor además **declara derechos**, como la Cita. El documento recuperado se versiona en `corpus/fuentes/` como texto plano, pero en un **espacio de nombres disjunto** del de las obras. Los nombres de campo exactos y la forma concreta del espacio de nombres **no los fija la planificación**: los decide la 17.1.
- **Cotejo tipado, dos dominios disjuntos:** el cotejo recibe el tipo admisible de cada cotejado. Una Cita **jamás** casa con un documento de biografía, ni por prefijo ni por nombre exacto (hoy `cotejo.ts` casa por prefijo). Una obra cuyo identificador coincida con el de un Autor no se traga su documento.
- **Extracción propia:** `recuperar.ts` y `documento.ts` están construidos sobre las plantillas de encabezado de Wikisource; la Fuente nueva necesita su propia extracción de metadato declarada. Admitirla no es una línea en el conjunto cerrado de `tools/lib/fuentes.ts`.
- **Reutilización por clave con pérdida:** el nombre del documento trunca; al reutilizar se compara la obra declarada en la cabecera con la pedida y se rechaza cuando difieren, en vez de contestar «ya versionado».
- **La licencia tiene un solo dueño:** el módulo que compone la atribución (`src/lib/atribucion.ts`) enumera las superficies donde puede aparecer texto ajeno y prohíbe las que no la portan.
- **Obras:** se resuelven solo en `src/lib/obras.ts` (título, año, recuento); derivarlas en la página sería una segunda derivación prohibida.
- **Ingreso por ruta:** la admisión de `src/lib/ingreso.ts` se expresa sobre el mismo predicado de ruta que `src/lib/superficies.ts`. Se rechaza todo Modelo en el servicio **por forma** (páginas 2+ de un listado); la restricción es solo de forma, no por contenido. La afiliación se rechaza en cualquier superficie que no sea la Página de Obra (hoy en ninguna). `tests/unit/ingreso-construido.test.ts` exige que lo marcado con `data-ingreso` esté encendido y admitido **en esa ruta**, no en su fichero de página.

## UX & Interaction Patterns

- **Orden B:** la Ficha de Autor —nombre, años, semblanza, atribución, Lista de Obras— va **antes** del catálogo de Citas, solo en la primera página. Es la excepción declarada a «contenido antes que explicación», que sigue entera en Tema y Colección. Páginas 2+ sin ficha y `noindex`.
- A 360 px, nombre y semblanza visibles sin desplazar; sin muro, modal ni aviso previo.
- Semblanza en `body-lg`, Inter (no es voz citada), dentro de la medida de prosa (68ch). Atribución justo debajo, en una línea en `caption` y `on-surface-variant`: «Semblanza de {fuente, revisión} · {licencia}» (maqueta: «Wikipedia, revisión N · CC BY-SA 4.0»). Es el primer enlace saliente del cuerpo; subrayado siempre visible.
- Lista bajo el rótulo «Su obra en este Corpus»: título en Inter a la izquierda, recuento en cifras tabulares a la derecha, alto mínimo 44 px, filete `outline-variant`, sin subrayado (enlace de bloque). Nunca despliega Citas dentro.

## Cross-Story Dependencies

- 17.1 precede a 17.2 (la semblanza necesita la Fuente mutable y su documento cotejado).
- 17.3 empieza **después de las Historias 22.3 y 22.4** (Obra resuelta en `obras.ts` y con página); 17.4 depende de 17.3, porque la ficha lleva la lista. Ambas están bloqueadas hoy.
- 17.5 se construye **antes de la 22.9** (la que admite la afiliación en la Página de Obra, primera superficie paginada con Modelo).
- Las grafías y la unión de obras pertenecen a la 22.2; el anuncio de cambios de `corpus/autores/` a CAP-16 / AD-27.
- La semblanza se planificó detrás de la Épica 18 (rastreo); el orden frente a ella sigue abierto en el contrato.

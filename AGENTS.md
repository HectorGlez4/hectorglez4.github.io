<!-- bmad:context -->
<!-- Verified 2026-08-17 against 372e23f. Managed by bmad-project-context; edits inside this block are replaced on refresh. Keep anything you want preserved outside the markers. -->

## Sabiduría de Bolsillo

Sitio panhispánico de citas célebres en español, estático, construido con Astro 7 sobre un corpus de dominio público en ficheros versionados. El sitio no tiene base de datos ni servidor de aplicación; el receptor de medición (`medicion/`, Worker de Cloudflare con D1) es un plano aparte que escribe y nunca se lee desde el sitio. La planificación vive en `_bmad-output/planning-artifacts/`, el contrato destilado en `_bmad-output/specs/`, y el seguimiento de historias en `_bmad-output/implementation-artifacts/sprint-status.yaml`.

## Policy

- Nunca edites a mano los artefactos de `_bmad-output/planning-artifacts/` ni de `_bmad-output/specs/` — vuelve a ejecutar la skill BMad que los produjo (`bmad-prd`, `bmad-architecture`, `bmad-ux`, `bmad-spec`, `bmad-create-epics-and-stories`); cada una deriva su salida del `.memlog.md` de su carpeta y un retoque a mano se pierde en la siguiente pasada.
- Nunca borres ficheros de `corpus/` para «limpiar» — git es el único almacén del contenido y no hay copia en otro sitio. Para retirar una Cita, muévela a `corpus/_revision/`.
- Commitea los artefactos de planificación aparte y antes de empezar una historia, nunca en el mismo commit que el código.

## Where things are

- Antes de tocar `src/lib/` o `corpus/`: lee `_bmad-output/planning-artifacts/architecture/architecture-brainlySabiduria-2026-08-10/ARCHITECTURE-SPINE.md` — cada AD nombra la divergencia que impide.
- Qué construir y con qué contrato: `_bmad-output/specs/spec-brainlySabiduria/SPEC.md`, con sus companions en el frontmatter.
- Al implementar una historia: `_bmad-output/planning-artifacts/epics.md` tiene sus criterios de aceptación; marca el avance en `sprint-status.yaml`.
- Decisiones visuales y de comportamiento: `_bmad-output/planning-artifacts/ux-designs/ux-brainlySabiduria-2026-08-10/DESIGN.md` y `EXPERIENCE.md`. Mandan sobre cualquier maqueta.
- Orden de construcción y verificación de la v3: `GUIA-DE-ARRANQUE.md`, junto a la espina.

## Running and verifying

- El CI no ejecuta `npm run test:e2e`: las pruebas de Playwright solo corren en local, y lo hacen contra el sitio ya construido por `tests/servidor.mjs`, no contra `astro dev`.
- Itera por fichero de prueba: la suite unitaria serializa a propósito (`fileParallelism: false`) porque cada prueba lanza un `astro build`.
- `astro check` abarca todo el repositorio, no solo el sitio: `medicion/` y las pruebas e2e entran en el mismo programa de TypeScript.

## Conventions that differ from defaults

- Nombra las entidades en español según el glosario del PRD §3: `Cita`, `Autor`, `Tema`, `Procedencia`, `Colección`. Nunca `quote`, `frase` ni `author`, tampoco en identificadores de código.
- Un campo opcional sin valor se omite del fichero; nunca cadena vacía ni `null`. La distinción entre procedencia completa, parcial y ausente es de presencia de campos.
- Ningún componente lleva valores literales de color o tipografía — usa los tokens de `DESIGN.md` como propiedades personalizadas de CSS.
- La familia serif se aplica solo a texto de Cita, nombre de Autor y nombre de Tema.

## Known pitfalls

- Al añadir una página a `src/pages/`, declárala en `src/lib/superficies.ts`: es el único sitio donde se dice si una superficie es publicable, y de ahí salen el sitemap, el `noindex`, el índice de Pagefind y el barrido de accesibilidad. Sin declaración el build se para. Antes eran tres sitios y había que acordarse de los tres; `/404` y `/buscar` acabaron `noindex` para el buscador de fuera y visibles para el de dentro (Historia 12.1).
- No traigas `@cloudflare/workers-types`: sus globales redefinen `Buffer` y descompilan las pruebas que leen cabeceras PNG. Declara en `medicion/worker.ts` solo la superficie de D1 que uses.

<!-- /bmad:context -->

## Una sesión de sembrado, de principio a fin

El objetivo de cada sesión no se elige: sale del hueco del Corpus, con una política
determinista (Historia 11.3). La sesión empieza y termina con la misma orden:

```
npm run objetivo            # qué hueco toca cerrar, y de dónde sale. No registra nada.
npm run sesion:registrar    # al terminar de sembrar: anota la sesión y el resultado medido.
```

Registrar **no es opcional**: de `corpus/sesiones-de-sembrado.yml` sale la cadencia de
sembrado que declara la Historia 11.4, y es la única serie medida que existe. Una sesión
sin registrar no la cuenta nadie. Si dedicas la sesión a otra cosa, anúlala con su motivo
—`npx tsx tools/objetivo.ts --anular "<motivo>" [--elegido "<objetivo>"]`—; una anulación
sigue siendo una sesión corrida y cuenta igual para la cadencia.

## Curar una Colección

Una Colección se cura con su orden, nunca escribiendo el YAML a mano:

```
npm run coleccion -- crear "Frases cortas para reflexionar" --criterio "Citas de una sola frase."
npm run coleccion -- asignar frases-cortas-para-reflexionar <slug-de-cita> [<slug-de-cita>...]
npm run coleccion -- quitar frases-cortas-para-reflexionar <slug-de-cita>
npm run coleccion -- estado frases-cortas-para-reflexionar     # cuántas Citas le faltan
npm run coleccion -- listar
npm run coleccion -- despublicar frases-cortas-para-reflexionar
npm run coleccion -- publicar frases-cortas-para-reflexionar
```

**Qué impone la orden que el build no puede imponer.** El esquema juzga un fichero: que
tenga nombre y criterio, que el criterio quepa en una descripción, que cada miembro tenga
forma de slug. Lo que ningún esquema puede ver es la relación entre ficheros, y ahí es
donde la orden es la única puerta que existe:

- **que un miembro esté publicado.** `miembros` es una lista de slugs y jamás una
  referencia dura de esquema —si lo fuera, mover una Cita a `corpus/_revision/` rompería el
  build—, así que el build no puede saber si un slug es una Cita en revisión. La orden sí, y
  la rechaza. Editar el YAML a mano **sí se salta esta regla**: el slug de una Cita en
  revisión pasa la construcción y desaparece en silencio del listado.
- **que el slug exista.** Una errata se rechaza al escribirla; al build le da igual y solo
  la cuenta después como desajuste.

Lo demás sí es comodidad: nombre, criterio y forma de los miembros los aplica el esquema
igual, se edite el fichero como se edite, y el build se rompe si se incumplen.

Despublicar **mueve** el fichero a `corpus/_colecciones-retiradas/`, como retirar una Cita
lo mueve a `corpus/_revision/` (AD-2). No borra nada y no toca ninguna Cita; `publicar` lo
trae de vuelta. Ese directorio **no se versiona con `.gitkeep`**, a diferencia de
`corpus/_revision/`, `corpus/fuentes/` y `corpus/colecciones/`: lo crea la propia orden la
primera vez que se retira algo, y versionarlo vacío exigiría un fichero en `corpus/` que
ninguna Colección real justifica todavía. Cuando se retire la primera de verdad, el
directorio entra en el repositorio con ella y la excepción desaparece sola.

Curar la primera Colección de verdad es de Héctor: `corpus/colecciones/` se versiona vacío
a propósito y ningún agente siembra Colecciones en él.

## Componer un lote de jornadas

Publicar un día cuesta dos minutos con el Kit, pero exige estar ahí ese día. Un lote deja
varias jornadas preparadas de una sentada:

```
npm run jornada -- fijar 2026-08-24 <slug-de-cita>
npm run jornada -- fijar 2026-08-24 <slug> 2026-08-25 <slug> 2026-08-26 <slug>
npm run jornada -- soltar 2026-08-25 [2026-08-26 ...]
npm run jornada -- listar
```

**No hay ningún calendario del lote.** `fijar` escribe en `corpus/portada.json`, que es
donde `src/lib/citaDelDia.ts` ya busca antes de rotar desde la v1. Por eso lo compuesto por
adelantado y lo que se compondría el día son lo mismo: derivan de la misma fijación, y no
hay dos orígenes entre los que desempatar. Si alguna vez hace falta añadir un segundo sitio
donde vive una jornada, la respuesta es que no.

**Lo versionado es la fijación, nunca el material.** El material se deriva en cada
construcción, así que cambiar la Cita de una jornada ya compuesta la recompone sola: no
existe nada guardado que pudiera quedarse viejo. Y el lote es reanudable, porque `fijar`
añade y jamás vacía: `listar` enseña hasta dónde se llegó.

**Qué impone la orden que el build no puede imponer.** `corpus/portada.json` no es una
colección y ningún esquema lo juzga, así que aquí la orden es la única puerta que hay:

- **que el slug sea una Cita publicada.** Una que sigue en `corpus/_revision/` se rechaza:
  una fijación no adelanta contenido en revisión.
- **que esté marcada apta para portada** (FR-15). Es la regla que más falta hace. `citaDelDia`
  busca la Cita fijada **entre las aptas** y, si no está, ignora la fijación y rota para no
  dejar la portada muda — de modo que fijar una Cita sin marcar no falla: publica otra cosa
  el día que toque, sin avisar a nadie. `listar` y `/lote` marcan también las fijaciones que
  se quedaron mudas después, por retirarse la Cita o perder su marca.
- **que la jornada no haya pasado.** Fijar un día vencido no publica nada, porque ninguna
  construcción vuelve a componer la Cita del Día de ayer. «Pasado» se juzga contra la más
  temprana de dos lecturas —la del calendario local de quien ejecuta la orden y la UTC del
  build—, así que solo se rechaza lo que ya pasó en las dos: a la una de la madrugada
  peninsular las dos discrepan, y rechazar por error el día que la persona tiene por futuro
  deja la orden inservible justo cuando se usa. Un día vencido de más no publica nada y sale
  marcado con «·» en `listar`. Si `FECHA_JORNADA` está en el entorno, manda sobre las dos y
  la orden lo avisa por la salida de error.

Fijar la misma Cita en dos jornadas se admite y se avisa: repetir puede ser intencionado,
pero casi siempre es un descuido al pegar una lista.

El material compuesto se mira en `/lote`, que es el Kit de las jornadas que vienen: `noindex`,
fuera del sitemap y de los dos buscadores, y por la misma declaración única de
`src/lib/superficies.ts`. `/kit` y `/lote` se enlazan entre sí —son la misma herramienta en
dos momentos— y ninguna superficie del producto enlaza a ninguna de las dos, que es lo que
significa que no se llega desde la navegación. Se entra escribiendo la dirección.

El marcado del material lo comparten las dos páginas en `MaterialParaPublicar.astro`. Los
datos ya los comparten por `materialDelKit`; con la vista duplicada, «indistinguible» sería
cierto solo por dentro y el lote acabaría enseñando otra cosa en cuanto alguien tocara el Kit.

**`corpus/portada.json` lo puede escribir una persona y ningún esquema lo juzga**, así que el
sitio lo lee por `src/lib/portada.ts`, que descarta lo que no entiende en vez de tumbar el
build. La orden, en cambio, rechaza y lo dice: delante de ella hay alguien que puede
corregir. Las dos preguntan a `esJornada`, el único dueño de qué tiene forma de jornada.
Antes de la Historia 13.1 una clave mal escrita era inerte porque solo se consultaba la de
hoy; el lote las enumera todas, y una como `manana:` tumbaba `npm run build` entero.

Fijar jornadas de verdad en el repositorio es de Héctor: `corpus/portada.json` se versiona
con `fijaciones` vacío a propósito y ningún agente fija jornadas en él.

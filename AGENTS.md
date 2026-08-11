<!-- bmad:context -->
<!-- Verified 2026-08-11 against a26cd95. Managed by bmad-project-context; edits inside this block are replaced on refresh. Keep anything you want preserved outside the markers. -->

## Sabiduría Diaria

Sitio panhispánico de citas célebres en español, estático, construido con Astro 7 sobre un corpus de dominio público en ficheros versionados. No hay base de datos ni servidor de aplicación. La planificación vive en `_bmad-output/planning-artifacts/` y el seguimiento de historias en `_bmad-output/implementation-artifacts/sprint-status.yaml`.

## Policy

- Nunca edites a mano los artefactos de `_bmad-output/planning-artifacts/` — vuelve a ejecutar la skill BMad que los produjo (`bmad-prd`, `bmad-architecture`, `bmad-ux`, `bmad-create-epics-and-stories`) para que su `.memlog.md` no quede desincronizado.
- Nunca borres ficheros de `corpus/` para «limpiar» — git es el único almacén del contenido y no hay copia en otro sitio. Para retirar una Cita, muévela a `corpus/_revision/`.

## Where things are

- Antes de tocar `src/lib/` o `corpus/`: lee `_bmad-output/planning-artifacts/architecture/architecture-brainlySabiduria-2026-08-10/ARCHITECTURE-SPINE.md` — 13 decisiones vinculantes, cada una con la divergencia que impide.
- Al implementar una historia: `_bmad-output/planning-artifacts/epics.md` tiene sus criterios de aceptación; marca el avance en `sprint-status.yaml`.
- Decisiones visuales y de comportamiento: `_bmad-output/planning-artifacts/ux-designs/ux-brainlySabiduria-2026-08-10/DESIGN.md` y `EXPERIENCE.md`. Mandan sobre cualquier maqueta.
- Orden de construcción y verificación de la v1: `GUIA-DE-ARRANQUE.md`, junto a la espina.

## Running and verifying

- Las skills BMad documentan `uv run`, pero en esta máquina no hay `uv`: usa `python3`.
- `_bmad/scripts/sprint_plan.py` necesita `ruamel.yaml`, que no está instalado — falla con `ModuleNotFoundError` antes de leer nada.
- TODO: no hay `package.json` todavía. La Historia 1.1 lo crea con Astro 7 y TypeScript estricto; Astro 7 exige Node 22 como mínimo.

## Conventions that differ from defaults

- Nombra las entidades en español según el glosario del PRD §3: `Cita`, `Autor`, `Tema`, `Procedencia`. Nunca `quote`, `frase` ni `author`, tampoco en identificadores de código.
- Un campo opcional sin valor se omite del fichero; nunca cadena vacía ni `null`. La distinción entre procedencia completa, parcial y ausente es de presencia de campos.
- Ningún componente lleva valores literales de color o tipografía — usa los tokens de `DESIGN.md` como propiedades personalizadas de CSS.
- La familia serif se aplica solo a texto de Cita, nombre de Autor y nombre de Tema.

## Known pitfalls

- Pon la validación de admisión en el esquema de contenido, nunca solo en `tools/` — un fichero editado a mano esquivaría la comprobación y publicaría una Cita sin procedencia.
- Separa lo no publicado por directorio (`corpus/_revision/`), no con un campo que haya que filtrar — el filtro se olvida en la siguiente superficie que enumere contenido.
- Consume los tramos tipográficos desde su módulo único; codificar un tamaño a mano en el generador de imagen hace que la previsualización mienta respecto al fichero descargado.

<!-- /bmad:context -->

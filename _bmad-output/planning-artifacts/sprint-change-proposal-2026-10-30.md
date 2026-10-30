# Propuesta de cambio de sprint — 2026-10-30

**«Buscar en esta obra» va bajo el listado de la Página de Obra**

## 1. El problema

La Historia 27.8 se paró el 2026-10-29 por su propio Block If. Con «Buscar en esta obra» encima del listado, a 360 × 640 y sobre lo construido en `v8/epica-27`, la primera Cita de **6 de las 517** páginas 1 de Obra deja de empezar en la primera pantalla. La peor llega a **722,24 px**. Las seis son las Obras de título más largo, que parte en cuatro o cinco líneas a 360 px. El formulario, a las distancias de `DESIGN.md`, baja el listado unos 164 px.

Las medidas completas están en la sección `## Medidas` de `spec-27-8-buscar-en-esta-obra-en-un-autor-o-en-un-tema.md`, en la rama `v8/epica-27`. En la Página de Tema la peor primera Cita queda a 430,74 px, dentro de la primera pantalla.

Héctor eligió, el 2026-10-30, entre tres salidas: quitar el formulario de la Obra, apretar las distancias de `DESIGN.md` o moverlo. Decidió **moverlo bajo el listado y su paginación, antes de «Compartir en»**, solo en la Obra. El Autor y el Tema no cambian. La UX ya lo recoge en la v8.4 (`e12e6417fd`).

## 2. Impacto

| Dónde | Qué cambia |
|---|---|
| Épica 27, Historia 27.8 | El criterio «dónde va» y la medida de la primera pantalla, solo en la Obra. Sin historia nueva. |
| Épica 25, Historia 25.6 | El ritmo del pie de la Obra: «Compartir en» va 5 × bajo el formulario cuando lo hay. La 25.6 ya está construida en `v8/epica-25`, en revisión y sin fusionar. Como la 27 se fusiona antes que la 25, el código de la 25.6 tendrá que reajustarse al poner la rama al día. |
| Épica 24, Historia 24.7 | Nada. Su nota «no se reserva hueco para Buscar en esta obra» sigue siendo cierta, y ya está fusionada. |
| Inventario de UX en `epics.md` | UX-DR94 y UX-DR95. |
| PRD, `addendum.md` | Una línea de decisiones de Héctor. |
| Arquitectura, SPEC | Nada: ninguno fija el lugar del formulario. |
| UX | Hecho: v8.4, `e12e6417fd`. |
| Código | Solo la 27.8, todavía sin fusionar; su trabajo está en el parche `27-8-buscar-en-wip.patch`. Fuera de la Obra no cambia nada de lo construido. |

## 3. Camino elegido

**Ajuste directo.** No se revierte nada ni cambia el alcance. El esfuerzo es pequeño: mover el formulario y sus distancias en la página de Obra y en sus pruebas. El riesgo es bajo, porque la primera pantalla de la Obra vuelve a ser la de antes de la v8. La Épica 27 sigue entera y se fusiona con la 27.8.

## 4. Cambios propuestos

### 4.1 `epics.md` — UX-DR94

ANTES:
> […] *(v8.2)*. Va justo encima del listado que filtra:
> - **en la Obra**, a 4 × `{spacing.unit}` (32 px) del salto, con el listado 4 × más abajo;

DESPUÉS:
> […] *(v8.2)*. En el Autor y en el Tema va justo encima del listado que filtra; en la Obra, justo debajo *(v8.4)*:
> - **en la Obra**, tras el listado y su paginación y antes de «Compartir en», a 5 × `{spacing.unit}` (40 px) de la paginación —o de la última tarjeta— y con «Compartir en» 5 × más abajo. Encima echaba de la primera pantalla la primera Cita de las Obras de título más largo, 6 de 517 el 2026-10-29 (decisión de Héctor del 2026-10-30) *(v8.4)*;

### 4.2 `epics.md` — UX-DR95

ANTES:
> **Página de Obra, página 1** *(v8, variantes 2B y 3A)*.
> - **Orden:** la Cabecera de Obra con su salto, «Buscar en esta obra», el Listado de Obra con su Paginación, «Compartir en», […]
> - **Ritmo del pie:** 5 × `{spacing.unit}` (40 px) desde la paginación, o desde la última tarjeta, hasta «Compartir en»; 5 × de ahí a «Temas»; […]

DESPUÉS:
> **Página de Obra, página 1** *(v8, variantes 2B y 3A; v8.4)*.
> - **Orden:** la Cabecera de Obra con su salto, el Listado de Obra con su Paginación —4 × `{spacing.unit}` bajo el salto—, «Buscar en esta obra» *(v8.4)*, «Compartir en», […]
> - **Ritmo del pie:** 5 × `{spacing.unit}` (40 px) desde la paginación, o desde la última tarjeta, hasta «Buscar en esta obra», y 5 × de ahí a «Compartir en» *(v8.4)*; 5 × de ahí a «Temas»; […]

### 4.3 `epics.md` — Historia 27.8

ANTES:
> **Then** siempre justo encima del listado que filtra (UX-DR94, UX-DR95)
> **And** en la Obra, a 4 × `{spacing.unit}` del salto «Dónde leer esta obra ↓», con el listado 4 × más abajo

DESPUÉS:
> **Then** justo encima del listado que filtra en el Autor y en el Tema, y justo debajo en la Obra (UX-DR94, UX-DR95) *(v8.4)*
> **And** en la Obra, tras el listado y su paginación, a 5 × `{spacing.unit}` de la paginación —o de la última tarjeta—, y con «Compartir en» 5 × más abajo cuando la 25.6 ya esté; el listado empieza 4 × bajo el salto «Dónde leer esta obra ↓», como sin el formulario *(v8.4)*

ANTES:
> **Given** la primera Cita de la página 1 del Tema y de la Obra
> **When** se mide a 360 × 640 sobre lo construido, con el formulario y su botón
> **Then** sigue empezando en la primera pantalla, y la medida se anota, con fecha, en el spec de la historia (UX-DR94) *(v8.2)*

DESPUÉS:
> **Given** la primera Cita de la página 1 del Tema y de la Obra
> **When** se mide a 360 × 640 sobre lo construido, con el formulario y su botón
> **Then** sigue empezando en la primera pantalla, y la medida se anota, con fecha, en el spec de la historia (UX-DR94) *(v8.2)*
> **And** en la Obra el formulario no la mueve, porque va bajo el listado; la medida se anota igual, y es la de la 24.7 *(v8.4)*

### 4.4 `epics.md` — Historia 25.6

ANTES:
> **And** sigue el ritmo del pie de UX-DR95: 5 × `{spacing.unit}` desde la paginación, o desde la última tarjeta, hasta «Compartir en», y otros 5 × de ahí a «Temas»

DESPUÉS:
> **And** sigue el ritmo del pie de UX-DR95: 5 × `{spacing.unit}` desde lo que lo precede —«Buscar en esta obra», si la 27.8 ya está en la principal, o si no la paginación o la última tarjeta— hasta «Compartir en», y otros 5 × de ahí a «Temas» *(v8.4)*

### 4.5 PRD, `addendum.md` (línea 451)

ANTES:
> - **En la Página de Obra, «Buscar en esta obra» va encima del listado, y el bloque de compartir, después del listado y antes de los Temas**; […]

DESPUÉS:
> - **En la Página de Obra, «Buscar en esta obra» va debajo del listado y su paginación *(v8.4, decisión de Héctor del 2026-10-30: encima echaba de la primera pantalla la primera Cita de las Obras de título más largo)*, y el bloque de compartir, tras él y antes de los Temas**; […]

El cambio se anota también en el `.memlog.md` del PRD, para que la próxima pasada de `bmad-prd` lo conserve.

## 5. Traspaso

**Alcance: menor.** Lo implementa el bucle `v8-ralph` en `v8/epica-27`:

1. Commitear esta propuesta y los cambios de los §4.1 a §4.5 en la principal, aparte del código, y empujarlos. La puesta al día de la rama los trae.
2. En la rama, quitar el comentario «# bloqueada» de la línea `27-8` de `sprint-status.yaml` y anotar en el `## Spec Change Log` del spec de la 27.8 que la colocación de la Obra cambia por la v8.4. El constructor reaplica el parche y mueve el formulario; las demás piezas no cambian.
3. Cuando la 25 se ponga al día con la principal tras la 27, la 25.6 coloca «Compartir en» 5 × bajo el formulario. Su puerta lo comprueba con el ritmo del §4.4.

**Criterio de éxito:** la 27.8 pasa su Block If, con la primera Cita de toda página 1 de Obra y de Tema dentro de 360 × 640. La puerta de la Épica 27 sale en verde, y la épica se fusiona y se despliega.

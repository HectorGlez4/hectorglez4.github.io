---
title: 'Propuesta de cambio de sprint — la v5 atacaba la causa equivocada'
created: 2026-09-04
status: aprobada
trigger_story: 16.1
scope: moderado
---

# Propuesta de cambio de sprint — 2026-09-04

## 1. El problema

La v5 se planificó el 2026-09-02 con las primeras cifras de Search Console: 8 URL indexadas de 1.715, y 1.534 en «Detectada, actualmente no indexada». De ahí salieron dos épicas —la 16, para entrar en el índice; la 17, para darle contenido a la Página de Autor— sobre una hipótesis escrita como tal: que Google descartaba las páginas **por lo que son**, finas y casi idénticas.

La Historia 16.1 se construyó para medir eso. Al estrenarla contra Search Console el 2026-09-04, midió lo contrario.

**Evidencia**, registrada en `corpus/serie-de-indexacion.yml`:

| familia | indexadas | desconocidas | descubiertas, no indexadas |
|---|---|---|---|
| Cita | 0 de 24 | 13 | 11 |
| Autor | 1 de 20 | 9 | 10 |
| Tema | 0 de 20 | 13 | 7 |
| Colección | 1 de 16 | 10 | 5 |
| **Total** | **2 de 80** | **45 (56 %)** | 33 (41 %) |

Y la corroboración que lo cierra: Search Console declara `sitemap-0.xml` **leído el 2/09, con 1.715 páginas descubiertas**.

**Google conoce todas las URL y no las rastrea.** No es descubrimiento, no es contenido —no ha llegado a mirarlo— y no es SEO técnico: sitemap, canónicas, `robots.txt` y códigos de respuesta están comprobados. Es un sitio de dos días, sin un solo enlace entrante externo, que publicó 1.715 URL de golpe.

## 2. Impacto

- **Épica 16** — la 16.1 se salva entera y es lo que descubrió el error. La 16.2 pierde su premisa. La 16.3 es inconstruible hoy.
- **Épica 17** — no está rota, pero llega tarde: enriquecer 35 páginas de las que Google conoce 11 e indexa 1 no produce visitas mientras nadie las rastree.
- **PRD** — la pregunta 8 de §14 queda contestada; el supuesto de §15 queda falsado; §4.15 culpaba al contenido.
- **Espina** — AD-24 afirmaba que el techo era la cuota. Es el reloj: 6,6-16,3 s por inspección, y una pasada completa son entre tres y siete horas.
- **UX** — sin conflicto. La Página de Autor no cambia de forma, cambia de momento.

## 3. Camino elegido

**Ajuste directo con épica nueva.** Ni reversión ni recorte del MVP: nada de lo construido se tira.

## 4. Cambios aplicados

1. **PRD §14.8** — pregunta contestada, con el dato y con lo que descarta.
2. **PRD §15** — supuesto registrado como falsado, con fecha y motivo.
3. **PRD §4.15** — deja de culpar al contenido; conserva el instrumento.
4. **PRD FR-39** — aplazado, con condición de reapertura medible: una familia por encima del 20 % indexado.
5. **PRD §4.17 y §6.5** — feature nueva (FR-44…FR-46) y alcance reordenado.
6. **Espina AD-24** — el techo es el reloj, no la cuota.
7. **`epics.md` y tablero** — Épica 16 recortada con su motivo; Épica 18 con tres historias.

## 5. Entrega

**Alcance: moderado** — reorganización del backlog, sin replanificación fundamental. El PRD conserva su estructura, su visión y sus métricas; lo que cambia es qué se construye primero y por qué.

**Lo que este cambio prueba, y conviene no perder:** el orden que la v5 eligió dentro de la Épica 16 —la medición antes que el remedio— se pagó solo. Costó una tarde y evitó construir dos épicas en la dirección equivocada. El instrumento antes del tratamiento no era una preferencia de estilo.

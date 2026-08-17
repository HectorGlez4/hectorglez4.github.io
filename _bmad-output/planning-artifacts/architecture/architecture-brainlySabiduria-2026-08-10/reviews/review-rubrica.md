# Rubric walker — la espina contra la lista de buena espina

**Veredicto: pasa con un hallazgo alto, cerrado.**

| Criterio | Resultado |
|---|---|
| Fija los puntos reales de divergencia del nivel de abajo | Sí, más los tres que encontró la lente adversaria |
| Toda Rule es exigible y previene su divergencia declarada | Sí. AD-16 es comprobable construyendo dos veces; AD-14 lo es por inspección de dependencias |
| Nada en *Deferred* deja divergir a dos unidades | Sí. Los cuatro diferidos fijan la propiedad y difieren solo el mecanismo o el número |
| Tecnología nombrada verificada y actual | Sí — ratificada del repositorio, no de memoria. Ver `review-verificacion.md` |
| Ratifica el código en vez de contradecirlo | Es el eje de la pasada: cuatro contradicciones de la v1 corregidas contra el código real |
| Cubre las capacidades del PRD | **Hallazgo — ver abajo** |
| Toda dimensión del altitude decidida, diferida o pregunta abierta | Sí, incluida la operativa (dos desplegables, disparadores, sin staging, reversión, copia) |

## Alto — R1. NFR-8 y NFR-9 declarados en `binds` y no cubiertos

La espina afirma vincular NFR-8 (móvil primero, 360 px) y NFR-9 (WCAG 2.1 AA) y no dice nada de ninguno. No es cosmético: la v3 añade una superficie pública nueva —la Página de Colección— y el repositorio ya tiene `@axe-core/playwright`, así que **existe una comprobación automatizada que una superficie nueva puede no entrar a engrosar**, y nadie se entera. Es la misma forma exacta del fallo de AD-17: una lista paralela que hay que recordar.

**Cierre elegido:** plegarlo en AD-17 en vez de crear un AD nuevo. La misma declaración que decide si una superficie va al sitemap decide si entra en el barrido de accesibilidad y móvil. Un dueño, tres consecuencias — mejor que tres listas que mantener en paralelo.

## Bajo — R2. Densidad de AD

Veintiún AD es mucho para una espina, y el riesgo es que deje de leerse. Se comprobó uno a uno con la prueba del skill: los ocho nuevos superan los tres filtros (dos unidades podrían elegir incompatiblemente, la decisión no es obvia, y hay un compromiso real). Ninguno se retira. Se mitiga con el mapa Capacidad → Arquitectura, que permite entrar por la capacidad en lugar de leer los veintiuno.

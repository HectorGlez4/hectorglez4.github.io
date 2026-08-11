---
title: "Addendum — PRD Sabiduría Diaria"
status: final
created: 2026-08-10
updated: 2026-08-10
---

# Addendum del PRD

Profundidad que no cabe en el PRD pero que consumen Arquitectura, UX y la generación de épicas. El PRD define capacidades; aquí queda el *cómo* y el porqué de lo descartado.

## Modelo de datos implícito en el glosario

El §3 del PRD define entidades en lenguaje de producto. Traducido a lo que Arquitectura debe modelar, sin decidir tecnología:

| Entidad | Campos que el PRD hace obligatorios | Origen del requisito |
|---|---|---|
| **Autor** | nombre, semblanza, nacionalidad, **año de fallecimiento (obligatorio)** | FR-13, FR-15 |
| **Cita** | texto, autor (1:1), temas (N:M), **procedencia**, **estado de derechos**, **estado de publicación** | FR-1, FR-2, FR-13 |
| **Tema** | nombre, slug; no eliminable con citas publicadas | FR-6, FR-15 |
| **Cita del Día** | fecha, cita destacada; unicidad por jornada | FR-9 |

El **año de fallecimiento del Autor** es la clave de bóveda: es el único dato que hace que "dominio público" sea una condición comprobable por el sistema y no una afirmación del editor. Si Arquitectura lo modela como opcional, FR-13 deja de ser exigible y SM-C1 deja de ser medible.

La **Procedencia** admite tres grados (completa, parcial, ausente) y el PRD exige distinguirlos en la interfaz (FR-2). No es un campo de texto libre binario.

## Decisiones de mecanismo diferidas a Arquitectura

El PRD las evita a propósito; se listan para que no se tomen por omisión:

- **Renderizado.** NFR-2 exige contenido en el HTML inicial. Eso restringe el espacio de soluciones (servidor o pregeneración) sin elegir dentro de él. Con ~2.000 páginas, la pregeneración completa es viable; con crecimiento a decenas de miles, deja de serlo. Decisión con horizonte, no permanente.
- **Búsqueda.** FR-7 exige tolerancia a acentos y coincidencia por fragmento. Es lo que descarta una comparación exacta ingenua y lo que hace que la normalización del texto sea un requisito de datos, no un detalle de la consulta.
- **Generación de la Imagen de Cita.** El PRD no dice si se genera al vuelo, bajo demanda con caché, o por anticipado. Las tres cumplen FR-10 y tienen costes operativos muy distintos. Es la decisión de arquitectura con mayor impacto en coste de la v1.
- **Detección de duplicados (FR-14).** Exige normalización insensible a puntuación, acentos y mayúsculas. Comparte la normalización con la búsqueda; conviene que sea la misma.

## Origen del corpus — decidido en el brief

Recogido por referencia, no reabierto. Ver `briefs/brief-brainlySabiduria-2026-08-10/addendum.md` para la comparativa de vías (dominio público, derecho de cita, traducción, aportes de usuarios) y para la nota de plazos por jurisdicción. Resumen operativo: se publica solo `dominio-público`; el campo Estado de Derechos existe para admitir otros criterios sin rehacer la ingesta.

## La feature que el brief no nombraba

El brief dice que "la curación es interna" y ahí se detiene. El PRD convierte esa frase en la feature §4.8 con cuatro requisitos funcionales.

Razón: sin una herramienta que rechace por construcción las Citas sin procedencia y los Autores sin año de fallecimiento, el criterio de admisión depende únicamente de la disciplina del editor. Un compromiso que solo vive en la cabeza de una persona no es un diferenciador defendible — es una intención. FR-13 lo convierte en una propiedad del sistema, y FR-16 lo hace observable.

Consecuencia de alcance: la v1 incluye una superficie interna que el brief no presupuestaba. No es grande, pero no es cero, y aparece en el plan de entrega.

## Contra-métricas — por qué estas dos

Ambas nacen de la misma observación: las métricas primarias del producto se pueden subir por la vía barata, y la vía barata destruye el producto.

- **SM-C1 (procedencia verificada)** contrapesa el tráfico. Publicar más citas sube SM-2; verificar menos es la forma más rápida de publicar más.
- **SM-C2 (densidad de Temas)** contrapesa la indexación. Multiplicar Temas sube el número de páginas indexables de SM-1, y produce exactamente las páginas vacías que el §El Problema del brief identifica como el defecto de los competidores.

Si alguna de las dos se elimina en una revisión futura, conviene releer este párrafo antes.

## Deuda conocida que entra a propósito

- **Sin cuentas de usuario.** Implica que no hay forma de medir retorno a nivel de persona; SM-4 y SM-5 son proxies agregados. Aceptado.
- **Editor único.** FR-13…FR-16 se diseñan para un operador. Multiusuario, roles y permisos son v2 y requerirán revisar la herramienta, no ampliarla.
- **Temas gestionados a mano.** Escala mal por encima de unos pocos cientos de Citas por Tema, pero protege SM-C2. Consciente.

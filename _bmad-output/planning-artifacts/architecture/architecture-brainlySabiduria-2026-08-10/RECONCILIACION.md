---
title: "Reconciliación aguas arriba — tras la pasada de arquitectura de la v3"
status: final
created: 2026-08-17
updated: 2026-08-17
---

# Reconciliación aguas arriba

Lo que esta pasada ratificó **contradice** a otros artefactos del proyecto. Ninguna de estas divergencias es urgente y ninguna bloquea las épicas de la v3, pero cada una es un sitio donde alguien —tú dentro de tres meses, o un agente leyendo el repositorio— va a encontrar dos afirmaciones incompatibles y creer a la equivocada.

Van ordenadas por lo que cuesta que sigan ahí.

## 1. `AGENTS.md` manda leer una espina que ya no dice eso — **corregir pronto**

El bloque `bmad:context` dice literalmente *«13 decisiones vinculantes»* y lo verifica contra el commit `a26cd95`. Ahora son **21**. Peor que el número: la sección *Known pitfalls* enumera los tres errores de la v1 y no menciona ninguno de los cuatro de la v3, que son los que se van a cometer ahora.

Es el fichero que un agente lee **primero y siempre**, así que una desactualización aquí se propaga a todo lo que se construya. Además arrastra dos cosas ya falsas por su cuenta: *«TODO: no hay `package.json` todavía»* (lo hay desde la Historia 1.1) y la nota de que `sprint_plan.py` falla por `ruamel.yaml`.

**Cómo:** volver a ejecutar `bmad-project-context`, que es su skill dueña. No editar el bloque a mano — el propio `AGENTS.md` lo prohíbe en su sección *Policy*.

## 2. El PRD y su addendum dan por indecidido algo que ya estaba resuelto — **corregir al retocar el PRD**

El addendum de la v3, en *Decisiones de mecanismo*, dice sobre FR-29: *«Dónde vive el material compuesto por adelantado y cómo se reconcilia con la reconstrucción diaria de AD-12»*, y lo delega a Arquitectura.

No hacía falta delegarlo: la v1 ya lo había resuelto. `corpus/portada.json` tiene fijaciones de jornada y `citaDelDia.ts` les da prioridad sobre la rotación desde entonces. El lote fija jornadas ahí y no necesita mecanismo nuevo — y, de paso, la exigencia de que «lo anticipado sustituya a lo de la jornada» se cumple sola, porque ambos derivan de la misma fijación.

**Por qué importa:** una historia escrita desde ese párrafo del addendum construirá un segundo calendario, y dos calendarios son la divergencia clásica: cuál manda cuando ambos declaran la jornada del martes.

## 3. La espina de UX no conoce dos superficies — **revisar antes de diseñar la Página de Colección**

`EXPERIENCE.md` describe las superficies de la v1. No contiene el Kit Diario (v2, ya construido) ni la Página de Colección (v3, por construir). Para la Colección esto sí es material: AD-19 obliga a que toda agregación presente las Citas con el **mismo componente de tarjeta** que Tema y Autor, y si UX diseña la Colección con una presentación propia, el diseño y la espina chocan en la primera historia.

**Cómo:** una pasada de `bmad-ux` acotada a la Página de Colección, con AD-19 como restricción de entrada.

## 4. Lo que esta pasada ya corrigió, y no hay que tocar

Estas cuatro divergencias estaban **dentro** de la espina y quedaron resueltas aquí. Se listan para que nadie las «arregle» otra vez desde el lado equivocado:

| Decía la espina v1 | Dice el código | Resuelto en |
|---|---|---|
| «No hay servidor de aplicación, ni base de datos» | `medicion/worker.ts` + D1 desde la v2 | **AD-14** — el plano existe y es de un solo sentido |
| «Ningún artefacto de imagen se sirve desde el origen» (AD-7) | La Tarjeta Social se pregenera por Cita | **AD-15** — el consumidor decide el plano |
| «Solo tres islas existen» (AD-6) | Hay cuatro; la cuarta es interna | **AD-6** enmendado — la invariante no es el número |
| AD-9 con tres umbrales | `umbrales.ts` tiene seis | **AD-9** enmendado |

## 5. Un cabo suelto que no es de nadie

`DESPLIEGUE.md` señala que si `sabiduriadebolsillo.com` sigue libre conviene registrarlo y redirigirlo al `.net` desde el registrador. No es arquitectura ni producto: es una tarea tuya con fecha de caducidad, porque el nombre queda expuesto en cuanto el sitio se publique y empiece a circular por las cuentas.

# Protocolo del bucle de sprint — Sabiduría Diaria

Estado durable del bucle autónomo. Si el contexto se compacta, **este fichero manda**.

Rama: `sprint/sabiduria-v1`. Un commit por historia.

## Orden de ejecución

El orden es el de `sprint-status.yaml`, con una excepción: **4.3 va después de 4.1**
(la 404 necesita la Cita del Día). En el fichero de estado 4.3 ya aparece dentro de la Épica 4.

## Puerta por historia (no se pasa a la siguiente sin las cinco)

| # | Puerta | Comando / medio | Aplica a |
|---|---|---|---|
| 1 | Tipos | `npx astro check` | todas |
| 2 | Unitarias | `npx vitest run` | todas |
| 3 | Build | `npm run build` | todas |
| 4 | Funcional E2E | `npx playwright test tests/e2e/<historia>.spec.ts` | historias con superficie web |
| 5 | UX en navegador | Chrome MCP (`mcp__claude-in-chrome__*`) contra `localhost:4321` | historias con superficie web |

**Épica 1 (1.1–1.8) no tiene superficie web.** Sus puertas son 1–3 más pruebas de
*fallo de build* (una Cita inválida **debe** romper el build) ejecutadas con vitest
invocando `astro build` en un corpus de prueba. Las puertas 4 y 5 empiezan en 2.1.

### Qué comprueba la puerta 5 (UX en Chrome)

No repite lo que ya cubre Playwright. Comprueba lo que solo se ve mirando:

- Jerarquía visual real: la Cita domina, la atribución no compite.
- Tokens: cero sombras, filete de 1px como único separador, siena solo donde toca.
- Serif exclusivamente en texto de Cita, nombre de Autor y nombre de Tema.
- Respiración y ritmo vertical de 8px.
- Foco visible al tabular, a ojo.
- 360 / 768 / 1280: el ancho extra es aire, no contenido.

Se toma captura en 360 y en 1280 por historia con superficie nueva.

## Al cerrar cada historia

1. `sprint-status.yaml`: la historia pasa a `done`; su épica a `in-progress` en la primera.
2. Commit: `feat(<épica>.<historia>): <título>`.
3. Nota de una línea en `BITACORA.md` con lo verificado y lo que quedó fuera.

## Condición de parada

Se sigue sin parar. Solo se detiene ante un **bloqueo real**: una decisión que no
puede tomarse sin Héctor, una dependencia externa que no existe, o un criterio de
aceptación que el stack no permite cumplir. Un test en rojo no es un bloqueo: se arregla.

## Decisiones tomadas por el bucle (asunciones declaradas)

- **Corpus semilla.** Las historias 2.x en adelante necesitan Citas reales para
  verificarse. Se siembra un corpus de dominio público verificable (autores fallecidos
  hace más de 80 años, con obra y año) **usando la herramienta de alta de la 1.5**, de
  modo que sembrar es a la vez la prueba de la herramienta. Volumen objetivo: suficiente
  para que al menos un Tema cruce el umbral de 15 y un Autor cruce las 50 Citas (necesario
  para verificar 2.4 y 2.5 de verdad, no con datos ficticios).
- **Proveedor de analítica (2.9).** AD-13 fija propiedades, no producto. Se implementa
  `medicion.ts` con un adaptador sin cookies conmutable por variable de entorno y un
  destino nulo por defecto. Contratar el proveedor es decisión de despliegue.
- **CI (4.2).** No hay remoto git configurado. Se escribe el workflow con los dos
  disparadores y se verifica su lógica en seco; no puede verificarse una ejecución real.

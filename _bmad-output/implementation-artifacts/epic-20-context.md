# Epic 20 Context: Se mide antes de mover

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Héctor lee, desde series versionadas en el Corpus y no desde un panel ajeno, qué red trae visitas a cualquier superficie, cuánto tráfico orgánico llega cada mes y a qué familia, qué páginas se buscan y cuántas páginas de cada familia indexa Google. Va primera en la v7 porque todo lo demás de la fase (la Épica 21, el canal propio) se juzga con estas series, y hoy la de indexación tiene una sola lectura, las de tráfico y demanda no existen y D1 no se ha leído desde este equipo. Completa FR-22 (la marca de origen cuenta también fuera de la Página de Cita), da cifra propia a SM-2 y SM-8, y deja línea base para SM-5…SM-7.

## Stories

- Story 20.1: La vista de una superficie de agregación deja fila
- Story 20.2: La serie de tráfico orgánico se versiona desde Search Console
- Story 20.3: La demanda medida se versiona por página
- Story 20.4: La semana cero se lee y se anota

## Requirements & Constraints

- **Evento nuevo `vista-de-superficie`** (20.1): lo emiten una sola vez la portada y las Páginas de Autor, Tema y Colección, con su marca de origen; la Página de Cita sigue con `vista-de-cita` y no emite el nuevo; `/buscar`, `/404`, `/kit` y `/lote` no lo emiten (son internas o de servicio). Sin identificador, cookie, sesión ni referente; `destino` y `datos` se descartan en ese evento sin descartar el evento, y los campos de más se ignoran. La razón `vista-de-cita / vista-de-superficie` se declara agregado por jornada, nunca sesión.
- El guion en línea debe seguir bajo `MAX_BYTES_DE_GUION`; si no cupiera, se abrevia el guion y **jamás se sube el tope**.
- Sin `MEDICION_ENDPOINT`, `dist/` debe quedar idéntico al anterior (ninguna prueba lo comprueba hoy; solo vale con la misma `FECHA_JORNADA` y el mismo corpus).
- `DESPLIEGUE.md` §3 debe documentar las consultas nuevas: SM-8 por origen y evento, y la razón por jornada.
- **Serie de tráfico** (20.2): `npm run trafico` informa y no escribe; `npm run trafico:registrar` escribe `corpus/serie-de-trafico.yml`, una entrada por mes con `leidoEl`, `parcial: true` en el mes en curso, clics, impresiones, CTR y posición en total y por familia; una segunda lectura del mismo mes reemplaza. Cabecera del fichero que explique qué mide y por qué reemplaza.
- **Serie de demanda** (20.3): dimensión página, ventana de 28 días y 16 meses por mes en la primera lectura; agrega por Autor (ruta de Cita atribuida por el prefijo de slug de Autor más largo) y por Cita; filas con menos de cinco impresiones se suman en un resto declarado; un prefijo sin Autor del Corpus va a «sin Autor» y se dice, no se descarta. Informa Autores por impresiones, Citas con clic y reparto por familia. No entra en `src/lib/objetivo.ts` ni en `npm run huecos` en este ciclo.
- **Convenciones comunes de las dos series:** sin `SEARCH_CONSOLE_CREDENCIALES` → nombra lo que falta, nada escrito, código 2; lectura totalmente fallida → código 1, nada escrito; un mes o familia ilegible se omite y aparece en `sinLeer` con su motivo, **nunca se escribe cero**. Código 2 para la forma de la invocación, 1 para lo que dice. Las órdenes hermanas traen `--json`, `--corpus` y su sección en AGENTS.md, aunque los AC no lo nombren.
- Las series no cuentan la familia Obra hasta la pasada de métricas del PRD. La cifra es de clics de Search Console, que no son las sesiones de SM-2.
- **20.4 es manual y de Héctor** (wrangler, credencial como Propietaria, dos lecturas de indexación commiteadas aparte con `--presupuesto 200`, inspección de la canónica de Unamuno y Gracián con y sin barra, Bing para pasar la 16.2 a revisión, paneles del canal anotados fuera de `corpus/`). Un agente no la ejecuta; la convención del tablero para «código hecho, acto manual pendiente» es `review` con comentario.

## Technical Decisions

- **Vocabulario cerrado (AD-13):** el evento se añade solo en `src/lib/medicion.ts`; `Medicion.astro` y `Armazon.astro` lo propagan (hoy solo aceptan `vistaDeCita`) y las cuatro páginas lo piden. El receptor importa el vocabulario, no lo copia. `medicion/esquema.sql` no lleva CHECK sobre `evento`: **no hay migración**, pero el Worker se redespliega el mismo día que el sitio (si no, el receptor descarta el evento en silencio).
- **Un solo sentido (AD-14) y series que el sitio no toca (AD-24 extendido):** ningún byte de `dist/` deriva de D1 ni de las series; viven en la raíz de `corpus/` como metadato, ninguna colección de `src/content.config.ts` apunta a ellas y ningún módulo de `src/lib/` las importa (con prueba que lo sostenga; plantilla en `rastreo.test.ts`).
- **Red solo en la cáscara (AD-22):** `tools/trafico.ts` y `tools/demanda.ts` hacen las peticiones; `tools/lib/trafico.ts` y su par son puros y se prueban con respuestas fijas, al patrón de `tests/unit/indexacion.test.ts`. Se **prueban** sin credencial y solo se **corren** con ella.
- **Reutilizar, sin tecnología nueva:** `googleapis` y lo que exporta `tools/lib/indexacion.ts` (variable y código de credencial, `credencialDe`, `propiedadDeDominio` desde `public/CNAME`); el alcance `webmasters.readonly` cubre `searchanalytics.query` y el SDK expone `rowLimit`, `startRow` y `dataState`. Patrón de reemplazo por clave: `registrarLecturaDeIndexacion`.
- Los clics por consulta vienen anonimizados: la demanda se agrega **por página**, nunca por consulta.

### Huecos abiertos a fijar en el spec de la historia (puerta CONCERNS)

- **Forma de `serie-de-demanda.yml` (20.3):** «idempotente por fecha» no casa con 16 ventanas mensuales en la primera lectura. Suposición aceptada por SPEC y puerta: una entrada por ventana con `desde`, `hasta` y `leidoEl`, reemplazo por ventana; «primera» = la serie no tiene entradas mensuales; `hasta` = último día que la fuente devuelve (retardo de 2–3 días). Fijarla antes de escribir la primera entrada: la forma de una serie no se cambia después.
- **Familia de una URL (20.2, 20.3):** sale del censo, no del prefijo de ruta (`superficies.ts` no devuelve familia). Fijar el criterio —censo tras `rutaNormalizada`— y qué pasa con lo que no casa (formas sin barra como `/autor/miguel-de-unamuno`, páginas 2+, Citas retiradas): «sin familia» declarado, nunca descartado en silencio.
- **`dataState`** que se pide a Search Analytics (20.2): no está fijado; decidirlo y escribirlo.
- **Páginas 2+** de Autor, Tema y Colección (20.1): no se dice si emiten el evento, ni qué pasa si llegan `vistaDeCita` y `vistaDeSuperficie` a la vez; decidir y probar.
- **Baliza manual de comprobación** (20.1): deja en D1 una fila indistinguible de una visita; que no lleve `origen` real ni infle la cifra de 30 días.
- El «prefijo de Autor más largo» vive hoy privado en `tools/autor.ts`; para la 20.3 se extrae a un dueño compartido en vez de copiarlo.

## Cross-Story Dependencies

- La 20.1 es independiente; hasta que esté desplegada (sitio y Worker), solo los enlaces a una Página de Cita dejan fila, y la Épica 21 publica igualmente.
- La 20.3 reutiliza los cimientos de la 20.2 (credencial, propiedad, criterio de familia, convención `sinLeer`); conviene hacerlas en orden.
- La 20.4 va numerada la última pero sus gestos empiezan el primer día y en paralelo; es la que corre de verdad las series de la 20.2 y 20.3 y la de indexación (16.1), y su lectura de Bing cierra FR-38 y mueve la 16.2.
- Orden del tablero: 20.1–20.3 → 19.1 → Épica 22. Cuando la Página de Obra exista (Épica 22), también emitirá `vista-de-superficie` (decisión de Héctor del 08/10); la 20.1 no la toca porque aún no hay rutas de Obra.

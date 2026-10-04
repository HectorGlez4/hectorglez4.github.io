---
title: 'Ciclo 1 — Se mide antes de mover, y el canal propio lleva al sitio'
created: 2026-10-04
status: diseño aprobado por Héctor el 2026-10-04 en cuatro secciones; texto pendiente de su revisión
origen: >-
  2026-10-04-fase-siguiente-borrador.md (plan de la fase, seis épicas candidatas) y
  2026-10-03-datos-recogidos.md (informe de datos), en esta misma carpeta.
---

# Ciclo 1 — Se mide antes de mover, y el canal propio lleva al sitio

Este documento es el diseño del primer ciclo de la fase. No es un artefacto BMad y no
sustituye a ninguno: lo aprobado aquí va a `bmad-create-epics-and-stories` para escribir
las Épicas 20 y 21 con sus criterios de aceptación, y de ahí a `bmad-build` historia a
historia. Nada de lo que sigue se escribe a mano en `_bmad-output/`.

## 1. Por qué este ciclo

El sitio **ya se indexa**: 1.050 de 2.000 URL desde una sola tanda del 17 al 21 de
septiembre (Citas ≈51 %, Autor 18 de 65). Lo que no tiene es autoridad ni rastreo
sostenido: 11 clics y 421 impresiones en 43 días, posición media 27,5, cero enlaces
externos, y las dos Páginas de Autor con demanda a posición 78,7 y 69,2. Mientras tanto,
el canal propio —27.722 seguidores en Facebook, 19.700 en TikTok, 19.800 en YouTube— no
tiene un solo camino comprobado al sitio: el Linktree no lo lista y la bio de TikTok
apunta a un `.com` que responde 402. La marca de origen `?de=` que el Kit compone desde
la v2 no la pisa nadie, y nada de esto se puede medir desde el equipo de Héctor: `wrangler`
sin sesión y `SEARCH_CONSOLE_CREDENCIALES` ausente.

El ciclo hace dos cosas, en la misma semana: **enciende las series** con las que se
juzgará todo lo demás, y **conecta el canal al sitio** con lo que el repositorio ya
compone. No promete posición ni dinero: promete cifras.

## 2. Decisiones tomadas el 2026-10-04

1. Orden de la fase: medir y conectar el canal primero; después la Página de Cita, después
   la Página de Autor; el sembrado por demanda en ráfagas detrás; umbrales y producto
   cuando haya serie.
2. Credenciales **esta semana**, las dos: `npx wrangler login` y la cuenta de servicio de
   Search Console como Propietaria (DESPLIEGUE.md §5).
3. **Donaciones apagadas** de momento. La Épica 14 queda construida y apagada; no se abre
   cuenta de cobro en este ciclo.
4. **El `.com` se deja caducar** (julio de 2027). Solo se corrige la bio de TikTok al `.net`.
5. Línea editorial de Facebook: **Citas del Corpus con un hueco semanal de historia**. El
   texto publicado es el literal del Corpus, con obra y año; el post de historia no lleva
   enlace al sitio.
6. Horas de Héctor: **unas 6 por semana** durante 12 semanas. Cabe el ciclo entero.
7. Citas aptas para portada: **el agente propone con regla escrita y Héctor tacha en
   bloque**; un solo commit con la regla en el mensaje.
8. Métrica de éxito del ciclo: a 90 días, **≥400 vistas al mes con origen Facebook** es
   éxito y **<100** es fracaso. Entre medias se sigue sin reabrir nada.

## 3. Alcance

**Dentro:** Épica 20 (medición) y Épica 21 (canal), con sus gestos manuales. Las
historias 18.1 y 18.2, hoy en backlog, se cierran desde la 21 en vez de duplicarse; 16.2
pasa a revisión en cuanto se lea Bing.

**Fuera, con su condición de apertura escrita en el borrador del plan:** la Página de
Cita (E-C), la Página de Autor (E-D), el sembrado por demanda (E-E), umbrales y producto
(E-F), Facebook como destino de compartición (FR-18), el vídeo (FR-31: `origen=facebook`
≥400 vistas/mes dos meses seguidos), el título «Frases y citas de» (Unamuno a posición
≤20), y la Época (19.4).

## 4. Épica 20 — Se mide antes de mover

### 20.1 El evento de vista en las superficies de agregación

**Qué cambia.** `src/lib/medicion.ts` añade al vocabulario cerrado una entrada
`vistaDeSuperficie: 'vista-de-superficie'`, con su comentario de qué superficies lo
emiten. `Medicion.astro` acepta `vistaDeSuperficie?: boolean`, excluyente con
`vistaDeCita`; `Armazon.astro` lo propaga; lo piden `src/pages/index.astro`,
`src/pages/autor/[slug]/[...page].astro`, `src/pages/tema/[slug]/[...page].astro` y
`src/pages/coleccion/[slug]/[...page].astro`. No lo piden `/buscar`, `/404`, `/kit` ni
`/lote`: las dos primeras ya emiten lo que miden o no son destino de ninguna Pieza, y las
dos últimas no son superficies del producto.

**Por qué.** Hoy `vista-de-cita` es la única vista que llega a D1, así que toda Pieza de
Canal —que aterriza en la portada o en una Página de Colección— y toda visita a una Página
de Autor desde Facebook se pierden: SM-8 solo ve lo que el Kit enlaza a una Cita. Con el
evento, SM-8 se completa y aparece un proxy honesto de profundidad: la razón
`vista-de-cita / vista-de-superficie` por jornada, agregada, sin sesión ni visitante.

**El receptor.** `medicion/receptor.ts` importa el vocabulario, así que acepta el evento
sin tocar una línea; `medicion/esquema.sql` guarda `evento` como texto sin restricción,
así que **no hay migración**. Hace falta **redesplegar el Worker** (`cd medicion && npx
wrangler deploy`, DESPLIEGUE.md §3) el mismo día que se despliegue el sitio: hasta
entonces el receptor descarta el evento en silencio, que es exactamente el fallo que la
cabecera del receptor describe. La comprobación posterior es una baliza manual y un
`SELECT evento, COUNT(*) … GROUP BY evento`.

**Lo que no cambia.** Sin identificador, sin cookie, sin referente. `datos` sigue
significando algo solo en la búsqueda sin resultados; `destino` solo en las
comparticiones. La marca de origen se coteja igual: `guionDeMedicion` lee `?de=` de
`location.search` en cualquier ruta y la contrasta con `REDES_VALIDAS`.

**Riesgo propio.** El guion en línea lleva la lista de eventos como JSON, así que el
evento nuevo añade unos veinte bytes a toda página y cuenta contra `MAX_BYTES_DE_GUION`
(`src/lib/umbrales.ts`). La prueba de presupuesto existente decide; si no cabe, se
abrevia dentro del propio guion, nunca subiendo el tope.

**Pruebas.** `tests/unit/medicion.test.ts` (el vocabulario lo contiene; el guion lo
incluye; `emitir` lo compone), `tests/unit/receptor.test.ts` (lo acepta con `origen`
válido; descarta `destino` y `datos` en él), `tests/e2e/receptor.spec.ts`, y una prueba de
construcción: con `MEDICION_ENDPOINT` definido, portada, Autor, Tema y Colección llevan
la emisión y la Página de Cita no la duplica; sin él, `dist/` es idéntico al actual.

**Documentación.** DESPLIEGUE.md §3 gana las consultas nuevas: SM-8 por `origen` y
`evento`, y el proxy de profundidad por jornada.

### 20.2 La serie de tráfico orgánico

**Qué cambia.** `tools/trafico.ts` con `tools/lib/trafico.ts`, al patrón de
`tools/indexacion.ts`: la red solo en la cáscara (AD-22), la misma credencial y el mismo
alcance `webmasters.readonly` (`credencialDe`, `VARIABLE_DE_CREDENCIALES`,
`SALIDA_SIN_CREDENCIALES` de `tools/lib/indexacion.ts`), la propiedad derivada de
`public/CNAME`. Lee el informe de rendimiento Web de la API de Search Analytics por
**mes**, con el total y el reparto por familia (dimensión `page`, agregada por prefijo de
ruta con `src/lib/superficies.ts`): clics, impresiones, CTR y posición media.

**Dónde escribe.** `corpus/serie-de-trafico.yml`, metadato del Corpus como sus vecinas:
una entrada por mes, **idempotente por mes** (una segunda lectura reemplaza), con
`leidoEl` y una marca de **mes parcial** mientras el mes no haya cerrado. `npm run
trafico` informa y no escribe; `npm run trafico:registrar` escribe. Sin credencial, código
2 y nada escrito; lectura fallida, código 1 y nada escrito; un mes que no se pudo leer se
omite y **jamás se escribe como cero**. Ningún módulo de `src/lib/` la lee (AD-24, misma
regla que la serie de indexación).

**Por qué.** Es la única cifra de tráfico orgánico que existe —el receptor no guarda
sesiones ni referente—, y es con la que algún día se reanclarán los Umbrales (E-F). Hoy
se leyó a ojo y se perdió.

### 20.3 La serie de demanda por página

**Qué cambia.** `tools/demanda.ts`, misma credencial, dimensión **page** y no `query`:
los 11 clics medidos vienen de consultas anonimizadas y por consulta no se verían. Ventana
de 28 días en cada lectura, y de 16 meses en la primera. Agrega impresiones y clics por
**slug de Autor** —ruta `/autor/<slug>/` y rutas `/cita/<slug>/` atribuidas al Autor por
el prefijo más largo, como hace `tools/autor.ts retirar`— y por Cita, con un mínimo de
cinco impresiones por fila para no versionar ruido. Escribe `corpus/serie-de-demanda.yml`,
idempotente por fecha; `npm run demanda` informa (Autores por impresiones, Citas con
clic, reparto por familia) y `demanda:registrar` escribe. Mismos códigos y misma regla de
ausencia que 20.2.

**Lo que no hace en este ciclo.** No entra en `src/lib/objetivo.ts`: que la política de
sembrado derive el hueco de la demanda es la rama que FR-49 pide y es decisión del ciclo
de sembrado, no de este. Aquí la demanda se versiona y se informa.

### Los gestos manuales de la Épica 20, en orden

1. `cd medicion && npx wrangler login`, y las consultas de DESPLIEGUE.md §3: vistas por
   jornada, origen por red, compartición por destino, búsquedas sin resultado. Es la línea
   base de SM-5, SM-6, SM-7 y SM-8, anotada con fecha en el informe de datos.
2. La credencial de Search Console como Propietaria (DESPLIEGUE.md §5), y dos lecturas de
   la serie de indexación con presupuesto corto en la semana: `npm run
   indexacion:registrar -- --presupuesto 200`, commiteadas aparte.
3. Inspección de URL de `/autor/miguel-de-unamuno/` y `/autor/baltasar-gracian/` con y sin
   barra: qué canónica eligió Google, y a qué URL corresponden las 5 «con redirección» y
   las 2 «duplicadas». Si eligió la forma sin barra, hay una historia corta antes de tocar
   nada en la familia Autor; si no, el residuo del 31 de agosto se da por cerrado.
4. Bing Webmaster Tools: si el sitio está y cuántas URL. Es el criterio «se mide aparte» de
   la 16.2, que está construida desde agosto en `tools/avisar.ts`; con la lectura, pasa a
   revisión.
5. Los paneles de monetización del canal, con fecha: Facebook (RPM por tipo, requisitos de
   Acuerdos de marca), YouTube Studio (Programa de Partners, ingresos de 28 días), TikTok
   Creator, y las ventas de Spring. Es la única cifra de ingreso que existe hoy, y decide
   dónde van las horas de canal del ciclo siguiente.

## 5. Épica 21 — El canal propio lleva al sitio

### 21.1 La rotación de la Cita del Día se dispersa por Autor

**Qué cambia.** `citaDelDia` (`src/lib/citaDelDia.ts`) ordena hoy las aptas por slug, y
como el slug empieza por el Autor, agrupa: con las 16 actuales salen tres Séneca seguidos.
Pasa a un orden determinista **en rondas por Autor**: se agrupan las aptas por Autor, los
Autores se ordenan por slug y dentro de cada Autor por slug, y el recorrido toma la
primera de cada Autor, luego la segunda de cada uno, y así. El índice sigue siendo los
días desde la época módulo el tamaño del conjunto; las fijaciones de `corpus/portada.json`
mandan igual. Es una permutación de las aptas, así que FR-9 («recorre todas antes de
repetir») y AD-12 (misma Cita en dos builds del mismo día) se conservan.

**Efecto visible.** Al desplegar, la Cita de ese día cambia: FR-9 no fija cuál sale, solo
que rote. El RSS (`src/lib/sindicacion.ts`) y el Kit heredan el orden sin tocarse.

**Pruebas.** `tests/unit/cita-del-dia.test.ts`: dos jornadas consecutivas no comparten
Autor mientras haya al menos dos Autores con Citas en la ronda; el recorrido cubre todas
las aptas antes de repetir; la fijación sigue ganando; con un solo Autor se comporta como
hoy. `sindicacion.test.ts` y `kit.test.ts` siguen pasando.

### 21.2 De 16 Citas aptas a 120 o más, en un solo commit

**La regla, escrita en el mensaje del commit:** texto de ≤160 caracteres; `procedencia.obra`
presente; entre una y dos Citas por Autor; los 24 Temas cubiertos; prioridad a los Autores
con demanda medida (Unamuno, Gracián, Cervantes, Machado, Marco Aurelio, Martí, Quevedo).
Con 120 aptas la rotación tarda cuatro meses en repetir y el RSS de 30 jornadas no repite
ninguna.

**El procedimiento.** El agente genera la lista completa —slug, Autor, Tema, caracteres—
en un fichero fuera del repositorio; Héctor tacha en bloque; se aplica con un bucle sobre
`npx tsx tools/portada.ts marcar <slug>` y se comprueba con `npx tsx tools/portada.ts
listar`. Un commit, `feat(portada)`, con la regla en el cuerpo. La orden ya rechaza lo no
publicado (`marcarAptaParaPortada`, `tools/lib/gestion.ts`).

### 21.3 El registro de publicaciones de canal

**Qué cambia.** `corpus/publicaciones-de-canal.yml`, que **solo añade**, como
`corpus/peticiones-de-rastreo.yml`: fecha, red (una de `REDES` en `src/lib/redes.ts`),
formato (`foto`, `reel`, `pieza`, `historia`), la ruta enlazada sin dominio —o ninguna, si
el post no enlaza— y una nota opcional. La orden es `tools/canal.ts`: `npm run canal` lista
por semana ISO y por red, cruzado con lo que D1 diga cuando haya sesión; `npm run canal --
anotar <red> <formato> <ruta|-> [--fecha AAAA-MM-DD]` añade. Rechaza una red fuera del
conjunto, una ruta que el sitio no publique (misma puerta que `tools/rastreo.ts`, por
`src/lib/superficies.ts`) y una fecha futura. Códigos: 1 lo que la invocación dice, 2 su
forma. Ningún módulo de `src/lib/` lo lee.

**Por qué.** Es el criterio de aceptación de la 18.2: «la cadencia se sostiene» solo se
puede afirmar si está anotada, y «el enlace queda contado como señal» exige saber qué se
enlazó y cuándo. Sin registro, a los 90 días no se distingue «la página no trae visitas»
de «se publicó la mitad de las semanas».

### 21.4 El registro de señales externas

**Qué cambia.** `corpus/senales-externas.yml`, solo añade, con `npm run canal -- senal
<url-de-origen> <ruta-destino> --tipo propia|ajena [--fecha]` y la misma lista en `npm
run canal`. `propia` es una bio, un Linktree o una descripción de vídeo del proyecto;
`ajena` es un dominio que el proyecto no controla. **Solo `ajena` cierra la 18.1**: las
propias se anotan para cruzarlas con la serie de indexación y con el informe de enlaces,
donde hoy ni siquiera se sabe si un enlace de bio llega a figurar. Esa es la hipótesis
que la primera señal propia mide: se pone, se esperan dos semanas, se lee.

### Los gestos manuales de la Épica 21

- **El camino del enlace, en una tarde y por orden de efecto:** bio de TikTok al `.net`
  (hoy 19.700 personas ven un dominio que da error); el sitio como primer enlace del
  Linktree; el campo «Sitio web» y el botón de acción de la página de Facebook al sitio;
  la bio de Instagram. Cada uno se anota con `canal -- senal … --tipo propia`.
- **El pie de cada post, con regla de caída:** si el post es una Cita publicada, el texto
  de `textoParaCopiar` tal como lo da el Kit y el enlace `/cita/<slug>/?de=<red>`; si es un
  Autor sin Cita concreta, `/autor/<slug>/?de=<red>`; si no, `/?de=<red>`. El post de
  historia semanal no lleva enlace. El enlace en el pie o en el primer comentario se
  prueba por semanas alternas y se compara en D1.
- **La plantilla semanal:** cada día la Cita del Día como **foto** nativa, con la Imagen del
  Kit; dos **reels** a la semana con el texto literal del Corpus, nunca una redacción
  propia; una **Colección de la semana** compuesta con `npm run pieza -- coleccion <slug>
  --red facebook`, empezando por `refranes-de-sancho`; un **Autor** quincenal con `npm run
  pieza -- componer --red facebook` y tres o cuatro Citas suyas; un post de **historia** sin
  enlace; una pregunta al final de cada pie. Las jornadas se fijan por semanas con `npm run
  jornada -- fijar` para que el lote componga el material con antelación, y cada
  publicación se anota con `canal -- anotar`.
- **La semana 0, antes de publicar bajo plantilla:** la línea base de D1 del gesto 1 de la
  Épica 20; los dos posts de octubre de 2025 que hicieron 493 y 239 interacciones (qué
  eran, si llevaban enlace); y la hora a la que el público está, para fijar la hora de
  publicación. El Kit se reconstruye a las 05:15 UTC, que son las 23:15 en Ciudad de
  México: por eso se publica desde el lote y no «cuando el Kit esté».

## 6. Métricas del ciclo

| Momento | Cifra que dice si funciona |
|---|---|
| 30 días | Serie de indexación con dos lecturas; línea base de D1 leída; `origen=facebook` > 0 con el pie puesto; Bing leído; paneles del canal anotados. |
| 60 días | `origen=facebook` en camino a 400/mes; Páginas de Autor indexadas ≥22 de 65; páginas con impresiones > 136. |
| 90 días | **`origen=facebook` ≥400 vistas/mes** (éxito; si dura dos meses reabre FR-31) o **<100** (fracaso: la página no es canal de visitas). Clics orgánicos ≥60 por 28 días. Visitas a la página de Facebook ≥300. |

Hasta que 20.1 esté desplegado, solo los pies que lleven a una Página de Cita dejan fila
en D1: la comparación de la semana 0 se hace sabiéndolo.

## 7. Riesgos

- **Presupuesto de guion.** Veinte bytes más en toda página; lo decide la prueba, no se
  sube el tope.
- **Facebook recorta el alcance de los posts con enlace.** Por eso el pie y el primer
  comentario se alternan por semanas y se comparan en D1, no se decide de antemano.
- **Credenciales.** Llevan un mes sin ponerse; sin ellas, la Épica 20 se queda en 20.1 y
  la 21 publica a ciegas. Es el primer gesto de la semana por eso.
- **D1 es UTC y el público es de América.** Se compara por semana ISO, no por jornada.
- **El cambio de rotación mueve la Cita del día del despliegue.** Se despliega un día sin
  jornada fijada, o se fija la de ese día.
- **Las 2–3 horas semanales de canal.** Si faltan, se recorta el Autor quincenal y los
  reels antes que la foto diaria y el registro.

## 8. Lo que este ciclo no decide

Quedan para sus ciclos, con lo que cada uno necesita leído antes: la ampliación de
UX-DR17 y UX-DR34 para la Página de Cita (E-C, pasada de `bmad-ux`); el orden
17.3 → 17.4 → 17.6 y la fuente de las semblanzas (E-D, tras las inspecciones del gesto 3);
el listón de la 19.2, el verso y la retirada (E-E); el reanclaje de los Umbrales a clics
de Search Console y el producto propio (E-F, con tres lecturas de la serie de tráfico y
los paneles del canal delante); y cuál de los canales que ya pagan merece las horas del
ciclo siguiente.

## 9. Ruta

1. Héctor revisa este texto. Se commitea aparte, antes de cualquier historia.
2. `bmad-create-epics-and-stories` escribe las Épicas 20 y 21 con sus historias (20.1,
   20.2, 20.3, 21.1, 21.2, 21.3, 21.4) y sus criterios de aceptación; la 18.2 se cierra
   desde 21.3 y 21.4; la 18.1 queda abierta hasta la primera señal `ajena`; la 16.2 pasa a
   revisión con la lectura de Bing. `bmad-sprint-planning` actualiza el tablero.
3. `bmad-architecture` solo si juzga que AD-24 debe nombrar las dos series nuevas; AD-13
   no cambia, porque añadir un evento por su módulo es la fricción que ya diseña.
4. `bmad-build`, historia a historia, con la puerta completa antes de cada push.
   DESPLIEGUE.md §3 y AGENTS.md se actualizan en las historias que los toquen.

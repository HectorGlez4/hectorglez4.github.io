# Revisión adversaria de la espina v8.5

- **Objeto:** el diff sin commitear de `ARCHITECTURE-SPINE.md` (v8.5, 2026-10-31), leído contra la espina entera: AD-11, AD-13, AD-14, AD-17, «Cuotas del receptor» y la convención «Estilos».
- **Método:** para cada regla nueva, dos historias de un nivel por debajo que cumplen todas las AD al pie de la letra y aun así construyen cosas incompatibles. Cada pareja es un agujero, y cada agujero se cierra con una regla más estrecha. Se contrasta con el código vigente: `tools/lib/medicion.ts`, `tools/lib/lineaBase.ts`, `src/lib/umbrales.ts`, `medicion/esquema.sql`, `DESPLIEGUE.md` §3, y con `EXPERIENCE.md` y `DESIGN.md` de la UX v8.5.
- **Fecha:** 2026-10-31. No se ha corrido nada con `--remote`.

## Veredicto

**CONCERNS.** La intención de la cuota de lectura es correcta y llega a tiempo: con la tabla creciendo, una lectura de la línea base o un `desplegar` podían agotar en silencio la cuota de la cuenta. Pero la regla está escrita sobre el **paso** y no sobre la **orden**. No fija **cuándo** se juzga dentro de `desplegar`, ni **qué** dato hace falta, ni **qué** código de salida rige, ni **quién** es dueño de la constante y del juicio. Dos historias honradas pueden construir dos guardas distintas. La que más duele infravalora el coste de `desplegar` en un orden de magnitud y deja fuera a `comprobar`, que recorre la tabla tanto o más que la lectura.

Las alineaciones de AD-11 y AD-17 con la UX son correctas en el fondo. La de AD-11 crea un segundo dueño de la letra, y ese dueño contradice a `EXPERIENCE.md` en el caso de una sola Cita. La de «Estilos» dice «la única excepción», pero `DESIGN.md` tiene dos, y no declara que convierte en infracción buena parte de lo ya construido.

---

## A1 — El coste se estima por paso, pero la cuota la gasta la orden entera, y hay una tercera orden que la gasta

**Lo que dice la espina.** AD-13 estima el barajado en «unas tantas filas leídas como filas tiene». AD-14 estima la lectura en «unas cinco veces las filas de la tabla». «Cuotas del receptor» afirma que «las dos órdenes que recorren la tabla entera la juzgan».

**Lo que hay.** `eventos` solo tiene dos índices, `(jornada, evento)` y `(origen, jornada)`. Ninguno es por `ruta`, así que toda sentencia con `WHERE ruta = '/__comprobacion/'` recorre la tabla.

- **`desplegar`** recorre la tabla en cada uno de estos pasos:
  - `SQL_DE_RECUENTOS` antes y después: 2N;
  - `SQL_DE_FILAS` (`COUNT(*)`) en las dos lecturas de la cuota: 2N;
  - en cada intento de `comprobarConBalizas`, un `DELETE … WHERE ruta` y un `SELECT … WHERE ruta`: hasta 3 × 2N, más el borrado final;
  - el barajado: N.

  Son unas 11–12 N, no N.
- **`comprobar`** hace el mismo bucle de balizas, hasta unas 7 N, y no juzga ninguna cuota. Es la orden que la espina no nombra.
- **La lectura** necesita saber N para estimar. `d1 info` no da el número de filas, y el `rowid` no se puede nombrar (AD-13). Queda un `COUNT(*)`, que ya es otro recorrido, N, antes de juzgar. Son 6 N, no 5 N.

**La pareja.**
- *Historia A* (23.x-lectura) estima 5 × N con un literal `5` y cuenta N con un `COUNT(*)` que no suma.
- *Historia B* (23.x-barajado) estima N para el barajado, «unas tantas filas leídas como filas tiene», al pie de la letra.

Las dos cumplen AD-13 y AD-14. Con N = 400.000, B aprueba un `desplegar` que lee unos 4,8 M. Si esa mañana hubo una lectura (unos 2,4 M), la cuenta pasa de 5 M a media orden, después de migrar y desplegar. Desde el 2026-09-01, D1 falla entonces toda consulta hasta las 00:00 UTC, y eso incluye el borrado de balizas y los recuentos de después.

**Regla propuesta.**
- **El coste que se juzga es el de la orden entera desde el juicio hasta su fin.** Lo calcula una sola función a partir de la lista declarada de sentencias que recorren la tabla, con sus repeticiones máximas (`INTENTOS_DE_COMPROBACION`), nunca con un literal «cinco» o «una».
- **Ese coste incluye el recuento que da N.**
- **`comprobar` juzga la cuota de lectura igual.** Si no, la espina dice por qué está exenta, y «Cuotas del receptor» deja de decir «las dos órdenes».

*Alternativa estructural, a decidir por Héctor:* un índice por `ruta`, en una migración aditiva, que bajaría las balizas a coste casi nulo. Cambia el esquema, así que es AD-14 y no esta pasada.

---

## A2 — En `desplegar`, ¿cuándo se juzga la lectura? ¿Antes de migrar o solo antes de barajar?

**Lo que dice la espina.** AD-13: el barajado «juzga también la cuota de lectura con la misma regla». La «regla» de escritura que la precede solo dice «el paso las cuenta antes». Que se mire antes de migrar lo dicen `AGENTS.md` y el código (`previsto`, «No se migra ni se despliega»), no la espina.

**La pareja.**
- *Historia A* juzga la lectura donde AD-13 coloca la frase, justo antes del `UPDATE`. Cumple la letra.
- *Historia B* la juzga, como la escritura, antes de migrar y otra vez antes de barajar.

Con A, un día justo ocurre esto: `desplegar` migra, despliega el receptor nuevo, comprueba con balizas, se para en la lectura y sale con 1 **sin huella**, porque la huella solo se escribe en el último paso. El receptor en vivo queda por delante del sitio, que es lo que la frase de la escritura ya prohíbe: «migrar y desplegar para pararse después no sirve de nada».

**Segunda pareja, dentro de B.** Entre el primer juicio y el segundo, la propia orden gasta recuentos y balizas, unas 8 N. `d1 info` puede no verlo todavía, igual que no ve aún las balizas escritas, que el código suma a mano (`Math.max(actual.escritas24h, previa.escritas24h + balizas)`).
- *B1* usa el `rows_read_24h` crudo en el segundo juicio, que infravalora.
- *B2* suma lo leído por la orden.

**Regla propuesta.** Las dos cuotas de `desplegar`, escritura y lectura, se juzgan **juntas y antes de la primera sentencia que lee la tabla entera**, y desde luego antes de migrar, con el coste de la orden entera (A1). Antes de barajar se juzgan otra vez con `max(lo que diga d1 info, lo del primer juicio + lo que la orden ya leyó y escribió)`. Fallar cualquiera de las dos para la orden con 1 y con el parte, sin trocear.

---

## A3 — La cuota pasa a ser precondición de la lectura, y el contrato de salida de `npm run medicion` no se ha reescrito

**Lo que hay.** Hoy, en `leer` y en `DESPLIEGUE.md` §3, `d1 info` se pide **después** de las cinco consultas. Si falla, sus cifras van a «Sin leer». La orden sale con **1** solo si no se leyó nada: ni una consulta con forma ni **ninguna cifra de `d1 info`**. Con **0** si leyó algo.

**Lo que dice la v8.5 (AD-14).** «Si ese dato no se deja leer, no lee y sale con 1.»

**Las parejas.**
1. **Qué es «el dato».**
   - *A* exige solo `rows_read_24h` numérico, finito y ≥ 0. `rows_written_24h` y `database_size` siguen yendo a «Sin leer» por separado (la `CuotaLeida` de la 23.10).
   - *B* exige que `d1 info` conteste JSON con las tres cifras, o que salga con 0, y se niega si falta cualquiera.

   Las dos cumplen «el dato no se deja leer». B rompe la independencia que la 23.10 construyó a propósito («la falta de una no se lleva la otra»).
2. **Qué es «no se leyó nada».**
   - *A* conserva la disyunción vigente. Si las cinco consultas fallan pero `d1 info` dio cifras, sale con 0 y un informe vacío salvo la cuota.
   - *B* entiende que, siendo `d1 info` ahora precondición, ya no cuenta como «leído», y sale con 1.
3. **El orden de las precondiciones.**
   - *A* hace el `COUNT(*)`, N filas leídas, antes de leer el Corpus.
   - *B* lee antes el Corpus. Un Corpus ilegible gasta N filas en A y ninguna en B.

   `AGENTS.md` dice que los umbrales se juzgan «antes de tocar nada, para no gastar cinco recorridos». No dice nada del Corpus ni del recuento.

**Regla propuesta.**
- **La cuota de lectura es precondición, no lectura.** Sin un `rows_read_24h` numérico, finito y ≥ 0, la orden sale con 1 antes de la primera sentencia que lee filas, nombrando la clave que falta.
- `rows_written_24h` y `database_size` siguen yendo cada una a «Sin leer» por su lado.
- **«No se leyó nada» pasa a significar ninguna consulta con recuentos con forma.**
- **Toda precondición local** (sesión → 2; umbrales, Corpus y censo → 1) **va antes de todo paso remoto que lea filas.**
- `DESPLIEGUE.md` §3 y el párrafo de códigos de `AGENTS.md` se reescriben en la misma historia.

---

## A4 — Dos dueños posibles de la constante, del multiplicador y del juicio

**Lo que dice la espina.** No nombra ninguna constante para la cuota de lectura. La de escritura, `CUOTA_DE_FILAS_ESCRITAS_POR_DIA_EN_D1`, tiene dueño en `src/lib/umbrales.ts` solo por el código, y la espina tampoco la nombra. El «tres por fila» del barajado vive en `tools/lib/medicion.ts` (`FILAS_ESCRITAS_POR_FILA_BARAJADA`). Las dos secuencias viven en `tools/lib/medicion.ts`, y «todo lo demás, puro», en `tools/lib/lineaBase.ts`.

**La pareja.**
- *Historia A* (lectura) escribe `5_000_000` y un `cabeLaLectura` puro en `tools/lib/lineaBase.ts`, porque es «todo lo demás, puro».
- *Historia B* (barajado) añade `CUOTA_DE_FILAS_LEIDAS_POR_DIA_EN_D1` en `umbrales.ts` y extiende `cabeElBarajado` en `tools/lib/medicion.ts`.

Quedan dos números, dos reservas y dos redacciones del mensaje. Cuando el proyecto pase al plan de pago, «cambia aquí y en ningún otro sitio» (el comentario de la constante de escritura) deja de ser cierto. Lo mismo pasa con el «cinco»: una sexta consulta en `CONSULTAS_DE_LA_LECTURA`, como una tasa nueva de `JUICIOS_POR_VENTANAS`, no mueve la estimación si es un literal.

**Regla propuesta.**
- `CUOTA_DE_FILAS_LEIDAS_POR_DIA_EN_D1` vive en `src/lib/umbrales.ts`, junto a la de escritura, con la nota «por cuenta, no por base».
- **Una sola función pura de `tools/lib/medicion.ts`** juzga las tres cosas: escritura del barajado, lectura de `desplegar` (y de `comprobar`) y lectura de la línea base. Toma el coste, lo usado en 24 h, la reserva y la cuota.
- Cada coste se deriva de la lista de sentencias de su orden (`CONSULTAS_DE_LA_LECTURA.length`, los intentos de baliza), nunca de un literal.

---

## A5 — Un contador que puede infravalorar, una cuota por cuenta y un informe que no distingue estimación de medida

**Lo que dice la espina.** «Tras leer, informa de las filas que leyó la pasada, la suma de los `rows_read` de sus consultas, frente a la cuota.» El `.memlog` añade que hay informes de que el contador de 24 h infravalora y que «la historia lo coteja con la suma de `rows_read`». Eso no ha pasado a la espina.

**Las parejas.**
1. **Suma parcial.**
   - *A* suma los `rows_read` de las consultas que salieron, y si una falló la suma sale parcial, presentada como total.
   - *B* omite la suma si falta uno.

   La espina impone «ausencia antes que cero» en todas las series, y aquí no lo dice.
2. **Estimación y medida.**
   - *A* informa solo de la medida.
   - *B* informa de la estimación y de la medida.

   Solo B permite ver que el multiplicador se quedó corto, por ejemplo si el planificador recorre índice y tabla y D1 cuenta las dos cosas. Con A, la estimación infravalora para siempre sin que nadie lo vea. Es justo el fallo de un contador que protege poco.
3. **Por cuenta y por base.** «Cuotas del receptor» dice que la cuota es «por cuenta y no por base», pero `d1 info` da `rows_read_24h` de la base `medicion`. El mensaje de la escritura ya avisa de ese punto ciego («lo que escriba hoy otra base D1 suya no está contado»). La regla de lectura no lo pide, y una historia puede omitirlo.
4. **Para qué sirve la reserva.** En escritura, la reserva protege lo que el sitio escribirá hasta las 00:00 UTC. En lectura, el sitio no lee D1 (AD-14), así que `rows_read_24h` es casi entero lo que han leído estas mismas órdenes y las consultas a mano de `DESPLIEGUE.md`. «Reservar otro tanto» no protege al sitio salvo que pasar la cuota de lectura también tumbe los `INSERT` del Worker. «Las consultas fallan» no dice si es así. Si los tumba, el daño real es perder eventos del sitio sin que nadie se entere, y eso es lo que la regla debería nombrar. Si no los tumba, la reserva es solo un margen para Héctor.

**Regla propuesta.**
- El informe de la lectura da la estimación, la medida y la diferencia, y dice «la estimación se quedó corta» cuando la medida la supera.
- La medida solo se da si **todas** las consultas trajeron `meta.rows_read`. Si no, va a «Sin leer», jamás como total parcial.
- El mensaje del juicio nombra el punto ciego de la cuenta, como el de escritura.
- «Cuotas del receptor» declara si pasar la cuota de lectura tumba las escrituras del Worker, y con ello para qué es la reserva.

---

## A6 — AD-11: la letra de la línea de cifras tiene ahora dos dueños, y no dicen lo mismo

**Lo que dice la espina (v8.5).** «cuya forma con el censo de pendientes de cotejo vacío —«cada una cotejada con el texto de su fuente», nunca «cada una con su fuente»— escribe la misma función, y cuya letra decide `EXPERIENCE.md`».

**Lo que dice `EXPERIENCE.md`** (§ Portada, Línea de cifras):
- con una sola Cita: «1 cita de 1 autor, cotejada con el texto de su fuente.», **sin** «cada una»;
- el veto: **«Nunca dice «cada una», en ninguna forma,** mientras quede alguna Cita publicada sin documento».

**La pareja.**
- *Historia A* (28.x, prueba de `publicado.ts`) fija lo que cita la espina: con el censo vacío, la coletilla es «cada una cotejada con el texto de su fuente». Falla con n = 1.
- *Historia B* fija lo que dice `EXPERIENCE.md`.

Además, la espina estrecha el veto a «nunca «cada una con su fuente»». Una prueba escrita desde la espina dejaría pasar «cada una cotejada…» con censo, que `EXPERIENCE.md` prohíbe. La frase cita una letra y en la misma frase dice que la letra es de otro.

**Regla propuesta.** AD-11 se queda con el invariante y no cita la letra: **una sola función** de `publicado.ts` escribe las dos formas, con censo y sin censo, y la elige por si el censo está vacío; «cada una» se veta en cualquier forma mientras quede censo; el verbo que comprueba AD-23 se conserva. La letra, incluidos los singulares, la decide solo `EXPERIENCE.md`.

---

## A7 — «Estilos»: «la única excepción» frente a las dos de `DESIGN.md`, y una migración sin declarar

**Lo que dice la espina (v8.5).** «Ningún valor de color o tipografía en un componente; tipografía incluye el peso y el interlineado, con la única excepción que nombra `DESIGN.md § Typography`.»

**Lo que dice `DESIGN.md` (v8.5).** «La familia sale de `--serif` o `--sans`, **y el espaciado entre letras lo escribe cada componente**». La única excepción *nombrada* es el interlineado 1 de las letras de salto. El espaciado entre letras es un valor tipográfico literal permitido en todo componente: hoy lo escriben `Rotulo.astro`, `BloqueDeCita.astro` y `TarjetaDeCita.astro`.

**Las parejas.**
1. *Historia A* escribe la prueba que la convención pide, sin valores tipográficos literales en los `<style>` de `src/components/`, e incluye `letter-spacing`. Rompe lo construido y contradice `DESIGN.md`. *Historia B* no lo incluye. Las dos leen «Estilos» al pie de la letra.
2. Hoy hay `font-weight` y `line-height` literales en al menos seis componentes, entre ellos `BloqueDeCita.astro`, `TarjetaDeCita.astro`, `Rotulo.astro`, `Fuente.astro` y `FilaDeAutor.astro`. *Historia A* (la primera de la v8.5 que toque un componente) migra solo el suyo. *Historia B* los migra todos. La espina no dice que la convención nueva sea una migración, ni quién la hace, ni qué puerta la fija. Sin puerta, la regla se cumple solo donde alguien toca algo.

**Regla propuesta.**
- La convención dice «el **peso** y el **interlineado** salen de sus propiedades; el espaciado entre letras no es token y lo escribe el componente; la única excepción a lo primero es la que nombra `DESIGN.md § Typography`».
- Añade que es una **migración de lo construido**, con una historia dueña y una prueba sobre los `<style>` de `src/components/` y `src/pages/` que veta `font-weight` y `line-height` literales salvo esa excepción.

---

## Lo que se comprobó y está bien

- **AD-17, el tipo `portada`.** Rotulada «Portada» y titulada con `MARCA` casa con `EXPERIENCE.md` y con `src/lib/tipoDeResultado.ts`, que ya tiene `portada: 'Portada'`, y con `TIPOS_CON_TITULO_EN_SANS`. Sin agujero.
- **El empalme del Entorno operativo** (la baliza dentro de la atribución de la v8.2) queda bien recompuesto.
- **El diferido del mínimo de lecturas** cierra con el valor y el commit que constan en `umbrales.ts` (300, 2026-10-25).

## Resumen de cierres propuestos

| # | Agujero | Regla en una frase |
|---|---|---|
| A1 | Se estima el paso, no la orden; `comprobar` queda fuera | Se juzga el coste de la orden entera desde el juicio, derivado de la lista de sus sentencias que recorren la tabla, con el recuento de N incluido, y `comprobar` juzga igual o la espina dice por qué no. |
| A2 | No se fija cuándo se juzga la lectura en `desplegar` | Escritura y lectura se juzgan juntas antes de la primera sentencia que recorre la tabla y antes de migrar, y otra vez antes de barajar con lo ya gastado por la orden sumado a `d1 info`. |
| A3 | El contrato de salida de la lectura queda ambiguo | `rows_read_24h` es precondición (1 antes de leer filas si falta), las otras dos cifras siguen yendo a «Sin leer» por separado, «no se leyó nada» es ninguna consulta con forma, y lo local va antes de lo remoto. |
| A4 | Dos dueños posibles de la constante y del juicio | `CUOTA_DE_FILAS_LEIDAS_POR_DIA_EN_D1` va en `umbrales.ts` y una sola función pura de `tools/lib/medicion.ts` juzga las tres cuotas, sin multiplicadores literales. |
| A5 | Suma parcial, estimación sin medida, punto ciego de la cuenta, reserva sin motivo | El informe da estimación, medida y diferencia, nunca una suma parcial como total; el mensaje nombra la cuenta; la espina dice si pasar la cuota de lectura tumba los `INSERT`. |
| A6 | AD-11 cita una letra que `EXPERIENCE.md` contradice con n = 1 | AD-11 fija el invariante (una función, dos formas, «cada una» vetado con censo) y no cita la letra. |
| A7 | «Única excepción» frente al espaciado entre letras, y migración sin dueño | El espaciado se exceptúa por nombre, y la convención se declara migración con historia y prueba. |

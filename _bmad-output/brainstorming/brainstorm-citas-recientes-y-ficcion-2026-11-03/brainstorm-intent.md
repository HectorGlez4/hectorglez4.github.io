---
origen: bmad-brainstorming, 2026-11-03, modo facilitador, técnica «Sí, y…»
memlog: .memlog.md (fuente canónica de esta sesión)
destino: entrada de bmad-prd (intención Update) tras cerrar la espina v9
---

# Intención: Citas de autores vivos y de personajes de ficción

## Por qué

La siembra de dominio público está agotada: PARADA 3, con 4.970 Citas. Héctor quiere dos palancas nuevas:

1. **Ingreso.** Citas de autores vivos o recientes cuyos libros se venden con enlaces de afiliado. El ejemplo es Yuval Noah Harari con *Sapiens*: el lector compra por la curiosidad que le despierta la frase.
2. **Tráfico.** Frases célebres de personajes de ficción, que la gente busca por el nombre del personaje: «frases de Darth Vader».

El modelo de referencia es BrainyQuote.

## Lo que decidió Héctor

- **El Autor es quien dice la Cita**, no quien escribió la Obra.
  - En la ficción, el Autor es el personaje (Darth Vader), con su propia Página de Autor. Se descartaron como Autor el guionista, el dueño del personaje y el actor.
  - La Obra es aquella en la que se dice la frase, por ejemplo *El imperio contraataca*.
  - La semblanza es la misma de siempre, escrita desde la cultura pop: quién es el personaje dentro de su universo.
- **Se mantiene la cadena Cita → Obra → afiliación.** El enlace es opcional: si no hay nada que vender, no se pone nada.
- **Las familias nuevas se publican sin cotejo literal**, como BrainyQuote. Basta con que la frase sea ampliamente conocida.
  - Se corrige a posteriori: habrá un canal visible para pedir que se corrija o se retire una Cita, sobre todo si afecta a una persona viva.
- **La Fuente se muestra cuando existe y se calla cuando no.**
  - Sin Fuente no se dice nada, o se dice de forma discreta. No hay sello de «no verificada».
- **Se eligen universos donde hay algo que vender.** Primero los cómics, que son Obras comprables, y luego las películas y los libros.
  - Primeros nombres: Batman, Homero Simpson, Barney Stinson y The Dude.
  - Observación de la sesión: lo que los une es que **se citan como meme**, no el medio del que vienen.
- **Doblajes y traducciones: manda la versión de México y Latinoamérica.**
  - Esa versión es la principal, la que lleva la página.
  - Se admite publicar también la otra traducción, la de España.
- **Se abre el territorio de la ficción mexicana.** Todavía no se nombró ningún personaje.
- **Siembra:**
  - BrainyQuote como semilla de prueba para unos pocos autores.
  - A escala: búsqueda abierta en internet, seguida de filtros y una puerta de calidad.
  - Se aparcaron las señales de fiabilidad por decisión de Héctor.

## Conexiones que la sesión no hizo explícitas (síntesis)

1. **Las dos palancas se juntan en la ficción con Obra comprable.** Un cómic de Batman trae a la vez tráfico, por el personaje, e ingreso, por el cómic. El autor vivo de no ficción, como Harari, trae ingreso y poco tráfico de cola larga. La figura pública sin Obra, como el ejemplo de Trump, trae tráfico, ningún ingreso y el riesgo de reclamación más alto.
2. **Que el Autor sea quien dice la Cita parte el concepto de Autor en dos:** persona y personaje. Ese cambio toca el JSON-LD (`Person` frente a `Person` ficticio o `CreativeWork`), los años, la clave de orden, el cruce por época y el suelo del 40 % latinoamericano.
3. **La v9 ya tiene preparado el lado del ingreso.** La «afiliación sin reloj», las varias tiendas, las ediciones curadas y «Consíguelo» encajan sin cambios con estas familias.
   - Choque: «Cómo citar» (FR-58) y «Lee el pasaje» (FR-59) se apoyan en la edición cotejada.
   - Una Cita sin Fuente tiene que quedar **fuera** de esas dos funciones. Que la Fuente se calle cuando no existe ya apunta a eso.
4. **La pregunta abierta de la Lista de Obras de un personaje** (aparece en muchas Obras y medios) es la misma que dejó abierta la Obra con varias grafías. La identidad Obra = (Autor, forma) de AD-25 se pone a prueba cuando el Autor es un personaje que atraviesa franquicias.

## Tensiones que la convergencia tiene que resolver (no las cerró la sesión)

- **Derechos.** «Ampliamente conocida» no es dominio público legal. Las frases de autores vivos y de personajes tienen derechos vigentes. Lo que ampara usarlas es el **derecho de cita** o el uso legítimo, que exigen brevedad, atribución y finalidad. Además, los personajes suelen ser marcas registradas. El criterio de admisión del brief y del PRD (dominio público) cambia.
- **BrainyQuote como semilla.** Copiar su recopilación choca con sus términos de uso y, en la UE, con el derecho *sui generis* sobre bases de datos. Que sea una prueba no lo cambia.
- **El contrato de Procedencia.** Publicar sin cotejo entra en conflicto con:
  - AD-3 y FR-23, la Procedencia cotejada literal;
  - la contramétrica SM-C1, la procedencia verificada;
  - la regla del build de que una Cita con Fuente mutable rompe;
  - el censo de `pendientes-de-cotejo.yml`.

  Hay que decidir si las familias nuevas son **otra clase de Cita**, con su propio esquema y sin entrar en SM-C1, o si se relaja el contrato para todas.
- **La confianza de la marca.** El sitio se diferencia hoy por la Procedencia verificada. Mezclar Citas sin verificar sin distinguirlas puede erosionar esa diferencia, y la decisión de callar la Fuente cuando falta lo agrava.
- **Canibalización.** Cuántas Citas de un mismo libro con derechos vigentes se publican antes de que sustituyan la compra, y antes de exceder el derecho de cita.

## Preguntas abiertas (dueño: Héctor)

1. ¿Cómo es la Lista de Obras de un personaje que aparece en muchos medios, y cuál de esas Obras lleva el enlace?
2. ¿Qué tipo de frase de un autor vivo despierta la compra, y cuál es el tope de Citas por libro?
3. ¿Las dos versiones de un doblaje son dos Citas o una Cita con variante? Se decidió cuál es la principal, la mexicana, pero no la forma.
4. ¿Qué personajes y universos mexicanos entran primero?
5. ¿Las figuras públicas vivas sin Obra, como el ejemplo de Trump, entran en el alcance o solo los autores con libros?

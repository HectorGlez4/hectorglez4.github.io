---
entrada: _bmad-output/brainstorming/brainstorm-citas-recientes-y-ficcion-2026-11-03/brainstorm-intent.md (+ .memlog.md)
destino: prd.md v9.1 (§1, glosario, FR-13, FR-35, §4.24 FR-65…FR-70, §5, SM-C1, SM-C6, §6.8 paso 8, §14 preguntas 18–23, §15, supuestos) y addendum.md (Addendum de la v9.1)
fecha: 2026-11-04
tipo: reconciliación de intención, solo lectura
---

# Reconciliación de la intención de la lluvia de ideas con la v9.1

No cuentan como huecos las enmiendas deliberadas de Héctor del 2026-11-04, que constan en el `.memlog.md` del PRD:

- el Personaje como entidad aparte del Autor;
- la clase definida por tener Personaje o un Autor con derechos vigentes;
- la Obra opcional;
- la semilla de BrainyQuote;
- SM-C1 medido aparte, con SM-C6;
- la variante como una sola Cita;
- el paso 8;
- la venta sin edición cotejada en Obras con derechos vigentes.

## Lo que llegó bien

- Las dos palancas: el tráfico con «frases de Darth Vader» y el ingreso con *Sapiens* (§4.24, Descripción).
- La cadena Cita → Obra → afiliación con enlace opcional (FR-65: sin Obra no hay enlace; FR-70).
- **Corregir a posteriori**: FR-69 pone un canal visible sin cuenta, registro, retirada a revisión y SM-C6 como contramétrica. El matiz «sobre todo si afecta a una persona viva» llegó literal.
- **Callar la Fuente cuando no existe**: FR-65 y el glosario dicen que no hay sello ni hueco. La lluvia admitía «nada o algo discreto». El PRD eligió nada, que es la primera de las dos opciones y no la distorsiona.
- **Cómics primero porque se venden**: FR-68 dice «cómics primero, luego películas y libros», con los cuatro nombres.
- **La semblanza desde la cultura pop**: FR-66 dice «quién es el personaje dentro de su universo», con la regla de FR-41 y §5, y §5 la añade a la prohibición de inventar. Llegó, aunque acotada a una fuente citable por revisión. Ver la observación menor 3.
- **La primacía de México y Latinoamérica**: FR-67 da el texto principal a la versión mexicana y la de España como variante. La pregunta 3 queda cerrada por Héctor.
- **El territorio de la ficción mexicana**: queda abierto sin nombres en la pregunta 21 y en FR-68.
- **La síntesis 3**, Cómo citar y el pasaje fuera para la Cita sin Fuente: FR-65 deja fuera FR-58, FR-59, FR-60, FR-61 y FR-9.
- **Las tensiones de derechos, BrainyQuote y canibalización**: §4.24 («El riesgo…»), el addendum (art. 32 LPI, *fair use*, marcas, Directiva 96/9/CE), los topes de FR-65 y las preguntas 18 y 20.
- **Las figuras públicas sin Obra, el caso Trump**: pregunta 23, con un valor provisional prudente.

## Lo que no llegó o llegó distorsionado

### 1. El criterio real, «lo citable como meme», desapareció (cualitativo, alto)

La observación de la sesión fue que lo que une a Batman, Homero, Barney y The Dude es que **se citan como meme**, no el medio del que vienen. El PRD no recoge esa idea en ninguna parte: «meme» no aparece. FR-68 conserva solo el criterio comercial, «los universos que tienen algo que vender». Leído así, Homero Simpson y Barney Stinson, que vienen de series sin Obra comprable evidente, quedan en la lista sin el criterio que los justificaba. Falta además que la puerta de calidad de FR-68 diga qué juzga. La intención era que entra lo que circula como frase citada y reconocible, y que tener algo que vender ordena la prioridad.

### 2. El criterio positivo de admisión, «basta con que sea ampliamente conocida», se perdió (alto)

En la lluvia, la regla de entrada de las familias nuevas era «ampliamente conocida». En el PRD esa expresión solo sale en el párrafo de riesgo y en negativo: «“Ampliamente conocida” no es dominio público». FR-65 define la puerta solo por lo que no exige —ni cotejo ni dominio público— y por los topes. FR-68 nombra una «puerta de calidad que una persona aprueba» sin decir qué mira. Ninguna consecuencia verificable dice cuándo una frase atribuida es admisible. Hoy la puerta deja pasar cualquier texto con Personaje o Autor que quepa en los topes, y SM-C6 solo medirá el daño después.

### 3. La síntesis 4 y AD-25 no llegaron: la Obra de un Personaje sin Autor no tiene identidad (estructural, alto)

La sesión avisó de que la identidad Obra = (Autor, forma) de AD-25 se pone a prueba con un personaje que atraviesa franquicias. La enmienda de Héctor, con el Personaje aparte y el Autor opcional, agrava el caso. FR-65 admite una Cita con Personaje, sin Autor y con Obra. Entonces esa Obra no tiene Autor:

- su ficha se nombra `{autor}--{obra}`;
- su ruta es `/obra/{autor}/{obra}/`;
- su identidad es el par (Autor, forma).

Las tres dejan de estar definidas. La pregunta 19 solo recoge qué Obra lleva el enlace, no cómo se identifica ni cómo se agrupa una Obra multimedia (*El imperio contraataca*, un cómic de Batman, una temporada de *Los Simpson*). Tampoco se dice cómo se compone la Lista de Obras de la Página de Personaje que pide FR-66.

### 4. La síntesis 2 quedó a medias: el Personaje como familia sin sus atributos (medio)

El addendum dice, con razón, que separar el Personaje evita partir el Autor y no toca sus años, su clave de orden ni la cuota latinoamericana. Pero el Personaje necesita esos mismos atributos, y el PRD no se los da:

- el tipo de su JSON-LD: el `Person` ficticio o `CreativeWork` que nombró la sesión no aparece;
- qué sustituye a los años en su página y en la Atribución;
- por qué clave se ordena en los Directorios, donde FR-66 dice que entra «como familia propia»;
- si cuenta en la cuota del 40 % latinoamericano, cosa que importa justo con la ficción mexicana;
- su familia en las series de indexación, tráfico, demanda y canal. Solo el supuesto de FR-66 menciona la familia Personaje.

Además, el glosario de **Cita** sigue diciendo «Tiene exactamente un Autor». Eso contradice FR-65 («Una Cita con Personaje no exige Autor»), y la nota v9.1 añadida no lo corrige.

### 5. La tensión de la confianza de la marca se declaró resuelta sin mecanismo (cualitativo, medio)

La sesión dejó abierta una tensión: mezclar Citas sin verificar sin distinguirlas erosiona el diferencial, y callar la Fuente lo agrava. El PRD la da por resuelta. §1 afirma que la clase aparte es «para que la apertura no erosione lo que el sitio promete», y §15 que «la promesa se mantiene». Pero lo único que protege la marca es que la atribuida no sea Cita del Día, y eso es provisional (pregunta 22). Al mismo tiempo, FR-65 la trata «como a cualquier Cita» en copiar, la Imagen, compartir, el Fragmento y la búsqueda, y nada impide que una Cita de Homero aparezca sin marca en un listado de Tema, junto a Cervantes. SM-C1 separado mide la Procedencia de la clase de siempre, no la percepción del visitante. Ninguna pregunta ni supuesto de §14 o §15 recoge el riesgo de confianza como tal, ni cómo se falsaría.

## Observaciones menores

1. **El contrato de Procedencia está incompleto.** La lluvia nombró cuatro choques: AD-3 y FR-23, SM-C1, el build que rompe con una Fuente mutable y el censo de `pendientes-de-cotejo.yml`. El PRD trata los dos primeros. No dice si una Cita atribuida entra en el censo de pendientes, que no debería porque no se coteja nunca. Tampoco dice si la regla de Fuente mutable la alcanza cuando su «origen anotado» (FR-68) es Wikiquote o una wiki de fans.
2. **La síntesis 1 se resumió en el orden de siembra.** Se perdió el perfil de cada caso: la ficción con Obra comprable une tráfico e ingreso; el autor vivo de no ficción da ingreso y poco tráfico de cola larga; la figura pública da tráfico, ningún ingreso y el riesgo más alto. Solo queda el tercero, en la pregunta 23. Sin los otros dos, falta la razón para preferir el cómic al autor vivo cuando se elija qué sembrar.
3. **La semblanza «desde la cultura pop» queda acotada a una fuente citable por revisión**, por la regla de FR-41. Es coherente con §5, pero la Fuente natural de esa semblanza, una wiki de fans, no se nombra. Tampoco se dice si la orden `autor biografia` y el cotejo de la semblanza valen para un Personaje.
4. **La variante solo cubre el caso de dos versiones.** FR-67 no dice qué ocurre cuando solo circula la versión de España, ni cuando la mexicana es la de un doblaje sin texto escrito que la respalde.
5. **El aparcamiento de las señales de fiabilidad**, que decidió Héctor, no consta como no-objetivo ni como decisión diferida. Es coherente con «callar la Fuente», pero sin registro alguien puede reabrirlo como requisito.

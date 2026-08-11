---
title: "Brief de Producto: Sabiduría Diaria"
status: final
created: 2026-08-10
updated: 2026-08-10
---

# Brief de Producto: Sabiduría Diaria

> **Marca:** Sabiduría Diaria · `sabiduriadiaria.com` (verificado libre el 2026-08-10)
> **Repositorio:** `brainlySabiduria` (nombre en clave, no de cara al público)

## Resumen Ejecutivo

**Sabiduría Diaria replica para el mundo hispanohablante un modelo de producto ya probado, con dos apuestas propias: procedencia verificable en cada cita, y una experiencia móvil que no dé vergüenza compartir.**

El modelo es el de BrainyQuote: una red enorme de páginas pequeñas y muy específicas, cada una respondiendo a una búsqueda concreta que alguien hace a las once de la noche. Dos décadas demuestran que ese patrón sostiene tráfico masivo con una superficie de producto mínima. En español está atendido por sitios que arrastran diseños de otra década, atribuciones sin verificar y una experiencia móvil pobre.

La v1 no inventa nada, y es deliberado: **paridad funcional completa** con el modelo de referencia, recortando el catálogo y no lo que el sitio sabe hacer. Las piezas se sostienen entre sí —la página de cita alimenta a la de autor, la de autor a la de tema, la imagen compartible devuelve tráfico a todas—, así que un sitio de citas al que le faltan piezas no es medio producto: es un producto que no cierra el circuito. La diferenciación propia llega después, con tráfico real midiendo qué busca la gente en español.

## El Problema

Buscar una frase en español es una experiencia mala, y lo es de tres formas distintas:

**No encuentras lo que buscas.** El usuario no busca "citas"; busca "frases de Machado sobre el camino", "qué dijo Sor Juana sobre los hombres necios", "frase para una despedida". Son consultas específicas y de cola larga. Los sitios existentes se organizan por categorías genéricas y amplias, así que la consulta específica aterriza en una página de doscientas frases donde hay que rebuscar.

**No puedes fiarte de lo que encuentras.** La atribución errónea es el defecto crónico de este vertical: frases apócrifas circulan durante años atribuidas a Einstein, a Gandhi o a Borges porque un sitio copió a otro sin verificar nunca la fuente. Quien va a citar algo en público —una presentación, un discurso, un post— asume un riesgo reputacional sin saberlo.

**No puedes usar lo que encuentras.** El uso real de una cita hoy es compartirla. Los sitios existentes te dan un bloque de texto rodeado de publicidad intrusiva y ninguna ruta hacia "esto en mi móvil, ahora".

El coste del statu quo es un usuario que rebota, copia el texto a mano y no vuelve.

## La Solución

Un sitio donde **cada cita es una página**, y donde esa página resuelve por completo la intención con la que llegaste.

- **La cita, primero y sin fricción.** Tipografía grande, sin muro de publicidad delante, legible en móvil de un vistazo.
- **Quién lo dijo, y de dónde sale.** Autor con contexto breve y, cuando existe, obra o referencia de procedencia. Ningún competidor en español lo hace de forma sistemática.
- **Salidas naturales.** Más de este autor, más de este tema, relacionadas. Quien llega buscando una frase se queda navegando tres más.
- **Compartir como gesto, no como proceso.** Imagen generada por cita, lista para publicar.
- **Una portada viva.** La cita del día, que da motivo para volver y da nombre al producto.

## Qué Lo Hace Diferente

Con honestidad, y sin inventar fosos que no existen:

**No hay ventaja tecnológica.** Esto es un sitio de contenido. Cualquiera con las mismas ganas construye la parte técnica en semanas. Dejarlo escrito aquí evita que el PRD y la arquitectura persigan sofisticación donde no hay retorno.

**Las ventajas reales son tres, y las tres son de ejecución:**

1. **Procedencia como principio de diseño, no como añadido.** Modelar la fuente desde el esquema —y no como un campo opcional que se rellena a veces— es un compromiso operativo caro de imitar, porque exige rehacer la ingesta entera.
2. **Calidad de experiencia en un vertical que la abandonó.** El listón de los competidores en español está bajo. Velocidad, tipografía y una experiencia móvil limpia son diferenciación suficiente, y son alcanzables por una persona sola.
3. **Un corpus panhispánico de verdad.** Los sitios existentes escoran hacia España o hacia un solo país. Cubrir bien la tradición latinoamericana además de la española amplía la superficie de búsqueda sin competir de frente con nadie.

## A Quién Sirve

**El buscador con encargo** — llega desde Google con una necesidad concreta y con prisa: prepara una presentación, escribe una dedicatoria, cierra un discurso. Le vale la primera frase buena que encuentre. Es el grueso del tráfico y quien define la página de cita: encontrar, confiar, copiar, irse. Su éxito se mide en segundos.

**El compartidor** — busca material para publicar. Le importa que la frase se vea bien y que compartirla sea un gesto. Es quien trae tráfico nuevo sin coste, y quien justifica la imagen generada.

**El curioso** — llega por un autor y se queda leyendo. Minoría en volumen, pero es quien valida que el sitio tenga fondo. Es el usuario de las páginas de autor.

La curación es interna en la v1: no hay usuario editor ni contribuidor externo.

## Estrategia de Contenido

El corpus **es** el producto; la aplicación es el envoltorio. De ahí tres reglas que condicionan todo lo que viene después:

- **Criterio de admisión: dominio público.** El corpus inicial son citas textuales de autores y figuras célebres cuyos derechos han expirado. Esto escora el catálogo hacia lo clásico, y es una elección consciente. Las implicaciones de plazo por jurisdicción están en el addendum.
- **Toda cita lleva procedencia.** Autor, y cuando sea posible obra y año. Una cita sin procedencia no entra en producción; puede quedar en revisión, pero no se publica.
- **El criterio es un campo, no una regla en el código.** El estado de derechos se modela como dato, para poder ampliar más adelante —figuras contemporáneas bajo derecho de cita, aportes de usuarios— sin rehacer la ingesta.

**Tamaño de arranque:** en torno a **2.000 citas de 150–250 autores**. Aquí es donde se recorta la v1, y el número no es arbitrario: por debajo de ~1.500, las páginas de tema se ven vacías y el sitio parece abandonado, que es precisamente el defecto de los competidores; por encima de ~3.000, la curación con procedencia deja de ser abordable en una fase de arranque.

**Panhispánico desde el día uno.** Sin TLD de país y sin sesgo editorial hacia España: la cobertura latinoamericana entra en el corpus inicial, no en una fase posterior. Reequilibrar un catálogo después sale mucho más caro que nacer así.

## Criterios de Éxito

Cifras de partida, para que existan y se puedan discutir con datos dentro de tres meses.

**Que el producto funciona (señales de usuario):**
- El buscador con encargo encuentra algo útil sin recurrir al buscador interno: **rebote < 65 %** en páginas de cita.
- El sitio tiene fondo: **≥ 1,8 páginas por sesión**.
- El compartidor encuentra la salida: **≥ 3 %** de las visitas a página de cita generan una acción de copiado o compartido.
- La búsqueda interna no falla: **< 15 %** de búsquedas con cero resultados.

**Que el mecanismo funciona (señales de negocio):**
- **≥ 90 %** del corpus indexado a los 3 meses. Es el indicador temprano: si las páginas no se indexan, nada más importa.
- **5.000 sesiones orgánicas/mes al mes 6**; **25.000 al mes 12**.
- Posición media dentro del **top 10** en consultas de cola larga por autor.

**Métrica-espejo, para no engañarnos:** porcentaje de citas publicadas con procedencia verificada. Si cae mientras el corpus crece, estamos construyendo el mismo problema que decimos resolver.

## Alcance

**Dentro de la v1 — paridad funcional completa:**

| Pieza | Por qué está dentro |
|---|---|
| Página de cita individual | La unidad atómica de tráfico. Es el producto. |
| Página de autor | Agregación y contexto. Segunda fuente de tráfico orgánico. |
| Página de tema / categoría | Captura la intención transversal ("frases sobre el amor"). |
| Buscador | Sin él, quien no llega por Google no llega. |
| Cita del día / portada | Motivo para volver. Da nombre al producto. |
| Imagen compartible por cita | Cierra el circuito: convierte una visita en tráfico nuevo. |
| Descubrimiento (relacionadas, más del autor) | Convierte una visita de un segundo en una sesión. |
| Fundamentos de SEO | Sitemap, datos estructurados, URLs limpias, rendimiento. Es el motor, no un pulido final. |

**Fuera de la v1, a propósito:**

- Cuentas de usuario, favoritos y colecciones personales.
- Aportes o envíos de usuarios (la curación es interna).
- Monetización. Se diseña sin publicidad y se decide con datos de tráfico en la mano.
- Multilingüe. El producto es en español; el resto es una distracción.
- App móvil. La web responsive cubre el caso de uso completo.
- Newsletter y notificaciones. Dependen de tener audiencia; llegan cuando la haya.

**El riesgo asumido, dicho en voz alta.** Paridad funcional completa significa que la imagen compartible entra en la v1, y es la pieza más cara de lo que aparenta: generación, tipografías, caché y CDN. Es una decisión tomada con conocimiento del coste, no un descuido. Si el plan de entrega se tensa, es la primera candidata a diferirse.

## Visión

Si funciona, esto deja de ser un sitio de citas y pasa a ser **la referencia de confianza de la palabra dicha en español** — el lugar donde compruebas si una frase es realmente de quien dicen, no solo donde la encuentras.

Desde ahí, tres direcciones naturales, todas apoyadas en el mismo corpus verificado: un canal recurrente —la cita diaria por correo o notificación— que convierte tráfico de paso en audiencia propia; herramientas de creación para el compartidor; y la apertura del corpus más allá del dominio público, viable solo una vez demostrada la disciplina de procedencia.

## Cabos Sueltos

1. **Marca registrada.** Se verificó disponibilidad de dominio, no de marca. Conviene una búsqueda en OEPM y EUIPO antes de invertir en identidad visual. No bloquea el desarrollo.
2. **Métricas de éxito.** Son propuestas del facilitador, no compromisos de Héctor. Se revisan con los primeros datos reales.
3. **Reparto geográfico del corpus.** "Panhispánico" está decidido; la proporción concreta entre tradición española y latinoamericana se define al construir el catálogo.

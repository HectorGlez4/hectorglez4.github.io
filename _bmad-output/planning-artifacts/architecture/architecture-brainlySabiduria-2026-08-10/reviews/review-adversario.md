# Lente adversaria — dos unidades que cumplen todos los AD y aun así divergen

**Veredicto: tres agujeros reales, todos cerrados.** Se construyeron pares de historias plausibles de la v3 que obedecen cada AD a la letra y aun así producen un sistema incoherente.

## Crítico — A1. Nadie es dueño de la alcanzabilidad

**El par:** la Historia «Página de Colección» publica cinco Colecciones; la Historia «portada» enlaza los Temas destacados desde su propia lista curada. Las dos cumplen AD-11 al pie de la letra — derivan del conjunto publicable — y el resultado son cinco Colecciones publicadas, en el sitemap, y **huérfanas**. Incumple NFR-5 y la cuarta consecuencia de FR-26, y no falla nada: el build pasa, las pruebas pasan, y se descubre en Search Console semanas después.

**La raíz:** AD-11 fija *qué se publica* y nadie fijaba *qué se enlaza*. Son dos preguntas distintas y la espina solo tenía dueño para la primera. El agujero solo aparece cuando existe un tipo nuevo de agregación — por eso la v1 no lo notó y la v3 lo dispara.

**Cierre:** AD-11 extendido — el mismo módulo que posee el conjunto publicable posee la enumeración de descubrimiento, de modo que publicable y alcanzable son por construcción el mismo conjunto.

## Crítico — A2. AD-20 confundía dos dueños

**El par:** la Historia «donaciones» (FR-34) pone la invitación en `Armazon.astro`, que es el armazón compartido — una línea, y aparece en todas las páginas. La Historia «publicidad» (FR-37) la coloca solo en portada, búsqueda y 404. Las dos creen cumplir AD-20, porque AD-20 delegaba la exclusión de superficie en AD-11… y AD-11 es dueño del **conjunto de contenido publicable**, no de qué superficie puede alojar un Modelo. Son cosas distintas. Resultado: la invitación de donación en la Página de Cita, que es exactamente lo que FR-34 prohíbe en su primera consecuencia.

**Cierre:** AD-20 corregido — la lista de superficies admitidas por Modelo es configuración con un dueño propio, junto al estado de AD-21, y **el armazón compartido no aloja ningún Modelo**. Se elimina la delegación equivocada en AD-11.

## Alto — A3. AD-19 podía bloquear FR-30

**El par:** la Historia «Pieza de varias Citas» (FR-30) compone una imagen con tres Citas íntegras. Un builder cuidadoso lee AD-19 —«ninguna agregación reproduce el texto íntegro de una Cita»— y concluye que FR-30 está prohibido por la espina. Otro la construye. Divergencia por ambigüedad de alcance, no por descuido.

**Cierre:** AD-19 acotado a superficies **indexables del sitio**. Una Pieza de Canal es material de salida, no una superficie, y NFR-13 habla de canibalización en buscadores.

## Medio — A4. Precedencia inventada entre Kit y lote

FR-29 dice que el material anticipado «sustituye» al de la jornada si ambos existen, lo que invita a construir un mecanismo de precedencia. No hace falta: Kit y lote derivan de la **misma** fijación de `corpus/portada.json` (AD-12), así que componen lo mismo y no hay nada que resolver. Sin decirlo, alguien construye un desempate para un empate imposible.

**Cierre:** anotado en AD-15.

## Comprobados y sin agujero

- **AD-18 con referencia blanda:** ninguna pareja consigue que retirar una Cita rompa el build ni deje un miembro colgado; el umbral sobre el recuento resuelto hace que la despublicación en cascada sea automática y unánime.
- **AD-14 frente a FR-33:** la cifra vive en D1 y el estado en el repo; ninguna historia puede hacer que `dist/` dependa de la medición sin incumplir la regla explícitamente.
- **AD-4 frente a la Colección:** ninguna ruta de Cita puede incorporar la Colección; FR-28 y AD-4 apuntan al mismo sitio.

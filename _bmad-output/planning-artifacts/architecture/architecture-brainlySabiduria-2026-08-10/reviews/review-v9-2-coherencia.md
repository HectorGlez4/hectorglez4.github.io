---
type: architecture-review
lens: coherencia
target: ARCHITECTURE-SPINE.md (enmienda v9.2: AD-32, AD-34, AD-35 y AD-27; PRD v9.2, FR-68)
date: 2026-11-14
reviewer: agente (lectura sola; no edita la espina)
---

# Revisión de coherencia de la v9.2: la traducción propia de la Cita atribuida

**Veredicto:** la enmienda es coherente en lo que toca, pero no cierra los caminos de `npm run atribuida`. Hay dos agujeros altos: una traducción propia puede entrar o cambiar sin el registro de aprobaciones, y la puerta de las atestiguaciones no dice qué atestigua una traducción que no circula. Además hay incoherencias medias en el registro de AD-24, en la muestra de SM-C6 y en el intercambio con la variante. No cuestiono ninguna decisión de Héctor.

Comprobaciones pedidas:
- **Dos agentes sin una persona frente a AD-1, AD-11, AD-23 y AD-25.** No choca con ninguna regla escrita. AD-1 exige solo que la puerta no viva únicamente en `tools/`, y la del registro está en el build. AD-23 ya da por hecho que siembran agentes. La única regla de «persona, nunca agente» (L548) es la de `semblanzaPropia`, que es otra cosa. El choque está con la redacción de SM-C6, que sigue diciendo que el resultado lo decide una persona (hallazgo 9). Eso es compatible con la enmienda, pero hay que hacerlo explícito.
- **Retirar una traducción propia (AD-2, AD-10).** La puerta solo mira las Citas publicadas. Una retirada movida a `_revision/` deja su entrada en el registro y el build no rompe. Pero la espina no dice que esa entrada huérfana sea legítima (hallazgo 6).
- **Sustituirla por una versión que circula.** La Cita se queda sin `origen: traduccion-propia` y su entrada sigue en el registro. La puerta solo va en un sentido, así que no rompe. Lo que sí queda abierto es volver a traducirla y que una traducción nueva entre sin registro (hallazgos 1 y 2).

---

## 1. Alta: `atribuida texto` puede dejar publicada una traducción propia que no está en el registro

- **Línea:** 539 y 567
- **Cita:** «lo escriben solo el alta y `revisar --aprobar`» / «`atribuida texto --origen <original|doblaje|traduccion-publicada>`»
- **Problema:** la orden `atribuida` también cambia el texto de una atribuida ya publicada. La espina solo dice qué orígenes admite cuando sustituye una traducción propia. No dice si puede pasar una Cita con otro origen a `--origen traduccion-propia`. Si la orden lo admite, publica una traducción propia sin entrada en el registro y el build rompe después del commit. Si lo admite y además escribe la entrada, contradice que el registro «lo escriben solo» el alta y la aprobación.
- **Corrección:** que `atribuida texto` y `atribuida variante` se nieguen con 1 a escribir `origen: traduccion-propia`. Ningún camino posterior al alta crea una traducción propia.

## 2. Alta: una traducción propia retraducida no tiene segunda aprobación posible

- **Línea:** 539 y 567
- **Cita:** «si un slug tiene dos entradas» / «Un texto o una variante nuevos tienen que parecerse, por encima de `MIN_PARECIDO_PARA_CORREGIR`»
- **Problema:** `atribuida texto` sobre una Cita que sigue siendo traducción propia, con el texto mejorado y por encima del parecido, publica una traducción que no aprobó ningún segundo agente. Y no puede registrarse, porque una segunda entrada del mismo slug rompe el build. La doble aprobación cubre solo la primera versión.
- **Corrección:** decir que, con el origen `traduccion-propia`, `atribuida texto` solo sustituye por una versión que circula y nunca retraduce. Si se quiere permitir la retraducción, el registro debe admitir varias entradas por slug, una por versión de texto, y la puerta debe comprobar la última.

## 3. Alta: la puerta de las atestiguaciones no dice qué atestigua una traducción que no circula

- **Línea:** 536 (y 567, «repite los topes, las atestiguaciones»)
- **Cita:** «`atestiguaciones`, una lista de `{url, consultadaEl}` de donde circula atribuida igual»
- **Problema:** `traduccion-propia` solo se admite «si no circula ninguna» versión. Entonces no existe ningún dominio donde el texto en español circule «igual», y la puerta de `MIN_ATESTIGUACIONES_DE_ATRIBUIDA` rechaza toda traducción propia. La otra lectura, que atestigüe la frase en su lengua de origen, no está escrita, y dos historias contarán cosas distintas.
- **Corrección:** decir que, con `origen: traduccion-propia`, las atestiguaciones son las de la atribución en la lengua de origen (o la semilla, según decida FR-68), y que la sustitución de AD-35 exige atestiguaciones del texto nuevo.

## 4. Media: no hay orden para cambiar las atestiguaciones en la sustitución

- **Línea:** 567
- **Cita:** «`npm run atribuida -- {obra|autor|personaje|variante|texto} …` es el único camino»
- **Problema:** la sustitución «repite las atestiguaciones». Las que trae la traducción propia no atestiguan el texto que circula, y ninguna suborden las reemplaza. Como la orden es el único camino, la sustitución se queda sin poder cumplir su propia puerta, o alguien edita el fichero a mano.
- **Corrección:** que `atribuida texto --origen …` reciba las atestiguaciones del texto nuevo y las escriba en el mismo gesto, o añadir una suborden `atestiguaciones`.

## 5. Media: el intercambio de principal y variante choca con AD-34 cuando el principal es traducción propia

- **Línea:** 567 y 558
- **Cita:** «intercambiar principal y variante, por tanto, se admite» / «`origen`, el de AD-32 salvo `traduccion-propia`»
- **Problema:** si el principal es una traducción propia, intercambiarlo deja la traducción propia en la variante, que el esquema rechaza. La regla de L567 lo admite sin excepción. Además, una traducción propia con una variante que circula contradice que la traducción propia se use «solo si no circula ninguna».
- **Corrección:** que `atribuida variante` y el intercambio se nieguen cuando el origen del principal es `traduccion-propia`. Si circula una variante regional, lo que toca es la sustitución de AD-35.

## 6. Media: no se dice que la entrada huérfana del registro sea legítima

- **Línea:** 539
- **Cita:** «El build rompe si una atribuida publicada con ese origen falta en el registro»
- **Problema:** una Cita retirada a `_revision/` (AD-2, AD-35) y una sustituida por una versión que circula dejan su entrada en el registro. Con la letra de hoy el build no rompe. Pero la espina no lo dice, y una historia podría añadir la comprobación inversa («toda entrada nombra una traducción propia publicada»), por simetría con `clases-de-cita.yml`. Esa comprobación rompería cada retirada y cada sustitución, o empujaría a borrar entradas de un registro que solo añade (AD-10).
- **Corrección:** una frase: la entrada se queda aunque la Cita se retire o deje de ser traducción propia, y el build no comprueba el sentido inverso.

## 7. Media: el registro nuevo no tiene la comprobación de que solo añade ni la escritura con relectura

- **Línea:** 539 (frente a 534 y 565)
- **Cita:** «`corpus/aprobaciones-de-atribuidas.yml` solo añade `{slug, propone, aprueba, fecha}`»
- **Problema:** `clases-de-cita.yml` dice cómo se comprueba que solo añade: `npm test` contra el primer padre del commit. `peticiones-de-retirada.yml` se escribe con `appendFile` y relectura. El registro nuevo no dice ninguna de las dos cosas. Tampoco dice qué pasa si el alta escribe la Cita y falla al escribir la entrada: el build rompe con el commit ya hecho.
- **Corrección:** aplicar al registro la misma prueba contra el primer padre y la misma escritura con `appendFile` y relectura, y escribir la entrada en la vuelta atrás del alta.

## 8. Media: AD-24 sigue contando cuatro registros y dos que lee el build

- **Línea:** 398
- **Cita:** «Cuatro registros nuevos de `corpus/` son series de actos […] —el build lee los dos primeros solo para romper—»
- **Problema:** con la v9.2 son cinco registros, y el build lee tres para romper: clases, formas vedadas y aprobaciones. La enmienda solo puso al día la Semilla estructural (L625) y la convención de ficheros (L574).
- **Corrección:** cambiar a «Cinco registros» y añadir `aprobaciones-de-atribuidas.yml` (AD-32) entre los que el build lee solo para romper, y entre los que no fechan ni avisan nada.

## 9. Media: la segunda muestra de SM-C6 no cabe en la forma de la entrada

- **Línea:** 540
- **Cita:** «`{mes, muestra, resultados, auditadoEl}` […] en la misma entrada y con su proporción aparte»
- **Problema:** la entrada no tiene dónde guardar la segunda muestra. Una Cita de traducción propia puede salir en las dos muestras, y un único mapa de `resultados` por slug mezclaría sus dos juicios. Tampoco se dice si `mal-traducida` vale en la primera muestra ni dónde cuenta, ni si `MIN_ATRIBUIDAS_PARA_JUZGAR_SM_C6` se aplica a la segunda muestra sobre su propio censo. Y la entrada dice que el resultado lo «decide una persona», mientras el resto de la enmienda deja la traducción propia a los agentes. Si es así a propósito, conviene decirlo.
- **Corrección:** dar a la entrada `muestraDeTraduccion` y `resultadosDeTraduccion`, y restringir `mal-traducida` a la segunda muestra. Decir que el mínimo se juzga por separado sobre las traducciones propias publicadas.

## 10. Media: AD-27 deja el estado del origen pendiente de una historia que nadie nombra

- **Línea:** 473
- **Cita:** «hasta que la UX diga lo contrario […] la 35.10 lo pasó a `CAMPOS_QUE_PINTA` para su línea, y vuelve aquí cuando se retire»
- **Problema:** la frase de la v9.1 sigue marcando como `[ASSUMPTION]` que el origen no se pinta, cuando ya es una decisión (PRD v9.2). La coletilla nueva deja el origen en `CAMPOS_QUE_PINTA` en el código hasta que se retire una línea, pero no nombra quién la retira. Mientras tanto la espina y `tests/unit/fecha-de-cambio.test.ts` dicen cosas distintas.
- **Corrección:** quitar el `[ASSUMPTION]` sobre el origen y decir que la historia que retira la línea de la 35.10 lo devuelve a `CAMPOS_QUE_NO_FECHAN` en el mismo commit.

## 11. Baja: los Binds de AD-34 y AD-35 no incluyen FR-68

- **Línea:** 556 y 562
- **Cita:** «**Binds:** FR-3, FR-7, FR-10, FR-14, FR-57, FR-67, …» / «**Binds:** FR-65, FR-67, FR-69, SM-C6, …»
- **Problema:** las dos reglas nuevas de FR-68 (la variante nunca es traducción propia y la sustitución exenta del parecido) viven en AD-34 y AD-35, pero solo AD-32 vincula FR-68. AD-35 tampoco vincula AD-3, que es de donde sale `MIN_PARECIDO_PARA_CORREGIR`.
- **Corrección:** añadir FR-68 a los Binds de AD-34 y AD-35, y AD-3 a los de AD-35.

## 12. Baja: el frontmatter cita el PRD v9.1 y la UX v8

- **Línea:** 13, 16 y 17
- **Cita:** «`prd.md` # v9.1, 2026-11-04»
- **Problema:** la enmienda deriva del PRD v9.2 (9a562f7bf6) y de la UX v9.3, según el `.memlog.md`, pero `sources` sigue en el PRD v9.1 y en la UX v8.
- **Corrección:** poner al día las versiones y las fechas de `sources`.

## 13. Baja: la condición de último recurso no tiene puerta y no lo dice

- **Línea:** 536
- **Cita:** «*(v9.2: la última, solo si no circula ninguna)*»
- **Problema:** nada comprueba que no circule ninguna versión. La espina dice expresamente cuándo algo es juicio sin puerta (L537, «es juicio de quien aprueba, sin puerta»), pero aquí no lo dice, y una historia podría intentar construir una comprobación.
- **Corrección:** añadir «juicio de los dos agentes, sin puerta», como en la cláusula del meme.

## 14. Baja: la regla de los dos agentes queda en una autodeclaración en el alta directa

- **Línea:** 539
- **Cita:** «lo escriben solo el alta y `revisar --aprobar` […] y se niegan si los dos son el mismo»
- **Problema:** en `revisar --aprobar` hay dos actos: uno deja la candidata en `_revision/` y otro la aprueba. El alta, en cambio, es una sola invocación que declara los dos nombres. La comparación de cadenas tampoco dice si normaliza mayúsculas o espacios, así que «Claude » y «claude» pasarían por distintos. No discuto el `[ASSUMPTION]` del formato, solo la comparación.
- **Corrección:** fijar que `propone` y `aprueba` se comparan sobre su forma recortada y en minúsculas. Si se quiere que los actos sean dos, que el alta de una traducción propia solo entre por `revisar --aprobar`.

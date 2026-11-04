---
objeto: prd.md, enmienda v9.1 (la Cita atribuida)
rúbrica: .claude/skills/bmad-prd/references/validate.md → .claude/skills/bmad-prd/assets/prd-validation-checklist.md
fecha: 2026-11-04
tipo: revisión de solo lectura (paseo de rúbrica + caza de contradicciones)
---

# Revisión de la v9.1 — la Cita atribuida

Los números de línea son los de `prd.md` tal como está hoy en el worktree `brainlySabiduria-plan-v9`. La revisión no repite lo que ya recoge `reconcile-v9-1-intent.md` salvo cuando un hallazgo de aquí lo agrava o lo sitúa en otro sitio. Cuando coincide, se dice («cf. reconcile n.º X»).

## Veredicto

La tesis de la v9.1 está clara y bien defendida: dos palancas (tráfico por Personaje, ingreso por Obra con derechos vigentes), una clase aparte para no relajar la de siempre, y una contra-métrica propia. Pero la enmienda se escribió en unos pocos sitios y deja intactas una docena de frases absolutas en el resto del documento que ahora la contradicen: la Condición de Lanzamiento LC-6, el «Autor obligatorio» en FR-1, FR-2, FR-15, FR-18, FR-19, FR-30, FR-57 y NFR-3, las reglas de traducción de §5 y §4.11, y «la de venta nunca va sola» en FR-54 y FR-62. Además, la puerta de la clase depende de datos que declara quien da de alta la Cita. Eso abre una vía para saltarse el cotejo que, por cómo está escrita la exclusión, **sube** SM-C1 en lugar de delatarla. Así no está lista para épicas. Hacen falta una pasada de enmiendas en su sitio y una decisión sobre quién fija la clase.

## Juicio por dimensión (solo la v9.1)

- **Decisión — thin.** Las decisiones de Héctor están fechadas y nombradas, y el riesgo jurídico se reconoce con dueño (pregunta 18). Pero el paso 8 de §6.8 mete en alcance la clase entera sin condicionarla a esa pregunta, y no dice qué se renuncia a cambio de abrir un camino sin cotejo junto a uno con cotejo.
- **Sustancia — adequate.** Los ejemplos (Darth Vader, *Sapiens*, Sancho) hacen trabajo real, y SM-C6 está escrita para este producto. El problema es de cobertura, no de teatro.
- **Coherencia estratégica — adequate.** La v9.1 sirve a la tesis de la v9 («de la cita al libro»), y FR-70 cierra el arco del ingreso. La tensión con §1 («respaldada por la procedencia») queda declarada en §6.8, pero sin mecanismo (H10).
- **Claridad de «hecho» — thin.** «Derechos vigentes», «reglas de una agregación», «puerta de calidad», los topes sin valor y SM-C6 sin regla de salto no dejan saber cuándo está hecho.
- **Honestidad de alcance — thin.** Siete `[ASSUMPTION]` en línea, ninguno indexado, y los tres del índice no están en línea. Varias consecuencias que hoy son absolutas (LC-6, FR-54) no dicen que se exceptúan.
- **Uso aguas abajo — thin.** El glosario de Cita y el de Obra contradicen FR-65. La familia Personaje no existe en NFR-1, §10, FR-40 ni FR-55. Ningún UJ recoge la clase.
- **Encaje de forma — adequate.** Es una ampliación brownfield de un producto de consumo, y sí necesita UJ (H8).

---

## Hallazgos

### Críticos (2)

**C1 — La clase la elige quien da de alta la Cita, y la exclusión de SM-C1 premia reclasificar** (FR-13 l.415, FR-65 l.1281, SM-C1 l.1648, glosario l.96)

FR-13 dice: «Cuál de las dos puertas se aplica lo decide la clase de la Cita, nunca quien la da de alta». Pero la clase depende de dos datos que se declaran al dar de alta: tener Personaje o tener un Autor «con derechos vigentes». Hay dos consecuencias:

- Una candidata de la clase de siempre que falla el cotejo (FR-24), o que no trae Procedencia, se publica igual si se le declara un Personaje. FR-65 lo admite expresamente: «una Cita de Sancho en el Quijote también lo es». Lo mismo pasa si se marca a su Autor como «con derechos vigentes».
- SM-C1 excluye la atribuida «ni en el numerador ni en el denominador». Por tanto, sacar de la clase de siempre una Cita con Procedencia incompleta **sube** SM-C1. Es la misma trampa de denominador que §6.1 (l.1374) rechazó por escrito: «dejaría que un fallo de captura *mejorase* el indicador».

El PRD no dice qué pasa con las Citas ya publicadas que dice un personaje: Segismundo, Sancho, Celestina. Si se les declara Personaje, salen de SM-C1, pierden el pasaje y «Cómo citar», y nada lo cuenta.

*Enmienda mínima:*

1. En FR-65, que Personaje y derechos vigentes se declaran con una orden que valida, nunca tecleando el campo, como la clave de orden (FR-15).
2. Una Cita de la clase de siempre, publicada o en revisión, no pasa a atribuida sin un acto de Héctor que queda registrado.
3. SM-C1 informa además cuántas Citas pasaron de clase en el periodo. Una cifra distinta de cero se lee igual que una bajada de SM-C1.
4. Una Cita con Personaje y documento cotejado conserva su Procedencia y cuenta en SM-C1. Alternativa: el Personaje no cambia la clase cuando la Obra es de dominio público. Elegir entre las dos es decisión de Héctor.

**C2 — LC-6 queda incumplida por construcción** (§13 l.1749)

«LC-6 — Corpus mínimo defendible. Ninguna Cita publicada sin Procedencia». FR-65 publica Citas sin Obra y sin Fuente («La Obra es opcional», l.1283). §13 dice que estas puertas «deben estar abiertas para que el sitio pueda considerarse publicado». Con la primera atribuida sin Procedencia, el sitio deja de cumplir su propia condición de lanzamiento.

*Enmienda mínima:* «Ninguna Cita de la clase de siempre publicada sin Procedencia *(v9.1: la Cita atribuida no la exige, §4.24)*».

### Altos (11)

**H1 — «Exactamente un Autor» sigue en todo el documento** (glosario Cita l.82; FR-1 l.155; FR-2 l.165; FR-18 l.485; FR-19 l.499; FR-30 l.667; FR-57 l.1144; NFR-3 l.1670)

El glosario dice todavía «Tiene exactamente un Autor». La nota v9.1 añade «Personaje, Autor o los dos» y no corrige la frase anterior, así que el mismo párrafo se contradice (cf. reconcile n.º 4). Las mismas frases que dan el Autor por hecho aparecen en estos sitios:

- FR-1: la URL «incluye un identificador derivado del texto y del Autor».
- FR-2: «Se muestra el nombre del Autor, enlazado a su Página de Autor».
- FR-18: el texto propuesto «incluye la Cita y su Autor».
- FR-19: la Tarjeta Social lleva «texto de la Cita y su Autor».
- FR-30: «ninguna aparece sin Autor», que excluye o rompe toda Pieza con una Cita que solo tiene Personaje.
- FR-57: el fragmento lleva «el nombre de su Autor».
- NFR-3: los datos estructurados llevan «su autor».

FR-66 (l.1299) solo cubre «la Atribución y todo lo que la compone (FR-3, FR-10)».

*Enmienda mínima:*

- En el glosario de Cita: «Tiene un Autor, o un Personaje, o los dos *(v9.1)*».
- En FR-1, FR-2, FR-18, FR-19, FR-30, FR-57 y NFR-3, una línea marcada *(v9.1)*: «En la Cita atribuida sin Autor, el Personaje ocupa el lugar del Autor, enlazado a su Página de Personaje (FR-66)».
- Alternativa: una sola regla en FR-66 que enumere esos FR por su número.

**H2 — Una Obra sin Autor no tiene identidad** (glosario Obra l.85; FR-51 l.986; FR-52 l.1009; FR-53 l.1025; FR-55 l.1071)

Lo mismo que reconcile n.º 3, con las líneas del PRD. La Obra es «una obra de un Autor», y su identidad es la del Autor con el título. La URL de la Ficha de Obra «lleva el Autor y la obra». La regla de FR-52 compara con «las Citas publicadas de su Autor». El Directorio de Obras agrupa «por Autor». Una Cita con Personaje, sin Autor y con Obra (*El imperio contraataca*) cae fuera de las cinco reglas. FR-70 depende justamente de esa Obra.

*Enmienda mínima:* que FR-65 diga «Una Cita atribuida con Obra lleva Autor» (lo que cierra el `[ASSUMPTION]` de l.1282 en sentido contrario). Si no, hace falta enmendar la identidad de la Obra en el glosario y en FR-53 (por ejemplo, «el Autor o, si no consta, el Personaje»). En cualquiera de los dos casos, decirlo antes de pasar a arquitectura (AD-25).

**H3 — §5 y §4.11 siguen prohibiendo lo que FR-67 y FR-68 hacen con la traducción** (§5 l.1349 y l.1352; §4.11 l.561)

§5 dice: «Solo entra texto en español de una edición identificable». §4.11 dice: «Solo se admite texto en español procedente de una edición identificable». FR-67 toma como texto principal «la del doblaje o la traducción que circula allí», y FR-68 admite «una versión en español que circule, con su origen anotado». Un doblaje o una frase que circula no es una edición identificable. FR-68 cita «(§5)» como si §5 lo amparara, cuando §5 lo veda.

Además, BrainyQuote es un sitio en inglés: la semilla aporta nombre y frase en inglés, y el texto en español tiene que venir de otra fuente que el PRD no nombra. La semilla queda casi vacía, o se convierte en traducción.

*Enmienda mínima:*

- En §5 l.1349 y en §4.11 l.561, añadir *(v9.1)*: «salvo la Cita atribuida, que admite la versión en español que circula —la de un doblaje o una traducción publicada—, con su origen anotado; nunca una traducción propia (FR-68)».
- En FR-68, decir qué aporta BrainyQuote: solo qué Personajes o Autores, y de qué frases, buscar en español.

**H4 — §4.11 dice que la decisión que define la feature es no extraer de sitios de citas, y no está enmendado** (l.559)

El texto es: «Los sitios de citas existentes… cualquier Cita tomada de ellos moriría en la puerta de admisión de FR-13, y además §5 lo excluye explícitamente». §5 ya no lo excluye (l.1348), y FR-13 ya no se aplica a esa clase (l.415).

*Enmienda mínima:* añadir *(v9.1)*: «Vale para la clase de siempre. La Cita atribuida admite la semilla de prueba de BrainyQuote (FR-68, §5), y nada más».

**H5 — «La de venta nunca va sola» sigue absoluta en FR-54 y FR-62, aunque §6.8 dice que FR-54 tiene su excepción** (FR-54 l.1045, l.1047, l.1048; FR-62 l.1223; §6.8 l.1569)

§6.8 dice: «FR-13 y FR-54 ganan su excepción para esa clase, nombrada». Solo la tienen FR-13 (l.415) y FR-35 (l.742). FR-54 sigue diciendo tres cosas:

- «Una Obra sin edición cotejada no muestra ediciones en venta» (l.1048).
- ««Gratis» es la edición cotejada, siempre la primera» (l.1047).
- Una Obra sin Cita cotejada «lo dice» (l.1045). En una Obra con derechos vigentes, eso es justo el aviso de «no cotejada» que FR-65 (l.1287) prohíbe.

FR-62 (l.1223) no pone en la lista de curación ninguna Obra sin edición cotejada «porque la edición en venta nunca va sola». Así quedan fuera precisamente las Obras con derechos vigentes, que son la palanca de ingreso de la v9.1.

*Enmienda mínima:*

- En FR-54 l.1045 y l.1048: «*(v9.1)* Salvo la Obra con derechos vigentes (FR-70): ahí el bloque no dice nada de cotejo y las ediciones en venta van solas, por formato y por tienda, sin el grupo «Gratis»».
- En FR-62 l.1223: «…salvo la Obra con derechos vigentes (FR-70), que entra con su demanda».

**H6 — La Página de Personaje no tiene regla de indexación, familia ni régimen de ingreso, y choca con los Directorios** (FR-66 l.1297 y l.1301; FR-55 l.1057 y l.1068; NFR-1 l.1668; §10 l.1687; SM-C2 l.1651; §12 l.1721; glosario «Superficie de lectura» l.105; pregunta 19 l.1808)

- **Indexación.** «Indexable con las reglas de una agregación» no remite a ninguna regla. La Página de Autor no tiene umbral, el Tema tiene 15 Citas y la Obra tiene FR-52. NFR-13, al que remite, es la regla de la canónica, no la de indexación. Una Página de Personaje con una sola Cita repite esa Cita: es el caso por el que existe FR-52 y la vía barata que vigila SM-C2. SM-C2 no la cuenta.
- **Directorios.** FR-55 dice que los Directorios «son dos páginas, y seguirán siendo dos» y que el de Autores lista «todo Autor… y ninguno más». El supuesto de FR-66 («entran en los Directorios… sin contarse como Autores») contradice las dos frases.
- **Listas de superficies.** NFR-1 no enumera la Página de Personaje entre las indexables, y §10 sigue diciendo «ocho superficies públicas».
- **Ingreso.** No se dice qué Modelos admite la Página de Personaje. La Página de Autor, que es su análoga, no admite ninguno (§12). La pregunta 19 habla de qué Obra «lleva el enlace», y eso se lee como un enlace de afiliado. Contradiría FR-35: «desde su Página de Obra y desde ningún otro sitio».

*Enmienda mínima:*

- En FR-66: «Se indexa con la regla de FR-52 aplicada al Personaje: al menos 2 Citas publicadas; con una sola, `noindex, follow`».
- En FR-66: «No admite ningún Modelo de Ingreso, como la Página de Autor (§12). Lleva a la Página de Obra, que es donde vive la afiliación».
- Añadir la Página de Personaje a NFR-1 y a §10. Elegir entre un tercer Directorio (enmendando FR-55 l.1057) o ninguno (y entonces cómo cumple NFR-5).
- En SM-C2: decir si entra en la mediana.
- Reescribir la pregunta 19 como «a qué Página de Obra lleva primero la Página de Personaje».

**H7 — «Derechos vigentes» no está definido, y FR-15 sigue exigiendo el año de fallecimiento** (FR-15 l.431; glosario Autor l.83; FR-65 l.1284)

FR-15 dice: «El año de fallecimiento es obligatorio para crear un Autor». No está enmendado y contradice el glosario de Autor y FR-65. Tampoco hay criterio comprobable de qué es «con derechos vigentes»: el plazo es de 70 u 80 años en España según la fecha de muerte, y de 100 en México. El addendum (l.551) dice además que la v9.1 «no toca su año de fallecimiento», y el glosario sí lo toca.

*Enmienda mínima:*

- En FR-15 l.431: «*(v9.1)* Salvo el Autor con derechos vigentes, que solo publica Citas atribuidas (FR-65)».
- En FR-65: «Un Autor tiene derechos vigentes si vive, o si su año de fallecimiento cae dentro del plazo con nombre que declara la configuración —el más largo de los países del público—, y lo juzga la herramienta, nunca quien lo declara». Esto cierra también parte de C1.
- Corregir la frase del addendum en su próxima pasada.

**H8 — Ningún recorrido de usuario recoge la clase; las referencias «Realiza UJ-n» no casan** (FR-65 l.1278; FR-66 l.1294; FR-67 l.1305; FR-68 l.1315; UJ-4 l.67)

FR-65 y FR-68 dicen «Realiza UJ-4», pero UJ-4 es un lote «de un autor recién entrado en dominio público», que el sistema rechaza si falta Procedencia o año de fallecimiento. Narra justo lo contrario de la puerta nueva. FR-66 y FR-67 dicen «Realiza UJ-1», que es la presentación de Lucía y no tiene Personaje ni variante. Quien busca «frases de Darth Vader» o «frases de Barney Stinson» y llega a una Página de Personaje es la primera palanca de la v9.1, y no tiene protagonista. La rúbrica pide UJ en un producto de consumo, y bmad-ux los va a necesitar.

*Enmienda mínima:*

- Un UJ-8 (por ejemplo, un fan que busca la frase de Barney para un mensaje y llega a la Página de Personaje, con la variante de España debajo y la Obra a un toque) y que FR-66, FR-67 y FR-70 lo realicen.
- En UJ-4, añadir «*(v9.1)* Las Citas atribuidas entran por su propia puerta (FR-65)».

**H9 — El riesgo jurídico tiene dueño, pero no condiciona el alcance, y FR-65 lo amplifica** (§6.8 paso 8 l.1552; FR-65 l.1289; FR-68 l.1319; pregunta 18 l.1807)

La pregunta 18 se revisa «antes de que la clase pase de la semilla de prueba». Pero el paso 8 mete en alcance la clase entera, FR-68 describe ya la siembra «a escala», y ninguno de los dos se condiciona a esa respuesta.

FR-65 hace que Copiar, la Imagen, compartir y el Fragmento traten a la atribuida «como a cualquier Cita». La Imagen de Cita, la Pieza (FR-30), el Kit y el Fragmento sacan la frase de una obra protegida, o el nombre de un personaje que es marca, fuera del contexto que sostiene el derecho de cita, y en un canal propio que ya cobra (Facebook). La exclusión de la Cita del Día (l.1290) no alcanza a la Pieza ni al lote.

*Enmienda mínima:*

- En §6.8 paso 8: «Pasar de la semilla de prueba a la siembra a escala espera a la respuesta de la pregunta 18».
- En FR-65, decir si la Imagen, la Pieza (FR-30…FR-32) y el lote (FR-29) admiten Citas atribuidas. La opción prudente es «no, hasta la pregunta 18», igual que la portada.

**H10 — La promesa de confianza: FR-2 y FR-65 chocan, y §1, §2.1 y §11 quedan sin mecanismo** (FR-2 l.168; FR-65 l.1287; §1 l.30 y l.32; §2.1 l.43; UJ-1 l.58; §11 l.1712; §4.22 l.1133)

FR-2 dice: «Cuando la Procedencia está ausente, la página lo indica explícitamente en lugar de omitir el bloque en silencio». FR-65 dice: «Sin Fuente, la Página de Cita no dice nada de ella: ni sello… ni hueco». En la clase de siempre, Fuente y Procedencia son cosas distintas, pero una atribuida sin Obra no tiene ninguna de las dos, así que las dos reglas se aplican a la vez y se contradicen.

Por otra parte, §1 promete «respaldada por la procedencia de lo que afirma» y critica a los demás por las «atribuciones sin verificar». El JTBD de §2.1 es «comprobar si una frase es realmente de quien se le atribuye». La anti-referencia de §11 son «los sitios de citas en español actuales». §4.22 dice de BrainyQuote: «ninguna de sus citas trae obra ni procedencia, y este Corpus sí». Ahora el Corpus importa de allí y publica sin distinción visible (cf. reconcile n.º 5).

*Enmienda mínima:* resolver la contradicción con FR-2, que ya es un mecanismo que no es un sello. En FR-65 l.1287: «Sin Fuente no hay línea de Fuente. La Procedencia ausente se indica como en toda Cita (FR-2), con las mismas palabras: no es un sello de la clase». Si Héctor prefiere el silencio total, enmendar FR-2 l.168 con la excepción, y en §1 l.30 decir «respaldada, *en la clase de siempre*, por…». También ajustar §4.22 l.1133.

**H11 — SM-C6 no puede saltar con el tráfico de hoy y no dice qué es saltar** (SM-C6 l.1662)

Mide peticiones por cada cien atribuidas. Con «una lectura humana al día» (§7), nadie que no visita reclama, así que el cero de SM-C6 será el cero del tráfico, no el de la calidad. «Si sube mientras crece la clase» no tiene ventana ni mínimo, a diferencia de SM-C3 y SM-C5 («Qué es saltar»). La vía barata que dice vigilar, «publicar sin mirar», no la ve hasta que alguien con abogado llega.

*Enmienda mínima:*

- Añadir una lectura que no dependa del tráfico: «auditoría de una muestra con nombre de atribuidas publicadas, cada mes de siembra, contra una fuente que las documente. La proporción mal atribuida se lee junto a las reclamaciones», como se falsó en §15 v3.1 el supuesto de la siembra por agentes.
- Dar a SM-C6 su regla de salto, en ventanas, como SM-C3.

### Medios (14)

**M1 — El índice de supuestos no casa con lo que está en línea** (FR-65 l.1282 y l.1288; FR-66 l.1301; FR-67 l.1310; FR-68 l.1320; FR-69 l.1330 y l.1332; §15 l.1873–1877)

Hay siete `[ASSUMPTION]` en línea en §4.24 y ninguno está en §15. Las tres entradas de §15 v9.1 (la demanda de «frases de {personaje}», que la semilla no atraiga reclamaciones y que quien llega compre) no están en línea; la de FR-70 no lleva etiqueta en su FR. Varias de las siete son decisiones de diseño, no de capacidad («retirar primero y decidir después», «la variante no se compone»): según la nota de §15 v8.1, las confirma Héctor o se indexan.

*Enmienda:* indexar las siete en §15 con cómo se falsan o quién las confirma, y etiquetar en línea las tres del índice.

**M2 — Lo que FR-65 saca «por pedir cotejo» no casa con FR-60 ni con FR-70** (FR-65 l.1288; FR-60 l.1192; FR-70 l.1341)

FR-65 excluye «la Ficha técnica que se apoya en la edición cotejada». La Ficha técnica sale de Wikidata, y de la edición cotejada solo toma el traductor. Además es de la Obra, no de la Cita: *Sapiens* puede tenerla, y FR-70 (l.1341) solo le quita el texto, el pasaje y el incipit. Una Cita de Sancho con documento cotejado pierde el pasaje y «Cómo citar» aunque se pueda cotejar.

*Enmienda:*

- Quitar la Ficha técnica de la lista de FR-65, o decir que en una Obra con derechos vigentes la Ficha técnica va sin traductor.
- Formular la exclusión por lo que la Cita tiene: «sin documento, sin pasaje», que ya es la regla de FR-59, en lugar de por su clase.

**M3 — La tríada de FR-41 no sirve para un Personaje ni para un Autor vivo** (FR-41 l.849; FR-66 l.1298; glosario Autor l.83)

FR-66 aplica «la misma regla que la de un Autor (FR-41)». FR-41 comprueba «años de nacimiento y fallecimiento para el “cuándo vivió”» y «tradición o corriente». El glosario de Autor sigue registrando el año de fallecimiento (cf. reconcile n.º 4).

*Enmienda:*

- En FR-66, una tríada propia: quién es, en qué Obra o universo aparece, y por qué se le cita.
- En FR-41: «*(v9.1)* En el Autor vivo, el “cuándo vivió” es el año de nacimiento».

**M4 — Autores destacados y suelo del 40 %: no dice si entran los Autores que solo tienen atribuidas ni los Personajes** (FR-8 l.275; FR-9 l.313; §6.1 l.1368; FR-25 l.597; FR-49 l.952)

Los ocho destacados son «los ocho con más Citas publicadas». Un Autor vivo con muchas atribuidas podría estar en la portada, que según la pregunta 22 «es la promesa de la procedencia». El suelo panhispánico no dice si cuenta a los Autores con derechos vigentes ni a los Personajes, y eso importa con la ficción mexicana (pregunta 21; cf. reconcile n.º 4).

*Enmienda:* «*(v9.1)* Los destacados y el suelo de §6.1 se cuentan sobre las Citas y los Autores de la clase de siempre. El Personaje no es Autor y no cuenta en ninguno de los dos». Si Héctor quiere que la ficción mexicana sume al suelo, decirlo aparte.

**M5 — La línea de cifras de la portada es ambigua** (FR-9 l.307; FR-65 l.1288)

FR-65 saca de la atribuida «la línea de cifras de la portada que cuenta cotejadas». No dice si la atribuida cuenta en «cuántas Citas publicadas hay», ni si los Personajes cuentan «de cuántos Autores».

*Enmienda:* en FR-9 l.307, «*(v9.1)* Cuenta las Citas de las dos clases y solo los Autores. La cifra de cotejadas es solo de la clase de siempre».

**M6 — El canal de FR-69 choca con el repositorio público y con «nunca la borra»** (FR-69 l.1330 y l.1331)

«Cada petición se registra en el Corpus». El Corpus vive en un repositorio público, y la petición trae datos de quien reclama: nombre, correo, a veces el titular. «Retirar… la mueve a revisión, nunca la borra»: el texto disputado sigue en el historial público de git, y para un titular de derechos eso sigue siendo publicarlo.

*Enmienda:*

- «El registro guarda la fecha, la Cita, la clase de quien pide (persona afectada, titular de derechos u otro) y lo que se hizo, nunca datos de contacto».
- Llevar a §14 una pregunta: si una retirada por derechos exige sacar el texto del repositorio público, y cómo encaja con «git es el único almacén».

**M7 — Los topes sin valor dejan la puerta sin comportamiento definido; las preguntas 20 y 23 no llegan a FR-65** (FR-65 l.1285; preguntas 20 y 23, l.1809 y l.1812)

Hasta que Héctor dé valores, no está definido qué hace la puerta.

*Enmienda:*

- En FR-65: «Sin valor declarado, la puerta no publica ninguna Cita atribuida».
- Bajar a FR-65 el valor provisional de la pregunta 23: «es de un Personaje o de un Autor con obra publicada».

**M8 — La puerta de FR-68 no se puede verificar** (FR-68 l.1319 y l.1322; cf. reconcile n.º 2)

«Una puerta de calidad que una persona aprueba» no dice qué juzga. «Sin teclear metadato a mano» no dice de dónde salen el Personaje, la Obra y el origen. No dice si un agente puede sembrar atribuidas, como sí dice §4.11 de la siembra de siempre. «Se registra como las demás (FR-25)»: FR-25 no contiene el registro de la sesión, que es de la Historia 11.3/11.4.

*Enmienda:*

- En FR-68: qué mira la puerta (que la frase circule documentada en al menos N sitios ajenos con la misma atribución, o el criterio que decida Héctor), de dónde sale cada campo, y si un agente puede proponer y solo una persona aprobar.
- Corregir la referencia a FR-25 o ampliar FR-25.

**M9 — La familia Personaje no existe en las series ni en los avisos** (FR-40 l.827; FR-38 l.796; FR-47 l.920; FR-56 l.1109; §15 l.1875)

§15 se falsa con «la familia Personaje leída desde su primer despliegue». FR-40 distingue Cita, Autor, Tema, Colección y Obra (más el Directorio), y no el Personaje. FR-38 no avisa al publicar un Personaje. El conjunto cerrado de zonas de FR-56 no tiene la Página de Personaje.

*Enmienda:* una línea *(v9.1)* en FR-40 («el Personaje es familia propia, como el Directorio»), en FR-38 y en FR-56, con su zona.

**M10 — La Página de Autor y «Más de {Autor}» con Citas que son de un Personaje** (FR-4 l.196; FR-12 l.378; FR-51 l.987)

No se dice si la Página de Cervantes lista las Citas de Sancho, ni si «Más de {Autor}» las mezcla con las de su prosa. En la Obra, las Citas sin documento van al final y por slug: en una Obra de derechos vigentes, ese es el orden de todas sus Citas, y «Siguiente» las recorre alfabéticamente.

*Enmienda:* en FR-66, «La Cita con Personaje y Autor está en las dos páginas», o la regla que decida Héctor. En FR-51, «En la Obra con derechos vigentes, el orden es el de su ficha» o el que se decida.

**M11 — FR-16 no sigue la enmienda de SM-C1** (FR-16 l.440)

«El porcentaje de Citas publicadas con Procedencia completa», desglosado por Autor, sigue mezclando las dos clases.

*Enmienda:* «*(v9.1)* Sobre la clase de siempre, como SM-C1, y con el recuento de atribuidas y de cambios de clase aparte» (ver C1).

**M12 — El paso 8 de §6.8 subestima el trabajo, y sus listas no están al día** (§6.8 l.1552, l.1560 y l.1591)

La razón del paso dice «solo hay que dejarla fuera de lo que pide cotejo y dentro de lo que vende». Pero el paso trae una superficie nueva con su familia, su ruta y su vista, entrada en los Directorios y en la búsqueda, la variante en la búsqueda, el canal y su registro, y la Obra sin Autor. «Enmiendas sin trabajo nuevo» (l.1560) y «Los actos de Héctor» (l.1591) no recogen la v9.1. Faltan los valores de los topes, el plazo de FR-69, qué Personajes van en la semilla, el consejo legal de la pregunta 18 y la decisión de C1.

*Enmienda:* ampliar las tres listas.

**M13 — Una Cita atribuida puede quedar sin Tema y fuera de NFR-5** (NFR-5 l.1672; FR-65)

NFR-5 llega a la Cita «a tres por su Tema». La puerta de siempre exige un Tema con página (Historia 26.8), y FR-65 no dice nada de Temas. Si la Página de Personaje no está en un Directorio (H6), una atribuida sin Tema puede quedar a más de tres saltos.

*Enmienda:* en FR-65, «Como toda Cita, se publica con al menos un Tema publicado, o con su Página de Personaje enlazada a dos saltos de la portada».

**M14 — La congelación de SM-11 puede dejar FR-70 sin efecto, y no se dice** (FR-70 l.1340; SM-11 l.1636; FR-35 l.749)

FR-70 hereda «todo lo demás de FR-35», también que con la familia Obra congelada «no se enseña nada». La ventana de SM-11 se juzga hacia el 2026-12-05. Si congela, la palanca de ingreso de la v9.1 nace apagada.

*Enmienda:* una línea en FR-70 que lo diga, para que no se lea como un fallo de la clase.

### Bajos (9)

- **L1 — §0 y §4 no recogen la v9.1** (l.12–20, l.125, l.134). «Veintitrés features… en ocho rondas» y la lista de rondas terminan en §4.23. *Enmienda:* «Veinticuatro…», y añadir «v9.1 — §4.24» a la lista y una frase a §0.
- **L2 — La trazabilidad va al revés** (FR-69 l.1326 «Valida SM-C6»; FR-70 l.1336 «Valida FR-35»). Es la métrica la que valida el FR, y un FR no valida otro FR (FR-62 ya tiene el mismo vicio). *Enmienda:* poner «Validado por SM-C6» en FR-69, y «Amplía FR-35» en FR-70.
- **L3 — Referencias que resuelven pero a la regla equivocada.** FR-69 l.1329 cita NFR-11 para «ni carga guion de tercero», y NFR-11 es la privacidad de la analítica; la regla del guion de tercero está en FR-34, FR-35 y FR-56. FR-66 l.1297 cita NFR-13 para la indexación, y NFR-13 es la regla de la canónica. Las demás referencias de la v9.1 (FR-41, FR-53, FR-54, FR-25, FR-14, FR-58…FR-61, FR-9 y las preguntas 18, 19, 21 y 22) resuelven.
- **L4 — Las preguntas 19 a 23 no siguen el formato de §14.** Las 11 a 17 dicen qué bloquean y quién es su dueño. De las 18 a 23, solo la 18 nombra dueño, y ninguna dice qué bloquea. La 19 trae su respuesta dentro («lo decide una persona, Obra a Obra»), y la 20 también la mitad («los valores los fija Héctor»): no son preguntas abiertas. Ninguna pregunta recoge la decisión de C1 ni la de M6. *Enmienda:* añadir a cada una el dueño y qué bloquea, reescribir la 19 y la 20 como preguntas, y añadir las preguntas 24 (cambio de clase) y 25 (retirada del repositorio público).
- **L5 — Jerga sin glosario.** «la PARADA 3 de la siembra» (l.1270) solo se entiende con la memoria de sesión. *Enmienda:* «la siembra de dominio público se agotó el 2026-11-03».
- **L6 — Frases que suponen que todo es dominio público.** FR-44 l.888 («aceptan una obra de dominio público por lo que es») y FR-36 l.762 (la antología «apoyada en la Procedencia verificada»). *Enmienda:* no hace falta tocarlas si se decide que la antología y las señales externas son solo de la clase de siempre; decirlo en una línea de FR-36.
- **L7 — El addendum lo contradice el glosario** (addendum l.551: «no se tocan su año de fallecimiento… ni la cuota latinoamericana de las Épocas»). El glosario de Autor sí añade la excepción, y la cuota es la de §6.1, no la de las Épocas. Es para la próxima pasada de `bmad-prd`, no para editar a mano.
- **L8 — La variante solo cubre dos versiones** (FR-67 l.1308). No dice qué pasa cuando solo circula la de España, que entonces es la principal (cf. reconcile, observación menor 4). *Enmienda:* «Si solo circula una, es la principal, sea cual sea».
- **L9 — «Apta para portada» no tiene puerta** (FR-65 l.1290; FR-15 l.436). Sería «no es apta», pero nada impide marcarla. *Enmienda:* «La orden que marca aptas para portada y la que fija jornadas rechazan una Cita atribuida».

---

## Notas mecánicas

- **Deriva del glosario:**
  - «Cita», «Autor» y «Obra» siguen definidos con «exactamente un Autor», «año de fallecimiento obligatorio» y «una obra de un Autor» (H1, H2, H7).
  - «Variante» va con mayúscula en el glosario y en minúscula en FR-67 («**variante** declarada»), y el resto del documento escribe los términos del glosario con mayúscula.
  - «Página de Personaje» se usa en FR-66, FR-69 y §15, y no está en la entrada «Página de Cita / de Autor / …» del glosario (l.103).
- **Continuidad de identificadores:**
  - FR-65…FR-70 y SM-C6 son contiguos y únicos.
  - Las preguntas 18 a 23 son contiguas.
  - No hay UJ nuevo (H8).
- **Supuestos:** el índice no casa con lo que está en línea (M1).
- **Secciones obligatorias:** están todas. Faltan las enmiendas en su sitio que señalan C2, H1, H3, H4, H5 y H7, y la de §10/NFR-1 de H6.
- **Coincidencias con `reconcile-v9-1-intent.md`:**
  - H2 = n.º 3.
  - H1 (en parte) = n.º 4.
  - H10 = n.º 5.
  - M8 = n.º 2.
  - L8 = observación menor 4.
  - El resto de esta revisión es nuevo: C1, C2, H3, H4, H5, H6 (salvo el Directorio), H7, H8, H9, H11 y M1–M7 y M9–M14.

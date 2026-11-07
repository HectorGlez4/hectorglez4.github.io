# Revisión de coherencia — pasada v9 / v9.1 de las espinas de UX

- **Fecha:** 2026-11-06
- **Alcance:** `DESIGN.md` y `EXPERIENCE.md` de esta carpeta, en su estado de trabajo (`git diff` sin commitear), leídos enteros, no solo el diff, contra las entradas de `.memlog.md` desde «Pasada v9 / v9.1» hasta el final (incluida la decisión de Héctor del 06/11 sobre la portada).
- **Método:** cinco lentes: (1) contradicciones entre las dos espinas; (2) frases de la v8.x que siguen en pie y contradicen la v9; (3) decisiones del memlog que faltan o que se recogen de otra forma; (4) referencias de token `{…}` sin definición en el frontmatter; (5) la portada frente al orden nuevo de la Página de Cita.
- **Veredicto:** las dos espinas coinciden en casi todo lo de la v9 y la v9.1 (orden de la Página de Cita, desplegables, Página de Obra, Lista de Obras plegada, Personaje, Variante, canal de corrección, zonas, recortes, verso, medida de la Cita, contorno de los «Buscar en…»). **Hay un hallazgo crítico**: las dos dejan la portada en el orden de la v8, y la decisión de Héctor del 06/11 dice lo contrario. **Hay dos altos**: la fila de 600px y «Ver esta cita». Las referencias de token están todas bien.

---

## Crítico

### C1. La portada conserva el orden de la v8 en las dos espinas, y Héctor decidió el 06/11 que siga el orden nuevo

Memlog, última entrada: «la Cita del Dia de la portada sigue el orden nuevo de la Pagina de Cita: Cita, atribucion, Fuente, acciones y despues su Tarjeta de Obra. Un solo orden en las dos superficies; cambia tambien la portada de la Epica 28 (construida en v8/epica-28, sin fusionar). Rechazado conservar en la portada el orden v8».

Las dos espinas se escribieron antes de esa decisión y dicen lo contrario:

- `EXPERIENCE.md § Component Patterns → Portada` (párrafo inicial): «*(v9)* La Página de Cita sube sus acciones por encima de la Tarjeta de Obra; **la portada conserva el orden de la v8**, Tarjeta de Obra y después acciones, porque esta pasada no lo decide para ella. Es un punto abierto para Héctor.». El punto ya no está abierto.
- `EXPERIENCE.md § Portada`, fila «Cita del Día»: «*(v8)* Debajo, **su Tarjeta de Obra y sus acciones**: Copiar, Imagen y el bloque «Compartir en»…».
- `EXPERIENCE.md § Portada`, mismo párrafo inicial: «“La cita de hoy”, con su Tarjeta de Obra y sus acciones» y «la Tarjeta de Obra y las acciones quedan debajo».
- `EXPERIENCE.md § Information Architecture`, fila Portada: «la Cita del Día con su Tarjeta de Obra y sus acciones».
- `DESIGN.md § Components → Página de Cita → Acciones de la Página de Cita → Dónde`: «*(v8)* Con el mismo trato van sobre la Cita del Día de la portada, **que conserva su orden: la v9 cambia solo el de la Página de Cita** [ASSUMPTION].».
- `DESIGN.md § Components → Portada` (párrafo inicial): «la Cita del Día con su Tarjeta de Obra y sus acciones».
- `DESIGN.md § Portada → Cita del Día`: «Después, **la misma Tarjeta de Obra, las mismas Acciones y el mismo «Compartir en»** que en la Página de Cita».

Consecuencias que hay que arrastrar en las dos espinas:
- el orden de los `h3` dentro de «La cita de hoy» (`DESIGN.md § Portada → Un solo bloque también al lector de pantalla` y `EXPERIENCE.md § Accessibility Floor → Encabezados` nombran «De la obra» y «Compartir en», en ese orden; ahora va primero «Compartir en»);
- UJ-6 paso 3 (`EXPERIENCE.md § Key Flows`): «mira en su Tarjeta de Obra de qué libro sale y, en «Compartir en», pulsa WhatsApp» sigue el orden viejo de la página;
- el cierre de superficies (`EXPERIENCE.md § Information Architecture`): «UJ-6 → Portada (Cita del Día, Tarjeta de Obra, «Compartir en»)»;
- ninguna de las dos dice «cambia lo construido» para la portada de la Épica 28 (rama `v8/epica-28`), y el memlog lo pide de forma explícita;
- el punto abierto de la entrada `(change)` del memlog («la portada conserva el orden v8») queda superado, y hay que retirarlo de la lista de puntos abiertos del texto.

---

## Alto

### H1. La fila de las acciones desde 600px: EXPERIENCE mete «Compartir en» y DESIGN lo deja fuera

- `EXPERIENCE.md § Responsive & Platform`, fila 600–1024px: «**Las acciones de la Página de Cita —Copiar, Imagen y «Compartir en»— van en fila**, desde este punto de ruptura».
- `DESIGN.md § Página de Cita → Acciones → Cómo se colocan`: «La fila es de los dos botones; «Compartir en» sigue en su bloque, debajo [ASSUMPTION].». `§ Bloque «Compartir en»` añade: «desde 600px, bajo la fila de las acciones».

El literal de la decisión del memlog dice «Copiar, Imagen, Compartir en». La entrada `(change)` lo deja como punto abierto («la fila de 600 px lleva Copiar e Imagen y 'Compartir en' sigue como bloque»), y EXPERIENCE no lo marca así. Detrás hay una diferencia de definición. Para `EXPERIENCE.md § Página de Cita`, las acciones son «Copiar, Imagen y el bloque «Compartir en»». Para `DESIGN.md § Acciones de la Página de Cita`, son «Copiar e Imagen», y «Compartir en» es un bloque aparte (el orden de `DESIGN.md § Página de Cita` los enumera por separado: «Acciones, «Compartir en»»). Un bloque con rótulo y rejilla de 2 × 2 no cabe en una fila junto a dos botones sin una composición nueva, así que lo más probable es que valga la lectura de DESIGN. En ese caso, EXPERIENCE tiene que decir «Copiar e Imagen» y marcar el punto como [ASSUMPTION] o como decisión pendiente de Héctor.

### H2. «Ver esta cita» queda entre la Atribución y Copiar en la portada, y eso viola la regla nueva

Si la portada adopta el orden nuevo (C1), tiene que resolverse dónde va «Ver esta cita»:

- `DESIGN.md § Portada → Cita del Día`: «Debajo, a 3 × `{spacing.unit}`, «Ver esta cita»… Después, la misma Tarjeta de Obra, las mismas Acciones…». Con el orden v9 quedaría Atribución → Fuente → «Ver esta cita» → acciones.
- `DESIGN.md § Do's and Don'ts`: «*(v9)* Nunca un bloque entre la Atribución —con su Línea de la Fuente y su Variante— y Copiar». También `§ Acciones → Dónde`: «nada se intercala entre la Atribución y Copiar».
- `EXPERIENCE.md § Portada → Cita del Día`: «la Cita, su Atribución, su Línea de la Fuente… y «Ver esta cita»», y después la Tarjeta y las acciones.

La regla está escrita en general, no solo para la Página de Cita. O «Ver esta cita» baja tras las acciones (o tras la Tarjeta de Obra), o la regla de Don't se acota a la Página de Cita. Lo decide Héctor junto con C1. Afecta también al orden de tabulación del bloque.

---

## Medio

### M1. «La Obra es lo segundo que se ve» sigue en pie en la Foundation
`EXPERIENCE.md § Foundation`, párrafo *(v8)*: «la Obra es lo segundo que se ve, la siguiente Cita está a un toque…». En la v9 lo segundo son las acciones, y el párrafo *(v9)* que viene justo después lo dice («las acciones suben por encima de la Tarjeta de Obra»). Hay que acotar o marcar la frase de la v8.

### M2. A qué campos llega el contorno completo: DESIGN incluye el filtro de los Directorios y EXPERIENCE no
- `DESIGN.md § Búsqueda → Campo de búsqueda → Etiqueta y contorno`: «que lo lleven también el de `/buscar/`, el del 404, el de la portada **y el filtro de los Directorios**… es [ASSUMPTION]».
- `EXPERIENCE.md § Búsqueda`, fila Campo de búsqueda: «lo llevan también el de `/buscar/`, el del 404 y el de la portada» (sin el filtro). La entrada `(assumption)` del memlog tampoco lo nombra.
- `EXPERIENCE.md § Accessibility Floor` dice «todo Campo de búsqueda», y `DESIGN.md § Directorios` define el filtro como «el Campo de búsqueda», así que por herencia lo lleva. Conviene que EXPERIENCE lo nombre o que DESIGN lo quite.

### M3. «Las {n} obras»: el rótulo choca con el cierre de la portada y {n} no está definido
- La Lista de Obras plegada se rotula «Las {n} obras» (`DESIGN.md § Primitivas → Desplegable`, `EXPERIENCE.md § Voice and Tone → Microcopia de la v9`). En la portada, «Las {n} obras ›» es el enlace al Directorio de Obras (`DESIGN.md § Colors`, `§ Portada → Obras de la portada`; `EXPERIENCE.md § Portada`). El mismo texto hace dos cosas distintas: desplegar en el sitio o ir a `/obras/`. No viola WCAG 3.2.4 (son páginas distintas), pero confunde.
- Ninguna espina dice si {n} es el total de Obras del Autor (59 en Barrett) o las que quedan por desplegar (56). El memlog dice «despliega el resto», y el rótulo con el total promete más de lo que se despliega.
- Tampoco se dice que, abierto, el resto aparece **bajo** el `<summary>`, así que «Las {n} obras» queda entre la tercera Obra y la cuarta.

### M4. El salto a «Personajes»: «con su trato» no deja claro si va como las letras o como «Volver a las letras»
- `EXPERIENCE.md § Directorios → Sección «Personajes» → El salto`: «un ancla de la propia página como las letras de salto, **con su trato** y su foco». Se puede leer como el trato de las letras de salto (siena, sin subrayado, cuadrado de 44px).
- `DESIGN.md § Directorios → Sección «Personajes»`: «un enlace de texto en su propia línea, con el trato de «Volver a las letras» —`{typography.body-md}`, `{colors.primary}`, subrayado…». `EXPERIENCE.md § Accessibility Floor → Subrayado` también lo pone entre los subrayados.
- Hay que dejar en EXPERIENCE «con el trato de «Volver a las letras»».

### M5. Sin JavaScript, los botones de copiar de los desplegables solo desaparecen en EXPERIENCE
- `EXPERIENCE.md § State Patterns`, «Desplegables y copias sin JavaScript»: «“Copiar el fragmento” y “Copiar APA / MLA / Chicago” necesitan guion… **sin él no se muestran** [ASSUMPTION]».
- `DESIGN.md § Página de Cita → Desplegables` compone siempre el botón bajo cada Referencia y bajo el campo, a 2 × `{spacing.unit}`, y no dice qué pasa sin guion ni cómo se cierra el aire. El memlog tampoco lo decide: dice «Sin JavaScript el campo se lee y se selecciona» y nada de los botones. DESIGN tiene que recoger el estado o EXPERIENCE marcarlo como pendiente.

### M6. «Cómo citar» en la Página de Obra de un Personaje o de una Obra con derechos vigentes
- `EXPERIENCE.md § Foundation` *(v9.1)*: la Cita atribuida va «sin lo que se apoya en un cotejo que no pasa —el pasaje, el incipit y «Cómo citar»—».
- `EXPERIENCE.md § Página de Cita → Cómo citar`: «No existe en la Cita atribuida». Nada dice si el «Cómo citar» **de la Obra** existe en la Página de Obra de un Personaje (FR-51 la permite) o de una Obra con derechos vigentes. La fila «Obra con derechos vigentes» de `§ State Patterns` quita «Gratis», el cotejo, «Cómo empieza» y el pasaje, y calla sobre «Cómo citar». `DESIGN.md § Primitivas → Desplegable` solo nombra «la Cita atribuida sin «Cómo citar»».

---

## Bajo

- **L1.** `DESIGN.md § Primitivas → Iconografía`: la frase de la v8 «Los glifos «›» y «↓» de … «Dónde leer esta obra ↓» no son iconos» sigue en pie. Más abajo la corrige «*(v9)* … ya no lo lleva ningún enlace». Se lee como si el salto existiera; conviene reescribir el ejemplo.
- **L2.** `EXPERIENCE.md § Maquetas`, fila «Página de Obra, las variantes»: la divergencia «pone el rótulo «Edición cotejada, gratuita» sobre una Obra sin ninguna Cita cotejada, donde ese rótulo no va» se ha quedado vieja, porque ese rótulo ya no va en ninguna Obra (lo sustituye «Gratis»). La nota *(v9)* de la misma fila lo cubre a medias.
- **L3.** `DESIGN.md § Búsqueda → Resultado de búsqueda`: la lista de rótulos de tipo («Cita», «Autor», «Tema», «Colección», «Obra», «Directorio», «Portada») no incluye «Personaje», que `EXPERIENCE.md § Búsqueda` sí declara [ASSUMPTION].
- **L4.** Letras de la sección «Personajes». `DESIGN.md` dice «sus grupos de letra», y el Grupo de letra es un `h2`. `EXPERIENCE.md` las pone en `h3` bajo el `h2` «Personajes» [ASSUMPTION]. Además, habría dos navegaciones llamadas «Letras» en la misma página, y ninguna espina dice adónde lleva «Volver a las letras» dentro de la sección.
- **L5.** La Línea de retirada de la Página de Personaje. `DESIGN.md` la pone «tras el listado y su paginación» y `EXPERIENCE.md` en «Pie de la página». Ninguna dice si va también en las páginas 2+.
- **L6.** «Y {n} citas sin obra documentada.» va «tras el desplegable» solo en `EXPERIENCE.md § Página de Autor → Lista de Obras` [ASSUMPTION]. `DESIGN.md § Lista de Obras` no lo dice.
- **L7.** La Nota de la Ficha de Obra. `EXPERIENCE.md § Página de Obra` reinterpreta el «después de dónde leerla» de FR-51 como «al pie, tras los Temas» [ASSUMPTION]. El memlog no lo decide, y la frase «va después de «Dónde leer esta obra» (FR-51)» sigue en la misma celda. Es coherente con DESIGN, pero puede chocar con el texto del PRD.
- **L8.** La fila de la Tarjeta de Obra en una Obra con derechos vigentes, con ediciones y sin cotejo: «Ver la obra ›» frente a «… y dónde leerla ›». Las dos espinas lo dejan abierto (`EXPERIENCE.md § State Patterns`, «Sin decidir»), y la regla de la v8 se aplica entretanto (`DESIGN.md § Tarjeta de Obra`, `EXPERIENCE.md § Tarjeta de Obra`). Se anota para que no se pierda.
- **L9.** Arrastre fuera de la carpeta: `AGENTS.md` sigue diciendo que la Tarjeta de Obra va «Bajo la Cita, entre la Línea de la Fuente —o la Atribución, sin Fuente— y Copiar», y que la serif es «solo texto de Cita, nombre de Autor y nombre de Tema». La segunda regla ya no incluía la Colección y ahora tampoco el Personaje. El memlog dice que AGENTS lo recoge después. No es un hallazgo de las espinas, pero quien implemente leerá la regla vieja.

---

## Lente 4: referencias de token

Se comprobaron todas las referencias `{grupo.token}` de las dos espinas contra el frontmatter de `DESIGN.md` (`colors.*`, `typography.*`, `rounded.*`, `spacing.*`, `components.*`). **Existen todas**, también la nueva `{typography.code}`, que el frontmatter define (ui-monospace, 13px, 400, 1.5). La tabla «De token a propiedad CSS» le da `--codigo`, `--interlineado-codigo` y la familia `--mono`. No hay referencias de tres niveles ni tokens inventados. La pila de reserva de `ui-monospace` («y sus reservas») no está en el frontmatter y tendrá que fijarla `tokens.css`. El cuerpo de 13px es [ASSUMPTION] declarado.

## Lente 3: decisiones del memlog

Están recogidas en las dos espinas, y con el mismo sentido, las de la v9 y la v9.1 del 05/11: el orden de la Página de Cita; los desplegables nativos, cerrados y en su orden; Chicago de notas y bibliografía; la Lista de Obras con tope de 3 y «Las {n} obras»; la Ficha técnica en una línea; el orden de los desplegables de la Obra; el salto retirado; los grupos «Gratis», «Electrónica» e «Impresa»; la cuenta positiva; la medida en el ch de la Cita; los recortes por palabra; el contorno de los «Buscar en»; el verso en la tarjeta; el Personaje en la Atribución, la tipografía, las Rutas de salida, la Página de Personaje y la sección «Personajes»; la Variante; el canal de FR-69; ninguna zona nueva; «Lee el pasaje»; «Inserta esta cita». También están los supuestos (incipit, «Cómo citar», rótulos, Ficha técnica) y los puntos abiertos de la entrada `(change)`. **Falta solo la decisión del 06/11 sobre la portada (C1)**. Se recoge de forma distinta en cada espina la decisión de la fila desde 600px (H1).

## Recuento

- Crítico: 1 (C1)
- Alto: 2 (H1, H2)
- Medio: 6 (M1–M6)
- Bajo: 9 (L1–L9)

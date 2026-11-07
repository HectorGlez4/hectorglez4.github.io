# Reconciliación de la UX v9 / v9.1 contra el PRD v9.1 y el SPEC v9.1

Fecha: 2026-11-06. Revisión de solo lectura. Entradas: `prd.md` (§2.1, UJ-7, FR-9, FR-10, FR-12, FR-51, FR-54, FR-55, FR-57…FR-70, §6.8, §7 SM-C4/SM-C5, §14 preguntas 11–28) y `SPEC.md` (párrafo «Precedencia en la v9 y la v9.1», CAP-1, CAP-2, CAP-25…CAP-27). Espinas: `DESIGN.md` y `EXPERIENCE.md` tal como están en el árbol de `plan-v9` (diff sin commitear), con las decisiones del `.memlog.md` desde «Pasada v9 / v9.1».

## Veredicto

**Casi todo lo que el PRD y el SPEC dejan a UX está aterrizado**, con decisión de Héctor y con medida a 360 × 640. Quedan **dos contradicciones reales** (el orden de la Página de Cita y la portada) y **un puñado de huecos**, casi todos de la v9.1 (el Personaje fuera de la Atribución y la Tarjeta de Cita). La espina **no rompe** ninguna regla del PRD que tenga que cumplirse. Lo que sí hace es dejar varias frases del PRD y del SPEC desfasadas, y hay que llevarlas de vuelta a `bmad-prd` y `bmad-spec`. Hay además dos incoherencias entre las dos espinas, y una de ellas choca con la última decisión del memlog.

---

## 1. Contradicciones (por orden de gravedad)

### C1. El orden de la Página de Cita contradice el texto vigente del PRD y del SPEC, y gasta la palanca de SM-C5 sin decirlo
- **Espina:** `DESIGN.md § Components → Página de Cita`. Dice «De arriba abajo: Bloque de Cita con su Atribución, Línea de la Fuente, la línea de la Variante, Acciones, «Compartir en», Tarjeta de Obra, los tres Desplegables…» y que eso «deshace el orden de la v8». `EXPERIENCE.md § Component Patterns → Página de Cita` dice lo mismo.
- **PRD FR-12 (l. 385):** «El orden de la página es la Cita con su atribución y su Fuente, la Tarjeta de Obra, las acciones de copiar, Imagen y compartir…». Lo que el PRD deja a UX es solo dónde van los **tres bloques nuevos** («su lugar exacto lo fija UX»), no la posición de las acciones.
- **SPEC CAP-1:** «La página va en este orden: la Cita…, la Tarjeta de Obra, las acciones…; que en móvil Copiar quede justo bajo la primera pantalla se acepta a sabiendas y lo vigila SM-C5».
- **PRD UJ-1 (l. 58)**, «Copiar queda justo por debajo de la primera pantalla, después de la Tarjeta de Obra», y **§4.x (l. 365)**, «La Tarjeta de Obra va antes que copiar».
- **PRD SM-C5 (l. 1672):** su palanca, si salta, es «pasar la Tarjeta de Obra detrás de las acciones». La v9 la aplica por adelantado. Con eso SM-C5 se queda sin palanca declarada. Además la continuación desde la zona `tarjeta-de-obra` cambia de régimen, y eso es un corte de serie de SM-4 y SM-C5 (`CORTES_DE_SERIE_DECLARADOS`) que ninguna espina nombra.
- **Lectura:** es decisión de Héctor y mejora UJ-1, así que no rompe nada que el PRD exija. Pero el PRD y el SPEC siguen diciendo lo contrario. El memlog dice que «nada vuelve al PRD salvo lo que Héctor decida», y esto lo decidió Héctor: **tiene que volver** a FR-12, UJ-1, §4.x, SM-C5 (palanca nueva y corte de serie) y CAP-1.

### C2. La portada: la espina contradice la decisión de Héctor del 06/11
- **Memlog (última entrada, 06/11):** «la Cita del Día de la portada sigue el orden nuevo de la Página de Cita: Cita, atribución, Fuente, acciones y después su Tarjeta de Obra… Rechazado conservar en la portada el orden v8».
- **`DESIGN.md § Página de Cita → Acciones → Dónde`:** «Con el mismo trato van sobre la Cita del Día de la portada, que conserva su orden: la v9 cambia solo el de la Página de Cita [ASSUMPTION]».
- **`EXPERIENCE.md § Portada`:** «**la portada conserva el orden de la v8**, Tarjeta de Obra y después acciones, porque esta pasada no lo decide para ella. Es un punto abierto para Héctor».
- El `(change)` del memlog de la destilación todavía da como abierto que la portada conserva el orden v8. **La decisión llegó después de destilar y no se volvió a destilar.** La entrada de la portada en la tabla de IA (`EXPERIENCE.md`, «la Cita del Día con su Tarjeta de Obra y sus acciones») y el orden de tabulación tampoco se ajustan. Por lo demás, PRD §12 y FR-37 («nunca entre la Cita del Día, su Tarjeta de Obra y sus acciones, que son un bloque») siguen cumpliéndose con el orden nuevo. El cambio afecta también a la Épica 28, construida en `v8/epica-28`.

### C3. La fila de acciones desde 600 px: las dos espinas dicen cosas distintas
- **Memlog:** «las acciones de la Pagina de Cita (Copiar, Imagen, Compartir en) van en fila desde 600 px».
- **`EXPERIENCE.md § Responsive & Platform`, fila 600–1024:** «Las acciones de la Página de Cita —Copiar, Imagen y «Compartir en»— van en fila».
- **`DESIGN.md § Acciones → Cómo se colocan`:** «La fila es de los dos botones; «Compartir en» sigue en su bloque, debajo [ASSUMPTION]». `DESIGN.md § Layout` añade: «la única fila de controles es… la de las acciones».
- Hay que elegir una de las dos y alinear la otra. El memlog lo da como punto abierto, pero EXPERIENCE lo afirma como decidido.

### C4. El orden de la experiencia frente al «orden del trabajo» del PRD
- **PRD §2.1 (l. 44):** «El orden del trabajo es citar, compartir, leer más y comprar, y **la experiencia lo atiende en ese orden** (UJ-7)». §4.22 dice lo mismo.
- **Espina:** las acciones de compartir van antes que «Cómo citar», y «Lee el pasaje» va antes que «Cómo citar» («leer más primero»). El memlog rechaza expresamente «el orden del trabajo del PRD (citar, pasaje, insertar)».
- Es decisión de Héctor y la espina la justifica en el paso 4 de UJ-7. Pero la frase de §2.1 queda falsa y hay que enmendarla en el PRD.

### C5. «Dónde leer esta obra» plegado frente a «y se ve» (tensión)
- **PRD FR-54 (l. 1048):** «Va en la primera página, antes del listado… **y se ve**: es lo que viene a buscar quien llega a la Obra desde una Cita». FR-54/FR-35 (l. 1050): «el visitante **ve** la edición que se verificó y, al lado, la que se puede comprar».
- **Espina:** un `<details>` cerrado por omisión (`DESIGN.md § Página de Obra → Dónde leer esta obra`). Lo que se ve es el `<summary>`, no la edición.
- Se puede defender, porque el rótulo está a la vista bajo la cabecera y SM-C4 manda. Pero el PRD pide que se vea la edición, no solo el rótulo. Que «se ve» equivale a «el rótulo se ve» debería decirlo el PRD.

---

## 2. Huecos (lo que el PRD o el SPEC piden y la espina no recoge)

### H1. El Personaje en todo lo que nombra al Autor (FR-66), solo a medias
FR-66 lo exige en la atribución y en todo lo que la compone: FR-3 (lo copiado), FR-10 (la Imagen), FR-18 (texto propuesto), FR-19 (Tarjeta Social), FR-57 y los datos estructurados. Además, «con Autor, se nombran los dos».
- **Aterrizado:** la Atribución, la Tarjeta de Cita, el Resultado de búsqueda, «Más de {Personaje}», «Siguiente… sobre», el Fragmento (solo la microcopia «su personaje») y la Imagen de Cita (`DESIGN.md`, «el Autor —o el Personaje que ocupa su lugar—»).
- **Falta:**
  - **Lo copiado:** cómo se compone el texto copiado con Personaje, y con Personaje y Autor.
  - **Texto propuesto:** `EXPERIENCE.md` l. 203 sigue en «la Cita y su Autor».
  - **Tarjeta Social de Cita:** `DESIGN.md § Tarjeta Social`, sin nota v9.1.
  - **Tarjeta Social de la Página de Personaje:** no existe variante (hay de Autor, de Obra y de Directorios).
  - **La Imagen y la Tarjeta con Personaje y Autor:** «se nombran los dos», pero ¿cómo?
  - **El año en la línea de Obra** «{título}, de {Autor}»: dónde va el año de la Procedencia.
  - **El JSON-LD** («personaje de ficción») es de AD, pero `EXPERIENCE` no lo remite.

### H2. «Buscar en {Personaje}» se diseña sin un filtro que lo reciba
`DESIGN.md § Página de Personaje → Catálogo` y `EXPERIENCE.md § Página de Personaje` ponen el campo. El propio `EXPERIENCE` deja «sin decidir… cómo filtra `/buscar/` por un Personaje», porque los selectores son de Autor, Obra y Tema. El resultado es un control cuyo destino no está definido. Faltan una de dos cosas: un selector o filtro de Personaje en `/buscar/` (FR-66 dice «En la búsqueda es familia propia»), o retirar el campo hasta decidirlo.

### H3. «Lee el pasaje»: la Cita se distingue solo a la vista
FR-59 dice: «La Cita se distingue dentro del pasaje». La espina la marca solo con la familia y la tinta, y rechaza `<mark>`. Para un lector de pantalla nada la distingue (WCAG 1.3.1 y 1.4.1, NFR-9). Falta un marcado semántico que no cambie el aspecto, por ejemplo `<q>`, `<em>` sin estilo o un texto oculto que la delimite. Ninguna espina lo nombra.

### H4. El verso en todo material de salida (FR-63), sin cerrar
- **Las espinas enumeran:** la página, la Tarjeta, el pasaje, el incipit, el Fragmento y las dos imágenes.
- **Faltan** de la lista de FR-63:
  - **la Referencia**: «en la forma que el estilo da al verso», con barra en APA o MLA o no. Es decisión de UX y no está tomada;
  - **lo copiado** (salto de línea en texto plano);
  - **la Tarjeta Social** y **la Pieza**;
  - **el Resultado de `/buscar/`**.
- **FR-58:** «el texto de la Cita, cuando el estilo lo incluye». Ninguna espina dice si alguna Referencia de una Cita lleva su texto.

### H5. La Referencia sin inversión del nombre
FR-58 dice que, con la clave sin revisar, el nombre va «tal como lo escribe su ficha». El ejemplo de Chicago de `EXPERIENCE.md` («Apellido, Nombre. *Título*. Año.») no lo matiza. Basta una línea. Tampoco está dicho que la cursiva del título se pierde en lo copiado, que es texto plano, cuando FR-58 pide que se copie «la misma Referencia que se lee».

### H6. El incipit fuera de la búsqueda interna (FR-61)
El pasaje sí dice «no entra en Pagefind». «Cómo empieza» y la línea de la Ficha técnica no lo dicen, y FR-61 lo exige para el incipit.

### H7. «Cómo citar» en la Página de Obra de una Obra con derechos vigentes, o que cuelga de un Personaje
FR-65 lo quita de la **Cita** atribuida, «también con Obra». FR-58 lo da a la página 1 de **toda** Obra. El estado «Obra con derechos vigentes» de `EXPERIENCE.md § State Patterns` quita «Cómo empieza» y el pasaje, pero no dice nada de «Cómo citar» en la Obra. Hay que decidirlo, o devolver la pregunta al PRD.

### H8. El dominio en una banda reservada (FR-10, enmienda v9)
`DESIGN.md § Imagen de Cita` y `EXPERIENCE.md` (l. 145) conservan el texto de la v8: «al pie, la marca y, debajo, el dominio»; «la que no quepa no se encoge».

Falta lo nuevo de la v9:
- una banda de pie **reservada en la geometría**, que no se superpone nunca a la Cita ni a la atribución;
- que se aplica también a la **Pieza, el Kit y el lote**, y a la Tarjeta Social si lleva el dominio;
- que la prueba de tramos falla nombrando la Cita y el formato.

El PRD dice que el sitio en vivo lleva el pie diminuto y sin dominio. La espina no dice que lo construido cambia.

### H9. La línea de cifras de la portada (FR-9, enmienda v9.1)
Debe contar las dos clases de Cita, solo los Autores (nunca los Personajes), y las cotejadas solo de la clase de siempre. Ninguna espina lo recoge. Es invisible mientras no haya atribuidas, pero la redacción («de {n} autores») tiene que excluir a los Personajes.

### H10. La tríada de la semblanza del Personaje (FR-66)
FR-66: «quién es, en qué Obra o universo aparece y por qué se le cita». La Ficha de Personaje cubre «personaje de {Obra}» y la semblanza, pero no comprueba la tríada como sí lo hace la Ficha de Autor.

### H11. Menores
- **FR-57, la microcopia del Fragmento:** «lleva la cita, su autor y el enlace» no menciona la Obra, que el fragmento sí lleva. No es falso, pero está incompleto. Que el enlace sea la canónica sin `?de=` ni `?via=`, y que el fragmento no cargue ningún recurso, se remite a la arquitectura sin nombrarlo. Conviene una línea que diga que el campo enseña ese HTML y nada más.
- **La línea de la Variante** va entre la Fuente y Copiar. La espina la cuenta como parte de la Atribución, pero no está medida a 360 × 640. Una Variante larga baja Copiar.
- **La línea de retirada** (FR-69: «canal visible») va al pie, tras los Temas, en una página de unos 2.780 px. Cumple la letra; si basta como «visible» lo juzga Héctor.

---

## 3. Lo aterrizado, punto por punto

| Punto (PRD/SPEC) | Estado | Dónde |
|---|---|---|
| Lugar de «Lee el pasaje», «Cómo citar» e «Inserta esta cita» frente a Copiar (FR-12, CAP-1) | Aterrizado: tras la Tarjeta, plegados. Ver C1 | DESIGN § Página de Cita; EXPERIENCE § Página de Cita |
| La variante de Chicago (FR-58) | Aterrizado: notas y bibliografía, entrada de bibliografía | EXPERIENCE § Cómo citar |
| FR-58: sin fecha sin JS, «lo dice», nunca la del build | Aterrizado: «Sin fecha de consulta: añade la de hoy.» | EXPERIENCE § Voice and Tone, § State Patterns |
| FR-58: texto plano, la misma Referencia | Aterrizado (salvo la cursiva, H5) | EXPERIENCE § Cómo citar |
| FR-57: estático, sin JS se lee y se selecciona, Cita entera aunque pase de todo límite | Aterrizado | EXPERIENCE § Inserta esta cita, § State Patterns |
| FR-57: no carga nada, enlace canónico sin marca | Sin contradicción; no se restituye (H11) | — |
| FR-59: el pasaje no se copia ni se comparte como la Cita, ni entra en Pagefind; ausencia antes que mutilación | Aterrizado (H3 para la distinción accesible) | EXPERIENCE § Lee el pasaje |
| FR-59: la Fuente, la licencia y el enlace | Aterrizado | DESIGN y EXPERIENCE |
| FR-60: la Ficha técnica en una línea, sin rótulos vacíos, sin hueco, traductor de la edición | Aterrizado | DESIGN § Línea de Ficha técnica; EXPERIENCE |
| FR-61: el incipit con verso, Inter, Fuente, sin hueco, nunca con derechos vigentes | Aterrizado (H6 Pagefind) | EXPERIENCE «Cómo empieza» |
| FR-51 y FR-54: «Dónde leer» antes del listado; sin salto; la Nota al pie | Aterrizado (C5) | DESIGN y EXPERIENCE § Página de Obra |
| FR-51: lo de arriba no echa el listado (SM-C4), medido | Aterrizado (Larra, 514 px; todo plegado) | EXPERIENCE § Página de Obra y auditoría |
| FR-54: rótulo de «Consíguelo» | Aterrizado: «Gratis», «Electrónica», «Impresa»; «Consíguelo» en ninguna superficie | DESIGN y EXPERIENCE |
| FR-54: la frase sobre lo no cotejado | Aterrizado: en cuenta positiva, sin afirmar más de lo cotejado. Con varias Fuentes, abierto | EXPERIENCE § Voice and Tone, § State Patterns |
| FR-70: sin «Gratis» ni frase de cotejo; ediciones solas; sin texto | Aterrizado. La fila de la Tarjeta de Obra queda abierta, declarado | EXPERIENCE § State Patterns |
| FR-64: el tope de Obras, «el mismo para todo Autor», con nombre, comprobado en el Autor con más Obras | Aterrizado: 3, `MAX_OBRAS_ANTES_DE_LAS_CITAS`, Barrett | DESIGN § Lista de Obras; EXPERIENCE |
| FR-64: «Buscar en este tema» con contorno, bajo el título y encima del listado | Aterrizado: contorno completo, «no se mueve» | DESIGN § Campo de búsqueda; EXPERIENCE § Buscar en… |
| FR-64: la medida de línea en escritorio | Aterrizado: 34ch en el ch de la Cita, unos 610 px | DESIGN § Layout; EXPERIENCE § Tipografía adaptativa |
| FR-64: las acciones en fila desde un ancho | Aterrizado: 600 px (C3) | DESIGN; EXPERIENCE § Responsive |
| FR-64: ningún listado corta palabras; qué se recorta | Aterrizado: tres recortes por palabra, un solo dueño | EXPERIENCE § Voice and Tone |
| FR-63: el verso en la página y en la Tarjeta | Aterrizado (H4 para el resto) | DESIGN § Typography; EXPERIENCE |
| FR-65: la atribuida sin pasaje, incipit ni «Cómo citar»; sin sello; Procedencia con las palabras de siempre; Pieza y Cita del Día, no | Aterrizado | EXPERIENCE § State Patterns «Cita atribuida» |
| FR-66: la Página de Personaje (calca la de Autor, `noindex` por debajo del mínimo, sin Modelo, en las dos páginas mientras la pregunta 28) | Aterrizado. Título y meta, abiertos | DESIGN y EXPERIENCE § Página de Personaje |
| FR-55 y FR-66: la sección «Personajes» de `/autores/` | Aterrizado. Filtro y `/obras/`, abiertos | DESIGN y EXPERIENCE § Directorios |
| FR-67: la Variante se busca y no se compone | Aterrizado | DESIGN § Línea de la Variante; EXPERIENCE § Resultado |
| FR-69: el canal en la Cita atribuida **y** en la Página de Personaje, sin cuenta ni guion | Aterrizado | DESIGN § Línea de retirada; EXPERIENCE |
| FR-56: zonas del Personaje | Aterrizado: ninguna zona nueva (UX-DR111, Héctor) | EXPERIENCE § Zonas |
| §6.8: auditoría a 360 × 640 antes de cerrar | Hecha: Cita ×3, Autor, Obra, Tema, portada, `/obras/`, `/buscar/` | EXPERIENCE § Responsive |
| UJ-7 | Narrado con el texto del PRD y el orden nuevo | EXPERIENCE § Key Flows |
| UJ-8 (pregunta 24) | Bien dejado sin narrar, como excepción declarada del cierre | EXPERIENCE § IA y § Key Flows |
| Preguntas 19, 22, 26, 27 y 28 | Bien remitidas al PRD, con el comportamiento interino | EXPERIENCE |
| Preguntas 11–18, 20, 21, 23 y 25 | No son de UX; ninguna se invade | — |

---

## 4. Ideas cualitativas: ninguna se pierde en silencio

- El «orden del trabajo» (citar, compartir, leer más, comprar) se rechaza **a la vista**, con su motivo, no en silencio. Ver C4.
- Desaparece «La Tarjeta de Obra no le cuesta ese clímax: es un desplazamiento, no una decisión» (UJ-1). La espina lo sustituye por «la v9 salda la deuda». Coherente, pero el PRD sigue diciendo lo de antes (C1).
- La v9 no recoge en ninguna parte la idea de FR-59 de que el pasaje «lleva hacia la Obra» (§6.8, punto 4). El enlace del pasaje va a la edición de la Fuente, no a la Página de Obra. Es consistente con «ningún desplegable tiene enlaces internos», pero conviene decir que se renuncia a ello a sabiendas.
- §6.8 aplaza a propósito «Autores afines» y «Empieza por aquí»; las espinas no los tocan. Correcto.

## 5. Coherencia con las convenciones del repositorio

- La serif se extiende al **Personaje** (`DESIGN.md § Typography`). `AGENTS.md` sigue diciendo «texto de Cita, nombre de Autor y nombre de Tema». El memlog lo anota para `bmad-project-context`.
- Token nuevo `typography.code` y `--interlineado-codigo`. `tests/unit/tipografia-en-tokens.test.ts` tendrá que admitir la monoespaciada como familia de token, no como literal.
- Ninguna zona nueva, así que no se mueve la huella del vocabulario. La tabla `COLOCACION` de `medicion.test.ts` sumará filas para las zonas que el Personaje reutiliza.

## 6. Qué hacer

1. Volver a destilar la decisión del 06/11 sobre la portada en `DESIGN.md` y `EXPERIENCE.md` (C2). Es lo único que la propia pasada de UX dejó a medias.
2. Alinear la fila de 600 px entre las dos espinas (C3).
3. `bmad-prd`, y después `bmad-spec`: FR-12, UJ-1, la l. 365 de §4.x, SM-C5 (palanca y corte de serie), §2.1 y §4.22 (orden del trabajo), FR-54 («se ve») y CAP-1 (C1, C4, C5).
4. `bmad-ux`, en una pasada corta: H1–H8. Los más baratos son H3, H5, H6 y H11; los que piden decisión, H1, H2, H4 y H7.

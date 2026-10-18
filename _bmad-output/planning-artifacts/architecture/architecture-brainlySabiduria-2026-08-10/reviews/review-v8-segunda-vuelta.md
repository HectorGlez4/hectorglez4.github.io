---
title: "Segunda vuelta adversaria — la espina v8 tras las correcciones de la puerta"
status: final
created: 2026-10-18
lens: adversarial, segunda pasada (Finalize)
against:
  - 'ARCHITECTURE-SPINE.md en el árbol de trabajo (git diff contra HEAD, +282/−102 con la bitácora; modificado el 2026-10-18 a las 21:57)'
  - '.memlog.md, últimas entradas: NFR-5 ajustado, migraciones de D1, pruebas locales y autofixes de la puerta (Héctor, 18/10)'
read_first:
  - 'reviews/review-v8-adversario.md, review-v8-rubrica.md, review-v8-vigencia.md'
  - 'reviews/reconcile-v8-prd.md, reconcile-v8-ux.md'
checked_against:
  - 'src/lib/tipoDeResultado.ts, src/lib/superficies.ts, src/lib/publicado.ts, src/lib/obras.ts'
  - 'src/pages/buscar.astro, src/islands/ImagenDeCita.astro, src/components/Paginacion.astro'
  - 'tools/tema.ts, tools/lib/gestion.ts, tools/lib/corpus.ts, tools/lib/extraccion.ts'
  - 'medicion/esquema.sql y su historia en git, DESPLIEGUE.md §3'
  - 'node_modules/astro/dist/runtime/server/render/util.js y escape.js (Astro 7.2.0 instalada)'
  - 'corpus/citas/ (recuento de Temas por Cita, longitudes), gh run list del flujo Publicar'
  - 'PRD v8.1 §6.7, §7 (SM-11), FR-56; addendum v8 (vista-de-obra, busqueda)'
---

# Segunda vuelta adversaria — la espina v8 tras las correcciones

**Solo lectura** salvo este informe. Las líneas citadas son las de `ARCHITECTURE-SPINE.md` en el árbol de trabajo a las 21:57 del 2026-10-18.

## Veredicto

**Los doce altos de la primera puerta están cerrados en el texto**, y ninguno de los cierres contradice una decisión de Héctor. Pero tres cierres traen un defecto propio:

- la prueba de filtros de A2 (adversario) contradice a las Citas con varios Temas;
- el censo de medición de M4 (adversario) elige una reconstrucción que git no puede hacer;
- la independencia de la jornada de A5 (adversario) no dice cómo se reconoce lo que rota.

Además salen parejas nuevas que nadie había construido: el tipo de resultado de la portada, los cortes de los tramos con dos dueños, el tope de las entradas bajo demanda, la orden `tema quitar` fuera de la puerta de NFR-5 y la unidad de fusión que pide SM-11.

**Recuento de lo nuevo: 3 altos · 9 medios · 7 bajos.** Ninguno pide reabrir una decisión de Héctor. Uno (el 9) le enseña una contradicción entre dos frases suyas del mismo día.

---

## 1. Los altos de la primera puerta

| Informe · hallazgo | Dónde se cierra | Estado |
|---|---|---|
| adversario A1 — dos dueños del orden entre documentos | AD-23 l. 323–324 (todas las apariciones, solo `obras.ts` ordena y elige; prueba de que nadie más ordena) | Cerrado |
| adversario A2 — Pagefind recoge filtros dentro de `ignore` | AD-11 l. 164; AD-17 l. 251; AD-19 l. 274–275 | Cerrado. **La prueba que añade falla con varios Temas** (nuevo 1) |
| adversario A3 — `data-pagefind-sort` | AD-25 l. 360–363; convención l. 413 | Cerrado |
| adversario A4 — relación por fichero | AD-27 l. 387 | Cerrado (con el bajo 17) |
| adversario A5 — veredictos que dependen de la jornada | AD-6 l. 114; AD-11 l. 167; AD-12 l. 178–181 | Cerrado en la regla. **Sin marca de lo que rota** (nuevo 12) |
| rúbrica A1 — Astro mete en línea lo pequeño | AD-6 l. 113; convención l. 410 | Cerrado |
| rúbrica A2 — orden migración → receptor → sitio | AD-14 l. 213–214; Entorno operativo l. 513, 517–518 | Cerrado *(Héctor)*. **Choca con l. 513** (nuevo 9) |
| rúbrica A3 — reglas de navegador fuera del CI | «Lo que el CI no prueba», l. 521; mapa l. 554, 557 | Cerrado. Faltan las pruebas de Pagefind (nuevo 16) y la unidad de fusión (nuevo 3) |
| vigencia 1 — techo de 1 GB de GitHub Pages | Stack l. 437; Entorno operativo l. 523; AD-9 l. 145; Deferred l. 589 | Cerrado |
| reconcile-prd 1 — guion solo donde hay vista | AD-6 l. 110; AD-13 l. 192; AD-17 l. 254 | Cerrado |
| reconcile-ux 1.1 — mismo caso desde la UX | AD-6 l. 110 | Cerrado |
| reconcile-ux 1.2 — dos caminos para emitir | AD-13 l. 190 | Cerrado. **La cola no tiene mecanismo** (nuevo 13) |
| reconcile-ux 1.3 — anclas que gastan la salida | AD-13 l. 194–195; convención l. 409 | Cerrado |

Los medios-altos también aterrizaron. Vigencia 2 en l. 113. reconcile-prd 2 en l. 168–169, aunque falta una orden (nuevo 6). reconcile-ux 1.4 en l. 411, pero el medio que nombra no existe (nuevo 10).

---

## 2. Lo nuevo

### Altos

#### 1. La prueba de filtros exige «un solo valor por clave», y 294 Citas tienen más de un Tema

- **Línea:** AD-11, l. 164: «exige que todo registro con filtro `autor` sea una Página de Cita, **con un solo valor por clave** y que sea el suyo, y que los recuentos de `filters()` coincidan con los de este módulo».
- **Pareja:**
  - **27.a, «filtros».** Escribe un `data-pagefind-filter="tema:…"` por cada Tema publicado de la Cita, que es lo que FR-7 necesita para que «filtrar por Tema» devuelva todas sus Citas.
  - **27.b, «la prueba».** Escribe la prueba de l. 164 al pie de la letra.
- **Qué se rompe.** El 2026-10-18, 294 de las 4.420 Citas declaran dos Temas o más. Las dos mitades de la prueba no pueden pasar a la vez:
  - con varios valores, falla «un solo valor por clave»;
  - con un valor, el Tema primero, falla «los recuentos de `filters()` coinciden», porque el del Tema queda por debajo del de su Página de Tema.

  Quien la ponga en verde tiene que torcer una de las dos. Si tuerce la segunda, publica un filtro de Tema que pierde Citas.
- **Arreglo exacto.** En l. 164, sustituir «con un solo valor por clave y que sea el suyo» por: «con exactamente un valor en `autor` y como mucho uno en `obra`, los suyos, y en `tema` exactamente sus Temas publicados».

#### 2. La indexabilidad que parte la familia Obra se «reconstruye con git», y git no sabe qué commit estaba en vivo

- **Línea:** AD-13, l. 202: «La indexabilidad que parte la familia Obra es la del commit desplegado esa jornada, reconstruida con git como hace el aviso con `--desde` […]; la marca de `vista-de-obra` no parte la serie».
- **Pareja:**
  - **23.c, «continuación de Obra».** Reconstruye la indexabilidad con el historial de `main` por fecha, que es lo único que git tiene.
  - **23.b, «vista-de-obra».** Emite la marca que exige AD-13 (l. 191) y que AD-17 coteja con el `noindex` de la página (l. 255). Nadie la lee.
- **Qué se rompe:**
  - **El commit desplegado no está en git.** Todas las ejecuciones de Publicar fallan desde el 2026-10-11 (`gh run list`; PRD l. 1260). En vivo hay 81 Obras indexables y en `main`, 277. Una reconstrucción con git atribuye 277 a jornadas que sirvieron 81, justo en la ventana de SM-11.
  - **El aviso no sirve de modelo.** Su `--desde` es `github.event.before` (`publicar.yml:194`), un dato del empujón y no del despliegue.
  - **Dos despliegues en un día no se pueden separar.** El empujón y la reconstrucción programada pueden servir dos estados distintos la misma jornada, y la serie no guarda hora.
  - **Contradice al PRD.** El addendum (l. 338) da la marca precisamente para eso: «la familia se lee entera y se puede partir».
- **Arreglo exacto.** En l. 202, sustituir desde «La indexabilidad que parte…» hasta «…no parte la serie» por:

  > La indexabilidad que parte la familia Obra la da la marca de `vista-de-obra`, que dice lo que la página servida declaraba. Las lecturas y las salidas de una ruta de Obra en una jornada toman la marca de las vistas de Obra de esa ruta y esa jornada. Si en una jornada llegan las dos marcas —un despliegue cambió su indexabilidad—, esa ruta y esa jornada se cuentan aparte, como «cambió», y nunca se reparten. Ninguna lectura la reconstruye desde git, que no sabe qué commit estaba en vivo.

  La marca sigue nula fuera de su evento, como pide el addendum (l. 242).

#### 3. La unidad de fusión no está fijada, y SM-11 exige desplegar juntas las Épicas 24 y 26

- **Líneas:**
  - Entorno operativo, l. 513: «Como cada push a la rama principal despliega, el orden de fusión es el de despliegue».
  - «Lo que el CI no prueba», l. 521: «Se corren a mano **antes de fusionar cada épica**».
  - PRD §7, SM-11 (l. 1330): «la Página de Cita nueva y el Directorio de Autores con la cabecera nueva se despliegan juntos (Épicas 24 y 26)». La 28 va después del juicio o con su fecha declarada.
- **Pareja:**
  - **24.a, «Tarjeta de Obra».** Se fusiona en la principal y se despliega con el empujón, como toda historia hasta hoy en los bucles.
  - **26.a, «Directorios y cabecera».** Se fusiona días después.

  Las dos cumplen todos los AD.
- **Qué se rompe:**
  - **SM-11 se sesga.** Durante esos días la Obra gana enlaces internos y el Autor no, que es justo el sesgo que el PRD manda evitar. Y la fecha del «despliegue conjunto» que AD-9 manda a `umbrales.ts` (l. 145) no existe.
  - **Playwright llega tarde.** «Antes de fusionar cada épica» presupone una fusión por épica que el modelo operativo no tiene: las historias se fusionan una a una, y las pruebas locales corren cuando la historia ya está en vivo.
- **Arreglo exacto.** Añadir al Entorno operativo, tras l. 513:

  > **La unidad de fusión de la v8 es la épica, no la historia.** Cada épica se integra en su rama —la 24 y la 26 en una sola, porque SM-11 las quiere juntas en vivo—. Sus historias se fusionan ahí y las pruebas locales de Playwright corren sobre esa rama. La rama entra en la principal en un solo merge, cuya fecha es la que `umbrales.ts` declara para la línea SM-11. La 28 entra después del juicio de SM-11 o con su fecha declarada. El Corpus y la reparación de la publicación siguen fusionándose a diario.

### Medios

#### 4. La portada «declara su tipo», pero los tipos de resultado deben ser un subconjunto de las familias, y la portada no es familia

- **Líneas:**
  - AD-17, l. 250: «Cada serie, el aviso y **los tipos de resultado** declaran su subconjunto [de las seis familias] … y la prueba fija subconjuntos».
  - AD-17, l. 251: «**La portada declara también su tipo** y responde solo por su título».
- **Pareja:** 26.x muda las familias y escribe la prueba de subconjuntos. 28.x da tipo a la portada.
- **Qué se rompe.**
  - **El código de hoy.** La portada es `producto` (`superficies.ts:84–89`) y entra en Pagefind sin tipo, así que cae en `TIPO_POR_OMISION = 'cita'` (`tipoDeResultado.ts`).
  - **Lo que pasa al darle tipo.** Un tipo `portada` no está entre las seis familias, y la prueba de l. 250 se pone en rojo. Uno de las seis la rotula mal, que es el defecto que A2 (adversario) vino a quitar.
- **Arreglo exacto.**
  - En l. 250, sustituir «Cada serie, el aviso y los tipos de resultado declaran su subconjunto» por «Cada serie y el aviso declaran su subconjunto».
  - En l. 251, añadir: «Los tipos de resultado son las familias con resultado más `portada`, rotulada con el nombre del sitio, y la prueba fija `tipos ⊆ familias ∪ {portada}`; `tipoDeOpenGraph` la sigue dando como `website`».

#### 5. Los cortes de los tramos de `busqueda` tienen dos dueños

- **Líneas:**
  - AD-9, l. 145: «entran ahí [en `umbrales.ts`] … los cortes de los tramos de `busqueda`».
  - AD-13, l. 190–191: el vocabulario vive en un módulo «**sin importaciones**» y declara cada campo cerrado, «el tramo de `busqueda` (0, 1–9, 10–29, 30+)».
- **Pareja:**
  - **23.a.** Declara los rótulos del tramo en el vocabulario, que coteja el receptor.
  - **27.x.** Calcula el tramo de un recuento con los cortes de `umbrales.ts`.
- **Qué se rompe.** El rótulo «10–29» lleva los números dentro.
  - Si se mueve el corte en `umbrales.ts`, que es donde AD-9 manda moverlo, el rótulo miente. La huella de AD-14 no cambia y el receptor no se redespliega, así que la serie cambia de instrumento sin corte fechado.
  - Si el vocabulario lleva los cortes, el literal vive en dos sitios, contra AD-9.
  - El vocabulario no puede importar `umbrales.ts`, por l. 190.
- **Arreglo exacto.**
  - En l. 145, quitar «los cortes de los tramos de `busqueda` y».
  - En l. 191, añadir tras «(0, 1–9, 10–29, 30+)»: «, cuyos cortes son vocabulario y no umbral: los declara el módulo del vocabulario junto a sus rótulos, y cambiarlos cambia la huella de AD-14 y abre un corte de serie con fecha en `umbrales.ts`».

#### 6. La puerta de NFR-5 en las órdenes deja fuera `tema quitar`, que es la que más directamente deja una Cita sin camino

- **Línea:** AD-11, l. 168: «las órdenes que retiran —`documentar --retirar`, `autor retirar` y `coleccion quitar`— se niegan con código 1 si dejarían una Cita a más de esos saltos».
- **El hecho.**
  - **El único camino de tres saltos.** La paginación enlaza todos los números (`Paginacion.astro`), pero el Directorio y la cabecera dejan las páginas 2+ de Autor y de Obra a cuatro saltos. Para una Cita fuera de la página 1 de su Autor y de su Obra, el único camino de tres es su Tema publicado, o una Colección.
  - **La orden que lo corta.** `npx tsx tools/tema.ts quitar <tema> <citas…>` (`tools/lib/gestion.ts:448`) quita un Tema sin mirar el umbral ni los saltos. `tema eliminar`, en cambio, se niega mientras alguna Cita lo use (l. 267–286).
- **Pareja:**
  - **26.c.** Pone la puerta en las tres órdenes nombradas.
  - **Una sesión de curación.** Corre `tema quitar` sobre un Tema de 15.

  El Tema se despublica y el build de esa noche rompe sobre Citas que nadie retiró. La puerta de AD-18 que l. 168 quería mantener no lo impide.
- **Además, las órdenes no tienen grafo.** `superficiesInalcanzables` (`publicado.ts:609`) recibe un grafo ya leído, y una orden de `tools/` no tiene `dist/`. Cada historia compondrá su grafo del modelo a su manera.
- **Arreglo exacto.** En l. 168:
  - añadir `tema quitar` a la lista;
  - añadir: «Las órdenes calculan los saltos con `superficiesInalcanzables` sobre el grafo del modelo que compone una sola función de `publicado.ts`, desde las mismas enumeraciones que pintan las páginas: portada → Temas, Colecciones y Directorios; listados con todos sus números de página; cabecera. El build comprueba en `astro:build:done` que el grafo del `dist/` real contiene ese grafo».

#### 7. El tope de una entrada bajo demanda se mide «al cargar», y ahí siempre vale cero

- **Línea:** AD-6, l. 112: «El tope de cada entrada cuenta todo lo que importa de forma estática … **medido por página como bytes que se descargan al cargar**». La misma viñeta pide `imagen.js` «al pulsar» y Pagefind «al enfocar».
- **Pareja:**
  - **25.a.** Engorda `imagen.js` con el 9:16 y su diálogo.
  - **La prueba de la lista cerrada.** Mide lo que cada página descarga al cargar.

  `imagen.js` mide 0 en toda página pública, y su tope con nombre no ata nunca.
- **Y «al enfocar» ya no es verdad.**
  - **Hoy.** `buscar.astro:281–284` importa Pagefind al cargar cuando llega `?q=`.
  - **En la v8.** Toda llegada con estado —«Buscar en {Autor}», `?autor=&obra=`— lo carga al llegar.

  Una prueba escrita desde l. 112 no ve ese peso.
- **Arreglo exacto.** En l. 112:
  - sustituir «medido por página como bytes que se descargan al cargar» por: «en una entrada que se carga con la página, medido como los bytes que descarga al cargar en cada página que la lleva; en una que se pide con `import()`, como su fichero con todo lo que importa de forma estática, se pida cuando se pida»;
  - sustituir «y el guion de Pagefind, al enfocar» por «y el guion de Pagefind, al enfocar el campo, al elegir un filtro o al llegar con estado en la dirección».

#### 8. La rotación de las seis Obras toma «la n-ésima Obra de su lista de obras», y la lista incluye las que no se indexan

- **Línea:** AD-12, l. 177: «de cada Autor sale, en su n-ésima aparición, la n-ésima Obra de su lista de obras, que vuelve a empezar al acabarse».
- **El hecho.** La lista de obras es la de la Página de Autor (`obrasDelAutor`, `publicado.ts:479`). Enumera **todas** las Obras con Citas publicadas, indexables o no, y AD-25 lo confirma en l. 364.
- **Pareja:**
  - **28.a.** Indexa la lista entera y salta la Obra que no se indexa, pasando a la siguiente.
  - **28.b.** Filtra antes y cicla sobre las indexables.

  Las dos pasan la comprobación de l. 255, que solo exige que el conjunto sea indexable, y dan portadas distintas el mismo día. Con la congelación de SM-11 vuelve a pasar sobre el conjunto congelado.
- **Además.** Nadie dice desde qué jornada se cuenta «su n-ésima aparición».
- **Arreglo exacto.** En l. 177, sustituir «la n-ésima Obra de su lista de obras, que vuelve a empezar al acabarse» por:

  > la n-ésima de sus Obras **del conjunto del que rota** —las indexables y, si rige la congelación, las congeladas—, en el orden de su lista de obras y módulo su número. n cuenta las apariciones del Autor desde el mismo origen de jornadas que `citaDelDia.ts`.

#### 9. «`main` queda en rojo a sabiendas» contradice «nada se fusiona con el CI en rojo» *(para Héctor)*

- **Líneas:**
  - AD-14, l. 213: «Entre el commit del vocabulario y el de la huella, **`main` queda en rojo** y la reconstrucción diaria no despliega, a sabiendas».
  - Entorno operativo, l. 513: «**nada se fusiona con el CI en rojo**».

  Las dos son de Héctor, del 2026-10-18.
- **Pareja:**
  - **23.d (vocabulario).** Empuja el cambio a `main`, como dice l. 213.
  - **El bucle.** Por l. 513, se niega a fusionar nada mientras el CI esté en rojo.

  Tal como está, o se incumple l. 513 o el cambio de vocabulario no puede entrar. Mientras dure el rojo, las siembras del día tampoco se despliegan, que es el estado del que el PRD quiere salir antes que nada (l. 1260).
- **Arreglo exacto, a elegir por Héctor:**
  - **(a)** En l. 513, añadir: «salvo el commit de vocabulario de AD-14, que deja `main` en rojo hasta el de su huella; en ese intervalo no se fusiona nada más».
  - **(b)** En l. 213, sustituir «`main` queda en rojo… a sabiendas» por: «el cambio vive en su rama, la orden se corre desde ella, y la rama entra en la principal con su huella, así que `main` nunca está en rojo».

  (b) mantiene vivos los despliegues diarios del Corpus.

#### 10. El anunciador «compuesto en el build» no tiene medio: `define:vars` convierte una función en `undefined`

- **Línea:** convención de Mensajes de estado, l. 411: «los en línea lo reciben compuesto en el build desde ese módulo, nunca copiado a mano».
- **El hecho, en Astro 7.2.0.** `define:vars` serializa cada valor con `JSON.stringify` (`runtime/server/render/util.js:20–27`, `escape.js:4`). Una función llega como `const DECIR = undefined;`. Es el medio que usan todas las islas en línea de hoy, y el que proponía `reconcile-v8-ux` §1.4.
- **Pareja:**
  - **25.a.** Pasa el anunciador a la isla de la Historia por `define:vars`.
  - **27.a.** Lo importa en la búsqueda empaquetada.

  La Historia lanza un `TypeError` en el primer anuncio. Vitest no lo ve, y Playwright solo corre en local.
- **Arreglo exacto.** En l. 411, sustituir «los en línea lo reciben compuesto en el build desde ese módulo» por:

  > los en línea reciben su texto de guion, derivado en el build con `String(…)` de la misma función e insertado con `set:html`, nunca por `define:vars`, que serializa con JSON. Una prueba sobre `dist/` exige que toda isla en línea que anuncia lleve ese texto.

#### 11. El orden de la lista de obras no tiene dueño nombrado, y lo leen cinco sitios

- **Líneas:**
  - AD-25, l. 360: la clave de `data-pagefind-sort` la compone `obras.ts` con «el [orden] de su lista de obras».
  - AD-25, l. 364: la lista y la Fila de `/obras/` son «el mismo componente con el mismo orden».
  - AD-12, l. 177: la rotación lee «su lista de obras».
- **El hecho.** El orden vive en `obrasDelAutor` (`publicado.ts:479–489`): recuento descendente, después título y después nombre de ficha. `publicado.ts` importa de `obras.ts` (l. 27–35), así que `obras.ts`, que según la espina compone la clave, no puede importarlo sin ciclo.
- **Pareja:**
  - **24.d.** Compone la clave en `obras.ts` con su propia copia del orden, con otro desempate.
  - **26.x.** Pinta `/obras/` con el de `publicado.ts`.

  «Buscar en {Autor}» devuelve entonces las Obras en un orden distinto del de su Página de Autor y del selector de Obra (EXPERIENCE l. 257: «en el orden de su Lista de Obras»).
- **Arreglo exacto.** En l. 364, añadir:

  > El orden de la lista de obras de un Autor lo tiene `obras.ts` —recuento descendente, título y nombre de ficha—, que `publicado.ts` reexporta. Lo consumen la Página de Autor, `/obras/`, el selector de Obra de `/buscar/`, la rotación de la portada y la clave de `data-pagefind-sort`.

#### 12. «Sin los bloques que rotan» no dice cómo se reconocen en `dist/`

- **Líneas:**
  - AD-11, l. 167: el grafo de NFR-5 «se calcula sin los bloques que rotan con la jornada».
  - AD-12, l. 178–181: «una prueba construye dos jornadas y lo exige».
- **Pareja:**
  - **26.b, NFR-5 en el build.** Excluye la Cita del Día y las Obras por los selectores que tienen cuando se escribe.
  - **28.a, la portada.** Llega después, porque el PRD manda desplegarla tras el juicio de SM-11, y compone esos bloques con otros contenedores.

  El grafo vuelve a contarlos. La prueba de dos jornadas solo lo caza si las dos fechas elegidas dan veredictos distintos.
- **Caso latente del tope.** `ImagenDeCita.astro:108,166` omite su guion en línea cuando la Cita no admite Imagen. En la portada, el peso en línea depende entonces de la Cita del Día, contra «constante por familia» (l. 114). Hoy no muerde: la Cita más larga tiene 240 caracteres, porque `MAX_CARACTERES_CANDIDATA` vale 240. Pero `alta` y `documentar --texto` pueden pasar de 300.
- **Arreglo exacto.** En l. 178, añadir:

  > Todo bloque que rota con la jornada lleva una sola marca (`data-jornada`), que pone un solo componente. El grafo de NFR-5 ignora sus subárboles por esa marca. La prueba de las dos jornadas exige además que el HTML de toda página salvo la portada, `/kit` y `/lote` sea idéntico byte a byte, y que en la portada solo difieran esos subárboles. El tope de la portada se mide con una Cita del Día que admite Imagen.

### Bajos

13. **La cola de `__medir` no tiene quién la cree** (AD-13, l. 190; AD-6, l. 110).
    - **El problema.** «El único `__medir` en ejecución, que encola lo que llegue antes que él»: una función que aún no existe no puede encolar nada. Hoy las islas llaman `window.__medir && window.__medir(…)` (seis llamadas en `src/islands` y `src/pages`), y eso pierde lo que se pulsa antes de que el fichero diferido se ejecute. En 4G, con siete Tarjetas por página, pasa.
    - **Arreglo.** En l. 190, sustituir «que encola lo que llegue antes que él» por: «un arranque en línea del armazón, antes de toda isla, define `__medir` como cola; el guion de medición la vacía al cargar y la sustituye; las islas llaman siempre `__medir(…)`, nunca `window.__medir && …`; el arranque cuenta en `MAX_BYTES_DE_GUION`».
14. **«La tabla tal como nació» tiene dos lecturas** (AD-14, l. 212).
    - **El problema.** En git, `esquema.sql` nació con cuatro columnas (`dcfa128eab`) y pasó a seis el mismo día. La base de producción se creó el 2026-09-02 desde el fichero de seis (DESPLIEGUE §3). Una `0000` de cuatro deja sin `origen` ni `destino` a toda base nueva. Una `0001` que las añada falla en producción con `duplicate column`, y la migración entera se revierte.
    - **Arreglo.** Sustituir «de la tabla tal como nació» por: «de la tabla tal como está en producción —las seis columnas y los dos índices del `esquema.sql` de la v7.1—, no la del primer commit».
15. **La clave del cargador de posiciones tiene dos candidatas, y el respaldo esconde el fallo** (AD-23, l. 323).
    - **El problema.** El fichero se llama `agustin-alvarez--ahora-empieza…`, con doble guion. Su `slug` es `agustin-alvarez-ahora-empieza…`, con uno, y es el que lleva `Cita.slug` (`publicado.ts:688`). Un cargador que indexe por el id de la entrada no casa ninguna Cita. Entonces todas caen en «sin documento, detrás y por slug» (l. 359), que es el orden de hoy, y nada parece roto.
    - **Arreglo.** En l. 323:
      - escribir «`{slug → …}` con el `slug` del frontmatter, nunca el id de la entrada ni el nombre del fichero»;
      - añadir: «una prueba sobre el Corpus exige que alguna Obra documentada de varias Citas salga en un orden distinto del de slug».
16. **Las pruebas de Pagefind no tienen plano declarado** (AD-11, l. 164; AD-17, l. 252; AD-25, l. 363; l. 521).
    - **El problema.** `filters()`, la búsqueda que fija el medio del tipo y el orden por la clave solo se ejecutan en el navegador. Hoy viven en `tests/e2e/busqueda.spec.ts`, que es Playwright. «Lo que el CI no prueba» no las nombra. Una historia las escribe en Vitest sobre los atributos y otra en Playwright, y dan garantías distintas.
    - **Arreglo.** En l. 521, añadir: «y las pruebas que llaman a Pagefind —los recuentos de `filters()`, la búsqueda que fija el medio del tipo y el orden de `data-pagefind-sort`—; en Vitest se comprueban los atributos de `dist/` (filtros, metadatos y clave), que es lo que el CI cubre».
17. **`ordenRevisado` fecha los Directorios aunque nada lo pinta** (AD-27, l. 387).
    - **El problema.** «El build no lo lee» (l. 73), y por el criterio de campos pintados no debería fechar nada. Cada tanda de revisiones de Héctor movería `/autores/` y `/obras/` y los avisaría.
    - **Arreglo.** Sustituir «Así `ordenAlfabetico` y `ordenRevisado` fechan solo los dos Directorios» por: «Así `ordenAlfabetico` fecha solo los dos Directorios, y `ordenRevisado`, que nada pinta, ninguna superficie».
18. **La restauración desde la caché de atrás y adelante no dice qué pasa con la vista** (AD-13, l. 192).
    - **El problema.** «Cuenta como carga nueva» admite que se vuelva a emitir la vista. El PRD (l. 1069) y el addendum (l. 237) solo vuelven a emitir la lectura. Si una historia emite también la vista, SM-8 y la relación entre lecturas y vistas cambian de instrumento.
    - **Arreglo.** Sustituir «`pageshow` con `persisted` cuenta como carga nueva, sin marcas» por: «`pageshow` con `persisted` cuenta como carga nueva para la lectura y la salida, sin marcas, y no vuelve a emitir ninguna vista».
19. **La fila de Node dice lo que no está instalado** (Stack, l. 426, contra l. 421: «Cada fila dice lo que se instala»).
    - **El problema.** Con Astro 7.2.0 instalada, `engines` y `comprobar-node.mjs` siguen en 22.12.0, y la fila dice ya «>=22.22.0».
    - **Arreglo.** «>=22.12.0, el suelo de la Astro 7.2 instalada; pasa a >=22.22.0, el de Astro 7.4, en el mismo commit que suba Astro, con `engines` y `tools/comprobar-node.mjs`».

---

## 3. Comprobado sin hallazgo nuevo

- **AD-20 frente a todo lo nuevo.** Ningún Modelo entra en la portada, en los Directorios ni en las entradas a la Obra por las nuevas reglas. La isla de compartir de la Obra cuenta en el tope de las rutas con `data-ingreso`.
- **AD-14.** Ningún byte de `dist/` deriva de D1. La huella y el guion versionado salen del repositorio.
- **El orden de los guiones.** El diferido clásico y el módulo se ejecutan en el orden del documento. La regla de l. 199, que pone primero el de medición, es suficiente.
- **El orden entre Fuentes de una Obra** (l. 325). `documentosDeCita` casa por la Fuente de la propia Cita, así que cada Cita tiene sus apariciones en una sola Fuente, y la regla de «Dónde leer esta obra» no choca con el cargador.
- **El 0000 frente a la base de producción.** Con `CREATE TABLE IF NOT EXISTS` y `CREATE INDEX IF NOT EXISTS` es inocuo, si se escribe con las seis columnas (bajo 14).

## Resumen

| # | Gravedad | Línea | Pareja | Arreglo |
|---|---|---|---|---|
| 1 | Alto | 164 | Un filtro por Tema × prueba de «un valor por clave» | `autor` 1, `obra` ≤1, `tema` = sus Temas publicados |
| 2 | Alto | 202 | Reconstrucción con git × marca de `vista-de-obra` | Partir por la marca; «cambió» si llegan las dos |
| 3 | Alto | 513, 521 | 24 fusionada sola × 26 días después | Fusión por épica; 24 y 26 en una rama |
| 4 | Medio | 250–251 | Subconjunto de familias × tipo de la portada | `tipos ⊆ familias ∪ {portada}` |
| 5 | Medio | 145, 190–191 | Rótulos en el vocabulario × cortes en `umbrales.ts` | Cortes en el vocabulario; cambiarlos cambia la huella |
| 6 | Medio | 168 | Puerta en tres órdenes × `tema quitar` | Añadirla; un grafo del modelo con dueño |
| 7 | Medio | 112 | `imagen.js` engorda × tope medido al cargar | Bajo demanda se mide el fichero; Pagefind también al llegar con estado |
| 8 | Medio | 177 | Saltar las no indexables × filtrar antes | La n-ésima del conjunto del que rota |
| 9 | Medio | 213 × 513 | `main` en rojo × nada en rojo | Héctor elige (a) o (b) |
| 10 | Medio | 411 | `define:vars` × importación | Texto con `String(…)` y `set:html` |
| 11 | Medio | 360, 364 | Orden copiado en `obras.ts` × el de `publicado.ts` | Un dueño en `obras.ts` |
| 12 | Medio | 167, 178 | Selectores de 26 × bloques de 28 | `data-jornada` y HTML idéntico entre jornadas |
| 13–19 | Bajo | 190, 212, 323, 521, 387, 192, 426 | — | Ver arriba |

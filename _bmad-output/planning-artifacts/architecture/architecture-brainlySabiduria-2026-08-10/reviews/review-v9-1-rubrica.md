---
title: 'Revisión de la espina v9.1 — rúbrica, reconciliación con el PRD v9.1 y verificación en la web'
reviewed: ARCHITECTURE-SPINE.md (partes v9.1: AD-32…AD-35 y los «Enmendado en la v9.1»)
against: prd.md v9.1 (§4.24 FR-65…FR-70, enmiendas de FR-13, FR-15, FR-51…FR-55, SM-C1, SM-C6, LC-6, §6.8 paso 8, §14 preguntas 18–28, §15 v9.1) y .memlog.md del PRD, entradas del 2026-11-04
date: 2026-11-04
verdict: CONCERNS
---

# Revisión v9.1 — rúbrica

**Veredicto: CONCERNS.** Las cuatro AD nuevas tienen la forma correcta (dueño, regla, puerta en el
build) y aterrizan lo central: la clase fijada al alta con un solo predicado (`esAtribuida`), la Obra
con un solo dueño en un espacio de slugs común, la Variante como campo, y el registro de retiradas
que solo añade. Pero hay **dos contradicciones con reglas vigentes de la espina** que una historia
heredará sin saberlo (AD-1 y AD-2), **una contradicción con el PRD** (la clave de orden del
Personaje) y varios **huecos de dueño** —qué es «derechos vigentes» y quién lo calcula, la
dirección de `/buscar/` con una Obra de Personaje, la sección de Personajes del Directorio en el
grafo de NFR-5, el slug de una Cita sin Autor, la muestra de SM-C6— que dejan que dos unidades
diverjan. Ninguno pide reabrir el PRD; todos se cierran con enmiendas de la espina.

---

## 1. Reconciliación PRD v9.1 → espina

Leyenda: **Aterriza** · **Parcial** (el dueño está, falta la invariante o el lugar) · **Falta** ·
**Contradice**.

| # | Consecuencia del PRD v9.1 | Estado | Dónde / qué falta |
|---|---|---|---|
| R1 | La clase se fija al alta y no cambia (FR-13, decisión C1) | Aterriza | AD-32, cláusula 1, con puerta en el build sobre el historial. |
| R2 | La clase **se sigue** de lo declarado: Personaje ⇒ atribuida; Autor sin Personaje ⇒ atribuida solo si tiene derechos vigentes (FR-65) | **Parcial** | AD-32 dice que la orden de alta la escribe «desde lo declarado», pero la puerta del esquema solo exige «Personaje o Autor, al menos uno». No hay invariante de build `clase` ⇔ (Personaje ∨ Autor con derechos vigentes). Una atribuida editada a mano con un Autor de dominio público y sin Personaje pasa la puerta blanda: es exactamente el «Prevents» de AD-32. Tampoco se impide **añadir** `personaje` a una Cita de la clase de siempre ya publicada (Segismundo, Sancho: PRD l. 416 dice que siguen en la clase de siempre), porque la prueba de historial mira `clase`, no `personaje`. |
| R3 | «Derechos vigentes» = no cumple la regla de dominio público de FR-13 (vive, o su obra sigue protegida); lo juzga la herramienta con los datos de la ficha, nunca quien lo declara | **Falta** | La espina usa el término en AD-20 (enm. v9.1), AD-30 y AD-33 —«`obras.ts` deriva si una Obra tiene derechos vigentes de su dueño»— pero ninguna AD lo define ni nombra la función. Debe ser **una sola función pura** que sea a la vez el complemento exacto de la puerta de dominio público de AD-1 (mismo año de fallecimiento, mismo plazo de `umbrales.ts`), para que «dominio público» y «derechos vigentes» no puedan divergir. Y falta decidir qué vale para un **dueño Personaje**: un Personaje no tiene año de fallecimiento. Si la Obra de Darth Vader (sin Autor) cuelga de él, ¿tiene derechos vigentes? De eso dependen la venta sola de FR-70, la exclusión del incipit (AD-30) y el orden por slug. Propuesta: la Obra que cuelga de un Personaje tiene derechos vigentes **por construcción** (solo existe en la clase atribuida y sin Autor que la libere); escribirlo. |
| R4 | El Autor vivo no tiene año de fallecimiento y su Estado de Derechos es propio (FR-15, FR-65) | **Contradice** | La regla de AD-1, que sigue en vigor, dice que el esquema **declara obligatorio `añoFallecimiento`** en Autor y **restringe `estadoDerechos` a `dominio-público`**. La enmienda v9.1 de AD-1 solo habla de la puerta de la Cita. Hay que enmendar la regla misma: `añoFallecimiento` es opcional solo para un Autor que no publica ninguna Cita de la clase de siempre (puerta sobre `autoresPublicados`, como la clave de orden), y `estadoDerechos` gana su segundo valor, con nombre, como conjunto cerrado. |
| R5 | La Página de Personaje es una sección del Directorio de Autores, y los Directorios siguen siendo dos (FR-55 enm., `[ASSUMPTION]`) | **Falta** | AD-33 declara la familia y la ruta `/personaje/{slug}/`, pero nada dice que `autoresPublicados` —o una enumeración hermana, `personajesPublicados`— alimente una sección de `/autores/`. Consecuencias sin dueño: (a) la arista Directorio de Autores → Personaje en `grafoDelModelo` de AD-11, sin la cual las órdenes que retiran no ven el camino de dos saltos que NFR-5 promete; (b) el filtro del Directorio (el guion empaquetado) recorre la sección; (c) las letras de salto, ¿se comparten o la sección lleva las suyas? Y el Directorio de Obras con la sección de Obras de Personaje tras las de Autores (FR-55 enm.) tampoco aparece. |
| R6 | El Personaje tiene clave de orden, con la regla y la orden de la del Autor (FR-66) | **Contradice** | El «Prevents» de AD-33 enumera la clave de orden entre lo que **no** debe arrastrar un Personaje modelado como Autor. El PRD la exige. Hay que corregir el «Prevents» y extender la enmienda v8 de AD-1 (forma en el esquema, presencia sobre los publicados, `ordenRevisado`) a `corpus/personajes/`. |
| R7 | Orden por slug en la Obra con derechos vigentes (FR-53 enm., pregunta 28) | Aterriza (implícito) | `ordenDelLibro` ya pone al final, por slug, las Citas sin aparición; si ninguna tiene aparición, todas van por slug. Conviene **decirlo** en AD-25 para que nadie escriba un orden aparte. Queda un borde: una atribuida que declara Fuente **en una Obra de dominio público** (Sancho en el *Quijote*, dueño Cervantes). AD-30 dice que el cargador no le da pasaje, pero no dice si le da **posición**: si se la da, se ordena dentro del libro; si no, va al final por slug. Hay que elegir, porque el mismo orden decide «Siguiente» y «De la misma obra». |
| R8 | La Pieza no admite atribuidas (FR-65, pregunta 27) | Aterriza | `esAtribuida` lo consulta la Pieza (AD-15), según AD-32. Nota del PRD, no de la espina: FR-66 sigue enumerando la Pieza (FR-30) entre lo que el Personaje nombra; es inocuo mientras rija la exclusión. |
| R9 | SM-C6: reclamaciones por cada cien atribuidas, al mes, y **una auditoría mensual por muestra con nombre** (mínimo, muestra, umbral de Héctor) | **Parcial** | AD-32 dice que `tools/` calcula SM-C1 y SM-C6 por clase, y AD-35 da el registro de peticiones. Falta la auditoría: dónde se anota cada muestra y su resultado (otro registro que solo añade, en `corpus/`, como las series de actos de AD-24); cómo se **elige** la muestra (determinista y reproducible desde el commit, p. ej. por hash del slug y el mes, para que nadie la escoja a mano); y las tres constantes en `umbrales.ts` sin valor, que cierran el juicio («por debajo del mínimo no se juzga») igual que los topes cierran la puerta. |
| R10 | FR-68: criterio de meme y **fuentes independientes** con mínimo con nombre; BrainyQuote no cuenta | **Parcial** | AD-32 lo convierte en `atestiguaciones` con `MIN_ATESTIGUACIONES_DE_ATRIBUIDA` **anfitriones distintos**, sin la semilla ni el propio. «Anfitrión distinto» no es «fuente independiente»: `es.wikiquote.org` y `en.wikiquote.org`, `www.` y sin él, o dos espejos del mismo agregador cuentan dos. Debe decir **dominio registrable** (eTLD+1, con la lista de sufijos públicos) y nombrar la lista cerrada de excluidos (la semilla, el propio dominio de `dominio.ts`) en un solo módulo. El «criterio de meme» es juicio humano al aprobar, y está bien que no tenga puerta; conviene decirlo. Falta además el **origen anotado** de la versión española (doblaje o traducción publicada, FR-68): ni campo ni dueño. |
| R11 | FR-67: la Variante se encuentra en la búsqueda interna y lleva a la misma Página de Cita | Aterriza, con precisión pendiente | AD-34 dice que la búsqueda la consume con `normalizar`. En la práctica la búsqueda es Pagefind sobre el HTML: basta con que la Variante esté pintada dentro de `data-pagefind-body` y **fuera** de `data-pagefind-ignore`. Escribirlo, porque el bloque de atribución vive cerca de bloques ignorados. `region` debería ser conjunto cerrado con nombre (Consistency Conventions). |
| R12 | FR-69: canal visible sin cuenta ni guion; registro sin datos de contacto, con la **clase de quien pide**; **plazo con nombre** que fija Héctor | **Parcial** | AD-35 lista «fecha, Cita, petición y resolución»: le faltan la clase de quien pide (persona afectada, titular, otro) y la prohibición de datos de contacto como invariante de la orden y del esquema del registro (el repositorio es público). El plazo no tiene constante en `umbrales.ts` ni lector: si nadie informa de las peticiones vencidas, el plazo no existe. Propuesta: `PLAZO_DE_RESPUESTA_A_RETIRADA_DIAS` sin valor, y la consulta de la orden de AD-35 nombra las vencidas. |
| R13 | La Obra que cuelga de un Personaje lleva «el Personaje y la obra, con su propia ruta; cómo se distingue lo fija la arquitectura» (FR-53 enm.) | Aterriza | AD-33 conserva `/obra/{dueño}/{obra}/` y lo hace inequívoco con un solo espacio de slugs para Autores y Personajes, activos o retirados. Es una respuesta válida. Dos efectos a anotar: (a) `autorPorPrefijo` de `tools/lib/autoria.ts` (demanda, retirar) tiene que mirar ese espacio común o atribuirá a un Autor la Cita de un Personaje con prefijo más corto; (b) la congelación y la regla de 90 % ya se extienden «al dueño» (AD-25 enm.). |
| R14 | La URL de la Cita sin Autor deriva del Personaje (FR-1 enm.) | **Falta** | AD-4 sigue diciendo `slug-del-autor` + fragmento, y la convención de ficheros sigue en `corpus/citas/{slug-autor}--…`. Hay que decir «slug del Autor o, sin él, del Personaje», con el espacio común de R13. |
| R15 | En la búsqueda, el Personaje es familia propia, sin contarse como Autor (FR-66) | **Parcial** | AD-33 lo deriva de `superficies.ts` hacia Pagefind (tipo de resultado). Pero la convención de dirección dice que **`obra` nunca va sin `autor`** y que si llega sin él el Autor sale del mapa: una Obra de Personaje no tiene Autor. Hay que decidir si el filtro de Obra se enlaza al dueño (`?personaje=` o el mismo parámetro para los dos) y si la búsqueda gana un filtro de Personaje; hoy es una regla que una historia romperá sin saberlo. El `data-pagefind-filter` de una Cita sin Autor (sin `autor:`) y la prueba de `dist/` que exige «todo registro con filtro `autor` es una Página de Cita» siguen valiendo. |
| R16 | Medición: la Página de Personaje se mide como la de Autor; sus zonas (listado, lista de Obras) son del conjunto o nuevas, lo decide Héctor (FR-56 enm.) | **Falta** | Ninguna enmienda de AD-13. Si son zonas nuevas, mueven la huella y siguen el orden migración–receptor–sitio de AD-14, con `PENDIENTES`; si son las de Autor, se dice. La vista de superficie de la familia `personaje` entra por `superficies.ts` (AD-33), bien. |
| R17 | Datos estructurados: `author` y `spokenByCharacter`, «como personaje de ficción y no como persona» (NFR-3 enm.) | Aterriza, con precisión de tipo | Ver §3: el rango de `spokenByCharacter` es `Person` u `Organization`; no existe `FictionalCharacter`. «No como persona» solo puede cumplirse por las propiedades (sin `birthDate`, sin `sameAs` a una persona real), no por el tipo. |
| R18 | La Ficha técnica **no** se excluye para la atribuida: es de la Obra, sin traductor sin edición cotejada (FR-65 enm., memlog H4) | **Contradice (leve)** | AD-32 enumera la Ficha técnica (AD-31) entre los que consultan `esAtribuida`. Si la consulta es para excluir, contradice el PRD; si es para quitar el traductor, el traductor depende de la edición cotejada de la Obra, no de la clase de una Cita. Quitar la Ficha técnica de la lista. |
| R19 | Destacados, suelo latinoamericano y cifras de portada sobre la clase de siempre (FR-8, FR-9, FR-25 enm.) | **Parcial** | La aptitud de portada y la línea de cifras están en la lista de `esAtribuida`; los ocho destacados (AD-11, «una sola función») y el suelo de `huecos.ts` no. Un Autor vivo con muchas atribuidas podría entrar entre los destacados. Añadirlos a la lista de consumidores. |
| R20 | Retirar no borra; la retirada por derechos y el historial público es la pregunta 25 | Aterriza | AD-35 lo nombra y lo deja a Héctor. |
| R21 | La siembra se registra en la serie de sesiones diciendo su clase (FR-68) | Falta (menor) | Un campo nuevo de `corpus/sesiones-de-sembrado.yml`; con AD-24 basta una línea. |
| R22 | Topes sin valor ⇒ no se publica ninguna atribuida (FR-65, pregunta 20) | Aterriza | AD-32, «sin valor, la puerta está cerrada», con los tres en `undefined`. Precisar si `MAX_ATRIBUIDAS_POR_OBRA` se aplica solo a Obras con derechos vigentes (lo que dice el PRD) o a toda Obra (lo que se lee en la espina). |

---

## 2. Rúbrica de buena espina sobre lo v9.1

**Reglas aplicables (puerta, no prosa).** Bien: la clase inmutable, el espacio de slugs, el dueño
único de la Obra, el predicado único y los topes cerrados tienen puerta en el build. Mal:

- **C1 — La puerta contra `_revision/` no es reproducible (contradice AD-2 y la política de
  candidatas).** AD-32 rompe el build si una atribuida casa por FR-14 «con una candidata de
  `corpus/_revision/`». Pero AD-2 dice que el build no carga `_revision/`, y las candidatas **no se
  versionan** desde el 2026-10-16: el CI no las tiene. La misma Cita rompería en local y pasaría en
  CI. La comprobación contra candidatas es de la **orden de alta** (`tools/`, que sí las ve); el
  build solo puede comprobar contra lo versionado (publicadas y retiradas versionadas). Es la misma
  lección de AD-1 al revés: una puerta que depende de ficheros sin versionar no es puerta.
- **C2 — El «único lector» tiene una excepción sin nombre.** «Nadie más mira `clase`» y, a la vez,
  la prueba de historial lee `clase` de cada versión del fichero. Nombrar la excepción (la
  integración de historial) para que la prueba que vigila el lector único no la rechace o, peor, no
  exista.
- **C3 — Invariante de coherencia de la clase** (R2): falta la puerta `clase` ⇔ lo declarado.

**Nada en Deferred que deje divergir unidades.** La v9.1 no añade nada a *Deferred*, y eso es en
sí un hueco: las preguntas 19, 22, 26, 27 y 28 dejan comportamientos provisionales (`[ASSUMPTION]`)
que la espina no fija como provisionales. Los de 22 y 27 están cubiertos por `esAtribuida`. Los de
19 y 28 —orden de las Obras en la Página de Personaje «como la lista de obras de un Autor», y la
Cita con Personaje y Autor en las dos páginas— no tienen dueño nombrado: conviene decir que la
Página de Personaje usa `ordenDeLaListaDeObras` de `obras.ts` y que «Más de {Autor}» incluye las de
Personaje mientras no se decida la 28, para que dos historias no elijan distinto.

**Envolvente operativa.** El *Entorno operativo* no se enmienda en la v9.1:

- **Ficheros.** Cada Cita añade unos tres ficheros (HTML, Tarjeta Social y su parte del índice), y
  cada Personaje, al menos su página (y su Tarjeta, si la tiene: la espina no lo dice; AD-28 y
  FR-19 no la mencionan para el Personaje). GitHub Pages no tiene tope de ficheros, solo 1 GB, así
  que el riesgo es la **salida** declarada: Cloudflare Pages corta a 20.000, y con 4.970 Citas
  `dist/` debe de estar ya por encima de los 15.339 del 2026-10-16. Mientras la atribuida sea
  semilla el crecimiento es pequeño; la siembra a escala (tras la pregunta 18) es la que abre la
  pregunta. Una línea en el *Entorno operativo* basta.
- **Peso.** El paso de peso de `dist/` ya cubre la familia nueva sin cambios, y la Variante pesa
  poco. Bien.
- **Tiempo de build.** La prueba de clase inmutable reutiliza el historial que ya lee
  `integraciones/historial.ts`: coste marginal. Comprobar que el checkout de CI no es superficial
  (`fetch-depth`) es ya condición de AD-27; la nueva prueba la hereda y conviene decirlo.
- **Pagefind.** Un tipo de resultado `personaje` en `tipoDeResultado.ts` y su peso en
  `OPCIONES_DE_PAGEFIND` si lleva metadatos; la Página de Personaje `noindex` fuera del índice, por
  AD-17. Los filtros no crecen salvo que se cree un filtro de Personaje (R15).
- **Conjuntos cerrados.** La fila de *Consistency Conventions* sigue diciendo «familias … con seis
  valores»: pasan a siete, y cada subconjunto con nombre (`FAMILIAS_DEL_TRAFICO`,
  `FAMILIAS_DE_LA_DEMANDA`, `FAMILIAS_DEL_RASTREO`, `FAMILIAS_DEL_CANAL`, el tipo de resultado)
  tiene que decidir explícitamente si incluye `personaje` (el PRD dice que sí en tráfico, demanda y
  canal). Falta también el diagrama ER (PERSONAJE, la Obra con dueño, la Variante) y la entrada de
  `corpus/personajes/` y `pages/personaje/` en el *Structural Seed*.

---

## 3. Verificación en la web (2026-11-04)

- **`spokenByCharacter` existe en schema.org**, se usa en `Quotation` y espera **`Organization` o
  `Person`**; se describe como el personaje (p. ej. de ficción), persona u organización a quien se
  atribuye la cita dentro de la obra que la contiene. Está en el área «new», con referencia al
  issue 271 de schemaorg. `Quotation` se define como una cita atribuida a un autor real y, si va
  asociada a un personaje de ficción, a una `Person` ficticia, y recomienda `isBasedOn` para enlazar
  la fuente. **Consecuencia:** el Personaje se emite como `Person` (no hay `FictionalCharacter` en
  el vocabulario). La obra de la que procede debería ir como `isPartOf` (como hoy) o `isBasedOn`,
  según lo que ya fija AD-25. Fuentes: <https://schema.org/spokenByCharacter>,
  <https://schema.org/Quotation>.
- **Google no tiene resultado enriquecido para `Quotation`**: la galería de Search Central lista 25
  funciones (Article, Breadcrumb, … Profile page, … Video) y `Quotation` no es ninguna. Es dato
  semántico, sin efecto visible garantizado. Lo que sí aplica son las pautas generales: el marcado
  debe ser «a true representation of the page content», no debe describir contenido invisible y no
  debe inducir a error. **Para la v9.1 importa** porque la atribuida se publica sin sello (pregunta
  26): el JSON-LD no debe afirmar más que la página —nada de `isBasedOn` hacia una edición que la
  página no muestra, y nada de citación de la obra que el visitante no ve—. Fuentes:
  <https://developers.google.com/search/docs/appearance/structured-data/search-gallery>,
  <https://developers.google.com/search/docs/appearance/structured-data/sd-policies>.
- **`mailto:` como canal.** No hay objeción de fondo, pero sí tres notas:
  1. **WCAG 2.2, 3.2.6 «Consistent Help» (nivel A)**: una dirección de correo es un «mecanismo de
     ayuda», y si aparece en un conjunto de páginas tiene que ir **en el mismo orden relativo** en
     todas. La espina ya pide WCAG 2.2 AA y axe no lo comprueba, así que el lugar del enlace se fija
     en un solo componente compartido por la Página de Cita atribuida y la de Personaje. Fuente:
     <https://www.w3.org/WAI/WCAG22/Understanding/consistent-help.html>.
  2. **Visitantes sin cliente de correo** (habitual en móvil con correo web): el enlace no hace
     nada. Mostrar también la dirección en texto, que además satisface el propósito del enlace
     (2.4.4) sin depender de un `aria-label`.
  3. **Correo basura**: una dirección en HTML estático, y en un repositorio público, se recolecta.
     Ofuscarla con guion choca con AD-6 y con FR-69 («sin guion»), así que la defensa es un alias
     dedicado y desechable, no ocultarla. Un `?subject=` con el slug de la Cita está bien (ningún dato
     personal en la URL) y ayuda a casar la petición con el registro.

---

## 4. Enmiendas propuestas (por orden de prioridad)

1. **AD-1:** enmendar la regla misma —`añoFallecimiento` obligatorio solo para el Autor con Citas
   de la clase de siempre; `estadoDerechos` con su segundo valor cerrado— (R4).
2. **AD-32:** nombrar la función única de «derechos vigentes», complemento de la puerta de dominio
   público, y su valor para un dueño Personaje (R3); invariante `clase` ⇔ lo declarado, también
   contra añadir `personaje` a una Cita de la clase de siempre (R2); mover el cotejo FR-14 contra
   candidatas a la orden de alta (C1); nombrar la excepción del historial (C2); quitar la Ficha
   técnica y añadir destacados y suelo a los consumidores de `esAtribuida` (R18, R19); dominio
   registrable para las atestiguaciones (R10).
3. **AD-33:** corregir el «Prevents» de la clave de orden (R6); la sección de Personajes del
   Directorio de Autores y la de Obras de Personaje del de Obras, con su arista en `grafoDelModelo`
   (R5); el slug de la Cita sin Autor y `autorPorPrefijo` sobre el espacio común (R13, R14); la
   convención de dirección de `/buscar/` con una Obra sin Autor (R15).
4. **AD-35:** clase de quien pide, sin datos de contacto como invariante del registro, plazo con
   nombre y la consulta de vencidas (R12); el registro de la auditoría de SM-C6 con muestra
   determinista y sus tres constantes (R9).
5. **AD-13:** las zonas de la Página de Personaje, o que son las de Autor (R16).
6. **Convenciones, *Structural Seed*, ER y *Entorno operativo*:** siete familias y sus
   subconjuntos, `corpus/personajes/`, `pages/personaje/`, la Variante, y una línea de ficheros
   frente a la salida de 20.000.

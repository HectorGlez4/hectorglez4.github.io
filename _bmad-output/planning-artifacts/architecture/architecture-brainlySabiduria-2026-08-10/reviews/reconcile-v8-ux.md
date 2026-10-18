---
title: "Cotejo de entradas — UX v8 contra la espina v8"
status: final
created: 2026-10-18
lens: reconcile (Finalize, paso 2)
inputs:
  - '{planning_artifacts}/ux-designs/ux-brainlySabiduria-2026-08-10/EXPERIENCE.md'   # v8, 2026-10-18
  - '{planning_artifacts}/ux-designs/ux-brainlySabiduria-2026-08-10/DESIGN.md'       # v8, 2026-10-18
against:
  - 'ARCHITECTURE-SPINE.md (sin commitear, git diff del 2026-10-18)'
  - '.memlog.md (entradas D-1…D-16 del 2026-10-18)'
also_read: 'PRD v8.1 §4.21/FR-56 y addendum v8 (para desempatar), y el código citado'
---

# Cotejo de entradas — UX v8 contra la espina v8

**Veredicto: pasa con huecos.** Casi todo lo que la UX delegó por su nombre a Arquitectura aterrizó: la rotación de las Obras de la portada (AD-12), el Autor de una dirección con `obra` y sin `autor` (AD-11, mapa de rótulos), el tipo `directorio` en Pagefind (AD-17), el orden entre documentos de una Obra paginada (AD-23), la columna 9:16 (AD-8), los dos toques de la Historia (AD-7) y el `<details>` de «Más opciones…» (AD-6). Lo que cae es lo que la UX **no** delegó porque lo daba por resuelto en otra capa: dónde corre la medición, qué pasa con los enlaces que no salen de la página, quién anuncia y qué se ve cuando el guion de `/buscar/` no llega. Tres de los huecos son de la estructura de AD —una regla escrita para el caso principal que, leída al pie de la letra, contradice una superficie de la UX—, y por eso no los caza ningún revisor de la espina sola.

Ordenados por lo que cuesta dejarlos.

---

## 1. Lo que no aterrizó o aterrizó distinto — graves

### 1.1 El guion de medición solo se carga donde hay vista, y la UX mide donde no la hay — **alto**

- **Espina.** AD-6, primer punto de la enmienda v8 (línea 108): el guion «se carga en toda página que emite vista». AD-13 (líneas 172–173): la salida interna «la recoge una sola escucha delegada en el guion de medición».
- **Entrada.** La tabla de zonas de `EXPERIENCE.md § Zonas de salida interna` pone zonas en páginas que **no** emiten vista: `resultado` en `/buscar/`, `listado`, `paginacion` y la `atribucion` de «de {Autor}» en las páginas 2+, y `cabecera` en toda página, también el 404. Las mismas superficies están en FR-56 («las salidas de una página sin lectura —la búsqueda, la página 404, las páginas 2 y siguientes de un listado— no entran en la de ninguna otra. La de la búsqueda la mide SM-13»). Y `busqueda` y `busqueda-sin-resultados` se emiten en `/buscar/`, que no tiene vista (`Armazon.astro`, líneas 35–39).
- **Por qué importa.** Leída tal cual, la regla deja sin medir SM-13 —la salida desde un resultado es justo lo que dice si se encontró lo buscado—, la continuación por la paginación y la salida del 404. Y es una **regresión**: hoy `Medicion.astro` instala el guion en toda página y emite la vista solo si se pide, así que `busqueda-sin-resultados` sale de `/buscar/` por `window.__medir` (`buscar.astro`, línea 197). Con la v8 dejaría de salir.
- **Propuesta.** El fichero se carga en toda superficie pública que tenga una zona, una búsqueda o una vista. La vista sigue saliendo del `data-*`, y donde no lo hay no se emite. Hay que corregir también la prueba de la Historia 2.1 que reescribe AD-6.

### 1.2 Dos caminos para emitir, y el estado de la carga solo vive en uno — **alto**

- **Espina.** AD-6 (línea 108): las islas «toleran que `__medir` llegue después», es decir, emiten por el global del guion. AD-6 (línea 109) y D-9: los guiones empaquetados «importan `normalizar`, `tipoDeResultado`, `medicion` y `umbrales`». AD-13 (línea 175): el guion de medición guarda en memoria `de` y `via` «para los eventos de esa carga», emite la lectura una vez y antes que la salida, y la búsqueda una vez por estado.
- **Entrada.** La búsqueda con filtros y el filtro de los Directorios son islas empaquetadas. La primera emite `busqueda` y `busqueda-sin-resultados`, y de un resultado sale una salida interna.
- **Por qué importa.** Un `import` de `medicion.ts` dentro de un paquete crea una **segunda instancia** del módulo, con su propia memoria. Lo que emita por ella no lleva las marcas de llegada que guarda el guion, ni sabe si la lectura ya salió. Además, `medicion.ts` es hoy un módulo del build: `puntoFinal(process.env)` y `guionDeMedicion()` componen el texto del guion. Importarlo desde el cliente mete en el paquete código que solo tiene sentido en el build. La regla de AD-13, «un solo emisor», se rompería sin que nada fallara.
- **Propuesta.** Separar el vocabulario (eventos, zonas, tramos, filtros: constantes puras) de la emisión. Los paquetes importan solo el vocabulario, y **toda** emisión pasa por el único guion en ejecución (`__medir` o un equivalente que encole lo que llegue antes que él). Escribirlo en AD-13, no dejarlo a la historia.

### 1.3 La escucha delegada cuenta enlaces que no salen de la página — **alto**

- **Espina.** AD-13 (línea 173): la salida se emite con «la zona más concreta que contiene el enlace», y **como mucho una por carga** (decisión D-6 de esta pasada, no de la entrada). La prueba sobre `dist/` exige zona o «una exención explícita» a todo enlace interno de `main`. La convención de la línea 369 dice lo mismo.
- **Entrada.** La UX pone enlaces de la misma página **dentro** de contenedores que tienen zona:
  - en los Directorios, «Volver a las letras» va al final de cada grupo, dentro del bloque de la zona `directorio`; las letras de salto están en la misma página (`EXPERIENCE.md`, líneas 278–279);
  - en la Página de Obra, el salto «Dónde leer esta obra ↓» va en la Cabecera de Obra, junto a «de {Autor}», que es zona `atribucion` (línea 221);
  - «Saltar al contenido.» abre toda página.

  La tabla de zonas no lista ninguno, porque no son salidas. FR-56 y el glosario del PRD añaden un caso más: un enlace que se abre en pestaña nueva no se registra. Ctrl o Cmd con clic sí dispara `click`, a diferencia del clic central que cita el addendum.
- **Por qué importa.** Con «una por carga», pulsar una letra gasta la única salida de esa carga, y la Fila de Autor que se pulsa después ya no se registra: la continuación del Directorio se mediría con las letras. La prueba sobre `dist/` no dice que esas anclas sean la exención, así que cada historia lo resolverá a su manera. Y no cubre los enlaces que compone el cliente: los resultados de `/buscar/`, «Buscar «x» en las citas» del filtro a cero y las filas que se clonan del `<template>`. A esos no llegan ni `astro check` ni la prueba sobre `dist/`.
- **Propuesta.** Una regla en AD-13:
  - ni un enlace a otra parte de la misma página ni un clic con modificador, con un botón que no es el principal o con `defaultPrevented` cuentan como salida, ni gastan la de la carga;
  - las anclas de la misma página son la exención que nombra la prueba;
  - la zona se declara en el **contenedor** que pinta el build, para que lo que inserte el cliente la herede; la prueba de los enlaces del cliente es de la isla que los compone.

### 1.4 Regiones de estado y ritmos de anuncio: ninguna línea en la espina — **medio-alto**

- **Entrada.** `EXPERIENCE.md § Accessibility Floor` (líneas 470–474) y `DESIGN.md` (líneas 363–365) fijan:
  - una región que acompaña a un control insertado por la isla existe antes del primer mensaje: la del Directorio va en el HTML inicial, y la del diálogo de la Historia, **dentro** del `<dialog>` y creada vacía con él;
  - **dos ritmos**: lo que se repite, vaciando la región y escribiendo en el siguiente fotograma (y, si no basta, unos 100–150 ms); lo que cambia al teclear, unos 700 ms después, aparte del pintado de la lista y **solo si la frase cambió**;
  - no se vuelve a anunciar tras «Mostrar 30 más»;
  - la pausa de los selectores, de unos 400 ms.
- **Espina.** No nombra las regiones de estado. AD-9 (línea 134) da dueño al número —«las pausas de tecleo que comparten el filtro de los Directorios y `/buscar/`»—, pero no al comportamiento.
- **Por qué importa.** El primer ritmo ya está escrito tres veces por separado, en `CopiarCita.astro:116`, `ImagenDeCita.astro:211` y `buscar.astro:184`, las tres `is:inline`. La v8 añade la Historia, el filtro de los Directorios y la búsqueda con filtros, repartidos en tres planos de guion: en línea, empaquetado y `public/islas/`. Es la divergencia que AD-3 cerró para la normalización. La UX mandó la convención a `AGENTS.md` por `bmad-project-context` (memlog de UX, entrada 138), y esa pasada no ha corrido.
- **Propuesta.** Un dueño en `src/lib/` para los dos anunciadores, que importan los guiones empaquetados y que las islas en línea reciben por `define:vars`. Y una fila en Consistency Conventions: región en el marcado desde la carga, dentro del `<dialog>` cuando se anuncia con él abierto, y los dos ritmos.

### 1.5 `/buscar/` con `<noscript>` y `<template>` deja un callejón nuevo — **medio**

- **Espina.** AD-6 (línea 111): sin guion, el aviso va en `<noscript>`; el mismo componente, en un `<template>`, sirve para cuando el índice no carga; el campo y los selectores los inserta la isla. Es D-14.
- **Entrada.** En `/buscar/` sin JavaScript y con el índice que no carga (líneas 425 y 428), la UX pide «Nunca un callejón», y lo que pasa cuando hay guion lo dejó a Arquitectura.
- **Por qué importa.** Hoy el campo está en el HTML y el guion va en línea (`buscar.astro`, línea 150). En la v8 el guion pasa a ser un fichero empaquetado, y es él quien inserta el campo. Si el JavaScript está activo pero ese fichero no llega —red móvil, un bloqueador, un error al ejecutar—, no se pinta el `<noscript>` ni se clona el `<template>`: la página se queda en su `h1` y nada más. Es justo el callejón que la UX veda, y la v7.1 no lo tenía.
- **Propuesta.** El aviso va en el HTML, y lo retira la isla al arrancar, o lo oculta una clase que pone en `<html>` una línea en línea y retira la isla si no llega. O, la alternativa más barata, el campo vuelve al HTML como un formulario GET a `/buscar/`, como el de la portada.

### 1.6 La espina prohíbe el orden que la UX pide para el selector de Autor — **medio**

- **Entrada.** `EXPERIENCE.md`, línea 256: «Los Autores van por su nombre tal como se lee, y no por la clave de orden del Directorio», porque la búsqueda por tecleo del selector nativo casa por el principio del rótulo.
- **Espina.** AD-3 (línea 87): la inicial y el orden del Directorio salen de una función hermana, y «ningún módulo ordena Autores por su cuenta». AD-11 (línea 150): las opciones de filtro salen «de una sola función».
- **Por qué importa.** Quien obedezca AD-3 ordenará el selector por apellido, que es justo lo que la UX descartó: con los rótulos por nombre de pila, la lista se vería desordenada. Quien obedezca a la UX incumplirá AD-3.
- **Propuesta.** Una segunda ordenación en el mismo módulo, por el nombre tal como se lee y con la comparación canónica, que consumen las opciones de `/buscar/`. O nombrar el selector como excepción declarada. De paso, fijar en la misma función el orden de los Temas, por su nombre y con el artículo (línea 256).

### 1.7 El orden del libro no está definido entre Fuentes distintas — **medio**

- **Entrada.** `EXPERIENCE.md`, línea 212: en el orden del libro, «si la Obra se cotejó en varios documentos, documento a documento, en el orden que fija Arquitectura». La UX admite varias Fuentes por Obra (línea 228) y dos traducciones como dos líneas (§ Obra traducida, regla 4).
- **Espina.** AD-23 (línea 291) fija el orden entre los documentos de **una** Obra paginada de **una** Fuente: su índice de subpáginas o, mientras no se capture, el orden natural con romanos. No dice nada de dos Fuentes.
- **Caso vivo hoy.** «Tradiciones peruanas», de Ricardo Palma, tiene 3 Citas de `gutenberg` y 1 de `wikisource-es`, con 2 documentos de Gutenberg y 3 subpáginas de Wikisource en `corpus/fuentes/`. Las posiciones de dos ediciones no se pueden comparar. La heurística del slug pondría Gutenberg delante porque su `id` va antes en el alfabeto, que es un orden arbitrario y no declarado. Ese orden mueve «Siguiente», «De la misma obra» y el `data-pagefind-sort`.
- **Propuesta.** Ordenar las Fuentes de una Obra con una regla fija —por ejemplo, la que más Citas aporta, como «Dónde leer esta obra»— y dentro de cada una el orden de AD-23. O declararlo en Deferred con su caso.

### 1.8 La prueba de cabida del 9:16 no tiene dónde correr — **medio**

- **Espina.** AD-8 (línea 127): la prueba de los tramos corre con el pie de dominio puesto y en los dos formatos, y una Cita de hasta `MAX_CARACTERES_IMAGEN` que deje de caber no se encoge.
- **Entrada.** `EXPERIENCE.md` (líneas 108–112) pide que toda Cita de hasta 300 caracteres siga cabiendo en su tramo, con la procedencia repartida en líneas por el mismo algoritmo. `DESIGN.md` (línea 401) da las bandas de unos 250 px como un supuesto que comprueba la matriz de dispositivos.
- **Por qué importa.** Si cabe o no lo decide `measureText`, con Source Serif cargada en el navegador (`public/islas/imagen.js`, líneas 40 y 72). Ninguna prueba de Node lo puede medir: `lienzo.ts` rasteriza con las fuentes del sistema. Y las pruebas de punta a punta no corren en CI (`AGENTS.md`). La espina no dice en qué plano corre la prueba, sobre qué textos —el Corpus o el peor caso— ni qué hace `imagen.js` en el navegador con una Cita que no cabe, si no puede encogerla ni recortarla. Hoy NFR-12 descansa, para las imágenes del cliente, sobre una prueba sin plano.
- **Propuesta.** Fijar las tres cosas: el plano (un Playwright de punta a punta que corra en CI, o un `canvas` de Node con las fuentes del sitio), el conjunto de textos y la conducta cuando no cabe. Esta última puede ser la frase de fallo del generador, que ya ofrece copiar el texto.

---

## 2. Lo que la espina decide contra la entrada

| Decisión de la espina | Contra qué de la UX | Hallazgo |
|---|---|---|
| El guion de medición «se carga en toda página que emite vista» (AD-6) | Las zonas de `/buscar/`, de las páginas 2+ y del 404, y la búsqueda (§ Zonas) | 1.1 |
| «Como mucho una salida interna por carga», con la zona del contenedor (AD-13, D-6) | Las anclas de la misma página dentro de las zonas `directorio` y `atribucion` | 1.3 |
| `<noscript>` y `<template>` en `/buscar/` (AD-6, D-14) | «Nunca un callejón» (§ State Patterns) | 1.5 |
| «Ningún módulo ordena Autores por su cuenta» (AD-3) | Selector de Autor por su nombre tal como se lee | 1.6 |
| «Es el único guion externo que no es bajo demanda» (AD-6, línea 108) | El filtro de los Directorios y la búsqueda insertan su control **al cargar**, así que sus guiones empaquetados se cargan con la página. `imagen.js` se pide «al pulsar», salvo en el Kit y el Lote, que lo importan al cargar para enseñar la imagen ya compuesta (`ImagenDelKit.astro:63`), ahora con dos lienzos por jornada. Y Pagefind (`/pagefind/pagefind.js`, que `import()` pide al enfocar, `buscar.astro:172`) no está en la lista cerrada de guiones externos, y la propia regla dice que un guion fuera de la lista «es un fallo de prueba». Una prueba escrita desde esa frase falla en `/autores/`, `/buscar/` y `/kit`, o se escribe para no mirar | — |

Las demás decisiones de la espina **desarrollan** la entrada sin contradecirla:

- las pausas, en `umbrales.ts`;
- el mapa de rótulos en JSON y no en el HTML;
- `obra` deducida del mapa;
- `directorio` como familia propia;
- la congelación, que no alcanza a la navegación;
- la publicidad admitida en `/buscar/` con filtros.

---

## 3. Huecos menores

- **«Siguiente» de una Obra de una sola Cita.** AD-11 (línea 153) dice solo que «lleva a una Cita del listado de su primer Tema» y que lee el orden del dueño de la Página de Tema. La UX y la v8.1 del PRD fijan más (`EXPERIENCE.md`, línea 391):
  - lleva a la **primera Cita del siguiente Autor**, nunca a otra del mismo;
  - tras el último Autor, vuelve al primero;
  - sin otro Autor en el Tema, no hay «Siguiente»;
  - el primer Tema es el primero **publicado**, en el orden en que la Cita los declara.

  Quien lea solo AD-11 puede construir la Cita contigua, que es lo que la UX descartó porque solía ser casi la misma. Tampoco consta que «De la misma obra» y «Más de {Autor}» dejen fuera la Cita siguiente, ni cuál es la regla, determinista, con que «Más de {Autor}» elige sus cuatro.
- **El segundo toque de la Historia.** AD-7 veda «ninguna espera de red ni de composición», pero no la promesa del portapapeles. Si `writeText` se espera antes de llamar a `share`, Safari puede dar la activación por gastada, y la Historia cae en `NotAllowedError`, es decir, en una descarga que en iOS va a Archivos. El orden que lo evita es lanzar `writeText`, llamar a `share` en el mismo turno y esperar las dos después; «Enlace copiado» se dice solo si `writeText` resolvió. Ni la espina ni la UX lo fijan, y la matriz de dispositivos no debería ser quien lo descubra.
- **La URL marcada que se compone en el cliente.** `opaco` («Más opciones…» con hoja) e `instagram-historia` (el portapapeles) no tienen constructor en `compartir.ts`, así que los compone la isla. En la portada, `location` es `/`, y lo que se comparte tiene que ser la canónica de la Página de Cita: AD-12 lo dice de las acciones, pero no da dueño a esa composición. Propuesta: componerla en el build, con el mismo dueño que los destinos de enlace, y pasarla por `data-*`; nunca derivarla de `location`.
- **Dirección de `/buscar/`.**
  - **Orden de ejecución.** El de medición es un guion clásico con `defer` y el de búsqueda, un módulo; los dos se ejecutan en el orden del documento, y la espina no fija cuál va primero. Si la búsqueda reemplaza la dirección —al quitar un filtro que ya no existe— antes de que la medición lea `de` y `via`, las marcas se pierden.
  - **Un par que no casa.** `?autor=a&obra=b`, con `b` de otro Autor: la UX solo resuelve `obra` sin `autor`, y la espina tampoco dice qué hacer.
- **Tarjeta de Obra fuera de Pagefind.** La UX la saca del cuerpo del índice (`EXPERIENCE.md`, línea 154). AD-19 (línea 242) solo saca «lo que enumera» la Página de Cita, y la Tarjeta no enumera Citas. Su título y «Siguiente cita sobre {tema}» entrarían en el cuerpo de cada Página de Cita.
- **Los Directorios y la medición.** La fila de FR-55 del mapa de capacidades no vincula AD-13, aunque los Directorios emiten vista y lectura (FR-56) y tienen la zona `directorio`. Tampoco se dice qué vista emiten: si es `superficie`, entran en SM-8 y cambian la composición de la serie sin un corte fechado, que es justo lo que AD-9 pide para la serie de SM-8.

---

## 4. Lo que aterrizó, y no hay que tocar

| Tema de la UX | Dónde aterrizó |
|---|---|
| Historia en dos toques; `NotAllowedError` cae en la descarga, que registra el destino; `AbortError` no registra nada | AD-7 (línea 120) y AD-13 (`descarga-de-imagen` con `instagram-historia`) |
| `<details>` de «Más opciones…»: un botón lo sustituye solo donde hay hoja; sin guion, enseña los tres destinos | AD-6 (línea 112) y AD-13 (`DESTINOS_VALIDOS`, que incluye `opaco`) |
| Orden del libro con un solo localizador; uno de sus lectores es «Siguiente», que vuelve al principio | AD-23 (líneas 290–291), AD-25 (línea 325) y `data-pagefind-sort` (línea 326) |
| Directorios: producto, sin Modelo, familia propia, `data-pagefind-ignore`, inicial con la Ñ y filtro por subcadena | AD-17 (líneas 220–225), AD-20, AD-24, AD-3 y AD-11 |
| Columna 9:16 en `tramos.ts`, por `data-*`; dominio desde `dominio.ts`; geometría declarada una vez | AD-8 (línea 127) y AD-7 |
| Las dieciséis zonas como conjunto cerrado; la zona obligatoria en las props | AD-13 (líneas 171 y 173) |
| Una dirección con `obra` y sin `autor` toma el Autor del mapa de rótulos; un filtro que ya no existe se ignora, se dice y se quita | AD-11 (línea 151) y la convención de la línea 368 |
| Rotación de las seis Obras de la portada | AD-12 (línea 162) |
| La Cita del Día, su Tarjeta y sus acciones, un solo bloque sin Modelo, que actúa sobre la canónica | AD-12, AD-19 (línea 243) y AD-20 (línea 264) |

---

## 5. Fuera de la espina, para otras pasadas

- **`bmad-project-context`.** `AGENTS.md` tiene que recoger el segundo ritmo de anuncio y los mensajes de estado nuevos de la v8. Ya lo pidió la UX (memlog de UX, entrada 138), y es la mitad documental del hallazgo 1.4.
- **UX.** En la búsqueda sin resultados, los Temas, las Colecciones y los ocho Autores destacados que se ofrecen como salida no tienen zona. `chip-de-tema`, `colecciones` y `autores-de-portada` se limitan a la portada y a la Cita, así que esas salidas no se registran. Si es a propósito, conviene escribirlo; si no, la tabla de zonas necesita una fila.

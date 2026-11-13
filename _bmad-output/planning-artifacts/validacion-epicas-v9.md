# Validación de las épicas v9 (29–35)

Fecha: 2026-11-07. Alcance: `epics.md`, desde «## Requirements Inventory — v9» (línea 8639) hasta el final (Épicas 29 a 35, 33 historias con la 34.0). Fuentes de contraste: el inventario v9 del propio fichero, `prds/prd-brainlySabiduria-2026-08-10/prd.md`, `architecture/architecture-brainlySabiduria-2026-08-10/ARCHITECTURE-SPINE.md`, el árbol del worktree (67afaca5c0) y `implementation-artifacts/sprint-status.yaml`. Pasada de solo lectura: este informe es lo único escrito.

Además de leer las historias, se comprobó contra el código:
- Toda pieza que una historia da por existente está en el árbol: unas 90, entre ellas `MIN_CARACTERES_PARA_CONTENCION`, `slugLibre`, `autorPorPrefijo`, `parecidoDeTextos`, `contenidaEn`, `LARGO_DE_FRAGMENTO`, `ANCLA_DE_DONDE_LEER`, `MAX_BYTES_GUION_DEL_FILTRO`, `MAX_BYTES_GUION_DE_LA_BUSQUEDA`, `DESPLIEGUE_DE_LA_BUSQUEDA_CON_FILTROS`, `dondeLeer`, `revisar --rechazar`, `MAX_BYTES_DE_GUION = 6656` y todos los ficheros de prueba citados.
- Los catorce ficheros que no existen son, cada uno, los que crea una historia: `Desplegable.astro`, `TextoDeCita.astro`, `verso.ts`, `recorte.ts`, `clase.ts`, `atestiguaciones.ts`, `lineas.ts`, `parecido.ts`, `pasaje.ts`, `wikidata.ts`, `personaje.ts`, la página de Personaje y dos e2e.
- Ninguna historia lleva «TODO», «{{», TBD ni criterios vacíos. Las 33 historias tienen su «As a / I want / So that» y entre 5 y 15 Given.

## Veredicto global

**Aprobado con un hallazgo bloqueante (32.2 → 32.5) y seis importantes.** La cobertura es completa. La cadena de piezas entre épicas es coherente, salvo la composición de «Cómo citar» que la 32.5 da por reutilizable. Las reglas del proyecto se respetan.

| Apartado | Veredicto |
|---|---|
| 1. Cobertura de FR, UX-DR y AD | **Pasa** |
| 2. Dependencias hacia delante dentro de cada épica | **Falla en la 32** (1 bloqueante); 29, 30, 31, 33, 34 y 35 pasan |
| 3. Dependencias entre épicas | **Pasa con reservas** (2 importantes) |
| 4. Calidad de historia | **Pasa con reservas** (35.1 y 35.3, grandes) |
| 5. Rotación de ficheros | **Justificada** |
| 6. Reglas del proyecto | **Pasa con una incoherencia** (quién sube los topes de guion) |

---

## 1. Cobertura de FR, UX-DR y AD — Pasa

**FR nuevos.** Cada uno tiene historia y criterios que lo cumplen, no solo lo citan:

| FR | Historias |
|---|---|
| FR-57 | 30.4, 30.5, 35.4 (Personaje) |
| FR-58 | 30.3, 30.5, 32.5, 35.4 y 35.9 (exclusiones) |
| FR-59 | 31.1, 31.2 |
| FR-60 | 32.1, 32.2 |
| FR-61 | 32.3 |
| FR-62 | 33.3, 35.9 |
| FR-63 | 29.1, 29.2, 29.3 |
| FR-64 | 30.2, 34.1, 34.2, 34.3 |
| FR-65 | 35.1 |
| FR-66 | 35.2, 35.3 |
| FR-67 | 35.6 |
| FR-68 | 35.10 |
| FR-69 | 35.8 |
| FR-70 | 35.9 |

**FR enmendados v9:**
- FR-4: 34.2.
- FR-6: 34.3.
- FR-10: la banda del dominio es de la 25.2, fuera de la v9, como dice la lista de épicas. El verso en lo que sale es de la 29.3.
- FR-12: 30.1, 30.3, 30.4 y 31.2; la portada, en la 28.2, ya redactada en el orden v9.
- FR-14: 29.4, 35.1, 35.6 y 35.7.
- FR-35: 33.1, 33.2.
- FR-51: 32.2, 32.3, 32.4.
- FR-53: 32.1.
- FR-54: 32.4, 33.2.

**FR enmendados v9.1:**

| FR | Historias |
|---|---|
| FR-1, FR-52, FR-53 | 35.2 |
| FR-2 | 35.1, 35.4 |
| FR-3, FR-18, FR-19, FR-57 | 35.4 |
| FR-8, FR-9, FR-16, FR-25, FR-30 | 35.7 |
| FR-13 | 35.1 |
| FR-15 | 35.1 (aptas), 35.2 (claves) |
| FR-38, FR-40, FR-56 | 35.3 |
| FR-41 | 35.1 |
| FR-51, FR-54, FR-62 | 35.4 y 35.9 |
| FR-55 | 35.5 |

**Métricas:**
- SM-C4: 32.4, con el corte de la 32.3.
- SM-C5 y su palanca: 30.1, con el corte de la 31.2.
- SM-C1: 35.7.
- SM-C2: 35.3.
- SM-C6: 35.8.

**UX-DR113…148.** Todos tienen historia:

| UX-DR | Historias |
|---|---|
| 113 | 30.1 |
| 114, 115 | 30.2 |
| 116 | 29.3 |
| 117 | 34.0 |
| 118 | 31.2 |
| 119 | 30.3 |
| 120, 121 | 30.4 |
| 122 | 30.1, 35.4, 35.9 |
| 123 | 28.2 y 30.2 (la fila) |
| 124, 125 | 32.4 |
| 126 | 32.2 |
| 127 | 32.4, 33.2, 35.9 |
| 128 | 32.3 |
| 129 | 32.5, 35.9 |
| 130 | 34.2, 35.3 |
| 131 | 34.1 |
| 132 | 29.3, 34.1, 35.4 |
| 133 | 34.3 |
| 134 | 35.3 |
| 135–137 | 35.4 |
| 138 | 35.6 |
| 139 | 35.8 |
| 140–142 | 35.5 |
| 143–148 | Cada historia, en lo que construye |

**AD-29…35:**

| AD | Historias |
|---|---|
| AD-29 | 29.1–29.3; la cláusula v9.1, 35.1 |
| AD-30 | 31.1, 32.3; v9.1, 35.4 y 35.9 |
| AD-31 | 32.1, 32.2 |
| AD-32 | 35.1, 35.7, 35.8 |
| AD-33 | 35.2–35.5 |
| AD-34 | 35.6 |
| AD-35 | 35.6 (la orden `atribuida`), 35.8 |

Las enmiendas de AD-1, AD-3, AD-4, AD-8, AD-11, AD-13, AD-17, AD-20, AD-23, AD-24, AD-25, AD-27 y AD-28 están, cada una, en su historia. Las constantes con nombre de AD-9 entran todas, y sin valor de agente.

Huecos de cobertura, todos menores:
- **FR-66, la «tríada» de la semblanza de Personaje** (quién es, en qué Obra, por qué se le cita): ningún criterio la exige. La 35.2 solo rechaza años. Es aceptable, porque la escribe una persona.
- **FR-14, «Con los pobres de la tierra» dos veces:** el PRD lo presenta como una repetición; la 29.4 lo trata como una contención dentro de la estrofa III. El caso real queda cubierto igual.

## 2. Dependencias hacia delante dentro de cada épica

**Épica 29 — pasa.**
- 29.1 → 29.2 → 29.3, y la 29.4 es independiente.
- La 29.1 nombra en su prueba de «solo estos módulos miran saltos» a `tools/lib/pasaje.ts` (31.1 y 32.3). Es una lista que se ampliará, no una dependencia (m4).

**Épica 30 — pasa.**
- La 30.3 ya no construye la primitiva: la toma de la 34.0, que tiene que estar antes en la principal.
- La 30.4 usa la isla de la 30.3, y la 30.5 va la última.
- La 30.2 depende de la fila que la 28.2 ya construye. La 28.2 está redactada en el orden v9 (línea 8370 y siguientes), así que es coherente.

**Épica 31 — pasa.** La 31.1 entrega lo que la 31.2 pinta.

**Épica 32 — FALLA (B1).**
- La **32.2** pinta «· Traducción de {traductor}» en la línea de Ficha técnica «solo si todas las Citas de esa Fuente declaran el mismo, la regla de `referenciaDeObra` (32.5, AD-28)».
- Esa regla no existe hasta la 32.5. `dondeLeer` (`src/lib/obras.ts:1332`) agrupa hoy por el par (Fuente, traductor) y ordena por recuento, así que no responde a «todas las Citas de la Fuente que encabeza declaran el mismo traductor».
- La 32.2 tendría que escribir esa regla antes que su dueño nombrado: o bien hay dos implementaciones, o bien la 32.5 acaba reescribiendo la de la 32.2.
- **Arreglo:** que la 32.2 cree la función —por ejemplo `traduccionDeLaEdicionQueEncabeza` de `obras.ts`, nombre de trabajo— y que la 32.5 la consuma en `referenciaDeObra`; o bien que el traductor de la línea pase a la 32.5.
- Lo demás de la 32 está bien:
  - La 32.3 y la 32.4 dejan la página en el orden de UX-DR124 con lo que ya existe.
  - La 32.3 nombra en un comentario `DESPLIEGUE_DE_LA_OBRA_COMO_DESTINO` y el juicio de SM-C4 de la 32.4. Es una referencia hacia delante de redacción, sin código (m3).

**Épica 33 — pasa.** La 33.1 y la 33.3 son independientes; la 33.2 va tras la 32.4 y la 33.1.

**Épica 34 — pasa.**
- La 34.0 va primera y no depende de nada. Su `dist/` no cambia, y el paso de accesibilidad que abre los `<details>` no cambia ningún resultado: hoy no hay ningún `<details>` en `src/`, comprobado.
- La 34.2 va tras la 34.0.
- La 34.1 depende solo de la Épica 29; la 34.3, de nada.

**Épica 35 — pasa.**
- La secuencia declarada es correcta. La 35.4 y la 35.9 añaden exclusiones en puntos con nombre que ya dejaron la 30.3, la 31.1, la 32.3, la 32.4 y la 32.5.
- La 35.10 usa `formas-vedadas.yml` (35.7) y Personajes (35.2), pero declara solo la 35.6 (m5). El orden numérico lo salva.

## 3. Dependencias entre épicas — Pasa con reservas

**Piezas con nombre.** Cada una la crea una sola historia y la consumen las que dicen:

| Pieza | Historia que la crea |
|---|---|
| `formaDeLasLineas`, `tramoEnCrudo`, `textoConSaltos` | 29.1 |
| `versosDe`, `enUnaLinea` (`src/lib/verso.ts`), `TextoDeCita.astro` | 29.3 |
| `parecidoEntre` | 29.4 |
| `Desplegable.astro` | 34.0 |
| `referenciaDeCita`, `nombreEnReferencia`, `fechaDeConsulta`, `MARCADOR_DE_FECHA_DE_CONSULTA`, `citaTieneComoCitar` | 30.3 |
| `fragmentoParaInsertar` | 30.4 |
| `copiado-de-referencia`, `copiado-de-fragmento` | 30.5 |
| `pasajeDeAparicion`, `ofrecePasaje`, `aparicionQueCuenta` | 31.1 |
| `incipitDe`, `ofreceIncipit` | 32.3 |
| `textoDeLoTomado` | 32.4 |
| `referenciaDeObra`, `obraTieneComoCitar` | 32.5 |
| `TiendaConMarca` | 33.1 |
| `edicionesPorFormato` | 33.2 |
| `curar-primero` | 33.3 |
| `recortarPorPalabra` | 34.1 |
| `esAtribuida`, `derechosVigentes`, `dominioDeAtestiguacion`, `clases-de-cita.yml` | 35.1 |
| `dueñoPorPrefijo`, `personajesPublicados` | 35.2 |
| `rutaDePersonaje` | 35.3 |
| `REGIONES_DE_VARIANTE`, `npm run atribuida` | 35.6 |
| `formas-vedadas.yml` | 35.7 |

**Ninguna pieza se cita sin creador ni la crean dos.** La única excepción es la del apartado 2 (B1). Lo más parecido a un hueco de creador es la composición de «Cómo citar», que la 32.5 da por reutilizable (I3).

Reservas:
- **I1. La cadena con la v8 frena casi toda la v9.**
  - La 30.1 exige en la principal las Épicas 25 y 28. La 28.2 pide además la 25.6 y la Historia de Instagram.
  - La 28.5 no se funde antes del 2026-12-05, por SM-11, y la Épica 25 lleva dos historias operativas de Héctor, la 25.3 y la 25.7.
  - Como la unidad de fusión es la épica, también esperan la 31, la 32, la 33.2 y la 35. Antes solo pueden avanzar la 29, la 34 (la 34.0 sola, incluso antes) y la 33.1 y la 33.3.
  - Es coherente con las decisiones del 11-07, pero ningún sitio lo dice junto. Conviene anotarlo en `sprint-status.yaml`.
  - Consecuencia: la rama de la 32.4 para cuando «Compartir en» de la 25.6 no está en la principal no puede darse, porque la 30 ya exige la 25 entera. Se puede quitar.
- **I2. La 34.0 rompe el orden numérico y la unidad de fusión.** Está en la Épica 34, pero se funde sola antes que la 30. Está declarado en las notas de la 30 y de la 34. Para que no lo pierda un bucle de construcción, conviene marcarlo en `sprint-status.yaml` o renumerarla, por ejemplo como 29.5 o 30.0.
- **I3. La 32.5 reutiliza «la composición de la Página de Cita de la 30.3»,** pero la 30.3 no crea un componente con nombre para los tres estilos apilados. O la 32.5 lo duplica, o refactoriza lo de la 30. Arreglo: que la 30.3 cree `ComoCitar.astro` (nombre de trabajo), que reciba sus Referencias ya compuestas.
- **m8. La 34.3 incluye el campo de la portada (28.1),** pero la 34 puede fundirse antes que la 28: la que llegue después integra a la otra. Conviene decirlo.

## 4. Calidad de historia — Pasa con reservas

- Sin marcadores sin rellenar. Los criterios son verificables (Vitest sobre `dist/`, Playwright local, códigos de salida, `dist/` idéntico) y los `[ASSUMPTION]` están marcados como revisables.
- **I4. La 35.1 y la 35.3 son grandes para una pasada de agente.**
  - La 35.1 tiene 13 Given y unos nueve subsistemas: `clase.ts`, la unión discriminada de Autor, `tldts` y las atestiguaciones, cinco topes, la figura pública, el registro de clases con su prueba contra el primer padre y el CI, la derivación en el alta, el cotejo, la portada y AD-27.
  - La 35.3 tiene 15 Given: la superficie, la indexación, la página, la Tarjeta Social, el JSON-LD, NFR-5, el tipo de resultado, cinco series, AD-27 y la medición.
  - Se pueden completar, pero conviene partirlas. Por ejemplo, la 35.1 en «clase y puerta» y «registro de clases y alta»; la 35.3 en «página y superficie» y «familia en series y búsqueda».
- **I5. La Tarjeta Social de Personaje (35.3)** «declara» `/tarjeta/personaje/{slug}.png`, pero no dice que construya el endpoint, `src/pages/tarjeta/personaje/[slug].png.ts`, como existen los de `autor/`, `obra/` y los demás. Si solo se declara, toda Página de Personaje sale con un `og:image` en 404.
- Menores de redacción:
  - m1: la 29.3 dice que la meta descripción se recorta hoy a 110, pero hoy lleva el texto entero (`src/pages/cita/[slug].astro:101`). La 34.1 lo dice bien.
  - m2: la 29.1 y la 29.3 cuentan el salto como un carácter, y la 34.1 deja de contarlo para el recorte: el corte de una Cita en verso se mueve entre las dos épicas. La 34.1 debería decirlo como cambio.
  - m6: la 35.1 no dice qué valor deja `AÑO_DE_REFERENCIA` en el árbol («el agente la propone»).
  - m7: la 35.1 exige que el checkout del CI traiga el primer padre, sin nombrar el fichero de flujo.
  - m11: mientras la 35.5 no llega, ningún criterio fija que una Página de Personaje de prueba quepa en `MAX_SALTOS_DESDE_LA_PORTADA` por Tema → Cita → Personaje.
  - m12: la 32.2 y la 32.4 dicen `data-pagefind-ignore` sin `="all"`, cuando `AGENTS.md` y las demás historias exigen `="all"`.
  - m13: el inventario sigue diciendo «Todavía no hay épicas de la v9» (línea 8643) y «Sin épicas numeradas todavía» (línea 9031).

## 5. Rotación de ficheros — Justificada

- `src/pages/cita/[slug].astro` lo tocan nueve historias: 30.1, 30.3, 30.4, 31.2, 34.1, 35.4, 35.6 y 35.8 directamente, y la 29.3 a través de `BloqueDeCita`.
- La página de Obra la tocan siete: 32.2–32.5, 33.2, 35.4 y 35.9.
- `atribucion.ts`, `umbrales.ts`, `fecha-de-cambio.test.ts` y `linea-base.test.ts` los tocan casi todas, pero son dueños únicos por diseño.

El troceo tiene una razón medible:
- La 30 y la 31 parten la misma Página de Cita en dos llegadas en vivo, con cortes de SM-4 y SM-C5 distintos.
- La 32 y la 33 separan la página 1 de Obra con el Modelo apagado (SM-C4) de la venta.
- La 35 no cambia `dist/` mientras la puerta siga cerrada.

La única rotación sin razón de medición es la de la 34.1 sobre el título y la meta de la Página de Cita. Es barata y no mueve ninguna serie, así que no hace falta fundirla en la 30.

## 6. Reglas del proyecto — Pasa con una incoherencia

- **Umbrales, tiendas y marcas.** Nacen en `undefined` o vacíos:
  - `MAX_CARACTERES_DEL_PASAJE` y `MAX_CARACTERES_DEL_INCIPIT`;
  - los cuatro topes de la atribuida y `BUZON_DE_PETICIONES`;
  - las cinco constantes de despliegue;
  - las tres de SM-C6;
  - el plazo de respuesta;
  - la lista de la semilla;
  - `TIENDAS` sin ninguna tienda real.

  Llevan valor solo los fijados por Héctor o por el PRD: `MAX_OBRAS_ANTES_DE_LAS_CITAS` (3), `MIN_CITAS_POR_PERSONAJE` (2) y los topes 120 y 110 con su valor de hoy. Las pruebas trabajan sobre copias.
- **`--remote` y `desplegar`.** Solo los corre Héctor (30.5). El agente corre `ensayo` en local. La rama de la 30 no se funde con la huella en rojo.
- **`superficies.ts`.** La Página de Personaje entra en la 35.3, con familia, vista, indexación y barrido. No hay más páginas nuevas. Los endpoints de tarjeta no son superficies hoy (solo hay constantes de tarjeta en `superficies.ts:413-424`).
- **`GUIONES_EXTERNOS`.** La isla de la Obra entra en la 32.5 con su tope. `imagen.js` (29.3) y los guiones del filtro y de la búsqueda (35.5) crecen dentro de su entrada. La 34.0, la 31.2 y la 33.2 no añaden guion.
- **I6. Incoherencia sobre quién sube un tope de guion.**
  - La 30.3, la 30.4 y la 30.5 permiten que el agente suba `MAX_BYTES_DE_GUION` «en el mismo diff, como isla que entra a propósito».
  - La 35.5 deja la subida de `MAX_BYTES_GUION_DEL_FILTRO` y `MAX_BYTES_GUION_DE_LA_BUSQUEDA` a Héctor.
  - La propia 30.3 dice además que, ante el aviso de peso, «ningún umbral se toca».
  - Hay que unificar el criterio: o lo sube el agente con la cifra medida, o lo decide Héctor.

---

## Resumen

**Bloqueante (1):**
- **B1 — 32.2:** pinta el traductor con «la regla de `referenciaDeObra` (32.5)», que no existe hasta la 32.5. Es una dependencia hacia delante dentro de la épica y deja el dueño de la regla ambiguo.

**Importantes (6):**
- I1: casi toda la v9 espera a que se fundan las Épicas 25 y 28; la 28 no antes del 2026-12-05. Además, la rama de la 32.4 para cuando la 25.6 no está en la principal no puede darse.
- I2: la 34.0 se funde sola, antes que la 30, y rompe el orden numérico.
- I3: la 32.5 reutiliza una composición de la 30.3 sin componente con nombre.
- I4: la 35.1 y la 35.3 son demasiado grandes.
- I5: el endpoint de la Tarjeta Social de Personaje sin construir.
- I6: quién sube los topes de guion.

**Menores (13):** m1–m8 y m11–m13 en los apartados anteriores; m9 y m10, en los huecos de cobertura.

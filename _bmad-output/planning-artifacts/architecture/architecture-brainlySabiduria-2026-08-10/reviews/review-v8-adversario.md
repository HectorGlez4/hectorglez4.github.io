---
title: "Lente adversaria — la espina v8 contra sus propias historias"
status: final
created: 2026-10-18
lens: adversarial (Finalize, `finalize_reviewers`)
against:
  - 'ARCHITECTURE-SPINE.md (sin commitear; git diff del 2026-10-18, +199/−85)'
  - '.memlog.md (D-1…D-16 del 2026-10-18)'
also_read:
  - 'reviews/reconcile-v8-prd.md y reviews/reconcile-v8-ux.md (para no repetirlos)'
  - 'PRD v8.1 (§4.1, §4.4, §4.5, §4.7, §4.9, §4.19–§4.21, §6.7) y addendum v8'
  - 'EXPERIENCE.md v8 (líneas 145–154, 251–260, 424–427)'
  - 'Código citado en cada hallazgo; documentación de Pagefind 1.5 y de Astro (vía context7)'
---

# Lente adversaria — la espina v8 contra sus propias historias

**Veredicto: la espina v8 no deja ningún agujero de dirección.** Nada en ella permite que el sitio lea de D1, que el build pida nada por la red ni que un Modelo entre en una superficie de lectura. Lo que deja son **parejas de historias de las Épicas 23–28 que cumplen cada AD a la letra y aun así construyen cosas incompatibles**. Las cinco más graves están en cuatro sitios: Pagefind, que recoge más de lo que la espina cree; el orden del libro, que tiene dos dueños; la relación de AD-27, que es por fichero cuando su criterio es por campo; y los veredictos del build que dependen de la jornada. Todas se cierran precisando AD que ya existen. Solo una pide un AD nuevo: que ningún veredicto del build dependa de la jornada.

**Recuento:** 5 altos · 6 medios · 5 bajos. Ninguno contradice una decisión de Héctor.

**Método.** Para cada AD enmendado en la v8 se construyeron dos historias plausibles, un nivel por debajo de la épica, que obedecen la regla tal como está escrita. Después se buscó dónde chocan: formas de datos compartidas, dos dueños de una entidad, dos caminos que mutan el mismo estado y fechas que se contradicen. Cada pareja se contrastó con el código del repositorio o con la documentación de la herramienta, y está marcada como hecho cuando lo es. Lo que ya dicen los dos cotejos (`reconcile-v8-prd.md`, `reconcile-v8-ux.md`) no se repite, salvo para nombrar dónde un hallazgo de aquí lo amplía.

Las líneas citadas de la espina son las del fichero en el árbol de trabajo.

---

## Altos

### A1. El orden entre los documentos de una Obra tiene dos dueños, y la forma del cargador impide que `obras.ts` sea el único

- **Espina:**
  - AD-23 v8 (l. 290): la posición la da «el **mismo localizador** que el cotejo», y el cargador «guarda solo `{slug → documento, posición}`».
  - AD-23 v8 (l. 291): «Una Cita que aparece en varios documentos toma la posición del primero en el orden de la Obra», y ese orden es el índice de la Fuente o «el orden natural del slug de página con los números romanos leídos».
  - AD-25 v8 (l. 325): «`obras.ts` es el único dueño del orden».
- **La pareja:**
  - **Historia 24.a — «el cargador de posiciones».** Reutiliza el localizador del cotejo tal cual, como pide AD-23. Para cada Cita recorre `documentosDeCita` y guarda el primer documento donde la encuentra, porque la forma que fija la espina admite un solo par `{documento, posición}`.
  - **Historia 24.b — «el orden del libro en `obras.ts`».** Ordena las Citas documento a documento con la heurística de AD-23: orden natural y números romanos leídos.
- **Qué se rompe.** El orden del cotejo no es el de la Obra. `documentosDeCita` ordena con `localeCompare(…, 'es')` sin orden numérico (`tools/lib/cotejo.ts:241`), así que pone `…--capitulo-10` antes que `…--capitulo-2` e `…--ix` antes que `…--v`. Una Cita que aparece en dos páginas recibe la posición de la página que va primero en el alfabeto, y `obras.ts` la coloca entre las Citas de otra página. «Siguiente» se salta Citas o vuelve atrás, el listado de la Obra sale desordenado en sus páginas 2+ y `data-pagefind-sort` hereda el error. Nada falla.
- **El cargador no tiene con qué cumplir la regla.** El «orden de la Obra» depende de las Fichas de Obra: `reunir` junta grafías con prefijos de documento distintos, y eso solo lo resuelve `obras.ts`. Un cargador de `content.config.ts` que tuviera que elegir «el primero en el orden de la Obra» tendría que leer las fichas y reimplementar la resolución. Ese sería el segundo dueño.
- **No es el hueco 1.7 de la UX.** Aquel trata dos **Fuentes** de una misma Obra. Este se da dentro de una sola Fuente paginada, que es el caso que AD-23 sí cree resuelto.
- **Cierre (AD-23 y AD-25, más estrictos):**
  - el cargador guarda **todas** las apariciones, `{slug → [{documento, posición}]}`, sin ordenarlas ni elegir;
  - `obras.ts` es el único que ordena documentos —con el índice versionado o la heurística— y elige la aparición que cuenta;
  - el orden de `documentosDeCita` no significa nada fuera del cotejo;
  - una prueba fija que ni el cargador ni el cotejo ordenan documentos para nadie más.

### A2. Pagefind recoge filtros y metadatos dentro de `data-pagefind-ignore` y desde componentes reutilizados: el filtro de Obra devuelve Citas de otra Obra

- **Espina:**
  - AD-11 v8 (l. 150): las opciones y el `data-pagefind-filter` de cada Cita salen de «una sola función que compone las dos cosas».
  - AD-19 v8 (l. 242): lo que enumera la Página de Cita «queda fuera del cuerpo de Pagefind».
  - AD-12 v8 (l. 162): la Cita del Día de la portada «gana su Tarjeta de Obra y las acciones de su Página de Cita».
- **El hecho, en la documentación de Pagefind 1.5:** el valor por omisión de `data-pagefind-ignore` es `index`, que excluye el texto pero **sigue procesando los filtros y los metadatos** de dentro. Solo `data-pagefind-ignore="all"` los excluye. Además, «el atributo `data-pagefind-filter` sigue aplicándose si está en un elemento `data-pagefind-ignore` o dentro de él», y lo mismo `data-pagefind-meta`.
- **La pareja:**
  - **Historia 27.a — «filtros de Pagefind».** Cumple AD-11 con una sola función, y la llama donde ya se pinta cada entidad: la Tarjeta de Cita (el componente único de AD-19), la Atribución y la Tarjeta de Obra.
  - **Historia 24.c — «rutas de salida».** Mete las siete Tarjetas de «De la misma obra» y «Más de {Autor}» en un `data-pagefind-ignore` sin valor, como ya hace `RutasDeSalida.astro:43`.
- **Qué se rompe:**
  - la Página de Cita A acaba con los valores `obra` de las cuatro Citas de «Más de {Autor}», que por FR-12 son de **otras** Obras: filtrar por la Obra Y devuelve A;
  - los listados de Tema, Autor y Colección llevan los filtros de cada Tarjeta que listan, así que salen en una búsqueda filtrada, y FR-7 promete «con un filtro puesto, los resultados son solo Citas»;
  - la portada, al reutilizar los componentes de la Cita del Día (AD-12), lleva los filtros y la clave de orden de la Cita de hoy. Además no declara tipo (`src/pages/index.astro:56–62`) y por eso cae en `TIPO_POR_OMISION = 'cita'`: sale rotulada «Cita» en la búsqueda filtrada por ese Autor y en la búsqueda de cualquier fragmento de la Cita del Día;
  - los recuentos de Obra que da `pagefind.filters()` cuentan **páginas** y salen inflados frente a los que pintan la Tarjeta de Obra y el Directorio, que salen de `publicado.ts`. Una misma cifra llega por dos dueños.
- **Cierre (AD-11 y AD-19, más estrictos):**
  - los filtros, los metadatos y la clave de orden de una Cita los escribe **un solo componente**, y solo en la Página de Cita, fuera de todo bloque reutilizable;
  - todo bloque que enumera Citas, y el bloque de la Cita del Día, lleva `data-pagefind-ignore="all"`;
  - la portada declara su tipo y responde solo por su título, como los Directorios;
  - una prueba sobre `dist/` exige que todo registro con filtro `autor` sea una Página de Cita, con un solo valor por clave y que ese valor sea el suyo, y que los recuentos de `filters()` coincidan con los del build.

### A3. `data-pagefind-sort`: una ausencia saca la Cita de los resultados, y una clave de texto contradice el orden del Directorio

- **Espina:** AD-25 v8 (l. 326): «una sola clave compuesta en el build: el orden del Directorio del Autor, después el de su lista de obras y después el del libro». La convención de ausencia (l. 372): «un campo opcional ausente se omite».
- **El hecho, en la documentación de Pagefind 1.5:**
  - «Las páginas que omiten `data-pagefind-sort` para una clave **se omiten de los resultados** si se aplica ese orden».
  - Si todos los valores de una clave se pueden leer como números, el orden es numérico. Si uno solo no se puede, **todos se ordenan alfabéticamente**.
- **La pareja:**
  - **Historia 27.b** aplica `sort` a la búsqueda filtrada, para que «Mostrar 30 más» siga un orden estable.
  - **Historia 24.d** compone la clave y, siguiendo la convención de ausencia, no la escribe en una Cita sin Obra, porque esa Cita no tiene puesto en ninguna «lista de obras».
- **Qué se rompe:**
  - **Hoy hay 4 Citas publicadas sin Obra.** Dos son de Concepción Arenal (`concepcion-arenal--abrid-escuelas…`, `…--odia-el-delito…`) y una de Martí. «Buscar en Concepción Arenal» las pierde en silencio, mientras su recuento dice que están.
  - **Una clave de texto no sigue el Directorio.** Otro constructor compone `Cervantes|don-quijote|…` con las claves de orden. El orden alfabético de Pagefind va por la posición de cada carácter en Unicode, que no es la comparación de la función hermana de AD-3. Con él, «Álvarez» y la Ñ van detrás de la Z.
  - **Una clave sin relleno de ceros no ordena los números.** Un tercero compone `12-3-45` y obtiene `12-10` antes que `12-3`.
- **Cierre (AD-25):**
  - la clave es un entero, o dígitos de ancho fijo, compuesto por `obras.ts` a partir de los rangos de la función hermana de AD-3;
  - va en **toda** Página de Cita, con un hueco declarado para «sin Obra» y otro para «sin documento». Es la excepción declarada a la convención de ausencia, porque aquí la ausencia no se lee como «no consta»: Pagefind la lee como «fuera»;
  - el orden se aplica solo cuando los resultados son solo Citas;
  - una prueba sobre `dist/` exige que todo registro de tipo Cita lleve la clave y que todos los valores sean numéricos.

### A4. La relación de AD-27 va por fichero y su criterio, por campo: la clave de orden refecha y avisa el sitio entero

- **Espina:**
  - AD-27 v8 (l. 348–349): el criterio es «lo que la superficie afirma, no todo lo que pinta».
  - AD-27 v7.1 (l. 347): la relación va «de cada superficie a los ficheros que renderiza».
  - AD-1 v8 (l. 69–72) y la convención de ficheros (l. 366): `ordenAlfabetico` y `ordenRevisado` son campos **del fichero del Autor**.
- **La pareja:**
  - **Historia 26.a — «clave de orden».** FR-15 pide que la herramienta «la proponga en lote para los Autores que ya existen». Es un commit que toca los 171 ficheros de `corpus/autores/`.
  - **La relación vigente.** La Página de Cita se compone con el fichero de su Autor, porque pinta su nombre y sus años (`tools/lib/cambios.ts`, bucle de las Citas; `DatosEstructurados.astro:42–43`).
- **Qué se rompe:**
  - **Un solo commit mueve casi todo el sitemap.** Mueve el `lastmod` de las 4.420 Páginas de Cita, de todos los listados de Autor, Tema y Colección y de todas las Páginas de Obra.
  - **Y avisa de todo.** La lectura inversa de `tools/avisar.ts` manda a IndexNow cada ruta indexable del sitio, cuando ninguna Página de Cita pinta la clave de orden. Es exactamente lo que AD-27 v8 existe para impedir —«lo que enseña a los buscadores a ignorar el aviso»—, multiplicado por catorce sobre el caso de Unamuno.
  - **Se repite con cada revisión.** Cada tanda de revisiones de Héctor escribe `ordenRevisado` y vuelve a pasar lo mismo.
  - **El campo de la Ficha de Obra tiene el mismo problema.** La `nota` de Héctor, `ediciones` (`npm run obra -- edicion`) y `distintaDe` refechan y avisan todas las Páginas de Cita de esa Obra. Desde la v8 también todos los listados que contienen alguna de sus Citas, porque «los listados ganan las fichas de Obra» (l. 350). Ninguno de esos campos se pinta ahí.
  - **La semblanza también, y ya pasa hoy.** Su edición refecha las Páginas de Cita del Autor, que no la pintan. El criterio nuevo lo convierte en una contradicción declarada.
- **Cierre (AD-27, más estricto):**
  - la relación va de cada superficie a **(fichero, campos que pinta)**, y un commit fecha y avisa una superficie solo si cambió uno de esos campos. El mecanismo es del código: cotejar la proyección de los ficheros de Autor y de Ficha de Obra en cada commit que los toca son 171 + 520 ficheros;
  - `ordenAlfabetico` y `ordenRevisado` fechan solo los dos Directorios;
  - `nota` y `ediciones` fechan solo la Página de Obra;
  - una prueba fija que un commit que solo escribe claves de orden mueve `/autores/` y `/obras/`, y nada más.

### A5. Dos veredictos del build dependen de la jornada, y la reconstrucción diaria puede romperse sin commit

- **Espina:**
  - AD-11 v8 (l. 154): `superficiesInalcanzables` rompe el build «sobre el grafo de enlaces del `dist/` real».
  - AD-6 v8 (l. 105): `MAX_BYTES_DE_GUION` se mide «en cada» superficie pública.
  - AD-12 (l. 160–162): la Cita del Día y las seis Obras rotan con la fecha del build.
  - `publicar.yml` corre `npm run build` y `npm test` también en el disparador programado (`cron: '15 5 * * *'`, l. 25–26, 83 y 96).
- **La pareja:**
  - **Historia 26.b — «NFR-5 en el build».** Mide el grafo real, como manda AD-11.
  - **Historia 28.a — «portada».** La Cita del Día, su Tarjeta de Obra con «Siguiente» y las seis Obras dan a algunas Citas una ruta de uno o dos saltos que **cambia cada día**.
- **Qué se rompe:**
  - **NFR-5 depende del día.** Tomemos una Cita sin Tema publicado, en la página 2+ de un Autor no destacado y en la página 1 de una Obra pequeña. El día que esa Obra sale en la portada, la Cita queda a dos saltos; al día siguiente, a cuatro. El build de las 05:15 UTC rompe sin que nadie haya commiteado nada, y el sitio en vivo se congela como el 2026-10-11. El hueco 2 del cotejo del PRD trata las retiradas; este no necesita ninguna.
  - **El tope de guion depende del día.** Pasa igual con el tope en la portada. `CopiarCita.astro:93` mete el slug en el guion en línea (`define:vars={{ … INSTANCIA: instancia }}`, con `instancia = cita.slug`), así que los bytes en línea de la portada cambian con la Cita del Día. Medido sobre el `dist/` real, el tope pasa el día del commit y rompe el día que rota una Cita de slug largo. Medido sobre un sitio de prueba con `FECHA_JORNADA` fija, no ve nunca el peor caso.
- **Cierre (AD nuevo, o precisión de AD-12): un veredicto del build es función del commit, no de la jornada.**
  - el grafo de NFR-5 se calcula **sin** los bloques que rotan con la jornada;
  - un tope de una superficie que rota se mide sobre el peor caso de su rotación —las aptas y las fijaciones—, o ningún guion en línea lleva datos de contenido: van en `data-*`, que no son bytes de guion, y el peso en línea queda constante por familia;
  - una prueba construye dos jornadas del mismo commit y exige los mismos veredictos.

---

## Medios

### M1. El plano de un guion empaquetado lo decide su tamaño y el de sus vecinos

- **Espina:** AD-6 v8 (l. 109): la lista cerrada de guiones externos, «cada uno con su tope», y «`bytesDeGuionEnLinea` cuenta cero a un `<script src>`». La convención de guiones (l. 370).
- **El hecho, en la documentación de Astro:**
  - un `<script>` procesado «lo bastante pequeño» **se inserta en línea** en el HTML. El límite es `vite.build.assetsInlineLimit`, 4 KB por omisión;
  - los módulos compartidos se trocean en *chunks* aparte.
- **La pareja:**
  - **Historia 26.c — «filtro de los Directorios».** Pesa unos 3 KB y se inserta en línea: cuenta contra `MAX_BYTES_DE_GUION` de `/autores/` y `/obras/`, no contra su propio tope.
  - **Historia 27.c — «búsqueda».** Importa también `normalizar` y `umbrales`, y Rollup los saca a un *chunk* compartido. El filtro, sin que nadie lo toque, pasa a ser un módulo en línea que importa `/_astro/normalizar.[hash].js`: un guion externo que no está en la lista y no tiene tope.
- **Qué se rompe.** La prueba de la lista cerrada falla en una historia que no tocó el filtro, o se escribe para contar solo entradas y el *chunk* escapa. Esa segunda opción es la «salida falsa» que D-1 vino a cerrar.
- **Cierre (AD-6):**
  - un guion empaquetado es **siempre** externo, impuesto en la configuración del build;
  - la lista cerrada nombra entradas, no ficheros;
  - el tope de cada entrada cuenta todo lo que importa de forma estática, *chunks* incluidos, medido por página como bytes que se descargan al cargar.

### M2. Las familias de superficie no tienen el dueño que la espina les da

- **Espina:**
  - AD-17 v8 (l. 222): «El conjunto cerrado de familias gana `directorio`», y sus copias «se fijan contra él».
  - Convención de conjuntos cerrados (l. 376): «Las familias tienen su dueño en `superficies.ts`».
  - AD-24 v8 (l. 307): `directorio` entra en las cinco series.
- **El hecho, en el código:**
  - `src/lib/superficies.ts` no declara ningún conjunto de familias;
  - el dueño real es `tools/lib/indexacion.ts:58–74`, con `FAMILIAS` (cuatro) y `FAMILIAS_DE_LA_SERIE` (cinco, con `obra`), además de `FamiliaAvisable` en `tools/lib/avisar.ts:17`;
  - la Obra se mide solo en la indexación; tráfico, demanda, rastreo y canal usan las cuatro.
- **La pareja:**
  - **Historia 26.d** añade `directorio` donde vive `FAMILIAS`. Por importación, entra sola en tráfico, demanda, rastreo y canal, y la Obra no.
  - **Historia 23.a** cree a la espina y crea el conjunto en `superficies.ts` con seis valores.
- **Qué se rompe.** Quedan dos dueños con contenidos distintos, uno con Obra y otro sin ella, y la prueba «contra él» no sabe contra cuál.
- **Cierre (AD-17):**
  - el conjunto vive en `superficies.ts` con seis valores;
  - cada serie declara **su subconjunto** como constante con nombre derivada de él —sin Obra donde §6.7 lo deja fuera—;
  - la prueba fija subconjuntos, no igualdad;
  - corregir la frase de la convención, que hoy describe un estado que no existe.

### M3. Una salida no fecha: el aviso anuncia lo que el sitemap dice que no cambió

- **Espina:** AD-27 v8 (l. 352): «Los Directorios entran con todo lo que pintan, también las Citas por sus recuentos». AD-27 v7.1 (l. 347): una relación con dos lecturas que una prueba fija como inversas.
- **El hecho, en el código:**
  - el `lastmod` sale de `fechaMasReciente` sobre los ficheros **presentes** (`tools/lib/cambios.ts`);
  - el aviso usa además `relacionAntes`, «que sabe a qué páginas pertenecía un fichero que este rango borró» (`tools/lib/avisar.ts:76–79`).
- **La pareja:**
  - **Historia 26.e — Directorios en la relación.** Mete los Directorios en la relación «por sus recuentos».
  - **`documentar --retirar`.** Mueve una Cita a `corpus/_revision/`.
- **Qué se rompe:**
  - baja el recuento de `/autores/`, de `/obras/`, de la Obra y del Tema;
  - el aviso los anuncia;
  - el `lastmod` de esas mismas URL no se mueve, o retrocede al fichero presente más reciente;
  - la justificación de l. 352 solo vale cuando el recuento sube.
- **Cierre (AD-27):**
  - un fichero que sale del Corpus fecha las superficies que componía en la relación de antes, con la fecha del commit que lo sacó;
  - la prueba de inversas se escribe también sobre un corpus con una baja.

### M4. «Se resuelve contra el censo» no dice qué censo, y la familia Obra de la medición se parte en dos

- **Espina:**
  - AD-13 v8 (l. 176): «La superficie de un registro … en `tools/` se resuelve contra el censo, nunca por el prefijo».
  - AD-24 (l. 306): el censo de las series es `rutasIndexables`.
  - FR-56 y §7, SM-4: la continuación cuenta «la Página de Obra incluida, se indexe o no».
  - AD-13 v8 (l. 177): `indexable` es columna nula fuera de `vista-de-obra`.
- **La pareja:**
  - **Historia 23.b — «continuación por superficie».** Usa el censo de las series, que es el único que define la espina. Las Obras con `noindex` caen en `fueraDelCenso`, y la continuación de esas unas 240 páginas desaparece. Es la misma cifra con la que SM-C4 juzgará la afiliación.
  - **Historia 23.c — «SM-11 por vistas de Obra».** Parte la familia por la marca que trae cada `vista-de-obra`.
- **Qué se rompe:**
  - en una misma jornada, lecturas y vistas de la familia Obra no casan;
  - cuando cambia la indexabilidad —la congelación, o la autocorrección de FR-52—, la marca del evento y el censo de hoy discrepan;
  - la serie de tráfico «reatribuye los meses pasados con el censo de hoy», y la de indexación lee la Obra del sitemap publicado: ya hay tres censos.
- **Cierre (AD-13):**
  - el censo de la medición es `rutasPublicadas` con `causaDelServicio`: la forma se excluye y el contenido entra;
  - la indexabilidad de un registro es la del commit en vivo en su jornada, reconstruible con git como ya hace el aviso con `--desde`. La alternativa es llevar `indexable` también en la `lectura` y en la `salida-interna` de una Página de Obra, enmendando «nula fuera de su evento»;
  - una de las dos, escrita en la espina.

### M5. Revertir el receptor no tiene orden

- **Espina:** AD-14 v8 (l. 187): «el orden es migración, receptor, sitio». El entorno operativo (l. 465): «la reversión sigue siendo volver a desplegar un commit anterior del sitio **o** del receptor».
- **La pareja:**
  - **Historias 23.d y 23.e** despliegan en el orden de la espina: migración, receptor v8 y, el último, el sitio que emite `lectura`, `zona` y `via`.
  - **Una incidencia en el receptor** se revierte solo en el receptor, como permite la l. 465.
- **Qué se rompe.** El receptor anterior a la v8 «descarta entero» todo evento que no conoce: `lectura`, `salida-interna`, `busqueda` y `vista-de-obra`. Además deja `via` en nulo. Salen días de ceros indistinguibles de ceros reales, que es el modo de fallo que AD-13 v8 nombra en su *Prevents*.
- **Cierre (AD-14):**
  - la reversión va en el orden inverso: primero el sitio, después el receptor;
  - nunca se despliega un receptor cuyo registro no cubra lo que emite el sitio en vivo;
  - la prueba de correspondencia se juzga contra el sitio desplegado, no solo contra el del commit.

### M6. «Ningún módulo ordena Autores por su cuenta» y la rotación de la Cita del Día

- **Espina:** AD-3 v8 (l. 87). AD-12 v8 (l. 162): las seis Obras van «en el orden del Directorio» y «viven junto a `citaDelDia.ts`».
- **El hecho, en el código:** `ordenEnRondas` agrupa por Autor y ordena los Autores por slug (`src/lib/citaDelDia.ts`, `.sort(([a], [b]) => a.localeCompare(b, 'es'))`).
- **La pareja:**
  - **Historia 28.b** hace las seis Obras con la función hermana de AD-3.
  - **Historia 28.c** deja la Cita del Día como está.
- **Qué se rompe:**
  - si se deja, el mismo módulo tiene dos órdenes de Autores, y AD-3 se incumple;
  - si se migra, la permutación de las aptas cambia el día del despliegue. El índice sigue siendo «días mod n» sobre otra permutación, así que se repiten Citas antes de agotar las aptas, contra FR-9. Cambian también las jornadas sin fijar que Héctor tuviera previstas para el Kit.
- **Complementa el hueco 1.6 de la UX,** que encontró el mismo choque en el selector de `/buscar/`.
- **Cierre (AD-3):**
  - la regla vincula los órdenes que **se enseñan**;
  - la rotación de la Cita del Día es interna y sigue por slug, como excepción declarada; o se migra con fecha en `umbrales.ts`, aceptando la repetición.

---

## Bajos

- **B1. Una publicación de las cuentas propias hecha con el botón de compartir sale con `?via=`, y `canal` no lo sabe.** La Épica 25 pone Threads, Facebook y WhatsApp a la vista en cada Página de Cita (AD-13, l. 175).
  - Quien publique en las cuentas propias con ese botón, y no con el Kit, lleva `?via=threads`.
  - `tools/lib/canal.ts:90` solo lee `PARAMETRO_DE_ORIGEN`, así que lo anota con `marcado: false`. La racha de la 18.2 se rompe, y esas visitas suman a SM-12 en vez de a SM-8.
  - **Cierre:** `canal` rechaza con código 1 un enlace con `?via=`, y lo dice. Los nombres de los dos parámetros tienen un dueño que leen el guion y `tools/`.
- **B2. «Quitar las marcas de la dirección» no tiene forma** (AD-13, l. 175; convención, l. 368).
  - Leído como «quitar la cadena de consulta», destruye el `?q=&autor=` de una búsqueda compartida y el `#ancla`. Lo destruye antes de que la búsqueda lea su estado, si el guion de medición va antes en el documento. Es el caso inverso del orden que encontró la UX (§3).
  - **Cierre:** una sola función pura que quita exactamente `de` y `via`, todas sus apariciones, y conserva lo demás y el fragmento. Además, ninguna isla escribe en el historial salvo la búsqueda.
- **B3. La entrada de la Tarjeta Social de Obra no incluye al Autor** (AD-16, l. 206). La tarjeta dice «{n} citas de {Autor}». Renombrar un Autor no invalida su caché. Viene de la v7.1; la v8 no lo toca.
- **B4. «Buscar en esta obra / en {Autor} / en este tema» no tiene zona** (AD-13, l. 173; convención, l. 369).
  - Si es un formulario GET, como dice el addendum, la escucha delegada de `click` sobre enlaces no lo ve, y esa continuación —y la del campo de la portada— no se mide.
  - Si una historia lo hace enlace, que también cumple NFR-2, necesita una zona que no está en el conjunto cerrado.
  - **Cierre:** decidir si los formularios internos declaran zona (`buscar-en`) o tienen exención escrita.
- **B5. La Historia de Instagram no se ata al corte de `tramos.ts`** (AD-8, l. 126; AD-6, l. 112).
  - La isla de compartir, generalizada para la Página de Obra, inserta «Historia de Instagram» por capacidad del navegador: `pointer: coarse` y `canShare`.
  - Si no recibe del build si la Cita admite Imagen, la ofrece en una Cita de más de 300 caracteres o en una Página de Obra.
  - **Cierre:** un `data-*` derivado del dueño de AD-8, y ausente en la Obra.

---

## Lo que ya vieron los cotejos, y aquí solo se refuerza

- **Dos instancias de `medicion.ts`** (`reconcile-v8-ux.md` 1.2). La partición que propone el cotejo —vocabulario puro aparte de la emisión— cierra además otra cosa: el receptor importa el mismo módulo (AD-13). En cuanto `medicion.ts` importe `umbrales.ts` o `superficies.ts` para generar el guion, cada cambio de esos módulos obliga a decidir si se redespliega el receptor, el problema que `destinos.ts` resolvió para los destinos. El vocabulario va en un módulo **sin importaciones**, como `destinos.ts`.
- **Qué vista emite cada página** (`reconcile-v8-prd.md` 1). AD-12 v8 hace que la portada reutilice los componentes de la Página de Cita. Si la marca de vista se pone en un componente y no en el armazón, la portada emite también `vista-de-cita` y SM-2/SM-3 la cuentan como Página de Cita. Es otra razón para derivar la vista de `superficies.ts`.
- **La puerta de NFR-5** (`reconcile-v8-prd.md` 2). A5 añade una causa que no necesita retiradas: la rotación diaria.

## Comprobado y sin agujero

- **AD-14 frente a la medición nueva.** Ninguna pareja consigue que un byte de `dist/` derive de D1. El guion sale de `src/lib/medicion.ts` y la línea base se lee desde `tools/`.
- **AD-20 frente a los Directorios y las entradas a la Obra.** Ninguna historia puede colocar un Modelo en `/autores/`, `/obras/`, la Tarjeta de Obra o la isla de compartir de la Obra sin que lo rechace la revisión de la declaración. La publicidad en `/buscar/` con filtros es la misma ruta.
- **AD-4 y AD-25 frente al filtro de Obra.** El valor es el nombre de la ficha, que no se recalcula. `titular` no rompe ninguna búsqueda compartida, y `reunir` está declarado.
- **AD-11 frente a la congelación.** Las seis Obras de la portada y la marca de `vista-de-obra` leen `rutasIndexables`, que ya incluye la congelación. Ninguna pareja mete en la portada una Obra que la congelación deja fuera.
- **AD-11 frente a los ocho destacados.** Una sola función para la portada y la búsqueda sin resultados, con el desempate del Directorio. No se encontró pareja que dé dos listas.

## Resumen

| # | Gravedad | Dónde (l.) | Pareja | Cierre |
|---|---|---|---|---|
| A1 | Alto | AD-23 290–291, AD-25 325 | Cargador con el orden del cotejo × `obras.ts` con romanos | El cargador guarda todas las apariciones; solo `obras.ts` ordena documentos |
| A2 | Alto | AD-11 150, AD-19 242, AD-12 162 | Filtros en componentes reutilizados × `data-pagefind-ignore` por omisión | Un solo componente en la Página de Cita; `ignore="all"`; portada con tipo; prueba sobre `dist/` |
| A3 | Alto | AD-25 326, convención 372 | `sort` en búsqueda filtrada × clave omitida en Citas sin Obra | Clave numérica en toda Cita, con huecos declarados |
| A4 | Alto | AD-27 347–349, AD-1 69–72 | Clave de orden en lote × relación por fichero | Relación por (fichero, campos) |
| A5 | Alto | AD-11 154, AD-6 105, AD-12 160–162 | Puerta de NFR-5 y tope × rotación diaria | AD nuevo: veredictos independientes de la jornada |
| M1 | Medio | AD-6 109, convención 370 | Filtro pequeño en línea × *chunk* compartido | Empaquetados siempre externos; tope por cierre de importaciones |
| M2 | Medio | AD-17 222, AD-24 307, convención 376 | `FAMILIAS` en `tools/` × conjunto en `superficies.ts` | Un dueño; subconjuntos por serie |
| M3 | Medio | AD-27 347, 352 | Recuentos en la relación × retirada | La baja fecha con la relación de antes |
| M4 | Medio | AD-13 176–177, AD-24 306 | Continuación por censo × marca de `vista-de-obra` | Censo de medición = publicadas, con la indexabilidad de su jornada |
| M5 | Medio | AD-14 187, l. 465 | Orden de despliegue × reversión «o del receptor» | Reversión en orden inverso |
| M6 | Medio | AD-3 87, AD-12 162 | Seis Obras por Directorio × rondas por slug | Alcance de AD-3: lo que se enseña |
| B1–B5 | Bajo | AD-13, AD-16, AD-8 | — | Ver arriba |

# Revisión de rúbrica — espina v8.2 (pasada corta del 2026-10-20)

> Rubric walker de `references/reviewer-gate.md` sobre `ARCHITECTURE-SPINE.md` (v8 en 58a4b437 más el diff sin commitear de esta pasada) y las doce entradas de `.memlog.md` desde «Pasada corta v8.2 (2026-10-20)». Fuentes cotejadas: la puerta `implementation-readiness.md` (c6a68d9d; puntos 1, 4 y 5 y las notas de «Arquitectura y espina»), el PRD v8.2 (FR-56 «Lectura con acción», SM-5, SM-7, SM-8, SM-12), las resoluciones de Héctor del 2026-10-19 (`scratchpad/resoluciones-v8.md`), el SPEC (CAP-24) y el código: `medicion/esquema.sql`, `medicion/worker.ts`, `src/lib/medicion.ts`, `src/lib/umbrales.ts`, `src/lib/huecos.ts`, `src/lib/destinos.ts`, `src/lib/redes.ts`, `tools/lib/avisar.ts`, `tools/lib/cambios.ts`, `src/components/Paginacion.astro`, `src/islands/ImagenDeCita.astro`, `package.json` y `publicar.yml`. Solo lectura: no se tocó la espina.

## Veredicto

**La pasada cierra lo que tenía encargado, pero introduce dos reglas que, tal como están escritas, dividen a dos constructores.** La primera es la del historial de `/buscar/`: `replaceState` durante la pausa más `pushState` al asentar. La segunda es la familia de fichero «cinco» de AD-27, que choca con los documentos que la v8 metió en la relación de la Página de Obra. Hay además cuatro hallazgos de gravedad media, en `primera`, en el `rowid`, en AD-16 y en los cortes de SM-8, y una cola de bajos. Ninguno es crítico. El lint no encuentra nada real.

## Lint (`lint_spine.py`)

`ok: false`, con **30 hallazgos, todos `low` y de categoría `placeholder`**, y todos falsos positivos:

- 5 son `{planning_artifacts}` en el frontmatter, la convención de rutas de la skill. La pasada añade uno al citar `implementation-readiness.md`, y por eso salen 30 en vez de los 29 de la v8.
- 25 son plantillas de ruta o de nombre de fichero (`{slug-autor}`, `{slug-obra}`, `{id-de-fuente}`, `{slug-de-pagina}`, `{fragmento}`, `{slug-tema}`, `{slug-coleccion}`, `{slug}`) en AD-23, AD-25 y las convenciones.

No hay IDs `AD` duplicados, ni AD sin Binds/Prevents/Rule, ni versiones del Stack sin fijar.

## Qué cambió en esta pasada (resumen del diff)

AD-6 (marcado en `dist/` sin punto final), AD-7 (tres rechazos y ninguno más; sin destino Feed), AD-9 (peso y tamaños tras Pagefind; `CORTES_DE_SM8`), AD-11 (aristas del grafo del modelo; `alta` y `coleccion despublicar`; dueño del predicado del suelo), AD-12 (el 404 en la prueba de dos jornadas; ventana con menos de seis Autores), AD-13 (Prevents ampliado; vocabulario solo con importaciones hoja; `primera`; exención de zona; `back_forward` sin caché; `pushState`; `?via=` en `senal --tipo ajena`; `CORTES_DE_SM8`; huella en el repositorio; `rowid` aleatorio), AD-16 («hoy no hay caché»), AD-27 (familia del fichero frente a familia de la ruta), la convención de dirección, la de zonas, el árbol, el Entorno operativo y el Deferred (preguntas de UX cerradas; caché).

Las doce entradas de la bitácora tienen reflejo en la espina, y la espina no trae cambios sin entrada. Falta la entrada `(event) spine finalized (v8.2)` con el lint, que la v8 sí tenía. Es lo esperable si esta puerta va antes del cierre.

## Hallazgos

### Altos

**A-1. El historial de `/buscar/`: `replaceState` en la pausa más `pushState` al asentar no da «cada estado asentado entra en el historial».** AD-13 (líneas 199–201) y la convención de dirección (415).

- **Problema:** la regla reescribe con `replaceState` la entrada en curso durante la pausa. Esa entrada es la del estado asentado anterior. Después, al asentar, abre otra con `pushState` y la misma URL. El estado anterior desaparece del historial y el nuevo queda duplicado.
- **Ejemplo:** se asienta «amor» (E2). Luego se teclea «vida» y la pausa reescribe E2 a `?q=vida`. Al asentar, `pushState` crea E3 con `?q=vida`. El historial queda en `…, ?q=vida, ?q=vida`: «atrás» no hace nada visible y «amor» ya no está.
- **Lo mismo al pulsar un resultado:** la pausa ya dejó la dirección igual, así que el `pushState` previo a la navegación duplica la entrada.
- **Al ocultarse la página:** asentar ahí con `pushState` no tiene sentido.
- **Lo que no se dice:**
  - qué hace la isla en `popstate`: restaurar el estado desde `history.state`, o desde la dirección, cosa que «nunca copia `location.search`» parece vedar;
  - que la normalización de llegada (decisión 8: descartar lo que no existe y quitarlo) reescribe con `replaceState` y no abre entrada.
- **Interacción con la regla nueva de `back_forward`:** según la especificación de HTML, las entradas creadas con `pushState` comparten estado de documento. Tras un «atrás» sin caché, el documento nuevo sirve también a las entradas que creó el anterior, y llegar a ellas es un `popstate` dentro de la misma carga. La memoria de la carga nueva solo conoce el estado de llegada. El estado anterior se asentaría otra vez al ocultarse, que es justo la duplicación que el punto 5 quería cerrar.
- **Arreglo:**
  1. El primer cambio tras un estado asentado abre su entrada con `pushState`.
  2. La pausa reescribe *esa* entrada con `replaceState`.
  3. Asentar no toca el historial.
  4. La normalización de llegada usa `replaceState`.
  5. En `popstate`, la isla restaura el estado desde la entrada, y todo estado al que se llega por la historia —la llegada `back_forward` sin caché o un `popstate`— se da por registrado.
  6. La prueba local de Playwright recorre «asentar A, teclear B, asentar B, atrás, atrás» y «atrás sin caché, atrás».

  Esto entra en la 27.4 y en la 23.8.

**A-2. AD-27: «la familia del fichero… son cinco» contradice la v8, que mete los documentos de `corpus/fuentes/` en la Página de Obra.** AD-27, líneas 390, 395 y 397.

- **Lo que dice la espina:** la línea 395 (v8) compone la Página de Obra con «su ficha, sus Citas, el fichero de su Autor y sus documentos», y el commit que añade una página a una Obra paginada la fecha. La historia de la 24 lo repite: «el aviso observa también `corpus/fuentes/`» (`epics.md` 6009). Pero la v8.2 dice que la familia del fichero «es la de `FamiliaAvisable`, que reconoce los directorios del Corpus, y son cinco».
- **Lo que hace el código:** `FamiliaAvisable` es `'cita' | 'autor' | 'tema' | 'coleccion' | 'obra'`, y `DIRECTORIOS_AVISABLES` es «la misma tabla [que] alimenta el filtro de `git diff` y el reconocimiento posterior» (`tools/lib/avisar.ts` 17–33). `corpus/fuentes/` no está en ella.
- **Las dos salidas, y lo que rompe cada una:**
  - Añadir `documento` a `FamiliaAvisable` da seis familias de fichero. Choca con «son cinco» y con la mudanza de la 26.7, que deriva `FamiliaAvisable` de las familias de `superficies.ts` («las que tienen directorio en el Corpus», `epics.md` 7038–7041), donde `documento` no existe.
  - Observar `corpus/fuentes/` fuera de la tabla rompe la invariante del módulo: una sola tabla para el filtro y para el reconocimiento.

  La 24 y la 26 van en la misma rama, así que el choque es seguro.
- **Un fleco más:** la portada se avisa siempre (`avisar.ts`, cabecera), pero no está entre las seis familias de ruta.
- **Arreglo:** AD-27 tiene que decir cuántas familias de fichero hay (las cinco con directorio en el Corpus, más `documento`, solo de fichero y sin familia de superficie), quién las declara (un conjunto propio en `tools/lib/avisar.ts`, junto al subconjunto derivado de `superficies.ts`) y qué prueba lo fija. También tiene que decir que la portada es una ruta avisada sin familia.

### Medios

**M-1. `primera`: la espina no fija quién guarda la memoria, el orden con la lectura ni el valor en la descarga de la Historia.** AD-13, líneas 191, 192 y 194.

- **Quién guarda la memoria:** «El arranque de `__medir` lleva en memoria, por carga, qué métricas de acción ya contó». Pero la línea 191 dice que el guion de medición «la vacía [la cola] al cargar y la sustituye».
  - Si la memoria vive en el arranque en línea, el arranque necesita la correspondencia evento → métrica y la excepción de `instagram-historia` (vocabulario en línea y bytes en `MAX_BYTES_DE_GUION`), y el `__medir` que lo sustituye tiene que heredarla.
  - Si vive en el guion, la letra la contradice.
  - El reinicio en `pageshow` con `persisted` también hay que cablearlo en algún sitio.
- **El orden con la lectura:** SM-5 es una proporción sobre lecturas, pero la regla no exige, como hace con la salida, que la lectura pendiente se emita antes de la primera acción. La puerta ya vio el caso en la salida (prd-8: lector de pantalla, voz, `element.click()` sin `pointerdown`). Con `primera` puede haber cargas con `primera` = sí y sin lectura, y el numerador deja de ser subconjunto del denominador.
- **La descarga de `instagram-historia`:** «no gasta su primera», pero no se dice si lleva `primera` = no o el campo nulo. Eso decide qué acepta el registro del receptor y la prueba claves ⊆ registro ⊆ columnas.
- **SM-12:** cuenta comparticiones, no lecturas con compartición. La espina no dice que su denominador ignora `primera`, y un lector de la 23.10 puede filtrar por ella.
- **Arreglo:**
  1. La memoria vive en el único `__medir` en ejecución, y se calcula al emitir, también al vaciar la cola.
  2. La correspondencia evento → métrica la declara el módulo del vocabulario.
  3. La primera acción de cada métrica emite antes la lectura pendiente, como la salida.
  4. La descarga de `instagram-historia` lleva `primera` = no.
  5. SM-12 cuenta toda compartición, sin mirar `primera`.

  Esto entra en la 23.1/23.5 además de la 23.2: la espina solo nombra la 23.2.

**M-2. `primera` = no une registros de la misma carga, y FR-56 v8.2 dice que ningún campo los une.** AD-13, línea 194; PRD `prd.md` 1082 y NFR-11.

- **Qué une:** un registro con `primera` = no afirma que en su misma carga hubo antes otra acción de esa métrica. Con la ruta y la jornada compartidas, y unas 14 lecturas humanas en dos semanas, eso une dos registros de una misma persona («copió tres veces»). Sin el campo, la multiplicidad era ambigua entre personas.
- **Por qué importa:** la alternativa de no emitir las demás acciones, el «tope en la emisión» de la puerta, borra el dato, pero pierde comparticiones que SM-12 cuenta. La elección de Héctor puede ser la buena. Aun así, la espina tiene que nombrar la unión que acepta, porque el Rule de AD-13 dice «ni nada que pueda convertirse en [un identificador]».
- **Arreglo, a discutir con Héctor:** escribir en AD-13 que `primera` revela multiplicidad dentro de una carga y nunca qué carga ni quién, y que es la misma unión que la jornada y la ruta ya permitían con este tráfico. La otra salida es cambiar el diseño, y que `bmad-prd` alinee la letra de FR-56.

**M-3. `rowid` aleatorio: sin dueño ni momento para el `UPDATE`, y un redespliegue del receptor viejo lo deshace.** AD-13, línea 208, y AD-14.

- **El momento del `UPDATE`:** «un `UPDATE` baraja una vez lo ya escrito», sin decir cuándo, desde dónde ni quién. Si corre antes de que el Worker nuevo esté en vivo, lo que entre en medio queda en orden.
- **El redespliegue:** la puerta (punto 3) muestra que la principal conserva el receptor v7.1 y un runbook que lo redespliega desde el checkout. Un receptor sin `rowid` explícito inserta `max(rowid)+1` a partir del mayor aleatorio, así que vuelve a dejar el orden de llegada. La espina no ata la propiedad a la huella ni al orden de despliegue de AD-14.
- **La letra de AD-14:** la paradoja dice que la tabla «cambia solo por migraciones aditivas versionadas» (líneas 33 y 46), y un `UPDATE` de todas las filas fuera de migración contradice esa frase.
- **Dónde vive la propiedad:** está en el adaptador (`worker.ts`), «lo único sustituible» (AD-14), y ninguna prueba la fija.
- **La regla sin vigilancia:** «Ninguna lectura ordena por `rowid`» no tiene prueba.
- **El canal que queda:** D1 Time Travel, encendido de serie (comp-9), permite restaurar o bifurcar a un instante y comparar recuentos, es decir, reconstruir el orden por minutos durante 7 o 30 días. No está nombrado.
- **Arreglo:**
  1. El `rowid` aleatorio llega a producción con el primer despliegue del receptor v8, en la 23.3, como acto de Héctor. El `UPDATE` corre justo después, en la misma orden, y se repite tras cualquier despliegue de un receptor que no lo tenga.
  2. `DESPLIEGUE.md` §3 veda redesplegar desde la principal un receptor sin él.
  3. Una prueba estructural del SQL del adaptador fija el `rowid` explícito, como hoy en `receptor.test.ts`, y otra fija que ningún SQL de `tools/` nombra `rowid`.
  4. AD-14 distingue «la tabla cambia» de «se barajan sus filas».
  5. Time Travel se nombra como pérdida aceptada.

**M-4. AD-16: el Rule queda incumplido por el código y sin disparador.** Líneas 237, 240, 490, 593 y 597.

- **La contradicción:** el Rule dice que «una construcción no rasteriza un artefacto por Cita cuya entrada no ha cambiado», y la v8.2 añade que «hoy no hay caché: cada build rasteriza cada Tarjeta Social». La espina enuncia en presente una invariante que el código incumple.
- **El Deferred no se dispara nunca:** aplaza el mecanismo «cuando el build lo pida» sin medida. La estrategia de crecimiento se revisa «si el build supera los cinco minutos con la caché ya puesta», que es circular mientras no haya caché, y `construir` ya tarda 15 min 24 s en CI (comp-11).
- **El árbol:** sigue diciendo `tarjeta/[slug].png.ts # AD-15 build · AD-16 incremental`.
- **Lo que deja abierto:** quien añada otro artefacto por Cita en el build puede leer el Rule y construir la caché, o leer «hoy no hay caché» y el Deferred y no hacerlo. Es justo la divergencia que AD-16 dice prevenir.
- **Arreglo:**
  - reescribir AD-16 como una invariante con su deuda declarada: la Tarjeta Social existente rasteriza entera hasta un disparador con nombre en `umbrales.ts`, sea el tiempo de `construir` o el número de PNG, y ningún artefacto por Cita nuevo entra sin caché;
  - quitar «con la caché ya puesta» del Deferred o darle condición;
  - corregir el comentario del árbol.

**M-5. `CORTES_DE_SM8` repite una fecha que `umbrales.ts` ya declara, y solo esa lista dice el calendario.** AD-9 (146), AD-13 (205) y el Entorno operativo (529).

- **La fecha repetida:** el corte de la 24 con la 26 «es la del despliegue conjunto que nombra la línea SM-11». El código ya la declara como `DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS: string | undefined` (`umbrales.ts` 109, commit 64b1bf0d). Si la lista lleva su propio literal, la misma fecha vive en dos sitios, que es lo que AD-9 existe para impedir.
- **Los nombres sin ratificar:** la espina no ratifica los nombres reales (`DESPLIEGUE_DE_LA_REPARACION`, `DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS`, `DESPLIEGUE_DE_LA_PORTADA_DE_RETORNO`) ni su forma de ausencia (`undefined` mientras no llega).
- **El calendario:** UTC se dice solo para SM-8. Una fecha compartida tiene que estar en el mismo calendario para las dos métricas.
- **Arreglo:** `CORTES_DE_SM8` se compone de constantes con nombre: una nueva para la llegada en vivo de la 23 y `DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS`, filtrando `undefined`, nunca con literales. Toda jornada de despliegue de `umbrales.ts` se escribe en UTC. AD-9 ratifica los nombres del código.

### Bajos

- **B-1. AD-11 (162): «reutiliza el predicado “cuenta para el suelo”, cuyo dueño es `src/lib/huecos.ts`».** En el código no hay tal predicado. `huecos.ts` lo calcula en línea (`hispanicos = latinoamericana + peninsular + sinDeclarar`, 497–509). La resolución del 19/10 lo extrae a una función con nombre en la 27.6. Hay que decir «se extrae… (migración, 27.6)», no «reutiliza».
- **B-2. AD-6 (111) enumera lo que queda en `dist/` sin punto final y olvida el arranque en línea.** AD-13 (191) lo mantiene «también sin punto final». La lista tiene que ser completa: el arranque y el marcado.
- **B-3. AD-9 y el árbol (146, 498–500): dónde se mide y dónde vive.**
  - El tamaño del HTML de `/obras/`, otro tamaño que reabre un aplazado, no consta ni en el paso final ni en `astro:build:done`.
  - El paso posterior a Pagefind figura bajo `integraciones/`, pero no puede ser un hook de Astro.
  - Las pruebas unitarias corren `astro build` y no `npm run build`, así que no lo ejercitan.

  Basta con nombrar dónde vive el paso y dónde se mide `/obras/`.
- **B-4. spec-12 sigue abierto en la letra.** AD-11 (162) cuenta «las seis Obras de la portada» entre las enumeraciones de `publicado.ts`, y AD-12 (178) y el árbol (475) las ponen junto a `citaDelDia.ts`. Hay que precisar quién es el dueño y quién reexporta.
- **B-5. AD-7 (128): «Tres caen en la descarga, y ninguno más».** No dice qué hace un rechazo fuera de los cinco nombrados. Los WebView de aplicación lanzan errores no estándar. Falta una conducta por omisión: probablemente la descarga, o ignorar y decirlo.
- **B-6. AD-13 (200): la detección de `back_forward` por Navigation Timing no tiene reserva** para navegadores sin `PerformanceNavigationTiming`. Hay que decir que entonces la carga cuenta como `navigate` y que el sesgo se acepta.
- **B-7. El frontmatter cita `implementation-readiness.md` sin fijar commit.** La skill sustituye ese fichero entero en la pasada siguiente, así que hay que fijarlo a c6a68d9d, como las demás fuentes llevan su versión.
- **B-8. Entorno operativo (529): «la reparación de la publicación siguen fusionándose a diario» está rancio.** Llegó en vivo el 2026-10-19 y su fecha ya está declarada.
- **B-9. conf-12 no se trató: el aviso del índice que no carga.** AD-11 (168) dice que solo cuenta un enlace que está «en el HTML con guion y sin él». El aviso de la 27.7, que la isla retira al arrancar, está en el HTML sin guion y no con él, y la comprobación sobre `dist/` lo contará igual. No cambia el veredicto, porque la cabecera ya enlaza los Directorios, pero la regla no es exigible tal como está escrita.

## La lista de comprobación, punto por punto

| Criterio | Juicio |
|---|---|
| Fija los puntos reales de divergencia de las Épicas 23–28 y no se le escapa ninguno | **Casi.** Cierra los puntos 1, 4 y 5 de la puerta y la mayoría de las notas de «Arquitectura y espina» (arq-2, arq-9, ind-3, ref1-2, ref2-2, spec-8, comp-7 y, en parte, arq-4/pm-8). Pero abre A-1 y A-2. Quedan sin tratar spec-12 (B-4) y conf-12 (B-9), y también arq-6, arq-7, ind-6, comp-9 y comp-11, que son notas y no cambian lo que haría el constructor. |
| Cada Rule es exigible y previene su divergencia | **No del todo.** El Rule de AD-16 está incumplido y sin disparador (M-4). «Ninguna lectura ordena por `rowid`» y el barajado no tienen prueba ni momento (M-3). La regla del historial de `/buscar/` no se puede cumplir tal como está escrita (A-1). |
| Nada en Deferred permite divergir | **Una excepción:** la caché de AD-16 «cuando el build lo pida» y la revisión «con la caché ya puesta» se esperan la una a la otra (M-4). Los dos cierres del Deferred (preguntas de UX, metadata de Pagefind) son correctos y casan con las decisiones 8 y 9. |
| Tecnología nombrada vigente | **Sin cambios en esta pasada.** Lo nuevo (Navigation Timing `type`, `rowid` explícito y `abs(random())` en SQLite/D1, `pushState`) existe y se usa como se dice. Las reservas son B-6 y el canal de Time Travel de M-3. |
| Ratifica el código existente, no lo contradice | **Casi siempre:** `destinos.ts` y `redes.ts` son hoja (sin `import`); `npm run build` es lo que corre el CI (`publicar.yml` 83); la paginación enlaza todos los números (`Paginacion.astro`), así que la arista «Tema → página N» del grafo del modelo es real; `worker.ts` inserta sin `rowid`, como dice el punto 1. **Excepciones:** «son cinco» frente a los documentos (A-2), el predicado del suelo (B-1), las constantes de SM-11 sin ratificar (M-5) y «AD-16 incremental» en el árbol (M-4). |
| Cubre las capacidades del SPEC | **Sí.** CAP-24 sigue gobernada por AD-13/AD-14, y `primera`, el `rowid` y `back_forward` caen en su «sin identificador» y en «no vuelve a registrar una búsqueda ya registrada». El SPEC es anterior a la v8.2: `bmad-spec` tiene que recoger `primera` y la lista de cortes, y no es tarea de la espina. |
| Ninguna enmienda debilita otra AD | **Hay tres tensiones:** M-2 (`primera` frente al Rule de AD-13 y NFR-11), M-3 (el `UPDATE` frente a «la tabla cambia solo por migración aditiva») y A-2 (AD-27 v8.2 frente a AD-27 v8). |
| Entorno operativo decidido | **Sí, y mejor que antes:** se mide tras Pagefind, el corte cae en la jornada de llegada en vivo y las pruebas locales nuevas están nombradas. Falta el lugar del barajado de M-3 en el orden de despliegue. |

## Lo que la pasada hace bien

- El punto 1 se cierra sin migración y sin tocar la huella de columnas. Lo que falta es su operación (M-3).
- El punto 4 se cierra antes de la línea base, con el campo en el vocabulario de la 23.2, y la exclusión de la descarga de la Historia casa con FR-56 y SM-5.
- El punto 5 se resuelve sin identificador y con la salida que proponía la puerta.
- `CORTES_DE_SM8` como lista ordenada en jornada UTC de llegada en vivo cierra a la vez *prd-10* y *conf-9*.
- La regla del vocabulario («solo importa módulos hoja… y nunca copia sus conjuntos») conserva la razón de `destinos.ts` y casa con el código.
- Las aristas del grafo del modelo llegan ya a la Cita y salen de la enumeración que las pinta.
- El orden de descarte de `?autor=a&obra=b` y la exención de zona quedan escritos en AD-13 y en la convención, y el Deferred deja de darlos por abiertos.

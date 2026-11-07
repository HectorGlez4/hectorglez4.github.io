# Epic 35 Context: La Cita atribuida

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

El sitio gana una segunda clase de Cita, la **atribuida**: frases de Personajes y de Autores con derechos vigentes, publicadas sin cotejo por su propia puerta y dentro de sus topes, sin tocar la puerta ni la promesa de la clase de siempre. El Personaje tiene página («Frases de {Personaje}»), su sección en los Directorios y su grupo en la búsqueda; la Variante de España se lee bajo la atribución; cualquiera puede pedir que una Cita se corrija o se retire y la petición se anota sin contacto; la Obra con derechos vigentes se vende sola; y SM-C6 mide la atribuida aparte de SM-C1. **Todo se construye con la puerta cerrada**: mientras Héctor no dé valor a los topes y al buzón no se publica ninguna atribuida, y con el Corpus real `dist/` no cambia en ninguna historia.

## Stories

- Story 35.1: La clase se fija al dar de alta, y queda registrada
- Story 35.1b: La atribuida tiene su puerta, cerrada, y sus topes
- Story 35.2: El Personaje entra en el Corpus, y la Obra tiene un solo dueño
- Story 35.3: La Página de Personaje
- Story 35.3b: La Tarjeta Social del Personaje y cuándo se indexa su página
- Story 35.4: El Personaje va donde va el Autor
- Story 35.5: Los Personajes en los Directorios y en la búsqueda
- Story 35.6: La Variante de España, y la única orden que cambia una atribuida
- Story 35.7: Lo que cuenta solo la clase de siempre
- Story 35.8: Pedir que se corrija o se retire, y que conste
- Story 35.9: La Obra con derechos vigentes se vende sola
- Story 35.10: La siembra acotada desde BrainyQuote

## Requirements & Constraints

- **Valores de Héctor, nunca de un agente.** Entran con nombre y en `undefined`: `MAX_CARACTERES_DE_ATRIBUIDA`, `MAX_ATRIBUIDAS_POR_OBRA`, `MAX_ATRIBUIDAS_POR_DUEÑO`, `MIN_ATESTIGUACIONES_DE_ATRIBUIDA` (`umbrales.ts`) y `BUZON_DE_PETICIONES` (`dominio.ts`); con cualquiera sin valor el build rompe ante una atribuida en `corpus/citas/` y las órdenes la dejan en revisión. Tampoco se da valor a `PLAZO_DE_PROTECCION_AÑOS` (queda `undefined`), `PLAZO_DE_RESPUESTA_A_RETIRADA_DIAS`, `MUESTRA_DE_AUDITORIA_SM_C6`, `MIN_ATRIBUIDAS_PARA_JUZGAR_SM_C6`, `MAX_PROPORCION_MAL_ATRIBUIDA_SM_C6`, `DESPLIEGUE_DE_LA_ATRIBUIDA` ni a la lista de la semilla de la 35.10 (vacía). `AÑO_DE_REFERENCIA` lo propone el agente en el spec y lo fija Héctor. `MIN_CITAS_POR_PERSONAJE` entra con 2. Las pruebas dan valor en una copia temporal, nunca en el árbol, y ninguna fija el valor que tengan.
- **Ningún agente siembra el Corpus real**: ni Personajes, ni semblanzas, ni claves, ni atribuidas, ni peticiones, ni auditorías; no corre la siembra de BrainyQuote. `corpus/personajes/` entra vacío con `.gitkeep`; los registros nuevos se versionan con su cabecera y lista vacía (el de clases, en cambio, se siembra con toda Cita publicada como `siempre`).
- Cada historia termina con `dist/` idéntico frente a la construcción de antes con el Corpus real, y pone al día lo que `AGENTS.md` describe.
- Ningún evento ni zona nuevos: `src/lib/vocabulario.ts` no se toca y la huella no se mueve; la tabla `COLOCACION` de `tests/unit/medicion.test.ts` suma las filas de cada enlace nuevo en la historia que lo pinta.
- Topes de guion (filtro de Directorios, búsqueda): el guion cabe, o el tope sube en el mismo diff con la cifra medida en su comentario y en el spec; nunca sin medida.
- Las pruebas no tocan la red (`tests/unit/ayuda/doble-de-red.mjs`); las atestiguaciones no se descargan ni se cotejan.
- Playwright (accesibilidad, Directorios, búsqueda, ingreso) lo corre Héctor en local; el CI no corre e2e.

## Technical Decisions

- **Clase**: la atribuida lleva `clase: atribuida`; la de siempre no lleva el campo (`clase: siempre` es error). `esAtribuida` de `src/lib/clase.ts`, sobre `{clase?}`, es el único lector del campo en `src/`, `tools/`, `integraciones/` y `public/islas/`. `derechosVigentes(dueño, AÑO_DE_REFERENCIA)` es el único que lo decide, complemento exacto de la puerta de dominio público; un Personaje siempre los tiene. El Autor pasa a unión discriminada: `añoFallecimiento` o `vivo: true` (+`añoNacimiento` opcional).
- **Registros que solo añaden** (`appendFile` con relectura, sin byte en `dist/`, sin fechar ni avisar): `corpus/clases-de-cita.yml`, `corpus/formas-vedadas.yml`, `corpus/peticiones-de-retirada.yml`, `corpus/auditorias-de-atribuidas.yml`. El build lee los dos primeros solo para romper. Que solo añadan lo comprueba `npm test` contra el primer padre del commit (en CI con `fetch-depth: 0`; en local sin padre se omite y se dice). Ninguna puerta lee el historial de git. Cambiar de clase es retirar y dar de alta con otro slug (`slugLibre`).
- **Puerta de la atribuida** en el esquema (`src/lib/admision.ts`): Personaje o Autor; `atestiguaciones` `{url, consultadaEl}` contadas por dominio registrable con `dominioDeAtestiguacion` de `src/lib/atestiguaciones.ts` (`tldts` 7.4.19 exacta, solo ICANN; BrainyQuote, sus espejos y el propio dominio no cuentan; `tldts` nunca en un guion del cliente); `origen` de `original | doblaje | traduccion-publicada`; sin `\n`; no apta para portada; sin cotejo ni entrada en `pendientes-de-cotejo.yml`; figura pública sin Personaje solo si su Autor es dueño de alguna Ficha de Obra.
- **Duplicados entre clases**: `parecidoEntre` de `tools/lib/parecido.ts` (Historia 29.4), la única medida; las órdenes comparan además contra `corpus/_revision/` y `formas-vedadas.yml`, el build solo contra lo versionado.
- **Personaje**: `corpus/personajes/{slug}.yml` (`nombre`, `universo`, clave de orden, semblanza por AD-26 o `semblanzaPropia {texto, responde}`; sin años). Un solo espacio de slugs con los Autores; `autorPorPrefijo` pasa a `dueñoPorPrefijo` (unión, tipo, prefijo más largo). La Cita y la Ficha de Obra llevan el prefijo de su **dueño** (Autor o, sin él, Personaje), y la ruta de Obra no se mueve al saberse el Autor.
- **Superficie**: `personaje` es la séptima familia de `FAMILIAS` en `superficies.ts`, `/personaje/{slug}/`, producto con `vista-de-superficie`, sin Modelos; se indexa con `MIN_CITAS_POR_PERSONAJE` (35.3b), entra en las rutas indexables, en `grafoDelModelo` (NFR-5), en la relación de AD-27 y como familia propia de las series (no suma a `publicadas`).
- **Composición**: `atribucion.ts` compone en orden fijo Personaje, Obra, Autor, para la Atribución y para todo lo que sale (copiar, compartir, Imagen, Tarjeta Social, Fragmento). JSON-LD: `author` si hay Autor, `spokenByCharacter` como `Person` con solo `name` y `url`.
- **Variante**: un campo `{texto, region, origen}` de la atribuida (`REGIONES_DE_VARIANTE`, hoy `espana`); no crea slug; se indexa en el cuerpo, nunca en metadato; no sale en lo copiado ni en la imagen. Una sola orden cambia una atribuida publicada: `npm run atribuida -- {obra|autor|personaje|variante|texto}`; `documentar` se niega ante una atribuida.
- **Claves nuevas del esquema** van en `CAMPOS_QUE_PINTA` o `CAMPOS_QUE_NO_FECHAN` de `tools/lib/cambios.ts` en el mismo commit que las añade.
- Lo que cuenta solo la clase de siempre: línea de cifras (k), destacados, suelo, hueco y épocas, aptitud de portada, Pieza, SM-C1 y procedencia completa. `MIN_CITAS_POR_TEMA` cuenta las dos.

## UX & Interaction Patterns

- La Página de Personaje calca la de Autor: `h1` en la serif, «personaje de {universo}» donde van los años, semblanza con su atribución visible, Lista de Obras con su tope y «Y {m} obras más», rótulo «Citas», «Buscar en {Personaje}»; 2+ con nombre y listado, `noindex`. Título «Frases de {Personaje} | Sabiduría de Bolsillo».
- La serif se aplica también al nombre del Personaje; sin literales de color ni tipografía.
- La Página de Cita atribuida: nada entre Atribución y Copiar; de los desplegables, solo «Inserta esta cita»; sin sello de «no verificada»; la Variante en una línea «En España: «…»» en caption. Lo que no aplica no pinta nada, ni hueco.
- Directorios: sección «Personajes» tras la A–Z, con letras propias y salto desde la cabecera; la búsqueda gana un `optgroup` «Personajes» en el selector de Autor y `personaje=` en su estado.
- Línea de retirada al pie de la Página de Cita atribuida y de toda página de Personaje: `mailto:` a `BUZON_DE_PETICIONES` con `?subject=` y el slug, sin guion ni zona.

## Cross-Story Dependencies

- Dentro de la épica: 35.1 → 35.1b → (35.6, 35.7); 35.1 → 35.2 → 35.3 → 35.3b → 35.5; 35.4 tras la 35.3; 35.8 tras la 35.3, la 35.7 y la 35.1b; 35.9 tras la 35.2; 35.10 tras la 35.6, la 35.7, la 35.2 y la 35.1b.
- Con otras épicas de la v9 (ninguna en la principal salvo la 34.0): **29.4** (`parecidoEntre`) para la 35.1b, 35.6, 35.7 y 35.10; **34.2** (Lista de Obras con tope y desplegable) para la 35.3, y **34.3** (contorno de «Buscar en…») para la 35.5; **30.1, 30.3, 30.4, 31.1** y **34.1** (`recortarPorPalabra`) para la 35.4; **32.2–32.5** y **33.1–33.3** para la 35.9. La línea de cifras de la 35.7 es la de la Historia 28.1 (Épica 28 de la v8, sin fundir). No espera a las Épicas 25 y 28 para fundirse.
- La unidad de fusión es la épica: CI en verde, `npm run test:e2e` entero en local (Héctor), barrido de accesibilidad con Personajes y atribuidas, y NFR-7 con Lighthouse, que con la puerta cerrada sale igual.
- El corte de serie (`DESPLIEGUE_DE_LA_ATRIBUIDA`, 35.7) toma la jornada de la primera atribuida publicada en vivo, no la del merge.

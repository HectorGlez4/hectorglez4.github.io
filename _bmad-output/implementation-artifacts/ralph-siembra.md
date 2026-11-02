# Bucle Ralph de siembra — una iteración = una sesión de sembrado

Este fichero es el prompt del bucle. Cada iteración lo lee entero, hace **una** sesión y termina.
El estado no vive en la conversación: vive en `corpus/sesiones-de-sembrado.yml` (lo hecho), en la
«Cola de vetas» de abajo (lo que falta) y en git. Si algo de aquí contradice `AGENTS.md`, manda `AGENTS.md`.

## Misión

Crecer el Corpus con **Citas**, **Autores** y **Obras** nuevos, de dominio público, con Fuente
versionada, sin tecleo de metadatos. Una Cita es publicable si es una sentencia o pasaje
autónomo, en español, que se entiende sin el contexto de la obra.

## Lo que NO se repite (agotado, ver memoria `siembra-agotada-2026-10-31`)

- Épocas de `candidatos-por-epoca.yml` (rinden ≈0), Gutenberg en español, barrido de
  `corpus/_revision/` por filtros aforísticos, Vargas Vila.
- Cualquier documento ya en `corpus/fuentes/` o en `corpus/_fuentes-retiradas/` (`recuperar` se niega a lo retirado).
- Cualquier candidato de `corpus/descartes-de-candidatos.yml`.

## Veta que sí rinde (hoy: 9–29 Citas por sesión)

Wikisource en español, por **categorías de obras** (`Categoría:Ensayos`, `Máximas`, `Aforismos`,
`Pensamientos`, `Discursos`, `Cartas`, `Escritos de …`) y por **categoría de Autor**, cruzadas contra
lo ya versionado. Autores nuevos entran solo si la Fuente los declara y su obra es de dominio público.
La API de Wikisource devuelve 403 sin `User-Agent` y limita tras muchas peticiones: espacia las llamadas.

## Una iteración

1. **Preparar.** `git status`; estás en el worktree de siembra, no en el checkout de historias. Lee la
   «Cola de vetas». `npm run objetivo` solo informa (hoy propone una época agotada: se anula, no se obedece).
2. **Elegir una veta** de la cola (la primera `pendiente`). Si la cola está vacía, descubre 3–5 vetas
   nuevas por categorías de Wikisource, cruza contra `corpus/fuentes/`, `_fuentes-retiradas/` y
   `descartes-de-candidatos.yml`, anótalas en la cola y sigue con la primera. Si el descubrimiento no
   da nada nuevo, ve a «Parada».
3. **Recuperar** cada documento: `npx tsx tools/recuperar.ts "<url>"`. Nada de `--obra`/`--año`.
4. **Autor nuevo** (solo si la Fuente lo declara): `npx tsx tools/autor.ts crear …`. Propone una clave de
   orden **sin revisar**: no corras nunca `autor.ts clave`; lista el Autor y su clave en el informe final.
5. **Extraer** a `_revision/`: `NODE_OPTIONS=--max-old-space-size=14000 npx tsx tools/extraer.ts corpus/fuentes/<doc>.txt --autor <slug> > <log> 2>&1`.
   Espera al FIN del log con Monitor; no encadenes `grep | head` sobre la salida (ocultó un OOM).
   Si `extraer` se niega por Autor contradicho, es la puerta funcionando: descarta la veta con motivo.
6. **Cribar a ojo**, no solo por filtro. Aprueba solo lo que cumpla todo:
   - sentencia o pasaje autónomo, presente o gnómico; sin pasado narrativo ni 1.ª/2.ª persona anecdótica;
   - sin nombres propios que lo aten al contexto, sin notas de transcripción, sin versos ni citas ajenas dentro;
   - del Autor de la Fuente (las citas que la obra trae dentro no se publican);
   - máximo ~12 por Autor y sesión, para no sobrerrepresentar (Ingenieros y Barrett ya lo están).
   Lee todas las que apruebes. Escribe en el log 5 al azar con su Autor y su Obra.
7. **Aprobar:** `NODE_OPTIONS=--max-old-space-size=14000 npx tsx tools/revisar.ts --aprobar <slug>… --temas <tema>…`
   con un Tema que tenga página (NFR-5). Si la orden sale con 1 y deja candidatas en `_revision/`, no
   fuerces: descártalas con motivo o busca otro Tema. Las Fichas de Obra las crea la propia orden.
8. **Verificar** antes de commitear: `npx tsx tools/autor.ts proponer-claves` (idempotente), el test
   unitario de corpus que toque, y `npm run build` al menos cada 3 iteraciones y siempre que haya
   Autor nuevo. Si el build rompe, arregla el contenido, nunca `src/` ni los umbrales.
9. **Commitear** nombrando rutas (el checkout puede tener ficheros ajenos). Candidatas sin aprobar no se
   versionan: `git add -A corpus ':!corpus/_revision'` y `git add -u corpus/_revision`. Una Cita retirada a
   `_revision/` se añade a mano. Mensaje: `corpus: N Citas de <Autores> desde <veta>` y la línea de
   `Co-Authored-By` del entorno.
10. **Registrar**, siempre, también con 0 Citas: `npx tsx tools/objetivo.ts --anular "<motivo>" --elegido "<veta>"`
    o `npm run sesion:registrar`. Actualiza la cola: veta `hecha (N Citas)` o `descartada (motivo)`.

## Parada

Escribe `<promise>SIEMBRA AGOTADA</promise>` solo si es verdad:
- tres iteraciones seguidas con menos de 5 Citas publicadas, **o**
- la cola está vacía y el descubrimiento de vetas no encuentra nada nuevo.

No la escribas para salir de un atasco. Un atasco (red caída, OOM, build rojo que no entiendes) se
reporta en la cola con su causa y se pasa a la siguiente veta; si son tres atascos seguidos, para y dilo.

## Límites duros

- No push, no despliegue, nada con `wrangler` ni `--remote`, no `desplegar`/`comprobar` de la medición.
- No tocar `src/`, `tests/`, `integraciones/`, `_bmad-output/planning-artifacts/` ni `specs/`.
- No borrar nada de `corpus/`: retirar es mover a `_revision/` (Citas), `_autores-retirados/`, `_obras-retiradas/`.
- No añadir Fuentes al conjunto cerrado de `tools/lib/fuentes.ts` (Wikiquote, BNE, etc.: decide Héctor).
- No cambiar `MIN_CITAS_POR_TEMA` ni ningún umbral. No reunir/separar Obras (lo decide Héctor).
- No fijar jornadas, Colecciones ni publicaciones de canal.
- Procedencia: se deja como está (decisión de Héctor, 31/10); no inventes años.

## Cola de vetas

| Estado | Veta | Notas |
|---|---|---|
| hecha (33 + 31 Citas, it. 1 y 4) | La Rochefoucauld, `Categoría:Reflexiones o sentencias y máximas morales` (60 pp.) | Autor en 64 Citas: CERRADA, no más pasadas (representación). Quedan ~540 candidatas en `_revision/` |
| descartada (it. 2) | Séneca, `Cartas a Lucilio (Wikisource tr.)` | cada carta declara su propia Obra («Cartas a Lucilio - Carta N»): 63 Obras de 1-2 Citas; solo con una regla de Héctor (reunir) |
| hecha (14 Citas, it. 2) | Cadalso, `Categoría:Cartas marruecas` (91 pp.) | 1.247 candidatas, prosa epistolar contextual: rinde ~1 %. No repetir |
| lección | Antes de recuperar un lote, probar UNA página y mirar `Obra:`: si cada página declara una Obra distinta, no sembrar | |
| hecha (9 Citas, it. 3) | Categorías `Ensayos de <Autor>` de Wikisource, Autores ya en el Corpus (Wilde, Unamuno; Ariel, Arenal, Balmes ya estaban) | La categoría lista solo la página índice: una obra "pendiente" suele estar ya versionada por subpáginas (`ls corpus/fuentes \| grep <obra>`) antes de recuperar. Crítica teatral/biográfica rinde ~2 % |
| pendiente (poco) | Ensayos aún sin tocar: Medardo Ángel Silva (4), Eduardo Wilde (3), Zeballos (3), Ameghino (2), Stendhal «Del amor», Molinos «Guía espiritual», Swift, Camaña (viajes: no) | probar UNA página y comprobar Obra y tamaño; Ortega y Gasset (31 pp.) lo decide Héctor: murió en 1955, en España sigue protegido |
| hecha (24 Citas, it. 5) | `Política de Dios` (Quevedo, 47 pp.) y `Ética (Balmes)` (28 pp.) | 3.637 candidatas; prosa política/moral: rinde ~0,7 %. Hallados barriendo prefijos `Artículos de`, `Ética`, `Política` de `allcategories` |
| hecha (29 Citas, it. 7) | Gracián (`El Discreto` 1646, `El héroe`) y Séneca (`De la ira`, `De la clemencia`) | salió del cruce `Categoría:Obras de <Autor>` de Autores YA en el Corpus, contando como cubierta una obra con subpáginas versionadas (script en el scratchpad de la it. 7: se pierde, se recrea en 30 líneas). Rinde ~1 % en prosa de sentencias, pero Gracián es la mejor mina |
| hecha (20 Citas, it. 8) | `El Único y su Propiedad` (Stirner, 19 pp.) y `Emilio` (Rousseau, 4 libros) | 8.671 candidatas, rinde ~0,2 %: prosa filosófica larga. Una subpágina (`/18`) redirige a `Discusión:` y se descarta |
| hecha (15 Citas, it. 9) | `La Hora de todos y la Fortuna con seso` (Quevedo, 1 página de 200 KB) y `¿Qué es el dinero?` (Tolstói) | Bastiat (`¡¡Maldito dinero!!`, diálogo) y Voltaire (`Diccionario Filosófico - Tomo VII`, 3 candidatas) quedan versionados sin Citas. Sondeadas y descartadas: `La Consolación de la Filosofía`, `Metafísica` y `Persiles` (solo el índice: habría que listar subpáginas con `allpages`), `Doctrinal de Quevedo` (Obra por sección), `Gorgias` y `Eutifrón` (diálogos de 50-200 KB) |
| hecha (11 Citas, it. 10) | Mariátegui: 6 artículos (Amauta, feminismo, frente único, unidad indo-española, Lenin, Elogio a Cervantes) | prosa de manifiesto, ~4 %. Quedan de Mariátegui solo `Acta de constitución` y `Programa del Partido Socialista Peruano` (documentos políticos: no). `Persiles`: novela, Obra por página en la edición de 1920, descartado. `Metafísica` (Aristóteles, 17 libros) sin sondear, expectativa baja |
| hecha (2 Citas, it. 11) | Pi y Margall: `El principio federativo` (11 cap.) resulta ser de Proudhon (trad. Pi y Margall) | Autor nuevo Proudhon; los capítulos mezclan comentarios del traductor, y solo se aprobaron las 2 del cap. I, de autoría segura. `La reacción y la revolución` y `Las nacionalidades` declaran una Obra por página; `La federación` es un periódico. Quedan de Pi y Margall artículos sueltos con títulos largos y fechas (mala Obra): no. Lección: comprobar con `ver-urls` de qué página sale cada sentencia cuando el texto es una traducción comentada |
| hecha (23 Citas, it. 12) | Autores NO sembrados con `Categoría:Obras de <Autor>`: Maquiavelo (`El príncipe`, 1854, 25 cap.) y Nietzsche (`Así habló Zaratustra`, 3 cap.; `Más allá del bien y del mal`: la página solo trae prólogo y 1.ª sección) | Autores nuevos Maquiavelo y Nietzsche. Se saca la lista con `acprefix=Obras de ` filtrando los nombres que no están en `corpus/autores/` (151 con ≥3 obras). Aún sin sondear de esa lista: Kant (`Fundamentación para la metafísica de las costumbres`, subpáginas), Ramiro de Maeztu (16 ensayos breves, Obra individual cada uno), Ángel Ganivet (solo `Pío Cid`), Manuel Azaña (5 discursos), Santa Teresa (`Exclamaciones…`), Dostoyevski, Chéjov, Baudelaire, Zola, Darwin (no es de sentencias), Dante |
| hecha (17 Citas, it. 13) | Kant (`Fundamentación…`, trad. García Morente: usar las subpáginas con `/`, no las de `:`, que son otra edición), Azaña (`Apelación a la República`; `Paz, Piedad y Perdón` sin Citas) y Maeztu (10 ensayos, ~0,5 %) | Autores nuevos Kant, Azaña, Maeztu. Sin sondear de la lista de 151: Dostoyevski, Chéjov, Baudelaire, Zola, Dante, Macaulay, Blanco White, Jovellanos (sin obras), Santa Teresa (`Exclamaciones` solo 5 KB: descartada). Cuidado con la proporción latinoamericana: 55,6 % tras sembrar Autores de tradición «otra»/peninsular (suelo 40 %) |
| hecha (16 Citas, it. 14) | Roberto Arlt, `Aguafuertes porteñas` (44 crónicas, una sola Obra) | Autor nuevo latinoamericano. Truco: la página índice de una obra lista los títulos de sus piezas en el cuerpo; se pueden sacar de ahí y recuperar una a una. De la lista de Autores hispanoamericanos sin sondear: Vicuña Mackenna (`La ciudad encantada de los Césares`, histórica), Rodolfo Lenz (lingüística), Largo Caballero (4 artículos), Anselmo Lorenzo (3 textos breves), Carlos Olivera (`En la brecha`), Pedro N. Cruz Vergara (crítica literaria): todos rinden poco; Arlt tiene además novelas (`Los siete locos`, `El juguete rabioso`) sin probar |
| agotada (0 Citas, it. 15) | Sondeo de `Tradiciones peruanas` (Palma: la página trae solo epígrafes de capítulo —refranes— y no hay subpáginas), `Crítica de la razón práctica` (Kant) y `Diccionario Filosófico - Tomo IX` (Voltaire): solo índices | Una obra de 100 KB con 778 frases «descartadas por longitud» y 6 candidatas es narrativa de párrafos largos: no insistir. Señal para la parada: la veta de «categoría → obra con una sola Obra declarada y frases breves» está casi seca; lo que queda son Autores nuevos de la lista de 151 con obras de ensayo, a ~1 % |
| hecha (3 Citas, it. 16) | Último barrido de los Autores nuevos de la lista de 151: Zola (`¡Yo acuso!`; `Crítica social` declara una Obra por ensayo: descartada), Engels, Poe, Dostoyevski, Chéjov, Macaulay, Baudelaire, Wells, Irving (índices, ficción o Obra por página) | Con esta iteración el rendimiento por veta ya es de unas pocas Citas por hora de trabajo. Quedan sin probar solo narrativa (Arlt, Dostoyevski, Chéjov, Wells, Poe…) y los ensayos de Macaulay (4 subpáginas) |
| agotada (0 Citas, it. 17) | Macaulay (`Estudios críticos…`: Obra por página) | **PARADA** del bucle: iteraciones 15, 16 y 17 con 0, 3 y 0 Citas. Balance del bucle: +247 Citas (4.546 → 4.793) y 10 Autores nuevos en 17 sesiones |
| pendiente (poco) | Del mismo cruce, sin sondear: `Diccionario Filosófico` (Voltaire, tomos VII y IX, sin subpáginas), `La Consolación de la Filosofía` (Boecio), `Los trabajos de Persiles y Sigismunda` (Cervantes), Platón (Gorgias, Fedón, El banquete, Eutifrón), Jenofonte (Apología), `Doctrinal de Quevedo`, `La hora de todos`, Mariátegui (8 escritos), Pi y Margall (12), Salmerón (4), Castelar (5), Tolstoi `¿Qué es el dinero?`, Bastiat, Aristóteles `Metafísica`, Cicerón (`De la invención retórica`) | probar UNA página y mirar `Obra:`; `El Criticón` solo tiene índice; descartadas ya: Lucilio, Antonio Machado y Lorca (verso), Ovidio (verso) |
| pendiente | `Escritos de Simón Bolívar`, `Política (Amadeo)` (23 pp.), `Ética a Nicómaco/Libro 0` | rinden poco |
| agotada (0 Citas, it. 6) | Búsqueda `intitle:` de máximas/aforismos/pensamientos/sentencias/proverbios/refranes/consejos | descartados: «Las máximas de Epicteto» (poema de Bacarisse), `Enquiridión/Máximas` (volumen con varios Autores, sin Autor), `Vida y pensamientos morales de Confucio` (una Obra por página), `Sentencias del inca Pachacutec` (verso de Althaus), `Refranes glosados` y `Refranes de la lengua castellana` (refranero popular, sin Autor), `Máximas que repetía un excelente padre` (son del padre de Fernán Caballero: autoría dudosa), `Máximas cristianas` (carta en prosa) |
| descartada | `Categorías Aforismos/Máximas/Sentencias/Proverbios` | no existen o vacías; la categoría real es `Pensamientos, máximas, aforismos y definiciones` (fragmentos de Shakespeare, teatro: no) |
| agotada (0 Citas, it. 18) | Wikisource `Categoría:Discursos` y categorías `Cartas de …` / `Epístolas de …` | Discursos de Autores del Corpus: todos ya versionados; el resto, políticos modernos y protegidos. `Cartas desde mi celda` (Bécquer): Obra por página. Las demás cartas son de personajes históricos sin sentencias |
| hecha (10 Citas, it. 19) | Cicerón, `De la invención retórica` (200 KB, trad. antigua con OCR sucio) | 858 candidatas, 10 aprobadas (~1,2 %): definiciones. `Metafísica` (Aristóteles) es solo índice y `Sobre mi consulado` es verso. `La República` (Platón, Tomás y García) está retirada del Corpus. De Platón/Aristóteles/Cicerón queda ya solo lo versionado |
| hecha (12 Citas, it. 20) | `Categoría:Filosofía` de Wikisource: Epicuro de Samos, `Carta de Epicuro a Meneceo` (Autor nuevo, 38 candidatas, tan buena como La Rochefoucauld) | Rousseau `Discurso sobre… la desigualdad`: documento con OCR roto (se negó extraer); `Compendio de la filosofía moral` (Zanotti): solo índice. Lección: **cartas/textos breves de filósofos antiguos** (Epicuro, Marco Aurelio, Epicteto…) rinden mucho; buscar `Categoría:Obras de <filósofo antiguo>` de los no sembrados. Ganivet `El porvenir de España` ya versionado |
| hecha (13 Citas, it. 21) | Autores de Wikisource con 1-2 obras no sembrados (el filtro de la it. 12 pedía ≥3): Emma Goldman (`Anarquismo: lo que significa realmente`, 10) y Benjamin R. Tucker (`Socialismo de Estado y anarquismo`, 3) | Lista de 429 Autores en el scratchpad (se recrea: `allcategories` con `acprefix=Obras de `, 1-2 páginas, sin ficha en `corpus/autores/`). Descartados al sondear (solo índice o ya retirados): Descartes `Discurso del método`, Moro `Utopía`, Ferrer `La escuela moderna`, Ribadeneira `Tratado de la tribulación`, Bellegarrigue (retirado). Sin sondear de esa lista: Huarte `Examen de ingenios`, Fontenelle, Leonardo `Tratado de la pintura` (hay uno de Gutenberg), Gómez de Baquero, Amadeo, Nakens, Urales, Flora Tristán, Alberti, Villena, Loyola, Ibn/otros |
| agotada (0 Citas, it. 22) | Segundo sondeo de la lista de 429: Huarte, Fontenelle, Nakens, Bark, Gómez de Baquero | Índices o textos de 1-5 KB; `La dictadura republicana` y `Humorismo anticlerical` (sin autor declarado, sátira política); Baquero escribe sobre Nietzsche y glosa ideas ajenas (Autor creado y retirado con `autor.ts retirar`). Del resto de la lista de 429 nada apunta a sentencias; lo que queda son poetas, dramaturgos, historiadores y científicos |
| hecha (10 Citas, it. 23) | Recabarren (`El Socialismo`, `La mujer y su educación`; latinoamericano) y Teresa Claramunt (`En la cárcel`; `La acracia…` solo 17 candidatas) | Prosa de folleto/propaganda: ~3 %. Autores nuevos Recabarren y Claramunt. Sondeados sin Citas de la lista de 429: Huarte, Campomanes, Bonafoux (`Huellas literarias`), todos índices. Queda de la lista casi solo poesía, teatro y narrativa |
| hecha (11 Citas, it. 24) | Cruce `Categoría:Obras de <Autor>` de **todos** los Autores del corpus contra `corpus/fuentes/` (69 Autores con alguna obra sin documento): Pi y Margall `El consentimiento` (4), López Arango `Sindicalismo y anarquismo` (3), Kropotkin `Carta a Lenin` (1), Salmerón `La crisis permanente` (3) | Descartados al sondear: Rosario de Acuña `Amor a la patria` (es un drama), Tarrida `Los Malos Pastores` (crónica sindical), Stirner `Réplica…` (mezcla con El Único), los ya retirados (Stirner, Mariátegui, Menéndez Pelayo…). Resto de la lista: poesía (Machado, Lorca, Ovidio, Virgilio, Horacio), narrativa (Dickens, Arlt, Galdós) y obras ya juzgadas. `Artículos de Larra` y `González Prada` ya están completos |
| hecha (21 Citas, it. 25) | **Búsqueda de texto completo** de Wikisource (`list=search`, `srsearch="máximas morales"`, `"pensamientos" aforismos`, `sentencias filosofía moral`, tamaño > 4 KB): Feijoo, `Teatro crítico universal` (9 discursos, una sola Obra; 12 Citas de 1.379 candidatas filtradas) y Bakunin, `Dios y el Estado (capítulo)` (9 Citas) | Autores nuevos Feijoo y Bakunin. Funciona mejor que las categorías: encuentra obras sin categoría de Autor. Pendientes de esas búsquedas: `Compendio de la filosofía moral` (Zanotti, 59 subpáginas con una sola Obra, tratado escolástico: probar 2-3 páginas antes), `De la desigualdad personal en la sociedad civil` (Valera, 37 subpáginas, Obra única), `Un poco de crematística`. Probar más consultas: `"es preciso"`, `"el hombre"` + `libertad`, `"la virtud"`, `ensayo`. Descartados: El contrato social (Obra por capítulo), Historia del año 1883 (crónica política) |
| hecha (5 Citas, it. 26) | Bakunin, `El principio de autoridad` (mismo Autor de la it. 25; frases célebres) | La búsqueda masiva (`busqueda-masiva.py`: 15 consultas de texto, tamaño > 6 KB, cruzadas contra `fuentes` y `_fuentes-retiradas`) deja ~390 obras; las no narrativas ya vistas: Fray Luis `Exposición del Libro de Job` (exégesis verso a verso: descartada), Hartmann `La religión del porvenir`, Garnier `Elementos de economía política`, Molinos `Guía espiritual` (Obra con título larguísimo por libro), Quintiliano (Obra por prólogo). **Feijoo y Fray Luis ya tenían ficha en `_autores-retirados/` de una sesión antigua (sin Citas por OCR): la ficha activa nueva de Feijoo convive con la retirada y el build pasa; Héctor puede borrar la retirada.** Pendiente de la lista masiva: `Dos mujeres`, `La escuela moderna` (Ferrer, 11 págs.), `El buscapié`, `Didacticidades`, `Compendio de la filosofía moral` |
| hecha (11 Citas, it. 27) | Marx, `Salario, precio y ganancia` (140 KB), `La nacionalización de la tierra` y `Sobre Proudhon` (Autor nuevo; ~2 % de rendimiento, prosa de economía política) | **Trampa de atribución**: `La guerra civil en Francia (Introducción)` lleva `|autor=Karl Marx` pero el texto dice «Por Federico Engels»; la puerta de `extraer` no lo ve porque compara el autor declarado. Se descartó. Mirar siempre las primeras líneas del cuerpo, no solo `|autor=`. Quedan de Marx/Engels en Wikisource: `Manifiesto del Partido Comunista`, `Crítica al Programa de Gotha` (índice con subpáginas «Glosas»), `El origen de la familia…` (Engels, Obra única: probar), `Anti-Dühring`, `Las luchas de clases en Francia` (Obra por número) |
| hecha (9 Citas, it. 28) | Fray Luis de León, `De los nombres de Cristo` (3 de 30 páginas recuperadas; Obra única; prosa de lo mejor del Siglo de Oro, ~10 % tras filtrar) | **Quedan 27 páginas de esta obra** (`De los nombres de Cristo/Tomo N, <Nombre>`; lista con `prefijo.py "De los nombres de Cristo"`): mina de prosa gnómica para 2-3 sesiones más (máx. ~12 por sesión). El Autor ya tenía ficha retirada de una sesión vieja; hay dos ficheros (activa y retirada) y el build pasa. Engels `Origen de la familia` y `Anti-Dühring`: Obra por página (descartado). Segunda búsqueda masiva (`masiva2.txt`): sin más obras de ensayo de una sola Obra salvo `La casta histórica castellana`, `Memorial de Mascarones y otros ensayos`, `Refranes y máximas populares` (popular), `Atalaya de la vida humana` (Guzmán de Alfarache) |
| hecha (9 Citas, it. 29) | Fray Luis, resto de `De los nombres de Cristo` (21 páginas más, ~1.000 candidatas filtradas) | Fray Luis queda en 18 Citas: CERRADA. Las 21 páginas están versionadas y sus candidatas en `_revision/` por si Héctor quiere más |
| pendiente | Wikisource categorías de Autor de Autores hispanos del XIX/XX no sembrados | solo con obra en dominio público |
| pendiente | Traducciones de moralistas/estoicos/pensadores en Wikisource aún no versionadas | declara traductor la Fuente |

## Informe al terminar cada iteración (una línea)

`Sesión N · veta · Citas +X (total T) · Autores nuevos: … · Obras nuevas: … · build: ok/no corrido · atascos: …`

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
| pendiente (poco) | Del mismo cruce, sin sondear: `Diccionario Filosófico` (Voltaire, tomos VII y IX, sin subpáginas), `La Consolación de la Filosofía` (Boecio), `Los trabajos de Persiles y Sigismunda` (Cervantes), Platón (Gorgias, Fedón, El banquete, Eutifrón), Jenofonte (Apología), `Doctrinal de Quevedo`, `La hora de todos`, Mariátegui (8 escritos), Pi y Margall (12), Salmerón (4), Castelar (5), Tolstoi `¿Qué es el dinero?`, Bastiat, Aristóteles `Metafísica`, Cicerón (`De la invención retórica`) | probar UNA página y mirar `Obra:`; `El Criticón` solo tiene índice; descartadas ya: Lucilio, Antonio Machado y Lorca (verso), Ovidio (verso) |
| pendiente | `Escritos de Simón Bolívar`, `Política (Amadeo)` (23 pp.), `Ética a Nicómaco/Libro 0` | rinden poco |
| agotada (0 Citas, it. 6) | Búsqueda `intitle:` de máximas/aforismos/pensamientos/sentencias/proverbios/refranes/consejos | descartados: «Las máximas de Epicteto» (poema de Bacarisse), `Enquiridión/Máximas` (volumen con varios Autores, sin Autor), `Vida y pensamientos morales de Confucio` (una Obra por página), `Sentencias del inca Pachacutec` (verso de Althaus), `Refranes glosados` y `Refranes de la lengua castellana` (refranero popular, sin Autor), `Máximas que repetía un excelente padre` (son del padre de Fernán Caballero: autoría dudosa), `Máximas cristianas` (carta en prosa) |
| descartada | `Categorías Aforismos/Máximas/Sentencias/Proverbios` | no existen o vacías; la categoría real es `Pensamientos, máximas, aforismos y definiciones` (fragmentos de Shakespeare, teatro: no) |
| pendiente | Wikisource `Categoría:Discursos` de Autores ya en el Corpus | oratoria: cribar con cuidado |
| pendiente | Wikisource `Categoría:Cartas` de Autores ya en el Corpus | |
| pendiente | Wikisource categorías de Autor de Autores hispanos del XIX/XX no sembrados | solo con obra en dominio público |
| pendiente | Traducciones de moralistas/estoicos/pensadores en Wikisource aún no versionadas | declara traductor la Fuente |

## Informe al terminar cada iteración (una línea)

`Sesión N · veta · Citas +X (total T) · Autores nuevos: … · Obras nuevas: … · build: ok/no corrido · atascos: …`

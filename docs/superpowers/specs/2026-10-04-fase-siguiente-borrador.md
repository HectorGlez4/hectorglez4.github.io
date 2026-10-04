# Plan de la siguiente fase — borrador (2026-10-04)

> Borrador SIN APROBAR, sin commitear. Los «§N» e «informe §N» remiten a `2026-10-03-datos-recogidos.md`, en esta misma carpeta. Nada de esto se escribe a mano en `_bmad-output/`: lo aprobado irá al PRD con `bmad-prd` y a épicas con `bmad-create-epics-and-stories`.

## 0. Dónde está el sitio hoy

- Google conoce las 2.000 URL e indexa 1.050 desde una sola tanda (17–21/09): Cita ~51 %, Tema 10/24, Colección 6/16, **Autor 18/65**. Hito de SM-1 (≥10 % al mes 2) cruzado; la meta del 90 % en diciembre, no.
- **11 clics y 421 impresiones en 43 días con datos** (0–2 clics/día del 20 al 29/09), posición media 27,5. SM-2 (5.000 sesiones/mes en marzo 2027) está a casi tres órdenes de magnitud: ~8 clics por 28 días.
- 9 de 11 clics caen en Páginas de Cita. Las dos Páginas de Autor con demanda tienen 0 clics **porque están a posición 78,7 (Unamuno, 67 impr) y 69,2 (Gracián, 20 impr)** (§11): desde la página 7 de resultados ningún título ni ficha mueve clics.
- «Autor no se indexa por delgada» **está refutada** (§11): Filemón y Boecio (1 Cita) indexados; Unamuno (147) y Gracián (163) fuera de la muestra. Google muestra sus URL **sin barra final**, forma que redirige con 301 desde el 31/08 (21fc404a); hay 5 «Página con redirección» y 2 «Duplicada» sin identificar.
- De 61 consultas: ~25 de Autor, ~9 biográficas de Unamuno, ~20 texto literal; «frases» 8 frente a «citas» 2; **ninguna** de época.
- Enlaces externos: **0**. Facebook (27.722), TikTok (19.700) e Instagram (5.268) —52.690 seguidores— sin camino comprobado al .net (Linktree sin el sitio; bio de TikTok al .com, que responde 402). YouTube (19.800): sin leer si su descripción enlaza.
- Facebook: 9.096 visualizaciones/28 días, 48 interacciones, 0 comentarios, −9 netos, 80 visitas; **monetización activa**: 0,13 $/28 días, «Acuerdos de marca» disponible (§8). Público México 47 %; el de Google, España (175/421).
- Corpus: 1.894 Citas, parado desde el 05/09; `npm run huecos` dice «No hay hueco»; 41.216 candidatas; mediana 7 por Autor; SM-C1 26,1 %.
- Medición: D1 sin leer (`wrangler` sin sesión); serie de indexación con una lectura (04/09); `SEARCH_CONSOLE_CREDENCIALES` ausente. SM-3/SM-4 no medibles por construcción (AD-13).
- Ingreso del sitio: cuatro Modelos apagados; solo donaciones tiene Umbral cumplido (LC-1…LC-4); el `destino` de Ko-fi está **sin verificar** (src/lib/ingreso.ts l.190–199; DESPLIEGUE.md §4: a 02/09 la cuenta no existía).
- Ritmo: 2 y 3 commits en W39–W40; seis sesiones registradas sin sembrar.

**Tesis:** el sitio ya se indexa; falta autoridad y rastreo —una señal externa que solo el canal propio puede empezar a dar— y una Página de Cita que retenga, medido con series que primero hay que encender. El dinero de los próximos 90 días no sale del sitio; sale, si sale, del canal propio ya monetizado, que el contrato (FR-33, §5, AD-20/21) no gobierna, y el plan lo lee en la semana 0 en vez de darlo por cero.

## 1. Diagnóstico por objetivo

### 1.1 Indexación / SEO
1. El cuello es posición y rastreo: 940 «Detectada, no indexada», 0 dominios de referencia, /autor/* a posición 69–79 (§2, §3, §11; PRD §4.17).
2. Autor (28 %) es la familia más enlazada por dentro (/autor/seneca/ 130) y la delgadez no la explica (§11). Falta una inspección de minutos: la **canónica elegida** por Google para Unamuno y Gracián con y sin barra, y qué son las 5 «redirección» y 2 «Duplicada». Antecede a cualquier cambio en la familia.
3. `tituloDeAutor` («Citas de X», src/lib/marca.ts l.40–49) ya se eligió el 13/09 con el mismo dato de GSC; a posición 69–79 no es palanca.
4. 16.2 (IndexNow) está construida de facto (tools/avisar.ts, 26/08) y en backlog; nadie ha mirado Bing.
5. Las 10 consultas literales «del Quijote» son 9 del Quijote + 1 de Teresa de Jesús (`teresa-de-jesus--quien-a-dios-tiene-nada-le-falta.md`), todas publicadas; «largo me lo fiáis» es de Tirso. Hueco literal real: tres poemas de Machado (`campos-de-castilla.txt` es un índice de 226 palabras).
6. 16.3 cumple su condición solo en el panel y no es computable: la serie guarda recuentos, no rutas (deferred-work l.575).

**No se sabe:** canónica con/sin barra de Unamuno y Gracián; las 5 «redirección» y 2 «Duplicada»; de las ~45 Páginas de Autor no indexadas, cuántas «Detectada» y cuántas «Rastreada»; clics de 28 días exactos (05/09–02/10); si Bing tiene el sitio.

### 1.2 Permanencia
1. La Página de Cita sale solo hacia su Autor: `citasRelacionadas` (publicado.ts:318) filtra `citasDeAutor`; nada hacia otros Autores ni hacia las 539 pertenencias a Colección. FR-12 dice «Citas de los mismos Temas»; UX-DR17 lo estrechó a chips y UX-DR34 dejó el chip de Colección «para una pasada de bmad-ux» (epics.md:1406).
2. Portada, Cita del Día y RSS rotan sobre **16 aptas**, ordenadas por slug (citaDelDia.ts:88: Séneca tres días seguidos); el RSS de 30 jornadas repite 14.
3. D1 solo registra `vista-de-cita` (Medicion.astro:12): portada, Autor, Tema y Colección no dejan fila; sin sesión ni visitante (NFR-10).
4. La Página de Autor no enlaza a ningún Tema ni Colección.

**No se sabe:** vistas por jornada, SM-5/6/7/8; si alguien navega tras el clic.

### 1.3 Facebook y canal propio
1. La distribución funciona (50,9 % de visualizaciones y 83,3 % de interacciones de no seguidores; 12 altas, todas por Reel); la conversión no (−9 netos, 0 comentarios, 80 visitas).
2. El camino del enlace está roto en todos los tramos; `enlaceConOrigen` (redes.ts) existe desde la v2 y nadie lo pisa: SM-8 vacío.
3. Lo publicado no es el texto del Corpus (reel «No tenemos poco tiempo…» frente a `seneca--no-es-que-tengamos-poco-tiempo-es`) y mezcla historia que el sitio no recibe.
4. Toda Pieza aterriza en `/` o `/coleccion/` (piezas.ts:173) y no deja fila en D1.
5. El Kit queda listo a las 05:15 UTC (23:15 CDMX) y el lote nunca se ha usado: `fijaciones: {}`.

**No se sabe:** si los pies llevan `?de=facebook`; qué eran los posts de 493 y 239 interacciones (oct. 2025); horario del público; clics del Linktree.

### 1.4 Dinero
1. **Fuera del sitio ya hay ingreso medido y no leído entero:** Facebook monetiza (0,13 $/28 días, 0,014 $/1.000 vistas, Acuerdos de marca disponibles); YouTube 19.800 suscriptores y 1.300 vídeos; TikTok 19.700. FR-33, §5 y AD-20/21 gobiernan los Modelos **del sitio**, no estas cuentas. Falta leer YouTube Studio (YPP, ingresos 28 días, horas públicas 12 meses, vistas de Shorts 90 días), el panel de monetización de Facebook (RPM por tipo, requisitos de Acuerdos de marca, Estrellas), TikTok Creator (elegibilidad por país) y Spring (ventas). Sin eso el objetivo 1 no tiene cifra.
2. Donaciones: `destino` real + `tests/e2e/ingreso-accesible.spec.ts` + `encendido: true` (ingreso.ts:186). Viven en portada/buscar/404: ~2 personas al trimestre desde Google las verían. Expectativa: 0 €.
3. Los Umbrales 2.000/5.000/25.000 «sesiones orgánicas en el receptor» son **incomprobables por construcción**: D1 sin sesión ni referente; el Worker contesta 204 a lo que no sea POST (worker.ts:47).
4. Solicitar afiliación reabre el reloj de 3 ventas/180 días; FR-35 exige Procedencia completa (495 Citas) y 17.3 está en backlog.
5. Producto propio: solo Gracián tiene 100+ Citas de Procedencia completa (163/163); Marco Aurelio 0, Cervantes 0, Unamuno 1. La tapa blanda de KDP no llega a MX/CO/PE (72 % del público).
6. SM-10 no tiene dónde anotarse.

**No se sabe:** las cifras de los tres paneles; ventas de Spring; si Ko-fi paga en el país de Héctor.

### 1.5 Sembrado
1. La política (objetivo.ts) solo conoce Tema, tradición y época, los tres cerrados; FR-49 dice «por demanda» y la demanda no está en ningún fichero.
2. Cantera (publicadas/candidatas, §5): Marco Aurelio 19/986, Lorca 1/306, Machado 58/152, Gracián 163/502, Unamuno 147/335; Cervantes 3 y Castelar 18: ahí hace falta Fuente nueva. Cuántas tienen «carga cero» según `cargaDeCandidata` (ordenDeRevision.ts) es recuento de la lente, no versionado: `revisar` ordena, no cuenta.
3. El coste es aprobar bien: la relectura de la Antigüedad retiró 97 de 376 (25,8 %). En la cola de Marco Aurelio un grep da **131 candidatas** que nombran a «Aurelio» en tercera persona (83), a Gataker/Dacier/Casaubon (25) o llevan «lib.»/«§»/«Thom.» (34): candidatas a nota del traductor, **sin confirmar una a una**; van como texto corrido y `CROMO_MEDIAWIKI` no las alcanza.
4. SM-C1 mide año declarado, no cotejo: 1.873 de 1.894 cotejadas; 0 Citas declaran traductor aunque 64 documentos versionan `|traductor=` (19.1 en backlog; Citas afectadas sin contar).
5. El verso (mayúscula de renglón) bloquea a la vez Martí, Machado y Lorca; «retirada = candidata con nota o estado propio» sigue sin decidir.

**No se sabe:** `busqueda-sin-resultados` en D1; rendimiento por sesión.

## 2. La fase propuesta: sub-proyectos

R01–R16, revisadas por contrato, evidencia y realismo, en seis épicas candidatas. Ninguna se escribe a mano en epics.md.

### E-A «Épica 20: Se mide antes de mover, sin bloquear lo barato» (R01, R04b, R10, R15 paso A)
- **Por qué ahora:** todo lo demás se juzga con series que no existen, y el objetivo 1 no tiene cifra.
- **Entrega:** `wrangler login` y las consultas de DESPLIEGUE.md §3; **lectura de los paneles de monetización del canal** (Facebook, YouTube Studio, TikTok Creator) y de Spring, con fecha; credencial de GSC con `--presupuesto 200` quincenal; **inspección de URL** (Unamuno y Gracián con/sin barra, las 5 «redirección», las 2 «Duplicada», Pages por /autor/: Detectada frente a Rastreada); exportación de Rendimiento 05/09–02/10; Bing (cierra el AC 5 de 16.2 → review); Lighthouse móvil sobre tres Citas («antes» de SM-C4); `vista-de-superficie` en `EVENTOS` (medicion.ts) desde autor/tema/coleccion/portada, redeploy y baliza de comprobación; `tools/trafico.ts` (clics de GSC por mes → `corpus/serie-de-trafico.yml`, idempotente, `--desde-csv`); `tools/demanda.ts` por **página** (los clics por consulta están anonimizados), que informa y no entra en la política.
- **Métrica:** SM-1 por familia versionada; SM-2 medible; línea base de SM-5/6/7/8; SM-8 completo; primera cifra de ingreso del canal.
- **Coste:** una jornada manual + 2–3 días de repositorio. **Dependencias:** ninguna.
- **Restricciones:** AD-13 se amplía por su módulo, sin visitante. SM-3/SM-4 → `bmad-prd`. AD-14/AD-24 intactos. Las cifras del canal se anotan fuera de `corpus/`.

### E-B «Épica 21: El canal propio lleva al sitio, y el sitio lo mide» (R02, R05, R06, R03)
- **Por qué ahora:** 52.690 seguidores sin camino comprobado al .net y una marca `?de=` que nadie pisa; cero commits. El objetivo es **visitas con origen**, no indexación: que un enlace de bio figure en GSC › Enlaces es hipótesis (nofollow, redirectores) que se mide con un post y una lectura a dos semanas; 18.1 exige «dominios que no controla el proyecto».
- **Entrega:** bio de TikTok y Linktree al .net; campo «Sitio web» de Facebook; Redirect Rule 301 del .com y DESPLIEGUE.md §1; pie de cada post con regla de caída (Cita publicada → `/cita/<slug>/?de=facebook`; solo Autor → `/autor/<slug>/?de=facebook`; nada → `/?de=facebook`) — **es** la Historia 18.2; `corpus/senales-externas.yml` con `tipo: propia|ajena` vía 18.1 (solo `ajena` cierra su AC); aptas de 16 a ≥120 en **un solo commit** (≤160 caracteres, 1–2 por Autor, 24 Temas) tras una historia corta que disperse `citaDelDia` por Autor; plantilla semanal con texto literal del Corpus (Foto diaria del Kit, 2 Reels, Colección de la semana con `npm run pieza -- coleccion`, Autor quincenal, pregunta final), precedida de una semana 0 (D1 base, pies, posts de 493/239, horario); Colecciones reordenadas con `quitar`+`asignar`; `corpus/publicaciones-de-canal.yml` solo-añade (AC de 18.2); comparación por semana ISO (D1 es UTC). Donaciones: cuenta real, `destino` abierto, barrido, `encendido: true`; bios al sitio, nunca a Ko-fi.
- **Métrica:** SM-8 por `origen`; visitas a la página (80); SM-10 primera lectura; RSS sin repetir.
- **Coste:** una tarde, 2–3 h/semana sostenidas, horas de repositorio. **Dependencias:** publicar no depende de nada; **medir sí**: hasta que E-A despliegue `vista-de-superficie`, solo los pies que lleven a una Página de Cita dejan fila.
- **Restricciones:** dispersar `citaDelDia` cambia una decisión de implementación (orden por slug, l.88) que ningún AD fija, bajo FR-9/AD-12, y entra como historia; el orden de `miembros` pasa a decisión editorial (deferred-work l.200; compatible con AD-18); 18.2 se abre con su registro. No amplía destinos (AD-13/FR-20). FR-31 sigue cerrado.

### E-C «Épica 22: La Página de Cita deja de ser un callejón del Autor» (R07)
- **Por qué ahora:** única palanca de permanencia que no depende de Google ni de Meta y se revierte con `git revert`.
- **Entrega:** pasada acotada de `bmad-ux` que amplía UX-DR17 y cierra UX-DR34 en el otro sentido (FR-28 no prohíbe la inversa; AD-18 gobierna la declaración, no el enlace); `citasDelMismoTema` en publicado.ts con reparto rotado (el anclaje fijo concentra 338 entrantes en una Cita), `MAX_CITAS_DEL_MISMO_TEMA = 3`; **la sección se pinta con `TarjetaDeCita.astro`** —fragmento acotado, atribución y enlace— porque son Citas de otros Autores y AD-19 exige el mismo componente de tarjeta en toda superficie indexable; la lista `.hermanas` de RutasDeSalida.astro (l.47–55) se queda y su excepción no se extiende; `coleccionesDeLaCita` derivada de `ColeccionPublicada`, chips «Temas y colecciones»; coleccion-pagina.test.ts:271 se sustituye por su inversa. La vecindad por obra espera a 17.3.
- **Riesgo cuantificado:** 965 Páginas de Cita indexadas ganan tres fragmentos ajenos; línea base «Rastreada, no indexada» 20 y «Duplicada» 2 (§2); lectura a 4 y 8 semanas; si suben, `MAX` a 2 o se retira.
- **Métrica:** vistas-de-cita/clics por jornada; SM-1 Colección (6/16) y Tema; páginas con impresiones (136). No promete SM-4.
- **Coste:** dos commits + planificación; dos semanas. **Restricciones:** UX-DR17 y UX-DR34 regenerados; AD-6, AD-11, AD-19, AD-25 intactos.

### E-D «Épica 17, por el lado barato: la Página de Autor enumera y sale» (R08; R09 aplazada)
- **Por qué, y qué no se espera:** la Página de Autor es un callejón y FR-42 pide la lista de Obras: producto y retención. **No mueve posición**: a 69–79 la palanca es autoridad y rastreo (E-B, 18.1 ajena, 16.3); por eso va detrás de E-C.
- **Entrega:** primero las inspecciones de E-A; si la canónica elegida es la forma sin barra, una historia pequeña en la 16/18 antes que nada. Después, commit de corpus con la grafía de «Respuesta a Sor Filotea» (colisión AD-25) y una sesión: 17.3 (Obras desde Procedencia, dueño publicado.ts, 183 obras) + 17.4 (ficha solo en página 1) + historia nueva 17.6 (`temasDeAutor`, `coleccionesDeAutor`, chips bajo el listado). **El título «Frases y citas de {nombre}» se aplaza** hasta que Unamuno esté a posición ≤20, y entonces como cambio de convención declarado (AGENTS.md §Conventions extiende «nunca frase» a identificadores; EXPERIENCE.md l.47 ya usa «frase» en microcopia). Rastreo (18.3) de **URL no indexadas confirmadas por inspección**, ≤10: /autor/miguel-de-cervantes/, /autor/antonio-machado/, /autor/jose-marti/, /autor/santiago-ramon-y-cajal/ (fuera de la muestra de §11), /coleccion/refranes-de-sancho/ y /coleccion/cada-uno-es-hijo-de-sus-obras/ (consultas medidas, fuera de las 6 indexadas), y hasta cuatro de los 14 Temas no indexados; Unamuno, Gracián, Marco Aurelio, Quevedo, Castelar, Balmes, González Prada y Séneca **no**: están indexados (§11) y repetirlos es el ruido que §4.17 prohíbe. `npm run rastreo -- --registrar` + commit el mismo día. 17.1/17.2 condicionadas; 17.5 fuera; 19.4 con condición verificable en la serie.
- **Métrica:** Autor indexados 18 → ≥22 a 6 semanas; salidas desde /autor/* en D1 con `vista-de-superficie`. Posición de Unamuno: se vigila, no se promete.
- **Coste:** días. **Restricciones:** PRD §6.5 («§4.16 va después de §4.17») se enmienda con `bmad-prd`: 17 y 18 en paralelo porque la premisa (11 conocidas, 1 indexada) ya no se cumple; sitios del chip en EXPERIENCE.md (bmad-ux); 19.4 por la skill.

### E-E «Épica 23: Sembrar por demanda, en ráfagas releídas» (R11–R14)
- **Por qué ahora:** el bucle lleva seis sesiones sin hueco; es activo de largo plazo y **no mueve §7 en 90 días**.
- **Entrega:** `META_CITAS_POR_AUTOR_CON_DEMANDA = 50` (= `CITAS_POR_PAGINA`; el 100 por saltos caducó con el paginador numerado) y `META_CITAS_POR_AUTOR = 15` como **metas, no suelos** (un suelo despublicaría 41 Autores); `META_CITAS_PUBLICADAS` 1.000 → 2.200; tramo «profundidad» en meta.ts con recuentos sin nombres (9.3). **19.2 sigue en review**: su AC 1 está cumplido y el listón numérico de época lo sustituyó la 19.5 (sprint-status l.264–266), pero el AC 2 («prioriza por demanda y no por disponibilidad») no se cumple hasta que `tools/demanda.ts` alimente la política (historia condicionada de R10); mientras tanto cada sesión por demanda se registra con `--anular … --elegido` y el tramo ≥15 se declara excepción razonada a FR-49. Ráfagas ≤150 con relectura de 30 como puerta; orden Machado (3 clics) → Marco Aurelio (tras **contar de verdad** las candidatas-nota —131 por grep— y rechazarlas con `revisar --rechazar`, y leer sus 19 publicadas en GSC) → Gracián (no baja SM-C1) → Castelar; prelación LOOP-PROTOCOL-V5: la hora de 16.3/17/18.1 gana. Machado poema a poema; Lorca: revisar las 306 antes de recuperar; censo: documentar cuando exista edición, **no retirar**; 19.1 (traductor desde la cabecera, 64 documentos); año del Índice como «edición de 1888», nunca como año de obra.
- **Métrica:** Citas por Autor con demanda; retirada en relectura <10 % en dos semanas; SM-C1 no baja.
- **Restricciones:** FR-49 y AC 2 de 19.2 (declarado); AC 11.4 «SM-C1 baja ⇒ fallida» → `bmad-prd`; V6 del protocolo; FR-48; AC de 19.9; SM-C1 no se parte.

### E-F «Épica 24: Umbrales comprobables y producto definido con dato» (R15 paso B, R16)
- **Por qué después:** exige tres lecturas de `serie-de-trafico.yml` (enero 2027) y la lectura del canal de E-A.
- **Entrega:** pasada `bmad-prd` + `bmad-architecture` + `bmad-spec`: FR-33 y §12.1 en «clics orgánicos de Google 28 días»; SM-2 **revisada** y Umbrales reanclados a ella (el addendum lo manda); afiliación «solicitar» con 17.3 + clics > 0 en /autor/*; publicidad «no construible sin proveedor sin guion (AD-20)»; `corpus/serie-de-ingreso.yml` solo con Modelos encendidos; §14.7 queda hipótesis. Producto: Fase 0 (clics con `?de=`, Spring real, reglas de KDP), PDF de 20–30 Citas de Gracián en Ko-fi «paga lo que quieras» más Colección pública gratuita; Kindle solo con ≥20 descargas y ≥5 pagos en 8 semanas. Si E-A muestra que YouTube o Facebook ya pagan, la prioridad del objetivo 1 es ese canal y el producto propio espera.
- **Restricciones:** FR-33, §12.1, §7 SM-2, §15; AD-21 («activo fuera del sitio»); PRD §5 se conserva.

**Orden:** A y B la misma semana (A no bloquea publicar en B, sí medirlo); C después; D en la ventana de 60–90 días, tras las inspecciones; E en paralelo a ritmo de ráfaga, detrás de la hora de 16.3/17/18.1; F con serie.

**Qué NO hacer todavía, y cuándo se reabre:** 19.4 Época (≥1 consulta de época en la serie y Autor >50 %); 17.1/17.2 (Unamuno a posición ≤10 con CTR 0 durante 28 días, o biográficas ≥100 impr/28 días); título «Frases y citas de» (Unamuno ≤20); Facebook como destino FR-18 (destino nombrado >20 % frente a `opaco`); FR-31 vídeo (`origen=facebook` ≥400 vistas/mes **dos meses seguidos**, el número de éxito de §3); solicitar afiliación (paso B + 17.3 + clics en /autor/* >0); publicidad (nunca sin proveedor sin guion); boletín y «siguiente» (tras medir C seis semanas); `salida-interna` (90 días sin respuesta); antología KDP (Fase 0 superada); 17.5 (Umbral a la vista).

## 3. Plan 30 / 60 / 90 días

**Mínimo viable de 30 días** —si el ritmo medido (2–3 commits/semana, credenciales un mes sin poner) es el real, esto y nada más—: (1) `npx wrangler login` y credencial de GSC como Propietaria; (2) bio de TikTok, Linktree y campo web de Facebook al .net, Redirect Rule del .com; (3) pie de los posts con `?de=` en WorkItAdmin; (4) una lectura de D1 y de los paneles de monetización del canal, con fecha. Cuatro gestos, cero commits salvo el de la serie.

### Días 1–30
**Héctor, fuera del repositorio:** el mínimo viable; si hay ritmo: `npm run indexacion:registrar -- --presupuesto 200`; inspecciones de URL; exportación de Rendimiento 05/09–02/10; Bing; Lighthouse; posts de 493/239 y pies de los últimos 20; cuenta de cobro y encendido de donaciones; rastreo de ≤10 URL no indexadas confirmadas y registro; decisiones 1–9 de §4.
**Repositorio (si hay ritmo):** `vista-de-superficie` + redeploy; orden disperso de `citaDelDia` + commit único de ≥120 aptas; grafía de Sor Juana; recuento y rechazo de las candidatas-nota; registros de señales y publicaciones; semana 0 y arranque de la plantilla.
**Cifra:** serie con 2 lecturas; línea base de `origen='facebook'` leída y >0 con el pie puesto (solo Páginas de Cita hasta el redeploy); ingreso del canal anotado; primera lectura de Ko-fi; Bing leído.

### Días 31–60
**Héctor:** plantilla sostenida (2–3 h/semana), pie frente a comentario por semanas; relectura de 30 por ráfaga; decisiones del verso y la retirada; decisión sobre el canal de ingreso con la cifra delante.
**Repositorio:** E-C; `tools/trafico.ts` y `tools/demanda.ts`; primera ráfaga (≤150); historia de canónica si la inspección lo exige.
**Cifra:** `origen=facebook` en camino a 400/mes (≥200 orientativo, no umbral); Autor indexados ≥22/65; +100 Citas con retirada <10 %; páginas con impresiones >136.

### Días 61–90
**Héctor:** Fase 0 de producto o trabajo del canal que pague, según E-A; decisión sobre 17.1/17.2; segunda relectura.
**Repositorio:** E-D (17.3 + 17.4 + 17.6); segunda ráfaga; 19.1; duplicidad tras E-C («Rastreada, no indexada», 20 hoy); preparación del paso B.
**Cifra (si funciona):** clics orgánicos ≥60 por 28 días (hoy ~8: ×6–×8, fijado tras la exportación exacta); SM-1 Cita ≥65 %; Colecciones indexadas >6; **`origen=facebook` ≥400 vistas/mes** (éxito; condición de FR-31 si dura dos meses) o **<100** (fracaso: la página no es canal de visitas; entre 100 y 400 se sigue sin reabrir nada); visitas a la página ≥300; SM-10 leído tres veces; ingreso del canal con dos lecturas comparables.

## 4. Decisiones que solo Héctor puede tomar

1. **Credenciales esta semana** (wrangler; GSC como Propietaria). Recomendación: día 1.
2. **Cuenta de cobro:** Ko-fi / PayPal / no encender. Recomendación: Ko-fi si paga en su país; encender con expectativa 0 €; bios al sitio, nunca al cobro.
3. **El .com:** redirigir 301 o dejarlo caducar (07/2027). Recomendación: redirigir; es la bio de TikTok ante 19.700 personas.
4. **Página de Facebook:** mixta o solo Citas. Recomendación: decidir tras leer los posts de 493/239; por defecto Citas con un espacio semanal de historia.
5. **UX-DR17/UX-DR34:** «Del mismo tema» (con `TarjetaDeCita`) y chips de Colección en la Cita. Recomendación: sí, pasada de `bmad-ux` acotada.
6. **Título de Autor:** aplazar «Frases y citas de» hasta posición ≤20; entonces, cambio de convención declarado (AGENTS.md / PRD §3). Recomendación: aplazar.
7. **Listón y 19.2:** META 50 con demanda, 15 con cantera, 2.200 totales, `META_AUTORES_DE_OTRA_TRADICION` sin poner; 19.2 **no se cierra** hasta que la demanda entre en la política, salvo que Héctor acepte las anulaciones registradas como cumplimiento provisional del AC 2 y lo diga. Recomendación: aceptar las metas; 19.2 en review; tramo ≥15 como excepción razonada a FR-49.
8. **Verso:** literal con mayúscula de renglón y separador «/», o normalizado. Recomendación: literal con separador (FR-24); desbloquea Martí, Machado y Lorca.
9. **Retirada:** candidata con nota o estado propio. Recomendación: estado propio (`retirada:` con motivo; `revisar` la oculta).
10. **Épica 17:** 17.3 → 17.4 → 17.6 tras las inspecciones; 17.1/17.2 condicionadas; Wikipedia CC BY-SA por oldid confirmada Autor a Autor; 17.5 fuera. Recomendación: sí, sabiendo que no mueve posición.
11. **PRD §6.5:** 17 en paralelo con 18. Recomendación: sí.
12. **Umbrales:** reanclar a una SM-2 revisada en clics de GSC con tres lecturas; marketplace sin decidir. Recomendación: sí; sin cifras antes de enero.
13. **Canal de ingreso fuera del sitio:** tras E-A, una de tres: (a) YouTube (vídeo largo en español, YPP) si está admitido; (b) Acuerdos de marca / Estrellas en Facebook si cumple requisitos; (c) producto propio (Fase 0 + PDF de Gracián). Decide dónde van las 2–3 h semanales del canal. Recomendación: solo con las cifras; sin ellas, (c) como prueba barata.
14. **¿Una visita con `?de=` cuenta para el Umbral?** Recomendación: no; «orgánico» es solo Search Console.
15. **Horas semanales.** El plan completo asume ~6 h; el mínimo viable cabe en una tarde. Con menos de 6, se recorta E-E primero, E-D y E-C después; el mínimo viable y E-B nunca.

## 5. Riesgos y qué falsaría la tesis

- **Canal:** `origen=facebook` <100 vistas/mes a 90 días con plantilla y pie puestos → la página no trae visitas; FR-31 sigue cerrado y la fase siguiente no cuenta con Facebook. Entre 100 y 400 se sigue; ≥400 dos meses reabre FR-31.
- **Autor:** la delgadez ya no explica el 28 % (§11). Falsaría «autoridad y rastreo»: si, confirmada la canónica con barra y pedido rastreo de las 4 Páginas de Autor con demanda, a 6 semanas siguen fuera y las ~45 restantes son «Rastreada» y no «Detectada», el problema es de contenido y E-D sube.
- **Canónica:** si Google elige la forma sin barra para Unamuno/Gracián, hay una historia de 16/18 antes que nada en la familia; si no, el residuo de la migración del 31/08 se descarta.
- **Autoridad:** si los clics no pasan de 30 por 28 días con 1.050 indexadas, la única palanca es 18.1 con dominios ajenos, que ninguna épica de esta fase construye.
- **Dinero:** si YouTube/Facebook/TikTok no son elegibles o pagan céntimos, el objetivo 1 queda en 0 € a 90 días y el plan lo dice; si pagan, el riesgo es gastar horas de canal en el sitio en vez de en el formato que paga.
- **Ejecución:** credenciales un mes sin poner; 2–3 commits/semana convierten «días» en semanas (por eso el mínimo viable); fragmentos ajenos en 965 páginas (vigilar «Rastreada» 20 y «Duplicada» 2); una relectura saltada deja la ráfaga sin freno; Facebook puede recortar alcance a posts con enlace (se mide); KDP puede rechazar dominio público no diferenciado.

## 6. Apéndice: recomendaciones verificadas

| id | título | estado | objetivo | coste | quién | modificación / motivo |
|---|---|---|---|---|---|---|
| R01 | Medir: GSC, wrangler, Bing | modificada | medición | horas | Héctor | No bloquea lo barato; `--presupuesto 200`; sin `MEDICION_ENDPOINT`; SM-3/SM-4 no medibles; NFR-7 con Lighthouse; inspección de canónica y Detectada/Rastreada; paneles del canal; 16.2 → review |
| R02 | Camino del enlace desde redes | modificada | facebook | horas | Héctor | Es la 18.2; regla de caída del pie; solo el pie a Cita mide hasta `vista-de-superficie`; registro `propia/ajena`; enlaces de bio en GSC como hipótesis; shorts solo Autores del Corpus; sin cifra en «Acerca de» |
| R03 | Encender donaciones | modificada | dinero | horas | ambos | Bios al sitio, no a Ko-fi; destino sin verificar → abrirlo; expectativa 0 €; no depende de R01; lectura 30/60/90; prioridad baja |
| R04 | Redespliegue del receptor | modificada | medición | horas | ambos | Núcleo `vista-de-superficie`; Facebook destino aplazado (solo escritorio) con prueba de `quote`; comprobación tras deploy; no se vende como SM-4 |
| R05 | Aptas 16 → ≥120 | modificada | retención | horas | ambos | Un solo commit; rotación dispersa como historia (citaDelDia.ts:88); ≤160, 1–2 por Autor; precondición de R06 |
| R06 | Sistema semanal de Facebook | modificada | facebook | 2–3 h/sem | ambos | Semana 0; `quitar`+`asignar`; registro de publicaciones; semana ISO; sin `destino=facebook`; éxito 400 / fracaso 100; mínimo viable |
| R07 | Página de Cita sale del callejón | modificada | permanencia | días | ambos | Sin obra (→17.3); reparto rotado; MAX 3; `TarjetaDeCita` por AD-19; duplicidad cuantificada; prueba guardiana sustituida |
| R08 | Épica 17 reabierta | modificada | permanencia | días | ambos | Solo 17.3+17.4+17.6 tras inspecciones; premisa corregida por §11 (posición 69–79); 17.1/17.2 condicionadas; 17.5 fuera; §6.5 enmendado; grafía Sor Juana |
| R09 | «Frases» en título + rastreo | modificada | indexación | horas | ambos | Título aplazado (posición ≤20; cambio de convención declarado); rastreo desacoplado: ≤10 URL no indexadas confirmadas contra §11; nunca las indexadas |
| R10 | Serie de demanda + 16.3 | modificada | sembrado | días | repo | Por página, informa; rama en política con 3 Autores ≥50 impr/mes dos meses, y es lo que cierra el AC 2 de 19.2; 16.3 cuando la serie registre >20 % |
| R11 | Listón 19.2 | modificada | sembrado | día | Héctor | META 50 (no 100); 15 como meta, no suelo; 2.200; 19.2 sigue en review; delgadez refutada por §11 |
| R12 | Cadencia de sembrado | modificada | sembrado | horas | ambos | Ráfagas ≤150 con relectura como puerta; prelación Épica 18; Machado → M. Aurelio → Gracián; recuento real de candidatas-nota antes de purgar; V6 del protocolo |
| R13 | Fuentes nuevas y censo | modificada | sembrado | horas | ambos | «Largo me lo fiáis» es de Tirso; «yo sé quién soy» ya publicada; 9 Quijote + 1 Teresa; Machado poema a poema; Lorca revisar antes; censo sin retirar |
| R14 | Notas al pie y año del Índice | modificada | sembrado | tarde + 19.1 | repo | Notas como texto corrido: purga manual tras contar; 19.1 desde cabecera (64 documentos); año del Índice como edición; SM-C1 no se parte |
| R15 | Umbrales medibles + series | modificada | dinero | días | ambos | Paso A ahora; paso B con 3 lecturas, reanclado a SM-2 revisada; sin serie de canales externos en corpus/; el canal se lee en E-A |
| R16 | Antología en KDP | modificada | dinero | días | ambos | Fase 0; solo Gracián elegible; Kindle, no papel; PDF en Ko-fi; subordinada a la decisión 13; cambio de contrato declarado (§5, AD-21) |
| SEO-7 | Colección del Quijote | descartada | — | — | — | Ya existe refranes-de-sancho.yml (20 miembros); el resto va en R06 y R09 |
| P8 | Boletín | descartada | — | — | — | «Hoy nada de código»; la forma admisible (enlace, sin guion) queda dicha |
| P9 | «Siguiente» en la Cita | descartada | — | — | — | Aplazada hasta medir R07; R04c daría el instrumento |

**Cierre.** Nada de esto se escribe a mano en `_bmad-output/`: el plan aprobado va al PRD con `bmad-prd` (FR-33, §6.5, §12.1, SM-2, SM-3/SM-4, FR-48, FR-49, AC 11.4), a UX con `bmad-ux` (UX-DR17, UX-DR34, chips en Autor, línea de atribución con edición), a la espina con `bmad-architecture` (AD-13, AD-24 extendido a las series nuevas, AD-21 «activo fuera del sitio») y a épicas e historias con `bmad-create-epics-and-stories` y `bmad-sprint-planning`. Las decisiones de §4 van antes que cualquiera de esas pasadas.

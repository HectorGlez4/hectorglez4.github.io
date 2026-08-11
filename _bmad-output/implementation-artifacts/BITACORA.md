# Bitácora del sprint — Sabiduría Diaria

Una línea por historia cerrada: qué se verificó y qué quedó fuera.
El protocolo del bucle está en `LOOP-PROTOCOL.md`.

---

## 1.1 — Andamiaje del proyecto

**Verificado.** Node 24.3.0 supera el mínimo 22.12; la comprobación está encadenada a
`prebuild` y `predev` y su comparación se prueba con versiones por debajo del mínimo
sin necesitar un Node antiguo instalado. `astro dev` arranca y sirve 200. `npm run build`
termina sin errores y produce `sitemap-index.xml` más `sitemap-0.xml`. Los diez
directorios de la espina existen. `astro check`: 0 errores. Vitest: 16 pruebas en verde.

**Decidido por el camino.** El dominio de `site` es provisional
(`https://sabiduria-diaria.es`, conmutable con `SITE_URL`) porque el definitivo no está
contratado; vive solo en `astro.config.mjs`, así que cambiarlo es una línea. Se fijó
`build.format: 'file'` y `trailingSlash: 'never'` para que las URL sean exactamente
`/cita/{slug}` sin barra final, como exige NFR-4.

**Fuera de alcance.** El `AGENTS.md` de la raíz declara en su bloque gestionado que
«no hay `package.json` todavía»; a partir de esta historia es falso. No se edita a mano
porque lo regenera `bmad-project-context`. Conviene volver a ejecutar esa skill al
cerrar la Épica 1.

---

## 1.2 — La puerta de admisión vive en el esquema

**Verificado.** Nueve pruebas construyen un proyecto aislado con un corpus fabricado y
comprueban el código de salida y el mensaje: una Cita válida construye; sin procedencia,
con procedencia que no documenta nada, sin texto, con `estadoDerechos` distinto de
`dominio-público` y con un Autor sin `añoFallecimiento` rompen el build. El mensaje trae
la ruta del fichero y la regla incumplida.

**Resuelto en el camino — dos hallazgos reales.**

1. El PRD §265 zanja la aparente contradicción entre «procedencia obligatoria» (1.2) y
   «Cita sin procedencia documentada» (2.1): *una Cita sin Procedencia no pasa a
   publicada, queda en revisión*. Así que el campo es obligatorio y debe documentar algo
   —obra, año o referencia—; «ausente» no es un estado que `corpus/citas/` admita. La
   distinción completa/parcial que audita la 1.8 es la presencia de `obra` **y** `año`.
2. `procedencia:` sin nada debajo —la forma natural de escribir «esto no lo tengo»— la
   lee YAML como `null`, y Astro lo reportaba como ``Expected type `object`, received
   `object` `` porque `typeof null` es `"object"`. El build fallaba, sí, pero con un
   mensaje inservible, incumpliendo el criterio de que indique la regla. Se preprocesa el
   nulo a objeto vacío para que responda el refinamiento con el texto de la regla.

**Decidido.** El `texto` de la Cita vive en el frontmatter y no en el cuerpo del markdown:
el procesador aplica SmartyPants y reescribiría comillas y guiones, lo que NFR-12 prohíbe.

**Hueco abierto.** Una Cita que referencia un Autor inexistente **no** rompe el build hoy:
Astro valida las referencias de forma perezosa y ninguna página consulta todavía las
colecciones. Queda anotado para cerrarlo en `publicado.ts`, que por AD-11 es el dueño del
conjunto publicable y el sitio natural de la integridad referencial.

---

## 1.3 — Lo no publicado no existe para el build

**Verificado sin escribir código de producción.** La historia salió en verde con el
esquema tal como lo dejó la 1.2, lo cual es la señal de que AD-2 se materializó donde
debía: las tres colecciones tienen por base `corpus/{citas,autores,temas}`, de modo que
`corpus/_revision/` no está al alcance de ninguna. No hay nada que filtrar porque no hay
nada cargado.

Seis pruebas lo fijan para que no se pierda. La más fuerte es la segunda: una Cita **sin
procedencia** colocada en `_revision/` **no** rompe el build. Por la Historia 1.2 sabemos
que en `corpus/citas/` lo rompería. Que no lo haga demuestra que el fichero no se carga
—no que exista un filtro que lo esquive—, y esa distinción es justo la que AD-2 protege.

Las demás: la sonda que enumera la colección no ve la Cita en revisión y sí la publicada;
la Cita en revisión no aparece en el sitemap; y mover el mismo contenido byte a byte de
`_revision/` a `citas/` la publica sin ningún otro cambio. Dos pruebas de código fijan que
no exista un campo booleano de publicación ni una colección con base en `_revision/`.

**Añadido al arnés.** `construirConCorpus` acepta ahora páginas sonda, que permiten leer
del HTML construido qué cargó de verdad cada colección sin esperar a que existan las
páginas reales de la Épica 2.

**Corregido después.** La suite completa falló una vez de forma intermitente en
«ninguna colección carga una Cita de `corpus/_revision/`». No era el producto: los
proyectos temporales enlazan el `node_modules` de la raíz en lugar de copiarlo, así que
todos comparten la caché de Vite y dos builds simultáneos la reoptimizan a la vez. Se
serializa la suite (`fileParallelism: false`). Cuatro pasadas completas seguidas en verde,
31 pruebas, ~10 s.

---

## 1.4 — Normalización canónica y slug inmutable

**Verificado.** 22 pruebas. La normalización quita diacríticos, pasa a minúsculas,
colapsa espacios y elimina puntuación —incluida la que solo usa el español: «», ¿ y ¡—;
«Corazón» y «corazon» coinciden. El slug de Cita sale del slug del Autor más siete
palabras del texto en forma canónica, solo admite minúsculas, dígitos y guiones, y el
mismo texto con otra puntuación da el mismo slug. Tres pruebas de código recorren todo
`src/` y fijan que nadie descomponga en NFD ni borre marcas combinantes por su cuenta, y
que `normalizar.ts` y `slug.ts` no importen `node:fs` ni Astro (AD-5).

**Decidido — la eñe se pliega a ene.** Descomponer en NFD convierte «ñ» en «n», y en
español la eñe es letra propia, no una ene acentuada: lingüísticamente es una pérdida. Se
acepta porque el propósito de la función lo exige. FR-7 promete que el visitante encuentre
«escribiendo como se escribe de verdad, sin acentos», y quien busca «español» teclea
«espanol»; conservar la eñe rompería esa búsqueda. Lo que AD-3 prohíbe no es tomar esta
decisión, sino tomarla dos veces y distinta en cada sitio.

**Decidido — la puntuación se sustituye por espacio, no por vacío.** Sustituir por vacío
convertiría «vida,es» en «vidaes», una palabra que no existe y que ninguna búsqueda
encontraría. Hay prueba que lo fija.

**Decidido — `slugDeCita` no admite Temas en su firma.** AD-4 prohíbe que el Tema
participe en la ruta de una Cita. Dejarlo fuera de la firma hace que lo prohibido no
pueda ni escribirse, en lugar de confiar en que nadie lo pase.

---

## 1.5 — Alta de Citas por lote

**Verificado.** 10 pruebas sobre corpus temporales en disco, más una pasada real del CLI:
las completas van a `corpus/citas/` con su slug generado y el nombre de fichero
`{slug-autor}--{fragmento}.md`; las incompletas a `corpus/_revision/`; el informe da una
frase por regla incumplida; un Autor inexistente se señala y **no** se crea; dos Citas del
mismo Autor que empiezan igual reciben slugs distintos sin tocar el de la que ya estaba;
`--seco` calcula el informe sin escribir nada.

**Estructural.** Las reglas de admisión se extraen a `src/lib/admision.ts`.
`content.config.ts` las cablea a las colecciones —ahí siguen siendo la puerta de AD-1— y
la herramienta importa **las mismas**. El motivo es concreto: una copia de las reglas en
`tools/` podría aceptar una Cita que el build rechaza después, y el editor descubriría el
desacuerdo al construir en lugar de al dar de alta. Hay prueba que fija que ninguna
herramienta redeclare el estado de derechos.

**Dos correcciones al pasar el CLI de verdad.** Omitir `procedencia` entera daba «expected
object, received undefined» —correcto y en inglés, pero no dice qué hacer—; ahora responde
con la regla. Y el registro que se escribe al fichero se construye explícitamente en lugar
de volcar la salida de `safeParse`: al validar, Zod rellena los campos con valor por
defecto y toda Cita habría salido con `aptaParaPortada: false` y `temas: []`, contra la
convención de omitir lo que no tiene valor, y además invitando a leer ese `false` como una
decisión tomada cuando es la ausencia de decisión.

**Aplazado a propósito.** El corpus real no se siembra todavía. Sembrarlo con las
herramientas —y no a mano— es la demostración honesta de que funcionan, así que se hace al
cerrar la 1.7, cuando exista también la gestión de Autores y Temas.

---

## 1.6 — Detección de duplicados en la ingesta

**Verificado.** 8 pruebas. Una Cita equivalente a otra ya publicada se señala **antes de
escribir nada** —se comprueba que ni `citas/` ni `_revision/` cambian—, y la tolerancia se
prueba por separado para puntuación, acentuación y mayúsculas. Un texto distinto no se
confunde. Con `--con-duplicados` se incorpora igualmente. El texto señalado sigue íntegro
en el informe: no se pierde, solo no se escribe.

**Decidido.** El índice se construye con la forma canónica de AD-3, la misma que usará la
búsqueda. Es el punto entero de la decisión: con dos criterios distintos, el corpus podría
acabar con dos Citas que la búsqueda presenta como una sola. Hay prueba que fija que
`alta.ts` importe `normalizar` y que no haya ninguna comparación artesanal —ni un
`toLowerCase()` suelto— que la esquive.

**Añadido sobre lo pedido.** La detección cubre tres orígenes y el informe los distingue:
lo ya publicado, lo que está en revisión y la repetición dentro del propio lote. Los dos
últimos no los pedía el criterio, pero un lote que trae la misma Cita dos veces es
exactamente el caso que describe la historia —incorporar un lote de un autor recién
entrado en dominio público— y detectarlo solo mañana, en el siguiente lote, sería llegar
tarde.

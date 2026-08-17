---
title: "Guía de arranque — Sabiduría de Bolsillo"
status: final
created: 2026-08-10
updated: 2026-08-17
---

# Guía de arranque

Acompaña a `ARCHITECTURE-SPINE.md`. La espina fija los invariantes; esto es el camino concreto. **Si algo aquí contradice la espina, manda la espina.**

La versión de esta guía para la v1 —del repositorio vacío a la primera Cita— cumplió su función y se retira: el esqueleto está montado, `src/lib/` construido y las diez épicas de la v1 y la v2 cerradas. Lo que sigue es la v3.

## Dónde estás

Treinta y ocho Citas publicadas, ocho Temas, el sitio construido entero y **sin publicar**. Las cuatro puertas de LC-1…LC-4 siguen cerradas: el dominio no sirve, el sitemap no se anuncia, Search Console no está verificada y el receptor de medición no recibe. Todo lo que la v2 construyó para medir está sin estrenar.

## El orden, y por qué este

La v3 tiene una puerta de activación, no un orden de construcción (§6.3 del PRD, reescrita). Se puede construir en el orden que convenga; **lo que no se puede es publicar ni compartir nada antes de que LC-1…LC-4 estén verificadas**. Dicho eso, hay un orden que hace verificable lo siguiente:

1. **Abrir las cuatro puertas.** No produce ninguna historia: es ejecutar `DESPLIEGUE.md` §1–§3. Va primera y no por burocracia — **la jornada en que se cierra es el mes 0 del producto**, y toda métrica con plazo se cuenta desde ahí. Mientras siga abierta, SM-1 y SM-2 no tienen origen y la v3 no puede saber si algo funciona.

2. **Crecer el Corpus.** Operación, no desarrollo: las herramientas de §4.11 están construidas y probadas. Va segunda porque **todo lo demás mejora con volumen y nada lo sustituye**. Una Colección necesita Citas entre las que escoger, y con 38 no hay cola larga que capturar.

3. **Colecciones (FR-26…FR-28).** La superficie nueva. Empieza por `publicado.ts` y la resolución blanda de AD-18 —el corazón de la feature es que retirar una Cita no rompa nada—, y solo después la página. El umbral mínimo sale de curar las tres o cuatro primeras, no de decidirlo antes (§14.4 del PRD).

4. **Ampliación del canal, sin el vídeo (FR-29, FR-30, FR-32).** Las tres viven en `tools/` por AD-15. El lote es la más barata y la que más devuelve: no exige mecanismo nuevo, porque las fijaciones de `corpus/portada.json` ya son la reconciliación con AD-12.

5. **Monetización, empezando por donaciones (FR-33, FR-34).** Su umbral es «LC-1…LC-4 verificadas», así que se puede encender el día uno. Afiliación y producto propio esperan a sus cifras. Construye primero el dueño del estado (AD-21) aunque solo haya un Modelo: con dos ya es tarde.

6. **Vídeo (FR-31), solo si SM-8 da señal.** Su puerta es explícita: ninguna cuenta de imagen fija demostrando visitas, ningún motor de vídeo. Es la pieza más cara de la v3 y el candidato preferente al recorte, y AD-15 la deja en `tools/` justo para que recortarla no toque nada más.

7. **Publicidad (FR-37), a 25.000 sesiones/mes.** La última porque es la única que cuesta algo al producto. Antes de evaluar proveedores, lee AD-20: deja fuera a buena parte del mercado de display, y conviene saberlo antes de invertir tiempo comparando.

## Los cuatro errores que esta arquitectura invita a cometer *ahora*

Los tres de la v1 —validar en `tools/`, filtrar en vez de separar, codificar un tamaño a mano— siguen vigentes y ya tienen prueba que los detecta. Estos son los de la v3:

1. **Consultar la medición desde el build.** FR-33 dice que los umbrales «se miden en el receptor», y la lectura literal invita a que el build pregunte a D1 qué Modelo encender. Con eso, dos construcciones del mismo commit dejan de dar el mismo sitio. AD-14 lo prohíbe: ningún byte de `dist/` deriva del plano de medición. Consultar se hace desde `tools/` o desde un aviso de CI, y un aviso no es contenido.

2. **Declarar la Colección como se declara el Tema.** El Tema vive en el frontmatter de cada Cita, y copiar ese patrón obliga a editar decenas de ficheros para crear una Colección. Peor: si la lista de miembros fuera una referencia dura del esquema, mover una Cita a `_revision/` **rompería el build**. AD-18 invierte la dirección y la hace blanda a propósito.

3. **Poner un Modelo de Ingreso en el armazón compartido.** Es una línea y aparece en todas partes — incluida la Página de Cita, que es lo primero que FR-34 prohíbe. AD-20 le da dueño propio a qué superficie admite qué Modelo, y el armazón no aloja ninguno.

4. **Añadir una superficie y olvidar la segunda lista.** Hoy el `noindex` está en la página y la exclusión del sitemap en un regex de `astro.config.mjs`. Añadir el lote sin tocar las dos lo deja anunciado, y nadie recibe un error. AD-17 lo reduce a una declaración de la que derivan sitemap, `noindex` y el barrido de accesibilidad.

## Qué verificar antes de dar la v3 por buena

Lo de la v1 sigue en pie y con pruebas. Añade:

- Retirar una Cita a `_revision/` la saca de todas sus Colecciones **sin romper el build** y sin dejar enlace roto (AD-18, FR-26).
- Una Colección que cae por debajo de su umbral desaparece de la página, del sitemap, de los chips y del descubrimiento a la vez (AD-11, AD-18).
- Ninguna Colección publicada queda huérfana: todas son alcanzables desde la portada (AD-11 extendido, NFR-5).
- Construir dos veces sin tocar el Corpus **no vuelve a rasterizar ninguna Tarjeta** (AD-16).
- El sitio se construye y se sirve idéntico con el receptor de medición apagado (AD-14).
- Con todos los Modelos apagados, ninguna superficie tiene hueco reservado ni espacio en blanco (AD-21, §12.1).
- Encender un Modelo es un diff, y `git revert` lo apaga (AD-21).
- Ninguna superficie carga guion de tercero, y `MAX_BYTES_DE_GUION` se cumple con el Modelo encendido (AD-20, NFR-7).
- La Página de Colección pasa el mismo barrido de accesibilidad y móvil que las demás, sin haber tenido que añadirla a ninguna lista (AD-17, NFR-8, NFR-9).

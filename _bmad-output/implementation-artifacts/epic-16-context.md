# Epic 16 Context: El buscador deja de descartar el sitio

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

El sitio cumple desde hace tiempo la exigencia de *ser* indexable —toda página publicada es rastreable, con canónica propia y presencia en el sitemap— y aun así **el buscador ha indexado 8 URL de 1.715**, con 1.534 en «Detectada, actualmente no indexada»: descubiertas y descartadas. *Ser* indexable es una propiedad del sitio; *estar* indexado es una decisión del buscador, y hasta ahora el producto exigía la primera y medía la segunda sin nada en medio. Esta épica es lo que faltaba entre el requisito y la métrica. **No añade ninguna superficie ni cambia el sitio construido**: pone el instrumento para saber por qué —una serie de indexación por familia, versionada y comparable a lo largo del tiempo—, el canal para anunciar lo que cambia a los buscadores que lo aceptan, y el informe del reparto de enlace interno desde donde el buscador ya entra. Va **primera** de la v5 por una razón aritmética: ninguna feature produce visitas si la página que la lleva no se indexa. Y dentro de la épica, la medición va antes que el remedio: sin la serie no se sabe si algo funcionó.

## Stories

- Story 16.1: El estado de indexación se lee por familia y se versiona
- Story 16.2: El sitio anuncia lo que cambia, y las cuatro familias cuentan
- Story 16.3: El enlace interno se reparte desde donde el buscador ya entra

## Requirements & Constraints

**Restricción externa heredada — no la redescubras.** La fuente del dato de indexación **no expone informe de cobertura ni total agregado**: solo inspección de **una URL por petición**, con techo de **2.000 al día y 600 por minuto** por propiedad. Las ~1.716 URL de hoy consumen el 86 % de la cuota diaria, y **el barrido completo deja de caber al pasar de ~2.000**. A partir de ahí la serie se compone por **muestreo declarado por familia**, con el tamaño de muestra escrito en la entrada para que una comparación entre jornadas sepa qué compara. El dato es el del último rastreo del buscador, no el de ahora: la serie mide **con retardo, y lo dice**.

**No hay alternativa a esa fuente, y fingir que la hay sería peor.** Solo el buscador sabe qué ha indexado. Lo que se exige no es prescindir de ella, sino dejar de leerla a ojo: traerla de forma reproducible y agruparla como el producto la necesita, que es **por familia** —Cita, Autor, Tema, Colección—. El total engaña: el remedio no es el mismo para 1.639 páginas de una frase que para las 75 de agregación, y un porcentaje global no dice cuál de las dos falla.

**La cifra que se compara con la meta de indexación es la de la familia Cita**, nunca el agregado del sitio.

**Ausencia antes que cero.** Una familia cuya lectura no se logró **se omite**; jamás se escribe cero. El fallo real de esa API es parcial —cuota agotada, espera vencida en una de cuatro consultas— y un cero fabricado es indistinguible del cero real, que es casi el estado de hoy.

**La serie mide un estado, no una sesión.** Es **idempotente por fecha**: una segunda lectura de la misma jornada **reemplaza** a la primera en vez de añadirse. Es la diferencia con el registro de sesiones de sembrado, que sí mide hechos acumulables.

**El aviso de cambio no es el remedio de la métrica de indexación, y confundirlos rompe el diseño.** El buscador que mide esa métrica **no acepta aviso de cambio**: sus canales son el sitemap y su propio rastreo. El aviso se sostiene por un motivo propio y distinto —llega al índice del que se sirve la búsqueda por IA—, y **su efecto se mide aparte**. Mezclar las dos vías haría ilegible cuál funcionó. Quien ataca la indexación es el reparto de enlace (16.3) y el contenido por página (Épica 17).

**El aviso cubre las cuatro familias.** Publicar o modificar una Cita, un Autor, un Tema o una Colección emite aviso. El fallo hoy vivo en el código es que solo se mira una carpeta del corpus, así que editar la semblanza de un Autor —la única familia que hoy recibe impresiones— no se anuncia a nadie y nada falla.

**El aviso se emite desde la reconstrucción, no a mano**: una jornada sin editor lo emite igual. El sitemap sigue siendo el catálogo; el aviso es el canal de cambios, y ninguno sustituye al otro. Que un receptor acepte el aviso **no se cuenta como indexación**.

**No se avisa de todo a diario.** Quien avisa de todo enseña a los buscadores a no hacerle caso. Una jornada en la que solo cambió la serie de indexación **no emite aviso**.

**Lo que el reparto de enlace añade** al requisito existente de que ninguna página quede huérfana desde la portada es el **origen**: no cuenta saltos, cuenta **procedencia**. Una página que el buscador no ha indexado no transmite nada, así que un grafo interno perfecto entre páginas invisibles no mueve la aguja. Hace falta, para cada superficie publicada, cuántos enlaces entrantes llegan **desde superficies indexadas** y cuántos desde el resto; una lista consultable de las que reciben cero desde una indexada, ordenada por familia; y la capacidad de reparto de las superficies de agregación expresada **como cifra —75 frente a 1.639—, no como intención**.

**Fuera de alcance:** pagar por indexación o cualquier servicio que prometa posiciones.

**Supuesto que puede ser falso, y esta épica es el instrumento para falsarlo.** «Detectada, actualmente no indexada» no dice su motivo. La hipótesis es contenido fino y páginas casi idénticas, pero es hipótesis y no diagnóstico. Si al enriquecer la Página de Autor esas 35 páginas entran en el índice y las Citas no, la causa está en la Página de Cita y no en el sitio — y eso solo se ve comparando **el reparto por familia a lo largo del tiempo**. Construye la serie de modo que esa comparación sea posible; es su razón de ser.

## Technical Decisions

- **El sitio no toca el estado de indexación (AD-24).** **Ninguna función de `src/lib/` acepta el estado de indexación, ni siquiera por parámetro.** Si entrara, `dist/` pasaría a ser función de lo que el buscador opinó ayer y dos construcciones del mismo commit dejarían de dar el mismo sitio — el modo de fallo que la regla de reproducibilidad de la medición ya previó. El cruce entre grafo de enlace y lo indexado ocurre **en `tools/`**, consumiendo de `src/lib/publicado.ts` lo que ya es suyo. `publicado.ts` sigue siendo dueño de «publicable y alcanzable»; «alcanzable desde una indexada» vive fuera del sitio.
- **La serie se versiona en `corpus/`, imitando `corpus/sesiones-de-sembrado.yml`**: fecha, reparto por familia y **estado de lectura de cada familia**. Es un fichero de datos del repositorio, no una colección que el build enumere.
- **La escribe una orden de `tools/`, y ningún paso de CI la commitea a `main` (AD-24).** Si CI la produce, abre una propuesta de cambio. La vía automática obvia —que CI lea y commitee— dispara el flujo por `push` y con él el aviso, anunciando una jornada en la que no cambió un byte. Es exactamente el daño que la propia herramienta de aviso ya documenta.
- **La red vive solo en la cáscara de `tools/` (AD-22).** `tools/lib/`, `src/lib/`, el esquema y las páginas son puros sobre datos **ya recuperados**, y **ningún paso del build descarga nada**. La consulta de indexación es una capa fina exterior encima de módulos puros, como ya lo es la recuperación de Fuentes.
- **Construir y publicar son pasos distintos (AD-27).** El aviso es **efecto de publicar y nunca condición de construir**: se emite después de que el artefacto exista y responda —avisar antes del despliegue manda al buscador a la versión anterior, que es peor que no avisar—, su fallo **no** falla el despliegue, y queda registrado qué se envió y qué contestó el receptor.
- **El mapeo de fichero del corpus a rutas afectadas tiene un solo dueño (AD-27).** Con cuatro carpetas de corpus en juego son cuatro mapeos que divergirán si se escriben por separado. Amplía el dueño existente en vez de añadir ramas paralelas.
- **Las rutas anunciadas se componen con los constructores de superficie, nunca a mano.** Lo que se avisa tiene que ser la canónica exacta, barra final incluida; escrita a mano ya se desvió una vez y el aviso pasó a entregar la forma que redirige. Y el identificador de una Cita se lee de su frontmatter, no se deriva del nombre del fichero: no coinciden, y confundirlos anuncia 404 con cara de éxito.
- **Estas tres herramientas informan, no deciden.** Son del mismo género que las órdenes de auditoría y huecos ya existentes: producen una cifra o una lista para que una persona decida, y no encienden ni cambian nada por su cuenta.
- **Sin tecnología nueva.** Ninguna base de datos, ningún panel del que el sitio derive contenido, ninguna dependencia de cómputo nueva.

## Cross-Story Dependencies

- **16.1 va primera y las otras dos la consumen.** Sin la serie no hay «indexada» que cruzar en 16.3, y sin ella tampoco se sabe si 16.2 o 16.3 sirvieron de algo. La medición antes que el remedio es el orden declarado.
- **16.2 no puede mover la cifra de 16.1, por construcción.** Si al terminar parece que sí, algo está mal medido. Su efecto se registra y se lee **aparte**.
- **16.2 parte de la herramienta de aviso ya existente**, que hoy solo deduce cambios de la carpeta de Citas: es ampliación del dueño único a las cuatro familias, no una segunda herramienta.
- **16.3 depende del conjunto publicable (`src/lib/publicado.ts`) como cualquier otra enumeración de contenido**, y del constructor de rutas de superficie para resolver el grafo. No dupliques ni el umbral de publicación ni la construcción de rutas.
- **16.1 y 16.2 tocan el flujo de publicación de CI**: la serie exige que un commit que solo la toca no dispare aviso, y el aviso vive en un paso posterior al despliegue. Coordina ambos cambios sobre ese fichero.
- **La Épica 17 depende del orden, no del código.** Enriquecer la Página de Autor sin atacar antes la indexación produce una página mejor que nadie encontraría; y la comparación por familia que esta épica instrumenta es lo único que dirá si el problema está en la Página de Cita o en el sitio entero.
- **Ninguna condición de lanzamiento nueva.** La propiedad verificada en el panel del buscador y el sitemap enviado ya están cerrados; esta épica se apoya en ellos y no abre ninguna puerta.

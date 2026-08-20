# Epic 14 Context: El ingreso tiene interruptor antes de tener ingreso

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

El visitante al que el sitio le ha resuelto algo encuentra cómo sostenerlo, sin que nadie se lo pida y sin que ninguna lectura se interrumpa. Y, por debajo de eso, cada Modelo de Ingreso —donaciones, afiliación de libros, producto propio y publicidad— nace con un interruptor **versionado, auditable y reversible por `git revert`**, en lugar de con un disparador automático que sabe encenderse y no sabe apagarse. La épica construye el dueño del estado aunque hoy solo haya un Modelo encendible: con dos ya sería tarde, porque el estado acabaría repartido en tres sitios. Lo que se adelanta es el diseño del interruptor, nunca el cobro.

## Stories

- Story 14.1: Encender un Modelo de Ingreso es un commit
- Story 14.2: El visitante que quiere sostener el sitio encuentra cómo

## Requirements & Constraints

**Estado operacional — 14.2 sigue BLOQUEADA (comprobado el 2026-08-19).** Su Umbral de Activación es «LC-1…LC-4 verificadas». LC-1 se cumple: el dominio sirve. LC-3 quedó cerrada en lo esencial —propiedad de dominio verificada en Search Console por el proveedor de nombre de dominio, y sitemap enviado a la espera de la primera lectura de Google—. **LC-4 no**: `wrangler` no está autenticado, el `database_id` del receptor sigue en PENDIENTE, y la baliza no aparece en el HTML de producción, o sea que `MEDICION_ENDPOINT` tampoco está definida. Desbloquearla exige la cuenta de Cloudflare y conceder OAuth, decisión del dueño (`DESPLIEGUE.md` §3), no de un agente. Por tanto **la Épica 14 solo puede cerrar la Historia 14.1**; 14.2 se diseña y se deja apagada. Su coste de implementación real es un enlace.

**Activación por umbral medido, nunca automática.** Ningún Modelo se enciende antes de que su Umbral se mida en el receptor. Cada Modelo se enciende y se apaga por separado, sin tocar a los demás. El estado de cada Modelo y la cifra contra la que se mide son consultables **sin exportar datos**, con la misma lectura que la auditoría de salud del Corpus: la herramienta informa la decisión del editor, no la sustituye.

**Los cuatro Umbrales.** Donaciones: LC-1…LC-4 verificadas. Afiliación de libros: 2.000 sesiones orgánicas/mes. Producto propio: 5.000. Publicidad acotada: 25.000. El orden no es por ingreso esperado sino por **coste sobre el producto**: se enciende primero lo que no cuesta nada y último lo que degrada superficie.

**Un Umbral no siempre gobierna el encendido: en la afiliación gobierna la solicitud.** Investigación de agosto de 2026: Amazon Afiliados exige 3 ventas cualificadas en los primeros 180 días desde el alta, o cierra la cuenta —y la cuenta del proyecto ya se cerró una vez por esa regla—. Se puede volver a solicitar con etiqueta nueva, pero solicitar arranca ese reloj. Consecuencia para el diseño del interruptor: el estado versionado tiene que admitir Modelos cuyo umbral dispara un **acto previo con reloj propio** (pedir la cuenta) y no el encendido del enlace. No codifiques la equivalencia «umbral cruzado ⇒ encender» como si valiera para los cuatro.

**Superficies.** La invitación de donación vive en superficies de **no-lectura**: portada, resultados de búsqueda y página 404. Nunca en la Página de Cita ni en la de Colección, que son el punto de entrada desde buscadores y donde el producto cumple su promesa. (Excepción registrada y ya resuelta aguas arriba: el enlace de afiliación sí nace de la Procedencia ya publicada, que se muestra en la Página de Cita; eso es admisible y no contradice la exclusión, que se estrechó a la publicidad.)

**Sin degradación.** Ignorar o rechazar la invitación no degrada ninguna funcionalidad. No hay muro, modal ni aviso previo al contenido. El presupuesto de rendimiento se vuelve a medir con el Modelo **encendido**, no solo en reposo.

**Contra-métrica.** Un Modelo que suba el ingreso degradando el rebote de la Página de Cita o el tiempo hasta el contenido se apaga: estaría comprando ingreso con el activo que lo produce. Esa exigencia —poder apagar— es la razón de que el encendido sea un gesto humano y no un disparador.

**Puerta de publicación de la v3.** Se puede construir en cualquier orden, pero nada se publica ni se comparte antes de que LC-1…LC-4 estén verificadas. 14.1 no está bloqueada por esa puerta ni la abre; 14.2 sí depende de ella.

## Technical Decisions

- **Encender un Modelo es un commit, no una medición (AD-21).** El estado de cada Modelo es **configuración versionada en el repositorio**: encenderlo es un diff visible, `git revert` lo apaga, y la historia de git registra cuándo y por qué. Nada se enciende solo. Junto a ese estado vive su otro dueño: **qué superficie admite qué Modelo**. Un mando de `tools/` consulta el receptor y **solo informa** de si el umbral está cruzado; un paso del flujo diario de CI **avisa** cuando se cruza, para que no dependa de acordarse. Avisar no es contenido, y ni la herramienta ni el CI encienden nada.
- **El build jamás lee el plano de medición (AD-14).** Ningún byte del sitio construido deriva de la medición. El sitio escribe balizas y no lee de ahí, ni en build ni en cliente. **Dos construcciones del mismo commit producen el mismo sitio**, también con el receptor apagado o caído. La tentación concreta a evitar: que el build pregunte al receptor qué Modelo encender, porque «el umbral se mide en el receptor».
- **Ningún guion de tercero, y el Modelo de Ingreso no es la excepción (AD-20).** El tope `MAX_BYTES_DE_GUION` cubre también lo que traiga un Modelo, y se sigue cumpliendo con el Modelo encendido. La propiedad se garantiza **por construcción**, no por la casilla de configuración de un proveedor: un proveedor que exija su guion en la página no cumple y no se enciende, por rentable que sea. La donación es un enlace, no un widget.
- **La afiliación se construye sin API de producto.** La PA-API de Amazon exige 3 ventas en 180 días para entrar y 10 ventas cualificadas en los últimos 30 días **por marketplace** para conservarse; un sitio de citas no sostiene esa cifra. El enlace de afiliación, cuando llegue, se **deriva de la Procedencia ya publicada en el build**, sin consultar a nadie. Encaja de forma natural con AD-20 y con que ningún paso del build descarga nada (AD-22: la red vive solo en la cáscara de `tools/`).
- **Los cuatro Umbrales de Activación viven en `src/lib/umbrales.ts` y en ningún otro sitio (AD-9).** Ese fichero es el único lugar donde aparece un literal numérico de regla de negocio; no se replican en el mando de `tools/`, ni en el paso de CI, ni en ninguna página.
- **El armazón compartido no aloja ningún Modelo (AD-20).** Es la trampa registrada explícitamente en la revisión adversaria: poner la invitación en el armazón es una línea, aparece en todas partes e incluye la Página de Cita — lo primero que el requisito de donaciones prohíbe. La exclusión de superficie **no** se delega en el dueño del conjunto publicable: ese módulo posee el *contenido* que se enumera, no qué superficie puede alojar un ingreso.
- **Sin tecnología nueva.** No hay base de datos ni panel del que el sitio derive contenido; el almacén de la medición no es excepción.

## UX & Interaction Patterns

- **Un Modelo apagado es invisible, no latente (UX-DR35).** Con las donaciones apagadas —que es el estado de hoy— ninguna superficie muestra hueco reservado, espacio en blanco ni marcador. Nada de maquetar el sitio dejando sitio para lo que vendrá: reservar el hueco es exactamente el obstáculo que la regla original prohibía crear. Esto es comprobable recorriendo el sitio con todo apagado.
- **Dónde puede aparecer la invitación (UX-DR36).** Portada, resultados de búsqueda y 404, siempre **fuera del flujo de lectura**. Nunca en el armazón compartido, nunca en la Página de Cita, nunca en la Página de Colección.
- **Tono.** «Sin que se le pida»: la invitación existe para quien la busque, no interpela. No es un peaje ni una interrupción, y su ausencia de efecto sobre el resto del sitio es parte de la aceptación.
- **Hueco de diseño declarado.** Los documentos de diseño y de experiencia no describen la invitación de donación como superficie. Las historias se escriben con estas reglas como aceptación; una pasada de diseño posterior puede refinar la presentación sin invalidarlas, mientras respete la invisibilidad en apagado y la exclusión de superficies de lectura.

## Abierto a propósito — no se decide en esta épica

La investigación de la v3.2 dejó tres cuestiones sin resolver que **el interruptor no debe cerrar por adelantado**. Diséñalo de forma que sigan siendo decidibles después:

- **Cobertura panhispánica de la afiliación.** En América, Amazon Afiliados solo existe para EEUU, Canadá, Brasil y México, y México exige cuenta bancaria mexicana; Argentina, Chile, Colombia y Perú no tienen programa, y OneLink cubre España pero **no** México. Con el suelo del 40 % de Autores de tradición latinoamericana, buena parte del tráfico del sitio es no monetizable por afiliación de producto físico: el umbral de 2.000 sesiones/mes mide sesiones, no sesiones monetizables.
- **Qué edición se enlaza.** El libro físico paga un 4,5 %, y como el Corpus es de dominio público la edición exacta de una Procedencia suele tener versión Kindle gratuita o de ~1 EUR. Enlazar la edición cotejada respeta el requisito y no ingresa nada; enlazar una edición moderna anotada ingresa y erosiona el «no se inventa una obra para poder enlazar». Sin resolver.
- **Kindle y KDP.** Kindle **no** es origen de Citas: ni Amazon ni Goodreads exponen los subrayados por API pública, y además chocaría con que el metadato se derive de un documento recuperable y con el cotejo literal. Quedan dos jugadas reales, ambas fuera del alcance de esta épica: Kindle como **destino** del enlace (único producto de Amazon entregable en toda Hispanoamérica, sin envío) y KDP como candidato al producto propio.

Estos hallazgos viven en el registro de planificación de la v3.2 y todavía no están reflejados en el texto del PRD ni de las épicas; donde difieran, manda lo investigado.

## Cross-Story Dependencies

- **14.1 va primera y es independiente.** Construye el dueño del estado, el mando informativo de `tools/`, el aviso de CI y las constantes de umbral. No necesita que ningún Modelo esté encendido: se verifica con todos apagados.
- **14.2 consume 14.1 y no puede cerrarse todavía.** Cuando LC-4 se cierre, encender las donaciones debe ser un cambio en la configuración versionada que 14.1 define, más el enlace en tres superficies. Si 14.2 introduce su propio interruptor, 14.1 ha fallado.
- **Depende de la Épica 7 (Condiciones de Lanzamiento), que no es de esta épica.** LC-4 la desbloquea el dueño ejecutando `DESPLIEGUE.md` §3; ningún trabajo de la Épica 14 puede abrir esa puerta. Nota aguas arriba, no de aquí: LC-3 se verificó por el atajo OAuth del registrador y no por el TXT manual que documenta `DESPLIEGUE.md` §2, así que esa sección hay que reescribirla antes de dar por cerrada la historia de Search Console.
- **Las cifras contra las que se miden los umbrales dependen de trabajo de indexación ajeno a esta épica.** El canal de cambios complementario al sitemap (IndexNow, abierto y compartido entre buscadores participantes vía Bing Webmaster Tools) subió de importancia porque la búsqueda por IA se sirve del índice de Bing. No es entregable de la Épica 14 y ningún Modelo depende de él, pero es de donde saldrán las sesiones orgánicas que activan los tres Umbrales numéricos.
- **La Página de Colección la define la Épica 12.** Aunque las donaciones estén apagadas, la exclusión de esa superficie ya vale, y hay que declararla para que nadie la añada después por descuido.
- **Toca módulos compartidos:** el fichero de umbrales, el armazón compartido, el flujo de CI y la carpeta de herramientas. Coordinar con cualquier trabajo simultáneo sobre ellos.

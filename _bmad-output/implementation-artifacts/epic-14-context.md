# Epic 14 Context: El ingreso tiene interruptor antes de tener ingreso

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

El visitante al que el sitio le ha resuelto algo encuentra cómo sostenerlo, sin que nadie se lo pida y sin que ninguna lectura se interrumpa. Y, por debajo de eso, cada Modelo de Ingreso —donaciones, afiliación de libros, producto propio y publicidad— nace con un interruptor **versionado, auditable y reversible por `git revert`**, en lugar de con un disparador automático que sabe encenderse y no sabe apagarse. La épica construye el dueño del estado aunque hoy solo haya un Modelo encendible: con dos ya sería tarde, porque el estado acabaría repartido en tres sitios. Lo que se adelanta es el diseño del interruptor, nunca el cobro.

## Stories

- Story 14.1: Encender un Modelo de Ingreso es un commit
- Story 14.2: El visitante que quiere sostener el sitio encuentra cómo

## Requirements & Constraints

**Estado operacional — 14.2 está BLOQUEADA hoy.** Su Umbral de Activación es «LC-1…LC-4 verificadas». LC-1 se cumple: el dominio sirve. **LC-4 no**: el secreto `MEDICION_ENDPOINT` no está definido en el repositorio y el Worker de Cloudflare no está desplegado. Desplegarlo exige la cuenta y las credenciales del dueño (`DESPLIEGUE.md` §3), no lo puede hacer un agente. Por tanto **la Épica 14 solo puede cerrar la Historia 14.1**; 14.2 se diseña y se deja apagada, y se enciende el día que LC-4 quede verificada. Su coste de implementación real es un enlace.

**Activación por umbral medido, nunca automática.** Ningún Modelo se enciende antes de que su Umbral se mida en el receptor. Cada Modelo se enciende y se apaga por separado, sin tocar a los demás. El estado de cada Modelo y la cifra contra la que se mide son consultables **sin exportar datos**, con la misma lectura que la auditoría de salud del Corpus: la herramienta informa la decisión del editor, no la sustituye.

**Los cuatro Umbrales.** Donaciones: LC-1…LC-4 verificadas. Afiliación de libros: 2.000 sesiones orgánicas/mes. Producto propio: 5.000. Publicidad acotada: 25.000. El orden no es por ingreso esperado sino por **coste sobre el producto**: se enciende primero lo que no cuesta nada y último lo que degrada superficie.

**Superficies.** La invitación de donación vive en superficies de **no-lectura**: portada, resultados de búsqueda y página 404. Nunca en la Página de Cita ni en la de Colección, que son el punto de entrada desde buscadores y donde el producto cumple su promesa.

**Sin degradación.** Ignorar o rechazar la invitación no degrada ninguna funcionalidad. No hay muro, modal ni aviso previo al contenido. El presupuesto de rendimiento se vuelve a medir con el Modelo **encendido**, no solo en reposo.

**Contra-métrica.** Un Modelo que suba el ingreso degradando el rebote de la Página de Cita o el tiempo hasta el contenido se apaga: estaría comprando ingreso con el activo que lo produce. Esa exigencia —poder apagar— es la razón de que el encendido sea un gesto humano y no un disparador.

**Puerta de publicación de la v3.** Se puede construir en cualquier orden, pero nada se publica ni se comparte antes de que LC-1…LC-4 estén verificadas. 14.1 no está bloqueada por esa puerta ni la abre; 14.2 sí depende de ella.

## Technical Decisions

- **Encender un Modelo es un commit, no una medición (AD-21).** El estado de cada Modelo es **configuración versionada en el repositorio**: encenderlo es un diff visible, `git revert` lo apaga, y la historia de git registra cuándo y por qué. Nada se enciende solo. Junto a ese estado vive su otro dueño: **qué superficie admite qué Modelo**. Un mando de `tools/` consulta el receptor y **solo informa** de si el umbral está cruzado; un paso del flujo diario de CI **avisa** cuando se cruza, para que no dependa de acordarse. Avisar no es contenido, y ni la herramienta ni el CI encienden nada.
- **El build jamás lee el plano de medición (AD-14).** Ningún byte del sitio construido deriva de la medición. El sitio escribe balizas y no lee de ahí, ni en build ni en cliente. **Dos construcciones del mismo commit producen el mismo sitio**, también con el receptor apagado o caído. La tentación concreta a evitar: que el build pregunte al receptor qué Modelo encender, porque «el umbral se mide en el receptor».
- **Ningún guion de tercero, y el Modelo de Ingreso no es la excepción (AD-20).** El tope `MAX_BYTES_DE_GUION` cubre también lo que traiga un Modelo, y se sigue cumpliendo con el Modelo encendido. La propiedad se garantiza **por construcción**, no por la casilla de configuración de un proveedor: un proveedor que exija su guion en la página no cumple y no se enciende, por rentable que sea. La donación es un enlace, no un widget.
- **El armazón compartido no aloja ningún Modelo (AD-20).** Es la trampa registrada explícitamente en la revisión adversaria: poner la invitación en el armazón es una línea, aparece en todas partes e incluye la Página de Cita — lo primero que el requisito de donaciones prohíbe. La exclusión de superficie **no** se delega en el dueño del conjunto publicable: ese módulo posee el *contenido* que se enumera, no qué superficie puede alojar un ingreso.
- **Los cuatro Umbrales de Activación viven en `src/lib/umbrales.ts` y en ningún otro sitio (AD-9).** Ese fichero es el único lugar donde aparece un literal numérico de regla de negocio; no se replican en el mando de `tools/`, ni en el paso de CI, ni en ninguna página.
- **Sin tecnología nueva.** No hay base de datos ni panel del que el sitio derive contenido; el almacén de la medición no es excepción.

## UX & Interaction Patterns

- **Un Modelo apagado es invisible, no latente (UX-DR35).** Con las donaciones apagadas —que es el estado de hoy— ninguna superficie muestra hueco reservado, espacio en blanco ni marcador. Nada de maquetar el sitio dejando sitio para lo que vendrá: reservar el hueco es exactamente el obstáculo que la regla original prohibía crear. Esto es comprobable recorriendo el sitio con todo apagado.
- **Dónde puede aparecer la invitación (UX-DR36).** Portada, resultados de búsqueda y 404, siempre **fuera del flujo de lectura**. Nunca en el armazón compartido, nunca en la Página de Cita, nunca en la Página de Colección.
- **Tono.** «Sin que se le pida»: la invitación existe para quien la busque, no interpela. No es un peaje ni una interrupción, y su ausencia de efecto sobre el resto del sitio es parte de la aceptación.
- **Hueco de diseño declarado.** Los documentos de diseño y de experiencia no describen la invitación de donación como superficie. Las historias se escriben con estas reglas como aceptación; una pasada de diseño posterior puede refinar la presentación sin invalidarlas, mientras respete la invisibilidad en apagado y la exclusión de superficies de lectura.

## Cross-Story Dependencies

- **14.1 va primera y es independiente.** Construye el dueño del estado, el mando informativo de `tools/`, el aviso de CI y las constantes de umbral. No necesita que ningún Modelo esté encendido: se verifica con todos apagados.
- **14.2 consume 14.1 y no puede cerrarse todavía.** Cuando LC-4 se cierre, encender las donaciones debe ser un cambio en la configuración versionada que 14.1 define, más el enlace en tres superficies. Si 14.2 introduce su propio interruptor, 14.1 ha fallado.
- **Depende de la Épica 7 (Condiciones de Lanzamiento), que no es de esta épica.** LC-4 la desbloquea el dueño ejecutando `DESPLIEGUE.md` §3; ningún trabajo de la Épica 14 puede abrir esa puerta.
- **La Página de Colección la define la Épica 12.** Aunque las donaciones estén apagadas, la exclusión de esa superficie ya vale, y hay que declararla para que nadie la añada después por descuido.
- **Toca módulos compartidos:** el fichero de umbrales, el armazón compartido, el flujo de CI y la carpeta de herramientas. Coordinar con cualquier trabajo simultáneo sobre ellos.

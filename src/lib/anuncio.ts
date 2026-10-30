/**
 * El anuncio de un mensaje de estado — UX-DR99, WCAG 4.1.3, Historia 23.1.
 *
 * Es el **primer ritmo**: lo que el visitante provoca con un gesto —«Copiado.», la imagen lista,
 * el fallo del generador, el recuento de `/buscar/`— se anuncia por una región `role="status"`
 * que está en el marcado desde la carga, vacía y sin `hidden`. Para que el mismo mensaje dos
 * veces seguidas se vuelva a anunciar, se vacía la región y el texto se escribe en el
 * fotograma siguiente: escrito sobre sí mismo no es un cambio y ningún lector lo dice. El
 * segundo ritmo, el del tecleo, vive aquí también: `ritmoDeTecleo`, más abajo (Historia 26.6).
 *
 * Hasta la 23.1 esto estaba escrito tres veces —en `CopiarCita`, en `ImagenDeCita` y en
 * `/buscar/`—, a mano y cada una a su manera. Ahora hay un solo dueño. Las islas en línea lo
 * llevan dentro de su guion como texto: componen el guion en el frontmatter con
 * `guionQueAnuncia`, que mete `String(anunciar)`, y lo insertan con `set:html`. La de `/buscar/`
 * dejó de ir en línea en la Historia 27.2: su guion es el `<script>` empaquetado de
 * `Busqueda.astro`, que la importa (AD-6), como importa el segundo ritmo. Por eso la
 * función se escribe para que **su texto sea JavaScript válido y corto** una vez quitados los
 * tipos: sin importar nada, sin cierres sobre este módulo y sin comentarios dentro, que
 * viajarían a cada página y contarían en `MAX_BYTES_DE_GUION`. Que ningún guion en línea use `requestAnimationFrame`
 * fuera de esta función lo vigila `tests/unit/medicion.test.ts` sobre lo construido.
 */
export function anunciar(region: { textContent: string | null }, texto: string): void {
  region.textContent = '';
  requestAnimationFrame(() => (region.textContent = texto));
}

/**
 * El guion en línea entero de una isla que anuncia — Historia 23.1.
 *
 * Compone, en este orden y dentro de un `(function(){…})();`: las constantes que no son
 * contenido (nombres de evento, la tabla de rótulos de la búsqueda), declaradas como las
 * declara `define:vars` de Astro —`JSON.stringify` con `<` escapado, para que ningún valor
 * cierre el `<script>`—; la función `anunciar`, por su texto; y el cuerpo de la isla. La isla
 * lo inserta con `<script is:inline set:html={…} />`.
 *
 * Se hace aquí y no con `define:vars` más `set:html`, que era lo previsto: el compilador de
 * Astro 7.2 (`@astrojs/compiler-rs` 0.3.2) emite el envoltorio y las constantes de
 * `define:vars` y **descarta** el `set:html` cuando van juntos, así que la isla salía sin
 * cuerpo y sin un solo aviso. El envoltorio es el mismo que pone `define:vars`, con las mismas
 * dos consecuencias que importan: las constantes no chocan entre las dos copias de una isla en
 * el Kit, y `document.currentScript` sigue siendo el guion mientras se ejecuta.
 *
 * `anunciar` se asigna a una constante en vez de insertarse como declaración: si el
 * empaquetado le cambiara el nombre interno, el cuerpo seguiría llamando `anunciar`.
 *
 * Rompe el build, en vez de emitir un guion roto, ante tres cosas que `set:html` insertaría tal
 * cual: un nombre de constante que no es un identificador de JavaScript, un valor que JSON no
 * sabe escribir (`undefined`, una función) y un guion que contiene `</script` o `<!--`, que el
 * analizador de HTML leería como el final del `<script>` y pintaría el resto como texto. Las
 * constantes ya salen con el `<` escapado; lo que se mira es el cuerpo y el texto de `anunciar`.
 */
export function guionQueAnuncia(constantes: Record<string, unknown>, cuerpo: string): string {
  const declaradas = Object.entries(constantes)
    .map(([nombre, valor]) => {
      if (!/^[A-Za-z_$][\w$]*$/.test(nombre)) {
        throw new Error(`guionQueAnuncia: «${nombre}» no es un identificador de JavaScript.`);
      }
      const json = JSON.stringify(valor);
      if (json === undefined) {
        throw new Error(`guionQueAnuncia: el valor de «${nombre}» no se puede escribir en JSON.`);
      }
      return `const ${nombre} = ${json.replace(/</g, '\\u003c')};\n`;
    })
    .join('');
  const guion = `(function(){${declaradas}const anunciar = ${String(anunciar)};\n${cuerpo}})();`;
  if (/<\/script|<!--/i.test(guion)) {
    throw new Error('guionQueAnuncia: el guion contiene «</script» o «<!--» y cerraría el <script> en el HTML.');
  }
  return guion;
}

/**
 * El **segundo ritmo** de un mensaje de estado — UX-DR58, UX-DR86, WCAG 4.1.3, Historia 26.6.
 *
 * El primer ritmo, `anunciar`, es para lo que el visitante provoca con un gesto y se anuncia al
 * momento, aunque se repita. Este es para lo que cambia **mientras teclea** —el recuento del
 * filtro de los Directorios, y en la Épica 27 el de `/buscar/`—: decir una cifra por tecla sería
 * ruido, así que la frase se escribe cuando el visitante lleva `pausa` milisegundos sin teclear
 * (`PAUSA_DE_TECLEO_MS`), y **solo si cambió**: «gonz» y «gonza» con la misma cifra no vuelven a
 * anunciarse. Por eso aquí no se vacía antes de escribir, que es justo lo que el primer ritmo
 * hace para que lo repetido se oiga.
 *
 * `anunciar(texto)` reprograma la escritura con cada tecla; `vaciar()` la cancela y deja la
 * región vacía al momento, como al cargar: es lo que pasa al vaciar el campo. `anunciar(texto,
 * espera)` escribe tras `espera` en vez de tras `pausa`: es el recuento de `/buscar/`, cuya
 * búsqueda llega un rato después de la última tecla y espera solo lo que le falta a la pausa
 * contada desde ella (Historia 27.2, revisión). `ahora(texto)`
 * cancela lo programado y escribe al momento, también **solo si cambió** (Historia 27.2): es el
 * recuento de `/buscar/` cuando lo provoca un selector, que ya esperó su propia pausa
 * (`PAUSA_DE_LOS_SELECTORES_MS`) y no tiene que esperar otra.
 *
 * No viaja como texto, como `anunciar`: los guiones del filtro y de la búsqueda son `<script>`
 * empaquetados y la importan (AD-6), nunca por `define:vars`. Tampoco usa
 * `requestAnimationFrame`, que la prueba de `dist/` reserva a `anunciar`.
 */
export function ritmoDeTecleo(
  region: { textContent: string | null },
  pausa: number,
): { anunciar(texto: string, espera?: number): void; ahora(texto: string): void; vaciar(): void } {
  let espera: ReturnType<typeof setTimeout> | undefined;
  const escribir = (texto: string) => {
    if (region.textContent !== texto) region.textContent = texto;
  };
  return {
    anunciar(texto: string, tras = pausa) {
      clearTimeout(espera);
      espera = setTimeout(() => escribir(texto), tras);
    },
    ahora(texto: string) {
      clearTimeout(espera);
      escribir(texto);
    },
    vaciar() {
      clearTimeout(espera);
      region.textContent = '';
    },
  };
}

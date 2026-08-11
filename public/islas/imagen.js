/**
 * Generador de Imagen de Cita — FR-10, FR-11, AD-7.
 *
 * Vive en `public/` y no en `src/` a propósito: la isla lo carga con `import()` dinámico
 * al pulsar la acción, y para eso necesita una URL estable que el empaquetador no
 * reescriba. Es lo que hace que la Página de Cita no descargue ni un byte de este fichero
 * mientras nadie pulse — que es lo que AD-6 pide para las islas caras, y esta lo es.
 *
 * AD-7 — se dibuja en el cliente. Las dos alternativas eran pregenerar unas seis mil
 * imágenes en el build o servirlas desde una función en servidor; la primera es
 * insostenible en peso y tiempo, y la segunda rompe el despliegue puramente estático.
 *
 * AD-8 — el tamaño tipográfico **no se decide aquí**. Llega en `data-tamano` desde el
 * marcado, calculado por `src/lib/tramos.ts`, que es el mismo módulo que compone la
 * página. Codificar un tamaño aquí haría que la previsualización mintiera respecto al
 * fichero descargado, que es exactamente lo que AD-8 impide.
 */

/** Lienzo cuadrado: la proporción que aceptan todas las redes sin recortar. */
const LADO = 1080;
const MARGEN = 96;

/**
 * Las tres plantillas de FR-11. Cambian el color y el adorno, **nunca el contenido**:
 * el texto y la atribución son idénticos en las tres, y hay prueba de ello.
 */
export const PLANTILLAS = [
  { id: 'papel', nombre: 'Papel', fondo: '#faf7f0', tinta: '#1f1b16', apagada: '#5a5147', filete: '#ddd5c7' },
  { id: 'tinta', nombre: 'Tinta', fondo: '#1f1b16', tinta: '#faf7f0', apagada: '#c9c0b4', filete: '#5a5147' },
  { id: 'siena', nombre: 'Siena', fondo: '#8c4a2f', tinta: '#ffffff', apagada: '#f7e3d8', filete: '#f7e3d8' },
];

/** Parte el texto en líneas que quepan en el ancho dado. Nunca recorta: solo reparte. */
function repartirEnLineas(ctx, texto, anchoMaximo) {
  const lineas = [];
  let actual = '';

  for (const palabra of texto.split(/\s+/)) {
    const tentativa = actual === '' ? palabra : `${actual} ${palabra}`;
    if (ctx.measureText(tentativa).width <= anchoMaximo || actual === '') {
      actual = tentativa;
    } else {
      lineas.push(actual);
      actual = palabra;
    }
  }
  if (actual !== '') lineas.push(actual);
  return lineas;
}

/**
 * Dibuja la Cita en el lienzo.
 *
 * El mismo procedimiento compone la previsualización y el fichero que se descarga: no hay
 * dos caminos que puedan divergir, porque la descarga es literalmente este lienzo.
 */
export function dibujar(lienzo, datos) {
  const plantilla = PLANTILLAS.find((p) => p.id === datos.plantilla) ?? PLANTILLAS[0];
  const ctx = lienzo.getContext('2d');

  lienzo.width = LADO;
  lienzo.height = LADO;

  ctx.fillStyle = plantilla.fondo;
  ctx.fillRect(0, 0, LADO, LADO);

  const anchoUtil = LADO - MARGEN * 2;

  // ── Texto de la Cita ──────────────────────────────────────────────────────
  const tamaño = datos.tamaño;
  ctx.fillStyle = plantilla.tinta;
  ctx.font = `400 ${tamaño}px "Source Serif 4", Georgia, serif`;
  ctx.textBaseline = 'top';

  const lineas = repartirEnLineas(ctx, `«${datos.texto}»`, anchoUtil);
  const alturaLinea = Math.round(tamaño * 1.3);
  const altoTexto = lineas.length * alturaLinea;

  // Bloque de atribución: filete corto, autor y procedencia.
  const altoAtribucion = 24 + 34 + (datos.procedencia ? 30 : 0);
  const inicio = Math.max(MARGEN, (LADO - altoTexto - altoAtribucion - 48) / 2);

  lineas.forEach((linea, i) => {
    ctx.fillText(linea, MARGEN, inicio + i * alturaLinea);
  });

  // ── Filete corto, como en la página ───────────────────────────────────────
  const trasTexto = inicio + altoTexto + 40;
  ctx.fillStyle = plantilla.filete;
  ctx.fillRect(MARGEN, trasTexto, 96, 2);

  // ── Autor, en versalitas ──────────────────────────────────────────────────
  ctx.fillStyle = plantilla.tinta;
  ctx.font = '600 24px Inter, system-ui, sans-serif';
  ctx.fillText(datos.autor.toLocaleUpperCase('es'), MARGEN, trasTexto + 28);

  // ── Procedencia, cuando consta ────────────────────────────────────────────
  if (datos.procedencia) {
    ctx.fillStyle = plantilla.apagada;
    ctx.font = '400 22px Inter, system-ui, sans-serif';
    ctx.fillText(datos.procedencia, MARGEN, trasTexto + 66);
  }

  // ── Marca del sitio ───────────────────────────────────────────────────────
  ctx.fillStyle = plantilla.apagada;
  ctx.font = '600 20px Inter, system-ui, sans-serif';
  ctx.fillText('SABIDURÍA DIARIA', MARGEN, LADO - MARGEN + 8);

  return lienzo;
}

/** Descarga directa: sin paso intermedio y sin registro (UX-DR16). */
export function descargar(lienzo, nombre) {
  return new Promise((resolver) => {
    lienzo.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `${nombre}.png`;
      document.body.append(enlace);
      enlace.click();
      enlace.remove();
      // Se libera en el siguiente ciclo: revocarla antes cancela la descarga en Safari.
      setTimeout(() => URL.revokeObjectURL(url), 0);
      resolver();
    }, 'image/png');
  });
}

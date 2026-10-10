/**
 * Los bytes de guion **ejecutable** en línea de una página — el contador del tope de
 * `MAX_BYTES_DE_GUION`, uno solo para todas las pruebas que lo miden.
 *
 * Vivía copiado en `tests/unit/medicion.test.ts` y en `tests/unit/ingreso-construido.test.ts`;
 * dos copias empiezan idénticas y divergen a la primera corrección, y entonces una página cabe
 * en el tope según una prueba y no según la otra. La frontera es esta y es la misma en las dos:
 *
 *   · cuenta **bytes UTF-8**, no unidades de UTF-16: el tope es de bytes servidos, y una
 *     cadena con «é» pesa más de lo que dice `length`;
 *   · cuenta todo `<script>` —con la etiqueta en mayúsculas o minúsculas— salvo el
 *     `application/ld+json` de los datos estructurados, que no es JavaScript ejecutable y el
 *     navegador no interpreta; se reconoce con comillas dobles, simples o sin comillas;
 *   · un `<script src=…>` sin cuerpo cuenta 0: no va en línea, se descarga aparte.
 */
export function bytesDeGuionEnLinea(html: string): number {
  return [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)]
    .filter((m) => !/\btype\s*=\s*["']?application\/ld\+json\b/i.test(m[1]))
    .reduce((n, m) => n + Buffer.byteLength(m[2], 'utf8'), 0);
}

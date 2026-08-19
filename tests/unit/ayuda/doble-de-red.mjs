/**
 * Sustituto de la red para las pruebas de `tools/recuperar.ts`.
 *
 * Se precarga con `node --import tsx --import <este fichero> tools/recuperar.ts …`, y
 * reemplaza `globalThis.fetch` antes de que la orden lo llame. `tools/recuperar.ts` es la
 * cáscara —la única del proyecto con red—, así que probarla de punta a punta exige
 * sustituirla aquí; lo decidible sin red vive en `tools/lib/documento.ts` y se prueba
 * directamente.
 *
 * El guion vive en el JSON al que apunta `DOBLE_GUION`, con una entrada por dirección:
 *
 *   { "https://…": { "estado": 200, "cabeceras": {…}, "cuerpo": "…" } }
 *   { "https://…": { "lanza": "getaddrinfo ENOTFOUND" } }
 *
 * Cada petición se anota en `DOBLE_REGISTRO` —dirección y cabeceras enviadas, una línea
 * de JSON por petición—, y así una prueba puede exigir que una dirección **no se llegara
 * a pedir**, que es la mitad del criterio, y comprobar con qué se pidió.
 */

import { appendFileSync, readFileSync } from 'node:fs';

const guion = JSON.parse(readFileSync(process.env.DOBLE_GUION, 'utf8'));
const registro = process.env.DOBLE_REGISTRO;

globalThis.fetch = async (entrada, opciones = {}) => {
  const url = typeof entrada === 'string' ? entrada : String(entrada.url ?? entrada);
  if (registro) {
    appendFileSync(registro, `${JSON.stringify({ url, cabeceras: opciones.headers ?? {} })}\n`);
  }

  const respuesta = guion[url] ?? guion['*'];
  if (respuesta === undefined) throw new TypeError(`fetch failed: sin guion para ${url}`);
  if (respuesta.lanza) throw new TypeError(respuesta.lanza);

  const estado = respuesta.estado ?? 200;
  const cabeceras = respuesta.cabeceras ?? { 'content-type': 'text/html; charset=utf-8' };
  // `bytes: N` fabrica un cuerpo de N bytes sin meterlo en el guion: el techo de tamaño
  // se prueba con megabytes de verdad y el JSON del guion sigue cabiendo en una línea.
  const cuerpo =
    respuesta.bytes !== undefined
      ? Buffer.alloc(respuesta.bytes, 0x61)
      : respuesta.cuerpoBase64 !== undefined
        ? Buffer.from(respuesta.cuerpoBase64, 'base64')
        : (respuesta.cuerpo ?? '');

  // Las respuestas de redirección no llevan cuerpo, y el constructor de `Response` lo
  // exige así para 204, 205 y 304.
  const sinCuerpo = estado >= 300 && estado < 400;
  return new Response(sinCuerpo ? null : cuerpo, { status: estado, headers: cabeceras });
};

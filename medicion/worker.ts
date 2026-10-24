/**
 * Adaptador de plataforma del receptor — Cloudflare Workers con D1.
 *
 * Se eligió por lo que pide el criterio: «consultarlo sin exportar nada ni pedir permiso
 * a un tercero». D1 es SQLite y se consulta con SQL desde la terminal
 * (`npx wrangler d1 execute`), sin panel de proveedor de por medio. Lo demás del criterio
 * —qué se guarda y qué se descarta— no depende de esto: vive en `receptor.ts`.
 *
 * Este fichero no lee ni una cabecera de la petición. No hay `CF-Connecting-IP`, ni
 * `User-Agent`, ni `Referer`, ni el país que Cloudflare regala en `request.cf`. Es la
 * diferencia entre «no requiere consentimiento» por construcción y por configuración.
 */
import { interpretar } from './receptor.ts';

/**
 * El trozo de D1 que este adaptador usa, y solo ese.
 *
 * La alternativa era `@cloudflare/workers-types`, y se probó: trae los globales enteros de
 * `workerd` al chequeo del sitio —que abarca todo el repositorio— y ahí `Buffer` deja de
 * ser el de Node. Cuatro pruebas que leen cabeceras PNG con `readUInt32BE` pasaron a no
 * compilar sin que nadie hubiera tocado una línea suya. Dos runtimes con globales
 * incompatibles no caben en un mismo programa de TypeScript.
 *
 * Declarar la superficie que se toca —`prepare`, `bind`, `run`— la deja verificada sin
 * importar nada más. Si el receptor pasa a necesitar `all()` o `first()`, esto no
 * compilará, que es justo cuando conviene volver a mirar esta decisión.
 */
interface SentenciaD1 {
  bind(...valores: unknown[]): SentenciaD1;
  run(): Promise<unknown>;
}

interface D1Database {
  prepare(sql: string): SentenciaD1;
}

interface Entorno {
  MEDICION: D1Database;
}

export default {
  async fetch(peticion: Request, entorno: Entorno): Promise<Response> {
    // 204 siempre y en todo caso. `sendBeacon` no mira la respuesta y la página ya se ha
    // ido: un código de error aquí no lo lee nadie y solo invita a reintentar.
    const nada = new Response(null, { status: 204 });

    if (peticion.method !== 'POST') return nada;

    const registro = interpretar(await peticion.text(), new Date());
    if (registro === null) return nada;

    try {
      // El `rowid` va aleatorio (Historia 23.12). Sin él, SQLite numera `max(rowid)+1` y el
      // orden físico de las filas es el de llegada: en una ruta poco visitada encadena la
      // vista, el copiado y la salida de una misma persona, lo que NFR-11 y AD-13 impiden
      // reconstruir. Lo genera SQLite y no viaja por `bind`: en JavaScript un entero de 64
      // bits se redondea, así que aquí ni se genera ni se lee —quien lo necesite lo pide con
      // `CAST(rowid AS TEXT)`—. Un `rowid` repetido es un error de SQLite y cae en el `catch`,
      // como el almacén caído. Lo ya escrito no lo baraja esto: lo baraja `desplegar` (23.2).
      await entorno.MEDICION.prepare(
        'INSERT INTO eventos (rowid, jornada, evento, ruta, origen, destino, consulta) ' +
          'VALUES (abs(random()), ?, ?, ?, ?, ?, ?)',
      )
        .bind(
          registro.jornada,
          registro.evento,
          registro.ruta,
          registro.origen,
          registro.destino,
          registro.consulta,
        )
        .run();
    } catch {
      // El almacén caído pierde el evento en silencio. La alternativa —devolver error—
      // no cambia nada para quien envió la baliza y sí llena el registro de ruido.
    }

    return nada;
  },
};

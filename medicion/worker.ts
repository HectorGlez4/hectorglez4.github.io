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
      await entorno.MEDICION.prepare(
        'INSERT INTO eventos (jornada, evento, ruta, consulta) VALUES (?, ?, ?, ?)',
      )
        .bind(registro.jornada, registro.evento, registro.ruta, registro.consulta)
        .run();
    } catch {
      // El almacén caído pierde el evento en silencio. La alternativa —devolver error—
      // no cambia nada para quien envió la baliza y sí llena el registro de ruido.
    }

    return nada;
  },
};

/**
 * Qué atestigua una Cita atribuida — Historia 35.1b, AD-32.
 *
 * Una atribuida no se coteja contra un documento: se publica porque varios sitios
 * independientes la atestiguan. «Independientes» se cuenta por **dominio registrable**
 * (eTLD+1), y lo decide solo `dominioDeAtestiguacion`:
 *
 *   · con la lista pública de sufijos de `tldts`, **solo la parte ICANN**
 *     (`allowPrivateDomains: false`): `es.wikiquote.org` y `en.wikiquote.org` son un solo
 *     `wikiquote.org`, `www.bbc.co.uk` es `bbc.co.uk`, y dos `*.github.io` cuentan uno —un
 *     sufijo privado lo registra cualquiera, y con él una persona fabricaría tantas
 *     atestiguaciones como quisiera—;
 *   · sin dominio registrable (una IP, `localhost`, una dirección que no se deja analizar) no
 *     cuenta;
 *   · los dominios de `DOMINIOS_QUE_NO_ATESTIGUAN` (la semilla, BrainyQuote) y el propio
 *     dominio (`DOMINIO`, de `public/CNAME`) no cuentan: atestiguar es que lo diga otro.
 *
 * Sin red: no se descarga ni se coteja ninguna atestiguación. `tldts` lo usan solo el esquema
 * (`src/lib/admision.ts`) y las órdenes de `tools/`; nunca un guion del cliente.
 */

import { getDomain } from 'tldts';
import { DOMINIO } from './dominio.ts';

/**
 * Los dominios registrables que no atestiguan nada, aunque lo digan: la semilla de la siembra
 * acotada (Historia 35.10). Añadir uno —un espejo conocido— lo decide Héctor en un diff de aquí.
 */
export const DOMINIOS_QUE_NO_ATESTIGUAN: readonly string[] = ['brainyquote.com'];

/** El dominio registrable propio, el de `public/CNAME` (`DOMINIO` de `src/lib/dominio.ts`). */
const DOMINIO_PROPIO = getDomain(DOMINIO, { allowPrivateDomains: false }) ?? DOMINIO;

/**
 * El dominio registrable que una dirección aporta como atestiguación, o `undefined` si no
 * cuenta: sin dominio registrable ICANN, vetado o el propio. Es la única que cuenta.
 */
export function dominioDeAtestiguacion(url: string): string | undefined {
  let host: string;
  try {
    const leida = new URL(url);
    if (leida.protocol !== 'http:' && leida.protocol !== 'https:') return undefined;
    host = leida.hostname;
  } catch {
    return undefined;
  }
  const dominio = getDomain(host, { allowPrivateDomains: false }) ?? undefined;
  if (dominio === undefined || dominio === '') return undefined;
  if (DOMINIOS_QUE_NO_ATESTIGUAN.includes(dominio) || dominio === DOMINIO_PROPIO) return undefined;
  return dominio;
}

/** Los dominios distintos que atestiguan una lista de direcciones, en orden de aparición. */
export function dominiosQueAtestiguan(urls: readonly string[]): string[] {
  const vistos: string[] = [];
  for (const url of urls) {
    const dominio = dominioDeAtestiguacion(url);
    if (dominio !== undefined && !vistos.includes(dominio)) vistos.push(dominio);
  }
  return vistos;
}

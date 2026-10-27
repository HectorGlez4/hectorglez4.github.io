/**
 * Las Rutas de salida de una Página de Cita, leídas del HTML de `dist/` — Historia 24.6.
 *
 * Un solo lector para las pruebas que miran el pie: los tres grupos, en su orden, con su rótulo,
 * sus Tarjetas de Cita (leídas por `tarjetasDe`, el mismo lector que los listados), su cierre
 * —el texto sin el glifo, el destino, la zona y el glifo, oculto al lector— y los chips.
 */
import { decodificar, tarjetasDe, type TarjetaLeida } from './listado.js';

const APERTURA = '<nav class="salidas"';

/** Un cierre «Las {n} citas de… ›» leído. */
export interface CierreLeido {
  /** El texto visible sin el glifo, decodificado y sin `&nbsp;`. */
  texto: string;
  href: string;
  zona: string | undefined;
  /** El glifo, si va en un `span[aria-hidden="true"]` pegado con `&nbsp;`; si no, `undefined`. */
  glifo: string | undefined;
}

/** Un grupo del pie: su clase, su rótulo, sus tarjetas, su cierre y sus chips. */
export interface GrupoLeido {
  clase: string;
  rotulo: { nivel: string; id: string | undefined; texto: string } | undefined;
  tarjetas: TarjetaLeida[];
  /** La clase de cada `<li>` de su `ul.tarjetas`, en su orden: para ver que el cierre va el último. */
  piezas: string[];
  cierre: CierreLeido | undefined;
  chips: { href: string; zona: string | undefined }[];
}

export interface RutasDeSalidaLeidas {
  /** Los atributos de la apertura del `nav`, tal como salen. */
  apertura: string;
  /** El `nav` entero, de su apertura a su cierre. */
  marcado: string;
  grupos: GrupoLeido[];
}

/** El `nav.salidas` entero de una página, o `undefined` si no lo tiene. */
export function navDeSalidas(html: string): string | undefined {
  const inicio = html.indexOf(APERTURA);
  if (inicio === -1) return undefined;
  const fin = html.indexOf('</nav>', inicio);
  if (fin === -1) throw new Error(`Las Rutas de salida no se cierran: «${html.slice(inicio, inicio + 200)}»`);
  return html.slice(inicio, fin + '</nav>'.length);
}

const soloTexto = (marcado: string) =>
  decodificar(marcado.replace(/<[^>]*>/g, ''))
    .replace(/&nbsp;/g, ' ')
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Lee las Rutas de salida de una página construida; `undefined` si no hay `nav.salidas`. */
export function leerRutasDeSalida(html: string, ruta: string): RutasDeSalidaLeidas | undefined {
  const marcado = navDeSalidas(html);
  if (marcado === undefined) return undefined;
  const apertura = /^<nav\b([^>]*)>/.exec(marcado)?.[1] ?? '';
  const grupos = [...marcado.matchAll(/<section class="([^"]+)"[^>]*>([\s\S]*?)<\/section>/g)].map(
    ([, clase, dentro]): GrupoLeido => {
      const rotulo = /<(h[1-6])\b([^>]*)>([\s\S]*?)<\/\1>/.exec(dentro);
      const lista = /<ul class="tarjetas"[^>]*>([\s\S]*?)<\/ul>/.exec(dentro)?.[1];
      const fila = lista === undefined ? null : /<li class="fila-de-bloque"([^>]*)>([\s\S]*?)<\/li>/.exec(lista);
      let cierre: CierreLeido | undefined;
      if (fila !== null) {
        const enlace = /<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/.exec(fila[2]);
        if (enlace === null) throw new Error(`${ruta}: el cierre de «${clase}» no es un enlace: ${fila[2]}`);
        const glifo = /<span aria-hidden="true"[^>]*>&nbsp;([^<]*)<\/span>/.exec(enlace[2])?.[1];
        cierre = {
          texto: soloTexto(enlace[2].replace(/<span aria-hidden="true"[^>]*>[^<]*<\/span>/g, '')),
          href: decodificar(enlace[1]),
          zona: /data-zona="([^"]+)"/.exec(fila[1])?.[1],
          glifo,
        };
      }
      const chips = /<ul class="chips"([^>]*)>([\s\S]*?)<\/ul>/.exec(dentro);
      return {
        clase,
        rotulo:
          rotulo === null
            ? undefined
            : { nivel: rotulo[1], id: /\bid="([^"]*)"/.exec(rotulo[2])?.[1], texto: soloTexto(rotulo[3]) },
        tarjetas: lista === undefined ? [] : tarjetasDe(lista, ruta),
        piezas: lista === undefined ? [] : [...lista.matchAll(/<li class="([^"]+)"/g)].map(([, clase]) => clase),
        cierre,
        chips:
          chips === null
            ? []
            : [...chips[2].matchAll(/<a class="chip" href="([^"]+)"/g)].map(([, href]) => ({
                href: decodificar(href),
                zona: /data-zona="([^"]+)"/.exec(chips[1])?.[1],
              })),
      };
    },
  );
  return { apertura, marcado, grupos };
}

/**
 * AD-21 — Encender un Modelo de Ingreso es un commit, no una medición.
 *
 * Este módulo es el **dueño único** del estado de los cuatro Modelos de Ingreso. Encender
 * uno es cambiar un `false` por un `true` aquí: un diff de una línea que git fecha y firma,
 * y que `git revert` apaga. No hay interruptor en ninguna página, ni bandera de entorno, ni
 * casilla de un panel, ni consulta al receptor de medición. **Nada se enciende solo.**
 *
 * Existe antes que el ingreso a propósito. Hoy no hay ningún Modelo encendido y con uno
 * solo esto parecería de más; con dos ya sería tarde, porque el estado habría acabado
 * repartido entre una página, una configuración y un `if`, y existiría un interruptor que
 * sabe encenderse y no sabe apagarse. Poder **apagar** es el requisito de verdad: un Modelo
 * que suba el ingreso degradando el rebote de la Página de Cita o el tiempo hasta el
 * contenido estaría comprando ingreso con el activo que lo produce, y hay que poder
 * retirarlo el mismo día sin negociar con nadie.
 *
 * Junto al estado vive su otro dueño: **qué superficie admite qué Modelo**. Va aquí y no en
 * `superficies.ts` porque son dos preguntas distintas sobre la misma superficie —aquella
 * posee el *contenido* que se enumera y su publicabilidad; esta, qué ingreso puede alojar—,
 * y no en el armazón compartido por la razón que la revisión adversaria dejó escrita:
 * alojar un Modelo en el armazón es una línea, aparece en todas partes e incluye la Página
 * de Cita, que es lo primero que la épica prohíbe.
 *
 * AD-14 — aquí no se lee el plano de medición. Este módulo es puro: no toca disco, ni red,
 * ni `process.env`. Dos construcciones del mismo commit dan el mismo sitio, también con el
 * receptor apagado o caído. Quien consulta al receptor es el mando de `tools/` (AD-22), y
 * **solo informa**.
 *
 * **`src/lib/ingreso.ts` (esto) y `tools/lib/ingresos.ts` se parecen en un carácter, y no son
 * lo mismo.** Aquí vive el **estado**: qué Modelos hay, cuál está encendido y qué superficie
 * admite cada uno, y es lo único que decide algo. Allí vive el **informe**: qué hacer con lo
 * que conteste el receptor y cómo se redacta, y no decide nada. Sus pruebas heredan la
 * ambigüedad —`tests/unit/ingreso.test.ts` es de este módulo; `ingreso-cli.test.ts`, de aquel—.
 * Si algún día una función parece caber en los dos, la pregunta que la coloca es si cambia
 * algo del sitio construido: si lo cambia, es de aquí.
 */

import {
  SUPERFICIES,
  esServicioPorForma,
  rutaNormalizada,
  superficieDeclaradaDe,
  type Superficie,
} from './superficies.ts';
import {
  CONDICIONES_PARA_DONACIONES,
  SESIONES_PARA_AFILIACION,
  SESIONES_PARA_PRODUCTO_PROPIO,
  SESIONES_PARA_PUBLICIDAD,
} from './umbrales.ts';
import { FORMATOS_DE_EDICION, type EdicionEnVenta, type FormatoDeEdicion } from './ediciones.ts';

export { FORMATOS_DE_EDICION, type EdicionEnVenta, type FormatoDeEdicion };

/** Los cuatro Modelos de Ingreso de la Épica 14. No hay más, y añadir uno se ve en el diff. */
export type IdDeModelo =
  | 'donaciones'
  | 'afiliacion-de-libros'
  | 'producto-propio'
  | 'publicidad-acotada';

/**
 * Qué dispara el Umbral de un Modelo — el hallazgo que más forma le da a este módulo.
 *
 *   · `enciende` — cruzarlo autoriza a encender el Modelo. Autoriza, no enciende.
 *   · `solicita` — cruzarlo dispara un **acto previo con reloj propio**, no el encendido.
 *
 * `solicita` existe por la afiliación, y no es un matiz: Amazon Afiliados cierra la cuenta
 * que no logra 3 ventas cualificadas en 180 días desde el alta, y la cuenta del proyecto
 * **ya se cerró una vez** por esa regla. Se puede resolicitar con etiqueta nueva, pero
 * solicitar arranca ese reloj otra vez. Así que ahí el Umbral gobierna *cuándo se pide la
 * cuenta*, no cuándo se enciende el enlace, y un modelo de datos que solo supiera decir
 * «cruzado ⇒ encender» obligaría a mentir en una de las cuatro filas.
 */
export type QueDisparaElUmbral = 'enciende' | 'solicita';

/**
 * El Umbral de un Modelo. Los números salen todos de `src/lib/umbrales.ts` (AD-9); aquí
 * solo se dice de qué clase es cada uno.
 *
 * Son dos clases y no una porque el de donaciones **no es numérico**: es «LC-1…LC-4
 * verificadas». Meterlo a la fuerza en una cifra habría sido el primer paso para tratar los
 * cuatro como si fueran el mismo tipo de cosa.
 */
export type Umbral =
  | { clase: 'sesiones-organicas-mensuales'; sesiones: number }
  | { clase: 'condiciones-de-lanzamiento'; condiciones: readonly string[] };

export interface Modelo {
  id: IdDeModelo;
  /** Nombre legible; sale en el informe del mando. */
  nombre: string;
  /**
   * **El interruptor.** Cambiar esto es encender o apagar el Modelo, y no hay más.
   *
   * Encenderlo exige además que alguna superficie lo admita: un Modelo encendido que no
   * admite ninguna superficie no se ve en ninguna parte, y `revisarDeclaracionDeIngreso`
   * lo dice en vez de dejarlo pasar como si estuviera funcionando.
   */
  encendido: boolean;
  /** Qué dispara su Umbral: encender, o un acto previo con reloj propio. */
  dispara: QueDisparaElUmbral;
  /** Contra qué se mide. El número, cuando lo hay, vive en `umbrales.ts`. */
  umbral: Umbral;
  /**
   * Las superficies que admiten este Modelo, por el fichero que las genera — la misma
   * identidad con la que se declaran en `src/lib/superficies.ts`, para que las dos listas
   * se puedan cruzar y no puedan divergir en silencio.
   *
   * **Se nombra por fichero y se consulta por ruta** (Historia 17.5). Un mismo fichero genera
   * rutas de distinto carácter —el listado de Tema da la página 1, que es producto, y las 2+,
   * que son servicio por forma—, así que admitir aquí un listado **no** lo admite en sus
   * páginas 2+: `modelosEnRuta` las excluye siempre. Lo que esta lista dice es «la superficie
   * admite el Modelo»; qué rutas de la superficie lo llevan lo decide la forma de la ruta.
   *
   * Vacía significa **ninguna**, y es una declaración, no un hueco por rellenar: hoy solo
   * las donaciones tienen decidido dónde aparecen (UX-DR36). Dónde aterriza un enlace de
   * afiliación, qué edición se enlaza y dónde iría el producto propio siguen abiertos a
   * propósito, y este módulo se diseñó para que sigan siendo decidibles después.
   */
  admitidoEn: readonly string[];
  /**
   * A dónde lleva la invitación que este Modelo pone en sus superficies.
   *
   * Es dato del **Modelo** y no de la página, y por eso vive aquí: las tres superficies que
   * admiten las donaciones emiten el mismo enlace, y escribirlo en cada una sería el estado
   * repartido en tres sitios que este módulo existe para no cometer —con la diferencia de
   * que un destino divergente no rompe nada y se descubre cuando alguien no puede pagar.
   *
   * Opcional porque un Modelo apagado puede no tenerlo todavía: hoy solo las donaciones
   * saben a dónde van. Encendido **sí** es obligatorio, y `revisarDeclaracionDeIngreso` lo
   * exige: una invitación encendida que no lleva a ninguna parte es peor que no ponerla.
   */
  destino?: string;
  /** Por qué está donde está. Se lee en el diff que lo encienda. */
  nota: string;
}

/**
 * Las superficies de **lectura** — UX-DR36.
 *
 * El criterio, que hace falta escribir porque **no se puede derivar de `caracter`**: una
 * superficie de lectura es aquella cuyo contenido es el texto que el visitante vino a leer y
 * en la que el producto cumple su promesa —la Cita entera y la Colección curada—. La portada
 * también es `producto` y no es de lectura: es un escaparate del que se sale. Los listados de
 * Autor y de Tema quedan fuera **a propósito y no por descuido**: son índices, se atraviesan,
 * y ningún Modelo ha pedido sitio en ellos todavía; el día que alguno lo pida, la decisión se
 * toma aquí y se ve en el diff. El Kit y el lote son superficies `ajena` —material de
 * publicación de Héctor, ni indexadas ni barridas—, así que no hay ingreso que ofrecerle a
 * nadie en ellas.
 *
 * Se declaran hoy, con todo apagado, precisamente porque el descuido que hay que impedir es
 * futuro: alguien añadiendo una línea el día que encienda algo.
 */
export const SUPERFICIES_DE_LECTURA: readonly string[] = [
  'cita/[slug].astro',
  'coleccion/[slug]/[...page].astro',
  // Historia 22.4 — la Página de Obra es de lectura: rechaza donaciones y publicidad. La
  // afiliación tiene su propia regla (`esPaginaDeObra`), y desde la 22.9 la admite aquí.
  'obra/[autor]/[slug]/[...page].astro',
];

/**
 * Los Modelos que **jamás** pueden alojarse en una superficie de lectura, y por qué no son
 * los cuatro.
 *
 * La exclusión nace de las donaciones —la invitación vive en portada, búsqueda y 404, siempre
 * fuera del flujo de lectura— y aguas arriba **se estrechó a la publicidad**, que es el único
 * Modelo que degrada la superficie que produce el ingreso. Esos dos son los vedados.
 *
 * **La afiliación de libros no está en esta lista porque tiene una regla más estrecha que
 * ella**, y no porque se le permita la lectura. Hasta la v7.1 era la excepción registrada de
 * la Página de Cita —su enlace nacería de la Procedencia que esa página ya muestra—; AD-20 v7.1
 * revocó esa excepción y la de la Página de Autor, y la afiliación pasó a admitirse **solo en
 * la Página de Obra** (FR-35, Historia 22.9). Esa regla la impone `revisarDeclaracionDeIngreso`
 * con `esPaginaDeObra`, y cubre la Página de Cita igual que cualquier otra superficie.
 *
 * Desde la Historia 22.9 está **admitida en la Página de Obra** y sigue apagada. Lo que sigue
 * sin decidirse es **qué edición se enlaza** —la cotejada suele tener versión gratuita y no
 * ingresa nada; una moderna anotada ingresa y erosiona el «no se inventa una obra para poder
 * enlazar»— y eso lo decide Héctor en cada ficha, con la cuenta delante.
 *
 * El producto propio no está aquí porque no existe todavía: cuando exista traerá su superficie
 * y con ella esta decisión, y entonces se escribe.
 */
export const MODELOS_VEDADOS_EN_LECTURA: readonly IdDeModelo[] = [
  'donaciones',
  'publicidad-acotada',
];

/**
 * Las superficies que no admiten **ningún** Modelo — Historia 17.5.
 *
 * Hoy es una: la Página de Autor. AD-20 v7.1 revocó la admisión de la afiliación ahí, y su
 * Lista de Obras (Historia 17.3, `ListaDeObras.astro`) enlaza a cada Página de Obra, que es
 * donde vive el enlace de afiliación: la Página de Autor se publica idéntica con la afiliación
 * encendida o apagada. Su condición —«no aloja ningún Modelo»— se escribe aquí, como regla de
 * la declaración, y no en la página.
 *
 * Se nombra por fichero, como `admitidoEn`, y por eso cubre las dos formas de la superficie:
 * la página 1 y las 2+ (que además quedan fuera por forma).
 */
export const SUPERFICIES_SIN_INGRESO: readonly string[] = ['autor/[slug]/[...page].astro'];

/**
 * Si un fichero de página es la Página de Obra — la única superficie que puede admitir la
 * afiliación de libros (AD-20 v7.1, FR-35).
 *
 * Desde la Historia 22.4 la Página de Obra existe —`obra/[autor]/[slug]/[...page].astro`— y
 * es la única superficie declarada que cumple esta regla; la Historia 22.9 admitió ahí la
 * afiliación con una línea en `admitidoEn`. Por prefijo y no
 * por el nombre exacto del fichero: todo lo que genere `src/pages/obra/` es la Página de Obra.
 */
export function esPaginaDeObra(pagina: string): boolean {
  if (!pagina.startsWith('obra/') || !pagina.endsWith('.astro')) return false;
  /*
   * Dos cosas bajo `src/pages/obra/` que no son la Página de Obra: un segmento que empieza por
   * `_` —Astro no lo publica como ruta, es un parcial o un ayudante de la carpeta— y
   * `obra/index.astro`, que sería un índice de obras y no la página de una.
   */
  if (pagina.split('/').some((segmento) => segmento.startsWith('_'))) return false;
  return pagina !== 'obra/index.astro';
}

/**
 * Una tienda donde se vende una edición — Historia 22.9, FR-35, AD-20.
 *
 * El conjunto es **cerrado**: una edición en venta solo puede apuntar a una tienda de
 * `TIENDAS`, y su dirección tiene que ser del `dominio` de esa tienda. La marca de afiliado
 * vive aquí y en ningún otro sitio: la ficha declara la dirección **sin** marca, y la marca la
 * añade `urlDeEdicion` al construir. Así una marca nunca se teclea en una ficha, cambiarla es
 * esta línea, y una ficha no puede colar la marca de otro.
 *
 * Se identifica por `clave` (y no por otro nombre de campo) a propósito: los parches de las
 * pruebas recortan el tramo de cada Modelo de `MODELOS` buscando el campo que lo identifica,
 * y una tienda que lo repitiera partiría ese tramo en dos.
 */
export interface Tienda {
  /** Lo que escribe la ficha en `tienda`: minúsculas, dígitos y guiones. */
  clave: string;
  /** Cómo la nombra la página: «Edición impresa en {nombre}». */
  nombre: string;
  /** El anfitrión de sus direcciones, sin esquema; también vale cualquier subdominio suyo. */
  dominio: string;
  /** El parámetro de consulta que lleva la marca, como `tag`. */
  parametro: string;
  /** La marca de afiliado. Solo la escribe el dueño de la cuenta. */
  marca: string;
}

/**
 * Las tiendas declaradas. **Ninguna, y no por descuido.**
 *
 * La primera tienda —con su marca— la declara Héctor, con la cuenta ya solicitada y delante:
 * este repositorio es público y una marca escrita aquí queda a la vista de cualquiera, así que
 * ningún agente escribe una. Mientras el conjunto esté vacío el esquema de la Ficha de Obra
 * rechaza toda edición (no hay tienda que nombrar), y encender la afiliación detiene la
 * construcción: un Modelo de afiliación sin tienda no tiene a dónde llevar a nadie.
 *
 * Declarar la primera es el cambio declarado de FR-35, y se escribe así:
 *
 *     { clave: 'amazon-mx', nombre: 'Amazon México', dominio: 'amazon.com.mx',
 *       parametro: 'tag', marca: '<la marca de la cuenta>' }
 */
export const TIENDAS: readonly Tienda[] = [];


/** Lo que de una edición declarada importa aquí. La forma la juzga `src/lib/admision.ts`. */
export interface EdicionDeclarada {
  tienda: string;
  formato: string;
  url: string;
  descripcion?: string;
}

/** La tienda de una clave, o `undefined` si no es del conjunto. */
export function tiendaDe(clave: string, tiendas: readonly Tienda[] = TIENDAS): Tienda | undefined {
  return tiendas.find((tienda) => tienda.clave === clave);
}

/**
 * Si el anfitrión de una dirección es el dominio de una tienda o un subdominio suyo:
 * `www.amazon.com.mx` lo es de `amazon.com.mx`, y `amazon.com.mx.ejemplo.org` no.
 */
export function esDelDominio(anfitrion: string, dominio: string): boolean {
  const host = anfitrion.toLowerCase();
  const propio = dominio.toLowerCase();
  return host === propio || host.endsWith(`.${propio}`);
}

/**
 * La dirección de una edición con la marca de su tienda — Historia 22.9.
 *
 * Pura y sin E/S: añade `parametro=marca` a la dirección declarada **respetando su consulta**
 * —`…/dp/X?th=1` da `…/dp/X?th=1&tag=m-21`— y su fragmento, sin volver a escapar lo que ya
 * traía. La ficha nunca trae la marca (el esquema rechaza la dirección que ya la lleva), así
 * que aquí no hay que decidir entre dos.
 */
export function urlDeEdicion(
  edicion: Pick<EdicionDeclarada, 'url'>,
  tienda: Pick<Tienda, 'parametro' | 'marca'>,
): string {
  const almohadilla = edicion.url.indexOf('#');
  const sinFragmento = almohadilla === -1 ? edicion.url : edicion.url.slice(0, almohadilla);
  const fragmento = almohadilla === -1 ? '' : edicion.url.slice(almohadilla);
  const par = `${encodeURIComponent(tienda.parametro)}=${encodeURIComponent(tienda.marca)}`;
  const union = !sinFragmento.includes('?') ? '?' : /[?&]$/.test(sinFragmento) ? '' : '&';
  return `${sinFragmento}${union}${par}${fragmento}`;
}

/**
 * Las ediciones declaradas en una ficha, compuestas para la página y en su orden.
 *
 * Una edición de una tienda que no es del conjunto **rompe**: el esquema de la ficha ya la
 * habría rechazado, así que llegar aquí con una es que algo se saltó la admisión, y pintarla
 * sin marca —o sin tienda— sería peor que parar.
 */
export function edicionesEnVenta(
  ediciones: readonly EdicionDeclarada[],
  tiendas: readonly Tienda[] = TIENDAS,
): EdicionEnVenta[] {
  return ediciones.map((edicion) => {
    const tienda = tiendaDe(edicion.tienda, tiendas);
    if (tienda === undefined) {
      throw new Error(
        `La edición «${edicion.url}» es de la tienda «${edicion.tienda}», que no está declarada ` +
          'en TIENDAS de src/lib/ingreso.ts. El esquema de la Ficha de Obra debía haberla rechazado.',
      );
    }
    if (!(FORMATOS_DE_EDICION as readonly string[]).includes(edicion.formato)) {
      throw new Error(`La edición «${edicion.url}» declara un formato desconocido: «${edicion.formato}».`);
    }
    return {
      href: urlDeEdicion(edicion, tienda),
      formato: edicion.formato as FormatoDeEdicion,
      tienda: tienda.nombre,
      ...(edicion.descripcion !== undefined ? { descripcion: edicion.descripcion } : {}),
    };
  });
}

/**
 * Lo que incumple la declaración de las tiendas, ya redactado. Rige **con la afiliación
 * encendida o apagada**: una tienda mal declarada rompería el día del encendido, y el diff que
 * la escribe es el momento de decirlo.
 */
export function revisarTiendas(tiendas: readonly Tienda[] = TIENDAS): string[] {
  const fallos: string[] = [];
  const vistas = new Set<string>();
  for (const tienda of tiendas) {
    const quien = `La tienda «${tienda.clave}»`;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tienda.clave)) {
      fallos.push(`${quien} no tiene una clave válida: minúsculas, dígitos y guiones.`);
    }
    if (vistas.has(tienda.clave)) fallos.push(`${quien} se declara dos veces.`);
    vistas.add(tienda.clave);
    if (tienda.nombre.trim() === '') {
      fallos.push(`${quien} no tiene nombre, y es como la nombra la página.`);
    }
    if (!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(tienda.dominio)) {
      fallos.push(
        `${quien} declara el dominio «${tienda.dominio}», que no es un anfitrión en minúsculas ` +
          'sin esquema ni ruta, como «amazon.com.mx».',
      );
    }
    if (!/^[A-Za-z0-9_-]+$/.test(tienda.parametro)) {
      fallos.push(`${quien} declara el parámetro «${tienda.parametro}», que no es un nombre de parámetro.`);
    }
    if (tienda.marca.trim() === '' || /\s/.test(tienda.marca)) {
      fallos.push(`${quien} declara una marca vacía o con espacios: el enlace no la llevaría.`);
    }
  }
  return fallos;
}

/**
 * El censo de Modelos, con su estado. **Los cuatro apagados, que es el estado de hoy.**
 *
 * El orden es el de encendido previsto, y no es por ingreso esperado sino por coste sobre
 * el producto: primero lo que no cuesta nada y último lo que degrada superficie.
 */
export const MODELOS: readonly Modelo[] = [
  {
    id: 'donaciones',
    nombre: 'Donaciones',
    // Historia 14.2, bloqueada por LC-4. Encenderla es cambiar este `false` y añadir el
    // enlace en las tres superficies de abajo; si la 14.2 introduce su propio interruptor,
    // la 14.1 habrá fallado.
    encendido: false,
    dispara: 'enciende',
    umbral: { clase: 'condiciones-de-lanzamiento', condiciones: CONDICIONES_PARA_DONACIONES },
    // UX-DR36 — superficies de **no lectura**, y siempre fuera del flujo de lectura.
    admitidoEn: ['index.astro', 'buscar.astro', '404.astro'],
    /*
     * A dónde lleva «Apoyar el sitio». **Sin verificar**, y hay que verificarlo antes de
     * encender.
     *
     * Es una suposición hecha desde el dominio: no hay ningún identificador social ni
     * ninguna cuenta de Ko-fi escrita en el repositorio de la que derivarlo, así que esta
     * dirección se escribió por parecido y nadie la ha abierto. Mientras las donaciones
     * sigan apagadas no la renderiza nadie y no puede llevar a ninguna parte; el día que se
     * enciendan, comprobarla es requisito del mismo commit —una invitación que aterriza en
     * una página que no existe es peor que no invitar—.
     *
     * Ko-fi y no otro por AD-20: la donación es un enlace y no un widget, así que lo único
     * que el sitio necesita del proveedor es una dirección. Cambiar de proveedor es cambiar
     * esta línea, y por eso vive aquí y no en tres páginas.
     */
    destino: 'https://ko-fi.com/sabiduriadebolsillo',
    nota:
      'La donación es un enlace, no un widget (AD-20): un proveedor que exija su guion en la ' +
      'página no cumple y no se enciende, por rentable que sea.',
  },
  {
    id: 'afiliacion-de-libros',
    nombre: 'Afiliación de libros',
    encendido: false,
    // El Umbral dispara la **solicitud** de la cuenta, no el encendido del enlace.
    dispara: 'solicita',
    umbral: { clase: 'sesiones-organicas-mensuales', sesiones: SESIONES_PARA_AFILIACION },
    /*
     * Historia 22.9 — solo la Página de Obra, y solo su página 1 (la 2+ queda fuera por forma
     * en `modelosEnRuta`), se indexe la Obra o no: el `noindex` decide qué ve el buscador, no
     * qué ve quien llega desde la Atribución. AD-20 v7.1 no deja admitirla en ninguna otra
     * superficie (`esPaginaDeObra`).
     *
     * Admitida no es encendida. Este Modelo no tiene `destino`: cada edición lleva el suyo,
     * compuesto con la marca de su tienda (`urlDeEdicion`), y encenderlo exige que `TIENDAS`
     * declare al menos una. Qué edición se enlaza en cada Obra lo decide Héctor en su ficha,
     * con la cuenta delante; hasta entonces no hay tienda y ninguna ficha puede declarar una.
     */
    admitidoEn: ['obra/[autor]/[slug]/[...page].astro'],
    nota:
      'Cruzar su Umbral significa solicitar la cuenta, y solicitar arranca el reloj de las ' +
      '3 ventas en 180 días que ya cerró la cuenta del proyecto una vez.',
  },
  {
    id: 'producto-propio',
    nombre: 'Producto propio',
    encendido: false,
    dispara: 'enciende',
    umbral: { clase: 'sesiones-organicas-mensuales', sesiones: SESIONES_PARA_PRODUCTO_PROPIO },
    // Sin decidir: no hay producto, y con él vendría la superficie que lo aloje. KDP es
    // candidato y queda fuera del alcance de la Épica 14.
    admitidoEn: [],
    nota: 'No hay producto todavía; su superficie se decide cuando lo haya.',
  },
  {
    id: 'publicidad-acotada',
    nombre: 'Publicidad acotada',
    encendido: false,
    dispara: 'enciende',
    umbral: { clase: 'sesiones-organicas-mensuales', sesiones: SESIONES_PARA_PUBLICIDAD },
    /*
     * El último de los cuatro y el único que degrada la superficie que produce el ingreso.
     * Su exclusión de las superficies de lectura es la más dura de las cuatro: la excepción
     * registrada aguas arriba —que un enlace de afiliación nazca de la Procedencia— se
     * estrechó expresamente para dejar fuera a la publicidad.
     */
    admitidoEn: [],
    nota:
      'Vigilado por la contra-métrica: si sube el ingreso degradando el rebote de la Página ' +
      'de Cita o el tiempo hasta el contenido, se apaga.',
  },
];

/**
 * El atributo con el que una superficie marca lo que aloja de un Modelo — UX-DR35.
 *
 * Todo lo que un Modelo ponga en una página va dentro de un elemento con
 * `data-ingreso="<id>"`. No es decoración: es lo que hace comprobable que **un Modelo
 * apagado sea invisible y no latente**. `tests/unit/ingreso-construido.test.ts` recorre el
 * `dist/` construido y exige que lo marcado en cada página esté encendido y admitido ahí;
 * con los cuatro apagados eso significa que no puede haber ni hueco reservado, ni espacio en
 * blanco, ni marcador, ni contenedor vacío esperando a llenarse.
 *
 * Quien encienda un Modelo sin marcar lo que añade no rompe nada hoy y se queda sin esa
 * red; por eso está escrito aquí y en AGENTS.md, junto al interruptor.
 */
export const MARCA_DE_INGRESO = 'data-ingreso';

export function modeloDe(id: string): Modelo | undefined {
  return MODELOS.find((modelo) => modelo.id === id);
}

/** Los Modelos encendidos hoy. Con los cuatro apagados, vacío. */
export function modelosEncendidos(): Modelo[] {
  return MODELOS.filter((modelo) => modelo.encendido);
}

/**
 * Los Modelos que una **ruta** puede alojar hoy: encendidos **y** admitidos en su superficie —
 * Historia 17.5.
 *
 * Las dos condiciones a la vez y en un solo sitio. Preguntar solo por la admisión dejaría
 * que una superficie pintara un Modelo apagado; preguntar solo por el estado, que lo pintara
 * la Página de Cita.
 *
 * **Por ruta y no por fichero**, que es lo que la 17.5 cambia. Hasta entonces se preguntaba
 * `modelosEn('index.astro')`, y un fichero genera rutas de distinto carácter: el listado de
 * Tema da la página 1, que es producto, y las 2+, que son servicio por forma. Admitir un
 * Modelo en ese fichero lo colaba en todas. Aquí la ruta se resuelve a su superficie con el
 * mismo predicado que `src/lib/superficies.ts` usa para declararla —`superficieDeclaradaDe`—,
 * y una ruta que es **servicio por forma** (`esServicioPorForma`, la misma mitad de
 * `caracterDe`) no aloja nada, la admita su fichero o no.
 *
 * **La restricción es solo de forma.** Lo que la Historia 22.4 declare servicio **por
 * contenido** —el `noindex` de una Obra que repite otra— no restringe ninguna admisión: el
 * `noindex` decide qué ve el buscador, no qué ve quien llega desde una atribución. Por eso
 * aquí se pregunta por `esServicioPorForma` y no por `caracterDe`: el carácter mezclaría las
 * dos cosas el día que exista la segunda, y además diría «servicio» de `/buscar` y `/404`,
 * que lo son por declaración y sí admiten las donaciones.
 *
 * La consulta (`?…`) y el fragmento (`#…`) se quitan antes de juzgar: `/tema/x/2/?a=b` es la
 * página 2 y `/#arriba` es la portada, y una dirección completa vale igual que su ruta.
 *
 * Una ruta que nadie ha declarado **rompe**, como en `caracterDe`: quien la pasa es una página
 * que se está construyendo, y una invitación que desaparece en silencio por una errata en la
 * ruta es peor que un build parado con el nombre del fichero que hay que tocar.
 *
 * `modelos` y `superficies` son para las pruebas, que juzgan declaraciones inventadas con este
 * mismo cruce; el sitio llama siempre con la declaración de verdad.
 */
export function modelosEnRuta(
  rutaOUrl: string,
  modelos: readonly Modelo[] = MODELOS,
  superficies: readonly Superficie[] = SUPERFICIES,
): Modelo[] {
  const ruta = rutaNormalizada(
    typeof rutaOUrl === 'string' ? rutaOUrl.replace(/[?#][\s\S]*$/, '') : rutaOUrl,
  );
  const superficie = superficieDeclaradaDe(ruta, superficies);
  if (superficie === undefined) {
    throw new Error(
      `La ruta «${ruta}» pregunta qué Modelo de Ingreso aloja y no es ninguna superficie ` +
        'declarada en src/lib/superficies.ts. Corrige la ruta en la página o declárala allí.',
    );
  }
  if (esServicioPorForma(ruta, superficies)) return [];
  return modelos.filter(
    (modelo) => modelo.encendido && modelo.admitidoEn.includes(superficie.pagina),
  );
}

/**
 * Los identificadores marcados con `data-ingreso` en un trozo de HTML.
 *
 * Devuelve **lo que encuentre**, incluido lo que no sea un Modelo declarado: un marcador con
 * una errata es exactamente lo que hay que ver, no algo que filtrar en silencio.
 *
 * Reconoce las cuatro formas que el HTML admite para un atributo —comillas dobles, simples,
 * **sin comillas** y **sin valor**—, y no solo las dos entrecomilladas. Astro emite las
 * dobles, pero quien busca lo que no debería estar no puede fiarse de que quien lo escribió
 * usara la forma más común: `<div data-ingreso=donaciones>` es HTML válido, y un detector que
 * no lo viera daría verde sobre una página que sí aloja algo. El atributo suelto —
 * `<div data-ingreso>`— sale como cadena vacía, que es un marcador sin Modelo y también hay
 * que verlo.
 */
export function modelosMarcadosEn(html: string): string[] {
  const patron = new RegExp(
    `${MARCA_DE_INGRESO}(?:\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'\`=<>]+)))?`,
    'g',
  );
  return [...html.matchAll(patron)].map((c) => c[1] ?? c[2] ?? c[3] ?? '');
}

/**
 * Lo que incumple la declaración de un Modelo, ya redactado. Lista vacía es «todo en orden».
 *
 * Se devuelve en vez de lanzarse para poder probarlo sin construir, y porque quien lo aplica
 * decide qué hacer con ello. Comprueba las formas que tiene el estado de despistarse de su
 * dueño: una superficie que no existe, un Modelo vedado colado en una superficie de lectura,
 * cualquier Modelo en la Página de Autor, la afiliación fuera de la Página de Obra, un Modelo
 * encendido que no aparece en ninguna parte, y las erratas que dejarían una entrada
 * inservible sin que nada fallara.
 *
 * Lo que **no** comprueba, porque no se puede declarar mal: un Modelo en una página 2+. La
 * admisión se nombra por superficie y la exclusión por forma la aplica `modelosEnRuta` a toda
 * ruta, así que no hay forma de escribir en `admitidoEn` «también la página 2».
 *
 * `superficies` es para las pruebas: ejercitan la regla de la afiliación sobre censos
 * inventados, con otras formas de fichero de la Página de Obra.
 */
export function revisarDeclaracionDeIngreso(
  modelos: readonly Modelo[] = MODELOS,
  superficies: readonly Superficie[] = SUPERFICIES,
  tiendas: readonly Tienda[] = TIENDAS,
): string[] {
  const fallos: string[] = [...revisarTiendas(tiendas)];
  const declaradas = new Set(superficies.map((superficie) => superficie.pagina));

  /*
   * Que las superficies de lectura sigan existiendo se comprueba **aquí y no solo en las
   * pruebas**, porque el fallo que impide es mudo: renombrar `src/pages/cita/[slug].astro`
   * dejaría esta lista apuntando a un fichero muerto, la Página de Cita real admitiendo
   * cualquier Modelo, y todo lo demás en verde.
   */
  for (const lectura of SUPERFICIES_DE_LECTURA) {
    if (!declaradas.has(lectura)) {
      fallos.push(
        `«${lectura}» está declarada como superficie de lectura y ya no existe en ` +
          'src/lib/superficies.ts. Mientras no concuerden, la superficie de verdad no está ' +
          'protegida por nada.',
      );
    }
  }

  // La misma guarda para las superficies sin ingreso, y por el mismo motivo: renombrar la
  // Página de Autor dejaría la regla apuntando a un fichero muerto y la página, sin proteger.
  for (const sinIngreso of SUPERFICIES_SIN_INGRESO) {
    if (!declaradas.has(sinIngreso)) {
      fallos.push(
        `«${sinIngreso}» está declarada como superficie sin ingreso y ya no existe en ` +
          'src/lib/superficies.ts. Mientras no concuerden, la superficie de verdad no está ' +
          'protegida por nada.',
      );
    }
  }

  const vistos = new Set<string>();
  for (const modelo of modelos) {
    if (vistos.has(modelo.id)) {
      fallos.push(`«${modelo.id}» se declara dos veces: un Modelo tiene un solo estado.`);
    }
    vistos.add(modelo.id);

    if (modelo.nombre.trim() === '') {
      fallos.push(`«${modelo.id}» no tiene nombre, y es como lo nombra el informe del mando.`);
    }

    if (
      modelo.umbral.clase === 'condiciones-de-lanzamiento' &&
      modelo.umbral.condiciones.length === 0
    ) {
      // Un Umbral de condiciones sin condiciones se imprime como « verificadas» y se lee como
      // un Umbral ya cumplido, que es la lectura más peligrosa posible.
      fallos.push(`«${modelo.nombre}» declara un Umbral de condiciones y no declara ninguna.`);
    }

    const repetidas = modelo.admitidoEn.filter((p, i) => modelo.admitidoEn.indexOf(p) !== i);
    for (const repetida of new Set(repetidas)) {
      fallos.push(`«${modelo.nombre}» declara «${repetida}» dos veces en sus superficies.`);
    }

    for (const pagina of modelo.admitidoEn) {
      if (!declaradas.has(pagina)) {
        fallos.push(
          `«${modelo.nombre}» dice admitirse en «${pagina}», que no es ninguna superficie ` +
            'declarada en src/lib/superficies.ts. Las dos listas hablan de las mismas ' +
            'superficies y se nombran igual a propósito.',
        );
      }
      if (SUPERFICIES_DE_LECTURA.includes(pagina) && MODELOS_VEDADOS_EN_LECTURA.includes(modelo.id)) {
        fallos.push(
          `«${modelo.nombre}» dice admitirse en «${pagina}», que es superficie de lectura. ` +
            'Ese Modelo no puede alojarse ahí (UX-DR36): son el punto de entrada desde los ' +
            'buscadores y donde el producto cumple su promesa. La afiliación no está en esta ' +
            'lista porque tiene una regla más estrecha: solo la Página de Obra.',
        );
      }
      if (SUPERFICIES_SIN_INGRESO.includes(pagina)) {
        fallos.push(
          `«${modelo.nombre}» dice admitirse en «${pagina}», que no aloja ningún Modelo ` +
            '(AD-20 v7.1): la Página de Autor se publica idéntica con cualquier Modelo ' +
            'encendido o apagado, y su lista de obras enlaza a la Página de Obra, que es donde ' +
            'vive el enlace de afiliación.',
        );
      }
      if (modelo.id === 'afiliacion-de-libros' && !esPaginaDeObra(pagina)) {
        fallos.push(
          `«${modelo.nombre}» dice admitirse en «${pagina}», y solo puede admitirse en la ` +
            'Página de Obra (AD-20 v7.1, FR-35). Ni la Página de Cita ni la de Autor la ' +
            'admiten: la excepción de la Cita se revocó, y la Obra es donde el enlace nace de ' +
            'la Procedencia sin añadir nada a la lectura.',
        );
      }
    }

    if (modelo.encendido && modelo.admitidoEn.length === 0) {
      fallos.push(
        `«${modelo.nombre}» está encendido y no lo admite ninguna superficie, así que no ` +
          'aparece en ninguna parte. Declare dónde va, o vuelva a apagarlo.',
      );
    }

    /*
     * El hermano exacto del de arriba, y la puerta del destino.
     *
     * Uno dice «no se ve en ninguna parte» y este «se ve y no lleva a ninguna parte»: las dos
     * formas que tiene un Modelo encendido de no funcionar sin que nada falle. Y va aquí y no
     * en el componente a propósito: desde la Historia 14.2 tres páginas importan este módulo,
     * así que la revisión al cargar la evalúa `astro build` y **detiene la construcción**. Un
     * `throw` en el componente llegaría más tarde, y solo si esa superficie llegara a
     * construirse.
     *
     * **Se exige forma y no solo presencia**, por la misma razón que su vecina rechaza un
     * nombre en blanco: `destino: ''` se renderiza como `<a href="">`, que recarga la página
     * que el visitante estaba leyendo en vez de llevarlo a ninguna parte, y `http://` publica
     * una invitación a pagar que viaja en claro. Las tres son la misma avería —encendido, sin
     * error, y sin funcionar— y no tendría sentido cazar solo la más aparatosa.
     *
     * **Lo que esta puerta da por supuesto, escrito para quien llegue con el segundo Modelo:**
     * que un Modelo encendido pone un **enlace** en una página. Vale para las donaciones; la
     * afiliación pone uno por edición y se juzga aparte, arriba. No tiene por qué valer para `producto-propio` ni
     * para `publicidad-acotada`, que podrían no llevar a ninguna dirección propia; encenderlos
     * tal como está escrito hoy obligaría a declarar un destino falso solo para cruzar la
     * puerta, que es peor que no tenerla. No se resuelve aquí —no hay ningún Modelo así
     * todavía y adivinar su forma sería inventarse un requisito—, pero el día que lo haya, lo
     * que hay que cambiar es esta condición, no el destino que se declare.
     */
    /*
     * Historia 22.9 — la afiliación no tiene un destino: cada edición lleva el suyo, compuesto
     * con la marca de su tienda. Su forma de «no llevar a ninguna parte» es no tener ninguna
     * tienda declarada, y eso es lo que se le exige en lugar del destino.
     */
    if (modelo.encendido && modelo.id === 'afiliacion-de-libros') {
      if (tiendas.length === 0) {
        fallos.push(
          `«${modelo.nombre}» está encendido y TIENDAS no declara ninguna tienda, así que ` +
            'ninguna edición puede llevar a ninguna parte. Declare la primera tienda con su ' +
            'marca, o vuelva a apagarlo.',
        );
      }
    } else if (modelo.encendido) {
      if (modelo.destino === undefined) {
        fallos.push(
          `«${modelo.nombre}» está encendido y no declara destino, así que la ` +
            'invitación no lleva a ninguna parte. Declare su destino, o vuelva a apagarlo.',
        );
      } else if (modelo.destino.trim() === '') {
        fallos.push(
          `«${modelo.nombre}» está encendido y su destino está en blanco, que no es declararlo: ` +
            'un `href` vacío recarga la página que el visitante estaba leyendo. Declare su ' +
            'destino, o vuelva a apagarlo.',
        );
      } else if (!/^https:\/\/\S/.test(modelo.destino)) {
        fallos.push(
          `«${modelo.nombre}» está encendido y su destino «${modelo.destino}» no es una ` +
            'dirección «https://» sin espacios alrededor. Una invitación a pagar no se publica ' +
            'en claro ni con un esquema cualquiera.',
        );
      }
    }
  }

  return fallos;
}

/** Los cuatro que la Épica 14 declara. Que estén los cuatro es parte del contrato. */
const CENSO_ESPERADO: readonly IdDeModelo[] = [
  'donaciones',
  'afiliacion-de-libros',
  'producto-propio',
  'publicidad-acotada',
];

/**
 * La revisión del censo entero: lo de cada Modelo, más que no falte ninguno.
 *
 * Separado de `revisarDeclaracionDeIngreso` porque son dos preguntas: aquella juzga las
 * entradas que se le den —y las pruebas le dan una sola a propósito—, y esta juzga que el
 * censo sea el censo. Sin ella, borrar `producto-propio` pasaba la revisión: el Modelo
 * desaparecía del informe y del aviso, y nadie volvía a preguntar por su Umbral.
 */
export function revisarCensoDeIngreso(): string[] {
  const fallos = revisarDeclaracionDeIngreso();
  const declarados = new Set(MODELOS.map((modelo) => modelo.id));

  for (const esperado of CENSO_ESPERADO) {
    if (!declarados.has(esperado)) {
      fallos.push(
        `Falta el Modelo «${esperado}». Los cuatro de la Épica 14 se declaran siempre, ` +
          'encendidos o no: uno que desaparece del censo desaparece del informe y del aviso, ' +
          'y deja de tener Umbral que vigilar.',
      );
    }
  }

  return fallos;
}

/*
 * El censo se revisa al cargar el módulo, y no solo desde las pruebas.
 *
 * **Qué protege, con precisión.** Desde la Historia 14.2 lo importan la portada, `/buscar` y
 * `/404` para preguntar qué Modelo alojan, así que `astro build` lo evalúa y este `throw`
 * **detiene la construcción** — que es donde más falta hace: quien encienda un Modelo mal
 * declarado no llega a publicar el sitio. Hasta entonces solo lo recorría `npm test`, que
 * también lo importa y lo sigue haciendo.
 */
const FALLOS = revisarCensoDeIngreso();
if (FALLOS.length > 0) {
  throw new Error(
    ['La declaración de Modelos de Ingreso de src/lib/ingreso.ts no se sostiene:', ...FALLOS].join(
      '\n  · ',
    ),
  );
}

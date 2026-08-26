/**
 * Contar Citas por **asunto**, que es lo que decide si un Tema nuevo puede abrirse.
 *
 * Un Tema exige quince Citas. Saber si un asunto las tiene se venía haciendo con un `grep` distinto
 * cada sesión, y el protocolo tiene escrita esta lección desde la 97.ª: una cuenta que vive en un
 * guion de usar y tirar trae su propio defecto cada vez que se rehace. Volvió a pasar, y los dos
 * defectos del mismo día fueron:
 *
 *   · `errar\b` **sin frontera por delante**, que daba por Citas del error «Abrid escuelas y se
 *     c*errar*án cárceles» y «el t*error* secreto»;
 *   · familias tan anchas que un asunto con 66 coincidencias bajaba a 8 al apretarlas.
 *
 * Los dos producen el mismo daño: **una cifra alta que se lee como cantera y no lo es**. Y no salta,
 * porque nadie relee la lista entera —se mira el total y se decide con él—.
 *
 * ## Lo que esto NO hace, y no es una carencia
 *
 * No dice si una Cita **trata** del asunto. Eso es un juicio de lectura y no se automatiza: entre
 * coincidir y tratar, la conversión medida en cinco asuntos va del **4 % al 57 %**, y lo que
 * descarta una candidata son tres formas —empieza remitiendo, cita a otro, trae nombre propio y
 * anécdota— que ningún patrón reconoce. **La cuenta es un puntero, nunca un veredicto.**
 */

/** Una raíz, comparable: sin tildes y en minúsculas. */
function llana(s: string): string {
  return s.normalize('NFD').replace(/\p{Mn}/gu, '').toLocaleLowerCase('es');
}

/** Lo que en español puede ir pegado a una palabra sin dejar de ser la misma palabra. */
const LETRA = /\p{L}/u;

/**
 * Si el texto contiene alguna de las raíces de la familia **como principio de palabra**.
 *
 * La frontera de delante es obligatoria y la de detrás no: «error» tiene que encontrar «errores»
 * —misma palabra, otra flexión— y no puede encontrar «terror», que es otra. Esa asimetría es todo
 * el módulo, y es exactamente donde falló el `grep` que lo precedió.
 */
export function coincideConElAsunto(texto: string, familia: string[]): boolean {
  const llano = llana(texto);

  return familia.some((raiz) => {
    const buscada = llana(raiz);
    if (!buscada) return false;

    let desde = 0;
    for (;;) {
      const donde = llano.indexOf(buscada, desde);
      if (donde === -1) return false;
      const anterior = donde === 0 ? '' : llano[donde - 1];
      if (!LETRA.test(anterior)) return true;
      desde = donde + 1;
    }
  });
}

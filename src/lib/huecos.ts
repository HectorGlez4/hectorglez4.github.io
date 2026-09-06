/**
 * Los huecos del Corpus — FR-25, LC-6.
 *
 * Se consulta **antes** de una sesión de sembrado, para que la sesión llene lo que está
 * vacío en vez de engordar lo que ya está lleno. El sesgo que corrige es el de la
 * curación no vigilada: se siembra a los Autores que uno tiene más a mano, que son los
 * que ya tienen Citas, y los Temas que faltan siguen faltando indefinidamente.
 *
 * Lo que esta vista **no** hace, y es criterio explícito: no nombra Autores. Informa la
 * decisión y no la toma.
 *
 * La Historia 11.3 matiza ese criterio sin soltar lo que protege. `objetivo.ts` deriva de
 * esta vista el objetivo de cada sesión de sembrado, porque un agente que siembra sin
 * supervisión no tiene criterio y sin objetivo deriva hacia lo que es más fácil de
 * encontrar — el mismo sesgo que esta vista existe para corregir. Lo que ese objetivo
 * dice es **qué hueco cerrar**, y al Autor que falta lo caracteriza por su tradición,
 * jamás por su nombre: ni la vista ni la política eligen a quién entra en el Corpus, que
 * sigue siendo la única decisión que este producto no delega. Una lista de nombres la
 * delegaría por la puerta de atrás.
 *
 * La Historia 19.2 pone el mismo filo que la 15.3 puso en `meta.ts`: `margenPorAutor` lleva
 * el **slug** de cada Autor para que el bucle sepa dónde queda sitio bajo el techo. Viaja en
 * la estructura y jamás en el texto del informe, y son Autores que **ya están** en el Corpus:
 * decir cuánto cabe de quien ya entró no es decir a quién admitir.
 *
 * AD-5 — Derivación pura: recibe lo leído, no lee disco.
 */

import {
  META_AUTORES_DE_OTRA_TRADICION,
  MIN_CITAS_POR_COLECCION,
  MIN_CITAS_POR_TEMA,
  SUELO_TRADICION_LATINOAMERICANA,
  TECHO_CONCENTRACION_POR_AUTOR,
} from './umbrales.ts';

export interface TemaParaHuecos {
  slug: string;
  nombre: string;
}

export interface AutorParaHuecos {
  slug: string;
  nombre: string;
  tradicion?: 'latinoamericana' | 'peninsular' | 'otra';
}

export interface CitaParaHuecos {
  slug: string;
  autor: string;
  temas?: string[];
}

export interface HuecoDeTema {
  slug: string;
  nombre: string;
  publicadas: number;
  /** Cuántas Citas le faltan para alcanzar el umbral de publicación. */
  faltan: number;
}

/**
 * Una Colección de la que ya se sabe cuántos miembros **resuelve** — Historia 12.4.
 *
 * `resueltas` no se calcula aquí a propósito. Resolver la pertenencia de una Colección es
 * intersectar su lista declarada con el conjunto publicable, y de eso tiene un solo dueño:
 * `resolverColeccion`, en `publicado.ts`. Esta vista recibe el número ya resuelto —como
 * recibe las Citas ya leídas— y no vuelve a derivarlo. Reimplementarlo aquí sería tener
 * dos respuestas a «cuántas Citas tiene esta Colección».
 */
export interface ColeccionParaHuecos {
  slug: string;
  nombre: string;
  /** Miembros que existen y están publicados. Sale de `resolverColeccion`. */
  resueltas: number;
}

/**
 * Lo que le falta a una Colección para publicarse — Historia 12.4.
 *
 * Tiene **los mismos campos que `HuecoDeTema` y con los mismos nombres**, y es el punto:
 * quien cura una Colección y quien mira qué le falta al Corpus son la misma persona en el
 * mismo momento, así que las dos cosas se leen igual y se escriben con el mismo formateador
 * (`lineaDeHueco`). `publicadas` es aquí el recuento resuelto, que es lo que el visitante
 * vería en la página: el declarado no publica nada.
 */
export interface HuecoDeColeccion {
  slug: string;
  nombre: string;
  publicadas: number;
  /** Cuántas Citas le faltan para alcanzar su umbral. */
  faltan: number;
}

/**
 * Qué le falta a **una** Colección, sin filtrar: `faltan` vale cero si ya se publica.
 *
 * Se expone aparte de `huecosDeColecciones` porque la herramienta de curación pregunta por
 * una sola y necesita la respuesta también cuando es «ninguna»; la vista de huecos enumera
 * las que faltan y descarta el resto.
 */
export function huecoDeColeccion(coleccion: ColeccionParaHuecos): HuecoDeColeccion {
  return {
    slug: coleccion.slug,
    nombre: coleccion.nombre,
    publicadas: coleccion.resueltas,
    faltan: Math.max(0, MIN_CITAS_POR_COLECCION - coleccion.resueltas),
  };
}

/** Las Colecciones por debajo de su umbral, de menos a más les falta, como los Temas. */
export function huecosDeColecciones(colecciones: ColeccionParaHuecos[]): HuecoDeColeccion[] {
  return colecciones
    .map(huecoDeColeccion)
    .filter((hueco) => hueco.faltan > 0)
    .sort((a, b) => a.faltan - b.faltan || a.slug.localeCompare(b.slug, 'es'));
}

/**
 * Una época ya cruzada contra el Corpus — Historia 19.5.
 *
 * `candidatos`, `sembrados` y `descartados` llegan **ya contados**, exactamente como
 * `ColeccionParaHuecos` recibe sus `resueltas`: quién es candidato lo dice la Fuente y quién
 * está sembrado o descartado lo cruza `tools/lib/epocas.ts`, que es su dueño único. Esta
 * vista no vuelve a derivarlo — no tiene con qué, y reimplementarlo sería tener dos
 * respuestas a «cuántos candidatos de esta época faltan».
 *
 * **Son cifras y un nombre de época, nunca nombres de Autor.** La regla de la 9.3 vale aquí
 * igual que en el bloque de tradición: la lista de candidatos vive versionada en `corpus/`,
 * que es donde el editor la mira, y esta vista informa la decisión sin tomarla.
 */
export interface EpocaParaHuecos {
  /** El identificador de la época, tal y como la declara la Fuente. */
  id: string;
  /** El nombre de la época. Es una categoría de la Fuente, jamás el nombre de un Autor. */
  nombre: string;
  /** Cuántos candidatos trae la categoría. */
  candidatos: number;
  /** Cuántos de ellos ya están en el Corpus. */
  sembrados: number;
  /** Cuántos se descartaron **con su motivo escrito**. Saltárselos no cuenta. */
  descartados: number;
  /**
   * La jornada en que se le preguntó a la Fuente, en `AAAA-MM-DD`.
   *
   * Es la única cadena de este bloque que no es un nombre de época, y está aquí porque sin
   * ella «TERMINADA» se imprime igual si la lista se recuperó hoy que hace ocho meses — y en
   * el segundo caso significa «terminada respecto de lo que la Fuente decía hace ocho meses»,
   * que es otra cosa. La lista versionada existe para que el bucle siga con la red caída, y
   * esa misma caché reintroduce por la puerta de atrás la lista que se queda vieja: enseñar
   * su edad es lo que la mantiene a la vista.
   *
   * **Una fecha no es un nombre de Autor.** La regla de la 9.3 sigue entera: lo que este
   * bloque no lleva, y no puede llevar, es a quién admitir.
   *
   * Ausente cuando no consta, que es distinto de vieja: es una época que no se ha recuperado
   * nunca. Quién decide si ya caducó es `listaCaducada`, en `tools/lib/epocas.ts`, porque esa
   * decisión necesita el día de hoy y esta derivación es determinista.
   */
  recuperada?: string;
}

/**
 * Lo que le falta a una época para estar terminada — Historia 19.5.
 *
 * Mismos campos y misma lectura que `HuecoDeTema` y `HuecoDeColeccion` en lo que comparten:
 * `faltan` es lo que queda por hacer y cero significa que no queda nada. Lo que esta añade
 * es `terminada`, que **no es opinión: es una cuenta**. Una época está terminada cuando
 * todos sus candidatos admisibles están sembrados o descartados con motivo, y por eso el
 * denominador es la lista entera de la Fuente y no una selección.
 *
 * Una época **sin candidatos no está terminada**, y es deliberado: cero de cero da cero
 * pendientes, pero una categoría que no devolvió a nadie es casi siempre una lista que no se
 * ha recuperado todavía, no una época agotada. Declararla terminada mandaría al bucle a la
 * siguiente sin haber sembrado nada.
 */
export interface HuecoDeEpoca {
  id: string;
  nombre: string;
  candidatos: number;
  sembrados: number;
  descartados: number;
  /** Ni sembrados ni descartados: lo que queda por mirar. */
  faltan: number;
  /** Todos sembrados o descartados, y al menos uno. */
  terminada: boolean;
  /** La jornada en que se recuperó la lista. Ver `EpocaParaHuecos.recuperada`. */
  recuperada?: string;
}

/** Qué le falta a **una** época, sin filtrar: `faltan` vale cero si ya está agotada. */
export function huecoDeEpoca(epoca: EpocaParaHuecos): HuecoDeEpoca {
  /*
   * `Math.max(0, …)` y no una resta a secas. Un candidato puede estar sembrado **y**
   * descartado —se descartó una sesión y se sembró la siguiente desde otra obra suya—, y
   * entonces las dos cifras suman más que la lista. Sin el suelo, `faltan` saldría negativo
   * y cualquier cuenta que lo sume después se iría al revés.
   */
  const faltan = Math.max(0, epoca.candidatos - epoca.sembrados - epoca.descartados);
  return {
    id: epoca.id,
    nombre: epoca.nombre,
    candidatos: epoca.candidatos,
    sembrados: epoca.sembrados,
    descartados: epoca.descartados,
    faltan,
    terminada: epoca.candidatos > 0 && faltan === 0,
    ...(epoca.recuperada === undefined || epoca.recuperada === ''
      ? {}
      : { recuperada: epoca.recuperada }),
  };
}

/**
 * Todas las épocas, terminadas incluidas, y en el orden en que se trabajan.
 *
 * **No se filtran las terminadas**, a diferencia de los Temas y las Colecciones: que una
 * época esté agotada es justo lo que el bucle necesita leer para pasar a la siguiente, y
 * desaparecer de la lista es indistinguible de no haberse recuperado nunca.
 *
 * Las que quedan van primero y de menos a más les falta, que es la regla de la casa desde la
 * 9.3: la época a la que le faltan dos se cierra esta semana y la de ochenta es un proyecto.
 * Ordenar al revés escondería el trabajo que está a punto de terminarse.
 */
export function huecosDeEpocas(epocas: EpocaParaHuecos[]): HuecoDeEpoca[] {
  return epocas
    .map(huecoDeEpoca)
    .sort(
      (a, b) =>
        Number(a.terminada) - Number(b.terminada) ||
        a.faltan - b.faltan ||
        a.id.localeCompare(b.id, 'es'),
    );
}

export interface EquilibrioDeTradicion {
  /**
   * Todos los Autores del Corpus, de la tradición que sean.
   *
   * **No es el denominador del suelo**, y desde la v6 conviene no confundirlos: esta cifra
   * dice el tamaño del censo, y la que mide el compromiso panhispánico es `hispanicos`.
   */
  total: number;
  latinoamericana: number;
  peninsular: number;
  otra: number;
  /**
   * Autores sin tradición declarada. Se enseñan aparte porque el dato está incompleto, pero
   * **cuentan en el denominador del suelo**: ver `hispanicos`.
   */
  sinDeclarar: number;
  /**
   * El denominador del suelo desde la v6: **todos los Autores menos los de tradición
   * `otra`** — o sea `latinoamericana` + `peninsular` + `sinDeclarar`.
   *
   * Lo que la v6 cambió es que salen los clásicos. El compromiso del brief es sobre el
   * reparto **entre hispánicos**, y un clásico universal no lo escora hacia ningún lado: con
   * el denominador viejo, admitir a Séneca contaba como escorarse hacia España.
   *
   * **Los que no declaran tradición se quedan dentro, y es deliberado.** El campo es
   * opcional a propósito —`tools/lib/gestion.ts` explica por qué: obligarlo empujaría a
   * rellenarlo a ojo y la proporción pasaría a medir suposiciones—, así que un Autor sin
   * declarar es **un dato que falta, no un Autor que no cuente**. Sacarlos del denominador
   * hacía que un fallo de captura *mejorase* el indicador: un Corpus con 34 sin clasificar y
   * un solo latinoamericano declarado informaba el 100 % y «por encima del suelo». Dentro
   * del denominador la cuenta es la conservadora, que es la que corresponde a un suelo:
   * nunca declara cumplido lo que no se sabe.
   */
  hispanicos: number;
  /**
   * Porcentaje de tradición latinoamericana **sobre `hispanicos`**, a una décima.
   *
   * **Ausente cuando no hay ninguno.** Un 0 ahí sería el artefacto de no dividir por cero
   * disfrazado de medición —el mismo que `objetivo.ts` ya tuvo que desactivar a mano para el
   * Corpus vacío—, así que el reparto que no existe no se informa en vez de informarse falso.
   */
  porcentaje?: number;
  suelo: number;
  alcanzaElSuelo: boolean;
}

/**
 * Los clásicos, contados aparte y con meta propia — FR-49, v6.
 *
 * Salen del denominador del suelo panhispánico y no del Corpus. La puerta de admisión no se
 * mueve ni un milímetro —FR-13 entero, sin excepción ninguna— y pesan lo mismo bajo el techo
 * de concentración: lo único que cambia es que se cuentan en su propia cuenta, porque un
 * catálogo panhispánico que **además** cubre a los clásicos es más que uno que solo cubre a
 * los clásicos.
 */
export interface MetaDeClasicos {
  /** Autores de tradición `otra` en el Corpus. */
  autores: number;
  /** El listón, cuando esté puesto. Ausente mientras no lo esté: lo pone Héctor. */
  meta?: number;
  /** Cuántos faltan para el listón. Ausente por lo mismo, y nunca negativo. */
  faltan?: number;
}

/**
 * Las líneas del bloque de clásicos del informe, con su dueño único.
 *
 * Vive aquí y no en la orden porque en la orden **nadie podía correrla**: mientras
 * `META_AUTORES_DE_OTRA_TRADICION` siga sin poner —y sigue, a propósito—, la rama de la meta
 * es código que no ejecuta ninguna prueba ni ningún usuario. Recibiendo la cuenta ya hecha se
 * prueban las tres ramas sin tocar la constante.
 *
 * El plural se resuelve aquí y no se deja a la interpolación: con la meta puesta y uno
 * faltando, la línea decía «Faltan 1».
 */
export function lineasDeClasicos(clasicos: MetaDeClasicos): string[] {
  if (clasicos.meta === undefined) {
    return [
      'Meta:                              sin poner',
      '',
      'Cuántos clásicos quiere el Corpus es un listón, y el listón lo pone Héctor.',
    ];
  }

  return [
    `Meta:                              ${String(clasicos.meta).padStart(4)}`,
    '',
    clasicos.faltan === 0
      ? 'Meta de clásicos alcanzada.'
      : clasicos.faltan === 1
        ? 'Falta 1 Autor para la meta de clásicos.'
        : `Faltan ${clasicos.faltan} Autores para la meta de clásicos.`,
  ];
}

/**
 * Cuánto sitio le queda a un Autor bajo el techo de concentración — Historia 19.2.
 *
 * El slug viaja en la estructura y **jamás en el texto** del informe, exactamente como el de
 * `Concentracion` en `meta.ts`: aquí es dato para el bucle que consume el `--json`, no una
 * propuesta a una persona. Quién entra en el Corpus sigue siendo del editor; esto solo dice
 * cuánto cabe de quien ya está.
 */
export interface MargenDeAutor {
  /** El Autor, por slug. */
  autor: string;
  /** Citas suyas publicadas. */
  citas: number;
  /** Citas más suyas que caben antes de rozar el techo. Cero si ya lo roza o lo pasa. */
  caben: number;
}

/**
 * Cuántas Citas más cabe sembrar de un Autor sin que rompa el techo de concentración.
 *
 * La aritmética contraria —cuántas Citas **de otros** faltan para diluir a quien ya excede—
 * vive en `verMeta`. Ésta dice **cuánto cabe**, que es capacidad y no prioridad: el protocolo
 * apoya en ella una regla —«el margen está donde el Autor tiene pocas Citas, no donde tiene
 * mucha obra»— para saber dónde hay sitio, nunca para elegir a quién sembrar. Eso lo decide
 * la demanda (FR-49).
 *
 * Sale de despejar `(citas + n) / (total + n) ≤ techo`:
 *
 *     n ≤ (techo · total − citas) / (1 − techo)
 *
 * Lo que importa de la fórmula, y lo que una regla de tres ingenua se pierde, es que **el
 * Corpus crece con lo que se siembra**: cada Cita sembrada sube el numerador de ese Autor y
 * también el denominador de todos. Por eso de un Autor a cero caben unas 176 en un Corpus de
 * 1000, no 150.
 *
 * Devuelve 0 —nunca un negativo— para quien ya está en el techo o lo excede: un margen
 * negativo se sumaría mal en cualquier cuenta que lo use.
 *
 * Vive aquí y no en `meta.ts`, donde nació en la Historia 15.3, porque desde la 19.2 esta
 * vista deriva el margen de **cada** Autor y `meta.ts` depende de ella y no al revés. Sigue
 * teniendo un solo dueño, que era lo que importaba: dos aritméticas del mismo techo en
 * sitios distintos acaban divergiendo.
 */
export function citasQueCabenDe(citasDelAutor: number, totalDelCorpus: number): number {
  /*
   * **En enteros, y no en fracciones.** La primera redacción dividía el techo por 100 y
   * operaba con `0,15` y `1 − 0,15`, que en coma flotante no son exactos, y el error caía
   * siempre del mismo lado: un barrido de todos los pares hasta 5.000 dio cero
   * sobreestimaciones y 44.441 subestimaciones de exactamente 1, todas ellas cuando la
   * respuesta cae **justo sobre un entero**. El caso mínimo es `citasQueCabenDe(1, 18)`, que
   * devolvía 1 cuando caben 2. Era conservador y aun así falso: la propiedad que la 15.3
   * prometió —«el margen es el mayor que cabe, no uno prudente»— no se cumplía en la
   * frontera, y su prueba pasaba porque los tres pares que medía no la tocaban.
   *
   * Con el techo en porcentaje entero, numerador y denominador son enteros exactos y la
   * división de una razón que da entero da ese entero.
   */
  const caben =
    (TECHO_CONCENTRACION_POR_AUTOR * totalDelCorpus - 100 * citasDelAutor) /
    (100 - TECHO_CONCENTRACION_POR_AUTOR);

  return Math.max(0, Math.floor(caben));
}

export interface Huecos {
  /** Temas por debajo del umbral, de menos a más les falta: por dónde empezar. */
  temas: HuecoDeTema[];
  /**
   * Colecciones por debajo de su umbral, en el mismo orden y con la misma lectura.
   *
   * Están en el informe y **no** en la política de objetivo de sesión, y la distinción es
   * deliberada: el hueco de un Tema se cierra sembrando Citas nuevas, que es lo que una
   * sesión de sembrado hace, y el de una Colección se cierra asignándole Citas que ya
   * existen, que es curación y no sembrado. Mezclarlos mandaría a una sesión a buscar
   * Autores para llenar una decisión editorial que nadie ha tomado todavía.
   */
  colecciones: HuecoDeColeccion[];
  /**
   * La cobertura por época — Historia 19.5.
   *
   * Va junto a la de Tema y no dentro de ella porque son dos listones distintos: el de un
   * Tema es un número de Citas y el de una época es **cobertura extensiva hasta agotarla**,
   * candidato a candidato. Están en la misma vista porque quien mira qué le falta al Corpus
   * antes de una sesión quiere las dos respuestas.
   *
   * Llega vacía cuando la lista de candidatos no se ha recuperado nunca, que no es lo mismo
   * que «no queda nada»: la orden que la recupera es `npm run epocas`.
   */
  epocas: HuecoDeEpoca[];
  tradicion: EquilibrioDeTradicion;
  /**
   * Los Autores de tradición `otra`, en su propia cuenta — v6.
   *
   * Va al lado del equilibrio de tradición y **no dentro** de él, que es justo lo que la v6
   * quiere que se lea: son dos cuentas, no dos filas de la misma. Mezclarlas es lo que hacía
   * que admitir a Séneca contase como escorarse hacia España.
   */
  clasicos: MetaDeClasicos;
  /**
   * Cuántas Citas más caben de cada Autor antes de rozar el techo de concentración.
   *
   * De menos margen a más: el primero de la lista es el que más pesa y el que antes tocaría
   * el techo, y el último es donde una sesión de profundidad tiene sitio de sobra. El techo
   * rige sin excepción y esto no lo relaja — dice dónde queda hueco bajo él.
   *
   * **Es capacidad, no prioridad.** Este orden no es un ranking de a quién sembrar: leerlo
   * así sería priorizar por **disponibilidad**, que es justo el eje que FR-49 prohíbe —«se
   * prioriza por demanda, no por disponibilidad: entre dos Autores admisibles entra antes el
   * que más se busca»— y que el protocolo del bucle llama la corrección de rumbo entera. La
   * prioridad la pone la demanda; esto solo dice dónde cabe lo que la demanda pida.
   */
  margenPorAutor: MargenDeAutor[];
  /**
   * Temas que la portada anuncia y no llegan al umbral — LC-6.
   *
   * Debe estar siempre vacío: la portada anuncia lo que `publicado.ts` da por publicado,
   * y ese dueño único aplica el mismo umbral. Se comprueba igualmente porque es la
   * condición de lanzamiento, y una condición que se da por supuesta no es una condición.
   */
  anunciadosBajoUmbral: string[];
}

export function verHuecos(
  citas: CitaParaHuecos[],
  temas: TemaParaHuecos[],
  autores: AutorParaHuecos[],
  temasAnunciadosEnPortada: string[] = [],
  colecciones: ColeccionParaHuecos[] = [],
  /*
   * Las épocas ya cruzadas — Historia 19.5. Opcionales y vacías por omisión, como las
   * Colecciones: un corpus sin lista recuperada tiene que poder consultar sus huecos igual.
   */
  epocas: EpocaParaHuecos[] = [],
): Huecos {
  const porTema = new Map<string, number>();
  for (const tema of temas) porTema.set(tema.slug, 0);
  for (const cita of citas) {
    for (const tema of cita.temas ?? []) {
      porTema.set(tema, (porTema.get(tema) ?? 0) + 1);
    }
  }

  const huecosDeTema = temas
    .map((tema) => {
      const publicadas = porTema.get(tema.slug) ?? 0;
      return {
        slug: tema.slug,
        nombre: tema.nombre,
        publicadas,
        faltan: Math.max(0, MIN_CITAS_POR_TEMA - publicadas),
      };
    })
    .filter((hueco) => hueco.faltan > 0)
    // De menos a más: el Tema al que le faltan dos se publica esta sesión, el que
    // necesita catorce es un proyecto. Ordenar al revés escondería el trabajo fácil.
    .sort((a, b) => a.faltan - b.faltan || a.slug.localeCompare(b.slug, 'es'));

  const cuenta = (t: AutorParaHuecos['tradicion']) =>
    autores.filter((a) => a.tradicion === t).length;

  const total = autores.length;
  const latinoamericana = cuenta('latinoamericana');
  const peninsular = cuenta('peninsular');
  const otra = cuenta('otra');
  const sinDeclarar = autores.filter((a) => a.tradicion === undefined).length;
  /*
   * El denominador del suelo, y el cambio entero de la v6: **todos menos los de tradición
   * `otra`**. El valor del suelo no se mueve —sigue siendo el 40 % de `umbrales.ts`—; lo que
   * se corrige es sobre qué se mide, porque el compromiso es sobre el reparto entre
   * hispánicos y no sobre cuántos clásicos universales hay.
   *
   * Los que no declaran tradición **siguen dentro**, que es la opción conservadora: un dato
   * que falta no puede volver el indicador más favorable de lo que se ha medido. Ver el
   * comentario de `EquilibrioDeTradicion.hispanicos`.
   */
  const hispanicos = latinoamericana + peninsular + sinDeclarar;
  /*
   * A una décima, y **el empate cae hacia abajo**: un suelo no se alcanza por redondeo. 18 de
   * 32 es el 56,25 % exacto, y `Math.round` lo escribiría 56,3 — media décima de compromiso
   * que nadie ha cumplido. `Math.ceil(v − 0,5)` es el redondeo de toda la vida salvo en el
   * empate justo, donde cae del lado que no promete de más, y es la cifra con la que §6.1 del
   * PRD escribe esta misma medición: 56,2 %.
   *
   * Su hermana de `meta.ts` **no** redondea al alza, aunque este comentario lo afirmara: allí
   * la cifra a una décima es solo de presentación, y quien decide si el techo se excede es la
   * razón exacta `100·citas > techo·total`. Comparar contra la cifra ya redondeada declaraba
   * cumplido un techo ya roto.
   */
  const porcentaje =
    hispanicos === 0
      ? undefined
      : Math.ceil((latinoamericana / hispanicos) * 1000 - 0.5) / 10;

  /*
   * El margen de cada Autor bajo el techo, incluidos los admitidos que todavía no publican:
   * son precisamente donde más sitio hay, y dejarlos fuera escondería la mitad de la
   * respuesta a «dónde sembrar en profundidad». El recuento se hace aquí y no se recibe
   * porque las Citas ya están en la mano; el techo, en cambio, sale de `umbrales.ts`.
   */
  const citasPorAutor = new Map<string, number>(autores.map((a) => [a.slug, 0]));
  for (const cita of citas) {
    citasPorAutor.set(cita.autor, (citasPorAutor.get(cita.autor) ?? 0) + 1);
  }
  const margenPorAutor = [...citasPorAutor.entries()]
    .map(([autor, suyas]) => ({
      autor,
      citas: suyas,
      caben: citasQueCabenDe(suyas, citas.length),
    }))
    // De menos margen a más, desempatado por slug en español como el resto de esta vista:
    // sin desempate, dos Autores con las mismas Citas cambiarían de orden según se leyeran
    // los ficheros y el informe dejaría de ser el mismo para el mismo estado.
    .sort((a, b) => a.caben - b.caben || a.autor.localeCompare(b.autor, 'es'));

  return {
    temas: huecosDeTema,
    colecciones: huecosDeColecciones(colecciones),
    epocas: huecosDeEpocas(epocas),
    tradicion: {
      total,
      latinoamericana,
      peninsular,
      otra,
      sinDeclarar,
      hispanicos,
      ...(porcentaje === undefined ? {} : { porcentaje }),
      suelo: SUELO_TRADICION_LATINOAMERICANA,
      alcanzaElSuelo:
        porcentaje !== undefined && porcentaje >= SUELO_TRADICION_LATINOAMERICANA,
    },
    clasicos: {
      autores: otra,
      ...(META_AUTORES_DE_OTRA_TRADICION === undefined
        ? {}
        : {
            meta: META_AUTORES_DE_OTRA_TRADICION,
            faltan: Math.max(0, META_AUTORES_DE_OTRA_TRADICION - otra),
          }),
    },
    margenPorAutor,
    anunciadosBajoUmbral: temasAnunciadosEnPortada.filter(
      (slug) => (porTema.get(slug) ?? 0) < MIN_CITAS_POR_TEMA,
    ),
  };
}

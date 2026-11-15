/**
 * Alta de Citas, individual o por lote — FR-13.
 *
 * Es comodidad, no puerta: la puerta vive en el esquema (AD-1) y esta herramienta
 * importa **las mismas** reglas desde `src/lib/admision.ts` en lugar de reimplementarlas,
 * para que no pueda aceptar una Cita que el build luego rechaza.
 *
 * Lo que aporta sobre editar ficheros a mano es el reparto: las Citas completas van a
 * `corpus/citas/` con su slug generado, las incompletas a `corpus/_revision/` —donde no
 * las carga ninguna colección (AD-2)— y el informe dice, por cada una que no se publica,
 * qué regla incumplió. Sin eso, incorporar un lote de cincuenta obliga a revisarlas todas.
 *
 * **La excepción es la Cita sin Tema publicado** (Historia 26.8, NFR-5): completa, pero ninguno
 * de sus Temas llegaría a `MIN_CITAS_POR_TEMA` ni contando el lote entero. Esa **no se escribe en
 * ningún sitio** —ni `corpus/citas/` ni `corpus/_revision/`—: no le falta nada que completar en
 * revisión, le falta un Tema en el lote, y el informe la nombra con sus Temas y sus recuentos. Un
 * Tema **desconocido**, en cambio, es una regla incumplida de la Cita y la manda a revisión, como
 * siempre.
 *
 * Uso:
 *   npx tsx tools/alta.ts <lote.yaml> [--corpus corpus] [--seco] [--con-duplicados]
 *
 * Sale con 1 si alguna entrada se quedó sin escribir por no tener Tema publicado —también en
 * seco— o si alguna publicada se quedó sin él; con 2 si falta el lote o no es una lista; y con 0
 * en lo demás, también con Citas en revisión.
 */

import { readFile } from 'node:fs/promises';
import { parse as parsearYaml } from 'yaml';
import { citaAdmisible, gradoDeProcedencia, type CitaAdmisible } from '../src/lib/admision.ts';
import { documentosDeCita, motivoParaNoPublicar } from './lib/cotejo.ts';
import { documentoParaLosSaltos, parteDeSaltosDescartados, textoConSaltos } from './lib/lineas.ts';
import { normalizar } from '../src/lib/normalizar.ts';
import { cifraDeParecido, formaParaComparar, parecidoEntre, type FormaParaComparar } from './lib/parecido.ts';
import { clave, fichaDeCita, formaDeObra, indiceDeFichas } from '../src/lib/obras.ts';
import { slugDeAutor, slugDeCita, slugDeTema, slugLibre } from '../src/lib/slug.ts';
import {
  escribirCita,
  leerAutores,
  leerCitas,
  leerDocumentosDeclarados,
  leerFichasDeObra,
  leerTemas,
  nombreDeFicheroDeCita,
  rutasDelCorpus,
  type Rutas,
} from './lib/corpus.ts';
import { aplicarFichaDeObra, resolverFichaDeObra, type PlanDeFicha } from './lib/obras.ts';
import { motivoSinTemaPublicado, temaPublicadoConLaPasada } from './lib/alcance.ts';
import type { TemaBajoUmbral } from '../src/lib/publicado.ts';

/** Una entrada del lote, tal como la escribe el editor. Sin slug: lo genera el alta. */
export interface EntradaDeLote {
  texto?: string;
  autor?: string;
  temas?: string[];
  procedencia?: { obra?: string; año?: number; referencia?: string };
  /**
   * La Fuente de la que salió, y con ella el documento contra el que el build coteja
   * el texto — Historia 11.2.
   *
   * Es obligatoria para publicar, salvo que la Cita sea una de las anteriores a la v3
   * que el censo ampara: sin ella la Cita se queda en `corpus/_revision/` con la regla
   * escrita. Declararla no relaja nada —el cotejo del build sigue exigiendo que el texto
   * aparezca literalmente en un documento que la recuperación versionó—, solo permite
   * que un alta sobre una obra ya recuperada llegue a construir.
   */
  fuente?: { id?: string; nombre?: string; licencia?: string; url?: string };
  aptaParaPortada?: boolean;
}

export interface CitaPublicada {
  slug: string;
  ruta: string;
  texto: string;
  grado: 'completa' | 'parcial';
}

export interface CitaRechazada {
  texto: string;
  ruta: string | null;
  /** Una línea por regla incumplida. Es lo que el editor lee para saber qué completar. */
  motivos: string[];
}

export interface PosibleDuplicado {
  texto: string;
  /** Slug de la Cita que ya está en el corpus, o `«el propio lote»` si repite dentro. */
  coincideCon: string;
  donde: 'publicadas' | 'en revisión' | 'el propio lote';
  /** Historia 29.4 — cómo coincide, según `parecidoEntre`: la misma forma, o una dentro de la otra. */
  clase: 'repetidas' | 'contenida';
}

/**
 * Historia 29.4 — una entrada casi igual a una Cita publicada **de su misma Obra** (`parecidoEntre`,
 * clase «casi iguales»). Es solo aviso: no aparta la entrada, que se escribe como siempre.
 */
export interface CasiIgual {
  texto: string;
  /** Slug de la publicada con la que casi coincide. */
  coincideCon: string;
  /** Una publicada de antes, o una que este mismo lote publica. */
  donde: 'publicadas' | 'el propio lote';
  parecido: number;
  /** La palabra que cambia en cada una, si es una sola en la misma posición. */
  palabra?: { a: string; b: string };
}

export interface InformeDeAlta {
  publicadas: CitaPublicada[];
  enRevision: CitaRechazada[];
  /** Autores citados en el lote que no existen en el corpus. No se crean (FR-15). */
  autoresDesconocidos: string[];
  /**
   * Publicadas cuya Ficha de Obra, resuelta antes de escribir la Cita, no se pudo escribir
   * después —un fallo de disco entre medias—. `npm run obra -- sembrar` la completa
   * (Historia 22.1). Vacío casi siempre.
   */
  fichasSinAsegurar?: { slug: string; motivos: string[] }[];
  /**
   * Señaladas antes de escribirlas — FR-14. No se descartan: quedan aquí para que el
   * editor decida, y se incorporan tal cual si vuelve a ejecutar con `--con-duplicados`.
   */
  posiblesDuplicados: PosibleDuplicado[];
  /**
   * Historia 29.4 — entradas casi iguales a una publicada de su misma Obra. **No bloquean**: se
   * escriben igual, con `--con-duplicados` o sin él, también en seco; el parte lo dice.
   */
  casiIguales: CasiIgual[];
  /**
   * Entradas que se publicarían pero no tendrían **ningún Tema publicado** —contando las
   * publicadas y las que este mismo lote publica— — Historia 26.8, NFR-5. **No se escriben en
   * ningún sitio**, ni en `corpus/citas/` ni en `corpus/_revision/`: el lote se corrige y se
   * vuelve a pasar. Con alguna, la orden sale con 1, también en seco. Se nombran por su texto y
   * no por un slug: no se escriben, así que no tienen ninguno, y el que tuvieron en el ensayo lo
   * puede llevar ya otra entrada del lote que sí se publicó.
   */
  rechazadasPorTema: { texto: string; temas: TemaBajoUmbral[]; motivos: string[] }[];
  /**
   * Publicadas que se quedaron sin ningún Tema publicado porque la pasada que escribe discrepó del
   * ensayo —una colisión entre dos Fichas de Obra nuevas del mismo lote mandó a revisión a otra
   * de la que dependía su Tema—. Ya están en `corpus/citas/`. Vacío casi siempre — Historia 26.8.
   */
  publicadasSinTema?: { slug: string; temas: TemaBajoUmbral[]; motivos: string[] }[];
  /**
   * Historia 29.1 — entradas cuyo texto traía saltos que ningún documento de verso suyo respalda:
   * se escribieron con un espacio en su lugar (AD-29). No impiden nada; el parte lo dice.
   */
  saltosDescartados?: { texto: string; descartados: number }[];
}

/**
 * Da de alta un lote.
 *
 * `--seco` (opción `seco`) calcula el informe sin escribir nada, para poder ver qué haría
 * antes de tocar el corpus.
 */
export async function darDeAltaLote(
  lote: EntradaDeLote[],
  rutas: Rutas,
  opciones: { seco?: boolean; conDuplicados?: boolean } = {},
): Promise<InformeDeAlta> {
  const autores = await leerAutores(rutas);
  const temas = await leerTemas(rutas);
  const yaPublicadas = await leerCitas(rutas.citas);
  const enRevisionYa = await leerCitas(rutas.revision);
  const fichas = indiceDeFichas(await leerFichasDeObra(rutas));

  /*
   * Historia 29.4 — las publicadas de cada Obra resuelta (por ficha), con su forma precalculada:
   * contra ellas se mira la casi igual. Solo la misma Obra: entre Obras distintas, una palabra
   * cambiada suele ser otra Cita.
   */
  const publicadasDeCadaObra = new Map<
    string,
    { slug: string; donde: CasiIgual['donde']; forma: FormaParaComparar }[]
  >();
  for (const c of yaPublicadas) {
    const ficha = fichaDeCita(c, fichas);
    if (ficha === undefined) continue;
    const lista = publicadasDeCadaObra.get(ficha.nombre) ?? [];
    lista.push({ slug: c.slug, donde: 'publicadas', forma: formaParaComparar(c.texto) });
    publicadasDeCadaObra.set(ficha.nombre, lista);
  }

  const slugsDeAutor = new Set(autores.map((a) => a.slug));
  const slugsDeTema = new Set(temas.map((t) => t.slug));

  /*
   * Historia 29.1 — el `texto` lo escribe `textoConSaltos`, con los saltos del documento de verso
   * de la Cita si lo hay. Los documentos se leen solo si alguna entrada declara Fuente: sin ella
   * no hay documento, y el texto va en una línea.
   */
  const documentos = lote.some((e) => typeof e.fuente?.id === 'string')
    ? await leerDocumentosDeclarados(rutas)
    : new Map<string, { cuerpo: string; lineas?: string }>();
  function textoDelAlta(entrada: EntradaDeLote): { texto: string; descartados: number } {
    const recibido = entrada.texto ?? '';
    // Un `texto` que no es cadena (un número del YAML) sigue tal cual hasta el esquema, que lo
    // rechaza con su regla: el escritor solo escribe cadenas.
    if (typeof recibido !== 'string') return { texto: recibido, descartados: 0 };
    const id = entrada.fuente?.id;
    const obra = entrada.procedencia?.obra;
    const candidatos = documentosDeCita(
      typeof id === 'string' ? { id } : undefined,
      typeof obra === 'string' ? obra : undefined,
      documentos,
    ).map((nombre) => {
      const d = documentos.get(nombre)!;
      return { nombre, cuerpo: d.cuerpo, ...(d.lineas !== undefined ? { lineas: d.lineas } : {}) };
    });
    return textoConSaltos(recibido, documentoParaLosSaltos(recibido, candidatos));
  }

  /*
   * Historia 26.8 — antes de escribir nada se **ensaya** el lote entero (`recorrer` sin
   * escribir) y se mira qué entradas publicadas tendrían algún Tema publicado, contando lo ya
   * publicado y lo que el mismo lote publicaría (`temaPublicadoConLaPasada`). Las que no, se
   * apartan y se vuelve a ensayar sin ellas —apartar una cambia el resto del recorrido: libera
   * su slug, o deja de ser el primero de un duplicado dentro del lote—, hasta que nada cambia.
   * Solo entonces se recorre de verdad, escribiendo, sin las apartadas: no se escriben en ningún
   * sitio. En seco el ensayo es el informe.
   *
   * El ensayo resuelve las Fichas de Obra contra el disco de antes del lote; la pasada real, tras
   * cada Cita escrita. Solo una colisión de nombre entre dos fichas nuevas del mismo lote los haría
   * discrepar: esa entrada va a revisión con el motivo, como siempre, y lo que la pasada real dejó
   * publicado se vuelve a juzgar al final (`publicadasSinTema`).
   */
  /** Las apartadas, con el recuento de sus Temas en la vuelta del ensayo que las apartó. */
  const apartadas = new Map<number, { texto: string; temas: TemaBajoUmbral[] }>();
  let ensayo = await recorrer(false);
  for (;;) {
    const { rechazadas } = temaPublicadoConLaPasada(
      yaPublicadas,
      ensayo.aPublicar.map((p) => ({ clave: p.indice, temas: p.temas })),
      temas,
    );
    if (rechazadas.length === 0) break;
    for (const rechazada of rechazadas) {
      const apartada = ensayo.aPublicar.find((p) => p.indice === rechazada.clave)!;
      apartadas.set(rechazada.clave, { texto: apartada.texto, temas: rechazada.temas });
    }
    ensayo = await recorrer(false);
  }
  const { informe, aPublicar } = opciones.seco ? ensayo : await recorrer(true);
  if (!opciones.seco) {
    const sueltas = temaPublicadoConLaPasada(
      yaPublicadas,
      aPublicar.map((p) => ({ clave: p.slug, temas: p.temas })),
      temas,
    ).rechazadas;
    if (sueltas.length > 0) {
      informe.publicadasSinTema = sueltas.map((s) => ({
        slug: s.clave,
        temas: s.temas,
        motivos: [motivoSinTemaPublicado(s.temas)],
      }));
    }
  }
  /*
   * El recuento del parte es el de la vuelta del ensayo que apartó a cada una —lo publicado más
   * lo que esa vuelta publicaba, la propia incluida—, como en `aprobar`: «tendría 14» quiere decir
   * que ni con todo lo que se pidió llega. No se recalcula al final sumando las apartadas de
   * vueltas distintas: la de una vuelta puede ser el duplicado de la de otra, y sumarlas daría un
   * recuento que ninguna pasada alcanza.
   */
  informe.rechazadasPorTema = [...apartadas.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, { texto, temas: suyos }]) => ({ texto, temas: suyos, motivos: [motivoSinTemaPublicado(suyos)] }));
  return informe;

  /**
   * Una pasada por el lote sin las entradas apartadas. Con `escribir`, escribe como siempre; sin
   * él, decide lo mismo sin tocar el disco. Devuelve el informe y lo que se publica, con sus Temas.
   */
  async function recorrer(escribir: boolean): Promise<{
    informe: InformeDeAlta;
    aPublicar: { indice: number; texto: string; slug: string; temas: string[] }[];
  }> {
    const aPublicar: { indice: number; texto: string; slug: string; temas: string[] }[] = [];
    const slugsOcupados = new Set(yaPublicadas.map((c) => c.slug));
    // El conjunto publicado tal como va quedando, para la grafía por omisión de una ficha nueva.
    const publicadasParaObra: { autor: string; procedencia?: { obra?: string } }[] = [
      ...yaPublicadas,
    ];

    // FR-14 — el índice de comparación usa la forma canónica de AD-3, la misma que la
    // búsqueda. Ese es justo el punto: si duplicados y búsqueda usaran criterios distintos,
    // el corpus podría acabar con dos Citas que la búsqueda presenta como una sola.
    const yaEnCorpus: YaEnCorpus = new Map();
    // Historia 29.4 — las de cada Obra, para la casi igual, con lo que esta pasada vaya publicando.
    // Cada pasada empieza de lo publicado: lo de un ensayo no cuenta en la siguiente. Las listas no
    // se mutan, se sustituyen, así que basta copiar el mapa.
    const publicadasPorObra = new Map(publicadasDeCadaObra);
    for (const c of enRevisionYa) {
      const f = formaParaComparar(c.texto);
      yaEnCorpus.set(f.canonica, { slug: c.slug, donde: 'en revisión', forma: f });
    }
    // Las publicadas se indexan después para que ganen: si el mismo texto está en los dos
    // sitios, lo que el editor necesita saber es que ya está publicado.
    for (const c of yaPublicadas) {
      const f = formaParaComparar(c.texto);
      yaEnCorpus.set(f.canonica, { slug: c.slug, donde: 'publicadas', forma: f });
    }

    const informe: InformeDeAlta = {
      publicadas: [],
      enRevision: [],
      autoresDesconocidos: [],
      posiblesDuplicados: [],
      casiIguales: [],
      rechazadasPorTema: [],
    };

    for (const [indice, entrada] of lote.entries()) {
      if (apartadas.has(indice)) continue;
      const escrito = textoDelAlta(entrada);
      const texto = escrito.texto;
      const motivos: string[] = [];

      // ── El Autor se resuelve antes que nada: sin él no hay slug que generar ──
      const referenciaAutor = entrada.autor ?? '';
      const slugAutor = slugsDeAutor.has(referenciaAutor)
        ? referenciaAutor
        : slugDeAutor(referenciaAutor);

      // ── Duplicados: se comprueba antes de escribir nada (FR-14) ──
      const nueva = formaParaComparar(texto);
      const canonico = nueva.canonica;

      /*
       * Historia 29.4 — la casi igual, frente a las publicadas de su misma Obra (y las que este lote
       * ya publicó). Es aviso y nada más: no aparta la entrada, y sale también con `--con-duplicados`.
       */
      const obraDeLaEntrada = entrada.procedencia?.obra;
      const fichaDeLaEntrada =
        typeof obraDeLaEntrada === 'string'
          ? fichaDeCita({ slug: '', autor: slugAutor, procedencia: { obra: obraDeLaEntrada } }, fichas)
          : undefined;
      /*
       * La Obra de la entrada: su ficha, o —si su Obra aún no tiene ficha, porque este lote la
       * crea— su identidad (Autor, forma), para que dos entradas del mismo lote de una Obra nueva
       * se comparen entre sí. Una forma vacía no es Obra.
       */
      const formaDeLaEntrada = typeof obraDeLaEntrada === 'string' ? formaDeObra(obraDeLaEntrada) : '';
      const obraDeComparacion =
        fichaDeLaEntrada?.nombre ?? (formaDeLaEntrada === '' ? undefined : `sin-ficha:${clave(slugAutor, formaDeLaEntrada)}`);
      // Se anotan en el informe solo si la entrada llega a publicarse: el parte dice «escritas igual».
      const casiDeLaEntrada: CasiIgual[] = [];
      for (const otra of obraDeComparacion === undefined ? [] : (publicadasPorObra.get(obraDeComparacion) ?? [])) {
        const coincidencia = parecidoEntre(nueva, otra.forma);
        if (coincidencia?.clase !== 'casi-iguales') continue;
        casiDeLaEntrada.push({
          texto,
          coincideCon: otra.slug,
          donde: otra.donde,
          parecido: coincidencia.parecido,
          ...(coincidencia.palabra !== undefined ? { palabra: coincidencia.palabra } : {}),
        });
      }

      const yaEsta = repetidaOContenida(nueva, yaEnCorpus);
      if (yaEsta && !opciones.conDuplicados) {
        // No se escribe y no se descarta: se señala y el editor decide. El sistema no
        // tiene criterio para saber si dos textos equivalentes son la misma Cita o dos
        // ediciones legítimas de la misma frase.
        informe.posiblesDuplicados.push({
          texto,
          coincideCon: yaEsta.slug,
          donde: yaEsta.donde,
          clase: yaEsta.clase,
        });
        continue;
      }
      // El parte de saltos habla solo de lo que se escribe (a `citas/` o a revisión), no de un
      // duplicado que se aparta sin escribir.
      if (escrito.descartados > 0) {
        informe.saltosDescartados = [
          ...(informe.saltosDescartados ?? []),
          { texto, descartados: escrito.descartados },
        ];
      }

      if (referenciaAutor === '') {
        motivos.push('Regla incumplida: falta el Autor de la Cita.');
      } else if (!slugsDeAutor.has(slugAutor)) {
        // FR-15 — se señala, no se crea. Un Autor creado aquí saldría sin año de
        // fallecimiento, y ese hueco bloquearía después la publicación de todas sus
        // Citas sin que nadie recuerde de dónde salió.
        motivos.push(
          `El Autor «${referenciaAutor}» no existe en el corpus. Créelo antes con ` +
            `«npx tsx tools/autor.ts crear», con su año de fallecimiento. El alta no lo ` +
            'crea por su cuenta para no dejar un Autor incompleto.',
        );
        if (!informe.autoresDesconocidos.includes(referenciaAutor)) {
          informe.autoresDesconocidos.push(referenciaAutor);
        }
      }

      // ── Temas: se avisa de los desconocidos, pero no impiden publicar ──
      const temasResueltos = (entrada.temas ?? []).map((t) =>
        slugsDeTema.has(t) ? t : slugDeTema(t),
      );
      const temasDesconocidos = temasResueltos.filter((t) => !slugsDeTema.has(t));
      if (temasDesconocidos.length > 0) {
        motivos.push(
          `Tema desconocido: ${temasDesconocidos.map((t) => `«${t}»`).join(', ')}. ` +
            'Créelo antes o retírelo de la Cita.',
        );
      }

      // ── Las reglas de admisión, las mismas que aplica el build ──
      const slugBase = slugDeCita(slugAutor, texto);
      const candidata = {
        texto,
        autor: slugAutor,
        temas: temasResueltos,
        slug: slugLibre(slugBase, slugsOcupados),
        procedencia: entrada.procedencia,
        estadoDerechos: 'dominio-público' as const,
        // Se pasa tal cual y la valida la misma puerta que el resto: un `fuente:` a medias
        // manda la Cita a revisión con la regla incumplida escrita, no al corpus.
        ...(entrada.fuente !== undefined ? { fuente: entrada.fuente } : {}),
        // Solo se registra el sí. El esquema ya da `false` por defecto, así que escribir
        // `aptaParaPortada: false` en cada Cita del corpus sería ruido que además invita
        // a leerlo como una decisión tomada, cuando es la ausencia de decisión.
        ...(entrada.aptaParaPortada === true ? { aptaParaPortada: true } : {}),
      };

      const validada = citaAdmisible.safeParse(candidata);
      if (!validada.success) {
        for (const issue of validada.error.issues) {
          const campo = issue.path.join('.');
          motivos.push(campo ? `${campo}: ${issue.message}` : issue.message);
        }
      }

      /*
       * Historia 11.2 — el alta no fabrica builds rotos.
       *
       * Publicar una Cita sin Fuente en `corpus/citas/` mataba la construcción siguiente:
       * la herramienta escribía el fichero, informaba de éxito, y el fallo aparecía después
       * en un sitio distinto y en boca de otra puerta. Aquí se aplica **la misma** regla que
       * aplicará el build —importada, no copiada—, así que la Cita se queda en revisión con
       * lo que le falta escrito al lado.
       */
      const sinDocumento = motivoParaNoPublicar(candidata);
      if (sinDocumento !== undefined) motivos.push(sinDocumento);

      const nombreFichero = nombreDeFicheroDeCita(slugAutor, candidata.slug);

      /*
       * Historia 22.1 — la Ficha de Obra, en el mismo gesto en que se publica (AD-25).
       *
       * Solo para lo que se va a publicar: una candidata que va a revisión no crea ficha. Se
       * **resuelve** en solo lectura antes de escribir la Cita —también en seco, para que el
       * seco y el real no discrepen ante una colisión—, y se escribe justo **después** de que
       * la Cita esté escrita. Si no se puede asegurar sin decidir, la Cita va a revisión con
       * el motivo, porque publicada sin ficha rompería la construcción siguiente.
       */
      const obraDeclarada = validada.success ? validada.data.procedencia?.obra : undefined;
      let plan: PlanDeFicha | undefined;
      if (motivos.length === 0 && validada.success && typeof obraDeclarada === 'string') {
        plan = await resolverFichaDeObra(rutas, {
          autor: slugAutor,
          obra: obraDeclarada,
          citasPublicadas: [
            ...publicadasParaObra,
            { autor: slugAutor, procedencia: { obra: obraDeclarada } },
          ],
        });
        if (!plan.ok) motivos.push(...plan.motivos);
      }

      if (motivos.length > 0 || !validada.success) {
        // A revisión con lo que se sepa. El fichero conserva el trabajo hecho para que
        // completarlo sea rellenar un campo, no volver a teclear la Cita.
        const ruta = !escribir
          ? null
          : await escribirCita(rutas.revision, nombreFichero, candidata);
        informe.enRevision.push({ texto, ruta, motivos });
        if (canonico !== '') {
          yaEnCorpus.set(canonico, { slug: candidata.slug, donde: 'el propio lote', forma: nueva });
        }
        continue;
      }

      const ruta = !escribir
        ? ''
        : await escribirCita(rutas.citas, nombreFichero, aRegistroDeCita(validada.data));
      slugsOcupados.add(candidata.slug);
      aPublicar.push({ indice, texto, slug: candidata.slug, temas: validada.data.temas });
      if (!opciones.seco) {
        // Solo lo que de verdad se publica cuenta para la grafía por omisión.
        publicadasParaObra.push({ autor: slugAutor, procedencia: validada.data.procedencia });
        if (plan !== undefined && escribir) {
          const ficha = await aplicarFichaDeObra(rutas, plan);
          if (!ficha.ok) {
            informe.fichasSinAsegurar = [
              ...(informe.fichasSinAsegurar ?? []),
              { slug: candidata.slug, motivos: ficha.motivos },
            ];
          }
        }
      }
      // Lo aceptado entra en el índice: así un lote que repite la misma Cita dos veces se
      // detecta igual que si la segunda llegara mañana en otro lote.
      yaEnCorpus.set(canonico, { slug: candidata.slug, donde: 'el propio lote', forma: nueva });
      // Y la casi igual, igual: la siguiente entrada de su Obra se compara también con esta.
      if (obraDeComparacion !== undefined) {
        publicadasPorObra.set(obraDeComparacion, [
          ...(publicadasPorObra.get(obraDeComparacion) ?? []),
          { slug: candidata.slug, donde: 'el propio lote', forma: nueva },
        ]);
      }
      informe.casiIguales.push(...casiDeLaEntrada);
      informe.publicadas.push({
        slug: candidata.slug,
        ruta,
        texto,
        grado: gradoDeProcedencia(validada.data.procedencia) === 'completa' ? 'completa' : 'parcial',
      });
    }

    return { informe, aPublicar };
  }
}

/**
 * El registro que se escribe al fichero.
 *
 * No se escribe la salida de `safeParse` tal cual: al validar, Zod rellena los campos con
 * valor por defecto, de modo que toda Cita saldría con `aptaParaPortada: false` y
 * `temas: []`. Eso contradice la convención —un campo sin valor se omite— y además
 * invita a leer el `false` como una decisión tomada cuando es la ausencia de decisión.
 */
function aRegistroDeCita(datos: CitaAdmisible): Record<string, unknown> {
  return {
    texto: datos.texto,
    autor: datos.autor,
    ...(datos.temas.length > 0 ? { temas: datos.temas } : {}),
    slug: datos.slug,
    procedencia: datos.procedencia,
    estadoDerechos: datos.estadoDerechos,
    ...(datos.fuente !== undefined ? { fuente: datos.fuente } : {}),
    ...(datos.aptaParaPortada ? { aptaParaPortada: true } : {}),
  };
}

/**
 * Si el alta dejó alguna Cita sin Tema publicado —sin escribir, o escrita y suelta—: con eso, la
 * orden y la siembra salen con 1 (Historia 26.8).
 */
export function sinTemaPublicado(informe: InformeDeAlta): boolean {
  return informe.rechazadasPorTema.length > 0 || (informe.publicadasSinTema ?? []).length > 0;
}

/** Informe legible en terminal. Sin colores: se lee igual en un registro de CI. */
export function formatearInforme(informe: InformeDeAlta): string {
  const lineas: string[] = [];

  lineas.push(`Publicadas: ${informe.publicadas.length}`);
  for (const c of informe.publicadas) {
    lineas.push(`  ✓ ${c.slug}  (procedencia ${c.grado})`);
  }

  lineas.push('', `En revisión: ${informe.enRevision.length}`);
  for (const c of informe.enRevision) {
    lineas.push(`  · «${recortar(c.texto)}»`);
    for (const motivo of c.motivos) lineas.push(`      ${motivo}`);
  }

  if (informe.rechazadasPorTema.length > 0) {
    lineas.push('', `Sin Tema publicado, no escritas: ${informe.rechazadasPorTema.length}`);
    for (const c of informe.rechazadasPorTema) {
      lineas.push(`  ✕ «${recortar(c.texto)}»`);
      for (const motivo of c.motivos) lineas.push(`      ${motivo}`);
    }
    lineas.push('  No se han escrito ni en corpus/citas/ ni en corpus/_revision/: corrija sus Temas en el lote.');
  }

  for (const suelta of informe.publicadasSinTema ?? []) {
    lineas.push(
      '',
      `${suelta.slug}: publicada, pero se quedó sin ningún Tema publicado. Dele un Tema con ` +
        'página o retírela antes de construir.',
      ...suelta.motivos.map((m) => `  ${m}`),
    );
  }

  for (const pendiente of informe.fichasSinAsegurar ?? []) {
    lineas.push(
      '',
      `${pendiente.slug}: publicada, pero su Ficha de Obra no se escribió. Corra ` +
        '«npm run obra -- sembrar» antes de construir.',
      ...pendiente.motivos.map((m) => `  ${m}`),
    );
  }

  if (informe.posiblesDuplicados.length > 0) {
    lineas.push('', `Posibles duplicados, no escritos: ${informe.posiblesDuplicados.length}`);
    for (const d of informe.posiblesDuplicados) {
      lineas.push(`  · «${recortar(d.texto)}»`);
      lineas.push(`      Coincide con ${d.coincideCon} (${d.donde}; ${d.clase}).`);
    }
    lineas.push(
      '  Nada se ha descartado. Para incorporarlos igualmente, repita con --con-duplicados.',
    );
  }

  if (informe.casiIguales.length > 0) {
    lineas.push('', `Casi iguales a una publicada de su Obra, escritas igual: ${informe.casiIguales.length}`);
    for (const c of informe.casiIguales) {
      const palabra = c.palabra !== undefined ? `; ${c.palabra.a}/${c.palabra.b}` : '';
      lineas.push(`  ⚠ «${recortar(c.texto)}»`);
      lineas.push(`      Casi igual a ${c.coincideCon} (${c.donde}; casi iguales, ${cifraDeParecido(c.parecido)}${palabra}).`);
    }
    lineas.push('  Es aviso: retirar una, conservar las dos o restituir el literal lo decide una persona.');
  }

  for (const salto of informe.saltosDescartados ?? []) {
    lineas.push('', `«${recortar(salto.texto)}»: ${parteDeSaltosDescartados(salto.descartados)}`);
  }

  if (informe.autoresDesconocidos.length > 0) {
    lineas.push('', 'Autores que no existen en el corpus:');
    for (const a of informe.autoresDesconocidos) lineas.push(`  · ${a}`);
  }

  return lineas.join('\n');
}

type YaEnCorpus = Map<string, { slug: string; donde: PosibleDuplicado['donde']; forma: FormaParaComparar }>;

/**
 * La repetida o la contenida de una entrada frente a lo que ya hay —todo lo publicado, todo lo de
 * revisión y el propio lote—, con `parecidoEntre` (Historia 29.4; la contención es de la 15.2 y su
 * porqué vive en `tools/lib/parecido.ts`). Primero la misma forma canónica; si no la hay, la
 * primera que la contiene o que está dentro de ella, las publicadas antes que lo demás.
 */
function repetidaOContenida(
  nueva: FormaParaComparar,
  yaEnCorpus: YaEnCorpus,
): { slug: string; donde: PosibleDuplicado['donde']; clase: PosibleDuplicado['clase'] } | undefined {
  if (nueva.canonica === '') return undefined;
  const igual = yaEnCorpus.get(nueva.canonica);
  if (igual !== undefined && parecidoEntre(nueva, igual.forma, 'contenida')?.clase === 'repetidas') {
    return { slug: igual.slug, donde: igual.donde, clase: 'repetidas' };
  }
  // Como en la repetida, si la contienen (o contiene) a la vez una publicada y otra cosa, gana la
  // publicada: lo que el editor necesita saber es que ya está publicada.
  const valores = [...yaEnCorpus.values()];
  for (const quien of [...valores.filter((v) => v.donde === 'publicadas'), ...valores.filter((v) => v.donde !== 'publicadas')]) {
    if (parecidoEntre(nueva, quien.forma, 'contenida')?.clase === 'contenida') {
      return { slug: quien.slug, donde: quien.donde, clase: 'contenida' };
    }
  }
  return undefined;
}

function recortar(texto: string, maximo = 60): string {
  const limpio = texto.trim();
  return limpio.length <= maximo ? limpio : `${limpio.slice(0, maximo - 1)}…`;
}

/** Índice de textos ya presentes en forma canónica. Lo consume la Historia 1.6. */
export async function textosCanonicosDelCorpus(rutas: Rutas): Promise<Map<string, string>> {
  const citas = await leerCitas(rutas.citas);
  return new Map(citas.map((c) => [normalizar(c.texto), c.slug]));
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
  const argumentos = process.argv.slice(2);
  const fichero = argumentos.find((a) => !a.startsWith('--'));
  const seco = argumentos.includes('--seco');
  const conDuplicados = argumentos.includes('--con-duplicados');
  const indiceCorpus = argumentos.indexOf('--corpus');
  const raizCorpus = indiceCorpus === -1 ? 'corpus' : argumentos[indiceCorpus + 1];

  if (!fichero) {
    process.stderr.write('Uso: npx tsx tools/alta.ts <lote.yaml> [--corpus corpus] [--seco]\n');
    process.exit(2);
  }

  const lote = parsearYaml(await readFile(fichero, 'utf8')) as EntradaDeLote[];
  if (!Array.isArray(lote)) {
    process.stderr.write('El lote debe ser una lista de Citas.\n');
    process.exit(2);
  }

  const informe = await darDeAltaLote(lote, rutasDelCorpus(raizCorpus), { seco, conDuplicados });
  process.stdout.write(`${formatearInforme(informe)}\n`);
  if (seco) process.stdout.write('\n(Ejecución en seco: no se ha escrito nada.)\n');
  // Historia 26.8 — una entrada sin Tema publicado no se escribe, y la orden lo dice con 1.
  if (sinTemaPublicado(informe)) process.exit(1);
}

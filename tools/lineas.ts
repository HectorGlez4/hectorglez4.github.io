/**
 * La forma de las líneas del Corpus y las cifras de la Tarjeta del verso — Historia 29.1.
 *
 *   npx tsx tools/lineas.ts formas    # reparto de corpus/fuentes/ por Fuente y forma
 *   npx tsx tools/lineas.ts tarjeta   # Citas publicadas que ganarían saltos, y su Tarjeta
 *
 * **Solo lectura**: no escribe nada en ninguna parte. Es lo que Héctor corre para decidir la
 * Tarjeta Social del verso, con las mismas funciones que escribirán los saltos (la forma, el
 * documento de los saltos y el escritor de `tools/lib/lineas.ts`). Códigos: 2 si la invocación
 * no vale; 1 si el Corpus no se deja leer.
 */

import { leerCitas, leerDocumentosDeclarados, rutasDelCorpus } from './lib/corpus.ts';
import { documentosDeCita } from './lib/cotejo.ts';
import {
  documentoParaLosSaltos,
  esFormaDeLineas,
  esFormaDeVerso,
  FORMAS_DE_LINEAS,
  formaDeLasLineas,
  textoConSaltos,
  type FormaDeLineas,
} from './lib/lineas.ts';
import { altoDeTarjeta, lineasDeTarjetaEnVerso } from './lib/tarjetaDelVerso.ts';
import { ALTO } from '../src/lib/tarjeta.ts';
import { tramoDe } from '../src/lib/tramos.ts';
import { opcion, posicionales } from './lib/cli.ts';

const USO = 'Uso: npx tsx tools/lineas.ts formas|tarjeta [--detalle] [--corpus <dir>]';

const argumentos = process.argv.slice(2);
const sueltos = posicionales(argumentos, ['--corpus']);
const desconocidas = argumentos.filter((a, i) => a.startsWith('--') && a !== '--corpus' && a !== '--detalle' && argumentos[i - 1] !== '--corpus');
if (sueltos.length !== 1 || !['formas', 'tarjeta'].includes(sueltos[0]) || desconocidas.length > 0) {
  console.error(USO);
  process.exit(2);
}
if (argumentos.includes('--corpus') && opcion(argumentos, '--corpus') === undefined) {
  console.error(USO);
  process.exit(2);
}

const rutas = rutasDelCorpus(opcion(argumentos, '--corpus') ?? 'corpus');

let documentos: Awaited<ReturnType<typeof leerDocumentosDeclarados>>;
let citas: Awaited<ReturnType<typeof leerCitas>>;
try {
  documentos = await leerDocumentosDeclarados(rutas);
  citas = sueltos[0] === 'tarjeta' ? await leerCitas(rutas.citas) : [];
} catch (fallo) {
  console.error(`El Corpus no se deja leer: ${(fallo as Error).message}`);
  process.exit(1);
}

if (sueltos[0] === 'formas') formas();
else tarjeta();

function formas(): void {
  const porFuente = new Map<string, Map<FormaDeLineas, { declarada: number; calculada: number }>>();
  const deVerso: string[] = [];
  for (const [nombre, documento] of documentos) {
    const forma = formaDeLasLineas(documento);
    const declarada = documento.lineas !== undefined && esFormaDeLineas(documento.lineas);
    const tabla = porFuente.get(documento.fuente) ?? new Map();
    const celda = tabla.get(forma) ?? { declarada: 0, calculada: 0 };
    if (declarada) celda.declarada += 1;
    else celda.calculada += 1;
    tabla.set(forma, celda);
    porFuente.set(documento.fuente, tabla);
    if (esFormaDeVerso(forma)) deVerso.push(`${forma}\t${nombre}`);
  }

  console.log(`Forma de las líneas de ${documentos.size} documentos de corpus/fuentes/:`);
  for (const [fuente, tabla] of [...porFuente].sort(([a], [b]) => a.localeCompare(b))) {
    const total = [...tabla.values()].reduce((n, c) => n + c.declarada + c.calculada, 0);
    console.log(`\n${fuente} (${total}):`);
    for (const forma of FORMAS_DE_LINEAS) {
      const celda = tabla.get(forma);
      if (celda === undefined) continue;
      console.log(
        `  ${forma.padEnd(18)} ${String(celda.declarada + celda.calculada).padStart(5)}` +
          `   (declarada ${celda.declarada}, calculada ${celda.calculada})`,
      );
    }
  }
  if (process.argv.includes('--detalle')) {
    console.log('\nDocumentos de verso:');
    for (const linea of deVerso.sort()) console.log(`  ${linea}`);
  }
}

function tarjeta(): void {
  interface Fila {
    slug: string;
    forma: FormaDeLineas;
    caracteres: number;
    versos: number;
    lineas: number;
    altoSin?: number;
    altoCon?: number;
  }
  const filas: Fila[] = [];
  for (const cita of citas) {
    if (cita.fuente === undefined || typeof cita.texto !== 'string') continue;
    const candidatos = documentosDeCita(cita.fuente, cita.procedencia?.obra, documentos).map((nombre) => {
      const d = documentos.get(nombre)!;
      return { nombre, cuerpo: d.cuerpo, ...(d.lineas !== undefined ? { lineas: d.lineas } : {}) };
    });
    const documento = documentoParaLosSaltos(cita.texto, candidatos);
    if (documento === undefined) continue;
    const { texto } = textoConSaltos(cita.texto, documento);
    if (!texto.includes('\n')) continue;
    const conProcedencia =
      cita.procedencia?.obra !== undefined || cita.procedencia?.año !== undefined;
    const tramo = tramoDe(texto);
    filas.push({
      slug: cita.slug,
      forma: documento.forma,
      caracteres: [...texto].length,
      versos: texto.split('\n').length,
      lineas: tramo.admiteImagen ? lineasDeTarjetaEnVerso(texto, tramo.pixelesEnTarjeta).length : 0,
      ...(tramo.admiteImagen
        ? {
            altoSin: altoDeTarjeta(cita.texto.replace(/\s+/gu, ' '), conProcedencia),
            altoCon: altoDeTarjeta(texto, conProcedencia),
          }
        : {}),
    });
  }
  filas.sort((a, b) => (b.altoCon ?? 0) - (a.altoCon ?? 0) || a.slug.localeCompare(b.slug));

  console.log(`Citas publicadas que ganarían saltos de verso: ${filas.length}`);
  for (const forma of FORMAS_DE_LINEAS) {
    const n = filas.filter((f) => f.forma === forma).length;
    if (n > 0) console.log(`  de documento ${forma}: ${n}`);
  }
  const conImagen = filas.filter((f) => f.altoCon !== undefined);
  console.log(`Admiten Imagen (Tarjeta con texto): ${conImagen.length}`);
  console.log('\nslug · caracteres · versos · líneas en la Tarjeta · alto sin saltos · alto con saltos');
  for (const f of filas) {
    console.log(
      `  ${f.slug} · ${f.caracteres} · ${f.versos} · ${f.altoCon === undefined ? '—' : f.lineas} · ` +
        `${f.altoSin ?? 'sin Imagen'} · ${f.altoCon ?? 'sin Imagen'}`,
    );
  }
  const pasan = conImagen.filter((f) => (f.altoCon as number) > ALTO);
  console.log(`\nPasan de ${ALTO} px con saltos: ${pasan.length}`);
  for (const f of pasan) console.log(`  ${f.slug} · ${f.altoCon} px`);
}

/**
 * Qué asuntos podrían ser Tema, y cuáles ya lo son con otro nombre.
 *
 *   npm run asuntos              · sobre las Citas publicadas
 *   npm run asuntos -- --cantera · sobre las candidatas sin leer
 *
 * Un Tema exige quince Citas (`MIN_CITAS_POR_TEMA`), y hasta la 127.ª la pregunta «¿qué asunto las
 * tiene?» se respondía con un `grep` distinto cada sesión. Cada uno traía su defecto: uno casaba
 * «c*errar*án» como Cita del error, otro inflaba un asunto de 8 a 66 coincidencias. El módulo
 * probado vive en `tools/lib/asuntos.ts`; aquí solo se lee el corpus y se imprime.
 *
 * ## La columna que importa no es la primera
 *
 * **Coincidencias altas no significan Tema.** Lo miden cinco lecturas completas: la conversión entre
 * coincidir y *tratar* del asunto va del 4 % al 57 %, y hacen falta del orden de **30-35
 * coincidencias para dar 15 Citas reales**. Lo que se cae lo hace de tres maneras, y solo la primera
 * se ve desde aquí:
 *
 *   · **el Tema que ya existe con otro nombre** — lo enseña la columna «Tema dominante»: si un Tema
 *     publicado ya posee la mitad de las Citas del asunto, el asunto es ese Tema;
 *   · **la palabra al paso** — la Cita la usa pero habla de otra cosa;
 *   · **la forma** — empieza remitiendo, cita a otro, o trae nombre propio y anécdota.
 *
 * Las dos últimas solo se ven leyendo. Esta orden dice **dónde** mirar, nunca **qué** concluir.
 */
import { leerCitas, leerTemas, rutasDelCorpus } from './lib/corpus.ts';
import { coincideConElAsunto } from './lib/asuntos.ts';
import { raizDeCorpusDe } from './lib/cli.ts';

/**
 * Las familias de palabras, apretadas a mano y con la razón escrita cuando costó.
 *
 * Una raíz se escribe **corta y sin flexión** —`equivoc`, no `equivocarse`— porque el módulo casa
 * por principio de palabra. Y no se meten palabras que en español son otra cosa además del asunto:
 * `solo` infló «la soledad» de 8 a 66 por el adverbio, y `natural` infló «la naturaleza» de 24 a 38
 * por el adjetivo. Ese es el error que hay que no repetir aquí.
 */
const FAMILIAS: Record<string, string[]> = {
  'el amor': ['amor', 'amar', 'ama', 'aman', 'amado', 'cariño', 'ternura', 'enamorad', 'desamor'],
  'el error': ['error', 'equivoc', 'yerro', 'errar', 'errores'],
  'la memoria': ['memoria', 'recuerd', 'olvid'],
  'la juventud': ['juventud', 'joven', 'jóvenes', 'mocedad', 'niñez', 'infancia'],
  'la vejez': ['vejez', 'viejo', 'anciano', 'canas'],
  'la salud': ['salud', 'enferm'],
  'la belleza': ['belleza', 'bello', 'hermosur'],
  'la envidia': ['envidi'],
  'la esperanza': ['esperanza'],
  'la costumbre': ['costumbre', 'hábito', 'acostumbr'],
  'la humildad': ['humild', 'soberbi', 'vanidad', 'orgullo', 'modesti'],
  'la fortuna': ['fortuna', 'azar', 'suerte', 'destino'],
  'la ira': ['ira', 'cólera', 'enojo', 'rencor', 'venganza'],
  // `soledad` sin `solo`, y `naturaleza` sin `natural`: ver la nota de arriba.
  'la soledad': ['soledad', 'aislad'],
  'la naturaleza': ['naturaleza'],
};

const argumentos = process.argv.slice(2);
const rutas = rutasDelCorpus(raizDeCorpusDe(argumentos));
const enLaCantera = argumentos.includes('--cantera');

const citas = await leerCitas(enLaCantera ? rutas.revision : rutas.citas);
const temas = await leerTemas(rutas);
const nombreDeTema = new Map(temas.map((t) => [t.slug, t.nombre]));

interface Fila {
  asunto: string;
  coincidencias: number;
  autores: number;
  dominante: string;
  suyas: number;
}

const filas: Fila[] = [];
for (const [asunto, familia] of Object.entries(FAMILIAS)) {
  const tocadas = citas.filter((c) => coincideConElAsunto(c.texto, familia));
  if (tocadas.length === 0) continue;

  const reparto = new Map<string, number>();
  for (const cita of tocadas) {
    for (const tema of cita.temas ?? []) {
      reparto.set(tema, (reparto.get(tema) ?? 0) + 1);
    }
  }
  const [dominante, suyas] = [...reparto.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['—', 0];

  filas.push({
    asunto,
    coincidencias: tocadas.length,
    autores: new Set(tocadas.map((c) => c.autor)).size,
    dominante: nombreDeTema.get(dominante) ?? dominante,
    suyas,
  });
}

filas.sort((a, b) => b.coincidencias - a.coincidencias);

console.log(
  `${citas.length} ${enLaCantera ? 'candidatas sin leer' : 'Citas publicadas'} · ${filas.length} asuntos con alguna\n`,
);
console.log('coincid  Autores   asunto  ·  Tema que ya posee más de ellas');
for (const f of filas) {
  const posee = f.suyas > 0 ? `${f.dominante} (${f.suyas})` : 'ninguno';
  console.log(
    `${String(f.coincidencias).padStart(7)}  ${String(f.autores).padStart(7)}   ${f.asunto}  ·  ${posee}`,
  );
}
console.log(
  '\nCoincidir no es tratar: la conversión medida va del 4 % al 57 %, así que hacen falta del\n' +
    'orden de 30-35 coincidencias para dar 15 Citas reales. Esto dice dónde mirar, no qué concluir.',
);

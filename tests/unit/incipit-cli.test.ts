import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { parse as parsearYaml } from 'yaml';
import { RAIZ } from './ayuda/construir.js';
import { escribirCita, leerFichasDeObra, rutasDelCorpus, type Rutas } from '../../tools/lib/corpus.ts';
import { componerBiografia, componerDocumento } from '../../tools/lib/documento.ts';
import {
  ajustarTitulosDeObra,
  declararIncipit,
  retirarFichaDeObra,
  reunirFichas,
  sembrarFichasDeObra,
  separarFichas,
  titularFicha,
} from '../../tools/lib/obras.ts';

const ejecutar = promisify(execFile);

/**
 * Historia 32.3 — `npm run obra -- incipit`, el único escritor del campo `incipit` (AD-25,
 * AD-30): escribe y el YAML reabre; se niega con 1, sin escribir, por lo que la invocación dice, y
 * con 2 por su forma; y las órdenes que reescriben o mueven una ficha lo conservan, salvo `reunir`,
 * que no hereda el de la absorbida y lo dice. El tope se pasa por parámetro o queda el del árbol,
 * que la prueba no fija.
 */

const temporales: string[] = [];
afterEach(async () => {
  await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

const FICHA = 'seneca--sobre-la-brevedad-de-la-vida';
const DOC = 'wikisource-es--sobre-la-brevedad-de-la-vida';
const URL = 'https://es.wikisource.org/wiki/Sobre_la_brevedad_de_la_vida';
const CUERPO = [
  'La mayor parte de los mortales se queja de la malignidad de la naturaleza.',
  'No es que tengamos poco tiempo, es que perdemos mucho.',
  'La vida es larga si se sabe usar.',
].join('\n');

function documento(obra: string, cuerpo: string, lineas = 'prosa-por-lineas', año = 49) {
  return componerDocumento(
    { fuente: 'wikisource-es', obra, año, url: URL, recuperado: '2026-11-08', lineas },
    obra,
    cuerpo,
  );
}

function cita(slug: string, texto: string, obra = 'Sobre la brevedad de la vida') {
  return {
    texto,
    autor: 'seneca',
    slug,
    procedencia: { obra, año: 49 },
    estadoDerechos: 'dominio-público',
    fuente: { id: 'wikisource-es', nombre: 'Wikisource en español', licencia: 'CC BY-SA 4.0', url: URL },
  };
}

async function preparado(): Promise<Rutas> {
  const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-incipit-cli-'));
  temporales.push(raiz);
  const rutas = rutasDelCorpus(join(raiz, 'corpus'));
  for (const dir of [rutas.citas, rutas.autores, rutas.temas, rutas.revision, rutas.obras, rutas.fuentes, rutas.biografias]) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(
    join(rutas.autores, 'seneca.yml'),
    'nombre: Séneca\nañoFallecimiento: 65\nsemblanza: Filósofo.\nordenAlfabetico: Séneca\n',
    'utf8',
  );
  await escribirCita(rutas.citas, 'seneca--no-es-que', cita('seneca-no-es-que', 'No es que tengamos poco tiempo'));
  await escribirCita(rutas.citas, 'seneca--de-la-ira', cita('seneca-de-la-ira', 'La ira es breve locura', 'De la ira'));
  await writeFile(join(rutas.fuentes, `${DOC}.txt`), documento('Sobre la brevedad de la vida', CUERPO), 'utf8');
  await writeFile(
    join(rutas.fuentes, 'wikisource-es--de-la-ira.txt'),
    documento('De la ira', 'La ira es breve locura.\nOtra línea de la ira.\nY una tercera.\nY una cuarta.'),
    'utf8',
  );
  const sembrado = await sembrarFichasDeObra(rutas);
  expect(sembrado.fallos).toEqual([]);
  return rutas;
}

const fichaYaml = (rutas: Rutas, nombre = FICHA) => readFile(join(rutas.obras, `${nombre}.yml`), 'utf8');
const docDe = (rutas: Rutas, nombre = DOC) => join(rutas.fuentes, `${nombre}.txt`);

async function correr(rutas: Rutas, argumentos: string[]) {
  try {
    const { stdout, stderr } = await ejecutar(
      'npx',
      ['tsx', join(RAIZ, 'tools/obra.ts'), ...argumentos, '--corpus', rutas.raiz],
      { cwd: RAIZ },
    );
    return { codigo: 0, salida: stdout, error: stderr };
  } catch (fallo) {
    const f = fallo as { code?: number; stdout?: string; stderr?: string };
    return { codigo: f.code ?? 1, salida: f.stdout ?? '', error: f.stderr ?? '' };
  }
}

describe('Historia 32.3 — npm run obra -- incipit', () => {
  it('escribe el incipit colapsado tras lo demás, y la ficha reabre con el esquema del build', async () => {
    const rutas = await preparado();
    const hecho = await correr(rutas, ['incipit', FICHA, docDe(rutas), '  La mayor   parte ']);
    expect(hecho.codigo, hecho.error).toBe(0);
    expect(await fichaYaml(rutas)).toMatch(new RegExp(`\\nincipit:\\n {2}documento: "${DOC}"\\n {2}desde: "La mayor parte"\\n$`, 'u'));
    const [leida] = (await leerFichasDeObra(rutas)).filter((f) => f.nombre === FICHA);
    expect(leida.incipit).toEqual({ documento: DOC, desde: 'La mayor parte' });
    // El parte nombra la ficha, el documento y la forma; con el tope del árbol sin valor, lo dice.
    expect(hecho.salida).toContain(FICHA);
    expect(hecho.salida).toContain(DOC);
    expect(hecho.salida).toContain('Forma de las líneas: prosa-por-lineas');
  });

  it('con el tope en `undefined`, el parte dice que la página no lo enseña; con valor, enseña el incipit', async () => {
    const rutas = await preparado();
    const sin = await declararIncipit(rutas, FICHA, docDe(rutas), 'La mayor parte', { tope: undefined });
    expect(sin.ok).toBe(true);
    if (sin.ok) expect(sin.mensaje).toContain('MAX_CARACTERES_DEL_INCIPIT no tiene valor: la página no lo enseña');
    const con = await declararIncipit(rutas, FICHA, docDe(rutas), 'No es que', { tope: 200 });
    expect(con.ok).toBe(true);
    if (con.ok) {
      expect(con.mensaje).toContain('No es que tengamos poco tiempo, es que perdemos mucho.\n    La vida es larga si se sabe usar.');
      expect(con.mensaje).toContain(`Sustituye al de ${DOC}, desde «La mayor parte»`);
    }
    const corta = await declararIncipit(rutas, FICHA, docDe(rutas), 'La mayor parte', { tope: 10 });
    expect(corta.ok).toBe(true);
    if (corta.ok) expect(corta.mensaje).toContain('pasa de MAX_CARACTERES_DEL_INCIPIT');
  });

  it('un «desde» que aparece más de una vez se declara, y el parte avisa de que se ancla en la primera', async () => {
    const rutas = await preparado();
    const hecho = await declararIncipit(rutas, FICHA, docDe(rutas), 'es que', { tope: undefined });
    expect(hecho.ok).toBe(true);
    if (hecho.ok) expect(hecho.mensaje).toContain('aparece más de una vez');
    const unico = await declararIncipit(rutas, FICHA, docDe(rutas), 'La mayor parte', { tope: undefined });
    if (unico.ok) expect(unico.mensaje).not.toContain('aparece más de una vez');
  });

  it('el «desde» sobrevive a la ida y vuelta del YAML con comillas, dos puntos y almohadilla', async () => {
    const rutas = await preparado();
    const raro = 'Dijo: «el "sabio" # no duda»';
    await writeFile(docDe(rutas), documento('Sobre la brevedad de la vida', `${raro}. Y siguió.\n${CUERPO}`), 'utf8');
    expect((await declararIncipit(rutas, FICHA, docDe(rutas), raro)).ok).toBe(true);
    const yaml = parsearYaml(await fichaYaml(rutas)) as { incipit: { desde: string } };
    expect(yaml.incipit.desde).toBe(raro);
  });

  it.each([
    ['la ficha no existe', async (r: Rutas) => ['seneca--no-existe', docDe(r), 'La mayor parte'], /No hay ninguna Ficha de Obra/u],
    ['el documento no está en corpus/fuentes/', async (r: Rutas) => [FICHA, join(r.raiz, `${DOC}.txt`), 'La mayor parte'], /no es un documento \.txt/u],
    ['el documento no es .txt', async (r: Rutas) => [FICHA, join(r.fuentes, `${DOC}.yml`), 'La mayor parte'], /no es un documento \.txt/u],
    ['el documento falta', async (r: Rutas) => [FICHA, docDe(r, `${DOC}--ii`), 'La mayor parte'], /No existe el documento/u],
    [
      'el documento no se deja analizar',
      async (r: Rutas) => {
        await writeFile(docDe(r, `${DOC}--roto`), 'sin cabecera', 'utf8');
        return [FICHA, docDe(r, `${DOC}--roto`), 'La mayor parte'];
      },
      /no se deja analizar/u,
    ],
    [
      'el documento es una biografía',
      async (r: Rutas) => {
        await writeFile(
          docDe(r, `${DOC}--bio`),
          componerBiografia(
            {
              fuente: 'wikipedia-es',
              titulo: 'Séneca',
              revision: 123,
              fechaDeRevision: '2024-05-01',
              licencia: 'CC BY-SA 4.0',
              url: 'https://es.wikipedia.org/w/index.php?title=S%C3%A9neca&oldid=123',
              recuperado: '2026-10-10',
            },
            'Séneca',
            'La mayor parte de su vida.\nOtra línea.\nY otra.\nY otra más.',
          ),
          'utf8',
        );
        return [FICHA, docDe(r, `${DOC}--bio`), 'La mayor parte'];
      },
      /es una biografía/u,
    ],
    ['el documento es de otra Obra', async (r: Rutas) => [FICHA, docDe(r, 'wikisource-es--de-la-ira'), 'La ira es'], /no es un documento de «seneca--sobre-la-brevedad-de-la-vida»/u],
    [
      'la forma es indeterminada',
      async (r: Rutas) => {
        await writeFile(docDe(r), documento('Sobre la brevedad de la vida', CUERPO, 'indeterminada'), 'utf8');
        return [FICHA, docDe(r), 'La mayor parte'];
      },
      /indeterminada/u,
    ],
    ['el «desde» no se localiza', async (r: Rutas) => [FICHA, docDe(r), 'Érase una vez'], /no aparece literal/u],
    [
      'el documento de una subcarpeta tiene el nombre de otro del primer nivel',
      async (r: Rutas) => {
        await mkdir(join(r.fuentes, 'sub'), { recursive: true });
        await writeFile(join(r.fuentes, 'sub', `${DOC}.txt`), documento('Sobre la brevedad de la vida', CUERPO), 'utf8');
        return [FICHA, join(r.fuentes, 'sub', `${DOC}.txt`), 'La mayor parte'];
      },
      /no es el documento que el nombre/u,
    ],
    [
      'el url de la cabecera no es http(s)',
      async (r: Rutas) => {
        await writeFile(
          docDe(r),
          documento('Sobre la brevedad de la vida', CUERPO).replace(`url: ${URL}`, 'url: javascript:alert(1)'),
          'utf8',
        );
        return [FICHA, docDe(r), 'La mayor parte'];
      },
      /no es una dirección http\(s\)/u,
    ],
    [
      'la Fuente de la cabecera no es de FUENTES',
      async (r: Rutas) => {
        await writeFile(
          docDe(r),
          documento('Sobre la brevedad de la vida', CUERPO).replace('fuente: wikisource-es', 'fuente: wikisource-xx'),
          'utf8',
        );
        return [FICHA, docDe(r), 'La mayor parte'];
      },
      /no es ninguna de FUENTES/u,
    ],
    [
      'la ficha ya declara ese incipit, escrito a mano sin colapsar',
      async (r: Rutas) => {
        const ruta = join(r.obras, `${FICHA}.yml`);
        await writeFile(ruta, `${await readFile(ruta, 'utf8')}incipit:\n  documento: "${DOC}"\n  desde: "La  mayor   parte"\n`, 'utf8');
        return [FICHA, docDe(r), 'La mayor parte'];
      },
      /ya declara ese incipit/u,
    ],
    [
      'la ficha ya declara ese mismo incipit',
      async (r: Rutas) => {
        expect((await declararIncipit(r, FICHA, docDe(r), 'La mayor parte')).ok).toBe(true);
        return [FICHA, docDe(r), 'La  mayor parte'];
      },
      /ya declara ese incipit/u,
    ],
  ])('se niega con 1, sin escribir, cuando %s', async (_caso, preparar, motivo) => {
    const rutas = await preparado();
    const argumentos = await preparar(rutas);
    const antes = await fichaYaml(rutas);
    const hecho = await correr(rutas, ['incipit', ...argumentos]);
    expect(hecho.codigo, hecho.salida).toBe(1);
    expect(hecho.error).toMatch(motivo);
    expect(hecho.error).toContain('No se ha escrito nada.');
    expect(await fichaYaml(rutas)).toBe(antes);
  });

  it.each([
    ['con dos argumentos', ['incipit', FICHA, 'corpus/fuentes/x.txt']],
    ['con cuatro', ['incipit', FICHA, 'corpus/fuentes/x.txt', 'Desde', 'sobra']],
    ['con el «desde» en blanco', ['incipit', FICHA, 'corpus/fuentes/x.txt', '   ']],
    ['con una bandera que no existe', ['incipit', FICHA, 'corpus/fuentes/x.txt', 'Desde', '--seco']],
    ['con un carácter de control en el «desde»', ['incipit', FICHA, 'corpus/fuentes/x.txt', 'Des\u0007de']],
  ])('sale con 2 %s, sin escribir', async (_caso, argumentos) => {
    const rutas = await preparado();
    const antes = await fichaYaml(rutas);
    const hecho = await correr(rutas, argumentos);
    expect(hecho.codigo, hecho.error).toBe(2);
    expect(await fichaYaml(rutas)).toBe(antes);
  });

  it('titular, separar, el ajuste del título y retirar lo conservan; reunir conserva el de la destino y dice el de la absorbida', async () => {
    const rutas = await preparado();
    const BLOQUE = `incipit:\n  documento: "${DOC}"\n  desde: "La mayor parte"\n`;
    expect((await declararIncipit(rutas, FICHA, docDe(rutas), 'La mayor parte')).ok).toBe(true);

    expect((await titularFicha(rutas, FICHA, 'Sobre la brevedad de la vida')).ok).toBe(true);
    expect(await fichaYaml(rutas)).toContain(BLOQUE);

    const OTRA = 'seneca--de-la-ira';
    expect((await declararIncipit(rutas, OTRA, docDe(rutas, 'wikisource-es--de-la-ira'), 'La ira es')).ok).toBe(true);
    expect((await separarFichas(rutas, FICHA, OTRA)).ok).toBe(true);
    expect(await fichaYaml(rutas)).toContain(BLOQUE);
    expect(await fichaYaml(rutas, OTRA)).toContain('desde: "La ira es"');

    // El ajuste del título (documentar, restituir-grafia): un título que ya no declara ninguna Cita
    // pasa a la grafía por omisión, y la ficha conserva lo demás.
    const ruta = join(rutas.obras, `${FICHA}.yml`);
    await writeFile(ruta, (await readFile(ruta, 'utf8')).replace(/^titulo: .*$/mu, 'titulo: "Título viejo"'), 'utf8');
    const lineas = await ajustarTitulosDeObra(rutas, 'seneca', ['sobre la brevedad de la vida']);
    expect(lineas.join('\n')).toContain('Título viejo');
    expect(await fichaYaml(rutas)).not.toContain('Título viejo');
    expect(await fichaYaml(rutas)).toContain(BLOQUE);

    const reunida = await reunirFichas(rutas, FICHA, OTRA);
    expect(reunida.ok, reunida.ok ? '' : reunida.motivos.join('\n')).toBe(true);
    expect(await fichaYaml(rutas)).toContain(BLOQUE);
    expect(await fichaYaml(rutas)).not.toContain('La ira es');
    if (reunida.ok) {
      expect(reunida.mensaje).toContain(`El incipit de «${OTRA}» (desde «La ira es» en wikisource-es--de-la-ira) no pasa a la reunida`);
      expect(reunida.mensaje).toContain(`«${FICHA}» conserva el suyo`);
    }
    expect(await readFile(join(rutas.obrasRetiradas, `${OTRA}.yml`), 'utf8')).toContain('desde: "La ira es"');
  });

  it('reunir sobre una destino sin incipit da la orden para declararlo', async () => {
    const rutas = await preparado();
    const OTRA = 'seneca--de-la-ira';
    expect((await declararIncipit(rutas, OTRA, docDe(rutas, 'wikisource-es--de-la-ira'), 'La ira es')).ok).toBe(true);
    const reunida = await reunirFichas(rutas, FICHA, OTRA);
    expect(reunida.ok).toBe(true);
    if (reunida.ok) {
      expect(reunida.mensaje).toContain(
        `declárelo con «npm run obra -- incipit ${FICHA} corpus/fuentes/wikisource-es--de-la-ira.txt "<desde>"»`,
      );
    }
    expect(await fichaYaml(rutas)).not.toContain('incipit:');
  });

  it('retirar mueve la ficha con su incipit', async () => {
    const rutas = await preparado();
    // Sin Citas que la resuelvan: la de esta Obra sale antes a `_revision/`.
    expect((await declararIncipit(rutas, FICHA, docDe(rutas), 'La mayor parte')).ok).toBe(true);
    await rm(join(rutas.citas, 'seneca--no-es-que.md'));
    const hecho = await retirarFichaDeObra(rutas, FICHA, 'prueba');
    expect(hecho.ok, hecho.ok ? '' : hecho.motivos.join('\n')).toBe(true);
    expect(await readFile(join(rutas.obrasRetiradas, `${FICHA}.yml`), 'utf8')).toContain(`incipit:\n  documento: "${DOC}"`);
  });
});

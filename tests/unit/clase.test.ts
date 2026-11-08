/**
 * La clase de una Cita y los derechos de su dueño — Historia 35.1.
 *
 * `src/lib/clase.ts` es puro: la tabla de verdad de los derechos, su complemento (con y sin plazo,
 * por parámetro: las constantes del árbol quedan en `undefined` y ninguna prueba las fija), el
 * lanzamiento con plazo y sin año, la derivación de la clase, el esquema y los dos «únicos»: el
 * lector del campo `clase` y el literal de la atribuida.
 */
import { describe, expect, it } from 'vitest';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  CLASE_ATRIBUIDA,
  CLASE_DE_SIEMPRE,
  CLASES,
  claseDe,
  claseQueCorresponde,
  derechosVigentes,
  dueñoAutor,
  esAtribuida,
  esDeDominioPublico,
  type DueñoDeDerechos,
  type ReferenciaDeDerechos,
} from '../../src/lib/clase.ts';
import { autorAdmisible, citaAdmisible, MENSAJE_CLASE_SIEMPRE_ESCRITA } from '../../src/lib/admision.ts';

const RAIZ_DEL_REPO = join(import.meta.dirname, '..', '..');

const VIVO: DueñoDeDerechos = { tipo: 'autor', vivo: true };
const CERVANTES: DueñoDeDerechos = { tipo: 'autor', añoFallecimiento: 1616 };
const RECIENTE: DueñoDeDerechos = { tipo: 'autor', añoFallecimiento: 1980 };
const PERSONAJE: DueñoDeDerechos = { tipo: 'personaje' };
const DUEÑOS = { VIVO, CERVANTES, RECIENTE, PERSONAJE };

const SIN_PLAZO: ReferenciaDeDerechos = {};
const CON_PLAZO: ReferenciaDeDerechos = { plazo: 70, año: 2026 };

describe('35.1 — derechosVigentes y esDeDominioPublico', () => {
  it('sin plazo: el Autor tiene derechos si y solo si vive; el Personaje, siempre', () => {
    expect(derechosVigentes(VIVO, SIN_PLAZO)).toBe(true);
    expect(derechosVigentes(CERVANTES, SIN_PLAZO)).toBe(false);
    expect(derechosVigentes(RECIENTE, SIN_PLAZO)).toBe(false);
    expect(derechosVigentes(PERSONAJE, SIN_PLAZO)).toBe(true);
  });

  it('con plazo: también el fallecido cuyo plazo llega al año de referencia', () => {
    expect(derechosVigentes(VIVO, CON_PLAZO)).toBe(true);
    expect(derechosVigentes(CERVANTES, CON_PLAZO)).toBe(false);
    expect(derechosVigentes(RECIENTE, CON_PLAZO)).toBe(true);
    expect(derechosVigentes({ tipo: 'autor', añoFallecimiento: 1956 }, CON_PLAZO)).toBe(true);
    expect(derechosVigentes({ tipo: 'autor', añoFallecimiento: 1955 }, CON_PLAZO)).toBe(false);
    expect(derechosVigentes(PERSONAJE, CON_PLAZO)).toBe(true);
  });

  for (const [nombre, referencia] of [
    ['sin plazo', SIN_PLAZO],
    ['con plazo', CON_PLAZO],
    ['con plazo en el borde', { plazo: 410, año: 2026 }],
  ] as const) {
    it(`el dominio público es el complemento exacto, ${nombre}`, () => {
      for (const [quien, dueño] of Object.entries(DUEÑOS)) {
        expect(esDeDominioPublico(dueño, referencia), quien).toBe(!derechosVigentes(dueño, referencia));
      }
    });
  }

  it('con plazo y sin año de referencia lanza, nombrando las dos constantes', () => {
    expect(() => derechosVigentes(CERVANTES, { plazo: 70 })).toThrow(/PLAZO_DE_PROTECCION_AÑOS.*AÑO_DE_REFERENCIA/su);
    expect(() => esDeDominioPublico(CERVANTES, { plazo: 70 })).toThrow(/PLAZO_DE_PROTECCION_AÑOS.*AÑO_DE_REFERENCIA/su);
    // Para todo dueño: que lance no depende de que el Corpus tenga un Autor fallecido.
    for (const dueño of [{ tipo: 'autor' as const, vivo: true as const }, { tipo: 'personaje' as const }]) {
      expect(() => derechosVigentes(dueño, { plazo: 70 })).toThrow(/AÑO_DE_REFERENCIA/u);
      expect(() => esDeDominioPublico(dueño, { plazo: 70 })).toThrow(/AÑO_DE_REFERENCIA/u);
    }
  });

  it('con las constantes del árbol (sin plazo), un Autor fallecido es de dominio público', () => {
    expect(esDeDominioPublico(CERVANTES)).toBe(true);
    expect(derechosVigentes(VIVO)).toBe(true);
  });
});

describe('35.1 — la clase', () => {
  it('la atribuida lo dice; la de siempre calla', () => {
    expect(CLASES).toEqual([CLASE_DE_SIEMPRE, CLASE_ATRIBUIDA]);
    expect([CLASE_DE_SIEMPRE, CLASE_ATRIBUIDA]).toEqual(['siempre', 'atribuida']);
    expect(claseDe({})).toBe('siempre');
    expect(claseDe({ clase: CLASE_ATRIBUIDA })).toBe(CLASE_ATRIBUIDA);
    expect(esAtribuida({ clase: CLASE_ATRIBUIDA })).toBe(true);
    expect(esAtribuida({ clase: 'siempre' })).toBe(false);
    expect(esAtribuida({})).toBe(false);
  });

  it('se deriva del Personaje y de los derechos del Autor', () => {
    expect(claseQueCorresponde({}, { añoFallecimiento: 1616 })).toBe('siempre');
    expect(claseQueCorresponde({}, { vivo: true })).toBe(CLASE_ATRIBUIDA);
    expect(claseQueCorresponde({ personaje: 'sancho' }, { añoFallecimiento: 1616 })).toBe(CLASE_ATRIBUIDA);
    expect(claseQueCorresponde({}, { añoFallecimiento: 1980 }, CON_PLAZO)).toBe(CLASE_ATRIBUIDA);
    expect(dueñoAutor({ vivo: true, añoFallecimiento: 'x' })).toEqual({ tipo: 'autor', vivo: true });
  });
});

describe('35.1 — el esquema', () => {
  const base = {
    texto: 'La pluma es la lengua del alma.',
    autor: 'miguel-de-cervantes',
    slug: 'miguel-de-cervantes-la-pluma',
    procedencia: { obra: 'Don Quijote' },
  };
  const mensajes = (valor: unknown) =>
    (citaAdmisible.safeParse(valor).error?.issues ?? []).map((i) => `${i.path.join('.')}: ${i.message}`);

  it('la de siempre lleva estadoDerechos y no lleva clase ni Personaje', () => {
    expect(citaAdmisible.safeParse({ ...base, estadoDerechos: 'dominio-público' }).success).toBe(true);
    expect(mensajes(base).join('\n')).toMatch(/^estadoDerechos: .*falta estadoDerechos/mu);
    expect(mensajes({ ...base, estadoDerechos: 'dominio-público', clase: 'siempre' })).toContain(
      `clase: ${MENSAJE_CLASE_SIEMPRE_ESCRITA}`,
    );
    expect(mensajes({ ...base, estadoDerechos: 'dominio-público', personaje: 'sancho' }).join('\n')).toMatch(
      /^personaje: .*solo una Cita atribuida/mu,
    );
  });

  it('la atribuida no lleva estadoDerechos, y su Personaje tiene forma de slug', () => {
    expect(citaAdmisible.safeParse({ ...base, clase: CLASE_ATRIBUIDA }).success).toBe(true);
    expect(citaAdmisible.safeParse({ ...base, clase: CLASE_ATRIBUIDA, personaje: 'sancho-panza' }).success).toBe(true);
    expect(mensajes({ ...base, clase: CLASE_ATRIBUIDA, estadoDerechos: 'dominio-público' }).join('\n')).toMatch(
      /^estadoDerechos: .*atribuida no lleva estadoDerechos/mu,
    );
    expect(mensajes({ ...base, clase: CLASE_ATRIBUIDA, personaje: 'Sancho Panza' }).join('\n')).toMatch(/^personaje: /mu);
  });

  it('toda Cita lleva Autor o Personaje (Historia 35.2): la de un Personaje sin Autor es admisible', () => {
    const { autor: _autor, ...sinAutor } = base;
    expect(citaAdmisible.safeParse({ ...sinAutor, clase: CLASE_ATRIBUIDA, personaje: 'sancho' }).success).toBe(true);
    expect(mensajes({ ...sinAutor, estadoDerechos: 'dominio-público' }).join('\n')).toMatch(
      /^autor: .*falta el Autor o el Personaje de la Cita/mu,
    );
  });

  it('el Autor lleva su año de fallecimiento o vivo: true, uno de los dos', () => {
    const autor = { nombre: 'Alguien', semblanza: 'Escritor.' };
    expect(autorAdmisible.safeParse({ ...autor, añoFallecimiento: 1900 }).success).toBe(true);
    expect(autorAdmisible.safeParse({ ...autor, vivo: true }).success).toBe(true);
    expect(autorAdmisible.safeParse({ ...autor, vivo: true, añoNacimiento: 1950 }).success).toBe(true);
    const ambos = autorAdmisible.safeParse({ ...autor, vivo: true, añoFallecimiento: 1900 });
    expect(ambos.error?.issues.map((i) => i.message).join('\n')).toMatch(/uno de los dos/u);
    const ninguno = autorAdmisible.safeParse(autor);
    expect(ninguno.error?.issues.map((i) => i.message).join('\n')).toMatch(/falta el año de fallecimiento/u);
    expect(autorAdmisible.safeParse({ ...autor, vivo: false }).success).toBe(false);
    // `vivo: false` con su año: lo rechaza el literal, sin decir que declara «vivo: true».
    const falso = autorAdmisible.safeParse({ ...autor, vivo: false, añoFallecimiento: 1900 });
    expect(falso.success).toBe(false);
    expect(falso.error?.issues.map((i) => i.message).join('\n')).not.toMatch(/a la vez/u);
  });
});

/** Los ficheros de código de los cuatro directorios que la regla vigila, relativos a la raíz. */
async function ficheros(directorio: string): Promise<string[]> {
  const entradas = await readdir(join(RAIZ_DEL_REPO, directorio), { recursive: true, withFileTypes: true });
  return entradas
    .filter((e) => e.isFile() && /\.(ts|astro|js|mjs)$/u.test(e.name))
    .map((e) => {
      const padre =
        (e as { parentPath?: string }).parentPath ?? (e as { path?: string }).path ?? join(RAIZ_DEL_REPO, directorio);
      return join(padre, e.name).slice(RAIZ_DEL_REPO.length + 1).split('\\').join('/');
    });
}

const VIGILADOS = ['src', 'tools', 'integraciones', 'public/islas'];

describe('35.1 — esAtribuida es el único lector del campo clase', () => {
  const PERMITIDOS = new Set(['src/lib/clase.ts', 'src/lib/admision.ts']);
  /**
   * Los demás `clase` del código no son el de una Cita, y se eximen con su motivo. Un fichero nuevo
   * que lea `.clase` entra aquí con el suyo o la prueba lo nombra.
   */
  const EXENTOS: Record<string, string> = {
    'src/components/TarjetaDeCita.astro': 'la clase de CSS de cada parte de la tarjeta',
    'src/components/AvisoDeLaBusqueda.astro': 'un selector de CSS en un comentario',
    'src/pages/buscar.astro': 'un selector de CSS',
    'src/lib/ingreso.ts': 'la clase del Umbral de un Modelo de Ingreso',
    'tools/lib/ingresos.ts': 'la clase del Umbral de un Modelo de Ingreso',
    'tools/indexacion.ts': 'la clase de la credencial de Search Console',
    'tools/trafico.ts': 'la clase de la credencial de Search Console',
    'tools/demanda.ts': 'la clase de una ventana de la serie de demanda',
    'tools/lib/demanda.ts': 'la clase de una ventana de la serie de demanda',
    'tools/recuperar.ts': 'la clase de la cabecera de un documento (biografía)',
    'tools/extraer.ts': 'la clase de la cabecera de un documento (biografía)',
    'tools/lib/documentacion.ts': 'la clase de la cabecera de un documento (biografía)',
    'tools/lib/gestion.ts': 'la clase de la cabecera de un documento (biografía)',
    'tools/lib/cotejo.ts': 'la clase de la cabecera de un documento (biografía)',
    'tools/lib/corpus.ts': 'la cabecera de un documento, la sesión de sembrado, la ventana y las entradas del registro de clases',
    'tools/lib/rastreo.ts': 'la clase de destino de una petición de rastreo',
    'tools/coleccion.ts': 'la clase del solape de una Colección',
    'tools/lib/curacion.ts': 'la clase del solape de una Colección',
    'tools/objetivo.ts': 'la clase del objetivo de la sesión de sembrado',
    'tools/lib/lineaBase.ts': 'la clase de una lectura de la línea base',
    'tools/lib/medicion.ts': 'la clase de la cuota de D1',
    'tools/lib/clases.ts': 'las entradas del registro de clases',
    'tools/alta.ts': 'la clase ya derivada por claseQueCorresponde de cada publicada',
    'tools/lib/revision.ts': 'la clase de la candidata ya leída por claseDe',
  };
  const LEE = [/\.clase\b/u, /\[\s*['"`]clase['"`]\s*\]/u, /\{[^{}]*\bclase\b[^{}]*\}\s*=/u];

  it('la prueba detecta las tres formas', () => {
    expect(LEE.some((r) => r.test('if (cita.clase) {}'))).toBe(true);
    expect(LEE.some((r) => r.test("const c = cita['clase'];"))).toBe(true);
    expect(LEE.some((r) => r.test('const { clase, texto } = cita;'))).toBe(true);
    expect(LEE.some((r) => r.test('const c = claseDe(cita);'))).toBe(false);
  });

  it('ningún fichero de src/, tools/, integraciones/ ni public/islas/ fuera de los permitidos', async () => {
    const todos = (await Promise.all(VIGILADOS.map(ficheros))).flat();
    expect(todos).toContain('src/lib/clase.ts');
    const infractores: string[] = [];
    for (const ruta of todos) {
      if (PERMITIDOS.has(ruta) || ruta in EXENTOS) continue;
      const contenido = await readFile(join(RAIZ_DEL_REPO, ruta), 'utf8');
      if (LEE.some((r) => r.test(contenido))) infractores.push(ruta);
    }
    expect(infractores).toEqual([]);
  });

  it('cada exención nombra un fichero que existe', async () => {
    const todos = new Set((await Promise.all(VIGILADOS.map(ficheros))).flat());
    expect(Object.keys(EXENTOS).filter((ruta) => !todos.has(ruta))).toEqual([]);
  });
});

describe('35.1 — el literal de la atribuida vive en dos ficheros', () => {
  const LITERAL = /['"`]atribuida['"`]/u;

  it('la prueba lo detecta', () => {
    expect(LITERAL.test("if (c === 'atribuida')")).toBe(true);
    expect(LITERAL.test('clase: `atribuida`')).toBe(true);
    expect(LITERAL.test('una Cita atribuida sin registrar')).toBe(false);
  });

  it('solo src/lib/clase.ts y src/lib/admision.ts lo escriben', async () => {
    const todos = (await Promise.all(VIGILADOS.map(ficheros))).flat();
    const conLiteral: string[] = [];
    for (const ruta of todos) {
      const contenido = await readFile(join(RAIZ_DEL_REPO, ruta), 'utf8');
      if (LITERAL.test(contenido)) conLiteral.push(ruta);
    }
    expect(conLiteral.sort()).toEqual(['src/lib/admision.ts', 'src/lib/clase.ts']);
  });

  it('nadie nombra una clase por su posición en CLASES: cada una tiene su constante', async () => {
    const POR_POSICION = /\bCLASES\s*\[/u;
    expect(POR_POSICION.test('return CLASES[1];')).toBe(true);
    expect(POR_POSICION.test('CLASES.includes(valor)')).toBe(false);
    const todos = (await Promise.all(VIGILADOS.map(ficheros))).flat();
    const conPosicion: string[] = [];
    for (const ruta of [...todos, 'tests/unit/clase.test.ts', 'tests/unit/clases-de-cita.test.ts']) {
      const contenido = await readFile(join(RAIZ_DEL_REPO, ruta), 'utf8');
      const sinEstaPrueba = contenido.replace(/'return CLASES\[1\];'/gu, '');
      if (POR_POSICION.test(sinEstaPrueba)) conPosicion.push(ruta);
    }
    expect(conPosicion).toEqual([]);
  });
});

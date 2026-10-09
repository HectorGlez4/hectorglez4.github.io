/**
 * Salud del Corpus — FR-16, valida SM-C1.
 *
 * Qué porcentaje de las Citas publicadas tiene Procedencia completa, con desglose por
 * Autor. Contrapesa SM-2: el tráfico crece publicando más Citas, y la vía barata de
 * publicar más es relajar la verificación. Si esto baja mientras el tráfico sube, el
 * producto está destruyendo su único diferenciador defendible.
 *
 * AD-5 — Derivación pura. Recibe Citas ya validadas; no lee disco. La herramienta de
 * `tools/` le pasa lo que lee, y una superficie del sitio podría llamarla igual.
 */

import { gradoDeProcedencia, type GradoDeProcedencia, type Procedencia } from './admision.ts';

export interface CitaParaAuditar {
  slug: string;
  autor: string;
  procedencia?: Procedencia;
  /** La Fuente declarada, si la hay: solo importa su presencia (Historia 19.1). */
  fuente?: unknown;
}

export interface Recuento {
  total: number;
  completa: number;
  parcial: number;
  ausente: number;
  /** Porcentaje con procedencia completa, redondeado a una décima. */
  porcentajeCompleta: number;
}

export interface AuditoriaDelCorpus {
  publicadas: Recuento;
  /** Un recuento por Autor, ordenado de peor a mejor salud: lo que hay que atender. */
  porAutor: (Recuento & { autor: string })[];
}

function recontar(citas: CitaParaAuditar[]): Recuento {
  const grados = citas.map((c) => gradoDeProcedencia(c.procedencia));
  const cuenta = (g: GradoDeProcedencia) => grados.filter((x) => x === g).length;

  const total = citas.length;
  const completa = cuenta('completa');

  return {
    total,
    completa,
    parcial: cuenta('parcial'),
    ausente: cuenta('ausente'),
    // Un corpus vacío está al 100 %, no al 0 %: no hay ninguna Cita sin verificar.
    // Reportar 0 % haría saltar cualquier alarma el día que se arranca el proyecto.
    porcentajeCompleta: total === 0 ? 100 : Math.round((completa / total) * 1000) / 10,
  };
}

export function auditar(citas: CitaParaAuditar[]): AuditoriaDelCorpus {
  const porAutor = new Map<string, CitaParaAuditar[]>();
  for (const cita of citas) {
    const grupo = porAutor.get(cita.autor);
    if (grupo) grupo.push(cita);
    else porAutor.set(cita.autor, [cita]);
  }

  return {
    publicadas: recontar(citas),
    porAutor: [...porAutor.entries()]
      .map(([autor, suyas]) => ({ autor, ...recontar(suyas) }))
      .sort(
        (a, b) =>
          // Peor salud primero; a igual porcentaje, primero quien más Citas tiene, porque
          // ahí es donde arreglarlo mueve más la aguja.
          a.porcentajeCompleta - b.porcentajeCompleta || b.total - a.total ||
          a.autor.localeCompare(b.autor, 'es'),
      ),
  };
}

/**
 * Cuántas Citas de Autor de tradición `otra` no declaran traducción — Historia 19.1.
 *
 * Es una **cifra y no un error**: la traducción es visibilidad, no una puerta de
 * publicación. Una Cita de obra traducida sin traductor ni año se publica igual, porque el
 * dato vive en la edición y la Fuente no siempre lo da —Fedón lo declara y Critón, de la
 * misma edición, no—. Contarla es lo que deja ver cuánto falta, Séneca incluido.
 *
 * La tradición la declara la ficha del Autor; quien llama pasa el conjunto de los de `otra`,
 * para que esto siga sin leer nada (AD-5).
 */
export function sinTraduccionDeclarada(
  citas: readonly CitaParaAuditar[],
  autoresDeTradicionOtra: ReadonlySet<string>,
): { total: number; porAutor: { autor: string; citas: number }[] } {
  const porAutor = new Map<string, number>();
  for (const c of citas) {
    // Solo las que tienen documento: una Cita sin Fuente no puede traer la traducción que
    // su documento declararía, y contarla mezclaría dos deudas distintas.
    if (c.fuente === undefined || c.fuente === null) continue;
    if (!autoresDeTradicionOtra.has(c.autor)) continue;
    if (c.procedencia?.traduccion !== undefined) continue;
    porAutor.set(c.autor, (porAutor.get(c.autor) ?? 0) + 1);
  }
  return {
    total: [...porAutor.values()].reduce((suma, n) => suma + n, 0),
    porAutor: [...porAutor.entries()]
      .map(([autor, n]) => ({ autor, citas: n }))
      .sort((a, b) => b.citas - a.citas || a.autor.localeCompare(b.autor, 'es')),
  };
}

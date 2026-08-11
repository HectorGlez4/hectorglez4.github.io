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

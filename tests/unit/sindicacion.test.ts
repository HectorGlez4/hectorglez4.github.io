/**
 * El canal RSS deriva de la Cita del Día, y tiene que seguir derivando de ella.
 *
 * Lo que estos casos vigilan no es el XML —eso lo ve cualquiera— sino que el canal no se
 * separe de la portada. El día que alguien «optimice» la rotación aquí, el martes tendría
 * dos respuestas: una en la portada y otra en el canal. Es exactamente el fallo que
 * `lote.ts` documenta y evita llamando al Kit en vez de copiarlo.
 */
import { describe, expect, it } from 'vitest';
import { citaDelDia } from '../../src/lib/citaDelDia.ts';
import { canalRss, entradasDelCanal } from '../../src/lib/sindicacion.ts';
import type { Autor, Cita } from '../../src/lib/publicado.ts';

const AUTORES: Autor[] = [
  { slug: 'seneca', nombre: 'Séneca', semblanza: 'Filósofo estoico.', añoFallecimiento: 65 },
  { slug: 'gracian', nombre: 'Baltasar Gracián', semblanza: 'Jesuita.', añoFallecimiento: 1658 },
];

const cita = (slug: string, autor: string, texto: string): Cita => ({
  slug,
  texto,
  autor,
  temas: [],
  procedencia: { obra: 'Obra', año: 100, referencia: 'I' } as Cita['procedencia'],
  aptaParaPortada: true,
});

const APTAS: Cita[] = [
  cita('seneca-tiempo', 'seneca', 'No es que tengamos poco tiempo.'),
  cita('gracian-breve', 'gracian', 'Lo bueno, si breve, dos veces bueno.'),
  cita('seneca-puerto', 'seneca', 'Ningún viento es favorable si no sabes a dónde vas.'),
];

describe('el canal de la Cita del Día', () => {
  it('devuelve una entrada por jornada, de la más reciente a la más antigua', () => {
    const e = entradasDelCanal(APTAS, AUTORES, '2026-08-26', {}, 5);
    expect(e).toHaveLength(5);
    expect(e.map((x) => x.jornada)).toEqual([
      '2026-08-26',
      '2026-08-25',
      '2026-08-24',
      '2026-08-23',
      '2026-08-22',
    ]);
  });

  it('dice de cada jornada lo mismo que la portada dirá ese día', () => {
    // El caso que sostiene todo lo demás: si esto falla, el canal y la portada han
    // empezado a discrepar y da igual que el XML esté bien formado.
    const e = entradasDelCanal(APTAS, AUTORES, '2026-08-26', {}, 10);
    for (const entrada of e) {
      expect(entrada.cita.slug).toBe(citaDelDia(APTAS, entrada.jornada)!.cita.slug);
    }
  });

  it('respeta una fijación manual, como hace la portada', () => {
    const fijaciones = { '2026-08-24': 'gracian-breve' };
    const e = entradasDelCanal(APTAS, AUTORES, '2026-08-26', fijaciones, 5);
    const fijada = e.find((x) => x.jornada === '2026-08-24');
    expect(fijada!.cita.slug).toBe('gracian-breve');
  });

  it('empareja cada Cita con su Autor', () => {
    for (const entrada of entradasDelCanal(APTAS, AUTORES, '2026-08-26', {}, 6)) {
      expect(entrada.autor.slug).toBe(entrada.cita.autor);
    }
  });

  it('sin Citas aptas no hay canal', () => {
    expect(entradasDelCanal([], AUTORES, '2026-08-26')).toEqual([]);
  });

  it('compone un RSS con enlaces absolutos a la canónica y sin marca de origen', () => {
    const xml = canalRss(
      entradasDelCanal(APTAS, AUTORES, '2026-08-26', {}, 3),
      'https://sabiduriadebolsillo.net',
      'Título',
      'Descripción',
    );
    expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    expect(xml).toContain('<rss version="2.0"');
    expect((xml.match(/<item>/g) ?? []).length).toBe(3);
    expect(xml).toContain('https://sabiduriadebolsillo.net/cita/');
    // FR-22 cierra los valores de `de` a las cinco cuentas propias. Un `?de=rss`
    // inventado aquí sería justo lo que ese conjunto cerrado existe para impedir.
    expect(xml).not.toContain('?de=');
  });

  it('escapa lo que iría a romper el XML', () => {
    const conAmpersand = [cita('x', 'seneca', 'Tú & yo <siempre>')];
    const xml = canalRss(
      entradasDelCanal(conAmpersand, AUTORES, '2026-08-26', {}, 1),
      'https://sabiduriadebolsillo.net',
      'Marca & Co',
      'Con <ángulos>',
    );
    expect(xml).toContain('Marca &amp; Co');
    expect(xml).toContain('Con &lt;ángulos&gt;');
  });
});

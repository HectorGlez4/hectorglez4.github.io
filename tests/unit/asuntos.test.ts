import { describe, expect, it } from 'vitest';

import { coincideConElAsunto } from '../../tools/lib/asuntos.ts';

/**
 * Contar Citas por **asunto**, que es lo que decide si un Tema nuevo puede abrirse.
 *
 * La cuenta por asunto lleva cuatro sesiones viviendo en guiones de usar y tirar, y el protocolo
 * tiene escrita esta lección exacta desde la 97.ª: «las tres veces la cuenta vivía en un guion de
 * usar y tirar, sin una sola prueba, así que cada arreglo empezaba de cero y traía su propio
 * defecto». Volvió a pasar, con dos defectos medidos el mismo día:
 *
 *   · un patrón escrito `errar\\b`, **sin frontera por delante**, que daba por Citas del error
 *     «Abrid escuelas y se c-errar-án cárceles» y «el t-error secreto»;
 *   · patrones tan anchos que un asunto con 66 coincidencias bajaba a 8 al quitar `\\bsolo\\b`.
 *
 * Los dos producen lo mismo: una cifra alta que se lee como cantera y no lo es. Y el error no se
 * nota, porque nadie relee la lista completa: se mira el total y se decide con él.
 *
 * Aquí vive la parte que se puede probar —**qué cuenta como coincidencia**—, y solo esa. Que una
 * Cita *trate* del asunto es un juicio de lectura y no se automatiza: la conversión medida entre
 * coincidir y tratar va del 4 % al 57 %. La cuenta es un puntero, nunca un veredicto.
 */
describe('contar Citas por asunto', () => {
  describe('la raíz casa por delante y por detrás', () => {
    it('reconoce la palabra entera y sus derivadas', () => {
      expect(coincideConElAsunto('Casi todos los grandes errores son verdades torcidas', ['error'])).toBe(
        true,
      );
      expect(coincideConElAsunto('quien no sepa abandonar una opinión falsa', ['error'])).toBe(false);
    });

    it('no casa dentro de otra palabra: «cerrarán» no es «errar»', () => {
      // El defecto real: `errar\b` sin frontera delante daba esta Cita por Cita del error.
      expect(coincideConElAsunto('Abrid escuelas y se cerrarán cárceles.', ['errar'])).toBe(false);
    });

    it('ni «terror» es «error»', () => {
      expect(
        coincideConElAsunto('no se le puede mirar sin el terror secreto', ['error']),
      ).toBe(false);
    });

    it('pero la derivada legítima sí casa', () => {
      expect(coincideConElAsunto('más seguro que errar siguiendo a muchos', ['errar'])).toBe(true);
      expect(coincideConElAsunto('creo que se equivocan de medio a medio', ['equivoc'])).toBe(true);
    });
  });

  describe('las tildes no deciden', () => {
    it('la raíz sin tilde encuentra la palabra con ella', () => {
      // El Corpus mezcla ortografías: «á» por «a», tildes a la antigua. Una cuenta que dependa
      // de la tilde mide la edición del texto, no su asunto.
      expect(coincideConElAsunto('sólo la razón ilustrada lo enmienda', ['razon'])).toBe(true);
    });

    it('y al revés', () => {
      expect(coincideConElAsunto('la razon de los pueblos', ['razón'])).toBe(true);
    });
  });

  describe('la familia entera', () => {
    it('basta con que case una de sus raíces', () => {
      expect(
        coincideConElAsunto('duermen las tendidas aguas de la memoria', [
          'memoria',
          'recuerd',
          'olvid',
        ]),
      ).toBe(true);
    });

    it('y ninguna coincidencia es ninguna', () => {
      expect(coincideConElAsunto('el fruto viene siempre después del amor', ['memoria'])).toBe(false);
    });

    it('una familia vacía no casa con nada', () => {
      // Si no, un asunto mal declarado devolvería el Corpus entero y parecería cantera infinita.
      expect(coincideConElAsunto('cualquier cosa', [])).toBe(false);
    });
  });
});

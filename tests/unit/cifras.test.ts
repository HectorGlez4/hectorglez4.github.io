import { describe, expect, it } from 'vitest';

import { lineasDeCifras, soloCitas } from '../../tools/lib/cifras.ts';

/**
 * La cifra del BITACORA se mide, no se recuerda — higiene del bucle, no requisito del producto.
 *
 * No lleva número de FR a propósito: las FR viven en `epics.md` y describen lo que el sitio hace
 * para quien lo lee. Esto no lo ve nadie desde fuera; sostiene el registro del que la sesión
 * siguiente saca sus decisiones cuando el contexto se compacta.
 *
 * Tres entradas seguidas de la bitácora llevaban **cuatro Citas de más**. Ninguna herramienta
 * falló: `npm run huecos` imprimía el número correcto todo el tiempo. Falló el paso de en medio,
 * que era aritmética de memoria: la sesión que comprometió **dos veces** —cuatro Citas primero y
 * ocho después— escribió al cerrar «llevo doce», sumó doce sobre la base del **segundo** commit y
 * contó dos veces las cuatro primeras.
 *
 * El error no salta solo porque desplaza **las dos columnas a la vez**: la tabla sigue cuadrando
 * consigo misma y con la entrada siguiente, que hereda el «después» equivocado como su «antes».
 *
 * Así que el total de la sesión deja de entrar en la cuenta. Las dos cifras se leen de dos sitios
 * que no opinan —lo comprometido y lo que hay en el árbol— y la diferencia la saca la máquina.
 */
describe('contar Citas para cerrar la sesión', () => {
  describe('qué es una Cita a efectos de contarla', () => {
    it('el fichero que sostiene la carpeta vacía no es una Cita', () => {
      // El desfase de hoy empezó por aquí: `git ls-tree` devuelve además el `.gitkeep`, y
      // comparar esa lista contra un `find -name '*.md'` da uno de diferencia sin motivo.
      expect(soloCitas(['corpus/citas/.gitkeep', 'corpus/citas/una.md'])).toEqual([
        'corpus/citas/una.md',
      ]);
    });

    it('ni lo que no acaba en .md', () => {
      expect(soloCitas(['corpus/citas/una.md.bak', 'corpus/citas/otra.yml'])).toEqual([]);
    });

    it('y una lista limpia se cuenta entera', () => {
      expect(soloCitas(['a.md', 'b.md', 'c.md'])).toHaveLength(3);
    });
  });

  describe('la diferencia', () => {
    it('la saca de las dos cifras, no de lo que le digan', () => {
      const lineas = lineasDeCifras(1409, 1414).join('\n');
      expect(lineas).toContain('1409');
      expect(lineas).toContain('1414');
      expect(lineas).toContain('+5');
    });

    it('una sesión que no siembra lo dice sin signo', () => {
      const lineas = lineasDeCifras(1409, 1409).join('\n');
      expect(lineas).toContain('sin cambio');
      expect(lineas).not.toContain('+0');
    });

    it('y si el árbol tiene menos, lo canta en vez de escribir un número negativo', () => {
      // Retirar Citas es legítimo —la 120.ª retiró documentos enteros— pero una cifra que baja
      // sola es lo que hay que mirar dos veces, no lo que hay que dar por bueno.
      const lineas = lineasDeCifras(1414, 1409).join('\n');
      expect(lineas).toContain('se han retirado 5');
    });
  });
});

import { expect, type Page } from '@playwright/test';

/**
 * Historia 24.3 — el nombre de cada Tarjeta de Cita de un listado es su texto visible, en su
 * orden (WCAG 2.5.3), y sus partes son las que declara su contexto.
 *
 * La prueba unitaria fija el texto del enlace en `dist/`: las partes unidas por «, », sin
 * espacio delante de la coma. Lo que anuncia el navegador no es exactamente ese texto: las
 * partes son bloques de un contenedor flexible y Chromium separa cada bloque con un espacio, así
 * que dice «…» , Séneca , Cartas a Lucilio —como en la Lista de Obras—, y eso no se oye. Lo que
 * se fija aquí es lo que importa: las partes visibles, en su orden, con una coma entre cada una y
 * ninguna palabra más.
 */

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

/**
 * Una parte, como patrón: literal salvo los espacios, que el nombre accesible colapsa. El Autor
 * va en versalitas por CSS y Chromium lo nombra así, de modo que su parte —y solo la suya— se
 * compara sin distinguir mayúsculas, letra a letra; el fragmento y el título, al pie de la letra.
 */
function patron(texto: string, sinMayusculas: boolean): string {
  return texto
    .trim()
    .split(/\s+/)
    .map((palabra) =>
      [...palabra]
        .map((letra) => {
          const minuscula = letra.toLocaleLowerCase('es');
          const mayuscula = letra.toLocaleUpperCase('es');
          return sinMayusculas && minuscula !== mayuscula && [...mayuscula].length === 1
            ? `[${escapar(minuscula)}${escapar(mayuscula)}]`
            : escapar(letra);
        })
        .join(''),
    )
    .join('\\s+');
}

/**
 * Comprueba cada Tarjeta del listado de la página abierta: sus partes visibles son una de las
 * secuencias de clases que admite su contexto, y su nombre accesible son esas partes en ese
 * orden, unidas por comas y sin nada más. Devuelve cuántas tarjetas miró y cuántas llevaban Obra.
 */
export async function comprobarNombresDeTarjetas(
  page: Page,
  admitidas: readonly (readonly string[])[],
): Promise<{ total: number; conObra: number }> {
  const enlaces = page.locator('.listado li a');
  const total = await enlaces.count();
  let conObra = 0;
  for (let i = 0; i < total; i += 1) {
    const enlace = enlaces.nth(i);
    const partes = await enlace.evaluate((a) =>
      [...a.querySelectorAll(':scope > span:not(.solo-para-lectores)')].map((s) => ({
        clase: s.className,
        texto: s.textContent ?? '',
      })),
    );
    const clases = partes.map((p) => p.clase);
    const motivo = `${page.url()} · tarjeta ${i}`;
    expect(admitidas, motivo).toContainEqual(clases);
    if (clases.includes('obra')) conObra += 1;
    await expect(enlace, motivo).toHaveAccessibleName(
      new RegExp(`^${partes.map((p) => patron(p.texto, p.clase === 'autor')).join('\\s*,\\s*')}$`),
    );
  }
  return { total, conObra };
}

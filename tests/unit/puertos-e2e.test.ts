/**
 * Cada fichero de `tests/e2e/` que levanta su propio servidor lo hace en un puerto que no
 * comparte con ningún otro: `playwright.config.ts` corre con `fullyParallel: true`, así que
 * dos ficheros con el mismo puerto pueden escuchar a la vez en una pasada entera y uno de los
 * dos cae por el puerto, no por lo que prueba. Pasó con `lee-el-pasaje.spec.ts` y
 * `busqueda-historial.spec.ts`, los dos en 4403 (Historia 31.2). Tampoco reutilizan los del
 * `webServer` de la configuración: 4321 (el sitio) y 8787 (el receptor local).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const E2E = join(process.cwd(), 'tests', 'e2e');
const DEL_WEB_SERVER = new Set([4321, 8787]);

function puertosDeclarados(): { fichero: string; nombre: string; puerto: number }[] {
  const declarados: { fichero: string; nombre: string; puerto: number }[] = [];
  for (const fichero of readdirSync(E2E).filter((f) => f.endsWith('.ts')).sort()) {
    const fuente = readFileSync(join(E2E, fichero), 'utf8');
    for (const m of fuente.matchAll(/const (PUERTO[A-Z_]*)\s*=\s*(\d+)\s*;/gu)) {
      declarados.push({ fichero, nombre: m[1]!, puerto: Number(m[2]) });
    }
  }
  return declarados;
}

describe('puertos de las pruebas de punta a punta', () => {
  it('hay ficheros que declaran su puerto (la búsqueda no se quedó sin presa)', () => {
    expect(puertosDeclarados().length).toBeGreaterThanOrEqual(5);
  });

  it('ningún puerto propio lo declaran dos ficheros, ni es uno del webServer', () => {
    const porPuerto = new Map<number, string[]>();
    for (const { fichero, nombre, puerto } of puertosDeclarados()) {
      porPuerto.set(puerto, [...(porPuerto.get(puerto) ?? []), `${fichero} (${nombre})`]);
    }
    const repetidos = [...porPuerto].filter(([, quienes]) => quienes.length > 1);
    expect(repetidos).toEqual([]);
    const delWebServer = [...porPuerto.keys()].filter((p) => DEL_WEB_SERVER.has(p));
    expect(delWebServer).toEqual([]);
  });
});

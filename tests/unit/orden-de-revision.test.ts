import { afterEach, describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { cargaDeCandidata } from "../../src/lib/ordenDeRevision.ts";
import {
  formatearLote,
  loteEnRevision,
  type CandidataEnRevision,
} from "../../tools/lib/revision.ts";
import { rutasDelCorpus, type Rutas } from "../../tools/lib/corpus.ts";

/**
 * Historia 19.6 — la cola de revisión se ordena por probabilidad, no por alfabeto.
 *
 * Lo que estas pruebas vigilan no es que el orden acierte —eso lo dice el editor leyendo—
 * sino que **ordenar no sea rechazar**: que el total no cambie, que nada desaparezca y que
 * el corte diga lo que deja fuera.
 */

const ejecutar = promisify(execFile);
const RAIZ = resolve(import.meta.dirname, "../..");

const temporales: string[] = [];
afterEach(async () => {
  await Promise.all(
    temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })),
  );
});

function ficheroDeCita(campos: Record<string, unknown>): string {
  const yaml = Object.entries(campos)
    .map(([clave, valor]) =>
      typeof valor === "object" && valor !== null && !Array.isArray(valor)
        ? `${clave}:\n${Object.entries(valor as Record<string, unknown>)
            .map(([k, v]) => `  ${k}: ${JSON.stringify(v)}`)
            .join("\n")}`
        : `${clave}: ${JSON.stringify(valor)}`,
    )
    .join("\n");
  return `---\n${yaml}\n---\n`;
}

/** Una candidata que sólo se diferencia de las demás en su texto y su slug. */
function candidata(slug: string, texto: string, autor = "marco-aurelio") {
  return {
    texto,
    autor,
    temas: [],
    slug,
    procedencia: { obra: "Soliloquios", año: 180 },
    estadoDerechos: "dominio-público",
    fuente: {
      id: "wikisource-es",
      nombre: "Wikisource en español",
      licencia: "CC BY-SA 4.0",
      url: "https://es.wikisource.org/wiki/Soliloquios",
    },
  };
}

async function corpusCon(
  candidatas: Record<string, unknown>[],
): Promise<{ rutas: Rutas; dir: string }> {
  const raiz = await mkdtemp(join(tmpdir(), "sabiduria-orden-"));
  temporales.push(raiz);
  const dir = join(raiz, "corpus");
  const rutas = rutasDelCorpus(dir);
  for (const d of [rutas.citas, rutas.autores, rutas.temas, rutas.revision]) {
    await mkdir(d, { recursive: true });
  }
  for (const c of candidatas) {
    await writeFile(
      join(rutas.revision, `${c.slug}.md`),
      ficheroDeCita(c),
      "utf8",
    );
  }
  return { rutas, dir };
}

async function correr(argumentos: string[]) {
  try {
    const { stdout } = await ejecutar(
      "npx",
      ["tsx", join(RAIZ, "tools/revisar.ts"), ...argumentos],
      {
        cwd: RAIZ,
      },
    );
    return { codigo: 0, salida: stdout, error: "" };
  } catch (e) {
    const fallo = e as { code?: number; stdout?: string; stderr?: string };
    return {
      codigo: fallo.code ?? 1,
      salida: fallo.stdout ?? "",
      error: fallo.stderr ?? "",
    };
  }
}

const slugs = (lote: CandidataEnRevision[]) => lote.map((c) => c.slug);

describe("Historia 19.6 — la carga es una medida, no un veredicto", () => {
  it("una máxima limpia no lleva ninguna señal", () => {
    const medida = cargaDeCandidata(
      "A nadie acontece cosa alguna que no pueda él mismo soportar naturalmente.",
    );
    expect(medida.carga).toBe(0);
    expect(medida.señales).toEqual([]);
  });

  it("el aparato del traductor pesa por el nombre propio que nombra", () => {
    const medida = cargaDeCandidata(
      "Del mismo parecer es San Ambrosio en aquel pasaje.",
    );
    expect(medida.señales).toContain("nombre-propio-interior");
    expect(medida.carga).toBeGreaterThan(0);
  });

  it("la cifra es la señal más pesada: ninguna Cita publicada lleva un dígito", () => {
    expect(
      cargaDeCandidata("Escrito en el libro 4, capítulo 12 de la obra.")
        .señales,
    ).toContain("cifra");
    expect(
      cargaDeCandidata("Nada hay tan cierto como la muerte que nos espera.")
        .carga,
    ).toBe(0);
  });

  it("la frase que cuelga de la anterior pesa por cómo abre", () => {
    expect(
      cargaDeCandidata("Y por eso conviene guardar silencio ante los necios.")
        .señales,
    ).toContain("abre-encadenada");
  });

  it("la mayúscula tras punto no cuenta: ahí es lo normal", () => {
    expect(
      cargaDeCandidata(
        "Nada temas. Sócrates tampoco temía cuando llegó su hora final.",
      ).señales,
    ).not.toContain("nombre-propio-interior");
  });

  it("la inicial abreviada pesa: ninguna Cita publicada lleva una letra suelta con punto", () => {
    expect(
      cargaDeCandidata("A este propósito viene también lo que escribió S.")
        .señales,
    ).toContain("inicial-abreviada");
    // Y no muerde una frase que acaba en palabra de una letra.
    expect(
      cargaDeCandidata("Nada temas de lo que no dependa de ti.").señales,
    ).not.toContain("inicial-abreviada");
  });

  it("lo entrecomillado no lo dijo el Autor, y por eso baja", () => {
    expect(
      cargaDeCandidata("Decía el poeta «todo pasa» y tenía razón cumplida.")
        .señales,
    ).toContain("comillas");
  });

  it("abrir en minúscula no entra: se midió y apunta al revés", async () => {
    // 2,1 % de las publicadas contra 0,5 % de las candidatas. Lo habría dado por defecto.
    const { readFileSync } = await import("node:fs");
    const fuente = readFileSync(
      new URL("../../src/lib/ordenDeRevision.ts", import.meta.url),
      "utf8",
    );
    expect(fuente).not.toMatch(/abre-en-minuscula|ABRE_MINUSCULA/);
  });

  it("la longitud no entra: se midió y no separa", async () => {
    const { readFileSync } = await import("node:fs");
    const fuente = readFileSync(
      new URL("../../src/lib/ordenDeRevision.ts", import.meta.url),
      "utf8",
    );
    expect(fuente).not.toMatch(/\.length\s*[<>]/);
  });
});

describe("Historia 19.6 — ordenar no es rechazar", () => {
  it("la cola sale por carga y no por alfabeto, y no pierde a nadie", async () => {
    const { rutas } = await corpusCon([
      candidata(
        "marco-aurelio-a-nadie-acontece",
        "A nadie acontece cosa alguna que no pueda soportar.",
      ),
      candidata(
        "marco-aurelio-b-con-cifra",
        "Lo dice el libro 7 en su capítulo 3 con claridad.",
      ),
      candidata(
        "marco-aurelio-c-limpia",
        "La muerte es un descanso de la impresión de los sentidos.",
      ),
    ]);
    const lote = await loteEnRevision(rutas);

    expect(lote).toHaveLength(3);
    // La de la cifra abría el alfabeto por su slug y cierra la cola por su carga.
    expect(slugs(lote).at(-1)).toBe("marco-aurelio-b-con-cifra");
    expect(slugs(lote)).toContain("marco-aurelio-b-con-cifra");
  });

  it("lo inadmisible va al fondo, pero sigue listado con sus motivos", async () => {
    const sinProcedencia = {
      texto: "La vida es larga si sabes usarla y aprovecharla como es debido.",
      autor: "marco-aurelio",
      temas: [],
      slug: "marco-aurelio-a-sin-procedencia",
      estadoDerechos: "dominio-público",
    };
    const { rutas } = await corpusCon([
      sinProcedencia,
      candidata(
        "marco-aurelio-z-con-cifra",
        "Lo dice el libro 7 en su capítulo 3 con claridad.",
      ),
    ]);
    const lote = await loteEnRevision(rutas);

    expect(slugs(lote)).toEqual([
      "marco-aurelio-z-con-cifra",
      "marco-aurelio-a-sin-procedencia",
    ]);
    expect(lote.at(-1)?.motivos.join(" ")).toMatch(/Procedencia/);
  });

  it("dos candidatas de la misma carga salen siempre en el mismo orden", async () => {
    const { rutas } = await corpusCon([
      candidata(
        "marco-aurelio-b-segunda",
        "La muerte es un descanso de la impresión de los sentidos.",
      ),
      candidata(
        "marco-aurelio-a-primera",
        "Nada hay tan cierto como la muerte que a todos espera.",
      ),
    ]);
    const una = slugs(await loteEnRevision(rutas));
    const otra = slugs(await loteEnRevision(rutas));

    expect(una).toEqual(["marco-aurelio-a-primera", "marco-aurelio-b-segunda"]);
    expect(otra).toEqual(una);
  });
});

describe("Historia 19.6 — el corte declara lo que deja fuera", () => {
  const tres: CandidataEnRevision[] = [1, 2, 3].map((n) => ({
    slug: `seneca-${n}`,
    texto: `Sentencia número ${n}.`,
    autor: "seneca",
    ruta: `/tmp/seneca-${n}.md`,
    admisible: true,
    motivos: [],
    carga: 0,
    señalesDeOrden: [],
  }));

  it("el total es el de pendientes, no el de enseñadas", () => {
    const salida = formatearLote(tres.slice(0, 1), 3);
    expect(salida).toMatch(/Pendientes de decisión: 3/);
    expect(salida).toMatch(/Quedan 2 por debajo del corte/);
  });

  it("sin corte no habla de corte", () => {
    expect(formatearLote(tres)).not.toMatch(/por debajo del corte/);
  });
});

describe("Historia 19.6 — la orden", () => {
  it("«--primeras» enseña las primeras y dice cuántas quedan", async () => {
    const { dir } = await corpusCon([
      candidata(
        "marco-aurelio-a-limpia",
        "A nadie acontece cosa alguna que no pueda soportar.",
      ),
      candidata(
        "marco-aurelio-b-limpia",
        "La muerte es un descanso de la impresión de los sentidos.",
      ),
      candidata(
        "marco-aurelio-c-limpia",
        "Nada hay tan cierto como la muerte que a todos espera.",
      ),
    ]);
    const salida = await correr(["--corpus", dir, "--primeras", "1"]);

    expect(salida.codigo, salida.error).toBe(0);
    expect(salida.salida).toMatch(/Pendientes de decisión: 3/);
    expect(salida.salida).toMatch(/Quedan 2 por debajo del corte/);
  });

  it("«--autor» ordena sólo las suyas, con su propio recuento", async () => {
    const { dir } = await corpusCon([
      candidata(
        "marco-aurelio-a-limpia",
        "A nadie acontece cosa alguna que no pueda soportar.",
      ),
      candidata(
        "seneca-b-limpia",
        "No es que tengamos poco tiempo, es que perdemos mucho.",
        "seneca",
      ),
    ]);
    const salida = await correr(["--corpus", dir, "--autor", "marco-aurelio"]);

    expect(salida.codigo, salida.error).toBe(0);
    expect(salida.salida).toMatch(/Pendientes de decisión: 1/);
    expect(salida.salida).toContain("marco-aurelio-a-limpia");
    expect(salida.salida).not.toContain("seneca-b-limpia");
  });

  it("un Autor sin candidatas lo dice y no falla", async () => {
    const { dir } = await corpusCon([
      candidata(
        "marco-aurelio-a-limpia",
        "A nadie acontece cosa alguna que no pueda soportar.",
      ),
    ]);
    const salida = await correr(["--corpus", dir, "--autor", "platon"]);

    expect(salida.codigo).toBe(0);
    expect(salida.salida).toMatch(/No queda ninguna candidata de «platon»/);
  });

  it("«--primeras dos» es un error de invocación, y se dice sin leer el corpus", async () => {
    const { dir } = await corpusCon([]);
    const salida = await correr(["--corpus", dir, "--primeras", "dos"]);

    expect(salida.codigo).toBe(2);
    expect(salida.error).toMatch(/número entero/);
  });
});

import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';
import {
  año,
  añoFallecimiento,
  coleccionAdmisible,
  estadoDerechos,
  fuenteDeCita,
  nombre,
  procedencia,
  semblanza,
  slug,
  texto,
  tradicion,
} from './lib/admision.js';

// ─────────────────────────────────────────────────────────────────────────────
// AD-1 — La puerta de admisión vive aquí, no en `tools/`.
//
// Las reglas se definen en `src/lib/admision.ts`; este fichero las cablea a las
// colecciones, que es donde se convierten en puerta: un fichero que las incumpla rompe
// el build lo haya escrito quien lo haya escrito. Si la comprobación viviera en el
// script de ingesta, editar un fichero con el editor de texto la esquivaría (FR-13).
// No se degrada a aviso.
//
// AD-2 — Lo no publicado vive fuera del árbol construido.
//
// Las cuatro colecciones apuntan a `corpus/{citas,autores,temas,colecciones}`.
// `corpus/_revision/` no es la base de ninguna, así que ninguna colección puede cargarlo.
// No existe un campo `publicada` que filtrar en tiempo de ejecución: publicar es mover el
// fichero.
//
// `corpus/fuentes/` tampoco es la base de ninguna, y por el mismo motivo: son los
// documentos de Fuente que versiona `tools/recuperar.ts` (AD-23), texto de terceros que
// no puede filtrarse al sitio construido.
//
// Que no sea colección no quiere decir que el build lo ignore: desde la Historia 11.2 lo
// lee `integraciones/cotejo.ts`, que comprueba que el texto de cada Cita aparezca
// literalmente en el cuerpo de su documento y rompe la construcción si no. Lo lee para
// **cotejar**, nunca para publicar.
// ─────────────────────────────────────────────────────────────────────────────

const citas = defineCollection({
  // `base` acota la colección a corpus/citas. corpus/_revision/ queda fuera de su
  // alcance por construcción, no por filtro (AD-2).
  loader: glob({ pattern: '**/*.md', base: './corpus/citas' }),
  schema: z.object({
    // El texto vive en el frontmatter, no en el cuerpo del markdown, y es deliberado:
    // el procesador de markdown aplica SmartyPants y reescribiría comillas y guiones
    // del texto de la Cita. NFR-12 prohíbe que el sistema altere una Cita publicada sin
    // acción explícita del editor. El frontmatter pasa intacto.
    texto,
    autor: reference('autores'),
    temas: z.array(reference('temas')).default([]),
    slug,
    procedencia,
    estadoDerechos,
    /*
     * Historia 11.2 — la Fuente de la que salió la Cita, y con ella su documento.
     *
     * Declararlo aquí es lo que hace que el dato sobreviva a la publicación: el esquema
     * descarta lo que no reconoce, así que sin esta línea el `fuente:` que escribe
     * `tools/extraer.ts` se perdía al leer la colección y el cotejo no tendría de dónde
     * agarrarse. Es opcional en el esquema y **no** en la puerta: el cotejo del build
     * (`integraciones/cotejo.ts`) exige documento a toda Cita que no esté en el censo
     * cerrado de `corpus/pendientes-de-cotejo.yml`, y rompe la construcción si falta.
     */
    fuente: fuenteDeCita.optional(),
    // FR-15 — marcado de Cita apta para portada, que consume la Cita del Día (FR-9).
    aptaParaPortada: z.boolean().default(false),
  }),
});

const autores = defineCollection({
  loader: glob({ pattern: '**/*.{yml,yaml}', base: './corpus/autores' }),
  schema: z.object({
    nombre: nombre('Autor'),
    añoFallecimiento,
    añoNacimiento: año.optional(),
    semblanza,
    // §6.1 — el suelo del 40 % de tradición latinoamericana necesita saber de quién
    // hablamos. Opcional: ver la nota en `admision.ts`.
    tradicion: tradicion.optional(),
  }),
});

const temas = defineCollection({
  loader: glob({ pattern: '**/*.{yml,yaml}', base: './corpus/temas' }),
  schema: z.object({
    nombre: nombre('Tema'),
  }),
});

/*
 * La Colección — Historia 12.2, AD-18.
 *
 * Aquí la regla se convierte en puerta: un fichero de `corpus/colecciones/` sin nombre o
 * sin criterio rompe la construcción, lo haya escrito la herramienta de curación de la
 * Historia 12.4 o el editor con su editor de texto. La herramienta es comodidad, no
 * puerta.
 *
 * Es la única colección cuyo esquema es **literalmente** el de `admision.ts` sin envolver.
 * En `citas` no se puede porque sus referencias —`reference('autores')`,
 * `reference('temas')`— son piezas de Astro que un módulo puro no puede nombrar; en
 * `autores` y `temas` es que no existe tal objeto en `admision.ts`: `autorAdmisible` sí, y
 * se repite aquí por costumbre, y el de Tema nunca se escribió. Ninguna de las dos cosas
 * pasa con la Colección —no tiene referencias, justamente porque su lista de miembros es
 * **blanda**— así que aquí la definición puede ser una sola y lo es.
 *
 * A propósito: ni aquí ni en `admision.ts` hay un `reference('citas')` para `miembros`.
 * Ver la nota larga de `coleccionAdmisible` — con una referencia dura, mover una Cita a
 * `corpus/_revision/` rompería el build, y despublicar dejaría de ser seguro.
 *
 * ── Por qué `corpus/colecciones/` se versiona vacío, con su `.gitkeep` ──
 *
 * Se decidió **no** sembrar una Colección de partida. Una Colección es contenido
 * editorial: su criterio y sus miembros son una decisión de curación del dueño del
 * Corpus, no algo que un agente pueda inventar de camino a entregar el modelo. Una
 * Colección sembrada por comodidad se publicaría de verdad —tiene URL, sitemap y su
 * página desde la Historia 12.3— y el sitio anunciaría un criterio que nadie eligió; y
 * añadir sus Citas al corpus real tropezaría además con el cotejo de la Historia 11.2. El
 * directorio se versiona vacío con `.gitkeep`, igual que `corpus/_revision/` y
 * `corpus/fuentes/`, que es la convención del repositorio para lo que existe y todavía no
 * tiene contenido.
 *
 * ── COSTE ACEPTADO: dos avisos en cada construcción, y son ESPERADOS ──
 *
 * Mientras `corpus/colecciones/` esté vacío, cada `npm run build` —también en el CI y en
 * el despliegue— imprime exactamente estas dos líneas:
 *
 *   [WARN] [glob-loader] No files found matching "**\/*.{yml,yaml}" in directory
 *   "corpus/colecciones"
 *   The collection "colecciones" does not exist or is empty. Please check your content
 *   config file for errors.
 *
 * **No hay ningún error que buscar: este fichero es la respuesta.** El segundo aviso pide
 * revisar la configuración de contenido, y lo que hay que saber es que el directorio está
 * vacío a propósito, por la decisión de arriba. Ninguno de los dos es un fallo: el build
 * termina en verde y la puerta de cotejo de la Historia 11.2 sigue intacta. Los dos se
 * apagan solos en cuanto se cure la primera Colección.
 *
 * Se buscó una forma limpia de callarlos y no la hay. El primero lo emite el cargador de
 * globs cuando el directorio existe y no casa ningún fichero; el segundo lo emite
 * `getCollection` cuando la colección no está registrada en el almacén de contenido, y el
 * cargador solo la registra si encuentra al menos un fichero. Silenciarlos exigiría
 * envolver el cargador para filtrar su registro **y** dejar registrada una colección vacía
 * pasando por un `set` seguido de `delete`, que se apoya en detalles internos de Astro
 * —qué mensaje se emite, y que borrar la última entrada deje el mapa creado— sin ninguna
 * garantía de versión. Cambiar dos líneas de ruido por maquinaria frágil en la puerta de
 * admisión del corpus es mal negocio; el ruido está aquí explicado y la maquinaria no lo
 * estaría.
 *
 * Vale más ese recordatorio de que la superficie existe y está vacía que una Colección de
 * mentira que parezca curada.
 *
 * El formato del fichero, para cuando llegue esa primera Colección:
 *
 *   # corpus/colecciones/frases-cortas-para-reflexionar.yml
 *   nombre: "Frases cortas para reflexionar"
 *   criterio: "Citas de una sola frase que se sostienen fuera de su obra."
 *   miembros:
 *     - seneca-no-es-que-tengamos-poco-tiempo
 *     - ...
 */
const colecciones = defineCollection({
  loader: glob({ pattern: '**/*.{yml,yaml}', base: './corpus/colecciones' }),
  schema: coleccionAdmisible,
});

export const collections = { citas, autores, temas, colecciones };

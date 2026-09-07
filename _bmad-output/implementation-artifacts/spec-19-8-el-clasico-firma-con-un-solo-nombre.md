---
title: 'Historia 19.8 — El clásico firma con un solo nombre'
type: 'feature'
created: '2026-09-07'
status: 'in-review'
baseline_commit: 'f464f76b8898dc68311a62db43c73c7a3cb4f818'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/LOOP-PROTOCOL-V5.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** los ocho documentos de Platón se versionaron sin Autor declarado, y no porque la Fuente calle: sus páginas llevan `[[Categoría:Obras de Platón]]`, que es una de las cuatro formas que el lector ya sabe leer. La descarta `pareceNombreDePersona`, que **exige dos palabras**. Esa guarda se calibró con Autores hispanoamericanos de dos apellidos, y **el clásico firma con un solo nombre**: Platón, Homero, Esopo, Safo, Virgilio, Cicerón, Séneca. Es la mitad de la Épica 19.

**Approach:** un nombre de una sola palabra cuenta **si empieza en mayúscula**. Es lo que ya distingue a «Obras de Platón» de «Obras de teatro», y no hace falta enumerar lo que no es un Autor —una lista que nunca se acaba— porque la Fuente escribe los géneros en minúscula.

## Boundaries & Constraints

**Always:**
- La categoría sigue siendo **una señal entre cuatro**, y la última de la cadena. No adelanta a la plantilla, ni a la etiqueta de escaneo, ni a la firma.
- Lo que se versiona es la línea **literal** de la Fuente. Aquí solo cambia qué líneas se consideran declaración.
- La medición contra la Fuente se escribe donde vive la regla, con la fecha y con los casos que **no** cubre.

**Ask First:**
- Leer la página `Index:` del escaneo. Sigue siendo la otra vía y sigue sin decidirse — es una petición de red más por documento.
- Aflojar más la guarda: admitir una palabra en minúscula, o quitar la mayúscula del primer término en los nombres de dos palabras.

**Never:**
- Enumerar excepciones a mano. La lista de lo que no es un Autor no se acaba nunca, y ese fue el argumento de la regla original.
- Dar la categoría por buena **por encima** de lo que declare la propia página. La categoría es el último recurso, no una segunda opinión.
- Callar los falsos positivos. Están medidos y van escritos junto a la regla.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Clásico mononímico | `Categoría:Obras de Platón` | Declara «Platón» | N/A |
| Género en minúscula | `Categoría:Obras de teatro` | No declara nada, como hoy | N/A |
| Dos palabras | `Categoría:Ensayos de Antonio Machado` | Igual que hoy: sin cambio | N/A |
| Dos palabras, una en minúscula | `Categoría:Obras de la Edad Media` | Sigue fuera, como hoy | N/A |
| Obra con nombre propio | `Categoría:Cuentos de Marineda` | **Declara «Marineda», que no es persona** | La puerta de FR-23 lo **niega**, no lo atribuye |
| Género con nombre propio | `Categoría:Cuentos de Navidad` | **Declara «Navidad»**, y antes no | Igual: niega la siembra, no la firma |
| Página que ya declara | Plantilla y categoría | Manda la plantilla: la categoría es la última | N/A |

</frozen-after-approval>

## Code Map

- `tools/lib/documento.ts:792` -- `pareceNombreDePersona`. Es la línea `if (palabras.length < 2) return false`.
- `tools/lib/documento.ts:788` -- `GENERO_DE_CATEGORIA`, la lista cerrada de géneros. **No se toca.**
- `tools/lib/documento.ts:775-783` -- el comentario que explica la regla vieja y su razón. Se reescribe con lo medido.
- `tools/lib/documento.ts:1169` -- el cuarto eslabón de la cadena de Autor, donde esto entra. Tampoco se toca.

**Medido el 07/09/2026 contra la API de Wikisource-es** — las **2.295** categorías que empiezan por los doce géneros de la lista:

| | |
|---|---|
| Con nombre de **una sola palabra** | 53 |
| …en minúscula, que la mayúscula excluye sola | 3 — *esoterismo, juventud, referencia* |
| …en mayúscula, que entrarían | 50 |
| …de esas 50, **personas** | **48** |
| …de esas 50, **no personas** | **2** — `Cuentos de Marineda`, `Cuentos de Nasrudin` |

Los 48 son el catálogo entero de la Épica 19: Aristóteles, Cicerón, Esopo, Esquilo, Eurípides, Heródoto, Hesíodo, Homero, Horacio, Jenofonte, Ovidio, Petronio, Pitágoras, Platón, Plutarco, Salustio, Séneca, Sófocles, Tácito, Virgilio…

## Tasks & Acceptance

**Execution:**
- [x] `tools/lib/documento.ts` -- una palabra en mayúscula cuenta como nombre.
- [x] `tools/lib/documento.ts` -- el comentario dice lo medido, con fecha, y **nombra los dos que no cubre**.
- [x] Pruebas de la matriz, incluidos Marineda y «Obras de teatro».
- [x] Volver a recuperar los documentos de Platón, para que declaren a quien firma.

**Acceptance Criteria:**
- Given `[[Categoría:Obras de Platón]]`, when se deriva el Autor, then declara «Platón».
- Given `[[Categoría:Obras de teatro]]`, when se deriva, then no declara nada.
- Given los documentos de Platón rehechos, when corre la prueba de FR-23, then ninguno queda sin Autor declarado.

## Design Notes

**Por qué se acepta un falso positivo, cuando la casa exige cero.** El listón de cero es para una puerta que **descarta en silencio**: lo que muerde no vuelve y nadie se entera. Ésta no descarta, **declara**, y lo declarado lo compara después la puerta de FR-23 contra el `--autor` de la orden. Un documento de *Cuentos de Marineda* sembrado como Pardo Bazán no se atribuiría mal: **se negaría a sembrarse**, en voz alta y a la primera. Bloquear es recuperable y es visible; atribuir mal, ni una cosa ni la otra. Ese es el cálculo, y por eso los dos casos van escritos junto a la regla en vez de escondidos.

## Verification

**Commands:**
- `npx vitest run <las pruebas nuevas>` -- expected: la matriz en verde, sin red.
- `npx vitest run tests/unit/documento.test.ts` -- expected: Platón fuera de la lista de mudos.
- `npx astro check` -- expected: 0 errores.
- `npm test` -- expected: sin regresión.

---
title: "Guía de arranque — Sabiduría Diaria"
status: final
created: 2026-08-10
updated: 2026-08-10
---

# Guía de arranque

Acompaña a `ARCHITECTURE-SPINE.md`. La espina fija los invariantes; esto es el camino concreto para llegar del repositorio vacío a la primera Cita publicada. **Si algo aquí contradice la espina, manda la espina.**

## Antes de nada

Astro 7 exige **Node 22 como mínimo**. Compruébalo:

```bash
node --version
```

Si devuelve menos de v22, actualiza antes de seguir. Es el único requisito previo.

## Poner en marcha el esqueleto

```bash
npm create astro@latest sabiduria-diaria -- --template minimal --typescript strict --no-install
```

Plantilla mínima a propósito: cualquier plantilla de blog trae una estructura de contenido que tendrías que deshacer, porque la tuya la fija la espina.

```bash
cd sabiduria-diaria && npm install && npx astro add sitemap && npm i -D pagefind
```

`sitemap` cubre NFR-1. Pagefind se instala como dependencia de desarrollo porque solo actúa en el build.

## El orden en que construir

No es arbitrario: cada paso hace verificable al siguiente. Construir la presentación antes que el esquema es la forma habitual de acabar con reglas de negocio dentro de componentes.

1. **El esquema primero** (`src/content.config.ts`). Es AD-1, la puerta de admisión. Antes de tener una sola página, debes poder comprobar que una Cita sin procedencia rompe el build. Escribe dos ficheros de prueba —uno válido y otro sin procedencia— y confirma que el segundo falla. **Esa comprobación es el producto**: todo lo demás es presentación.

2. **Las dos direcciones de `corpus/`.** `corpus/citas/` y `corpus/_revision/`. La segunda no la carga ninguna colección (AD-2). Verifica que una Cita movida a `_revision/` desaparece del sitio y del sitemap sin que exista ningún filtro.

3. **`src/lib/` completo, antes que cualquier página.** `normalizar.ts`, `slug.ts`, `tramos.ts`, `umbrales.ts`, `publicado.ts`. Son funciones puras (AD-5): se pueden probar sin renderizar nada. `publicado.ts` es el que evita el fallo que encontró el pase adversario — que la ruta de un Tema y el sitemap discrepen sobre un Tema de 14 Citas.

4. **La Página de Cita.** La superficie que sostiene el producto. La maqueta anotada está en `ux-designs/…/mockups/pagina-de-cita.html`.

5. **Autor y Tema**, que ya son agregaciones sobre `publicado.ts`.

6. **Pagefind y la búsqueda.** Se ejecuta sobre `dist/` después del build; no necesita configuración de esquema.

7. **La isla de Imagen de Cita.** Déjala para el final: es la pieza más cara (AD-7) y la única cuyo aplazamiento no bloquea nada más.

8. **`tools/` de ingesta.** Al final a propósito. Es comodidad, no puerta — la puerta ya está en el paso 1.

## Despliegue

Hosting estático con build en CI al hacer push. Dos disparadores, no uno:

- **En cada push** a la rama principal.
- **Una vez al día a hora fija**, que es lo que exige AD-12 para que la Cita del Día cambie por jornada en un sitio prerenderizado.

Sin el segundo, la portada se congela hasta el siguiente commit. Es el error más fácil de cometer en esta arquitectura y el más difícil de notar.

No hay entorno de staging: el artefacto es una carpeta de HTML, no hay estado que migrar. Revertir es volver a desplegar un commit anterior.

## Los tres errores que esta arquitectura invita a cometer

1. **Poner la validación en `tools/`.** Es lo natural — la herramienta es donde entra el contenido. Pero entonces editar un fichero a mano se salta la puerta. AD-1 existe justo para esto.
2. **Filtrar en vez de separar.** Un campo `publicada: false` parece más limpio que dos directorios, hasta que apareces la cuarta superficie que enumera contenido y olvidas el filtro en una. AD-2 lo hace estructuralmente imposible.
3. **Codificar un tamaño de Cita a mano en el generador de imagen.** La previsualización dejaría de coincidir con lo que se descarga, y nadie lo detectaría hasta que alguien publique una imagen mal compuesta. AD-8.

## Qué verificar antes de dar la v1 por buena

- Una Cita sin procedencia rompe el build (AD-1).
- Una Cita en `_revision/` no aparece en el sitio, en el sitemap ni en la búsqueda (AD-2).
- Buscar con y sin acentos devuelve lo mismo (AD-3, FR-7).
- Reasignar una Cita a otro Tema no cambia su URL (AD-4, FR-1).
- Un Tema de 14 Citas no tiene página, no está en el sitemap y no genera chips (AD-11).
- Una Cita de más de 300 caracteres no muestra la acción «Imagen» (AD-8, FR-10).
- La Página de Cita funciona con JavaScript desactivado (AD-6, NFR-2).
- La reconstrucción diaria programada está activa (AD-12).

# Bitácora del sprint — Sabiduría Diaria

Una línea por historia cerrada: qué se verificó y qué quedó fuera.
El protocolo del bucle está en `LOOP-PROTOCOL.md`.

---

## 1.1 — Andamiaje del proyecto

**Verificado.** Node 24.3.0 supera el mínimo 22.12; la comprobación está encadenada a
`prebuild` y `predev` y su comparación se prueba con versiones por debajo del mínimo
sin necesitar un Node antiguo instalado. `astro dev` arranca y sirve 200. `npm run build`
termina sin errores y produce `sitemap-index.xml` más `sitemap-0.xml`. Los diez
directorios de la espina existen. `astro check`: 0 errores. Vitest: 16 pruebas en verde.

**Decidido por el camino.** El dominio de `site` es provisional
(`https://sabiduria-diaria.es`, conmutable con `SITE_URL`) porque el definitivo no está
contratado; vive solo en `astro.config.mjs`, así que cambiarlo es una línea. Se fijó
`build.format: 'file'` y `trailingSlash: 'never'` para que las URL sean exactamente
`/cita/{slug}` sin barra final, como exige NFR-4.

**Fuera de alcance.** El `AGENTS.md` de la raíz declara en su bloque gestionado que
«no hay `package.json` todavía»; a partir de esta historia es falso. No se edita a mano
porque lo regenera `bmad-project-context`. Conviene volver a ejecutar esa skill al
cerrar la Épica 1.

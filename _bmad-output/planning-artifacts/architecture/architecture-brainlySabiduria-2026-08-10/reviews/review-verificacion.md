# Lente de verificación — ¿decidido contra la realidad o afirmado de memoria?

**Veredicto: pasa.** Ninguna versión de esta espina sale de memoria del modelo.

## Comprobado

- **Stack entero ratificado desde `package.json`** y no desde la web, aplicando lo que la propia espina v1 prescribió («el código pasa a ser el dueño en cuanto exista»). Astro ^7.2.0, Node >=22.12.0, TypeScript ^5.9.0, Pagefind ^1.5.2, `@astrojs/sitemap` ^3.7.3, `sharp` ^0.35.3, Vitest ^4.1.10, Playwright ^1.62.1, axe ^4.12.1.
- **Segundo plano leído de `medicion/wrangler.toml`:** Cloudflare Workers + D1, `compatibility_date = 2026-08-01`, observabilidad desactivada a propósito.
- **Hospedaje leído de `DESPLIEGUE.md`**, no supuesto: GitHub Pages con *Source = GitHub Actions*, repositorio `hectorglez4.github.io` para servir en la raíz, dominio `sabiduriadebolsillo.net` desde `public/CNAME`.
- **La aritmética de AD-16 es medida, no estimada:** 38 ficheros en `corpus/citas/`, objetivo ~2.000 en §6.1 del PRD → ~53×. No se afirma ningún coste por imagen en milisegundos, que sí habría sido invención.
- **El motor de vídeo se deja sin encoder a propósito.** Es la decisión correcta de verificación: FR-31 tiene una puerta que puede no abrirse nunca, y fijar hoy una versión sería vincular algo que caducará antes de usarse.

## Hallazgo (bajo) — trasladado a *Deferred*

AD-16 difiere el mecanismo de caché, pero el código se va a encontrar con una restricción que conviene no descubrir sola: ~2.000 PNG de tarjeta son del orden de cientos de MB de caché de CI, y las cachés de GitHub Actions se desalojan por falta de uso y tienen tope por repositorio. La reconstrucción diaria de AD-12 juega a favor (la caché se usa cada día, así que no caduca por desuso), pero el tamaño sí es una restricción real del mecanismo. Añadido como nota en *Deferred*.

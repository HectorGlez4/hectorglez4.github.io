---
title: "Addendum — Brief brainlySabiduria"
status: final
created: 2026-08-10
updated: 2026-08-10
---

# Addendum

Profundidad que no cabe en el brief pero que consumen los documentos aguas abajo (PRD, arquitectura, diseño de solución).

## Origen del corpus — opciones consideradas

Héctor decidió arrancar con **citas de dominio público** de autores/personas célebres. Contexto de la decisión, para que Arquitectura no lo redescubra:

| Vía | Qué habilita | Coste / riesgo |
|---|---|---|
| **Dominio público** (elegida) | Corpus limpio, sin dependencia de terceros, redistribuible sin fricción | Sesgo hacia figuras clásicas; requiere dato de fallecimiento del autor para poder filtrar |
| Derecho de cita | Amplía a figuras contemporáneas | Exige atribución rigurosa y fuente verificable por cita; más carga editorial |
| Traducción de corpus anglosajón | Hueco de mercado real en español | La traducción es obra derivada: solo limpio si el original ya es dominio público |
| Aportes de usuarios | Escala barata, comunidad | Necesita moderación y verificación de procedencia desde el día uno |

## Consecuencia sobre el modelo de datos

"Dominio público" no es una nota editorial, es una **restricción de esquema**. Para poder filtrar hay que modelar:

- La entidad **Autor** necesita año de fallecimiento (y nacionalidad, porque el plazo varía por jurisdicción). Sin ese campo, "dominio público" no es verificable ni auditable — es una promesa.
- La entidad **Cita** necesita **fuente/procedencia** (obra, año, o referencia). Una cita sin procedencia es una cita que no se puede defender, y las citas mal atribuidas son el defecto de calidad crónico de este vertical.
- Conviene un campo de **estado de derechos** en la cita, para que el criterio se pueda relajar más adelante (añadir derecho de cita, aportes de usuarios) sin rehacer la ingesta.

## Nota sobre plazos (no es asesoría legal)

El plazo de dominio público se cuenta desde el fallecimiento del autor y **varía por país**: 70 años es el estándar en España y Argentina, pero México llega a 100 y Colombia a 80. Como el sitio es panhispánico, el criterio conservador es tomar el plazo más largo del mercado objetivo. Consecuencia de producto: el corpus inicial escora hacia figuras clásicas (Cervantes, Quevedo, Sor Juana, Martí, Machado) y deja fuera a buena parte de los nombres contemporáneos en los que se apoya BrainyQuote. Hay que saberlo antes de construir, no después.

## Modelo de producto de referencia — piezas identificadas

Piezas separables del modelo, todas **dentro de la v1** por decisión de Héctor (paridad funcional completa; el recorte se hace en tamaño de corpus):

1. Página de cita individual (unidad SEO atómica)
2. Página de autor (agregación + biografía breve)
3. Página de tema/categoría (agregación transversal)
4. Buscador
5. Imagen compartible generada por cita
6. Cita del día / portada rotativa
7. Navegación por descubrimiento (relacionadas, "más de este autor")

### Reversión registrada

El facilitador recomendó dejar fuera de la v1 las piezas 5 y 7. Héctor revirtió la recomendación: la v1 es "lo mismo que el modelo de referencia sobre una base más pequeña". El razonamiento, para que el PRD no lo reabra: las piezas se sostienen entre sí, y un catálogo pequeño con todas las piezas cierra el circuito de tráfico, mientras que un catálogo grande al que le faltan piezas no lo cierra.

Consecuencia para Arquitectura: la **pieza 5 es el mayor coste técnico no evidente de la v1** (generación de imagen, tipografías embebidas, caché, CDN). Debe dimensionarse explícitamente y no tratarse como una tarea de UI. Es la primera candidata a diferirse si el plan de entrega se tensa.

## Nombre y dominio — verificación 2026-08-10

Método: `whois` contra el registry correspondiente (no vía IANA, que devuelve el registro del TLD) más comprobación de delegación DNS.

| Dominio | Estado |
|---|---|
| `sabiduriadiaria.com` | Libre — **elegido** |
| `sabiduriadiaria.net` / `.org` | Libres (registro defensivo opcional) |
| `sabiduriadebolsillo.com` | Registrado 2023-07-16, nameservers GoDaddy (aparcado) |
| `sabiduriaenbolsillo.com` | Libre |
| `sabiduriadecadadia.com`, `fraseshoy.com` | Libres (alternativas descartadas) |

TLD `.com` por coherencia panhispánica: un `.es` o `.mx` marca un país en la propia URL.

**Pendiente:** búsqueda de marca en OEPM y EUIPO. Solo se verificó disponibilidad de dominio.

# Propuesta de reuniones y separaciones de Obra — Historia 22.2

**Para:** Héctor. **Estado:** propuesta; **ninguna se ha aplicado**. Cada una se aplica con su
orden, en commit propio, antes de que la 22.4 publique ninguna URL de Obra.

Medido sobre el corpus del 2026-10-10 (base `f567f890`, con la grafía de Sor Juana ya
restituida). Reunir y separar editan solo las fichas de `corpus/obras/`: **ninguna Cita, ningún
documento y ninguna Procedencia cambian**. Reunir retira la ficha absorbida a
`corpus/_obras-retiradas/`, y su nombre —que es su URL futura— dará 404 cuando las Obras tengan
página (NFR-4, UX-DR50 f); hoy ninguna de las dos URL está publicada.

Lo que el build dice hoy, sin decidir nada: avisa de los dos pares de prefijo (Machado y
Unamuno) y construye. El par de Séneca no es de prefijo y no avisa: solo sale aquí.

---

## 0. «Respuesta a Sor/sor Filotea de la Cruz» — resuelto en esta historia, sin reunir nada

| | |
|---|---|
| Ficha | `sor-juana-ines-de-la-cruz--respuesta-a-sor-filotea-de-la-cruz.yml` — título «Respuesta a Sor Filotea de la Cruz» |
| Grafías antes | «Respuesta a Sor Filotea de la Cruz» ×20 (con documento) · «Respuesta a sor Filotea de la Cruz» ×1 (`sor-juana-ines-de-la-cruz-yo-no-estudio-para-saber-mas-sino`, en el censo) |
| Documento | `corpus/fuentes/wikisource-es--respuesta-a-sor-filotea-de-la-cruz.txt` — cabecera `obra: Respuesta a Sor Filotea de la Cruz`; declara `|autor = Sor Juana Inés de la Cruz` |

Era la misma forma con una grafía no literal, y la puerta ortográfica nueva rompía el build. Se
aplicó `npm run obra -- restituir-grafia sor-juana-ines-de-la-cruz-yo-no-estudio-para-saber-mas-sino`:
la Cita declara ahora la grafía de la cabecera, **sigue en el censo** (su texto no aparece
literal en el documento: la edición dice «sino sólo por ver si con estudiar ignoro menos») y
nada más ha cambiado. Queda una sola grafía; la Página de Cita pasa a decir «Sor».

---

## 1. «Del sentimiento trágico de la vida» / «Del sentimiento trágico de la vida/I» — Unamuno

| | `miguel-de-unamuno--del-sentimiento-tragico-de-la-vida.yml` | `miguel-de-unamuno--del-sentimiento-tragico-de-la-vida-i.yml` |
|---|---|---|
| Título | «Del sentimiento trágico de la vida» | «Del sentimiento trágico de la vida/I» |
| Formas | `del sentimiento tragico de la vida` | `del sentimiento tragico de la vida i` |
| Citas | 1, sin documento, en el censo: `miguel-de-unamuno-la-fe-que-no-duda-es-fe` («La fe que no duda es fe muerta.», año 1913) | 34, todas con documento (Wikisource) |
| Documento | — | `corpus/fuentes/wikisource-es--del-sentimiento-tragico-de-la-vida-i.txt` |

**Lo que dice la Fuente.** La cabecera del documento es `obra: Del sentimiento trágico de la
vida/I`, pero la declaración dice `|título=[[Del sentimiento trágico de la vida]]<br/>I<br/>El
hombre de carne y hueso`: la obra es el libro y «I» es la página —el capítulo I, «El hombre de
carne y hueso»— en la que Wikisource lo reparte. La «/I» es la ruta de la página, no otra obra.
El texto de la Cita del censo no aparece literal en ese documento (es de otro capítulo, o de
otra edición).

**Propuesta: reunir**, con el libro como destino, porque su nombre es la URL que tiene sentido
para la Obra entera:

```
npm run obra -- reunir miguel-de-unamuno--del-sentimiento-tragico-de-la-vida miguel-de-unamuno--del-sentimiento-tragico-de-la-vida-i
```

Consecuencias: la ficha destino reclama las dos formas (35 Citas), conserva el título «Del
sentimiento trágico de la vida» y la ficha «-i» se retira. **Ojo con el título:** lo sostiene
solo la Cita del censo. Si algún día se retira, `documentar --retirar` lo pasa en el mismo gesto
a «Del sentimiento trágico de la vida/I», que es la única grafía restante. Si se prefiere fijar
ya esa grafía literal: `npm run obra -- titular miguel-de-unamuno--del-sentimiento-tragico-de-la-vida "Del sentimiento trágico de la vida/I"`.

**Lo que hay que sopesar antes de reunir.** Tras reunir, el título de la Obra lo sostiene
**una sola Cita, y del censo**: una Cita sin documento, cuyo texto no aparece en el documento
versionado. Si se retira —lo más probable el día que se intente documentarla—, el título cae
solo a la única grafía que quede, «Del sentimiento trágico de la vida/I», que es la **ruta de
la página** en Wikisource y no un título: la Página de Obra de la 22.4 se llamaría así. La
alternativa de `titular` arriba no lo evita, porque esa grafía es la misma «…/I». Evitarlo de
verdad exige otra cosa que esta historia no hace: un documento de la obra entera, o decidir el
título cuando haya una grafía mejor declarada por una Fuente.

No es el caso de las fábulas de Fedro: allí cada fábula es una obra con título propio; aquí la
Fuente declara un solo libro repartido en páginas.

---

## 2. «Sobre la brevedad de la vida» frente a «De la brevedad de la vida» — Séneca

| | `seneca--de-la-brevedad-de-la-vida.yml` | `seneca--sobre-la-brevedad-de-la-vida.yml` |
|---|---|---|
| Título | «De la brevedad de la vida» | «Sobre la brevedad de la vida» |
| Formas | `de la brevedad de la vida` | `sobre la brevedad de la vida` |
| Citas | 33, todas con documento (Wikisource) | 2, sin documento, en el censo: `seneca-la-vida-si-sabes-usarla-es-larga` y `seneca-no-es-que-tengamos-poco-tiempo-es` (año 49, tecleado en la v1) |
| Documento | `corpus/fuentes/wikisource-es--de-la-brevedad-de-la-vida.txt` | — |

**Lo que dice la Fuente.** Cabecera `obra: De la brevedad de la vida`; declaración
`|título= De la brevedad de la vida`, `|autor=Séneca`; ningún año. «Sobre la brevedad de la
vida» no lo escribe ninguna Fuente versionada: es el título con que se tecleó en la v1. Las dos
son *De brevitate vitae*. Los textos de las dos Citas del censo no aparecen literales en el
documento: dicen lo mismo con otras palabras, que es lo propio de otra traducción.

No es un par de prefijo, así que el build no avisa; por eso solo sale aquí.

**Propuesta: reunir** en la ficha que respalda el documento:

```
npm run obra -- reunir seneca--de-la-brevedad-de-la-vida seneca--sobre-la-brevedad-de-la-vida
```

Consecuencias: 35 Citas en una Obra titulada «De la brevedad de la vida»; las dos del censo
siguen declarando «Sobre la brevedad de la vida» en su Procedencia (reunir no la reescribe) y
siguen en el censo.

**Lo que hay que sopesar antes de reunir.** Las dos Citas seguirán diciendo «Sobre la brevedad
de la vida» **en su Página de Cita**, porque la Procedencia no se toca, mientras la Página de
Obra a la que pertenecen se titula «De la brevedad de la vida». Y es probable que no sean de
esta edición sino de otra traducción: su texto no aparece en el documento. Reunir afirma que
son la misma Obra —cierto: es *De brevitate vitae*— pero no que vengan de esta Fuente, y el
visitante verá dos títulos para el mismo libro hasta que se documenten o se retiren. Alternativa sin reunir: documentarlas contra el documento cuando se
encuentre su texto en la edición (`npm run documentar -- <slug> corpus/fuentes/wikisource-es--de-la-brevedad-de-la-vida.txt --texto "…"`),
lo que cambiaría su obra a la del documento; o retirarlas. Mientras no se haga, reunir es lo
único que evita dos Páginas de Obra para el mismo libro.

---

## 3. Los dos «Proverbios y cantares» — Machado

| | `antonio-machado--proverbios-y-cantares.yml` | `antonio-machado--proverbios-y-cantares-nuevas-canciones.yml` |
|---|---|---|
| Título | «Proverbios y cantares» | «Proverbios y cantares (Nuevas Canciones)» |
| Formas | `proverbios y cantares` | `proverbios y cantares nuevas canciones` |
| Citas | 27: 26 con documento y 1 en el censo (`antonio-machado-es-de-necios-confundir-el-ruido-con`) | 8, todas con documento |
| Documento | `corpus/fuentes/wikisource-es--proverbios-y-cantares--proverbios-y-cantares-campos-de-castilla.txt` | `corpus/fuentes/wikisource-es--proverbios-y-cantares-nuevas-canciones.txt` |

**Lo que dice la Fuente.** El primero: cabecera `obra: Proverbios y cantares`, declaración
«Proverbios y cantares (Campos de Castilla)», `|título=Proverbios y cantares`, URL
`Proverbios_y_cantares_(Campos_de_Castilla)`. El segundo: cabecera y `|título=` «Proverbios y
cantares (Nuevas Canciones)», URL `Proverbios_y_cantares_(Nuevas_canciones)`. Ninguno declara
año. Son dos series de poemas distintas, de dos libros distintos (*Campos de Castilla* y *Nuevas
canciones*; las fechas, 1912 y 1924, no las declara la Fuente), con el mismo rótulo. El texto de la Cita del censo («Es de necios
confundir el ruido con la sabiduría.») no aparece literal en ninguno de los dos documentos.

**Propuesta: separar.** Son Obras distintas, y declararlo calla el aviso de prefijo:

```
npm run obra -- separar antonio-machado--proverbios-y-cantares antonio-machado--proverbios-y-cantares-nuevas-canciones
```

Consecuencias: cada ficha gana `distintaDe` con la forma de la otra; nada más cambia.

---

## Resumen

| Par | Propuesta | Orden |
|---|---|---|
| Sor Juana, «Sor/sor Filotea» | ya restituida (22.2) | — |
| Unamuno, «…de la vida» / «…/I» | reunir en `…-de-la-vida` | `npm run obra -- reunir miguel-de-unamuno--del-sentimiento-tragico-de-la-vida miguel-de-unamuno--del-sentimiento-tragico-de-la-vida-i` |
| Séneca, «Sobre/De la brevedad de la vida» | reunir en `de-la-…` | `npm run obra -- reunir seneca--de-la-brevedad-de-la-vida seneca--sobre-la-brevedad-de-la-vida` |
| Machado, los dos «Proverbios y cantares» | separar | `npm run obra -- separar antonio-machado--proverbios-y-cantares antonio-machado--proverbios-y-cantares-nuevas-canciones` |

Después de aplicar cualquiera: `npm run build` (sin avisos de prefijo si se aplican las de
Machado y Unamuno) y un commit propio con el motivo en el mensaje (AD-10).

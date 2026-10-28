---
title: 'Historia 26.11 — La Obra y los Directorios llegan juntos al sitio en vivo, y su fecha queda escrita'
type: 'operativa'
created: '2026-10-28'
status: 'in-review'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-23-11-la-lectura-se-mide-en-vivo-y-su-linea-base-empieza-a-contar.md'
---

# Historia 26.11 — La Obra y los Directorios llegan juntos al sitio en vivo, y su fecha queda escrita

Historia operativa que cierra la Épica 24 y la 26, que comparten rama (`v8/epicas-24-26`) y
entran en la principal en un solo merge. Este registro empieza por la parte previa al merge;
lo que viene después (build, `astro check`, Vitest, `npm run test:e2e` entero contra un
receptor local, NFR-7 con Lighthouse, merge, despliegue, comprobación con `curl` y el valor de
`DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS`) se anota aquí a medida que se haga.

La 26.10 (la revisión de las claves por Héctor) no está hecha y no bloquea este merge.

## Registro operativo

### 2026-10-28 18:00 UTC — preparación previa al merge (bucle v8-ralph)

**(a) La rama al día con la principal.** `git fetch origin` y `git merge origin/main`:
«Already up to date». La punta de `origin/main` es 881949f4d6 («chore(sprint): la 23.11 en
revisión (23.11)»), que ya es la base de la rama: la principal no ha recibido ningún commit
desde que llegó la 23, y no hubo commit de merge que hacer. El checkout principal tampoco
tiene commits de `main` sin publicar (`git log origin/main..main` vacío; su `main` local está
por detrás, en 62ab19f1). La rama lleva 124 commits sobre la base.

**(b) Lote de claves de orden de la 26.1, otra vez.** `npx tsx tools/autor.ts proponer-claves`
sobre la rama al día: «Ninguna clave nueva: no falta ninguna que la regla sepa proponer». Los
171 Autores de `corpus/autores/` tienen clave, ninguno con `ordenRevisado` (la 26.10 sigue
pendiente de Héctor). Sin cambios en el árbol, así que no hay commit de claves.

**(c) Ensayo del aviso sobre el rango sin desplegar (AD-27, 24.8).**
`npx tsx tools/avisar.ts --ensayo --desde 881949f4d6 --hasta HEAD` (salida 0, 0,07 s de
lectura del historial):

| familia    | cambian de fecha | se avisarían |
|------------|-----------------:|-------------:|
| cita       | 0 | 0 |
| autor      | 0 | 0 |
| tema       | 0 | 0 |
| coleccion  | 0 | 0 |
| obra       | 0 | 0 |
| directorio | 2 | 2 |
| portada    | — | 1 |

IndexNow avisaría **3 URL** de `sabiduriadebolsillo.net`: `/`, `/autores/` y `/obras/`. El
ensayo no envía nada.

Lectura: los 124 commits de la 24 y la 26 —incluido el lote de claves de los 171 Autores de la
26.1— no mueven la fecha de ninguna Cita, Autor, Tema, Colección ni Obra; solo nacen los dos
Directorios y la portada, que gana los enlaces de la cabecera. Es lo que pide la relación por
campos de la 24.8: el lote de claves no refecha el sitio. El rango no contiene ninguna sesión
de siembra (la principal no ha recibido ninguna desde la 23), así que la cifra de «cuántas
fechas mueve una sesión de siembra con la v8 puesta» no sale de aquí; queda por medir sobre la
primera sesión que se commitee con la v8 en la principal.

**(d) `npm run test:e2e` lleva los dos barridos.** `test:e2e` es `playwright test` sobre
`tests/e2e/` en los proyectos `movil` y `escritorio`, sin filtro de ficheros (1.004 pruebas en
27 ficheros, según `npx playwright test --list`). En `tests/e2e/accesibilidad.spec.ts`:

- el barrido WCAG 2.2 AA (23.4): `ETIQUETAS_DEL_BARRIDO` de `src/lib/superficies.ts` lleva
  `wcag22aa`; los bloques «Historia 2.8, elevada por la 23.4 — WCAG 2.2 AA» y «Historia 23.4 —
  lo que añade WCAG 2.2 AA» dan 27 pruebas por proyecto, y entre las superficies están
  `/autores` y `/obras`;
- el reflujo a 320 px de la 26.9: el bloque «Historia 26.9 — reflujo a 320 px» da 62 pruebas
  por proyecto, en sus tres condiciones (texto al 200 % simulado con `zoom: 2`, espaciado de
  1.4.12 y ancho de 320 px), con `/buscar/` con y sin resultados.

Ninguno de los dos bloques lleva `test.only`, `fixme` ni un `skip` por proyecto. El barrido
entero no se ha corrido todavía en esta preparación: es el paso siguiente de la historia.

### Pendiente

- `npm run build`, `astro check` y `npm test` sobre la rama, como el CI.
- `npm run test:e2e` entero contra el receptor local, con el resultado anotado aquí.
- NFR-7 a mano con Lighthouse (perfil móvil 4G) en una Página de Cita con la cabecera y la
  Tarjeta de Obra, frente a la principal del mismo día, las dos en local con la medición
  contra un receptor local; si se degrada, el merge espera a Héctor.
- El merge (bucle v8-ralph, con la autorización de Héctor del 2026-10-24), el despliegue, la
  comprobación con `curl` y, en un commit aparte del día de llegada, el valor de
  `DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS` (jornada UTC en que termina «Desplegar»).

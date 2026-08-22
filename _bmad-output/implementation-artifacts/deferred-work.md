# Trabajo diferido

Hallazgos reales que no son de la historia que los sacó a la luz. Append-only.

- source_spec: `_bmad-output/implementation-artifacts/spec-14-2-el-visitante-encuentra-como-sostener.md`
  summary: Que `dist/` sea idéntico al de la rama base no lo comprueba nada automáticamente.
  evidence: |-
    La prueba de reproducibilidad de `ingreso-construido.test.ts` compara dos construcciones
    del **mismo** árbol, que es determinismo y no invariancia. La afirmación de UX-DR35 que
    de verdad importa —que añadir la invitación apagada no cambia un solo byte del sitio— se
    verificó a mano en la 14.2 (worktree en la línea base y `diff -rq`: 669 ficheros
    idénticos) y nada la mantiene cierta. Es la comprobación que cazó el bloque `<style>`.

- source_spec: `_bmad-output/implementation-artifacts/spec-14-2-el-visitante-encuentra-como-sostener.md`
  summary: La invitación no pasa nunca por el barrido de accesibilidad, ni siquiera el día que se encienda.
  evidence: |-
    `tests/e2e/accesibilidad.spec.ts` corre contra el sitio del repositorio, donde las
    donaciones están apagadas y el bloque no existe; y el flujo de CI no ejecuta los e2e.
    Así que la zona de toque de `--zona-de-toque`, el contraste de `--tinta-apagada`, el
    anillo de foco y el aviso de pestaña nueva solo se comprueban en el único estado en que
    no hay nada que comprobar. El gancho `ficheros` hace factible un barrido con el Modelo
    encendido.

- source_spec: `_bmad-output/implementation-artifacts/spec-14-2-el-visitante-encuentra-como-sostener.md`
  summary: La guarda del dominio de la Historia 7.1 se relajó más de lo que exigía el falso positivo.
  evidence: |-
    Pasó de `/sabiduriadebolsillo/i` a comparar contra `DOMINIO` entero, así que un
    `sabiduriadebolsillo.com` escrito a mano, o la etiqueta suelta concatenada con su TLD,
    ya no la disparan. El cambio lo forzó el identificador de Ko-fi, que coincide con la
    etiqueta del dominio. Un revisor lo comprobó y hoy no cuesta nada real —el control
    positivo nuevo fija que `DOMINIO` está bien formado—, pero es una guarda de la Épica 7,
    que sigue abierta, y la decisión de estrecharla otra vez es de su dueño.

- source_spec: `_bmad-output/implementation-artifacts/spec-14-2-el-visitante-encuentra-como-sostener.md`
  summary: La prueba que enciende el Modelo parchea la fuente con una expresión regular sensible al formato.
  evidence: |-
    `/(id: 'donaciones',[\s\S]*?)encendido: false,/` depende del orden de los campos y de que
    nadie reformatee ese literal. Sus dos aserciones prueban que **algo** cambió y que queda
    exactamente un `encendido: true`, no que cambiara la entrada de donaciones. Vive solo en
    pruebas, así que su fallo sería ruidoso y no silencioso.

- source_spec: sesión de sembrado del 2026-08-22
  summary: El suelo del 40 % de tradición latinoamericana cuenta autores declarados, no autores con Citas publicadas.
  evidence: |-
    `src/lib/huecos.ts:182` hace `const total = autores.length`, así que el porcentaje incluye
    a quien no ha publicado nada. Con el Corpus de 195 Citas, la herramienta informaba 7/17 =
    41,2 % —por encima del suelo—, pero dos de esos siete, Amado Nervo y Ricardo Palma, no
    tenían ni una Cita. Medido sobre autores que el visitante puede ver: 5/15 = 33,3 %, por
    debajo del suelo comprometido. Choca con la Historia 1.3, «lo no publicado no existe para
    el build», que es el principio del que sale todo lo demás. Decidir si el suelo se mide
    sobre declarados o sobre publicados es de producto, no de implementación; medirlo sobre
    Citas en vez de sobre autores es una tercera lectura, y hoy daría 36,3 %.

- source_spec: sesión de sembrado del 2026-08-22
  summary: `tools/recuperar.ts` no retira las plantillas de mantenimiento de Wikisource, y su texto llega a proponerse como Cita.
  evidence: |-
    Al recuperar «Nuestra América» y el «Prólogo al Poema del Niágara», el documento versionado
    se quedó con el aviso de Wikisource sobre fuente no especificada, y `tools/extraer.ts`
    propuso como candidatas frases suyas —«A menos que se añada información de derechos de
    autor y/o la fuente de este texto…»— atribuidas a José Martí. Ninguna puerta lo caza: es
    español perfectamente legible, así que la de la 11.5 lo pasa, y está literal en el
    documento, así que el cotejo de la 11.2 lo daría por bueno. Se puede publicar un aviso
    legal de Wikisource firmado por un Autor. Aparte de retirar la plantilla, la presencia de
    ese aviso es señal editorial de que la transcripción no declara su edición de origen, que
    es más débil de lo que piden FR-23 y FR-24; esta sesión descartó las dos fuentes por eso.

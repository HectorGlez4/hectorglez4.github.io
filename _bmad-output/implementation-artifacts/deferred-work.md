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

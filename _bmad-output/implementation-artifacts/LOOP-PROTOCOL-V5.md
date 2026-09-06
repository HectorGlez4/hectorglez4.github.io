# Protocolo del bucle de Corpus — v5 (Los clásicos)

Estado durable del bucle autónomo de la v6. **Si el contexto se compacta o se limpia, este
fichero manda.** Los otros dos orígenes de verdad son `sprint-status.yaml`, que dice por
dónde va, y `npm run huecos`, que dice qué toca ahora.

Sucede a `LOOP-PROTOCOL-V4.md`, que sigue siendo válido en todo lo que este no contradiga.
Lo que sí contradice está en «Lo que cambia respecto a la v4».

## Por qué existe este bucle

El 2026-09-05 `npm run huecos` cerraba con **«Meta de Corpus alcanzada. El listón siguiente
lo pone Héctor.»** El bucle de la v4 se quedó sin hueco del que derivar trabajo.

Y mientras tanto, la primera medición de demanda —2026-09-04, Search Console— enseñó que
**el Corpus está invertido respecto a lo que se busca**: Manuel González Prada aporta 154
Citas y Federico García Lorca aporta 1. No es un error de nadie: hasta el 2 de septiembre no
había demanda medida que consultar, así que el Corpus creció por lo único que podía guiarlo,
que era la disponibilidad.

Este bucle lo gira hacia donde hay búsqueda: **filosofía antigua y teología, en profundidad
por Autor.**

## Lo que cambia respecto a la v4

**1. El suelo panhispánico cambió de denominador, no de valor.** Se mide sobre **todos los
Autores menos los de tradición `otra`**, no sobre el Corpus entero. Hoy va al 56,2 %. Un
clásico que entra como `otra` **no lo mueve**. Sin este cambio, cuarenta clásicos nuevos
habrían tirado el indicador al 24 % sin que un solo autor hispánico cambiara de sitio.

*(Precisado el 2026-09-05, en la revisión de la 19.2.)* Esta línea decía «`latinoamericana` +
`peninsular`», y con ese denominador **los Autores sin tradición declarada quedaban fuera**:
un Corpus con 34 sin clasificar y un solo latinoamericano declarado informaba el 100 % y «por
encima del suelo», o sea que un fallo de captura mejoraba el indicador. Cuentan dentro, que es
la lectura conservadora: un dato que falta nunca declara cumplido un compromiso. Lo que sí
salió del denominador —y es lo que la historia venía a cambiar— son los de tradición `otra`.

**2. El año de la traducción se conserva si la Fuente lo da, y no se exige si no.** *(Suavizado
el 2026-09-05, tras la sonda.)* Se pensó primero como puerta que rompía el build. La sonda
sobre Wikisource-es enseñó dos cosas: que el dato **vive en la edición y no en la obra** —Fedón
declara «Azcárate, 1871» y Critón, de la misma edición, no declara nada—, y que exigirlo
habría dejado en falta 165 Citas ya publicadas de Séneca por un dato que la Fuente no da.

La comprobación que de verdad protege ya existe y está un nivel más arriba: **el conjunto
cerrado de `tools/lib/fuentes.ts` solo admite Fuentes cuya licencia permite reutilización**, y
por eso rechaza a Cervantes Virtual. Wikisource solo aloja dominio público. **El bucle no
necesita verificar nada por su cuenta más allá de sembrar desde Fuentes admitidas.**

Lo que sí se hace: conservar traductor y año cuando el encabezado los trae, y contar en el
informe cuántas Citas de obra traducida no los traen. Cifra, no bloqueo.

**3. Se prioriza por demanda, no por disponibilidad.** Es la corrección de rumbo entera. Entre
dos Autores admisibles entra antes el que más se busca — y si algún día hay serie de Search
Console con volumen, manda ella y no la intuición.

## Lo que NO cambia

- **La puerta completa se pasa antes de cada push.** `main` no se deja en rojo.
- Dominio público, año de fallecimiento del Autor, Procedencia, y cotejo contra el documento
  versionado. La apertura a los clásicos **no abre ninguna puerta de admisión**.
- El techo de concentración por Autor rige sin excepción. «En profundidad» no significa que
  uno solo pese más: significa que el total crece en paralelo.
- Ni se traducen Citas, ni se rastrean sitios de citas. Las dos prohibiciones de la Épica 9
  siguen enteras.
- Cada sesión se registra con `npm run sesion:registrar`.

## De dónde sale el trabajo de cada sesión

En este orden, y sin saltarse ninguno:

1. `npm run huecos` — dice el hueco y el tramo. **Manda sobre cualquier idea previa.**
2. Si el hueco es de clásicos, elegir Autor **por demanda**, no por lo que haya a mano.
3. Comprobar que su obra está en una **Fuente admitida** y que la traducción declara año.
4. `npm run recuperar` → `npm run extraer` → aprobar por lote. Las herramientas de la Épica 9,
   sin esquivar nada.
5. `npm run sesion:registrar`.
6. Puerta completa, y push.

## Lo que este bucle NO arregla, y conviene tenerlo delante

**El sitio tiene 2 URL indexadas de 1.715.** Sembrar más Citas multiplica páginas que Google
no está rastreando. Este bucle es correcto y es lento —el Corpus tarda meses, y el día que la
indexación se arregle tiene que estar ya hecho—, pero **no sustituye a la Épica 18**, que es
la que ataca la causa medida. Si alguna vez hay que elegir entre una sesión de este bucle y
una hora de la Épica 18, gana la Épica 18.

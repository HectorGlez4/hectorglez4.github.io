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

**1. El suelo panhispánico cambió de denominador, no de valor.** Se mide sobre Autores de
tradición hispánica —`latinoamericana` + `peninsular`—, no sobre el Corpus entero. Hoy va al
56,2 %. Un clásico que entra como `otra` **no lo mueve**. Sin este cambio, cuarenta clásicos
nuevos habrían tirado el indicador al 24 % sin que un solo autor hispánico cambiara de sitio.

**2. Hay una puerta nueva y es previa a todo: la Historia 19.1.** Para una obra traducida, el
año que decide el dominio público es el de **la traducción**, no el de la obra. Platón murió
hace veinticuatro siglos y su traductor pudo morir en 1980. Hasta que esa puerta esté en el
build, **este bucle no siembra clásicos traducidos**. No es prudencia: es que la regla existe
desde la v4 y vive en un comentario, y un bucle a volumen publicaría textos cuyo estado de
derechos no verificó nadie.

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

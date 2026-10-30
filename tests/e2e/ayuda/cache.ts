import { test, type BrowserContext, type Page, type PlaywrightWorkerArgs } from '@playwright/test';

/** Lo que cada prueba pone alrededor de la página que recorre con la caché de verdad. */
export interface PreparacionDeLaCache {
  /** Antes del recorrido, con la página ya abierta: espías, rutas, guiones de inicio. */
  preparar?: (pagina: Page, contexto: BrowserContext) => Promise<void>;
  /** Tras cada restauración comprobada, antes de seguir: quedarse en la ruta, por ejemplo. */
  alRestaurar?: (pagina: Page, contexto: BrowserContext) => Promise<void>;
}

/**
 * Con la caché de atrás y adelante de verdad — Historias 23.5, 23.8 y 27.4: un Chromium completo,
 * lanzado sin `--disable-back-forward-cache` (Playwright la apaga por omisión), y un sitio que se
 * sirva `max-age=600` (`no-store` deja la página fuera de la caché). Lo que cada prueba pone
 * alrededor —espías, rutas, qué hacer al volver— llega en `preparacion`.
 *
 * `restaurada()` vuelve atrás y **comprueba** que la página salió de la caché —un `pageshow` con
 * `persisted` en ese documento, contado: una segunda vuelta al mismo documento exige una segunda
 * restauración, no la de la primera—. Si no la hubo, salta la prueba diciendo el motivo que da el
 * navegador por CDP (`Page.backForwardCacheNotUsed`): una prueba con caché que no restaura no
 * prueba nada y no puede pasar en verde.
 */
export async function conLaCacheDeVerdad(
  playwright: PlaywrightWorkerArgs['playwright'],
  preparacion: PreparacionDeLaCache,
  recorrido: (pagina: Page, restaurada: () => Promise<void>) => Promise<void>,
) {
  let navegador: Awaited<ReturnType<typeof playwright.chromium.launch>>;
  try {
    navegador = await playwright.chromium.launch({
      channel: 'chromium',
      ignoreDefaultArgs: ['--disable-back-forward-cache'],
    });
  } catch (error) {
    test.skip(true, `no se pudo lanzar el Chromium completo sin cabeza: ${String(error).split('\n')[0]}`);
    return;
  }
  try {
    const contexto = await navegador.newContext();
    const pagina = await contexto.newPage();
    const cdp = await contexto.newCDPSession(pagina);
    await cdp.send('Page.enable');
    const sinCache: string[] = [];
    cdp.on('Page.backForwardCacheNotUsed', (evento) => {
      for (const explicacion of evento.notRestoredExplanations) sinCache.push(explicacion.reason);
    });
    await preparacion.preparar?.(pagina, contexto);
    await pagina.addInitScript(() => {
      const ventana = window as unknown as { __documento: string; __restauraciones: number; __restaurada: boolean };
      ventana.__documento = `${Date.now()}-${Math.random()}`;
      ventana.__restauraciones = 0;
      ventana.__restaurada = false;
      addEventListener('pageshow', (evento) => {
        if (!(evento as PageTransitionEvent).persisted) return;
        ventana.__restauraciones++;
        ventana.__restaurada = true;
      });
    });
    /** Por documento, cuántas restauraciones se han visto ya. */
    const vistas = new Map<string, number>();
    /** Vuelve atrás y espera a la restauración; si no la hubo, salta la prueba. */
    const restaurada = async () => {
      await pagina.goBack({ waitUntil: 'commit' });
      const lo = async () =>
        pagina
          .evaluate(() => {
            const v = window as unknown as { __documento?: string; __restauraciones?: number };
            return { documento: v.__documento ?? '', restauraciones: v.__restauraciones ?? 0 };
          })
          .catch(() => ({ documento: '', restauraciones: 0 }));
      const nueva = async () => {
        const { documento, restauraciones } = await lo();
        return restauraciones > (vistas.get(documento) ?? 0) ? { documento, restauraciones } : null;
      };
      const hasta = Date.now() + 3_000;
      let vista = await nueva();
      while (!vista && Date.now() < hasta) {
        await new Promise((r) => setTimeout(r, 100));
        vista = await nueva();
      }
      test.skip(!vista, `Chromium no restauró la página de la caché de atrás y adelante: ${sinCache.join(', ') || 'sin motivo'}`);
      vistas.set(vista!.documento, vista!.restauraciones);
      await preparacion.alRestaurar?.(pagina, contexto);
    };
    await recorrido(pagina, restaurada);
  } finally {
    await navegador.close();
  }
}

import { defineConfig, devices } from '@playwright/test';

// Las pruebas funcionales corren contra el sitio ya construido, no contra `astro dev`.
// Es deliberado: lo que se verifica es el artefacto que se despliega. Un fallo que
// solo aparece en `dist/` — una página que no se generó, una entrada que sobra en el
// sitemap — es invisible si se prueba el servidor de desarrollo.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'movil',
      use: { ...devices['Pixel 7'], viewport: { width: 360, height: 640 } },
    },
    {
      name: 'escritorio',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } },
    },
  ],
  /*
   * Historia 23.2 — dos servidores: el receptor local y el sitio construido **con** punto final.
   *
   * Las construcciones de rama con medición apuntan a `wrangler dev` con un D1 local, nunca a
   * producción: así las pruebas ven el fichero de medición que se despliega, las balizas salen
   * de verdad y el D1 local las guarda con el receptor de esta rama. `npm run medicion -- local`
   * aplica antes las migraciones al D1 local (`medicion/.wrangler/`, que no se versiona), y
   * contesta 204 a todo, también a la petición con la que Playwright espera a que arranque.
   */
  webServer: [
    {
      command: 'npm run medicion -- local',
      url: 'http://localhost:8787',
      reuseExistingServer: false,
      timeout: 180_000,
      stdout: 'ignore',
      // `wrangler dev` cierra su D1 local con un SIGTERM; sin él, Playwright lo mata en seco.
      gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
    },
    {
      // `astro preview` se demoniza en Astro 7 y deja el servidor de fondo, así que
      // Playwright acababa hablando con un demonio huérfano que servía un `dist/` viejo.
      // `tests/servidor.mjs` se queda en primer plano y sirve igual que el alojamiento.
      command: 'npm run build && node tests/servidor.mjs',
      url: 'http://localhost:4321',
      reuseExistingServer: false,
      timeout: 180_000,
      stdout: 'ignore',
      env: { MEDICION_ENDPOINT: 'http://localhost:8787/' },
    },
  ],
});

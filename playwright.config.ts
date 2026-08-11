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
  webServer: {
    command: 'npm run build && npm run preview -- --port 4321',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});

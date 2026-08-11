import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    // Las pruebas que invocan `astro build` sobre un corpus de prueba son lentas
    // por naturaleza; el suelo por defecto de 5 s las hace fallar sin motivo.
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});

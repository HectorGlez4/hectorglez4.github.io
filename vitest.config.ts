import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    // Las pruebas que invocan `astro build` sobre un corpus de prueba son lentas
    // por naturaleza; el suelo por defecto de 5 s las hace fallar sin motivo.
    testTimeout: 120_000,
    hookTimeout: 120_000,

    // Los proyectos temporales enlazan el `node_modules` de la raíz en lugar de
    // copiarlo, así que todos comparten la caché de Vite en `node_modules/.vite`.
    // Dos builds a la vez la reoptimizan al mismo tiempo y uno de los dos se cae
    // con un fallo que no tiene nada que ver con lo que la prueba mide. Copiar
    // `node_modules` por proyecto costaría más que el build; serializar cuesta
    // unos segundos y elimina la carrera de raíz.
    fileParallelism: false,
    sequence: { concurrent: false },
  },
});

import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import path from 'path';

export default defineConfig(({ mode }) => ({
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    test: {
        environment: 'node',
        include: ['**/*.test.ts', '**/*.test.tsx'],
        // Local integration tests (e.g. OpenTax-AU adapters) read OPENTAX_* from .env.local
        env: loadEnv(mode, __dirname, 'OPENTAX_'),
    },
}));

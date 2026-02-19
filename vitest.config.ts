import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    root: __dirname,
    plugins: [react()],
    test: {
        globals: true,
        environment: 'happy-dom',
        include: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
        exclude: ['node_modules', '.next'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            include: ['app/**/*.tsx', 'components/**/*.tsx', 'hooks/**/*.ts', 'utils/**/*.ts'],
            exclude: ['**/*.test.*', '**/*.spec.*'],
        },
        setupFiles: ['./test/setup.ts'],
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './'),
        },
    },
});

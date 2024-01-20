import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import { externalizeDeps } from 'vite-plugin-externalize-deps';
import dtsPlugin from 'vite-plugin-dts';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        // https://github.com/vitejs/vite/discussions/6198
        externalizeDeps(),
        dtsPlugin({
            insertTypesEntry: true,
            rollupTypes: true,
        }),
    ],
    build: {
        lib: {
            entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
            fileName: 'index',
            formats: ['es'],
        },
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
});

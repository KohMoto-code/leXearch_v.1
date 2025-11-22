import { defineConfig, loadEnv } from 'vite';
import path from 'path';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    return {
        build: {
            emptyOutDir: false,
            outDir: 'dist',
            rollupOptions: {
                input: {
                    background: path.resolve(__dirname, 'src/background.ts'),
                },
                output: {
                    format: 'iife',
                    entryFileNames: '[name].js',
                    name: 'LexearchBackground',
                    extend: true,
                    inlineDynamicImports: true,
                }
            }
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, '.'),
            }
        },
        define: {
            'process.env.GEMINI_PROXY_URL': JSON.stringify(env.VITE_GEMINI_PROXY_URL),
        }
    };
});

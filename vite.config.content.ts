import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    return {
        plugins: [react()],
        build: {
            emptyOutDir: false, // Don't clear dist, as we build background separately
            outDir: 'dist',
            rollupOptions: {
                input: {
                    content: path.resolve(__dirname, 'src/content.tsx'),
                },
                output: {
                    format: 'iife',
                    entryFileNames: '[name].js',
                    assetFileNames: 'assets/style.[ext]', // Force CSS to be named style.css
                    name: 'LexearchContent', // Global variable name for IIFE
                    extend: true,
                    inlineDynamicImports: true, // Bundle everything into one file
                }
            },
            minify: false, // Disable minification for debugging
            sourcemap: true, // Enable sourcemaps
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, '.'),
            }
        },
        define: {
            'process.env.NODE_ENV': JSON.stringify('production'),
            'process.env.GEMINI_PROXY_URL': JSON.stringify(env.VITE_GEMINI_PROXY_URL),
        }
    };
});

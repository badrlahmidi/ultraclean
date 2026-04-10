import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input: 'resources/js/app.jsx',
            refresh: true,
        }),
        react(),
    ],
    server: {
        host: 'localhost', // Force IPv4 — évite que Vite bind sur ::1 (IPv6 invalide en CSP)
        port: 5173,
		strictPort: true,
    },
    optimizeDeps: {
        include: ['react-is'],
    },
});

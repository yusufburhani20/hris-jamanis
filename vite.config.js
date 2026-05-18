import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input: 'resources/js/app.tsx',
            refresh: true,
        }),
        react(),
    ],

    server: { // Tambahkan blok server ini
        host: '127.0.0.1', // Mengizinkan akses lokal
        // hmr: {
        //     host: '192.168.1.33', // IP PC host Bapak agar HMR (auto-refresh) jalan di HP
        // },
    },
    optimizeDeps: {
        include: ['recharts', 'react-is'],
    },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Firestore pesa ~170 KB comprimido; es normal y no hace falta el aviso
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Firebase va en su propio archivo para que la app cargue más liviana
        manualChunks: { firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'] },
      },
    },
  },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Follow Three.js's existing core/renderer boundary for independent caching.
          if (id.includes('/node_modules/three/build/three.core.js')) return 'three-core';
          if (id.includes('/node_modules/three/')) return 'three-renderer';
        },
      },
    },
  },
  server: {
    port: 5184,
    strictPort: true,
  },
});

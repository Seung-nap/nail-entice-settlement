import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: { port: 5188, strictPort: true, watch: { ignored: ['**/release/**', '**/dist/**', '**/electron/**', '**/scripts/**'] } },
  build: { outDir: 'dist', chunkSizeWarningLimit: 4000, target: 'chrome130' },
  optimizeDeps: { include: ['exceljs', 'hyperformula'] },
});

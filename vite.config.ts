import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  base: './',
  plugins: [preact()],
  worker: { format: 'es' },
  build: { target: 'es2022', sourcemap: false },
});

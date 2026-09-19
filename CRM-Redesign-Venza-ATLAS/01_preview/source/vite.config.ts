import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'node:path';

// SINGLE=1 → один самодостаточный index.html (для публикации ссылки-превью)
export default defineConfig({
  plugins: [react(), ...(process.env.SINGLE ? [viteSingleFile()] : [])],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  // Встраиваем ассеты только в однофайловой сборке; обычная отдаёт шрифты и видео отдельными файлами (кэшируются)
  build: { assetsInlineLimit: process.env.SINGLE ? 200000 : 4096, chunkSizeWarningLimit: 2000 },
});

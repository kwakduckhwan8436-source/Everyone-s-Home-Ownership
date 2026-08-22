/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// 기본 빌드는 '단일 HTML'(더블클릭 실행 + GitHub Pages/Render 모두 가능).
// 자산을 분리한 일반 빌드가 필요하면  SINGLE=0 npm run build.
const single = process.env.SINGLE !== '0';

export default defineConfig({
  base: './',
  plugins: [react(), ...(single ? [viteSingleFile()] : [])],
  build: { cssCodeSplit: false, assetsInlineLimit: 100_000_000 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});

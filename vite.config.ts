import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // .env.local 파일에서 환경 변수를 로드합니다.
  const env = loadEnv(mode, process.cwd(), '');
  const actualKey = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY;

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      // 소스 코드 내에서 예상되는 모든 변수명을 실제 키값으로 강제 치환합니다.
      'process.env.API_KEY': JSON.stringify(actualKey),
      'process.env.GEMINI_API_KEY': JSON.stringify(actualKey),
      'process.env.VITE_GEMINI_API_KEY': JSON.stringify(actualKey),
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(actualKey),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
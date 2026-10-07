import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';

// Cabeçalhos de segurança: os mesmos do vercel.json (produção), aplicados também no `npm run preview`
// para testar localmente. Fonte única: vercel.json.
const vercelHeaders: { key: string; value: string }[] =
  JSON.parse(readFileSync(path.resolve(__dirname, 'vercel.json'), 'utf8')).headers[0].headers;
const securityHeaders = Object.fromEntries(
  vercelHeaders
    .filter(h => h.key !== 'Strict-Transport-Security') // HSTS só faz sentido em HTTPS (produção)
    .map(h => [h.key, h.key === 'Content-Security-Policy' ? h.value.replace('; upgrade-insecure-requests', '') : h.value]),
);

export default defineConfig({
  server: {
    port: 3000,
    // Só acessível neste computador. Para abrir em outro aparelho da rede: npm run dev -- --host
    host: 'localhost',
  },
  preview: {
    headers: securityHeaders,
  },
  build: {
    sourcemap: false, // não publica o código-fonte original
  },
  plugins: [react()],
  // Observação de segurança: NÃO use "define" para injetar chaves de API (ex.: GEMINI_API_KEY).
  // Tudo que vai para o navegador fica público. Chaves secretas só em funções de servidor.
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});

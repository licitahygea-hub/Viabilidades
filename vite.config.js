import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `npm run build` gera a pasta dist/ para hospedar.
// `npm run build:arquivo-unico` gera um único dist/index.html (abre direto no navegador).
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'single' ? [viteSingleFile()] : [])],
  base: './',
  server: { host: true },
}))

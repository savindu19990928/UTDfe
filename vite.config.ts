import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist",
    target: "esnext",
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000
  }
})

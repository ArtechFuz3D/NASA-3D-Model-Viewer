import { defineConfig } from 'vite'
import glsl from 'vite-plugin-glsl'

export default defineConfig({
  base: './',   // relative paths so GH Pages serves assets correctly
  server: {
    port: 5173,
    open: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false
  },
  plugins: [
    glsl()  // enables: import vertShader from './shaders/vert.glsl'
  ]
})
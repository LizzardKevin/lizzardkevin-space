import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  /** 相对路径，便于解压后用本地静态服务器直接打开 */
  base: "./",
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "react-vendor",
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 30,
            },
            {
              name: "rapier-vendor",
              test: /node_modules[\\/](@react-three[\\/]rapier|@dimforge)[\\/]/,
              priority: 25,
            },
            {
              name: "three-vendor",
              test: /node_modules[\\/](three|@react-three|@react-spring|@use-gesture|zustand|troika-three-text|troika-worker-utils|camera-controls|meshline)[\\/]/,
              priority: 20,
              maxSize: 450_000,
            },
          ],
        },
      },
    },
  },
})

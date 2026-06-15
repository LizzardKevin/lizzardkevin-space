import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const KNOWN_LAZY_VENDOR_WARNING_LIMIT_KB = 3300

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  /** 相对路径，便于解压后用本地静态服务器直接打开 */
  base: "./",
  build: {
    modulePreload: false,
    chunkSizeWarningLimit: KNOWN_LAZY_VENDOR_WARNING_LIMIT_KB,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "vite-preload-helper",
              test: (id) => id.includes("vite/preload-helper"),
              priority: 40,
            },
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

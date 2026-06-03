import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  /** 相对路径，便于解压后用本地静态服务器直接打开 */
  base: "./",
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages 部署需要设置 base 为仓库名
  // 本地开发时用 '/'，部署前改为 '/仓库名/'
  base: process.env.NODE_ENV === 'production' ? '/AI_Novel/' : '/',
})

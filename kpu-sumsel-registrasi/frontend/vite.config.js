import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'serve-logo',
      configureServer(server) {
        server.middlewares.use('/logo.png', (_req, res) => {
          const logoPath = path.resolve(__dirname, 'logo.png');
          if (fs.existsSync(logoPath)) {
            res.setHeader('Content-Type', 'image/png');
            res.end(fs.readFileSync(logoPath));
          } else {
            res.statusCode = 404;
            res.end();
          }
        });
      },
      closeBundle() {
        const src = path.resolve(__dirname, 'logo.png');
        const dest = path.resolve(__dirname, 'dist', 'logo.png');
        if (fs.existsSync(src) && !fs.existsSync(dest)) {
          fs.copyFileSync(src, dest);
        }
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});

import { defineConfig } from 'vite';
import { resolve } from 'path';
import { apiMiddleware } from './api-middleware.js';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main:       resolve(__dirname, 'index.html'),
        admin:      resolve(__dirname, 'admin.html'),
        adminLogin: resolve(__dirname, 'admin-login.html'),
      },
    },
  },
  server: {
    host: true
  },
  plugins: [
    {
      name: 'api-server',
      configureServer(server) {
        server.middlewares.use(apiMiddleware);
      }
    }
  ]
});

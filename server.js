import express from 'express';
import cors from 'cors';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { apiMiddleware } from './api-middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Helper to send static files with no-cache headers for instant updates
const sendNoCacheFile = (filePath, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(resolve(__dirname, filePath));
};

// Serve static images and public assets
app.use('/images', express.static(resolve(__dirname, 'images')));
app.use('/public', express.static(resolve(__dirname, 'public')));

// Explicit route handlers for admin files with no-cache headers
app.get('/admin.html', (req, res) => sendNoCacheFile('admin.html', res));
app.get('/admin', (req, res) => sendNoCacheFile('admin.html', res));
app.get('/admin.js', (req, res) => sendNoCacheFile('admin.js', res));
app.get('/style.css', (req, res) => sendNoCacheFile('style.css', res));
app.get('/app.js', (req, res) => sendNoCacheFile('app.js', res));

// Mount API middleware directly
app.use(apiMiddleware);

// Serve static files from root folder and dist
app.use(express.static(__dirname));
app.use(express.static(resolve(__dirname, 'dist')));

// Fallback all non-API requests to index.html
app.get('*', (req, res) => {
  res.sendFile(resolve(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Production server running on port ${PORT}`);
});

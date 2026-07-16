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

// Serve static images and public assets
app.use('/images', express.static(resolve(__dirname, 'images')));
app.use('/public', express.static(resolve(__dirname, 'public')));

// Serve root static assets directly for instant update without build
app.get('/style.css', (req, res) => res.sendFile(resolve(__dirname, 'style.css')));
app.get('/app.js', (req, res) => res.sendFile(resolve(__dirname, 'app.js')));
app.get('/admin.js', (req, res) => res.sendFile(resolve(__dirname, 'admin.js')));

// Temporary debug route to get Render outbound IP
app.get('/api/debug-ip', async (req, res) => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Mount API middleware directly (avoid express.json() because apiMiddleware handles raw streams)
app.use(apiMiddleware);

// Serve static files from root folder (and fallback to dist if exists)
app.use(express.static(__dirname));
app.use(express.static(resolve(__dirname, 'dist')));

// Fallback all non-API requests to index.html
app.get('*', (req, res) => {
  res.sendFile(resolve(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Production server running on port ${PORT}`);
});

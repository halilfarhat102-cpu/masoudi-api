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

// Mount API middleware directly (avoid express.json() because apiMiddleware handles raw streams)
app.use(apiMiddleware);

// Serve compiled static admin panel and homepage
app.use(express.static(resolve(__dirname, 'dist')));

// Fallback all non-API requests to index.html
app.get('*', (req, res) => {
  res.sendFile(resolve(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Production server running on port ${PORT}`);
});

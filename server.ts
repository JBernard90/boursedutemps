import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import app from './api/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function startServer() {
  const PORT = parseInt(process.env.PORT || '3000', 10);

  if (process.env.NODE_ENV !== 'production') {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true, hmr: false },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.error('Vite init failed:', e);
      app.use(express.static('dist'));
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api/')) return next();
        res.sendFile(resolve(__dirname, 'dist/index.html'));
      });
    }
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(resolve(__dirname, 'dist/index.html'));
    });
  }

  // Fallback 404 API (JSON)
  app.use('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API endpoint introuvable', success: false });
  });

  // Gestionnaire d'erreurs global
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[Server Error]', err);
    if (req.path.startsWith('/api/')) {
      return res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        success: false,
      });
    }
    next(err);
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] En cours sur le port ${PORT}`);
  });
}

startServer().catch(console.error);

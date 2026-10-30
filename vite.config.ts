/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const FUNCTIONS = new Set(['analyze', 'config']);

/**
 * Dev/preview convenience: serves /api/<name> by invoking netlify/functions/<name>.ts
 * directly, so `npm run dev` works without netlify-cli. In production Netlify
 * serves the same files via the /api/* redirect in netlify.toml.
 */
function localFunctions(): Plugin {
  return {
    name: 'pondera-local-functions',
    configureServer(server) {
      // Make server-only env vars (non-VITE_) available to the function code.
      const env = loadEnv(server.config.mode, process.cwd(), '');
      for (const [k, v] of Object.entries(env)) if (!(k in process.env)) process.env[k] = v;

      server.middlewares.use(async (req, res, next) => {
        const m = req.url?.match(/^\/api\/([a-z]+)(?:\?.*)?$/);
        if (!m || !FUNCTIONS.has(m[1])) return next();
        try {
          const chunks: Buffer[] = [];
          for await (const c of req) chunks.push(c as Buffer);
          const body = Buffer.concat(chunks);
          const headers = new Headers();
          for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
          const request = new Request(`http://localhost${req.url}`, {
            method: req.method,
            headers,
            body: ['GET', 'HEAD'].includes(req.method ?? 'GET') ? undefined : body,
          });
          const mod = await server.ssrLoadModule(`/netlify/functions/${m[1]}.ts`);
          const response: Response = await mod.default(request);
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ ok: false, error: { code: 'upstream_error', message: 'Dev function error' } }));
          server.config.logger.error(String(e));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localFunctions()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});

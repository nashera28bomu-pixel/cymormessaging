# Deployment

## Topology

```
Vercel (frontend, static)
        │
        ▼
Render Web Service (backend/, Express API)
        │
   ┌────┴────┐
   ▼         ▼
MongoDB    Render Redis
Atlas         │
              ▼
      Render Background Worker (worker/)
              │
              ▼
      WhatsApp Cloud API (Meta)
```

## Backend — Render Web Service

A ready-to-use blueprint is at `render.yaml` in the repo root (Render's "Blueprint" deploy reads this automatically). It provisions:

- `cymor-messaging-api` — Node web service, `rootDir: backend`, build `npm install && npm run build`, start `npm start`, health check `/health`.
- `cymor-messaging-worker` — Node background worker, `rootDir: worker`, same build/start pattern.
- `cymor-messaging-redis` — a managed Redis instance both services connect to via `fromService`.

Environment variables marked `sync: false` in `render.yaml` must be filled in manually in the Render dashboard (Environment tab) — they are secrets and are never committed to the repo. See the credentials table in the root `README.md`.

### Manual setup (if not using the Blueprint)

1. Create a Web Service, root directory `backend`, build command `npm install && npm run build`, start command `npm start`.
2. Create a Background Worker, root directory `worker`, same build/start pattern.
3. Create a Render Redis instance (or point `REDIS_URL` at any managed Redis).
4. Set all required environment variables (see `.env.example`) on both services.
5. Once the API is live, register its `/webhooks/meta` URL (e.g. `https://cymor-messaging-api.onrender.com/webhooks/meta`) as the callback URL in the Meta App Dashboard, using `META_VERIFY_TOKEN` as the verify token.

## Frontend — Vercel

The frontend has no build step (vanilla HTML/CSS/JS) — deploy the `frontend/` directory directly as a static site.

1. Import the repo into Vercel, set the project root to `frontend/`.
2. No build command is needed (or use `echo "static"` as a no-op build command); output directory is `frontend/` itself.
3. Set `window.CYMOR_API_URL` to your deployed backend's API URL. The simplest approach for a no-build static site: add a small `assets/js/config.js` (create it per-environment, not committed) that runs before `api.js`:
   ```html
   <script>window.CYMOR_API_URL = "https://cymor-messaging-api.onrender.com/api/v1";</script>
   ```
   Add this line to each HTML page's `<head>`, or centralize it by editing `assets/js/api.js`'s `BASE_URL` default directly per deployment.
4. `frontend/vercel.json` adds baseline security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`).

## Database — MongoDB Atlas

See the root `README.md` "MongoDB Atlas setup" section. In production, scope Network Access to Render's static outbound IPs rather than `0.0.0.0/0`.

## Production considerations

- Set `FRONTEND_URL` on the backend to your real Vercel domain — CORS is locked to this single origin (`backend/src/app.ts`).
- Rotate `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `CREDENTIALS_ENCRYPTION_KEY` to strong random values distinct from any development values; changing `CREDENTIALS_ENCRYPTION_KEY` after WhatsApp accounts are connected will make existing encrypted tokens unreadable, so back it up securely.
- Meta requires HTTPS for both the webhook callback URL and the Embedded Signup redirect — Render and Vercel both provide this by default.
- Scale the worker's `concurrency` settings (`worker/src/processors/*.ts`) based on your WhatsApp messaging tier's throughput limits.

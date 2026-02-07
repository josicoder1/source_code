Deployment instructions — Vercel (frontend) + Render (backend)

Overview
- Frontend: deploy to Vercel as a static site using `npm run build` -> `build/` output.
- Backend: deploy to Render as a Web Service running `npm run start:server`.

Quick steps
1) Push your repository to GitHub (or Git provider).

Frontend (Vercel)
- Create a new project in Vercel and point it to this repository.
- Build Command: `npm run build`
- Output Directory: `build`
- Environment: set any needed env vars for the frontend builds (none required by default).
- Important: Configure a rewrite in Vercel to proxy `/api/*` to your Render backend URL (see note below), or update the frontend to call the backend by absolute URL.

Backend (Render)
- Create a new Web Service in Render and point it to this repository.
- Branch: `main` (or your chosen branch)
- Build Command: `npm install`
- Start Command: `npm run start:server`
- Add environment variables:
  - `FRONTEND_URL` - the public URL of your Vercel frontend (e.g. https://my-app.vercel.app)
  - `CORS_ORIGIN` - same as FRONTEND_URL (so cookies and CORS work)
  - any AWS/DynamoDB vars if you want cloud storage

Notes and configuration
- The server reads `FRONTEND_URL` and `CORS_ORIGIN` (defaults to `http://localhost:3000`).
- The frontend currently issues requests to `/api/...` (relative paths). To make that work in production, either:
  - Configure a Vercel rewrite: source `/api/:path*` -> destination `https://<your-render-service>.onrender.com/api/:path*`, or
  - Change the frontend to use an absolute API base URL (e.g. `REACT_APP_API_BASE`) at build time.

Local build & test
```bash
# install deps
npm install

# build the frontend
npm run build

# run only the backend
npm run start:server

# or run frontend dev and backend locally (frontend proxy configured for localhost)
npm start
```

Live demo
- After deploying frontend (Vercel) and backend (Render) and configuring the rewrite, share the Vercel URL as the live demo.

Note: Pushing commits to `main` will trigger the GitHub Actions workflows to deploy the frontend and backend when repository secrets are configured.

Single-host Docker deployment
1) Build and start services using `docker-compose.prod.yml`:

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

2) Frontend will be available at `http://<host>/` and backend at `http://<host>:4001`.

3) To persist uploads, the `uploads` volume is mounted for the backend. To access container logs:

```bash
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
```

Environment variables for production can be set in the `docker-compose.prod.yml` file or via a `.env` referenced from the compose file.

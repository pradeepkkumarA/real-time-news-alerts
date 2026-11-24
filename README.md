# Real-Time News Alerts

A MERN application that aggregates news from multiple sources and delivers real-time alerts by in-app toast, email and browser push, based on each user's categories, sources and frequency preferences.

- **Client** (`/client`): React (Vite), TailwindCSS, Socket.io-client, Web Notification/Push API
- **Server** (`/server`): Node.js, Express, MongoDB (Mongoose), Socket.io, node-cron, Nodemailer, rss-parser, web-push

## Features

- JWT auth (register / login)
- Preferences: categories (politics, sports, technology, business, health, general), sources, frequency (`immediate` / `hourly` / `daily`), channels (email / push)
- Aggregation: optional NewsAPI (via key) plus built-in multi-source RSS feeds (works out of the box); deduplicated by URL hash and bulk-upserted
- `node-cron` ingestion (default every 5 min) broadcasting new stories live over Socket.io
- Immediate alerts (live toast + email + push), hourly/daily digest emails
- Dashboard: Live Feed with filters, Preferences, searchable Alert History with read state

## Run locally

Requirements: Node 18+, a MongoDB instance (local or Atlas).

```bash
# server
cd server
cp .env.example .env      # fill in MONGO_URI, JWT_SECRET, etc.
npm install
npm run dev

# client (new terminal)
cd client
cp .env.example .env
npm install
npm run dev               # http://localhost:5173
```

Notes:
- With no `SMTP_HOST`, emails are not sent; they are logged to the server console.
- Push needs VAPID keys: `npx web-push generate-vapid-keys`, then set `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`.
- The first ingestion seeds the database without sending alerts; alerts fire for stories fetched afterwards.

## Environment variables

See `server/.env.example` and `client/.env.example`.

## Deployment

### Backend on Render
1. Create a **Web Service** from this repo; set **Root Directory** to `server`.
2. Build command: `npm install` — Start command: `npm start`.
3. Add the env vars from `server/.env.example`. Set `CLIENT_URL` to your Netlify URL (comma-separate multiple origins) and `APP_URL` to the same URL. Use a MongoDB Atlas URI for `MONGO_URI`.
4. Note: free Render instances sleep when idle, which pauses cron jobs; use a paid instance or an external uptime ping on `/health`.

### Frontend on Netlify
1. Create a site from this repo; set **Base directory** to `client`.
2. Build command: `npm run build` — Publish directory: `dist` (also set in `client/netlify.toml`).
3. Add env var `VITE_API_URL` = your Render service URL (no trailing slash).
4. SPA routing is handled by `netlify.toml` / `public/_redirects`.

## API overview

| Method | Route | Description |
| --- | --- | --- |
| POST | `/api/auth/register`, `/api/auth/login` | Auth, returns JWT |
| GET | `/api/auth/me` | Current user |
| GET / PUT | `/api/preferences` | Read / update preferences |
| POST / DELETE | `/api/preferences/push-subscription` | Save / remove push subscription |
| GET | `/api/news`, `/api/news/meta` | Articles (filters: `category`, `source`, `q`, `page`) and option lists |
| GET | `/api/alerts` | Alert history (`q`, `channel`, `unread`, `page`) |
| PATCH | `/api/alerts/:id/read` | Mark as read |
| POST | `/api/alerts/read-all` | Mark all as read |

Socket events: `news:new` (broadcast), `alert:new` and `alert:digest` (per user room).

## License

MIT

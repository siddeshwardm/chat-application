# ✨ Full Stack Realtime Chat App ✨


Highlights:

- Tech stack: MERN + Socket.io + TailwindCSS + Daisy UI
- Authentication && Authorization with JWT
- Real-time messaging with Socket.io
- Online user status
- Global state management with Zustand
- Error handling both on the server and on the client
- At the end Deployment like a pro for FREE!
- And much more!

## Requirements

- Node.js 18+ recommended
- MongoDB database (Atlas or local)

## Setup `.env`

Create a `.env` file in the repo root (`fullstack-chat-app/.env`):

```js
MONGODB_URI=...
PORT=5001
JWT_SECRET=...
JWT_EXPIRES_IN=7d

CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

NODE_ENV=development
```

Notes:

- `JWT_SECRET` is required (auth uses an httpOnly cookie named `jwt`).
- Cloudinary is optional; if not configured, image sending will return a clear 400 error.

## Install

```bash
npm install
```

## Run in development

This starts both backend (port `5001`) and Vite frontend (port `5173`, may fall back to `5174`).

```bash
npm run dev
```

If you ever hit `EADDRINUSE` / ports stuck in use:

```bash
npm run dev:clean
```

## Build (production)

```bash
npm run build
```

## Start (production)

This starts the backend which serves the built frontend from `frontend/dist`.

```bash
npm start
```

## Demo utilities

Run from the repo root:

```bash
npm run seed --prefix backend
npm run cleanup:users --prefix backend
```

## Testing notes (important)

- Auth is cookie-based. To test **two different users at the same time**, use **two different browser contexts** (e.g. Chrome normal + Incognito, or separate Chrome profiles). Two tabs in the same profile share cookies.

## Deploy

### Recommended (works with Socket.IO)

Vercel is great for the frontend, but Socket.IO needs a long-lived server process. The most reliable setup is:

- **Frontend**: Vercel
- **Backend**: Render / Railway / Fly.io (any Node host that supports WebSockets)

#### 1) Deploy backend (Render/Railway/Fly)

After deploy, verify your backend is reachable:

- `https://<your-backend-domain>/api/health` should return `{ ok: true, ... }`

Set backend environment variables:

```bash
MONGODB_URI=...
JWT_SECRET=...
JWT_EXPIRES_IN=7d

# allow your deployed frontend to call the API + connect sockets (comma-separated)
CORS_ORIGINS=https://<your-vercel-app>.vercel.app,http://localhost:5173

# If frontend + backend are on different domains, cookies must be cross-site
COOKIE_SAMESITE=none
COOKIE_SECURE=true

CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

NODE_ENV=production
```

Start command:

- `npm run start` (in the `backend` folder)

#### 2) Deploy frontend on Vercel

In Vercel:

- **Root Directory**: `frontend`
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

Set frontend environment variables in Vercel:

```bash
# Option A (recommended): set backend origin (no /api). Frontend appends /api automatically.
VITE_BACKEND_URL=https://<your-backend-domain>

# Option B: set full API base URL (we will also auto-append /api if you forget)
VITE_API_BASE_URL=https://<your-backend-domain>/api

# point to your backend origin for sockets (no /api)
VITE_SOCKET_URL=https://<your-backend-domain>
```

### All-on-Vercel?

You can deploy the frontend on Vercel, but running the **Socket.IO backend** on Vercel serverless is not recommended for real-time features. If you want “all on Vercel”, you’ll need to replace Socket.IO with a hosted realtime provider (Ably/Pusher/etc) or another architecture.

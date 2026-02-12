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

### Build the app

```shell
npm run build
```

### Start the app

```shell
npm start
```

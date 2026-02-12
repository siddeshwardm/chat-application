import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from repo root `.env` regardless of where the process is started.
// This file lives at: backend/src/config/env.js
// Repo root is:       ../../../.env
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

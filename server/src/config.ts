/**
 * config.ts
 * -----------------------------------------------
 * Centralised configuration. Reads from process.env
 * with sensible defaults for local development.
 * -----------------------------------------------
 */

import path from 'path';
import fs from 'fs';

// Load .env file manually (no dotenv dependency)
function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

loadEnv();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  dbPath: process.env.DB_PATH || './data/resumate.db',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  authToken: process.env.AUTH_TOKEN || 'resumate-hackathon-spine-hangar-2026',
  reminderCheckInterval: parseInt(process.env.REMINDER_CHECK_INTERVAL || '60', 10),
};

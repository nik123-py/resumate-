/**
 * db.ts
 * -----------------------------------------------
 * SQLite database layer using better-sqlite3.
 * Creates tables on first run, provides typed
 * query helpers for all entities.
 * -----------------------------------------------
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from './config';

// Ensure data directory exists
const dbDir = path.dirname(path.resolve(config.dbPath));
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(path.resolve(config.dbPath));

// -- Pragmas for performance --
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// -----------------------------------------------
// Schema Migration
// -----------------------------------------------

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL UNIQUE,
    token       TEXT NOT NULL,
    created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
  );

  CREATE TABLE IF NOT EXISTS cvs (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    title       TEXT NOT NULL DEFAULT 'Untitled',
    data        TEXT,          -- full CV JSON
    created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    updated_at  INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sessions (
    cv_id       TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    data        TEXT NOT NULL,  -- SessionState JSON
    updated_at  INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS applications (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    cv_id       TEXT,
    data        TEXT NOT NULL,  -- ApplicationRecord JSON
    status      TEXT NOT NULL DEFAULT 'in_progress',
    remind_at   INTEGER,
    created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    updated_at  INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id          TEXT PRIMARY KEY,
    app_id      TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    remind_at   INTEGER NOT NULL,
    sent        INTEGER NOT NULL DEFAULT 0,
    created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    FOREIGN KEY (app_id)  REFERENCES applications(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS score_cache (
    id          TEXT PRIMARY KEY,
    cv_id       TEXT NOT NULL,
    app_id      TEXT,
    job_desc_hash TEXT,
    score       INTEGER NOT NULL,
    explanation TEXT,
    highlights  TEXT,           -- JSON array
    created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
  );

  -- Indexes
  CREATE INDEX IF NOT EXISTS idx_sessions_user  ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_apps_user      ON applications(user_id);
  CREATE INDEX IF NOT EXISTS idx_apps_status    ON applications(status);
  CREATE INDEX IF NOT EXISTS idx_reminders_due  ON reminders(remind_at, sent);
  CREATE INDEX IF NOT EXISTS idx_cvs_user       ON cvs(user_id);
`);

console.info('[DB] SQLite initialized at', path.resolve(config.dbPath));

// -----------------------------------------------
// Typed helpers
// -----------------------------------------------

// -- Users --

export function findUserByToken(token: string) {
  return db.prepare('SELECT * FROM users WHERE token = ?').get(token) as any | undefined;
}

export function findUserById(id: string) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any | undefined;
}

export function findUserByEmail(email: string) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any | undefined;
}

export function createUser(id: string, name: string, email: string, token: string) {
  db.prepare(
    'INSERT INTO users (id, name, email, token) VALUES (?, ?, ?, ?)'
  ).run(id, name, email, token);
}

export function upsertUser(id: string, name: string, email: string, token: string) {
  db.prepare(
    `INSERT INTO users (id, name, email, token)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name, email=excluded.email, token=excluded.token`
  ).run(id, name, email, token);
}

// -- Sessions --

export function getSession(cvId: string) {
  return db.prepare('SELECT * FROM sessions WHERE cv_id = ?').get(cvId) as any | undefined;
}

export function getSessionsByUser(userId: string) {
  return db.prepare('SELECT * FROM sessions WHERE user_id = ? ORDER BY updated_at DESC').all(userId) as any[];
}

export function upsertSession(cvId: string, userId: string, data: string) {
  db.prepare(
    `INSERT INTO sessions (cv_id, user_id, data, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(cv_id) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at`
  ).run(cvId, userId, data, Date.now());
}

export function deleteSession(cvId: string) {
  db.prepare('DELETE FROM sessions WHERE cv_id = ?').run(cvId);
}

// -- CVs --

export function getCVsByUser(userId: string) {
  return db.prepare('SELECT * FROM cvs WHERE user_id = ? ORDER BY updated_at DESC').all(userId) as any[];
}

export function getCV(id: string) {
  return db.prepare('SELECT * FROM cvs WHERE id = ?').get(id) as any | undefined;
}

export function upsertCV(id: string, userId: string, title: string, data: string) {
  db.prepare(
    `INSERT INTO cvs (id, user_id, title, data, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET title=excluded.title, data=excluded.data, updated_at=excluded.updated_at`
  ).run(id, userId, title, data, Date.now());
}

export function deleteCV(id: string) {
  db.prepare('DELETE FROM cvs WHERE id = ?').run(id);
}

// -- Applications --

export function getApplicationsByUser(userId: string) {
  return db.prepare('SELECT * FROM applications WHERE user_id = ? ORDER BY updated_at DESC').all(userId) as any[];
}

export function getApplication(id: string) {
  return db.prepare('SELECT * FROM applications WHERE id = ?').get(id) as any | undefined;
}

export function createApplication(id: string, userId: string, cvId: string | null, data: string, status: string, remindAt: number | null) {
  db.prepare(
    'INSERT INTO applications (id, user_id, cv_id, data, status, remind_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, userId, cvId, data, status, remindAt);
}

export function updateApplication(id: string, data: string, status: string, remindAt: number | null) {
  db.prepare(
    'UPDATE applications SET data = ?, status = ?, remind_at = ?, updated_at = ? WHERE id = ?'
  ).run(data, status, remindAt, Date.now(), id);
}

export function deleteApplication(id: string) {
  db.prepare('DELETE FROM applications WHERE id = ?').run(id);
}

// -- Reminders --

export function getDueReminders() {
  return db.prepare(
    'SELECT * FROM reminders WHERE sent = 0 AND remind_at <= ? ORDER BY remind_at ASC'
  ).all(Date.now()) as any[];
}

export function getRemindersByUser(userId: string) {
  return db.prepare(
    'SELECT * FROM reminders WHERE user_id = ? ORDER BY remind_at DESC'
  ).all(userId) as any[];
}

export function getDueRemindersByUser(userId: string) {
  return db.prepare(
    'SELECT r.*, a.data as app_data FROM reminders r LEFT JOIN applications a ON r.app_id = a.id WHERE r.user_id = ? AND r.sent = 0 AND r.remind_at <= ? ORDER BY r.remind_at ASC'
  ).all(userId, Date.now()) as any[];
}

export function createReminder(id: string, appId: string, userId: string, remindAt: number) {
  db.prepare(
    'INSERT INTO reminders (id, app_id, user_id, remind_at) VALUES (?, ?, ?, ?)'
  ).run(id, appId, userId, remindAt);
}

export function markReminderSent(id: string) {
  db.prepare('UPDATE reminders SET sent = 1 WHERE id = ?').run(id);
}

export function deleteRemindersByApp(appId: string) {
  db.prepare('DELETE FROM reminders WHERE app_id = ?').run(appId);
}

// -- Score cache --

export function getCachedScore(cvId: string, jobDescHash: string) {
  return db.prepare(
    'SELECT * FROM score_cache WHERE cv_id = ? AND job_desc_hash = ? ORDER BY created_at DESC LIMIT 1'
  ).get(cvId, jobDescHash) as any | undefined;
}

export function cacheScore(id: string, cvId: string, appId: string | null, jobDescHash: string, score: number, explanation: string, highlights: string) {
  db.prepare(
    'INSERT INTO score_cache (id, cv_id, app_id, job_desc_hash, score, explanation, highlights) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, cvId, appId, jobDescHash, score, explanation, highlights);
}

// -- Utility --

export function getDB() {
  return db;
}

export default db;

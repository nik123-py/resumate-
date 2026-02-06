/**
 * index.ts
 * -----------------------------------------------
 * Resumate Backend Server
 * Express + SQLite + Gemini proxy + reminders
 *
 * Endpoints:
 *   GET  /api/health             — server status (no auth)
 *   POST /api/sessions/:cvId/save — save session
 *   GET  /api/sessions/:cvId      — get session
 *   GET  /api/sessions            — list user sessions
 *   DELETE /api/sessions/:cvId    — delete session
 *   POST /api/cvs                 — create/upsert CV
 *   GET  /api/cvs                 — list user CVs
 *   GET  /api/cvs/:id             — get CV
 *   DELETE /api/cvs/:id           — delete CV
 *   POST /api/applications        — create application
 *   GET  /api/applications        — list applications
 *   GET  /api/applications/:id    — get application
 *   PUT  /api/applications/:id    — update application
 *   DELETE /api/applications/:id  — delete application
 *   POST /api/score               — score resume (Gemini)
 *   POST /api/score/analyze       — detailed analysis
 *   POST /api/score/nudge         — quick nudge
 *   POST /api/reminders/schedule  — schedule reminder
 *   GET  /api/reminders           — list reminders
 *   GET  /api/reminders/due       — due reminders
 *   POST /api/reminders/:id/dismiss — dismiss
 *
 * Auth: x-resumate-token header
 * spine-hangar
 * -----------------------------------------------
 */

import express from 'express';
import cors from 'cors';
import { config } from './config';
import { authMiddleware } from './middleware/auth';
import { startReminderScheduler } from './services/reminderScheduler';

// Import routes
import healthRouter from './routes/health';
import sessionsRouter from './routes/sessions';
import cvsRouter from './routes/cvs';
import applicationsRouter from './routes/applications';
import scoreRouter from './routes/score';
import remindersRouter from './routes/reminders';

// -----------------------------------------------
// Express App
// -----------------------------------------------

const app = express();

// -- Global middleware --

app.use(cors({
  origin: config.corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'x-resumate-token',
    'x-resumate-user-id',
    'x-resumate-user-name',
    'x-resumate-user-email',
  ],
  credentials: true,
}));

app.use(express.json({ limit: '500kb' }));

// Request logging
app.use((req, _res, next) => {
  const start = Date.now();
  _res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path !== '/api/health') {
      console.info(
        `[HTTP] ${req.method} ${req.path} → ${_res.statusCode} (${duration}ms)` +
        (req.userId ? ` user=${req.userId}` : '')
      );
    }
  });
  next();
});

// -- Routes (no auth) --
app.use('/api/health', healthRouter);

// -- Routes (auth required) --
app.use('/api/sessions', authMiddleware, sessionsRouter);
app.use('/api/cvs', authMiddleware, cvsRouter);
app.use('/api/applications', authMiddleware, applicationsRouter);
app.use('/api/score', authMiddleware, scoreRouter);
app.use('/api/reminders', authMiddleware, remindersRouter);

// -- 404 handler --
app.use((_req, res) => {
  res.status(404).json({ ok: false, error: 'Endpoint not found' });
});

// -- Global error handler --
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server] unhandled error:', err);
  res.status(500).json({ ok: false, error: 'Internal server error' });
});

// -----------------------------------------------
// Start Server
// -----------------------------------------------

app.listen(config.port, () => {
  console.info('');
  console.info('===========================================');
  console.info('  Resumate Backend Server');
  console.info('  spine-hangar');
  console.info('===========================================');
  console.info(`  Port:       ${config.port}`);
  console.info(`  CORS:       ${config.corsOrigin}`);
  console.info(`  DB:         ${config.dbPath}`);
  console.info(`  Gemini key: ${config.geminiApiKey ? '✓ configured' : '✗ missing'}`);
  console.info(`  Auth token: ${config.authToken.slice(0, 12)}...`);
  console.info('===========================================');
  console.info('');

  // Start the background reminder scheduler
  startReminderScheduler();
});

export default app;

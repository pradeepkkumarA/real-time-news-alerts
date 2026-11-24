import http from 'http';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import { env } from './config/env.js';
import { verifyToken } from './middleware/auth.js';
import { startScheduler } from './jobs/scheduler.js';
import authRoutes from './routes/auth.js';
import preferenceRoutes from './routes/preferences.js';
import newsRoutes from './routes/news.js';
import alertRoutes from './routes/alerts.js';

const app = express();
const server = http.createServer(app);

const corsOrigin = (origin, cb) => {
  if (!origin || env.clientUrls.includes(origin)) return cb(null, true);
  cb(new Error(`Origin ${origin} not allowed by CORS`));
};

app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '100kb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/preferences', preferenceRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/alerts', alertRoutes);

app.use((req, res) => res.status(404).json({ message: 'Not found' }));
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: env.isProd ? 'Server error' : err.message });
});

const io = new Server(server, { cors: { origin: corsOrigin } });

// optional auth: authenticated sockets join a private room for personal alerts
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next();
  try {
    socket.userId = verifyToken(token).id;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  if (socket.userId) socket.join(`user:${socket.userId}`);
});

async function main() {
  await mongoose.connect(env.mongoUri);
  console.log('[db] connected');
  server.listen(env.port, '0.0.0.0', () => console.log(`[server] listening on ${env.port}`));
  startScheduler(io);
}

main().catch((err) => {
  console.error('[server] failed to start:', err.message);
  process.exit(1);
});

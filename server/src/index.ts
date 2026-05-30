import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { connectDB } from './config/db.js';
import { env, getClientOrigins } from './config/env.js';
import { seedDatabase } from './utils/seed.js';
import authRoutes from './routes/auth.routes.js';
import productsRoutes from './routes/products.routes.js';
import ordersRoutes from './routes/orders.routes.js';
import reviewsRoutes from './routes/reviews.routes.js';
import adminRoutes from './routes/admin.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import chatRoutes from './routes/chat.routes.js';
import { setChatIo } from './services/chat.service.js';
import { setAdminIo } from './services/adminNotify.js';
import { setChatIoStatus } from './services/systemMonitor.service.js';
import { runMaintenanceJobs } from './services/adminJobs.service.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import { setupChatSocket } from './socket/chat.socket.js';

const app = express();
const server = http.createServer(app);

const allowedOrigins = getClientOrigins();

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

setChatIo(io);
setAdminIo(io);
setChatIoStatus(true);
setupChatSocket(io);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS bloqueado: ${origin}`));
    },
    credentials: true,
  }),
);
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'Puente Zardain API' }));

app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  await connectDB();
  await seedDatabase();
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Puerto ${env.port} en uso. Cierra el proceso anterior o cambia PORT en .env`);
      process.exit(1);
    }
    throw err;
  });
  server.listen(env.port, '0.0.0.0', () => {
    console.log(`🚀 API Puente Zardain → http://localhost:${env.port}`);
    console.log(`💬 Socket.io activo`);
    console.log(`👤 Admin: ${env.adminEmail} / ${env.adminPassword}`);

    const JOB_INTERVAL_MS = 5 * 60 * 1000;
    setInterval(() => {
      void runMaintenanceJobs().catch((err) => console.error('Jobs error:', err));
    }, JOB_INTERVAL_MS);
    void runMaintenanceJobs().catch(() => {});
  });
}

start();

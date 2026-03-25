import 'dotenv/config';
import express from 'express';
import 'express-async-errors';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        uid: string;
        role: string;
        username: string;
        name: string;
      };
    }
  }
}

import compression from 'compression';
import morgan from 'morgan';
import hpp from 'hpp';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import cors from 'cors';
import { initDb } from './db';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Route Imports
import authRoutes from './src/server/routes/auth';
import studentRoutes from './src/server/routes/students';
import programRoutes from './src/server/routes/programs';
import courseRoutes from './src/server/routes/courses';
import registrationRoutes from './src/server/routes/registrations';
import assessmentRoutes from './src/server/routes/assessments';
import lecturerRoutes from './src/server/routes/lecturers';
import bulkRoutes from './src/server/routes/bulk';
import academicRoutes from './src/server/routes/academic';
import userRoutes from './src/server/routes/users';
import calendarRoutes from './src/server/routes/calendar';
import departmentRoutes from './src/server/routes/departments';
import settingsRoutes from './src/server/routes/settings';
import assessmentControlRoutes from './src/server/routes/assessment-control';

// Middleware Imports
import { authenticate, checkRole } from './src/server/middleware/auth';

import { PORT, IS_PROD, JWT_SECRET } from './src/server/config';

async function startServer() {
  const app = express();

  // Trust proxy for express-rate-limit behind Nginx/aaPanel
  app.set('trust proxy', 1);

  // Initialize DB
  initDb();

  // CORS
  const corsOptions: cors.CorsOptions = {
    origin: IS_PROD
      ? (process.env.APP_URL || false)
      : true,
    credentials: true,
  };
  app.use(cors(corsOptions));

  // Security Middlewares
  app.use(morgan(IS_PROD ? 'combined' : 'dev'));
  app.use(hpp());
  app.use(compression());
  app.use(helmet({
    contentSecurityPolicy: IS_PROD ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https://ui-avatars.com'],
        connectSrc: ["'self'"],
      },
    } : false,
    crossOriginEmbedderPolicy: false,
  }));

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: IS_PROD ? 200 : 1000,  // more lenient in dev
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false,
    validate: {
      trustProxy: false,
      forwardedHeader: false,
    },
  });

  app.use('/api/', limiter);

  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API Routes
  const api = express.Router();

  api.use('/auth', authRoutes);
  api.use('/students', authenticate, studentRoutes);
  api.use('/programs', authenticate, programRoutes);
  api.use('/courses', authenticate, courseRoutes);          // standalone /api/courses
  api.use('/registrations', authenticate, registrationRoutes);
  api.use('/assessments', authenticate, assessmentRoutes);
  api.use('/lecturers', authenticate, lecturerRoutes);
  api.use('/bulk', authenticate, checkRole(['SuperAdmin', 'Administrator']), bulkRoutes);
  api.use('/academic', authenticate, academicRoutes);
  api.use('/users', authenticate, checkRole(['SuperAdmin', 'Administrator']), userRoutes);
  api.use('/departments', authenticate, departmentRoutes);
  api.use('/calendar-events', authenticate, calendarRoutes);
  api.use('/settings', authenticate, checkRole(['SuperAdmin', 'Administrator']), settingsRoutes);
  api.use('/assessment-control', authenticate, assessmentControlRoutes);

  app.use('/api', api);

  // Vite middleware for development
  if (!IS_PROD) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { maxAge: '1d' }));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global error handler - MUST be last
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[ERROR]', err.stack || err.message || err);
    const statusCode = err.statusCode || err.status || 500;
    res.status(statusCode).json({
      error: IS_PROD ? 'Internal server error' : (err.message || 'Internal server error'),
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SIMS] Server running on http://0.0.0.0:${PORT} (${IS_PROD ? 'production' : 'development'})`);
    if (!IS_PROD && !process.env.JWT_SECRET) {
      console.warn('[WARN] JWT_SECRET not set — using insecure default. Set it in .env before deploying!');
    }
  });
}

startServer();

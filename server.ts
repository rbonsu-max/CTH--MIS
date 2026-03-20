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
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();
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
import registrationRoutes from './src/server/routes/registrations';
import assessmentRoutes from './src/server/routes/assessments';
import lecturerRoutes from './src/server/routes/lecturers';
import bulkRoutes from './src/server/routes/bulk';
import academicRoutes from './src/server/routes/academic';
import userRoutes from './src/server/routes/users';

// Middleware Imports
import { authenticate, checkRole } from './src/server/middleware/auth';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust proxy for express-rate-limit behind Nginx
  app.set('trust proxy', 1);

  // Initialize DB
  initDb();

  // CORS
  const corsOptions = {
    origin: process.env.APP_URL || true,
    credentials: true,
  };
  app.use(cors(corsOptions));

  // Security Middlewares
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use(hpp());
  app.use(compression());
  app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for development with Vite
    crossOriginEmbedderPolicy: false
  }));

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    validate: { 
      trustProxy: false, 
      forwardedHeader: false 
    }, // Disable the trust proxy and forwarded header validation checks
  });

  app.use('/api/', limiter);

  app.use(express.json());
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
  api.use('/registrations', authenticate, registrationRoutes);
  api.use('/assessments', authenticate, assessmentRoutes);
  api.use('/lecturers', authenticate, lecturerRoutes);
  api.use('/bulk', authenticate, checkRole(['SuperAdmin', 'Administrator']), bulkRoutes);
  api.use('/academic', authenticate, academicRoutes);
  api.use('/users', authenticate, checkRole(['SuperAdmin', 'Administrator']), userRoutes);

  app.use('/api', api);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

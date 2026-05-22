const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const pinoHttp = require('pino-http');
const path = require('path');

const { logger } = require('./utils/logger');
const { mongoose } = require('./config/db');

function createApp({ frontendUrl } = {}) {
  const app = express();

  app.use(helmet());
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000'
  ];
  const customFrontendUrl = frontendUrl || process.env.FRONTEND_URL;
  if (customFrontendUrl) {
    allowedOrigins.push(customFrontendUrl);
  }

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or tests)
        if (!origin) return callback(null, true);
        
        const isAllowed = allowedOrigins.includes(origin) || 
                          origin.endsWith('.onrender.com') || 
                          /^http:\/\/localhost:\d+$/.test(origin);
                          
        if (isAllowed) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    }),
  );
  app.use('/tickets', express.static(path.join(__dirname, '../public/tickets')));
  app.use('/api/v1/payment/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));

  app.get('/health', (_req, res) => {
    const dbState = mongoose.connection.readyState; // 0=disc, 1=conn, 2=connecting, 3=disconnecting
    const dbStatusMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
    res.json({
      status: 'ok',
      service: 'fifa-ticketing-backend',
      version: '0.1.0',
      db: dbStatusMap[dbState] || 'unknown',
      uptime: process.uptime(),
    });
  });

  // Les routes /api/v1/* seront branchées ici lors des prochaines tâches.
  app.use('/api/v1', require('./routes'));

  app.use((_req, res) => {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Route not found', status: 404 },
    });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => {
    const status = err.status || 500;
    req.log?.error({ err }, 'request failed');
    res.status(status).json({
      error: {
        code: err.code || 'INTERNAL_ERROR',
        message: err.message || 'Internal server error',
        status,
      },
    });
  });

  return app;
}

module.exports = { createApp };

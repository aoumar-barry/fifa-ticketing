const pino = require('pino');

function createLogger(env = process.env) {
  const isProd = env.NODE_ENV === 'production';
  const isTest = env.NODE_ENV === 'test';

  return pino({
    level: isTest ? 'silent' : env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
    base: { service: 'fifa-ticketing-backend' },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: [
        'password',
        'passwordHash',
        'otpCode',
        '*.password',
        '*.passwordHash',
        '*.otpCode',
        'req.headers.authorization',
        'req.headers.cookie',
      ],
      remove: true,
    },
  });
}

const logger = createLogger();

module.exports = { logger, createLogger };

const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { loadEnv } = require('../config/env');

const env = loadEnv();
const JWT_ACCESS_SECRET = env.JWT_ACCESS_SECRET;

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Access token is required',
          status: 401,
        },
      });
    }

    const token = authHeader.split('Bearer ')[1]?.trim();
    if (!token) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Access token is required',
          status: 401,
        },
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_ACCESS_SECRET);
    } catch (err) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: err.name === 'TokenExpiredError' ? 'Access token expired' : 'Invalid access token',
          status: 401,
        },
      });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not found',
          status: 401,
        },
      });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = authMiddleware;

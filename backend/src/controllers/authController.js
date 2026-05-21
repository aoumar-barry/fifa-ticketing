const { z } = require('zod');
const authService = require('../services/authService');

const registerSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  firstName: z.string().min(1, 'First name is required').trim(),
  lastName: z.string().min(1, 'Last name is required').trim(),
  phone: z.string().trim().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
};

async function registerLocal(req, res, next) {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues.map((i) => i.message).join(', ');
      throw new authService.AppError(400, errorMsg, 'VALIDATION_ERROR');
    }

    const { user, accessToken, refreshToken } = await authService.registerLocal(parsed.data);

    res.cookie('refreshToken', refreshToken, cookieOptions);
    res.status(201).json({
      user,
      accessToken,
    });
  } catch (err) {
    next(err);
  }
}

async function loginLocal(req, res, next) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues.map((i) => i.message).join(', ');
      throw new authService.AppError(400, errorMsg, 'VALIDATION_ERROR');
    }

    const { user, accessToken, refreshToken } = await authService.loginLocal(parsed.data);

    res.cookie('refreshToken', refreshToken, cookieOptions);
    res.status(200).json({
      user,
      accessToken,
    });
  } catch (err) {
    next(err);
  }
}

async function refreshTokens(req, res, next) {
  try {
    const token = req.cookies.refreshToken;
    if (!token) {
      throw new authService.AppError(401, 'No refresh token provided', 'UNAUTHORIZED');
    }

    const { accessToken, refreshToken } = await authService.refreshTokens(token);

    res.cookie('refreshToken', refreshToken, cookieOptions);
    res.status(200).json({
      accessToken,
    });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    // eslint-disable-next-line no-unused-vars
    const { maxAge, ...clearOptions } = cookieOptions;
    res.clearCookie('refreshToken', clearOptions);
    res.status(200).json({
      success: true,
    });
  } catch (err) {
    next(err);
  }
}

async function loginFirebase(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new authService.AppError(401, 'No Bearer token provided in Authorization header', 'UNAUTHORIZED');
    }

    const idToken = authHeader.split('Bearer ')[1]?.trim();
    if (!idToken) {
      throw new authService.AppError(401, 'No token provided in Authorization header', 'UNAUTHORIZED');
    }

    const { user, accessToken, refreshToken } = await authService.loginOrRegisterFirebase(idToken);

    res.cookie('refreshToken', refreshToken, cookieOptions);
    res.status(200).json({
      user,
      accessToken,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  registerLocal,
  loginLocal,
  refreshTokens,
  logout,
  loginFirebase,
};

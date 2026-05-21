const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { User } = require('../models');
const { loadEnv } = require('../config/env');

const env = loadEnv();
const JWT_ACCESS_SECRET = env.JWT_ACCESS_SECRET;
const JWT_REFRESH_SECRET = env.JWT_REFRESH_SECRET;

class AppError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function generateTokens(user) {
  const accessToken = jwt.sign(
    { userId: user._id, role: user.role, email: user.email },
    JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId: user._id },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
}

async function registerLocal({ email, password, firstName, lastName, phone }) {
  if (!email || !password || !firstName || !lastName) {
    throw new AppError(400, 'Missing required fields', 'BAD_REQUEST');
  }

  const normalizedEmail = email.toLowerCase().trim();

  // check if user exists
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new AppError(409, 'Email already registered', 'CONFLICT');
  }

  // hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // create user
  const user = await User.create({
    email: normalizedEmail,
    passwordHash,
    firstName,
    lastName,
    phone,
    isVerified: true,
    role: 'user',
  });

  const tokens = generateTokens(user);

  return {
    user,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

async function loginLocal({ email, password }) {
  if (!email || !password) {
    throw new AppError(400, 'Email and password are required', 'BAD_REQUEST');
  }

  const normalizedEmail = email.toLowerCase().trim();

  // find user
  const user = await User.findOne({ email: normalizedEmail });
  if (!user || !user.passwordHash) {
    throw new AppError(401, 'Invalid email or password', 'UNAUTHORIZED');
  }

  // check password
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new AppError(401, 'Invalid email or password', 'UNAUTHORIZED');
  }

  const tokens = generateTokens(user);

  return {
    user,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

async function refreshTokens(token) {
  if (!token) {
    throw new AppError(401, 'Refresh token is required', 'UNAUTHORIZED');
  }

  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET);

    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new AppError(401, 'User not found', 'UNAUTHORIZED');
    }

    const tokens = generateTokens(user);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(401, 'Invalid or expired refresh token', 'UNAUTHORIZED');
  }
}

module.exports = {
  AppError,
  registerLocal,
  loginLocal,
  refreshTokens,
  generateTokens,
};

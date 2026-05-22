require('dotenv').config();

// Ensure secrets are populated for the test run if they aren't in .env
if (!process.env.JWT_ACCESS_SECRET) {
  process.env.JWT_ACCESS_SECRET = 'local_access_secret_key_fifa_2026_xyz';
}
if (!process.env.JWT_REFRESH_SECRET) {
  process.env.JWT_REFRESH_SECRET = 'local_refresh_secret_key_fifa_2026_abc';
}

jest.mock('../../config/firebase', () => {
  return {
    verifyFirebaseToken: jest.fn(),
  };
});

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { User } = require('../../models');
const {
  registerLocal,
  loginLocal,
  refreshTokens,
  loginOrRegisterFirebase,
  AppError,
} = require('../../services/authService');
const { verifyFirebaseToken } = require('../../config/firebase');

jest.setTimeout(120000);

describe('authService Unit Tests', () => {
  let mongod;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri(), { dbName: 'fifa-ticketing-test-auth' });
    await User.syncIndexes();
  }, 120000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  afterEach(async () => {
    await User.deleteMany({});
    jest.clearAllMocks();
  });

  describe('registerLocal', () => {
    it('throws AppError 400 when missing required fields', async () => {
      await expect(registerLocal({ email: 'test@example.com' })).rejects.toMatchObject({
        status: 400,
        code: 'BAD_REQUEST',
        message: 'Missing required fields',
      });
    });
  });

  describe('loginLocal', () => {
    it('throws AppError 400 when email or password is missing', async () => {
      await expect(loginLocal({ email: '' })).rejects.toMatchObject({
        status: 400,
        code: 'BAD_REQUEST',
        message: 'Email and password are required',
      });
    });

    it('throws AppError 401 for Firebase-only user trying local login', async () => {
      await User.create({
        email: 'firebase-only@example.com',
        firebaseUid: 'fb-uid-123',
        firstName: 'Firebase',
        lastName: 'User',
      });

      await expect(
        loginLocal({ email: 'firebase-only@example.com', password: 'password123' })
      ).rejects.toMatchObject({
        status: 401,
        code: 'UNAUTHORIZED',
        message: 'Invalid email or password',
      });
    });
  });

  describe('refreshTokens', () => {
    it('throws AppError 401 when no token is provided', async () => {
      await expect(refreshTokens(null)).rejects.toMatchObject({
        status: 401,
        code: 'UNAUTHORIZED',
        message: 'Refresh token is required',
      });
    });

    it('throws AppError 401 if user is not found in database', async () => {
      const nonExistentUserId = new mongoose.Types.ObjectId();
      const token = jwt.sign({ userId: nonExistentUserId }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: '7d',
      });

      await expect(refreshTokens(token)).rejects.toMatchObject({
        status: 401,
        code: 'UNAUTHORIZED',
        message: 'User not found',
      });
    });
  });

  describe('loginOrRegisterFirebase', () => {
    it('throws AppError 401 when idToken is missing', async () => {
      await expect(loginOrRegisterFirebase(null)).rejects.toMatchObject({
        status: 401,
        code: 'UNAUTHORIZED',
        message: 'Firebase ID Token is required',
      });
    });

    it('throws AppError 400 when decoded token lacks email address', async () => {
      verifyFirebaseToken.mockResolvedValueOnce({
        uid: 'fb-uid-empty-email',
      });

      await expect(loginOrRegisterFirebase('mock-token')).rejects.toMatchObject({
        status: 400,
        code: 'BAD_REQUEST',
        message: 'Firebase user must have an email address',
      });
    });

    it('handles fallback to emailName when name is missing', async () => {
      verifyFirebaseToken.mockResolvedValueOnce({
        uid: 'fb-no-name',
        email: 'john.doe@example.com',
      });

      const result = await loginOrRegisterFirebase('mock-token');
      expect(result.user.firstName).toBe('john.doe');
      expect(result.user.lastName).toBe('User');
    });

    it('handles fallback when name only has one part', async () => {
      verifyFirebaseToken.mockResolvedValueOnce({
        uid: 'fb-one-name',
        email: 'john.doe@example.com',
        name: 'John',
      });

      const result = await loginOrRegisterFirebase('mock-token');
      expect(result.user.firstName).toBe('John');
      expect(result.user.lastName).toBe('User');
    });

    it('handles fallback to User when email split returns empty', async () => {
      verifyFirebaseToken.mockResolvedValueOnce({
        uid: 'fb-empty-split',
        email: '@example.com',
      });

      const result = await loginOrRegisterFirebase('mock-token');
      expect(result.user.firstName).toBe('User');
      expect(result.user.lastName).toBe('User');
    });

    it('throws AppError directly when verification rejects with AppError', async () => {
      verifyFirebaseToken.mockRejectedValueOnce(new AppError(400, 'Mock AppError', 'MOCK_CODE'));

      await expect(loginOrRegisterFirebase('mock-token')).rejects.toMatchObject({
        status: 400,
        code: 'MOCK_CODE',
        message: 'Mock AppError',
      });
    });

    it('logs error inside catch block when NODE_ENV !== test', async () => {
      verifyFirebaseToken.mockRejectedValueOnce(new Error('Firebase verification failure'));

      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(loginOrRegisterFirebase('mock-token')).rejects.toThrow();
      expect(consoleErrorMock).toHaveBeenCalled();

      consoleErrorMock.mockRestore();
      process.env.NODE_ENV = originalNodeEnv;
    });

    it('uses fallback error message if verifying Firebase token fails without an error message', async () => {
      verifyFirebaseToken.mockRejectedValueOnce({});

      await expect(loginOrRegisterFirebase('mock-token')).rejects.toMatchObject({
        status: 401,
        code: 'UNAUTHORIZED',
        message: 'Invalid Firebase ID Token',
      });
    });
  });
});

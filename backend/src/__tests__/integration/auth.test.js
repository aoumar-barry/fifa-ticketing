require('dotenv').config();

// Mock firebase-admin before any imports
jest.mock('firebase-admin', () => {
  const mockAuth = {
    verifyIdToken: jest.fn(),
  };
  return {
    credential: {
      cert: jest.fn(),
    },
    initializeApp: jest.fn(),
    auth: () => mockAuth,
  };
});

// Ensure secrets are populated for the test run if they aren't in .env
if (!process.env.JWT_ACCESS_SECRET) {
  process.env.JWT_ACCESS_SECRET = 'local_access_secret_key_fifa_2026_xyz';
}
if (!process.env.JWT_REFRESH_SECRET) {
  process.env.JWT_REFRESH_SECRET = 'local_refresh_secret_key_fifa_2026_abc';
}
if (!process.env.FIREBASE_PROJECT_ID) {
  process.env.FIREBASE_PROJECT_ID = 'test-project';
}
if (!process.env.FIREBASE_CLIENT_EMAIL) {
  process.env.FIREBASE_CLIENT_EMAIL = 'test-email@example.com';
}
if (!process.env.FIREBASE_PRIVATE_KEY) {
  process.env.FIREBASE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQ...\n-----END PRIVATE KEY-----\n';
}

const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { createApp } = require('../../app');
const { User } = require('../../models');

jest.setTimeout(120000);

describe('Auth integration tests', () => {
  let mongod;
  let app;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri(), { dbName: 'fifa-ticketing-test' });
    await User.syncIndexes();
    app = createApp({ frontendUrl: 'http://localhost:5173' });
  }, 120000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  // Utility to extract refreshToken value from Set-Cookie header
  function getRefreshTokenFromCookie(res) {
    const cookies = res.headers['set-cookie'];
    if (!cookies) return null;
    const match = cookies.find((c) => c.startsWith('refreshToken='));
    if (!match) return null;
    return match.split(';')[0].split('=')[1];
  }

  describe('POST /api/v1/auth/register', () => {
    const validRegistrationData = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+33612345678',
    };

    it('successfully registers a new local user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(validRegistrationData);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe('test@example.com');
      expect(res.body.user.firstName).toBe('John');
      expect(res.body.user.lastName).toBe('Doe');
      expect(res.body.user.isVerified).toBe(true);
      expect(res.body.user.role).toBe('user');
      expect(res.body.user.passwordHash).toBeUndefined();

      // Check cookie
      const refreshToken = getRefreshTokenFromCookie(res);
      expect(refreshToken).toBeDefined();
      expect(refreshToken.length).toBeGreaterThan(0);

      const cookieHeader = res.headers['set-cookie'][0];
      expect(cookieHeader).toContain('HttpOnly');
      expect(cookieHeader).toContain('SameSite=Strict');

      // Check DB entry
      const dbUser = await User.findOne({ email: 'test@example.com' });
      expect(dbUser).toBeDefined();
      expect(dbUser.passwordHash).toBeDefined();
      expect(dbUser.passwordHash).not.toBe('password123'); // must be hashed
    });

    it('rejects duplicate email registration (conflict)', async () => {
      // Create existing user first
      await request(app)
        .post('/api/v1/auth/register')
        .send(validRegistrationData);

      // Attempt to register again with same email
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(validRegistrationData);

      expect(res.status).toBe(409);
      expect(res.body.error).toMatchObject({
        code: 'CONFLICT',
        message: 'Email already registered',
        status: 409,
      });
    });

    it('validates schema and returns bad request on validation errors', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'short', // less than 8 chars
          firstName: '', // empty
          lastName: 'Doe',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatchObject({
        code: 'VALIDATION_ERROR',
        status: 400,
      });
      expect(res.body.error.message).toContain('Invalid email');
      expect(res.body.error.message).toContain('Password must be at least 8 characters');
      expect(res.body.error.message).toContain('First name is required');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    const userData = {
      email: 'login-test@example.com',
      password: 'mypassword123',
      firstName: 'Bob',
      lastName: 'Smith',
    };

    beforeEach(async () => {
      // Register the user before testing login
      await request(app)
        .post('/api/v1/auth/register')
        .send(userData);
    });

    it('successfully logs in with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe(userData.email);
      expect(res.body.user.passwordHash).toBeUndefined();

      const refreshToken = getRefreshTokenFromCookie(res);
      expect(refreshToken).toBeDefined();
      expect(refreshToken.length).toBeGreaterThan(0);
    });

    it('rejects login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: 'wrongpassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatchObject({
        code: 'UNAUTHORIZED',
        message: 'Invalid email or password',
        status: 401,
      });
    });

    it('rejects login for non-existent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: userData.password,
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatchObject({
        code: 'UNAUTHORIZED',
        message: 'Invalid email or password',
        status: 401,
      });
    });

    it('rejects login for a firebase-only user trying local login', async () => {
      // Create a user with firebaseUid but no passwordHash
      await User.create({
        email: 'firebase-only@example.com',
        firebaseUid: 'firebase_uid_123',
        firstName: 'Firebase',
        lastName: 'User',
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'firebase-only@example.com',
          password: 'anypassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatchObject({
        code: 'UNAUTHORIZED',
        message: 'Invalid email or password',
        status: 401,
      });
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let registerCookie;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'refresh-test@example.com',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe',
        });
      registerCookie = res.headers['set-cookie'];
    });

    it('successfully refreshes token with valid refresh cookie', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', registerCookie);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');

      const newRefreshToken = getRefreshTokenFromCookie(res);
      expect(newRefreshToken).toBeDefined();
      expect(newRefreshToken.length).toBeGreaterThan(0);

      // Verify the new token is also valid
      const secondRefreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', res.headers['set-cookie']);

      expect(secondRefreshRes.status).toBe(200);
      expect(secondRefreshRes.body).toHaveProperty('accessToken');
    });

    it('fails when no refresh cookie is provided', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh');

      expect(res.status).toBe(401);
      expect(res.body.error).toMatchObject({
        code: 'UNAUTHORIZED',
        message: 'No refresh token provided',
        status: 401,
      });
    });

    it('fails when an invalid refresh cookie is provided', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', ['refreshToken=invalid_token_value; Path=/; HttpOnly']);

      expect(res.status).toBe(401);
      expect(res.body.error).toMatchObject({
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired refresh token',
        status: 401,
      });
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('clears the refresh token cookie and returns 200', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const refreshCookie = cookies.find((c) => c.startsWith('refreshToken='));
      expect(refreshCookie).toBeDefined();
      // An expired cookie (Expires in the past) signifies clearCookie
      expect(refreshCookie).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    });
  });

  describe('POST /api/v1/auth/firebase', () => {
    const admin = require('firebase-admin');
    const mockVerifyIdToken = admin.auth().verifyIdToken;

    beforeEach(() => {
      mockVerifyIdToken.mockReset();
    });

    it('successfully registers and logs in a new Firebase user (TC-AUTH-003)', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'fb-new-123',
        email: 'fb-new@example.com',
        name: 'New Firebase User',
      });

      const res = await request(app)
        .post('/api/v1/auth/firebase')
        .set('Authorization', 'Bearer mock-valid-token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe('fb-new@example.com');
      expect(res.body.user.firebaseUid).toBe('fb-new-123');
      expect(res.body.user.firstName).toBe('New');
      expect(res.body.user.lastName).toBe('Firebase User');
      expect(res.body.user.passwordHash).toBeUndefined();

      const refreshToken = getRefreshTokenFromCookie(res);
      expect(refreshToken).toBeDefined();
      expect(refreshToken.length).toBeGreaterThan(0);

      // Verify user created in DB
      const dbUser = await User.findOne({ email: 'fb-new@example.com' });
      expect(dbUser).toBeDefined();
      expect(dbUser.firebaseUid).toBe('fb-new-123');
      expect(dbUser.passwordHash).toBeUndefined();
    });

    it('successfully logs in an existing Firebase user', async () => {
      // Create user in DB first
      await User.create({
        email: 'fb-exist@example.com',
        firebaseUid: 'fb-exist-123',
        firstName: 'Existing',
        lastName: 'User',
      });

      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'fb-exist-123',
        email: 'fb-exist@example.com',
        name: 'Existing User',
      });

      const res = await request(app)
        .post('/api/v1/auth/firebase')
        .set('Authorization', 'Bearer mock-valid-token');

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('fb-exist@example.com');
      expect(res.body.user.firebaseUid).toBe('fb-exist-123');

      const refreshToken = getRefreshTokenFromCookie(res);
      expect(refreshToken).toBeDefined();
    });

    it('links a Firebase login to an existing local account with the same email', async () => {
      // Create local user with passwordHash
      await User.create({
        email: 'link-me@example.com',
        passwordHash: 'hashedpassword123',
        firstName: 'Local',
        lastName: 'User',
      });

      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'fb-link-123',
        email: 'link-me@example.com',
        name: 'Linked User',
      });

      const res = await request(app)
        .post('/api/v1/auth/firebase')
        .set('Authorization', 'Bearer mock-valid-token');

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('link-me@example.com');
      expect(res.body.user.firebaseUid).toBe('fb-link-123');

      // Check DB directly
      const dbUser = await User.findOne({ email: 'link-me@example.com' });
      expect(dbUser).toBeDefined();
      expect(dbUser.firebaseUid).toBe('fb-link-123');
      expect(dbUser.passwordHash).toBe('hashedpassword123'); // Still has password hash
    });

    it('rejects authentication with missing or malformed Authorization header', async () => {
      const resNoHeader = await request(app)
        .post('/api/v1/auth/firebase');
      expect(resNoHeader.status).toBe(401);
      expect(resNoHeader.body.error).toMatchObject({
        code: 'UNAUTHORIZED',
        message: 'No Bearer token provided in Authorization header',
      });

      const resBadHeader = await request(app)
        .post('/api/v1/auth/firebase')
        .set('Authorization', 'Basic credentials');
      expect(resBadHeader.status).toBe(401);
      expect(resBadHeader.body.error).toMatchObject({
        code: 'UNAUTHORIZED',
        message: 'No Bearer token provided in Authorization header',
      });
    });

    it('rejects authentication when Firebase verification fails', async () => {
      mockVerifyIdToken.mockRejectedValueOnce(new Error('Firebase token expired'));

      const res = await request(app)
        .post('/api/v1/auth/firebase')
        .set('Authorization', 'Bearer mock-expired-token');

      expect(res.status).toBe(401);
      expect(res.body.error).toMatchObject({
        code: 'UNAUTHORIZED',
        message: 'Firebase token expired',
      });
    });
  });
});

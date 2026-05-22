require('dotenv').config();

// Mock firebase-admin before any imports
jest.mock('firebase-admin', () => {
  const mockAuth = {
    verifyIdToken: jest.fn(),
  };
  return {
    credential: { cert: jest.fn() },
    initializeApp: jest.fn(),
    auth: () => mockAuth,
  };
});

// Ensure JWT secrets are available
if (!process.env.JWT_ACCESS_SECRET) {
  process.env.JWT_ACCESS_SECRET = 'local_access_secret_key_fifa_2026_xyz';
}

const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { createApp } = require('../../app');
const { User } = require('../../models');

describe('User Profile Integration Tests', () => {
  let mongod;
  let app;
  let userToken;
  let testUser;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri(), { dbName: 'fifa-ticketing-user-test' });
    await User.syncIndexes();
    app = createApp({ frontendUrl: 'http://localhost:5173' });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});

    testUser = await User.create({
      email: 'testuser@fifa.com',
      passwordHash: 'hashedPass123',
      firstName: 'Jean',
      lastName: 'Dupont',
      phone: '+33612345678',
      role: 'user',
      isVerified: true,
    });

    userToken = jwt.sign(
      { userId: testUser._id, role: testUser.role, email: testUser.email },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );
  });

  describe('GET /api/v1/users/profile', () => {
    it('should return 401 when no token is provided', async () => {
      const res = await request(app)
        .get('/api/v1/users/profile')
        .expect(401);

      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 when token is invalid', async () => {
      const res = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', 'Bearer invalidtoken')
        .expect(401);

      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 200 and user profile data when authenticated', async () => {
      const res = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('_id', testUser._id.toString());
      expect(res.body).toHaveProperty('email', 'testuser@fifa.com');
      expect(res.body).toHaveProperty('firstName', 'Jean');
      expect(res.body).toHaveProperty('lastName', 'Dupont');
      expect(res.body).toHaveProperty('phone', '+33612345678');
      expect(res.body).not.toHaveProperty('passwordHash');
    });
  });

  describe('PUT /api/v1/users/profile', () => {
    it('should return 401 when no token is provided', async () => {
      const res = await request(app)
        .put('/api/v1/users/profile')
        .send({ firstName: 'Marc', lastName: 'Durand' })
        .expect(401);

      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 400 when first name is missing or empty', async () => {
      const res = await request(app)
        .put('/api/v1/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ firstName: '', lastName: 'Durand' })
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when last name is missing or empty', async () => {
      const res = await request(app)
        .put('/api/v1/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ firstName: 'Marc', lastName: '  ' })
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 200 and update profile in the database', async () => {
      const res = await request(app)
        .put('/api/v1/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          firstName: 'Marc',
          lastName: 'Durand',
          phone: '+33600000000',
        })
        .expect(200);

      // Verify response body
      expect(res.body.firstName).toBe('Marc');
      expect(res.body.lastName).toBe('Durand');
      expect(res.body.phone).toBe('+33600000000');

      // Verify db persistence
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.firstName).toBe('Marc');
      expect(updatedUser.lastName).toBe('Durand');
      expect(updatedUser.phone).toBe('+33600000000');
    });

    it('should allow phone to be empty or null', async () => {
      const res = await request(app)
        .put('/api/v1/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          firstName: 'Marc',
          lastName: 'Durand',
          phone: '',
        })
        .expect(200);

      expect(res.body.firstName).toBe('Marc');
      expect(res.body.lastName).toBe('Durand');
      expect(res.body.phone).toBeUndefined();

      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.phone).toBeUndefined();
    });
  });
});

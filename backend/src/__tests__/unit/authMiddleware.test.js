require('dotenv').config();

// Ensure secrets are populated for the test run if they aren't in .env
if (!process.env.JWT_ACCESS_SECRET) {
  process.env.JWT_ACCESS_SECRET = 'local_access_secret_key_fifa_2026_xyz';
}

const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const authMiddleware = require('../../middlewares/authMiddleware');
const adminMiddleware = require('../../middlewares/adminMiddleware');
const { User } = require('../../models');

jest.setTimeout(120000);

describe('Security Middlewares', () => {
  let mongod;
  const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri(), { dbName: 'fifa-ticketing-test' });
    await User.syncIndexes();
  }, 120000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  // Helper to mock Express req, res, next
  const mockExpress = () => {
    const req = { headers: {} };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();
    return { req, res, next };
  };

  describe('authMiddleware', () => {
    it('successfully authenticates with valid token and attaches user to req.user', async () => {
      const user = await User.create({
        email: 'auth-mid@example.com',
        firstName: 'John',
        lastName: 'Doe',
      });

      const token = jwt.sign(
        { userId: user._id, role: user.role, email: user.email },
        JWT_ACCESS_SECRET,
        { expiresIn: '15m' }
      );

      const { req, res, next } = mockExpress();
      req.headers.authorization = `Bearer ${token}`;

      await authMiddleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(); // called with no errors
      expect(req.user).toBeDefined();
      expect(req.user._id.toString()).toBe(user._id.toString());
      expect(res.status).not.toHaveBeenCalled();
    });

    it('returns 401 when Authorization header is missing', async () => {
      const { req, res, next } = mockExpress();

      await authMiddleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Access token is required',
          status: 401,
        },
      });
    });

    it('returns 401 when Authorization header does not start with Bearer', async () => {
      const { req, res, next } = mockExpress();
      req.headers.authorization = 'Basic credentials';

      await authMiddleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns 401 when token is invalid', async () => {
      const { req, res, next } = mockExpress();
      req.headers.authorization = 'Bearer invalid-token';

      await authMiddleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Invalid access token',
          }),
        })
      );
    });

    it('returns 401 when token has expired', async () => {
      const token = jwt.sign(
        { userId: new mongoose.Types.ObjectId() },
        JWT_ACCESS_SECRET,
        { expiresIn: '-1s' } // already expired
      );

      const { req, res, next } = mockExpress();
      req.headers.authorization = `Bearer ${token}`;

      await authMiddleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Access token expired',
          }),
        })
      );
    });

    it('returns 401 when user does not exist in database', async () => {
      const token = jwt.sign(
        { userId: new mongoose.Types.ObjectId() },
        JWT_ACCESS_SECRET,
        { expiresIn: '15m' }
      );

      const { req, res, next } = mockExpress();
      req.headers.authorization = `Bearer ${token}`;

      await authMiddleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'User not found',
          }),
        })
      );
    });
  });

  describe('adminMiddleware', () => {
    it('calls next when user role is admin', () => {
      const { req, res, next } = mockExpress();
      req.user = { role: 'admin' };

      adminMiddleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('returns 403 when user role is user (not admin)', () => {
      const { req, res, next } = mockExpress();
      req.user = { role: 'user' };

      adminMiddleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'FORBIDDEN',
          message: 'Admin access required',
          status: 403,
        },
      });
    });

    it('returns 401 when no user is attached to the request', () => {
      const { req, res, next } = mockExpress();
      // req.user is undefined

      adminMiddleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          status: 401,
        },
      });
    });
  });
});

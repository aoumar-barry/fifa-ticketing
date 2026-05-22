const mongoose = require('mongoose');

// Mock nodemailer
const mockSendMail = jest.fn().mockResolvedValue({});
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: mockSendMail,
  })),
}));

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock Ticket model
const mockPopulate = jest.fn();
const mockTicketFind = jest.fn(() => ({ populate: mockPopulate }));
jest.mock('../../../src/models', () => ({
  Ticket: {
    find: mockTicketFind,
  },
}));

// Now require the real eventBus and the listener (which registers on the same eventBus)
const eventBus = require('../../../src/utils/eventBus');
require('../../../src/listeners/matchListener');
const { logger } = require('../../../src/utils/logger');

describe('matchListener', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockMatch = (overrides = {}) => ({
    _id: new mongoose.Types.ObjectId(),
    teamA: 'France',
    teamB: 'Brésil',
    date: new Date('2026-07-10T18:00:00Z'),
    round: 'final',
    stadiumId: {
      name: 'MetLife Stadium',
      city: 'East Rutherford',
      country: 'USA',
    },
    ...overrides,
  });

  test('sends email to ticket holders when match is updated (SMTP configured)', async () => {
    const match = createMockMatch();

    const buyerUser = {
      _id: new mongoose.Types.ObjectId(),
      email: 'buyer@test.com',
      firstName: 'Jean',
      lastName: 'Dupont',
    };

    mockPopulate.mockResolvedValue([
      { userId: buyerUser, matchId: match._id, status: 'valid' },
    ]);

    // Set SMTP env vars
    const origHost = process.env.SMTP_HOST;
    const origUser = process.env.SMTP_USER;
    const origPass = process.env.SMTP_PASS;
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_USER = 'user@test.com';
    process.env.SMTP_PASS = 'password123';

    eventBus.emit('match:updated', { match });

    // Wait for async event handler to complete
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(mockTicketFind).toHaveBeenCalledWith({
      matchId: match._id,
      status: { $in: ['valid', 'used'] },
    });
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'buyer@test.com',
        subject: expect.stringContaining('France vs Brésil'),
      })
    );

    // Restore
    process.env.SMTP_HOST = origHost;
    process.env.SMTP_USER = origUser;
    process.env.SMTP_PASS = origPass;
  });

  test('deduplicates buyers with multiple tickets', async () => {
    const match = createMockMatch();

    const buyerUser = {
      _id: new mongoose.Types.ObjectId(),
      email: 'same-buyer@test.com',
      firstName: 'Marie',
      lastName: 'Martin',
    };

    // Same buyer has 3 tickets for the same match
    mockPopulate.mockResolvedValue([
      { userId: buyerUser, matchId: match._id, status: 'valid' },
      { userId: buyerUser, matchId: match._id, status: 'valid' },
      { userId: buyerUser, matchId: match._id, status: 'used' },
    ]);

    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_USER = 'user@test.com';
    process.env.SMTP_PASS = 'password123';

    eventBus.emit('match:updated', { match });
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Only 1 email should be sent (deduplicated)
    expect(mockSendMail).toHaveBeenCalledTimes(1);

    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
  });

  test('sends emails to multiple distinct buyers', async () => {
    const match = createMockMatch();

    const buyer1 = {
      _id: new mongoose.Types.ObjectId(),
      email: 'buyer1@test.com',
      firstName: 'Paul',
      lastName: 'Lefevre',
    };
    const buyer2 = {
      _id: new mongoose.Types.ObjectId(),
      email: 'buyer2@test.com',
      firstName: 'Sophie',
      lastName: 'Bernard',
    };

    mockPopulate.mockResolvedValue([
      { userId: buyer1, matchId: match._id, status: 'valid' },
      { userId: buyer2, matchId: match._id, status: 'valid' },
    ]);

    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_USER = 'user@test.com';
    process.env.SMTP_PASS = 'password123';

    eventBus.emit('match:updated', { match });
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(mockSendMail).toHaveBeenCalledTimes(2);

    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
  });

  test('logs mock email when SMTP is not configured', async () => {
    const match = createMockMatch();

    const buyer = {
      _id: new mongoose.Types.ObjectId(),
      email: 'buyer-noemail@test.com',
      firstName: 'Luc',
      lastName: 'Durand',
    };

    mockPopulate.mockResolvedValue([
      { userId: buyer, matchId: match._id, status: 'valid' },
    ]);

    // Ensure SMTP is NOT configured
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;

    eventBus.emit('match:updated', { match });
    await new Promise((resolve) => setTimeout(resolve, 200));

    // No actual email sent
    expect(mockSendMail).not.toHaveBeenCalled();

    // Logger should have been called with mock info
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('buyer-noemail@test.com')
    );
  });

  test('does not send emails when no tickets exist for the match', async () => {
    const match = createMockMatch();

    mockPopulate.mockResolvedValue([]);

    eventBus.emit('match:updated', { match });
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(mockSendMail).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('No ticket holders')
    );
  });
});

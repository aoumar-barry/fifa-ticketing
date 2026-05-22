require('dotenv').config();

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

// We mock the external dependencies for ticketService sequence testing
const mockQrBase64 = 'data:image/png;base64,mock_qr_code_base64_data';
const mockPdfBuffer = Buffer.from('%PDF-1.4 Mock PDF Content');
const mockPdfUrl = 'https://azure.storage/tickets/mock_ticket_id.pdf';

const mockGenerateQR = jest.fn().mockResolvedValue(mockQrBase64);
const mockGenerateTicketPDF = jest.fn().mockResolvedValue(mockPdfBuffer);
const mockUploadPDF = jest.fn().mockResolvedValue(mockPdfUrl);
const mockSendTicketEmail = jest.fn().mockResolvedValue();
const mockUnlockSeat = jest.fn().mockResolvedValue();

// Mock dependencies before requiring the service
jest.mock('../../utils/qrGenerator', () => ({
  generateQR: (...args) => mockGenerateQR(...args),
}));

jest.mock('../../utils/pdfGenerator', () => ({
  generateTicketPDF: (...args) => mockGenerateTicketPDF(...args),
}));

jest.mock('../../utils/blobStorage', () => ({
  uploadPDF: (...args) => mockUploadPDF(...args),
}));

jest.mock('../../services/emailService', () => ({
  sendTicketEmail: (...args) => mockSendTicketEmail(...args),
}));

jest.mock('../../services/seatLockService', () => ({
  unlockSeat: (...args) => mockUnlockSeat(...args),
}));

const ticketService = require('../../services/ticketService');
const { User, Match, Stadium, Seat, Order, Ticket } = require('../../models');

jest.setTimeout(120000);

describe('Ticket Service Unit Tests', () => {
  let mongod;
  let user;
  let stadium;
  let match;
  let seat;
  let order;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri(), { dbName: 'fifa-ticketing-ticket-test' });
    await Promise.all([
      User.syncIndexes(),
      Stadium.syncIndexes(),
      Match.syncIndexes(),
      Seat.syncIndexes(),
      Order.syncIndexes(),
      Ticket.syncIndexes(),
    ]);
  }, 120000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Clear DB
    await Promise.all([
      User.deleteMany({}),
      Stadium.deleteMany({}),
      Match.deleteMany({}),
      Seat.deleteMany({}),
      Order.deleteMany({}),
      Ticket.deleteMany({}),
    ]);

    // Setup basic fixtures
    user = await User.create({
      email: 'ticketbuyer@example.com',
      passwordHash: 'dummy_hash',
      firstName: 'Ticket',
      lastName: 'Buyer',
      isVerified: true,
      role: 'user',
    });

    stadium = await Stadium.create({
      name: 'Azteca Stadium',
      city: 'Mexico City',
      country: 'Mexico',
      capacity: 87500,
    });

    match = await Match.create({
      teamA: 'Mexico',
      teamB: 'Canada',
      round: 'quarter',
      date: new Date('2026-07-05T20:00:00Z'),
      stadiumId: stadium._id,
      totalSeats: 100,
      availableSeats: 99,
      isActive: true,
    });

    seat = await Seat.create({
      stadiumId: stadium._id,
      section: 'B',
      row: '12',
      number: 44,
      category: 'B',
      price: 250,
      status: 'locked',
    });

    order = await Order.create({
      userId: user._id,
      totalAmount: 250,
      status: 'confirmed',
      stripePaymentIntentId: 'pi_ticket_test_123',
    });
  });

  // -------------------------------------------------------------------------
  // Test PDF & QR code generators directly (using actual code)
  // -------------------------------------------------------------------------
  describe('Direct utility tests', () => {
    it('should generate a valid QR code base64 string using qrGenerator', async () => {
      const { generateQR } = jest.requireActual('../../utils/qrGenerator');
      const testId = new mongoose.Types.ObjectId().toString();
      const qrBase64 = await generateQR(testId);
      expect(qrBase64).toMatch(/^data:image\/png;base64,/);
    });

    it('should generate a non-empty PDF buffer using pdfGenerator', async () => {
      const { generateTicketPDF } = jest.requireActual('../../utils/pdfGenerator');
      const testTicket = {
        _id: new mongoose.Types.ObjectId(),
        orderId: new mongoose.Types.ObjectId(),
        qrCode: 'mock-uuid-1234',
      };
      const testQr = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      
      const buffer = await generateTicketPDF(testTicket, testQr, match, seat);
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // Test createTicketsForOrder 7-step sequence & correctness
  // -------------------------------------------------------------------------
  describe('createTicketsForOrder sequence and side effects', () => {
    it('should successfully create tickets and run the steps in correct order', async () => {
      const callSequence = [];

      mockGenerateQR.mockImplementationOnce(async (id) => {
        callSequence.push({ step: 'generateQR', id });
        return mockQrBase64;
      });

      mockGenerateTicketPDF.mockImplementationOnce(async (t) => {
        callSequence.push({ step: 'generateTicketPDF', ticketId: t._id.toString() });
        return mockPdfBuffer;
      });

      mockUploadPDF.mockImplementationOnce(async (buf, name) => {
        callSequence.push({ step: 'uploadPDF', name });
        return mockPdfUrl;
      });

      mockSendTicketEmail.mockImplementationOnce(async (email, url) => {
        callSequence.push({ step: 'sendTicketEmail', email, url });
      });

      mockUnlockSeat.mockImplementationOnce(async (seatId) => {
        callSequence.push({ step: 'unlockSeat', seatId });
      });

      // Call service
      const cartItems = [{ matchId: match._id, seatId: seat._id, price: 250 }];
      await ticketService.createTicketsForOrder(order, cartItems);

      // 1. Verify Ticket created in DB
      const ticket = await Ticket.findOne({ orderId: order._id });
      expect(ticket).not.toBeNull();
      expect(ticket.userId.toString()).toBe(user._id.toString());
      expect(ticket.matchId.toString()).toBe(match._id.toString());
      expect(ticket.seatId.toString()).toBe(seat._id.toString());
      expect(ticket.pdfUrl).toBe(mockPdfUrl);
      expect(ticket.status).toBe('valid');
      expect(ticket.qrCode).toBeDefined(); // should be a UUID v4

      // 2. Verify Seat status updated to sold in DB
      const updatedSeat = await Seat.findById(seat._id);
      expect(updatedSeat.status).toBe('sold');

      // 3. Verify sequence order
      expect(callSequence).toHaveLength(5);
      expect(callSequence[0].step).toBe('generateQR');
      expect(callSequence[0].id).toBe(ticket._id.toString());

      expect(callSequence[1].step).toBe('generateTicketPDF');
      expect(callSequence[1].ticketId).toBe(ticket._id.toString());

      expect(callSequence[2].step).toBe('uploadPDF');
      expect(callSequence[2].name).toBe(`${ticket._id}.pdf`);

      expect(callSequence[3].step).toBe('sendTicketEmail');
      expect(callSequence[3].email).toBe(user.email);
      expect(callSequence[3].url).toBe(mockPdfUrl);

      expect(callSequence[4].step).toBe('unlockSeat');
      expect(callSequence[4].seatId).toBe(seat._id.toString());
    });

    it('should throw AppError if user does not exist', async () => {
      const badOrder = {
        _id: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
      };
      await expect(ticketService.createTicketsForOrder(badOrder, [])).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    it('should throw AppError if match or seat does not exist', async () => {
      const cartItems = [{ matchId: new mongoose.Types.ObjectId(), seatId: seat._id }];
      await expect(ticketService.createTicketsForOrder(order, cartItems)).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  // -------------------------------------------------------------------------
  // Test verifyTicketAccess controls
  // -------------------------------------------------------------------------
  describe('verifyTicketAccess controls', () => {
    let ticket;

    beforeEach(async () => {
      ticket = await Ticket.create({
        orderId: order._id,
        matchId: match._id,
        seatId: seat._id,
        userId: user._id,
        qrCode: 'uuid-ref-123',
        status: 'valid',
      });
    });

    it('should grant access to the ticket owner', async () => {
      const accessedTicket = await ticketService.verifyTicketAccess(
        ticket._id.toString(),
        user._id.toString(),
        'user'
      );
      expect(accessedTicket._id.toString()).toBe(ticket._id.toString());
    });

    it('should grant access to an admin even if they are not the owner', async () => {
      const accessedTicket = await ticketService.verifyTicketAccess(
        ticket._id.toString(),
        new mongoose.Types.ObjectId().toString(),
        'admin'
      );
      expect(accessedTicket._id.toString()).toBe(ticket._id.toString());
    });

    it('should reject access to another non-admin user (403)', async () => {
      const strangerId = new mongoose.Types.ObjectId().toString();
      await expect(
        ticketService.verifyTicketAccess(ticket._id.toString(), strangerId, 'user')
      ).rejects.toMatchObject({
        status: 403,
        code: 'FORBIDDEN',
      });
    });

    it('should reject access for non-existent ticket (404)', async () => {
      const fakeTicketId = new mongoose.Types.ObjectId().toString();
      await expect(
        ticketService.verifyTicketAccess(fakeTicketId, user._id.toString(), 'user')
      ).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });
  });

  // -------------------------------------------------------------------------
  // Test getTicketQR controls
  // -------------------------------------------------------------------------
  describe('getTicketQR access', () => {
    let ticket;

    beforeEach(async () => {
      ticket = await Ticket.create({
        orderId: order._id,
        matchId: match._id,
        seatId: seat._id,
        userId: user._id,
        qrCode: 'uuid-ref-123',
        status: 'valid',
      });
    });

    it('should return base64 qr code for the owner', async () => {
      mockGenerateQR.mockResolvedValueOnce(mockQrBase64);
      const res = await ticketService.getTicketQR(
        ticket._id.toString(),
        user._id.toString(),
        'user'
      );
      expect(res).toBe(mockQrBase64);
      expect(mockGenerateQR).toHaveBeenCalledWith(ticket._id.toString());
    });

    it('should throw FORBIDDEN if stranger requests qr', async () => {
      const strangerId = new mongoose.Types.ObjectId().toString();
      await expect(
        ticketService.getTicketQR(ticket._id.toString(), strangerId, 'user')
      ).rejects.toMatchObject({
        status: 403,
      });
    });
  });
});

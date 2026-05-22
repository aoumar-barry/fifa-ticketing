require('dotenv').config();
const nodemailer = require('nodemailer');
const { sendTicketEmail } = require('../../services/emailService');
const { logger } = require('../../utils/logger');

jest.mock('nodemailer');
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Email Service Unit Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should fall back to development logger if SMTP variables are missing', async () => {
    // Ensure SMTP config is absent
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;

    const mockDetails = {
      ticket: { orderId: 'ticketOrderId123' },
      match: {
        teamA: 'France',
        teamB: 'Brazil',
        date: new Date('2026-06-25T18:00:00Z'),
        stadiumId: { name: 'Stade de France', city: 'Saint-Denis', country: 'France' }
      },
      seat: { section: 'A', row: '10', number: 12, price: 150 },
      order: { _id: 'orderId123', totalAmount: 150 }
    };

    await sendTicketEmail('buyer@example.com', 'https://blob.storage/ticket.pdf', mockDetails);

    // Verify info log is called with mock details
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('[Email Mock] Email de confirmation non envoyé'));
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('France vs Brazil'));
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
  });

  it('should construct and send HTML email if SMTP variables are provided', async () => {
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'smtp_user';
    process.env.SMTP_PASS = 'smtp_pass';

    const sendMailMock = jest.fn().mockResolvedValue({ messageId: '123' });
    nodemailer.createTransport.mockReturnValue({
      sendMail: sendMailMock,
    });

    const mockDetails = {
      ticket: { orderId: 'ticketOrderId123' },
      match: {
        teamA: 'France',
        teamB: 'Brazil',
        date: new Date('2026-06-25T18:00:00Z'),
        stadiumId: { name: 'Stade de France', city: 'Saint-Denis', country: 'France' }
      },
      seat: { section: 'A', row: '10', number: 12, price: 150 },
      order: { _id: 'orderId123', totalAmount: 150 }
    };

    await sendTicketEmail('buyer@example.com', 'https://blob.storage/ticket.pdf', mockDetails);

    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      auth: { user: 'smtp_user', pass: 'smtp_pass' },
    });

    expect(sendMailMock).toHaveBeenCalled();
    const mailOptions = sendMailMock.mock.calls[0][0];
    expect(mailOptions.to).toBe('buyer@example.com');
    expect(mailOptions.subject).toContain('Vos Billets Officiels');
    expect(mailOptions.html).toContain('France');
    expect(mailOptions.html).toContain('Brazil');
    expect(mailOptions.html).toContain('Stade de France');
    expect(mailOptions.html).toContain('Saint-Denis, France');
    expect(mailOptions.html).toContain('Section :</strong> A');
    expect(mailOptions.html).toContain('150 €');
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Email de confirmation envoyé à buyer@example.com'));
  });

  it('should format date in French successfully', async () => {
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'smtp_user';
    process.env.SMTP_PASS = 'smtp_pass';

    const sendMailMock = jest.fn().mockResolvedValue({ messageId: '123' });
    nodemailer.createTransport.mockReturnValue({
      sendMail: sendMailMock,
    });

    const mockDetails = {
      ticket: { orderId: 'ticketOrderId123' },
      match: {
        teamA: 'France',
        teamB: 'Brazil',
        date: new Date('2026-06-25T18:00:00Z'),
        stadiumId: { name: 'Stade de France', city: 'Saint-Denis', country: 'France' }
      },
      seat: { section: 'A', row: '10', number: 12, price: 150 },
      order: { _id: 'orderId123', totalAmount: 150 }
    };

    await sendTicketEmail('buyer@example.com', 'https://blob.storage/ticket.pdf', mockDetails);

    const mailOptions = sendMailMock.mock.calls[0][0];
    // "juin" in French (lowercase or uppercase)
    expect(mailOptions.html.toLowerCase()).toContain('juin');
  });

  it('should handle SMTP transport error gracefully', async () => {
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'smtp_user';
    process.env.SMTP_PASS = 'smtp_pass';

    const error = new Error('SMTP connection timed out');
    const sendMailMock = jest.fn().mockRejectedValue(error);
    nodemailer.createTransport.mockReturnValue({
      sendMail: sendMailMock,
    });

    const mockDetails = {
      ticket: { orderId: 'ticketOrderId123' },
      match: {
        teamA: 'France',
        teamB: 'Brazil',
        date: new Date('2026-06-25T18:00:00Z'),
      },
      seat: { section: 'A', row: '10', number: 12, price: 150 },
      order: { _id: 'orderId123', totalAmount: 150 }
    };

    await sendTicketEmail('buyer@example.com', 'https://blob.storage/ticket.pdf', mockDetails);

    expect(logger.error).toHaveBeenCalledWith({ err: error }, expect.stringContaining("Échec de l'envoi de l'email"));
  });
});

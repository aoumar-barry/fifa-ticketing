const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const { startSmtpDevServer, stopSmtpDevServer } = require('../../utils/smtpDevServer');

const EMAILS_DIR = path.join(__dirname, '../../../temp/emails');

describe('SMTP Dev Server', () => {
  let server;

  beforeAll(() => {
    // Ensure cleanup of EMAILS_DIR before starting
    if (fs.existsSync(EMAILS_DIR)) {
      const files = fs.readdirSync(EMAILS_DIR);
      for (const file of files) {
        fs.unlinkSync(path.join(EMAILS_DIR, file));
      }
    }
  });

  afterAll(() => {
    stopSmtpDevServer();
  });

  it('starts the SMTP dev server and writes received email to html file', (done) => {
    server = startSmtpDevServer(1026);

    const transporter = nodemailer.createTransport({
      host: '127.0.0.1',
      port: 1026,
      secure: false,
      auth: {
        user: 'test-user',
        pass: 'test-pass'
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    transporter.sendMail({
      from: '"Test Sender" <sender@example.com>',
      to: 'recipient@example.com',
      subject: 'Hello Local SMTP Test',
      text: 'This is a test email body',
      html: '<p>This is a test email body in HTML</p>'
    }, (err, info) => {
      expect(err).toBeNull();
      expect(info.messageId).toBeDefined();

      // Give it a moment to finish onData parsing and writing
      setTimeout(() => {
        expect(fs.existsSync(EMAILS_DIR)).toBe(true);
        const files = fs.readdirSync(EMAILS_DIR);
        expect(files.length).toBeGreaterThanOrEqual(1);

        const testFile = files.find(f => f.includes('Hello_Local_SMTP_Test'));
        expect(testFile).toBeDefined();

        const fileContent = fs.readFileSync(path.join(EMAILS_DIR, testFile), 'utf8');
        expect(fileContent).toContain('De :');
        expect(fileContent).toContain('sender@example.com');
        expect(fileContent).toContain('recipient@example.com');
        expect(fileContent).toContain('Hello Local SMTP Test');
        expect(fileContent).toContain('<p>This is a test email body in HTML</p>');

        // Cleanup
        fs.unlinkSync(path.join(EMAILS_DIR, testFile));
        done();
      }, 500);
    });
  });
});

const { SMTPServer } = require('smtp-server');
const { simpleParser } = require('mailparser');
const fs = require('fs');
const path = require('path');
const { logger } = require('./logger');

const EMAILS_DIR = path.join(__dirname, '../../temp/emails');

let server = null;

function startSmtpDevServer(port = 1025) {
  // Ensure temp directory exists
  if (!fs.existsSync(EMAILS_DIR)) {
    fs.mkdirSync(EMAILS_DIR, { recursive: true });
  }

  server = new SMTPServer({
    // Permissive auth for local development
    authOptional: true,
    onAuth(auth, session, callback) {
      // Accept any credentials
      return callback(null, { user: auth.username || 'dev' });
    },
    // Don't enforce STARTTLS for local dev
    disabledCommands: ['STARTTLS'],
    onData(stream, session, callback) {
      simpleParser(stream)
        .then((parsed) => {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const safeSubject = (parsed.subject || 'no-subject')
            .replace(/[^a-zA-Z0-9_-]/g, '_')
            .substring(0, 50);
          const fileName = `${timestamp}-${safeSubject}.html`;
          const filePath = path.join(EMAILS_DIR, fileName);

          const fromText = parsed.from ? parsed.from.text : 'Unknown';
          const toText = parsed.to ? (Array.isArray(parsed.to) ? parsed.to.map(t => t.text).join(', ') : parsed.to.text) : 'Unknown';
          const dateText = parsed.date ? parsed.date.toLocaleString() : new Date().toLocaleString();

          // Generate HTML preview file with a premium look
          const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Dev Email Preview: ${parsed.subject || '(No Subject)'}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f5f5f7;
      color: #1d1d1f;
      margin: 0;
      padding: 20px;
    }
    .preview-container {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      overflow: hidden;
      border: 1px solid #d2d2d7;
    }
    .meta-header {
      background-color: #f5f5f7;
      padding: 20px;
      border-bottom: 1px solid #e5e5ea;
    }
    .meta-row {
      margin-bottom: 8px;
      font-size: 14px;
      display: flex;
    }
    .meta-row:last-child {
      margin-bottom: 0;
    }
    .meta-label {
      font-weight: 600;
      color: #86868b;
      width: 100px;
      flex-shrink: 0;
    }
    .meta-value {
      color: #1d1d1f;
      word-break: break-all;
    }
    .email-body {
      padding: 30px;
      background: #ffffff;
    }
    iframe {
      width: 100%;
      border: none;
      min-height: 400px;
    }
  </style>
</head>
<body>
  <div class="preview-container">
    <div class="meta-header">
      <div class="meta-row">
        <span class="meta-label">De :</span>
        <span class="meta-value">${escapeHtml(fromText)}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">À :</span>
        <span class="meta-value">${escapeHtml(toText)}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Date :</span>
        <span class="meta-value">${escapeHtml(dateText)}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Sujet :</span>
        <span class="meta-value" style="font-weight: 600;">${escapeHtml(parsed.subject || '(Sans sujet)')}</span>
      </div>
    </div>
    <div class="email-body">
      ${parsed.html ? parsed.html : `<pre style="white-space: pre-wrap; font-family: monospace;">${escapeHtml(parsed.text || '')}</pre>`}
    </div>
  </div>
</body>
</html>
          `;

          fs.writeFileSync(filePath, htmlContent, 'utf8');
          logger.info({ filePath, subject: parsed.subject }, 'Local SMTP: E-mail received and saved to disk');
          callback();
        })
        .catch((err) => {
          logger.error(err, 'Local SMTP: Error parsing incoming email');
          callback(err);
        });
    }
  });

  server.listen(port, () => {
    logger.info(`Local SMTP dev server listening on port ${port}`);
  });

  server.on('error', (err) => {
    logger.error(err, 'Local SMTP dev server encountered an error');
  });

  return server;
}

function stopSmtpDevServer() {
  if (server) {
    server.close(() => {
      logger.info('Local SMTP dev server stopped');
    });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = {
  startSmtpDevServer,
  stopSmtpDevServer,
};

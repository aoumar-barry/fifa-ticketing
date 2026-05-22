const nodemailer = require('nodemailer');
const { loadEnv } = require('./env');

/**
 * Creates and returns a Nodemailer transporter if SMTP settings are configured.
 * Otherwise returns null.
 *
 * @returns {object|null}
 */
function createMailTransporter() {
  const env = loadEnv();
  const host = env.SMTP_HOST;
  const port = env.SMTP_PORT || 587;
  const user = env.SMTP_USER;
  const pass = env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

module.exports = {
  createMailTransporter,
  get fromEmail() {
    const env = loadEnv();
    return env.SMTP_FROM || (env.SMTP_USER && env.SMTP_USER.includes('@') ? env.SMTP_USER : 'tickets@fifa2026.com');
  },
};

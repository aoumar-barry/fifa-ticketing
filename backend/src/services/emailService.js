const nodemailer = require('nodemailer');
const { logger } = require('../utils/logger');

/**
 * Send ticket confirmation email.
 *
 * @param {string} to  Recipient email address
 * @param {string} pdfUrl  URL of the ticket PDF
 * @param {object} details  Ticket details (match, seat, etc.)
 * @returns {Promise<void>}
 */
async function sendTicketEmail(to, pdfUrl, details) {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  const mailOptions = {
    from: `"FIFA World Cup 2026" <${user || 'tickets@fifa2026.com'}>`,
    to,
    subject: 'Vos Billets Officiels - FIFA World Cup 2026 🎟️',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #0A0A0F;">FIFA World Cup 2026</h2>
        <p>Bonjour,</p>
        <p>Merci pour votre achat ! Votre paiement a été confirmé avec succès.</p>
        <div style="background-color: #F8F8FC; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #F5A623;">Détails de votre billet</h3>
          <p><strong>Match :</strong> ${details.match.teamA} vs ${details.match.teamB}</p>
          <p><strong>Date :</strong> ${new Date(details.match.date).toUTCString()}</p>
          <p><strong>Siège :</strong> Section ${details.seat.section}, Rangée ${details.seat.row}, Numéro ${details.seat.number}</p>
        </div>
        <p>Vous pouvez télécharger votre billet au format PDF en cliquant sur le lien ci-dessous :</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${pdfUrl}" style="background-color: #F5A623; color: #000; padding: 12px 25px; text-decoration: none; border-radius: 20px; font-weight: bold; display: inline-block;">Télécharger mon Billet (PDF)</a>
        </p>
        <p>Ce billet contient un QR code unique qui sera scanné à l'entrée du stade.</p>
        <p>À bientôt dans les stades !<br/>L'équipe FIFA World Cup 2026</p>
      </div>
    `,
  };

  if (host && user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });

      await transporter.sendMail(mailOptions);
      logger.info(`Email de confirmation envoyé à ${to}`);
    } catch (err) {
      logger.error({ err }, `Échec de l'envoi de l'email de confirmation à ${to}`);
    }
  } else {
    // Development fallback
    logger.info(`[Email Mock] Email de confirmation non envoyé (SMTP non configuré).
Destination : ${to}
URL PDF : ${pdfUrl}
Contenu : Match ${details.match.teamA} vs ${details.match.teamB}, Siège Section ${details.seat.section} Row ${details.seat.row} Num ${details.seat.number}`);
  }
}

module.exports = { sendTicketEmail };

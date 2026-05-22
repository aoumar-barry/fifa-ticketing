const nodemailer = require('nodemailer');
const { logger } = require('../utils/logger');

/**
 * Send ticket confirmation email.
 *
 * @param {string} to  Recipient email address
 * @param {string} pdfUrl  URL of the ticket PDF
 * @param {object} details  Ticket details (match, seat, order, etc.)
 * @returns {Promise<void>}
 */
async function sendTicketEmail(to, pdfUrl, details) {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const fromEmail = process.env.SMTP_FROM || (user && user.includes('@') ? user : 'tickets@fifa2026.com');

  const ticket = details?.ticket;
  const match = details?.match || {};
  const seat = details?.seat || {};
  const order = details?.order;

  const orderId = order?._id ? order._id.toString() : (ticket?.orderId ? ticket.orderId.toString() : 'N/A');
  const totalAmount = order?.totalAmount !== undefined ? order.totalAmount : (seat?.price || 0);
  const seatPrice = seat?.price !== undefined ? seat.price : 0;

  let formattedDate = 'Date non spécifiée';
  if (match.date) {
    try {
      const dateObj = new Date(match.date);
      if (!isNaN(dateObj)) {
        formattedDate = dateObj.toLocaleDateString('fr-FR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'UTC',
        });
        formattedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
      }
    } catch (e) {
      logger.error({ err: e }, "Erreur lors du formatage de la date du match pour l'email");
    }
  }

  const stadiumName = match.stadiumId?.name || 'Stade non spécifié';
  const stadiumLocation = match.stadiumId?.city && match.stadiumId?.country
    ? `${match.stadiumId.city}, ${match.stadiumId.country}`
    : (match.stadiumId?.city || match.stadiumId?.country || '');

  const mailOptions = {
    from: `"FIFA World Cup 2026" <${fromEmail}>`,
    to,
    subject: 'Vos Billets Officiels - FIFA World Cup 2026 🎟️',
    html: `
      <div style="background-color: #F8FAFC; padding: 40px 20px; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; color: #1E293B; line-height: 1.5;">
        <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #E2E8F0;">
          
          <!-- Header -->
          <div style="background-color: #0F172A; padding: 24px; text-align: center; border-bottom: 4px solid #D97706;">
            <h1 style="color: #FFFFFF; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase;">
              FIFA World Cup 2026™
            </h1>
            <p style="color: #94A3B8; margin: 4px 0 0 0; font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase;">
              Billets Officiels
            </p>
          </div>

          <!-- Body -->
          <div style="padding: 32px 24px;">
            <h2 style="color: #0F172A; margin: 0 0 8px 0; font-size: 20px; font-weight: 700;">
              Merci pour votre achat !
            </h2>
            <p style="color: #475569; margin: 0 0 24px 0; font-size: 15px;">
              Votre paiement a été confirmé avec succès. Vous trouverez ci-dessous le récapitulatif de votre commande ainsi que vos informations d'accès.
            </p>

            <!-- Order Info Callout -->
            <div style="background-color: #F1F5F9; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #E2E8F0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 4px 0; font-size: 13px; color: #64748B; text-transform: uppercase; font-weight: 600;">Commande :</td>
                  <td style="padding: 4px 0; font-size: 14px; color: #0F172A; text-align: right; font-weight: 700;">#${orderId}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-size: 13px; color: #64748B; text-transform: uppercase; font-weight: 600;">Statut :</td>
                  <td style="padding: 4px 0; font-size: 14px; text-align: right;">
                    <span style="background-color: #DCFCE7; color: #166534; padding: 4px 10px; border-radius: 9999px; font-weight: 700; font-size: 12px;">Confirmé ✅</span>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Match Info Card -->
            <div style="background: radial-gradient(circle at top right, #1E293B, #0F172A); border-radius: 12px; padding: 24px; color: #FFFFFF; margin-bottom: 24px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);">
              <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #D97706; letter-spacing: 0.1em; margin-bottom: 8px;">
                Match de la Coupe du Monde
              </div>
              <div style="font-size: 20px; font-weight: 800; margin-bottom: 12px; border-bottom: 1px solid #334155; padding-bottom: 12px;">
                ${match.teamA || 'Équipe A'} <span style="color: #64748B; font-weight: 400;">vs</span> ${match.teamB || 'Équipe B'}
              </div>
              
              <table style="width: 100%; border-collapse: collapse; color: #E2E8F0; font-size: 14px;">
                <tr>
                  <td style="padding: 6px 0; font-weight: 600; color: #94A3B8; width: 80px;">Date :</td>
                  <td style="padding: 6px 0; font-weight: 700;">${formattedDate}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-weight: 600; color: #94A3B8;">Stade :</td>
                  <td style="padding: 6px 0;">
                    <span style="font-weight: 700; color: #FFFFFF;">${stadiumName}</span>
                    ${stadiumLocation ? `<br/><span style="font-size: 12px; color: #94A3B8;">${stadiumLocation}</span>` : ''}
                  </td>
                </tr>
              </table>
            </div>

            <!-- Seat details & pricing -->
            <h3 style="color: #0F172A; margin: 0 0 12px 0; font-size: 16px; font-weight: 700; border-bottom: 2px solid #F1F5F9; padding-bottom: 8px;">
              Votre Siège & Facturation
            </h3>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #F1F5F9;">
                  <strong>Section :</strong> ${seat.section || 'N/A'}
                </td>
                <td style="padding: 10px 0; border-bottom: 1px solid #F1F5F9;">
                  <strong>Rangée :</strong> ${seat.row || 'N/A'}
                </td>
                <td style="padding: 10px 0; border-bottom: 1px solid #F1F5F9; text-align: right;">
                  <strong>Siège :</strong> ${seat.number || 'N/A'}
                </td>
              </tr>
              <tr>
                <td colspan="2" style="padding: 12px 0; color: #475569;">Montant du billet :</td>
                <td style="padding: 12px 0; text-align: right; font-weight: 600; color: #0F172A;">${seatPrice} €</td>
              </tr>
              <tr>
                <td colspan="2" style="padding: 12px 0 0 0; color: #0F172A; font-weight: 700; font-size: 15px;">Total de la commande :</td>
                <td style="padding: 12px 0 0 0; text-align: right; font-weight: 800; color: #D97706; font-size: 16px;">${totalAmount} €</td>
              </tr>
            </table>

            <!-- CTA -->
            <div style="text-align: center; margin: 36px 0 24px 0;">
              <a href="${pdfUrl}" style="background-color: #D97706; color: #FFFFFF; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(217, 119, 6, 0.2), 0 2px 4px -1px rgba(217, 119, 6, 0.1);">
                Télécharger mon Billet (PDF)
              </a>
            </div>

            <p style="color: #64748B; font-size: 12px; text-align: center; margin: 0;">
              Ce billet électronique contient un QR code unique qui sera scanné aux portillons du stade.<br/>
              Conservez-le précieusement sur votre téléphone ou imprimez-le.
            </p>

          </div>

          <!-- Footer -->
          <div style="background-color: #F8FAFC; padding: 20px; text-align: center; border-top: 1px solid #E2E8F0;">
            <p style="color: #94A3B8; margin: 0; font-size: 11px;">
              © 2026 FIFA World Cup. Tous droits réservés.
            </p>
          </div>

        </div>
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
        tls: {
          rejectUnauthorized: false,
        },
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
Contenu : Match ${match.teamA} vs ${match.teamB}, Siège Section ${seat.section} Row ${seat.row} Num ${seat.number}`);
  }
}

module.exports = { sendTicketEmail };

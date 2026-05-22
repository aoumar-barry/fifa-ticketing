const mailer = require('../config/mailer');
const eventBus = require('../utils/eventBus');
const { Ticket } = require('../models');
const { logger } = require('../utils/logger');

/**
 * Listen for 'match:updated' events and notify all ticket holders.
 *
 * Payload expected:
 *   { match }   — the updated match document (populated with stadiumId)
 */
eventBus.on('match:updated', async ({ match }) => {
  try {
    // Find all active ticket holders for this match
    const tickets = await Ticket.find({
      matchId: match._id || match.id,
      status: { $in: ['valid', 'used'] },
    }).populate('userId');

    if (!tickets.length) {
      logger.info(`[matchListener] No ticket holders to notify for match ${match._id || match.id}`);
      return;
    }

    // Deduplicate by email (a buyer could have multiple tickets)
    const buyerMap = new Map();
    for (const ticket of tickets) {
      if (ticket.userId && ticket.userId.email) {
        buyerMap.set(ticket.userId.email, ticket.userId);
      }
    }

    const buyers = Array.from(buyerMap.values());
    logger.info(`[matchListener] Notifying ${buyers.length} buyer(s) for match ${match.teamA} vs ${match.teamB}`);

    // Format match date for email
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
        // keep default
      }
    }

    const stadiumName = match.stadiumId?.name || match.stadium?.name || 'Stade non spécifié';
    const stadiumCity = match.stadiumId?.city || match.stadium?.city || '';
    const stadiumCountry = match.stadiumId?.country || match.stadium?.country || '';
    const stadiumLocation = stadiumCity && stadiumCountry
      ? `${stadiumCity}, ${stadiumCountry}`
      : (stadiumCity || stadiumCountry || '');

    const htmlContent = `
      <div style="background-color: #F8FAFC; padding: 40px 20px; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; color: #1E293B; line-height: 1.5;">
        <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid #E2E8F0;">

          <!-- Header -->
          <div style="background-color: #0F172A; padding: 24px; text-align: center; border-bottom: 4px solid #EF4444;">
            <h1 style="color: #FFFFFF; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase;">
              FIFA World Cup 2026™
            </h1>
            <p style="color: #94A3B8; margin: 4px 0 0 0; font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase;">
              Modification de Match
            </p>
          </div>

          <!-- Body -->
          <div style="padding: 32px 24px;">
            <div style="background-color: #FEF3C7; border: 1px solid #F59E0B; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
              <p style="margin: 0; font-size: 14px; color: #92400E; font-weight: 600;">
                ⚠️ Les informations de votre match ont été mises à jour
              </p>
            </div>

            <h2 style="color: #0F172A; margin: 0 0 8px 0; font-size: 20px; font-weight: 700;">
              Match modifié
            </h2>
            <p style="color: #475569; margin: 0 0 24px 0; font-size: 15px;">
              Nous vous informons que les détails du match pour lequel vous avez des billets ont été modifiés. Veuillez prendre note des informations actualisées ci-dessous.
            </p>

            <!-- Match Info Card -->
            <div style="background: radial-gradient(circle at top right, #1E293B, #0F172A); border-radius: 12px; padding: 24px; color: #FFFFFF; margin-bottom: 24px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);">
              <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #F59E0B; letter-spacing: 0.1em; margin-bottom: 8px;">
                Nouvelles informations
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

            <p style="color: #64748B; font-size: 13px; text-align: center; margin: 0;">
              Vos billets restent valides. Aucune action supplémentaire n'est requise de votre part.
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
    `;

    // Send emails to all buyers
    const transporter = mailer.createMailTransporter();

    for (const buyer of buyers) {
      const mailOptions = {
        from: `"FIFA World Cup 2026" <${mailer.fromEmail}>`,
        to: buyer.email,
        subject: `⚠️ Match modifié : ${match.teamA} vs ${match.teamB} - FIFA World Cup 2026`,
        html: htmlContent,
      };

      if (transporter) {
        try {
          await transporter.sendMail(mailOptions);
          logger.info(`[matchListener] Notification envoyée à ${buyer.email}`);
        } catch (err) {
          logger.error({ err }, `[matchListener] Échec de l'envoi de notification à ${buyer.email}`);
        }
      } else {
        // Development fallback
        logger.info(`[matchListener][Email Mock] Notification match modifié non envoyée (SMTP non configuré).
Destination : ${buyer.email}
Match : ${match.teamA} vs ${match.teamB}
Date : ${formattedDate}
Stade : ${stadiumName}`);
      }
    }
  } catch (err) {
    logger.error({ err }, '[matchListener] Error processing match:updated event');
  }
});

module.exports = {}; // Module loaded for its side-effect (event registration)

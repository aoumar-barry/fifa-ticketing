const QRCode = require('qrcode');

/**
 * Generate a QR code base64 image string for a ticket.
 *
 * @param {string} text  The content to encode (usually ticketId)
 * @returns {Promise<string>} Base64 image data URL (png)
 */
async function generateQR(text) {
  try {
    return await QRCode.toDataURL(text);
  } catch (err) {
    throw new Error(`Erreur lors de la génération du QR Code : ${err.message}`);
  }
}

module.exports = { generateQR };

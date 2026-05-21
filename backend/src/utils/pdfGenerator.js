const PDFDocument = require('pdfkit');

/**
 * Generate a ticket PDF buffer.
 *
 * @param {object} ticket  Ticket Mongoose document
 * @param {string} qrBase64  Base64 data URL of the QR code
 * @param {object} match  Match details
 * @param {object} seat  Seat details
 * @returns {Promise<Buffer>} PDF file buffer
 */
function generateTicketPDF(ticket, qrBase64, match, seat) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // Header Banner Background
      doc.rect(0, 0, 595.28, 120)
         .fill('#0A0A0F'); // Dark primary

      // Gold line under banner
      doc.rect(0, 120, 595.28, 5)
         .fill('#F5A623'); // Brand Gold

      // Title
      doc.fillColor('#FFFFFF')
         .font('Helvetica-Bold')
         .fontSize(24)
         .text('FIFA WORLD CUP 2026', 50, 45, { align: 'left' });

      doc.fillColor('#F5A623')
         .font('Helvetica')
         .fontSize(14)
         .text('OFFICIAL TICKET', 50, 75);

      // Match details
      doc.fillColor('#0A0A0F')
         .font('Helvetica-Bold')
         .fontSize(18)
         .text(`${match.teamA} vs ${match.teamB}`, 50, 160);

      doc.font('Helvetica')
         .fontSize(12)
         .fillColor('#5A5A72')
         .text(`Date & Hour: ${new Date(match.date).toUTCString()}`, 50, 195)
         .text(`Stadium: ${match.stadiumId?.name || 'Stade Officiel'}`, 50, 215)
         .text(`City: ${match.stadiumId?.city || ''}, ${match.stadiumId?.country || ''}`, 50, 235);

      // Seat Details box
      doc.rect(50, 270, 495.28, 80)
         .fillAndStroke('#111118', '#F5A623'); // Dark secondary with Gold border

      doc.fillColor('#FFFFFF')
         .font('Helvetica-Bold')
         .fontSize(12)
         .text('SEAT INFORMATION', 70, 285)
         .font('Helvetica')
         .fontSize(14)
         .text(`Section: ${seat.section}   |   Row: ${seat.row}   |   Number: ${seat.number}`, 70, 310);

      // QR Code title
      doc.fillColor('#0A0A0F')
         .font('Helvetica-Bold')
         .fontSize(12)
         .text('SECURE ENTRY QR CODE', 50, 390);

      // Convert base64 data URL to image buffer
      const qrImageBuffer = Buffer.from(qrBase64.replace(/^data:image\/png;base64,/, ''), 'base64');
      doc.image(qrImageBuffer, 50, 410, { width: 150 });

      // Ticket ID and reference
      doc.fontSize(10)
         .fillColor('#5A5A72')
         .text(`Ticket ID: ${ticket._id}`, 50, 580)
         .text(`Order ID: ${ticket.orderId}`, 50, 595)
         .text(`Security Ref: ${ticket.qrCode}`, 50, 610);

      // Footer notice
      doc.rect(0, 782, 595.28, 60)
         .fill('#0A0A0F');

      doc.fillColor('#A0A0B8')
         .fontSize(8)
         .text('This ticket is personal and non-transferable. Please present this ticket at the stadium entrance.', 50, 800, { align: 'center', width: 495.28 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateTicketPDF };

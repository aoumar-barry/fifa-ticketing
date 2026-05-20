const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true },
    seatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Seat', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // UUID v4 généré lors de la création — clé du QR code.
    qrCode: { type: String, required: true, unique: true },
    pdfUrl: { type: String, trim: true },
    status: {
      type: String,
      enum: ['valid', 'used', 'cancelled'],
      default: 'valid',
    },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

TicketSchema.index({ qrCode: 1 }, { unique: true });
TicketSchema.index({ userId: 1 });
TicketSchema.index({ orderId: 1 });

module.exports = mongoose.models.Ticket || mongoose.model('Ticket', TicketSchema);

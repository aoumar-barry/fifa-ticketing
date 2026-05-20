const mongoose = require('mongoose');

const SeatSchema = new mongoose.Schema(
  {
    stadiumId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stadium', required: true },
    section: { type: String, required: true, trim: true },
    row: { type: String, required: true, trim: true },
    number: { type: Number, required: true, min: 1 },
    category: { type: String, enum: ['A', 'B', 'C'], required: true },
    price: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['available', 'locked', 'sold'],
      default: 'available',
    },
  },
  { versionKey: false },
);

// Unicité physique d'un siège dans un stade donné.
SeatSchema.index(
  { stadiumId: 1, section: 1, row: 1, number: 1 },
  { unique: true },
);
SeatSchema.index({ stadiumId: 1, status: 1 });

module.exports = mongoose.models.Seat || mongoose.model('Seat', SeatSchema);

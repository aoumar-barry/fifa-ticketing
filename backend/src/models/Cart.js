const mongoose = require('mongoose');

const CartItemSchema = new mongoose.Schema(
  {
    matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true },
    seatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Seat', required: true },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const CartSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // TTL index : le document est supprimé automatiquement à expiresAt.
    // Durée : 600s (10 min) — voir CLAUDE.md §3.2.
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'confirmed'],
      default: 'active',
    },
    items: { type: [CartItemSchema], default: [] },
  },
  { versionKey: false, timestamps: { createdAt: true, updatedAt: false } },
);

CartSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.models.Cart || mongoose.model('Cart', CartSchema);

const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'pending',
    },
    stripePaymentIntentId: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ stripePaymentIntentId: 1 }, { sparse: true });

module.exports = mongoose.models.Order || mongoose.model('Order', OrderSchema);

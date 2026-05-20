const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'usd', lowercase: true, trim: true },
    method: { type: String, enum: ['STRIPE'], default: 'STRIPE' },
    status: {
      type: String,
      enum: ['pending', 'succeeded', 'failed'],
      required: true,
    },
    transactionId: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

PaymentSchema.index({ orderId: 1 });
PaymentSchema.index({ transactionId: 1 }, { sparse: true });

module.exports = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);

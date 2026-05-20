const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    otpCode: { type: String, select: false },
    otpExpiresAt: { type: Date, select: false },
    isVerified: { type: Boolean, default: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

UserSchema.index({ email: 1 }, { unique: true });

UserSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.otpCode;
    delete ret.otpExpiresAt;
    return ret;
  },
});

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);

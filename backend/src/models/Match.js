const mongoose = require('mongoose');

const MatchSchema = new mongoose.Schema(
  {
    teamA: { type: String, required: true, trim: true },
    teamB: { type: String, required: true, trim: true },
    round: {
      type: String,
      enum: ['group', 'round16', 'quarter', 'semi', 'final'],
      required: true,
    },
    group: { type: String, trim: true },
    date: { type: Date, required: true },
    stadiumId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stadium', required: true },
    totalSeats: { type: Number, required: true, min: 0 },
    availableSeats: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { versionKey: false },
);

MatchSchema.index({ date: 1 });
MatchSchema.index({ stadiumId: 1 });
MatchSchema.index({ isActive: 1, date: 1 });

module.exports = mongoose.models.Match || mongoose.model('Match', MatchSchema);

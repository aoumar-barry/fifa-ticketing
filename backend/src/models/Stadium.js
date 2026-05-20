const mongoose = require('mongoose');

const StadiumSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    capacity: { type: Number, required: true, min: 1 },
  },
  { versionKey: false },
);

StadiumSchema.index({ city: 1 });

module.exports = mongoose.models.Stadium || mongoose.model('Stadium', StadiumSchema);

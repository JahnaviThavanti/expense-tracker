const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  action: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Activity", activitySchema);

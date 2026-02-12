const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: String,
  userId: mongoose.Schema.Types.ObjectId
});

module.exports = mongoose.model("Category", categorySchema);

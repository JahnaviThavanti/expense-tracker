
const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({
  title: String,
  amount: Number,
  category: String,
  date: Date,
  note: String,
  paymentMethod: String,
  userId: String,
  source: { type: String, default: "manual" },
}, { timestamps: true });

module.exports = mongoose.model("Expense", expenseSchema);

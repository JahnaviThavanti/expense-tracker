const Expense = require("../models/Expense");

exports.createExpense = async (req, res) => {
  try {
    const expense = await Expense.create(req.body);
    res.status(201).json(expense);
  } catch (err) {
    res.status(500).json({ msg: "Failed to create expense" });
  }
};

router.post("/", createExpense);

const express = require("express");
const router = express.Router();
const Expense = require("../models/Expense");
const auth = require("../middleware/authMiddleware");

router.get("/", auth, async (req, res) => {
  try {
    const {
      month,
      year,
      date,
      category,
      page = 1,
      limit = 50,
      search
    } = req.query;

    let filter = { userId: req.user.id };

    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { note: { $regex: search, $options: "i" } }
      ];
    }

    
    if (category) {
      filter.category = category;
    }

    
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);

      filter.date = { $gte: start, $lt: end };
    }

    
    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 1);

      filter.date = { $gte: start, $lt: end };
    }

    const expenses = await Expense.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json(expenses);

  } catch (err) {
    console.log("Expense fetch error:", err);
    res.status(500).json({ msg: "Failed to fetch expenses" });
  }
});


router.post("/", auth, async (req, res) => {
  try {
    const {
      title,
      amount,
      category,
      date,
      note,
      paymentMethod
    } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ msg: "Invalid amount" });
    }

    const expense = new Expense({
      title: title || category,
      amount: Number(amount),
      category,
      date: date ? new Date(date) : new Date(),
      note,
      paymentMethod: paymentMethod || "Manual",
      userId: req.user.id
    });

    await expense.save();

    console.log("Expense saved:", expense);

    res.status(201).json(expense);

  } catch (err) {
    console.log("Expense add error:", err);
    res.status(500).json({ msg: "Failed to add expense" });
  }
});



router.delete("/:id", auth, async (req, res) => {
  try {
    const deleted = await Expense.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!deleted) {
      return res.status(404).json({ msg: "Expense not found" });
    }

    res.json({ msg: "Expense deleted successfully" });

  } catch (err) {
    console.log("Delete error:", err);
    res.status(500).json({ msg: "Delete failed" });
  }
});



router.get("/analytics/unusual", auth, async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const expenses = await Expense.find({
      userId: req.user.id,
      date: { $gte: startOfMonth }
    });

    const total = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    const bigExpense = expenses.find(e => e.amount > 5000);

    let insight = "✅ Spending is within normal range.";

    if (total > 50000) {
      insight = "🚨 Monthly spending exceeded $50,000!";
    } else if (bigExpense) {
      insight = `⚠️ Unusual Transaction $${bigExpense.amount} (${bigExpense.category})`;
    }

    res.json({ insight });

  } catch (err) {
    res.status(500).json({ msg: "Analytics error" });
  }
});



router.get("/notifications/weekly", auth, async (req, res) => {
  try {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));

    const expenses = await Expense.find({
      userId: req.user.id,
      date: { $gte: startOfWeek }
    });

    const total = expenses.reduce((acc, curr) => acc + curr.amount, 0);

    res.json({ message: `📅 Weekly: You spent $${total}` });

  } catch (err) {
    res.status(500).json({ msg: "Weekly notification error" });
  }
});



router.get("/reports/pdf", auth, async (req, res) => {
  try {
    const PDFDocument = require("pdfkit");
    const doc = new PDFDocument();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=monthly-report.pdf");

    doc.pipe(res);

    doc.fontSize(20).text("Expense Tracker Report", { align: "center" });
    doc.moveDown();

    const expenses = await Expense.find({ userId: req.user.id })
      .sort({ date: -1 })
      .limit(500);

    expenses.forEach(e => {
      doc.fontSize(12).text(
        `${new Date(e.date).toLocaleDateString()} | ${e.category} | $${e.amount}`
      );
      if (e.note) doc.fontSize(10).text(`Note: ${e.note}`);
      doc.moveDown(0.5);
    });

    doc.end();

  } catch (err) {
    console.log("PDF Error:", err);
    res.status(500).send("PDF generation failed");
  }
});

module.exports = router;

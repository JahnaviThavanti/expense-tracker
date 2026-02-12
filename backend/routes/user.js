const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const User = require("../models/User");
const upload = require("../middleware/upload");
const bcrypt = require("bcryptjs");

const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: "No file uploaded" });

    const imageUrl = `http://localhost:5000/uploads/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profileImage: imageUrl },
      { new: true }
    ).select("-password");

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json(err);
  }
};

router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json(err);
  }
});


router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json(err);
  }
});

router.post(
  "/upload-image",
  auth,
  upload.single("profile"),
  uploadProfileImage
);


router.put("/profile", auth, async (req, res) => {
  try {
    const { name, email } = req.body;

    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { name, email },
      { new: true }
    ).select("-password");

    res.json(updated);
  } catch (err) {
    res.status(500).json(err);
  }
});

router.put("/update", auth, async (req, res) => {
  try {
    const { name, monthlyBudget, phone, age, gender, occupation } = req.body;

    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { name, monthlyBudget, phone, age, gender, occupation },
      { new: true }
    ).select("-password");

    res.json(updated);
  } catch (err) {
    res.status(500).json(err);
  }
});

router.put("/update-preferences", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { darkMode, notifications } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { darkMode, notifications },
      { new: true }
    );

    res.json(user);
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Failed to update preferences" });
  }
});

router.put("/password", auth, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ msg: "Password is required" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await User.findByIdAndUpdate(req.user.id, { password: hashedPassword });
    res.json({ msg: "Password updated successfully" });
  } catch (err) {
    res.status(500).json(err);
  }
});


router.get("/stats", auth, async (req, res) => {
  try {

    const Expense = require("../models/Expense");

    const expenses = await Expense.find({ userId: req.user.id });

    let total = 0;
    let monthly = 0;

    const month = new Date().getMonth();
    const year = new Date().getFullYear();

    expenses.forEach(e => {
      const amt = Number(e.amount || 0);
      total += amt;

      const d = new Date(e.date || e.createdAt);

      if (d.getMonth() === month && d.getFullYear() === year) {
        monthly += amt;
      }
    });

    res.json({
      totalSpent: total,
      monthlySpent: monthly,
      transactions: expenses.length
    });

  } catch (err) {
    res.status(500).json(err);
  }
});

router.delete("/delete", auth, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.id);
    res.json({ msg: "Account deleted successfully" });
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;

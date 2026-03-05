const express = require("express");
const router = express.Router();
const Category = require("../models/Category");
const auth = require("../middleware/authMiddleware");

/* =====================================================
   GET ALL CATEGORIES FOR USER
===================================================== */
router.get("/", auth, async (req, res) => {
  try {
    const categories = await Category.find({ userId: req.user.id }).sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ msg: "Failed to fetch categories" });
  }
});

/* =====================================================
   GET SINGLE CATEGORY
===================================================== */
router.get("/:id", auth, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ msg: "Category not found" });
    
    if (category.userId.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not authorized" });
    }
    
    res.json(category);
  } catch (err) {
    res.status(500).json({ msg: "Failed to fetch category" });
  }
});

/* =====================================================
   CREATE NEW CATEGORY
===================================================== */
router.post("/", auth, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ msg: "Category name is required" });
    }

    // Check if category already exists for this user
    const existing = await Category.findOne({ 
      userId: req.user.id, 
      name: name.trim() 
    });

    if (existing) {
      return res.status(400).json({ msg: "Category already exists" });
    }

    const category = new Category({
      name: name.trim(),
      userId: req.user.id
    });

    await category.save();
    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ msg: "Failed to create category" });
  }
});

/* =====================================================
   UPDATE CATEGORY
===================================================== */
router.put("/:id", auth, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ msg: "Category name is required" });
    }

    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ msg: "Category not found" });

    if (category.userId.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    category.name = name.trim();
    await category.save();

    res.json(category);
  } catch (err) {
    res.status(500).json({ msg: "Failed to update category" });
  }
});

/* =====================================================
   DELETE CATEGORY
===================================================== */
router.delete("/:id", auth, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ msg: "Category not found" });

    if (category.userId.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    await Category.findByIdAndDelete(req.params.id);
    res.json({ msg: "Category deleted successfully" });
  } catch (err) {
    res.status(500).json({ msg: "Failed to delete category" });
  }
});

module.exports = router;

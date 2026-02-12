const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();


const authRoutes = require("./routes/auth");
const expenseRoutes = require("./routes/expense");
const userRoutes = require("./routes/user");


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use("/uploads", express.static(path.join(__dirname, "uploads")));


app.use("/api/auth", authRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/user", userRoutes);


app.get("/", (req, res) => {
  res.send("🚀 Expense Tracker API running...");
});


app.use((req, res) => {
  res.status(404).json({ msg: "Route not found" });
});

module.exports = app;

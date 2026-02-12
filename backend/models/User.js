const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({

  name: String,

  email: { 
    type: String, 
    unique: true 
  },

  password: String,

  darkMode: { type: Boolean, default: true },
  weeklyNotifications: { type: Boolean, default: true },
  monthlyNotifications: { type: Boolean, default: true },
  unusualotifications: { type: Boolean, default: true },




  profileImage: String,
  
  phone: String,
  age: String,
  gender: String,
  occupation: String,

  weeklyBudget: Number,

  monthlyBudget: Number,


  currency: {
    type: String,
    default: "INR"
  },

  weeklyReports: {
    type: Boolean,
    default: true
  },

  monthlyReports: {
    type: Boolean,
    default: true
  },

  notifications: {
    type: Boolean,
    default: true
  }

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);

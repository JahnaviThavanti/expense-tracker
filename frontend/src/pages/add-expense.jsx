import API from "../utils/api";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import "../styles/expense-tracker-forms.css";
import "../styles/shared-datepicker.css";
import useExpenseDateHighlights, {
  clearExpenseDateHighlightsCache
} from "../hooks/useExpenseDateHighlights";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function AddExpense() {

  const navigate = useNavigate();

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(new Date());
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { hasExpenseOnDate } = useExpenseDateHighlights();
  

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedCategory = category.trim();

    if (!amount || Number(amount) <= 0) {
      alert("Enter valid amount");
      return;
    }
    if (!trimmedCategory) {
      alert("Enter expense type");
      return;
    }

    setLoading(true);

    try {
      await API.post("/expenses", {
        title: note || trimmedCategory,
        amount: Number(amount),
        category: trimmedCategory,
        date: date ? new Date(date) : new Date(),
        note,
        paymentMethod: "Manual"
      });

      alert("Expense saved successfully 🚀");
      clearExpenseDateHighlightsCache();
      navigate("/expenses");

    } catch (err) {
      alert("Error saving expense");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="main-section">
        <Navbar setMobileOpen={setMobileOpen} />

        <div className="add-expense-page">

          <div className="expense-header">
            <h1>Add Expense</h1>
            <p>Track your daily spending and stay in control 💰</p>
          </div>

          <form className="expense-card" onSubmit={handleSubmit}>

            <div className="amount-section">
              <label>Amount</label>
              <div className="amount-input">
                <span>$</span>
                <input
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="expense-grid">

              <div>
                <label>Expense Type</label>
                <input
                  type="text"
                  placeholder="Ex: Food, Gym, Rent"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="expense-input"
                />
              </div>

              <div>
                <label>Date</label>

                <DatePicker
                  selected={date}
                  onChange={(selectedDate) => setDate(selectedDate)}
                  dateFormat="dd/MM/yyyy"
                  placeholderText="Select date"

                  /* MODERN FEATURES */
                  showMonthDropdown
                  showYearDropdown
                  dropdownMode="select"
                  scrollableYearDropdown
                  yearDropdownItemNumber={100}
                  showPopperArrow={false}

                  /* UX */
                  maxDate={new Date()}
                  todayButton="Today"
                  isClearable

                  /* STYLE */
                  className="date-picker-input"
                  calendarClassName="modern-calendar"
                  dayClassName={(day) =>
                    hasExpenseOnDate(day) ? "expense-day-highlight" : undefined
                  }
                />
              </div>

            </div>

            <div className="note-section">
              <label>Note</label>
              <textarea
                placeholder="Ex: Lunch, petrol, groceries..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <button
              className="expense-save-btn"
              type="submit"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Expense"}
            </button>

          </form>

        </div>
      </div>
    </div>
  );
}

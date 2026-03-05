# Expense Tracker Module

A full-stack expense management system built using **MongoDB, Express.js, React, and Node.js**.

This module allows users to add, manage, filter, analyze, and report their expenses with advanced calendar-based filtering and analytics.

## 📌 Overview

The Expense Tracker enables users to:
*   Add expenses with category and notes
*   Filter by search, category, month, year, or exact date
*   View monthly summaries
*   Analyze daily and category spending
*   Generate PDF reports
*   View analytics and comparisons

## 🗓 Development Progress

### ✅ Week 1 – Backend Setup & Core APIs
**Status:** Completed

*   **Setup:** MongoDB connection, Expense model, Authentication middleware.
*   **APIs Implemented:** `GET /expenses`, `POST /expenses`, `DELETE /expenses/:id`
*   **Modules:** `express`, `mongoose`, `cors`, `dotenv`, `jsonwebtoken`, `bcryptjs`

### ✅ Week 2 – Expense Management UI
**Status:** Completed

*   **UI:** Add Expense page, Expense listing page, Category selector.
*   **Features:** Delete expense, Basic form validation, Category tagging, Notes support, Payment method support.

### ✅ Week 3 – Advanced Filtering System
**Status:** Completed

*   **Filtering:** Search (title, category, note), Category dropdown, Month/Year filter.
*   **Logic:** Priority-based (Exact Date > Month + Year > Default Current Month).
*   **Features:** Reset filter functionality.

### ✅ Week 4 – Reports & Analytics
**Status:** Completed

*   **Analytics:** Monthly total, Previous month comparison, Transaction count, Top spending category.
*   **Charts:** Bar Chart (Daily Expenses), Donut Chart (Category Breakdown).
*   **Features:** PDF report generation, Weekly analytics, Unusual spending detection.
*   **Modules:** `recharts`, `pdfkit`

### 🚀 Week 5 – Major Calendar & Date Upgrade
**Focus:** Fixing critical date filtering issues and improving user experience.

#### 🔧 Improvements Made


**1. Replaced HTML Date Input**
*   **Old:** `<input type="date" />`
*   **New:** `react-datepicker`

*   **Benefits:** Modern UI, Month/Year dropdowns, Scrollable year selection, Clearable input, Today shortcut.

**2. Timezone Bug Fix (Critical Fix)**
*   **Issue:** Selecting certain dates showed no data due to `toISOString()` timezone conversion.
*   **Fix:** Removed ISO conversion. Used local date formatting (`getFullYear`, `getMonth`, `getDate`) and `date-fns`. Backend updated to safely parse `yyyy-mm-dd`.

**3. Filter State Synchronization**
*   **Logic:** Selecting a specific date clears month/year; Selecting month clears date; Reset clears all.
*   **Benefit:** Prevents conflicting filters.

#### 📦 New Modules Installed
*   `react-datepicker`: Modern calendar UI, used in Expenses and Reports pages.
*   `date-fns`: Safe date formatting, prevents timezone bugs.

## 📊 Current Features (End of Week 5)

### Expense Management
*   Add, Delete, Fetch expenses
*   Validation

### Filtering System
*   Search, Category, Month, Year
*   Exact Date (Calendar)
*   Reset filters

### Reports
*   Monthly total & Previous month comparison
*   Transaction count & Top category detection
*   Daily bar chart & Category donut chart
*   PDF export

### Analytics
*   Weekly summary
*   Unusual spending detection
*   Insight generation

### UI Enhancements
*   Responsive design
*   Modern dark theme
*   Styled charts & Calendar popups
*   Mobile optimization

## ▶ How to Run

### Backend
```bash
cd backend
npm install
npm start
```

### Frontend
```bash
cd frontend
npm install
npm start
```
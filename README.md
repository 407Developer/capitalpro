# CapitalPro NG - Business Tracker

A sleek, glassmorphic business management dashboard for tracking inventory, sales, and generating professional receipts.

## ✨ Features

- **Glassmorphism UI:** Modern, translucent design with real-time blur effects.
- **Inventory Management:** Track stock levels, cost prices, and item history.
- **Cart System:** Add multiple items to a single transaction before checkout.
- **Sales Analytics:** Interactive profit visualization chart (last 7 days) and time-based filtering (Day, Month, All Time).
- **Search & Filter:** Instantly find transactions by customer name, item name, or specific dates.
- **Receipt Generation:** Create and print professional, branded receipts for customers with a single click.
- **Cloud Sync:** Secure backup and multi-device synchronization using Supabase.
- **Local-First:** Works instantly offline using LocalStorage, syncing to the cloud when connected.
- **Data Export/Import:** Download your entire sales history as CSV or import legacy data.

## 🚀 Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/capitalpro.git
   ```

2. **Supabase Configuration:**
   - Create a new project at [supabase.com](https://supabase.com).
   - In `app.js`, update `SUPABASE_URL` and `SUPABASE_KEY` with your project credentials.
   - Ensure your Supabase tables (`inventory` and `sales`) are created.

3. **Open `index.html`:**
   Simply open the `index.html` file in any modern web browser to start tracking your business.

## 🛠️ Tech Stack

- **Frontend:** Vanilla JavaScript (ES6+), CSS3 (Custom Variables & Backdrop Filters), HTML5.
- **Database/Backend:** Supabase (PostgreSQL + Real-time).
- **Charts:** Chart.js.
- **Typography:** Inter (via Google Fonts).

## ⚠️ Data Safety

- Use the **"Reset All Local Data"** button in the export section to clear your local cache if you encounter sync issues.
- Always ensure your Supabase project is **"Resumed"** in the dashboard to avoid 401 Unauthorized errors.

---
*Created for FLOOR BOSS NG.*

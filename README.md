# Hostel Food System

A Flask web app for managing hostel food: account login/registration, a
weekly food-consumption analytics page, and a "Food Waste Management" tool
for day-wise menus, student like/dislike feedback, wastage insights, and
automatic high-waste/low-demand alerts.

This was rebuilt from a screen-recording of a working prototype, so it
reproduces the same pages and flows (Login/Register → Dashboard → Food
analytics, and the separate dark-themed Food Waste Management tool with
Overview / Settings / Menus / Holidays / Insights / Alert log tabs). It's a
fresh implementation, not an extraction of original source code.

## Requirements

- Python 3.9+

## Setup

```bash
# 1. Create and activate a virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate        # on Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run the app
python app.py
```

The app starts at **http://127.0.0.1:5000**. A SQLite database file
(`hostel_food.db`) is created automatically on first run to store user
accounts.

## Using the app

1. Go to `http://127.0.0.1:5000`, click **Register**, and create an account.
2. Log in. You'll land on the **Dashboard**.
3. **Food analytics**: enter student count, average food per student, and
   daily actual consumption for the week to see expected-vs-actual charts
   and a wastage summary.
4. **Meal feedback & waste tool** (link on the dashboard) opens the Food
   Waste Management tool:
   - **Your menu** — pick a date, see that day's Breakfast/Lunch/Dinner
     menu, and Like/Dislike each dish.
   - **Overview** — aggregate wastage rate and charts.
   - **Settings** — student count, food-per-student assumption, and alert
     thresholds.
   - **Menus** — add/remove dishes per day and meal.
   - **Holidays** — mark dates with no mess service.
   - **Insights** — a full table of per-dish wastage estimates and flags.
   - **Alert log** — automatically generated high-wastage / low-demand
     notifications, shown with a badge count in the nav bar.

   This tool's data (menus, feedback, holidays, settings, alerts) is saved
   in your browser's `localStorage`, so it persists between visits on the
   same browser/machine.

## Project structure

```
hostel-food-system/
├── app.py                     Flask app: auth + page routes
├── requirements.txt
├── templates/
│   ├── base.html
│   ├── landing.html           Login / Register
│   ├── dashboard.html
│   ├── analytics.html         Food analytics (Chart.js)
│   └── food_waste.html        Food Waste Management shell
└── static/
    ├── css/
    │   ├── main.css           Light theme (auth/dashboard/analytics)
    │   └── food-waste.css     Dark theme (waste management tool)
    └── js/
        ├── landing.js         Login/Register tab toggle
        ├── analytics.js       Expected-vs-actual & wastage charts
        └── food-waste.js      Menus, feedback, settings, alerts (localStorage)
```

## Notes / things you may want to change

- `app.config["SECRET_KEY"]` in `app.py` is a placeholder — set a real
  secret (e.g. via an environment variable) before deploying anywhere
  public.
- Passwords are hashed with Werkzeug's `generate_password_hash` /
  `check_password_hash`.
- The wastage formulas in `food-waste.js` (`preparedKg`, `insightsRows`)
  are reasonable defaults, not a reverse-engineered exact match to any
  original script — tune them in `Settings` or in the JS to match your
  real numbers.

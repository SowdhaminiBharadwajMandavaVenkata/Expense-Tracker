# EXPENSE TRACKER
## 🛠 Tech Stack
### Frontend
- React.js
- Axios
- Chart.js (react-chartjs-2)
- CSS
### Backend
- Python
- FastAPI
- Uvicorn
- Psycopg2 (PostgreSQL connector)
- Pandas, NumPy (analytics)
### Database
- PostgreSQL
## ⚙️ Setup & Installation
### 1. Clone Repository
``` bash
git clone https://github.com/<your-username>/Expense-Tracker.git
cd Expense-Tracker
```
### Backend Setup (FastAPI)
2. Create Virtual Environment
``` bash
cd expense_api
python -m venv venv
venv\Scripts\activate
```
3. Install Dependencies
``` bash
Install Dependencies
```
4. Configure PostgreSQL

Make sure PostgreSQL is installed and running.

Create database: In Postgre SQL
```
CREATE DATABASE expense_db;
```
Update DB credentials in main.py:
```
DB_CONFIG = {
  "host": "localhost",
  "database": "expense_db",
  "user": "postgres",
  "password": "your_password",
  "port": 5432
}
```
5. Run Backend Server
``` bash
uvicorn main:app --reload
```
Backend runs at:

API: [http://127.0.0.1:8000]

Swagger Docs: [http://127.0.0.1:8000/docs]

### Frontend Setup (React)

6. Install Node Modules
``` bash
cd ../expense_frontend
npm install
```
7. Run React App
```
npm start
```
Frontend runs at:

UI: [http://localhost:3000]

### 🔗 API Endpoints

| Method | Endpoint             | Description          |
| ------ | -------------------- | -------------------- |
| GET    | `/expenses?limit=50` | Fetch expenses       |
| POST   | `/expenses`          | Add a new expense    |
| DELETE | `/expenses/{id}`     | Delete expense by ID |
| GET    | `/analytics/summary` | Analytics summary    |

### Weekly Chart Logic

The app automatically calculates daily total expenses for the last 7 days and displays it as a line chart using Chart.js.

## 🌐 Deployment

This project is optimized for Vercel:

- The vercel.json file handles the reverse proxy, routing /api/* requests to the FastAPI backend while serving the React frontend on other routes.

- Ensure the DATABASE_URL environment variable is added in your Vercel Project Settings for live database connectivity.








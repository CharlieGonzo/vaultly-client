# 💰 Vaultly — AI-Powered Finance Tracking App

A full-stack personal finance tracker where users sign up, log in, track income and expenses, and get personalized AI financial advice powered by Google Gemini.

---

## Features

- **Sign Up / Log In** — Secure JWT authentication with bcrypt password hashing
- **Transaction Tracking** — Add and delete income/expense transactions with category, description, amount, and date
- **Live Summary** — Real-time total income, total expenses, and current balance display
- **AI Financial Advisor** — Gemini reads your actual transaction data and gives personalized budgeting, savings, and spending advice
- **In-Memory MongoDB** — Zero-setup local database via `mongodb-memory-server`
- **Protected Routes** — Dashboard is only accessible after authentication

---

## Tech Stack

| Layer     | Technology                                      |
|-----------|-------------------------------------------------|
| Frontend  | React 19 + Vite + React Router                  |
| Backend   | Node.js + Express                               |
| Database  | MongoDB (in-memory via `mongodb-memory-server`) |
| AI API    | Google Gemini 1.5 Flash                         |
| Auth      | JWT + bcryptjs                                  |

---

## Database Schema

### Users Collection

| Field      | Type     | Notes                     |
|------------|----------|---------------------------|
| `_id`      | ObjectId | Auto-generated            |
| `username` | String   | Unique, required          |
| `email`    | String   | Unique, lowercase         |
| `password` | String   | bcrypt hashed             |
| `createdAt`| Date     | Auto (Mongoose timestamps)|
| `updatedAt`| Date     | Auto (Mongoose timestamps)|

### Transactions Collection

| Field         | Type     | Notes                              |
|---------------|----------|------------------------------------|
| `_id`         | ObjectId | Auto-generated                     |
| `userId`      | ObjectId | References Users collection        |
| `type`        | String   | `"income"` or `"expense"`          |
| `category`    | String   | e.g. Food, Salary, Transport       |
| `description` | String   | Optional description               |
| `amount`      | Number   | Positive decimal, required         |
| `date`        | Date     | Defaults to current date           |
| `createdAt`   | Date     | Auto (Mongoose timestamps)         |

---

## How to Run Locally

### Prerequisites
- Node.js v18+
- A Google Gemini API key ([get one free at Google AI Studio](https://aistudio.google.com/))

### 1. Clone the repo

```bash
git clone <your-repo-url>
cd WebDevFinalProject
```

### 2. Configure the backend

Edit `server/.env`:
```
JWT_SECRET=any_long_random_string
GEMINI_API_KEY=your_actual_gemini_api_key
PORT=5000
```

### 3. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 4. Start both servers

**Terminal 1 — Backend:**
```bash
cd server
npm start
```

**Terminal 2 — Frontend:**
```bash
cd client
npm run dev
```

Visit **http://localhost:5173** in your browser.

> The in-memory MongoDB starts automatically — no MongoDB installation needed. Data resets on server restart.

---

## API Endpoints

| Method | Path                    | Auth? | Description                          |
|--------|-------------------------|-------|--------------------------------------|
| POST   | `/api/auth/signup`      | No    | Create a new account                 |
| POST   | `/api/auth/login`       | No    | Log in, receive JWT                  |
| GET    | `/api/transactions`     | Yes   | Get all transactions for logged-in user |
| POST   | `/api/transactions`     | Yes   | Add a new transaction                |
| DELETE | `/api/transactions/:id` | Yes   | Delete a transaction                 |
| POST   | `/api/chat`             | Yes   | Send message to Gemini AI advisor    |
| GET    | `/api/health`           | No    | Server health check                  |

---

## AI API

**Google Gemini 1.5 Flash** (`@google/generative-ai`)

The AI advisor receives the user's full transaction summary (totals + recent history) with every chat request, enabling personalized advice like:
- Spending pattern analysis
- Budget recommendations
- Savings rate feedback
- Category-specific spending insights

---

## Deployment

Deployed on [Render](https://render.com) (free tier).

- **Backend**: Web Service → `server/` → start command: `npm start`
- **Frontend**: Static Site → `client/` → build: `npm run build`, publish: `dist/`
- Set `JWT_SECRET` and `GEMINI_API_KEY` as environment variables in the Render dashboard


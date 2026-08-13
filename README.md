# Orders & Settlements

B2B invoicing app: create orders, record payments, and track settlement status.

**App:** https://crossval-assignment-ukee.vercel.app
**API:** https://crossval-assignment-g25f.onrender.com

Render free tier sleeps when idle. The first request after a break can take 30 to 60 seconds.

## Tech stack

**Backend**
- Node.js + Express
- MongoDB + Mongoose
- JWT + bcrypt (HttpOnly cookie, optional Bearer token)
- Joi validation
- MongoDB transactions for payments
- Helmet, CORS, rate limiting, mongo-sanitize
- Jest + Supertest

**Frontend**
- React 18 + Vite
- React Router
- Axios with cookies
- CSS, paper / teal / gold theme, mobile-first

## Prerequisites

- Node.js 18+
- MongoDB locally, or a MongoDB Atlas URI

## Run the app

**Backend**

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/orders_settlements
JWT_SECRET=change_this_to_a_long_random_string
JWT_EXPIRE=30d
FRONTEND_URL=http://localhost:3000
```

```bash
npm run dev
```

Health check: `GET http://localhost:5000/api/health`
Tests: `cd backend && npm test`

**Frontend**

```bash
cd frontend
npm install
```

Optional `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

Leave that unset to use the deployed Render API.

```bash
npm run dev
```

Open http://localhost:3000

Password rule: 8+ characters, with upper, lower, number, and a special character. Example: `Test123!@#`

## How to use

1. Open the landing page and sign up or log in.
2. Create an order with customer, due date, and line items.
3. Open the order and record a payment. Same-day payments are valid.
4. Filter the dashboard by status. Lists are paginated, 10 per page.
5. Export orders as CSV by choosing a from/to date on the dashboard.

After the first payment, that order is read-only.

## API overview

Order and payment routes need the login cookie, or `Authorization: Bearer <token>`.

| Method | Endpoint | What it does |
|---|---|---|
| GET | `/api/health` | Health check, no auth |
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Clear auth cookie |
| GET | `/api/auth/me` | Current user |
| POST | `/api/orders` | Create order |
| GET | `/api/orders` | List my orders (`?status=&page=&limit=`) |
| GET | `/api/orders/export` | Download CSV (`?from=&to=`) |
| GET | `/api/orders/:id` | Order plus payment history |
| PUT | `/api/orders/:id` | Update, only if no payments |
| DELETE | `/api/orders/:id` | Delete, only if no payments |
| POST | `/api/payments` | Record a payment |
| GET | `/api/payments` | List my payments (`?page=&limit=`) |
| GET | `/api/payments/order/:orderId` | Payments for one order |

Create order: `{ customer, dueDate, lineItems: [{ description, quantity, unitPrice }] }`

Record payment: `{ orderId, amount, paymentDate, note? }`

Lists return `pagination` (`page`, `limit`, `total`, `pages`). Default page size is 10, max 50.

## Status rules

Status is computed on read. It is not stored.

| Status | When |
|---|---|
| `paid` | `totalPaid >= orderTotal` |
| `overdue` | not fully paid and past due date |
| `partially_paid` | some payment, still before due date |
| `pending` | no payments, still before due date |

Priority: **paid > overdue > partially_paid > pending**

A late invoice that is fully paid shows `paid`, not `overdue`.

## Edge cases

- After the first payment, the order is read-only.
- Overpayment is rejected, with the remaining balance in the error.
- Payment dates are compared by calendar day, so same-day payments work.
- Payment date cannot be in the future or before the order creation day.
- Concurrent payments use a transaction and an idempotency key.
- Users only see their own orders and payments.
- Order total equals subtotal. No tax or discount.

## Assumptions and tradeoffs

- Email and password only. No OAuth or email verification.
- Browser uses an HttpOnly cookie. API clients can still send a Bearer token.
- Money is a JavaScript number, rounded to 2 decimals.
- Past due dates are allowed, so an order can start as overdue.
- Status is derived, not stored, so it stays consistent.
- No tax, discount, or multi-user workspaces.
- Render free tier sleeps when idle.

## Before production

- Keep secrets in a secret manager and rotate JWT keys.
- Store money as integer cents or Decimal128.
- Add structured logging, request IDs, and monitoring.
- Soft-delete payments and keep an audit trail.
- Add password reset, email verification, and CSRF protection.
- Use a paid host so the API does not sleep.

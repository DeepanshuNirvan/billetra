# Billetra — User Manual

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Structure](#project-structure)
3. [First-Time Setup](#first-time-setup)
4. [Running the Application](#running-the-application)
5. [Default Credentials](#default-credentials)
6. [Super Admin — Creating Users](#super-admin--creating-users)
7. [Feature Walkthroughs](#feature-walkthroughs)
   - [Dashboard](#dashboard)
   - [Creating a Bill](#creating-a-bill)
   - [Products & Bulk Upload](#products--bulk-upload)
   - [Customers & Bulk Upload](#customers--bulk-upload)
   - [Audit History](#audit-history)
   - [Theme Switcher](#theme-switcher)
   - [Reports](#reports)
8. [API Reference (Quick)](#api-reference-quick)
9. [Common Troubleshooting](#common-troubleshooting)

---

## Prerequisites

| Tool | Minimum Version | Install |
|------|----------------|---------|
| Go | 1.22 | https://go.dev/dl |
| Node.js | 18+ | https://nodejs.org |
| PostgreSQL | 14+ | https://www.postgresql.org/download |
| goose (migrations) | any | `go install github.com/pressly/goose/v3/cmd/goose@latest` |

---

## Project Structure

```
billetra/
├── backend/          # Go 1.22 + Fiber + GORM
│   ├── cmd/server/   # Entry point
│   ├── cmd/migrate/  # Migration runner
│   ├── internal/     # All business logic
│   ├── migrations/   # SQL migrations (goose)
│   ├── .env.example
│   └── Makefile
└── frontend/         # React 18 + TypeScript + Tailwind
    ├── src/
    ├── .env.example
    └── package.json
```

---

## First-Time Setup

### 1. Clone and enter the repo

```bash
git clone <repo-url>
cd billetra
```

### 2. Set up the database

```sql
-- In psql as postgres user:
CREATE DATABASE billetra;
```

### 3. Configure backend environment

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
PORT=8080
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=billetra
JWT_SECRET=change-this-to-a-long-random-string
ENV=development
FRONTEND_URL=http://localhost:5173
```

> **Important:** Change `JWT_SECRET` to a random 32+ character string in production.

### 4. Run database migrations

```bash
cd backend
make migrate
```

This runs all 11 SQL migrations and seeds demo data (products, customers, demo user).

### 5. Configure frontend environment

```bash
cd frontend
cp .env.example .env
```

The default `.env` works for local development:

```env
VITE_API_URL=http://localhost:8080/api
VITE_APP_NAME=Billetra
```

### 6. Install frontend dependencies

```bash
cd frontend
npm install
```

---

## Running the Application

Open **two terminals**.

**Terminal 1 — Backend:**

```bash
cd backend
make run
# OR
go run cmd/server/main.go
```

Backend starts at `http://localhost:8080`  
Health check: `GET http://localhost:8080/health`

> **Note:** If you get "out of memory" during `go build`, use:
> ```bash
> go build -p 1 ./...
> ```

**Terminal 2 — Frontend:**

```bash
cd frontend
npm run dev
```

Frontend starts at `http://localhost:5173`

Open `http://localhost:5173` in your browser.

---

## Default Credentials

### Demo User (pre-seeded)

| Field | Value |
|-------|-------|
| Email | `demo@billetra.com` |
| Password | `Demo@1234` |
| Role | `user` (owner) |
| Business | Demo Traders |

This account has sample products, customers, and accounts already loaded.

### Super Admin

No super admin is seeded by default. To create one, run this SQL directly on your database:

```sql
-- First, create a regular user via /api/auth/signup or the UI
-- Then promote them to super_admin:
UPDATE users SET role = 'super_admin' WHERE email = 'admin@yourdomain.com';
```

OR insert directly:

```sql
-- Password below is: Admin@1234
INSERT INTO users (email, password_hash, name, phone, role)
VALUES (
  'admin@billetra.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVyGrAcN0e',
  'Super Admin',
  '9000000000',
  'super_admin'
);
```

> The password hash above is for `Demo@1234`. For a different password, generate a bcrypt hash:
> ```bash
> # Using htpasswd
> htpasswd -bnBC 10 "" "YourPassword" | tr -d ':\n'
> ```

---

## Super Admin — Creating Users

Once logged in as super admin, you get an **Admin** menu item in the sidebar (shield icon).

### Via the UI

1. Log in as super admin
2. Click **Admin** in the left sidebar (shield icon)
3. Click **Create User** (top right)
4. Fill in:
   - **Full Name** — business owner's name
   - **Email** — their login email
   - **Password** — minimum 8 characters
   - **Phone** — optional
5. Click **Create User**

The new user can immediately log in. They will have a `user` (owner) role with completely isolated data — they cannot see other users' products, bills, or customers.

### Via API (if needed)

```bash
# First get a super admin token
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@billetra.com","password":"Demo@1234"}'

# Use the token to create a user
curl -X POST http://localhost:8080/api/admin/users \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Amit Shah","email":"amit@shop.com","password":"Secure@123","phone":"9876543210"}'
```

### User Hierarchy

```
Super Admin
├── Can see all users
├── Can create / suspend users
├── Cannot see other users' business data
│
└── Owner (user role)
    ├── Manages own products, customers, bills
    ├── Complete isolation from other owners
    └── Cannot access admin panel
```

---

## Feature Walkthroughs

### Dashboard

The dashboard loads at `/` after login. It shows:

| Section | What it shows |
|---------|--------------|
| **KPI Cards** | Today's sales, Month sales, Outstanding, GST collected |
| **Sales Chart** | Last 7 days (bar or line, toggle top-right) |
| **Bill Summary** | Total / Paid / Pending with collection rate bar |
| **Monthly Revenue** | Last 6 months bar chart |
| **Overdue Aging** | Buckets: 0–30, 31–60, 61–90, 90+ days |
| **Recent Bills** | Last 10 bills with status |
| **Low Stock** | Products below alert threshold |
| **Top Products** | By revenue this month |
| **Top Customers** | By revenue |

---

### Creating a Bill

1. Click **New Bill** on the dashboard, or go to **Bills → New Bill**
2. Fill in:
   - **Customer** — search existing or leave blank for walk-in
   - **Bill Date** — defaults to today
   - **Due Date** — optional
3. Add line items:
   - Search and select a product
   - Quantity auto-fills GST
   - Edit unit price if needed
4. Add a discount (optional, per-line or overall)
5. Select **Payment Account**
6. Click **Save Bill**

Bill is saved as **Pending**. To mark paid:
- Open the bill → click **Mark Paid** → enter amount received → **Confirm Payment**

To download PDF:
- Open the bill → click **PDF** button (top right)

---

### Products & Bulk Upload

**Add single product:**
1. Go to **Products**
2. Click **Add Product**
3. Fill name, price, GST rate, stock quantity
4. Save

**Bulk import from Excel:**
1. Go to **Products**
2. Click **Template** to download the Excel template
3. Fill the template with your products:

| Column | Required | Example |
|--------|----------|---------|
| name | Yes | Wireless Keyboard |
| sku | No | WK-001 |
| hsn_code | No | 8471 |
| selling_price | Yes | 1299 |
| cost_price | No | 800 |
| gst_rate | Yes | 18 |
| unit_type | Yes | piece |
| stock_quantity | No | 50 |
| low_stock_alert | No | 5 |
| category_name | No | Electronics |

4. Click **Import Excel** → select your filled file
5. Result shows how many were created and any row-level errors

**Export:**
- **Export XLS** — downloads current page as Excel
- **Export PDF** — downloads formatted PDF table

---

### Customers & Bulk Upload

**Add single customer:**
1. Go to **Customers**
2. Click **Add Customer**
3. Fill name, phone/email, GSTIN if registered, billing address
4. Save

**Bulk import from Excel:**
1. Download template via **Template** button
2. Fill the columns:

| Column | Required | Example |
|--------|----------|---------|
| name | Yes | Acme Corp |
| email | No | acme@corp.com |
| phone | No | 9876543210 |
| gstin | No | 27AABCU9603R1ZX |
| address | No | 123 MG Road |
| state | No | Maharashtra |

3. Click **Import Excel** → select file
4. Review result

---

### Audit History

Every create, update, and delete action is logged automatically.

To view history:
1. Open any **Bill**, **Product**, or **Customer** detail page
2. Click the **History** tab (next to Details)
3. See a timeline of all changes with:
   - Action type (create / update / delete) — color coded
   - Timestamp
   - What changed (expandable JSON diff)

---

### Theme Switcher

Top-right of the header has 6 colored circles:

| Theme | Color |
|-------|-------|
| Indigo | Default blue-purple |
| Ocean | Cyan/teal |
| Forest | Green |
| Amber | Orange/gold |
| Rose | Pink/red |
| Dark | Dark mode |

Click any circle to switch. Choice persists across page reloads (saved to localStorage).

---

### Reports

Go to **Reports** in the sidebar:

| Report | What it shows |
|--------|--------------|
| **Sales Report** | Daily/monthly revenue, top products, payment method breakdown |
| **GST Report** | CGST / SGST / IGST per invoice — ready for GST return filing |
| **Inventory Report** | Stock levels, stock value, low stock alerts |

Each report has date range filters and an export button.

---

## API Reference (Quick)

Base URL: `http://localhost:8080/api`

All protected endpoints require: `Authorization: Bearer <token>`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/signup` | Register new account |
| POST | `/auth/login` | Login, returns token |
| GET | `/dashboard` | Dashboard stats |
| GET | `/products` | List products (search, category, lowStock filters) |
| POST | `/products` | Create product |
| POST | `/products/bulk-import` | Bulk import JSON array |
| GET | `/customers` | List customers |
| POST | `/customers/bulk-import` | Bulk import JSON array |
| GET | `/bills` | List bills |
| POST | `/bills` | Create bill |
| PUT | `/bills/:id/mark-paid` | Mark bill paid |
| GET | `/audit-logs` | Audit trail (entity_type, entity_id params) |
| GET | `/admin/users` | List all users (super_admin only) |
| POST | `/admin/users` | Create user (super_admin only) |

**Response envelope:**
```json
{
  "success": true,
  "data": { ... }
}
```

Errors return `"success": false` with an `"error"` string.

---

## Common Troubleshooting

### "Cannot connect to database"
- Check PostgreSQL is running: `pg_isready`
- Verify `DB_PASSWORD` in `.env` matches your postgres user password
- Make sure the `billetra` database exists: `createdb billetra`

### "Failed to load dashboard"
- Backend is not running or wrong `VITE_API_URL` in `frontend/.env`
- Check backend terminal for error logs

### "out of memory" when building Go
```bash
go build -p 1 ./...   # single parallel job
```

### Migrations already applied error
```bash
cd backend
go run cmd/migrate/main.go status   # see which are applied
```

### JWT errors / 401 on all requests
- Token expired — log out and log in again
- `JWT_SECRET` changed between restarts — all existing tokens are invalid, log in again

### Low stock not showing on dashboard
- Set `low_stock_alert` on the product to a value greater than `stock_quantity`

### Super admin menu not showing
- Verify `role = 'super_admin'` in the database for that user
- Log out and log back in (role is read from JWT on login)

---

## Build for Production

**Backend:**
```bash
cd backend
go build -o bin/server cmd/server/main.go
ENV=production JWT_SECRET=your-secret ./bin/server
```

**Frontend:**
```bash
cd frontend
npm run build
# Output in frontend/dist/ — serve via nginx or any static host
```

Set `VITE_API_URL` in `frontend/.env` to your production backend URL before building.

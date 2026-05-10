# Billetra Full System Upgrade — Design Spec
Date: 2026-05-10

## Overview
Six-area upgrade to Billetra GST billing SaaS. Stack: React + TypeScript + Tailwind (frontend), Go + Fiber + PostgreSQL (backend).

---

## Area 1: Super Admin + Multi-Tenant Hierarchy

### Goal
Super admin can create/manage owner accounts. Each owner's data stays isolated. Architecture is extensible to owner→member hierarchy later.

### DB Migration: `010_add_user_roles.sql`
```sql
ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user';
CREATE INDEX idx_users_role ON users(role);
-- Seed one super admin (change email/password before deploy)
INSERT INTO users (email, password_hash, name, role)
VALUES ('superadmin@billetra.com', '<bcrypt_hash>', 'Super Admin', 'super_admin')
ON CONFLICT DO NOTHING;
```

### User Roles (extensible enum)
- `super_admin` — platform owner, sees all tenants
- `user` — tenant/owner (current default, no change to existing behavior)
- Future: `member` — sub-user under an owner tenant

### Backend Changes
- `models/user.go` — add `Role string` field
- `middleware/auth.go` — add `RequireSuperAdmin` middleware (checks `role == super_admin`)
- New handler: `handlers/admin.go`
  - `GET /api/admin/users` — list all users with stats
  - `POST /api/admin/users` — create owner account
  - `PUT /api/admin/users/:id` — update user (name, active status)
  - `DELETE /api/admin/users/:id` — deactivate (soft delete via `is_active=false`)
  - `GET /api/admin/users/:id/overview` — view one tenant's stats
- `services/auth.go` — `CreateUser(input)` callable from admin handler
- Super admin JWT claims include `role` field

### Frontend Changes
- `RequireSuperAdmin` route guard component
- `/admin` route group (separate from main app)
- `pages/admin/` — UserList, CreateUser, UserDetail pages
- Admin layout (simplified sidebar, no business context)
- Auth store: store `role` from JWT, expose `isSuperAdmin` computed

### Design for Extensibility
- `users.role` is a string not boolean — can add `member` role later
- Middleware is a function factory: `RequireRole('super_admin')` → easy to extend
- Admin handler calls same services as regular handlers, just with `userID` from path param instead of JWT

---

## Area 2: UI Theme System

### Themes (6)
| Name | Primary | Accent | Description |
|------|---------|--------|-------------|
| Indigo (default) | #6366f1 | #4f46e5 | Current |
| Ocean | #0ea5e9 | #0284c7 | Blue |
| Forest | #22c55e | #16a34a | Green |
| Amber | #f59e0b | #d97706 | Gold/warm |
| Rose | #f43f5e | #e11d48 | Pink/red |
| Dark | #8b5cf6 | #7c3aed | Purple, dark bg |

### Implementation
- CSS custom properties in `index.css`:
  ```css
  :root { --primary-500: #6366f1; --primary-600: #4f46e5; ... }
  [data-theme="ocean"] { --primary-500: #0ea5e9; ... }
  ```
- `tailwind.config.js` — primary colors mapped to `var(--primary-*)` 
- `ThemeProvider` component — reads from store, applies `data-theme` attr on `<html>`
- `uiStore.ts` — add `theme: string`, `setTheme(t: string)`, persisted in localStorage
- Theme switcher: palette circles in TopBar (desktop) + Settings page
- Dark theme: also sets `data-dark` class, CSS vars override bg/surface/text colors

### Mobile UX
- Bottom nav already exists (`BottomNav.tsx`) — audit and improve
- Touch-friendly tap targets (min 44px)
- Safe area insets (already in index.css — verify)
- Swipe gestures on bill list items (swipe left → action buttons)
- Sticky headers on list pages
- FAB (floating action button) for primary action on mobile

---

## Area 3: Dashboard Analytics Enhancements

### Backend: `DashboardResponse` additions
```go
SalesChart      []ChartPoint    `json:"sales_chart"`       // fix: currently missing
MonthlyRevenue  []MonthPoint    `json:"monthly_revenue"`   // 6-month bar chart
OverdueAging    AgingBuckets    `json:"overdue_aging"`     // 0-30,31-60,61-90,90+
PaymentMethods  []MethodBreakdown `json:"payment_methods"` // by account type
YearSales       float64         `json:"year_sales"`
YesterdaySales  float64         `json:"yesterday_sales"`   // for trend %
LastMonthSales  float64         `json:"last_month_sales"`  // for trend %
```

New query: `GET /dashboard?range=today|week|month|quarter|year`

### Frontend New Widgets
1. **KPI Cards** (4, existing) — add real trend % vs yesterday/last month
2. **Sales Trend** (line chart, 30 days) — fix: wire up `sales_chart` from backend
3. **Monthly Revenue** (bar chart, 6 months) — new
4. **Top Customers** (table) — backend already returns, frontend missing
5. **Overdue Aging** (stacked bar or table) — new
6. **Payment Method Breakdown** (donut chart) — new
7. **Collection Rate** (gauge/progress) — existing, enhance
8. **Date Range Filter** — Today / Week / Month / Quarter / Year tabs

---

## Area 4: Bulk Upload / Export

### Affected Entities
- Products
- Customers
(Bills export already has PDF — add Excel export. No bulk import for bills.)

### UI Pattern (same for Products and Customers list pages)
Three-button toolbar:
```
[↓ Template]  [↑ Import]  [↓ Export ▾]
                           ├─ Export Excel
                           └─ Export PDF
```

### Template Download
- Client-side: `xlsx` library generates `.xlsx` with headers + 1 example row
- Product columns: Name*, SKU, Category, HSN Code, Unit, Selling Price*, Purchase Price, GST Rate, Stock Quantity, Low Stock Alert
- Customer columns: Name*, Phone, Email, GSTIN, PAN, Billing Address, State, Credit Limit, Payment Terms

### Import
- File picker (`.xlsx`, `.csv`)
- Client-side parse with `xlsx`
- Validate required fields, show error rows before submitting
- POST to `/api/products/bulk-import` or `/api/customers/bulk-import`
- Backend: parse JSON array, validate, upsert by SKU/email, return success/error counts

### Export
- Excel: client-side generation from list data (no new backend route needed)
- PDF: jsPDF table format (already installed), formatted A4

### Backend New Routes
```
POST /api/products/bulk-import   — body: [{...}, ...]
POST /api/customers/bulk-import  — body: [{...}, ...]
```
Existing `/products/bulk-upload` route — audit and align or replace.

---

## Area 5: Backend Reusability

### New Shared Utilities
```
internal/utils/
  pagination.go   — PaginationParams struct, ParsePagination(c), ApplyPagination(query)
  filter.go       — SearchFilter struct, ParseDateRange(c), ApplySearch(query, fields)
  response.go     — (exists) keep, add ErrorList helper
  export.go       — ToCSVRows(data, headers), ToXLSXBytes(data, headers)
  audit.go        — LogAudit(db, userID, entityType, entityID, action, old, new)

internal/repository/
  base.go         — ListParams{Page, Limit, Search, DateFrom, DateTo, SortBy, SortDir}
```

### Refactoring Scope
- All list handlers use `ParsePagination` + `ParseDateRange` from utils
- All repos accept `ListParams` instead of ad-hoc params
- Audit logging called from handlers (not repos — handlers have request context)

---

## Area 6: Audit / History Log

### DB Migration: `011_create_audit_logs.sql`
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  entity_type VARCHAR(50) NOT NULL,  -- bill|product|customer|account
  entity_id UUID NOT NULL,
  action VARCHAR(20) NOT NULL,       -- create|update|delete
  old_data JSONB,
  new_data JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id, created_at DESC);
```

### Backend
- `utils/audit.go` — `LogAudit(...)` function, non-blocking (goroutine)
- Called in handlers after successful create/update/delete
- New route: `GET /api/audit-logs?entity_type=X&entity_id=Y&page=1&limit=20`

### Frontend
- History tab on: BillDetail, ProductDetail, CustomerDetail
- Timeline UI: action icon + who + when + changes summary
- `useAuditLog(entityType, entityId)` hook

---

## API Consistency Audit (findings + fixes)

Known gaps to fix:
1. `GET /dashboard` — `sales_chart` in frontend types but missing from backend response
2. `POST /products/bulk-upload` — exists in router but handler may be stub; align with bulk-import design
3. Frontend `api/dashboard.ts` — check `salesChart` field mapping (snake_case vs camelCase)
4. All list endpoints — add consistent `page`, `limit`, `search`, `sort_by`, `sort_dir` query params
5. Refresh token route — frontend must use it on 401; check interceptor in `api/client.ts`

---

## Implementation Order

1. **Migration 010** — user roles (no breaking change)
2. **Backend utils** — pagination, filter, audit helpers
3. **Super admin backend** — middleware + admin routes
4. **Audit log migration 011** + audit logging in handlers
5. **Dashboard backend fix** — add missing fields to response
6. **Bulk import backend** — products + customers
7. **Theme system** — CSS vars + ThemeProvider
8. **Dashboard frontend** — new widgets, date range filter
9. **Bulk upload UI** — template/import/export buttons
10. **Audit history UI** — history tab on detail pages
11. **Super admin frontend** — admin pages, route guard
12. **API consistency sweep** — field names, interceptor, pagination
13. **Mobile UX** — tap targets, FAB, swipe gestures

---

## Non-Goals (Phase 1)
- Owner inviting team members (role `member`)
- Real-time notifications
- White-labeling per tenant
- Payment gateway integration

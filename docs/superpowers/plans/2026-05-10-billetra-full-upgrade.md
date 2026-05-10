# Billetra Full System Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add super admin hierarchy, theme system, dashboard analytics, bulk import/export, audit history, and backend reusability to Billetra.

**Architecture:** Backend-first (migrations → utils → handlers), then frontend (theme → dashboard → bulk → audit → admin). Each task is independently committable.

**Tech Stack:** Go 1.22 + Fiber + GORM + PostgreSQL (backend); React 18 + TypeScript + Tailwind + Zustand + Recharts (frontend); xlsx lib for Excel; jsPDF for PDF export.

---

## Task 1: Migration 010 — User Roles

**Files:**
- Create: `backend/migrations/010_add_user_roles.sql`
- Modify: `backend/internal/models/user.go`

- [ ] **Step 1: Create migration**

```sql
-- backend/migrations/010_add_user_roles.sql
-- +goose Up
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- +goose Down
DROP INDEX IF EXISTS idx_users_role;
ALTER TABLE users DROP COLUMN IF EXISTS role;
```

- [ ] **Step 2: Update User model**

```go
// backend/internal/models/user.go
package models

import (
	"time"
	"github.com/google/uuid"
)

type User struct {
	ID           uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Email        string     `gorm:"uniqueIndex;not null" json:"email"`
	PasswordHash string     `gorm:"not null" json:"-"`
	Name         string     `gorm:"not null" json:"name"`
	Phone        string     `json:"phone"`
	Role         string     `gorm:"not null;default:'user'" json:"role"`
	IsActive     bool       `gorm:"default:true" json:"is_active"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`

	Business *Business `gorm:"foreignKey:UserID" json:"business,omitempty"`
}

const (
	RoleSuperAdmin = "super_admin"
	RoleUser       = "user"
)
```

- [ ] **Step 3: Run migration**

```bash
cd backend && go run cmd/migrate/main.go up
```
Expected: `OK   010_add_user_roles.sql`

- [ ] **Step 4: Commit**

```bash
git add backend/migrations/010_add_user_roles.sql backend/internal/models/user.go
git commit -m "feat: add user role column with super_admin/user values"
```

---

## Task 2: Migration 011 — Audit Logs

**Files:**
- Create: `backend/migrations/011_create_audit_logs.sql`

- [ ] **Step 1: Create migration**

```sql
-- backend/migrations/011_create_audit_logs.sql
-- +goose Up
CREATE TABLE IF NOT EXISTS audit_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL,
  entity_id   UUID NOT NULL,
  action      VARCHAR(20) NOT NULL,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  VARCHAR(45),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_user_date ON audit_logs(user_id, created_at DESC);

-- +goose Down
DROP TABLE IF EXISTS audit_logs;
```

- [ ] **Step 2: Run migration**

```bash
cd backend && go run cmd/migrate/main.go up
```
Expected: `OK   011_create_audit_logs.sql`

- [ ] **Step 3: Commit**

```bash
git add backend/migrations/011_create_audit_logs.sql
git commit -m "feat: add audit_logs table for entity history tracking"
```

---

## Task 3: Backend Utils — Pagination, Filter, Audit

**Files:**
- Create: `backend/internal/utils/pagination.go`
- Create: `backend/internal/utils/filter.go`
- Create: `backend/internal/utils/audit.go`

- [ ] **Step 1: Create pagination util**

```go
// backend/internal/utils/pagination.go
package utils

import "github.com/gofiber/fiber/v2"

type PaginationParams struct {
	Page   int
	Limit  int
	Offset int
}

func ParsePagination(c *fiber.Ctx) PaginationParams {
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 20)
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	return PaginationParams{
		Page:   page,
		Limit:  limit,
		Offset: (page - 1) * limit,
	}
}
```

- [ ] **Step 2: Create filter util**

```go
// backend/internal/utils/filter.go
package utils

import (
	"time"
	"github.com/gofiber/fiber/v2"
)

type DateRange struct {
	From *time.Time
	To   *time.Time
}

func ParseDateRange(c *fiber.Ctx) DateRange {
	var dr DateRange
	if f := c.Query("from"); f != "" {
		t, err := time.Parse("2006-01-02", f)
		if err == nil {
			dr.From = &t
		}
	}
	if t := c.Query("to"); t != "" {
		parsed, err := time.Parse("2006-01-02", t)
		if err == nil {
			end := parsed.Add(24*time.Hour - time.Second)
			dr.To = &end
		}
	}
	return dr
}
```

- [ ] **Step 3: Create audit util**

```go
// backend/internal/utils/audit.go
package utils

import (
	"encoding/json"
	"log"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AuditLog struct {
	ID         uuid.UUID       `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID     uuid.UUID       `gorm:"type:uuid;not null"`
	EntityType string          `gorm:"not null"`
	EntityID   uuid.UUID       `gorm:"type:uuid;not null"`
	Action     string          `gorm:"not null"`
	OldData    json.RawMessage `gorm:"type:jsonb"`
	NewData    json.RawMessage `gorm:"type:jsonb"`
	IPAddress  string
	CreatedAt  time.Time
}

func (AuditLog) TableName() string { return "audit_logs" }

func LogAudit(db *gorm.DB, userID, entityType, entityID, action, ip string, oldData, newData interface{}) {
	go func() {
		uid, err := uuid.Parse(userID)
		if err != nil {
			return
		}
		eid, err := uuid.Parse(entityID)
		if err != nil {
			return
		}
		var oldJSON, newJSON json.RawMessage
		if oldData != nil {
			oldJSON, _ = json.Marshal(oldData)
		}
		if newData != nil {
			newJSON, _ = json.Marshal(newData)
		}
		entry := AuditLog{
			UserID:     uid,
			EntityType: entityType,
			EntityID:   eid,
			Action:     action,
			OldData:    oldJSON,
			NewData:    newJSON,
			IPAddress:  ip,
		}
		if err := db.Create(&entry).Error; err != nil {
			log.Printf("audit log error: %v", err)
		}
	}()
}
```

- [ ] **Step 4: Compile check**

```bash
cd backend && go build ./...
```
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add backend/internal/utils/
git commit -m "feat: add pagination, date filter, and audit logging utils"
```

---

## Task 4: Auth Service — Role in JWT + Admin User Repo

**Files:**
- Modify: `backend/internal/services/auth.go`
- Modify: `backend/internal/repository/user.go`
- Modify: `backend/internal/middleware/auth.go`

- [ ] **Step 1: Add role to JWT claims in auth service**

In `backend/internal/services/auth.go`, replace `generateTokens`:

```go
func (s *AuthService) generateTokens(user *models.User) (*AuthTokens, error) {
	expiresIn := 24 * 60 * 60

	claims := jwt.MapClaims{
		"user_id": user.ID.String(),
		"email":   user.Email,
		"role":    user.Role,
		"exp":     time.Now().Add(24 * time.Hour).Unix(),
		"iat":     time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(config.AppConfig.JWTSecret))
	if err != nil {
		return nil, err
	}

	return &AuthTokens{
		AccessToken: signed,
		TokenType:   "Bearer",
		ExpiresIn:   expiresIn,
		User:        user,
	}, nil
}
```

Also add `CreateUser` method to AuthService for admin use:

```go
type CreateUserInput struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
	Name     string `json:"name" validate:"required"`
	Phone    string `json:"phone"`
	Role     string `json:"role"`
}

func (s *AuthService) CreateUser(input CreateUserInput) (*models.User, error) {
	existing, _ := s.userRepo.FindByEmail(input.Email)
	if existing != nil {
		return nil, errors.New("email already registered")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}
	role := input.Role
	if role == "" {
		role = models.RoleUser
	}
	user := &models.User{
		Email:        input.Email,
		PasswordHash: string(hash),
		Name:         input.Name,
		Phone:        input.Phone,
		Role:         role,
	}
	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}
	return user, nil
}
```

- [ ] **Step 2: Add ListAll and UpdateUser to UserRepository**

```go
// Append to backend/internal/repository/user.go

type UserListParams struct {
	Page   int
	Limit  int
	Search string
	Role   string
}

func (r *UserRepository) ListAll(params UserListParams) ([]models.User, int64, error) {
	var users []models.User
	var total int64
	q := r.db.Model(&models.User{})
	if params.Search != "" {
		q = q.Where("name ILIKE ? OR email ILIKE ?", "%"+params.Search+"%", "%"+params.Search+"%")
	}
	if params.Role != "" {
		q = q.Where("role = ?", params.Role)
	}
	q.Count(&total)
	offset := (params.Page - 1) * params.Limit
	err := q.Preload("Business").Order("created_at desc").Offset(offset).Limit(params.Limit).Find(&users).Error
	return users, total, err
}

func (r *UserRepository) UpdateFields(id string, updates map[string]interface{}) error {
	return r.db.Model(&models.User{}).Where("id = ?", id).Updates(updates).Error
}
```

- [ ] **Step 3: Add role to auth middleware locals**

In `backend/internal/middleware/auth.go`, after the `email` extraction:

```go
// Replace the full AuthRequired function:
func AuthRequired() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return utils.Unauthorized(c, "missing authorization header")
		}
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			return utils.Unauthorized(c, "invalid authorization header format")
		}
		tokenStr := parts[1]
		token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fiber.ErrUnauthorized
			}
			return []byte(config.AppConfig.JWTSecret), nil
		})
		if err != nil || !token.Valid {
			return utils.Unauthorized(c, "invalid or expired token")
		}
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			return utils.Unauthorized(c, "invalid token claims")
		}
		userID, ok := claims["user_id"].(string)
		if !ok || userID == "" {
			return utils.Unauthorized(c, "invalid token: missing user_id")
		}
		email, _ := claims["email"].(string)
		role, _ := claims["role"].(string)
		if role == "" {
			role = "user"
		}
		c.Locals("user_id", userID)
		c.Locals("email", email)
		c.Locals("role", role)
		return c.Next()
	}
}

func RequireRole(role string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userRole, _ := c.Locals("role").(string)
		if userRole != role {
			return utils.Forbidden(c, "insufficient permissions")
		}
		return c.Next()
	}
}
```

- [ ] **Step 4: Add Forbidden to response utils**

```go
// Append to backend/internal/utils/response.go
func Forbidden(c *fiber.Ctx, msg string) error {
	return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
		"success": false,
		"error":   msg,
	})
}
```

- [ ] **Step 5: Compile check**

```bash
cd backend && go build ./...
```

- [ ] **Step 6: Commit**

```bash
git add backend/internal/services/auth.go backend/internal/repository/user.go backend/internal/middleware/auth.go backend/internal/utils/response.go
git commit -m "feat: add role to JWT claims, RequireRole middleware, admin user operations"
```

---

## Task 5: Super Admin Handler + Routes

**Files:**
- Create: `backend/internal/handlers/admin.go`
- Modify: `backend/cmd/server/main.go`

- [ ] **Step 1: Create admin handler**

```go
// backend/internal/handlers/admin.go
package handlers

import (
	"log"

	"github.com/billetra/backend/internal/repository"
	"github.com/billetra/backend/internal/services"
	"github.com/billetra/backend/internal/utils"
	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
)

type AdminHandler struct {
	userRepo    *repository.UserRepository
	authService *services.AuthService
	validate    *validator.Validate
}

func NewAdminHandler(userRepo *repository.UserRepository, authService *services.AuthService) *AdminHandler {
	return &AdminHandler{userRepo: userRepo, authService: authService, validate: validator.New()}
}

func (h *AdminHandler) ListUsers(c *fiber.Ctx) error {
	p := utils.ParsePagination(c)
	search := c.Query("search")
	role := c.Query("role")

	users, total, err := h.userRepo.ListAll(repository.UserListParams{
		Page: p.Page, Limit: p.Limit, Search: search, Role: role,
	})
	if err != nil {
		log.Printf("admin list users error: %v", err)
		return utils.InternalError(c, "failed to fetch users")
	}
	return utils.OKPaginated(c, users, total, p.Page, p.Limit)
}

func (h *AdminHandler) CreateUser(c *fiber.Ctx) error {
	var input services.CreateUserInput
	if err := c.BodyParser(&input); err != nil {
		return utils.BadRequest(c, "invalid request body")
	}
	if err := h.validate.Struct(input); err != nil {
		return utils.BadRequest(c, err.Error())
	}
	user, err := h.authService.CreateUser(input)
	if err != nil {
		return utils.BadRequest(c, err.Error())
	}
	return utils.Created(c, user)
}

func (h *AdminHandler) GetUser(c *fiber.Ctx) error {
	id := c.Params("id")
	user, err := h.userRepo.FindByID(id)
	if err != nil {
		return utils.NotFound(c, "user not found")
	}
	return utils.OK(c, user)
}

func (h *AdminHandler) UpdateUser(c *fiber.Ctx) error {
	id := c.Params("id")
	var input struct {
		Name     string `json:"name"`
		IsActive *bool  `json:"is_active"`
	}
	if err := c.BodyParser(&input); err != nil {
		return utils.BadRequest(c, "invalid request body")
	}
	updates := map[string]interface{}{}
	if input.Name != "" {
		updates["name"] = input.Name
	}
	if input.IsActive != nil {
		updates["is_active"] = *input.IsActive
	}
	if err := h.userRepo.UpdateFields(id, updates); err != nil {
		return utils.InternalError(c, "failed to update user")
	}
	user, _ := h.userRepo.FindByID(id)
	return utils.OK(c, user)
}
```

- [ ] **Step 2: Add admin routes to main.go**

In `backend/cmd/server/main.go`, add after existing handlers setup:

```go
// add import for models if not present (it won't be needed here, just handlers)
adminHandler := handlers.NewAdminHandler(userRepo, authService)
```

After the reports routes block, add:

```go
// Admin routes — super_admin only
admin := api.Group("/admin", middleware.AuthRequired(), middleware.RequireRole("super_admin"))
admin.Get("/users", adminHandler.ListUsers)
admin.Post("/users", adminHandler.CreateUser)
admin.Get("/users/:id", adminHandler.GetUser)
admin.Put("/users/:id", adminHandler.UpdateUser)
```

- [ ] **Step 3: Compile and verify**

```bash
cd backend && go build ./...
```

- [ ] **Step 4: Commit**

```bash
git add backend/internal/handlers/admin.go backend/cmd/server/main.go
git commit -m "feat: super admin handler and /api/admin/* routes"
```

---

## Task 6: Audit Log Handler + Routes

**Files:**
- Create: `backend/internal/handlers/audit.go`
- Modify: `backend/cmd/server/main.go`

- [ ] **Step 1: Create audit handler**

```go
// backend/internal/handlers/audit.go
package handlers

import (
	"log"

	"github.com/billetra/backend/internal/utils"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type AuditHandler struct {
	db *gorm.DB
}

func NewAuditHandler(db *gorm.DB) *AuditHandler {
	return &AuditHandler{db: db}
}

func (h *AuditHandler) List(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	entityType := c.Query("entity_type")
	entityID := c.Query("entity_id")
	p := utils.ParsePagination(c)

	var logs []utils.AuditLog
	var total int64

	q := h.db.Model(&utils.AuditLog{}).Where("user_id = ?", userID)
	if entityType != "" {
		q = q.Where("entity_type = ?", entityType)
	}
	if entityID != "" {
		q = q.Where("entity_id = ?", entityID)
	}
	q.Count(&total)
	err := q.Order("created_at desc").Offset(p.Offset).Limit(p.Limit).Find(&logs).Error
	if err != nil {
		log.Printf("audit list error: %v", err)
		return utils.InternalError(c, "failed to fetch audit logs")
	}
	return utils.OKPaginated(c, logs, total, p.Page, p.Limit)
}
```

- [ ] **Step 2: Register route in main.go**

Add after admin routes:

```go
auditHandler := handlers.NewAuditHandler(db)
protected.Get("/audit-logs", auditHandler.List)
```

- [ ] **Step 3: Compile check**

```bash
cd backend && go build ./...
```

- [ ] **Step 4: Commit**

```bash
git add backend/internal/handlers/audit.go backend/cmd/server/main.go
git commit -m "feat: audit log list endpoint GET /api/audit-logs"
```

---

## Task 7: Dashboard Backend Fix + Enhancements

**Files:**
- Modify: `backend/internal/repository/bill.go`
- Modify: `backend/internal/handlers/dashboard.go`

- [ ] **Step 1: Add missing dashboard queries to BillRepository**

Append to `backend/internal/repository/bill.go`:

```go
type ChartPoint struct {
	Date   string  `json:"date"`
	Amount float64 `json:"amount"`
}

func (r *BillRepository) GetSalesChart(userID string, days int) ([]ChartPoint, error) {
	var results []ChartPoint
	err := r.db.Raw(`
		SELECT TO_CHAR(gs.day, 'YYYY-MM-DD') as date,
		       COALESCE(SUM(b.total_amount), 0) as amount
		FROM generate_series(
			NOW() - INTERVAL '1 day' * ?, NOW(), '1 day'::interval
		) gs(day)
		LEFT JOIN bills b ON DATE(b.bill_date) = DATE(gs.day)
			AND b.user_id = ? AND b.status != 'cancelled'
		GROUP BY gs.day
		ORDER BY gs.day ASC
	`, days-1, userID).Scan(&results).Error
	return results, err
}

type MonthPoint struct {
	Month  string  `json:"month"`
	Amount float64 `json:"amount"`
}

func (r *BillRepository) GetMonthlyRevenue(userID string, months int) ([]MonthPoint, error) {
	var results []MonthPoint
	err := r.db.Raw(`
		SELECT TO_CHAR(gs.month, 'Mon YYYY') as month,
		       COALESCE(SUM(b.total_amount), 0) as amount
		FROM generate_series(
			date_trunc('month', NOW() - INTERVAL '1 month' * (?-1)),
			date_trunc('month', NOW()),
			'1 month'::interval
		) gs(month)
		LEFT JOIN bills b ON date_trunc('month', b.bill_date) = gs.month
			AND b.user_id = ? AND b.status != 'cancelled'
		GROUP BY gs.month
		ORDER BY gs.month ASC
	`, months, userID).Scan(&results).Error
	return results, err
}

type AgingBuckets struct {
	Days0to30  float64 `json:"days_0_30"`
	Days31to60 float64 `json:"days_31_60"`
	Days61to90 float64 `json:"days_61_90"`
	Days90plus float64 `json:"days_90_plus"`
}

func (r *BillRepository) GetOverdueAging(userID string) (*AgingBuckets, error) {
	var b AgingBuckets
	err := r.db.Raw(`
		SELECT
			COALESCE(SUM(CASE WHEN AGE(NOW(), due_date) <= INTERVAL '30 days' THEN total_amount - paid_amount ELSE 0 END), 0) as days_0_to_30,
			COALESCE(SUM(CASE WHEN AGE(NOW(), due_date) > INTERVAL '30 days' AND AGE(NOW(), due_date) <= INTERVAL '60 days' THEN total_amount - paid_amount ELSE 0 END), 0) as days_31_to_60,
			COALESCE(SUM(CASE WHEN AGE(NOW(), due_date) > INTERVAL '60 days' AND AGE(NOW(), due_date) <= INTERVAL '90 days' THEN total_amount - paid_amount ELSE 0 END), 0) as days_61_to_90,
			COALESCE(SUM(CASE WHEN AGE(NOW(), due_date) > INTERVAL '90 days' THEN total_amount - paid_amount ELSE 0 END), 0) as days_90_plus
		FROM bills
		WHERE user_id = ? AND status IN ('pending', 'overdue') AND due_date IS NOT NULL
	`, userID).Scan(&b).Error
	return &b, err
}

type YesterdaySalesResult struct {
	Amount float64
}

func (r *BillRepository) GetYesterdaySales(userID string) (float64, error) {
	var result struct{ Amount float64 }
	yesterday := time.Now().AddDate(0, 0, -1)
	start := time.Date(yesterday.Year(), yesterday.Month(), yesterday.Day(), 0, 0, 0, 0, yesterday.Location())
	end := start.Add(24*time.Hour - time.Second)
	r.db.Model(&models.Bill{}).
		Where("user_id = ? AND bill_date BETWEEN ? AND ? AND status != 'cancelled'", userID, start, end).
		Select("COALESCE(SUM(total_amount),0) as amount").Scan(&result)
	return result.Amount, nil
}

func (r *BillRepository) GetLastMonthSales(userID string) (float64, error) {
	var result struct{ Amount float64 }
	now := time.Now()
	firstOfLastMonth := time.Date(now.Year(), now.Month()-1, 1, 0, 0, 0, 0, now.Location())
	lastOfLastMonth := time.Date(now.Year(), now.Month(), 0, 23, 59, 59, 0, now.Location())
	r.db.Model(&models.Bill{}).
		Where("user_id = ? AND bill_date BETWEEN ? AND ? AND status != 'cancelled'", userID, firstOfLastMonth, lastOfLastMonth).
		Select("COALESCE(SUM(total_amount),0) as amount").Scan(&result)
	return result.Amount, nil
}
```

- [ ] **Step 2: Update DashboardResponse and handler**

Replace `backend/internal/handlers/dashboard.go` entirely:

```go
package handlers

import (
	"log"

	"github.com/billetra/backend/internal/repository"
	"github.com/billetra/backend/internal/utils"
	"github.com/gofiber/fiber/v2"
)

type DashboardHandler struct {
	billRepo    *repository.BillRepository
	productRepo *repository.ProductRepository
}

func NewDashboardHandler(billRepo *repository.BillRepository, productRepo *repository.ProductRepository) *DashboardHandler {
	return &DashboardHandler{billRepo: billRepo, productRepo: productRepo}
}

type DashboardResponse struct {
	TodaySales       float64                    `json:"today_sales"`
	YesterdaySales   float64                    `json:"yesterday_sales"`
	MonthSales       float64                    `json:"month_sales"`
	LastMonthSales   float64                    `json:"last_month_sales"`
	TotalOutstanding float64                    `json:"total_outstanding"`
	GSTCollected     float64                    `json:"gst_collected"`
	TotalBills       int64                      `json:"total_bills"`
	PaidBills        int64                      `json:"paid_bills"`
	PendingBills     int64                      `json:"pending_bills"`
	TopProducts      []repository.TopProduct    `json:"top_products"`
	TopCustomers     []repository.TopCustomer   `json:"top_customers"`
	RecentBills      []repository.BillSummary   `json:"recent_bills"`
	LowStockProducts interface{}                `json:"low_stock_products"`
	SalesChart       []repository.ChartPoint    `json:"sales_chart"`
	MonthlyRevenue   []repository.MonthPoint    `json:"monthly_revenue"`
	OverdueAging     *repository.AgingBuckets   `json:"overdue_aging"`
}

func (h *DashboardHandler) Get(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	stats, err := h.billRepo.GetDashboardStats(userID)
	if err != nil {
		log.Printf("dashboard stats error: %v", err)
		return utils.InternalError(c, "failed to fetch dashboard stats")
	}

	yesterdaySales, _ := h.billRepo.GetYesterdaySales(userID)
	lastMonthSales, _ := h.billRepo.GetLastMonthSales(userID)

	topProducts, err := h.billRepo.GetTopProducts(userID, 5)
	if err != nil {
		topProducts = []repository.TopProduct{}
	}
	topCustomers, err := h.billRepo.GetTopCustomers(userID, 5)
	if err != nil {
		topCustomers = []repository.TopCustomer{}
	}
	recentBills, err := h.billRepo.GetRecentBills(userID, 10)
	if err != nil {
		recentBills = []repository.BillSummary{}
	}
	lowStock, _ := h.productRepo.GetLowStock(userID)
	salesChart, _ := h.billRepo.GetSalesChart(userID, 30)
	monthlyRevenue, _ := h.billRepo.GetMonthlyRevenue(userID, 6)
	overdueAging, _ := h.billRepo.GetOverdueAging(userID)

	return utils.OK(c, DashboardResponse{
		TodaySales:       stats.TodaySales,
		YesterdaySales:   yesterdaySales,
		MonthSales:       stats.MonthSales,
		LastMonthSales:   lastMonthSales,
		TotalOutstanding: stats.TotalOutstanding,
		GSTCollected:     stats.GSTCollected,
		TotalBills:       stats.TotalBills,
		PaidBills:        stats.PaidBills,
		PendingBills:     stats.PendingBills,
		TopProducts:      topProducts,
		TopCustomers:     topCustomers,
		RecentBills:      recentBills,
		LowStockProducts: lowStock,
		SalesChart:       salesChart,
		MonthlyRevenue:   monthlyRevenue,
		OverdueAging:     overdueAging,
	})
}
```

- [ ] **Step 3: Compile**

```bash
cd backend && go build ./...
```

- [ ] **Step 4: Commit**

```bash
git add backend/internal/repository/bill.go backend/internal/handlers/dashboard.go
git commit -m "feat: dashboard sales chart, monthly revenue, overdue aging, yesterday/last month trends"
```

---

## Task 8: Bulk Import Backend — Products + Customers

**Files:**
- Modify: `backend/internal/handlers/product.go`
- Modify: `backend/internal/handlers/customer.go`
- Modify: `backend/internal/repository/customer.go`
- Modify: `backend/cmd/server/main.go`

- [ ] **Step 1: Add BulkImport to product handler**

Add this method to `ProductHandler` in `backend/internal/handlers/product.go`:

```go
// BulkImport handles JSON array: POST /products/bulk-import
func (h *ProductHandler) BulkImport(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	uid, _ := uuid.Parse(userID)

	var inputs []CreateProductInput
	if err := c.BodyParser(&inputs); err != nil {
		return utils.BadRequest(c, "invalid JSON array")
	}
	if len(inputs) == 0 {
		return utils.BadRequest(c, "no items provided")
	}
	if len(inputs) > 500 {
		return utils.BadRequest(c, "max 500 items per import")
	}

	var products []models.Product
	var errs []string

	for i, input := range inputs {
		if input.Name == "" {
			errs = append(errs, fmt.Sprintf("row %d: name is required", i+1))
			continue
		}
		p := models.Product{
			UserID: uid, Name: input.Name, SKU: input.SKU,
			Description: input.Description, HSNCode: input.HSNCode,
			UnitType: input.UnitType, SellingPrice: input.SellingPrice,
			PurchasePrice: input.PurchasePrice, GSTRate: input.GSTRate,
			StockQuantity: input.StockQuantity, LowStockAlert: input.LowStockAlert,
			IsActive: true,
		}
		if p.UnitType == "" {
			p.UnitType = "piece"
		}
		if input.CategoryID != nil && *input.CategoryID != "" {
			cid, err := uuid.Parse(*input.CategoryID)
			if err == nil {
				p.CategoryID = &cid
			}
		}
		products = append(products, p)
	}

	created := 0
	if len(products) > 0 {
		if err := h.repo.BulkCreate(products); err != nil {
			log.Printf("bulk import products error: %v", err)
			return utils.InternalError(c, "failed to import products")
		}
		created = len(products)
	}

	return utils.Created(c, fiber.Map{"created": created, "errors": errs})
}
```

Add `"fmt"` to the import block in product.go.

- [ ] **Step 2: Read current customer handler**

```bash
cat backend/internal/handlers/customer.go
```

- [ ] **Step 3: Add BulkImport to customer handler**

Read `backend/internal/handlers/customer.go` to find struct name then append:

```go
// BulkImport handles JSON array: POST /customers/bulk-import
func (h *CustomerHandler) BulkImport(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	uid, _ := uuid.Parse(userID)

	var inputs []struct {
		Name           string  `json:"name"`
		Phone          string  `json:"phone"`
		Email          string  `json:"email"`
		GSTIN          string  `json:"gstin"`
		PAN            string  `json:"pan"`
		BillingAddress string  `json:"billing_address"`
		State          string  `json:"state"`
		CreditLimit    float64 `json:"credit_limit"`
		PaymentTerms   string  `json:"payment_terms"`
	}
	if err := c.BodyParser(&inputs); err != nil {
		return utils.BadRequest(c, "invalid JSON array")
	}
	if len(inputs) == 0 {
		return utils.BadRequest(c, "no items provided")
	}
	if len(inputs) > 500 {
		return utils.BadRequest(c, "max 500 items per import")
	}

	var customers []models.Customer
	var errs []string
	for i, inp := range inputs {
		if inp.Name == "" {
			errs = append(errs, fmt.Sprintf("row %d: name is required", i+1))
			continue
		}
		customers = append(customers, models.Customer{
			UserID: uid, Name: inp.Name, Phone: inp.Phone,
			Email: inp.Email, GSTIN: inp.GSTIN, PAN: inp.PAN,
			BillingAddress: inp.BillingAddress, State: inp.State,
			CreditLimit: inp.CreditLimit, PaymentTerms: inp.PaymentTerms,
			IsActive: true,
		})
	}

	created := 0
	if len(customers) > 0 {
		if err := h.repo.BulkCreate(customers); err != nil {
			log.Printf("bulk import customers error: %v", err)
			return utils.InternalError(c, "failed to import customers")
		}
		created = len(customers)
	}
	return utils.Created(c, fiber.Map{"created": created, "errors": errs})
}
```

- [ ] **Step 4: Add BulkCreate to CustomerRepository**

Append to `backend/internal/repository/customer.go`:

```go
func (r *CustomerRepository) BulkCreate(customers []models.Customer) error {
	return r.db.CreateInBatches(customers, 50).Error
}
```

Also check that `"fmt"` is imported in customer.go handler — add if missing.

- [ ] **Step 5: Register new routes in main.go**

Add after existing product/customer routes:

```go
protected.Post("/products/bulk-import", productHandler.BulkImport)
protected.Post("/customers/bulk-import", customerHandler.BulkImport)
```

- [ ] **Step 6: Compile**

```bash
cd backend && go build ./...
```

- [ ] **Step 7: Commit**

```bash
git add backend/internal/handlers/product.go backend/internal/handlers/customer.go backend/internal/repository/customer.go backend/cmd/server/main.go
git commit -m "feat: bulk import endpoints for products and customers"
```

---

## Task 9: Frontend — Install xlsx, Update Types + Auth Store

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/store/authStore.ts`

- [ ] **Step 1: Install xlsx**

```bash
cd frontend && npm install xlsx
```

- [ ] **Step 2: Update types — add role, admin types, dashboard fields, audit**

Append to `frontend/src/types/index.ts`:

```typescript
// Extended User with role
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'super_admin' | 'user';
  is_active: boolean;
  created_at: string;
}

export interface AdminUser extends User {
  business?: Business;
}

export interface AuditLogEntry {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  action: 'create' | 'update' | 'delete';
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}

export interface BulkImportResult {
  created: number;
  errors: string[];
}
```

Also update `DashboardData` interface — replace existing with:

```typescript
export interface DashboardData {
  today_sales: number;
  yesterday_sales: number;
  month_sales: number;
  last_month_sales: number;
  total_outstanding: number;
  gst_collected: number;
  total_bills: number;
  paid_bills: number;
  pending_bills: number;
  top_products: { name: string; total_revenue: number; total_qty: number }[];
  top_customers: { name: string; total_amount: number; total_bills: number }[];
  recent_bills: {
    id: string; invoice_number: string; customer_name: string;
    bill_date: string; total_amount: number; status: string;
  }[];
  low_stock_products: Product[];
  sales_chart: { date: string; amount: number }[];
  monthly_revenue: { month: string; amount: number }[];
  overdue_aging: {
    days_0_30: number; days_31_60: number;
    days_61_90: number; days_90_plus: number;
  } | null;
}
```

**Important:** Remove the old `DashboardData` interface (lines with `todaySales`, `monthSales`, etc.) and replace with the snake_case version above. The backend returns snake_case.

- [ ] **Step 3: Update auth store — add role + isSuperAdmin**

Replace `frontend/src/store/authStore.ts`:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Business } from '../types';

interface AuthState {
  token: string | null;
  user: User | null;
  business: Business | null;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  login: (token: string, user: User, business?: Business) => void;
  logout: () => void;
  setBusiness: (business: Business) => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      business: null,
      isAuthenticated: false,
      isSuperAdmin: false,

      login: (token, user, business) => {
        localStorage.setItem('billetra_token', token);
        set({
          token, user, business: business ?? null,
          isAuthenticated: true,
          isSuperAdmin: user.role === 'super_admin',
        });
      },

      logout: () => {
        localStorage.removeItem('billetra_token');
        set({ token: null, user: null, business: null, isAuthenticated: false, isSuperAdmin: false });
      },

      setBusiness: (business) => set({ business }),
      setUser: (user) => set({ user, isSuperAdmin: user.role === 'super_admin' }),
    }),
    {
      name: 'billetra_auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        business: state.business,
        isAuthenticated: state.isAuthenticated,
        isSuperAdmin: state.isSuperAdmin,
      }),
    }
  )
);
```

- [ ] **Step 4: Commit**

```bash
cd frontend
git add src/types/index.ts src/store/authStore.ts package.json package-lock.json
git commit -m "feat: add role to auth store, update dashboard types to snake_case, install xlsx"
```

---

## Task 10: Frontend — Theme System

**Files:**
- Modify: `frontend/src/index.css`
- Modify: `frontend/tailwind.config.js`
- Modify: `frontend/src/store/uiStore.ts`
- Create: `frontend/src/components/ThemeProvider.tsx`
- Create: `frontend/src/components/ui/ThemeSwitcher.tsx`

- [ ] **Step 1: Update index.css with CSS custom properties**

At the very top of `frontend/src/index.css`, before `@tailwind base;`, add:

```css
/* ─── Theme variables ─── */
:root {
  --color-primary-50:  #eef2ff;
  --color-primary-100: #e0e7ff;
  --color-primary-200: #c7d2fe;
  --color-primary-300: #a5b4fc;
  --color-primary-400: #818cf8;
  --color-primary-500: #6366f1;
  --color-primary-600: #4f46e5;
  --color-primary-700: #4338ca;
  --color-primary-800: #3730a3;
  --color-primary-900: #312e81;
  --color-surface: #ffffff;
  --color-surface-alt: #f9fafb;
  --color-border: #f3f4f6;
  --color-text: #111827;
  --color-text-muted: #6b7280;
}

[data-theme="ocean"] {
  --color-primary-50:  #f0f9ff;
  --color-primary-100: #e0f2fe;
  --color-primary-200: #bae6fd;
  --color-primary-300: #7dd3fc;
  --color-primary-400: #38bdf8;
  --color-primary-500: #0ea5e9;
  --color-primary-600: #0284c7;
  --color-primary-700: #0369a1;
  --color-primary-800: #075985;
  --color-primary-900: #0c4a6e;
}

[data-theme="forest"] {
  --color-primary-50:  #f0fdf4;
  --color-primary-100: #dcfce7;
  --color-primary-200: #bbf7d0;
  --color-primary-300: #86efac;
  --color-primary-400: #4ade80;
  --color-primary-500: #22c55e;
  --color-primary-600: #16a34a;
  --color-primary-700: #15803d;
  --color-primary-800: #166534;
  --color-primary-900: #14532d;
}

[data-theme="amber"] {
  --color-primary-50:  #fffbeb;
  --color-primary-100: #fef3c7;
  --color-primary-200: #fde68a;
  --color-primary-300: #fcd34d;
  --color-primary-400: #fbbf24;
  --color-primary-500: #f59e0b;
  --color-primary-600: #d97706;
  --color-primary-700: #b45309;
  --color-primary-800: #92400e;
  --color-primary-900: #78350f;
}

[data-theme="rose"] {
  --color-primary-50:  #fff1f2;
  --color-primary-100: #ffe4e6;
  --color-primary-200: #fecdd3;
  --color-primary-300: #fda4af;
  --color-primary-400: #fb7185;
  --color-primary-500: #f43f5e;
  --color-primary-600: #e11d48;
  --color-primary-700: #be123c;
  --color-primary-800: #9f1239;
  --color-primary-900: #881337;
}

[data-theme="dark"] {
  --color-primary-50:  #1e1b4b;
  --color-primary-100: #2e1065;
  --color-primary-200: #3b0764;
  --color-primary-300: #6b21a8;
  --color-primary-400: #9333ea;
  --color-primary-500: #a855f7;
  --color-primary-600: #7c3aed;
  --color-primary-700: #6d28d9;
  --color-primary-800: #5b21b6;
  --color-primary-900: #4c1d95;
  --color-surface: #0f172a;
  --color-surface-alt: #1e293b;
  --color-border: #334155;
  --color-text: #f1f5f9;
  --color-text-muted: #94a3b8;
}
```

- [ ] **Step 2: Update tailwind.config.js**

Replace the `colors` section in `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          200: 'var(--color-primary-200)',
          300: 'var(--color-primary-300)',
          400: 'var(--color-primary-400)',
          500: 'var(--color-primary-500)',
          600: 'var(--color-primary-600)',
          700: 'var(--color-primary-700)',
          800: 'var(--color-primary-800)',
          900: 'var(--color-primary-900)',
        },
        surface: 'var(--color-surface)',
        'surface-alt': 'var(--color-surface-alt)',
        border: 'var(--color-border)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 3: Update uiStore to add theme**

Replace `frontend/src/store/uiStore.ts`:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type Theme = 'indigo' | 'ocean' | 'forest' | 'amber' | 'rose' | 'dark';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface UIState {
  sidebarOpen: boolean;
  theme: Theme;
  toasts: Toast[];
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: Theme) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

let toastId = 0;

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: 'indigo',
      toasts: [],

      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setTheme: (theme) => {
        const root = document.documentElement;
        if (theme === 'indigo') {
          root.removeAttribute('data-theme');
        } else {
          root.setAttribute('data-theme', theme);
        }
        set({ theme });
      },

      addToast: (toast) => {
        const id = String(++toastId);
        set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
        setTimeout(() => {
          set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
        }, 4000);
      },

      removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name: 'billetra_ui',
      partialize: (s) => ({ sidebarOpen: s.sidebarOpen, theme: s.theme }),
    }
  )
);

export const toast = {
  success: (title: string, message?: string) =>
    useUIStore.getState().addToast({ type: 'success', title, message }),
  error: (title: string, message?: string) =>
    useUIStore.getState().addToast({ type: 'error', title, message }),
  warning: (title: string, message?: string) =>
    useUIStore.getState().addToast({ type: 'warning', title, message }),
  info: (title: string, message?: string) =>
    useUIStore.getState().addToast({ type: 'info', title, message }),
};
```

- [ ] **Step 4: Create ThemeProvider**

```tsx
// frontend/src/components/ThemeProvider.tsx
import { useEffect } from 'react';
import { useUIStore } from '../store/uiStore';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useUIStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'indigo') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }
  }, [theme]);

  return <>{children}</>;
}
```

- [ ] **Step 5: Create ThemeSwitcher component**

```tsx
// frontend/src/components/ui/ThemeSwitcher.tsx
import { useUIStore, type Theme } from '../../store/uiStore';

const themes: { id: Theme; label: string; color: string }[] = [
  { id: 'indigo', label: 'Indigo', color: '#6366f1' },
  { id: 'ocean',  label: 'Ocean',  color: '#0ea5e9' },
  { id: 'forest', label: 'Forest', color: '#22c55e' },
  { id: 'amber',  label: 'Amber',  color: '#f59e0b' },
  { id: 'rose',   label: 'Rose',   color: '#f43f5e' },
  { id: 'dark',   label: 'Dark',   color: '#a855f7' },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useUIStore();

  return (
    <div className="flex items-center gap-2">
      {themes.map((t) => (
        <button
          key={t.id}
          title={t.label}
          onClick={() => setTheme(t.id)}
          className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${
            theme === t.id ? 'border-gray-900 scale-110' : 'border-transparent'
          }`}
          style={{ backgroundColor: t.color }}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Wrap App with ThemeProvider and update TopBar**

In `frontend/src/App.tsx`, wrap the entire return with `<ThemeProvider>`:

```tsx
import { ThemeProvider } from './components/ThemeProvider';
// ...
export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        {/* ... existing JSX ... */}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
```

In `frontend/src/components/layout/TopBar.tsx`, add ThemeSwitcher before the Bell button:

```tsx
import { ThemeSwitcher } from '../ui/ThemeSwitcher';
// ... inside the actions div:
<ThemeSwitcher />
```

- [ ] **Step 7: Replace all hardcoded `indigo-` classes in Sidebar and TopBar**

In `Sidebar.tsx`: replace `bg-indigo-600` → `bg-primary-600`, `bg-indigo-50` → `bg-primary-50/50`, `text-indigo-700` → `text-primary-700`, `text-indigo-600` → `text-primary-600`.

In `TopBar.tsx`: replace `bg-indigo-600` → `bg-primary-600`, `bg-indigo-100` → `bg-primary-100`, `text-indigo-700` → `text-primary-700`.

- [ ] **Step 8: Commit**

```bash
cd frontend
git add src/index.css tailwind.config.js src/store/uiStore.ts src/components/ThemeProvider.tsx src/components/ui/ThemeSwitcher.tsx src/App.tsx src/components/layout/TopBar.tsx src/components/layout/Sidebar.tsx
git commit -m "feat: 6-theme system with CSS custom properties and theme switcher"
```

---

## Task 11: Frontend — Dashboard Enhancements

**Files:**
- Modify: `frontend/src/hooks/useDashboard.ts`
- Modify: `frontend/src/api/dashboard.ts`
- Create: `frontend/src/components/dashboard/MonthlyRevenueChart.tsx`
- Create: `frontend/src/components/dashboard/OverdueAgingWidget.tsx`
- Create: `frontend/src/components/dashboard/TopCustomersWidget.tsx`
- Modify: `frontend/src/pages/Dashboard.tsx`

- [ ] **Step 1: Update dashboard API**

Replace `frontend/src/api/dashboard.ts`:

```typescript
import { apiClient } from './client';
import type { DashboardData } from '../types';

export const dashboardApi = {
  get: () => apiClient.get<DashboardData>('/dashboard').then((r) => r.data),
};
```

- [ ] **Step 2: Update useDashboard hook**

Read existing `frontend/src/hooks/useDashboard.ts` then replace:

```typescript
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboard';

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.get,
    staleTime: 60_000,
  });
}
```

- [ ] **Step 3: Create MonthlyRevenueChart**

```tsx
// frontend/src/components/dashboard/MonthlyRevenueChart.tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardHeader } from '../ui/Card';
import { formatCurrency } from '../../utils/format';

interface Props {
  data: { month: string; amount: number }[];
}

export function MonthlyRevenueChart({ data }: Props) {
  return (
    <Card>
      <CardHeader title="Monthly Revenue" subtitle="Last 6 months" />
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
          <Tooltip formatter={(v: number) => formatCurrency(v)} />
          <Bar dataKey="amount" fill="var(--color-primary-500)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
```

- [ ] **Step 4: Create OverdueAgingWidget**

```tsx
// frontend/src/components/dashboard/OverdueAgingWidget.tsx
import { Card, CardHeader } from '../ui/Card';
import { formatCurrency } from '../../utils/format';

interface Props {
  aging: {
    days_0_30: number; days_31_60: number;
    days_61_90: number; days_90_plus: number;
  } | null;
}

export function OverdueAgingWidget({ aging }: Props) {
  if (!aging) return null;
  const buckets = [
    { label: '0–30 days', value: aging.days_0_30, color: 'bg-yellow-400' },
    { label: '31–60 days', value: aging.days_31_60, color: 'bg-orange-400' },
    { label: '61–90 days', value: aging.days_61_90, color: 'bg-red-400' },
    { label: '90+ days', value: aging.days_90_plus, color: 'bg-red-700' },
  ];
  const total = buckets.reduce((s, b) => s + b.value, 0);
  return (
    <Card>
      <CardHeader title="Overdue Aging" subtitle={`Total: ${formatCurrency(total)}`} />
      <div className="space-y-3">
        {buckets.map((b) => (
          <div key={b.label}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500">{b.label}</span>
              <span className="font-medium">{formatCurrency(b.value)}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${b.color} rounded-full transition-all`}
                style={{ width: total > 0 ? `${(b.value / total) * 100}%` : '0%' }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
```

- [ ] **Step 5: Create TopCustomersWidget**

```tsx
// frontend/src/components/dashboard/TopCustomersWidget.tsx
import { Card, CardHeader } from '../ui/Card';
import { formatCurrency } from '../../utils/format';

interface Props {
  customers: { name: string; total_amount: number; total_bills: number }[];
}

export function TopCustomersWidget({ customers }: Props) {
  if (!customers.length) return null;
  return (
    <Card padding="none">
      <div className="px-5 py-4 border-b border-gray-50">
        <CardHeader title="Top Customers" subtitle="By revenue" />
      </div>
      <div className="divide-y divide-gray-50">
        {customers.map((c, i) => (
          <div key={i} className="flex items-center justify-between px-5 py-3">
            <div>
              <p className="text-sm font-medium text-gray-900">{c.name}</p>
              <p className="text-xs text-gray-400">{c.total_bills} bills</p>
            </div>
            <span className="text-sm font-semibold text-primary-700">
              {formatCurrency(c.total_amount)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
```

- [ ] **Step 6: Update Dashboard.tsx**

Replace `frontend/src/pages/Dashboard.tsx` with the enhanced version:

```tsx
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Calendar, AlertTriangle, Receipt, Plus, FileText, Users } from 'lucide-react';
import { StatCard } from '../components/dashboard/StatCard';
import { SalesChart } from '../components/dashboard/SalesChart';
import { MonthlyRevenueChart } from '../components/dashboard/MonthlyRevenueChart';
import { OverdueAgingWidget } from '../components/dashboard/OverdueAgingWidget';
import { TopCustomersWidget } from '../components/dashboard/TopCustomersWidget';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { BillStatusBadge } from '../components/ui/Badge';
import { PageSpinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { useDashboard } from '../hooks/useDashboard';
import { formatCurrency, formatDate } from '../utils/format';
import { useAuthStore } from '../store/authStore';

export default function Dashboard() {
  const navigate = useNavigate();
  const { business } = useAuthStore();
  const { data, isLoading, error } = useDashboard();

  if (isLoading) return <PageSpinner />;
  if (error || !data) {
    return (
      <div className="p-6">
        <EmptyState icon={Receipt} title="Failed to load dashboard" description="Check connection and try again." />
      </div>
    );
  }

  const todayTrend = data.yesterday_sales > 0
    ? Math.round(((data.today_sales - data.yesterday_sales) / data.yesterday_sales) * 100)
    : 0;
  const monthTrend = data.last_month_sales > 0
    ? Math.round(((data.month_sales - data.last_month_sales) / data.last_month_sales) * 100)
    : 0;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {getTimeGreeting()}, {business?.name ?? 'there'}!
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Business overview</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate('/bills/create')}>
          New Bill
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Sales"
          value={formatCurrency(data.today_sales)}
          icon={TrendingUp}
          color="indigo"
          trend={{ value: Math.abs(todayTrend), label: 'vs yesterday', positive: todayTrend >= 0 }}
        />
        <StatCard
          title="Month Sales"
          value={formatCurrency(data.month_sales)}
          icon={Calendar}
          color="emerald"
          trend={{ value: Math.abs(monthTrend), label: 'vs last month', positive: monthTrend >= 0 }}
        />
        <StatCard
          title="Outstanding"
          value={formatCurrency(data.total_outstanding)}
          subtitle={`${data.pending_bills} pending`}
          icon={Receipt}
          color="amber"
        />
        <StatCard
          title="GST Collected"
          value={formatCurrency(data.gst_collected)}
          subtitle="This month"
          icon={FileText}
          color="rose"
        />
      </div>

      {/* Sales Trend + Bill Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SalesChart data={data.sales_chart ?? []} />
        </div>
        <Card>
          <CardHeader title="Bill Summary" />
          <div className="space-y-4">
            {[
              { label: 'Total Bills', value: data.total_bills, color: 'text-gray-900' },
              { label: 'Paid', value: data.paid_bills, color: 'text-green-600' },
              { label: 'Pending', value: data.pending_bills, color: 'text-yellow-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{label}</span>
                <span className={`text-sm font-bold ${color}`}>{value}</span>
              </div>
            ))}
            <div className="pt-2">
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all"
                  style={{ width: `${data.total_bills > 0 ? (data.paid_bills / data.total_bills) * 100 : 0}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {data.total_bills > 0 ? Math.round((data.paid_bills / data.total_bills) * 100) : 0}% collection rate
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Monthly Revenue + Overdue Aging */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlyRevenueChart data={data.monthly_revenue ?? []} />
        <OverdueAgingWidget aging={data.overdue_aging ?? null} />
      </div>

      {/* Recent Bills + Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card padding="none">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Recent Bills</h3>
              <Button variant="ghost" size="sm" onClick={() => navigate('/bills')}>View all</Button>
            </div>
            {data.recent_bills.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">No bills yet</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {data.recent_bills.map((bill) => (
                  <div
                    key={bill.id}
                    className="flex items-center justify-between px-5 py-3 hover:bg-surface-alt cursor-pointer transition-colors"
                    onClick={() => navigate(`/bills/${bill.id}`)}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">#{bill.invoice_number}</p>
                      <p className="text-xs text-gray-400">
                        {bill.customer_name || 'Walk-in'} • {formatDate(bill.bill_date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <BillStatusBadge status={bill.status as any} />
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(bill.total_amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card padding="none">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Low Stock</h3>
              {data.low_stock_products?.length > 0 && (
                <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {data.low_stock_products.length} items
                </span>
              )}
            </div>
            {!data.low_stock_products?.length ? (
              <div className="py-8 text-center text-gray-400 text-sm">All stock OK</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {data.low_stock_products.slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                      <p className="text-xs text-gray-400">Alert at {p.lowStockAlert}</p>
                    </div>
                    <span className={`text-sm font-bold ml-3 ${p.stockQuantity === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                      {p.stockQuantity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Top Products + Top Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {data.top_products?.length > 0 && (
          <Card>
            <CardHeader title="Top Products" subtitle="By revenue this month" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left pb-3 text-xs font-semibold text-gray-400 uppercase">Product</th>
                    <th className="text-right pb-3 text-xs font-semibold text-gray-400 uppercase">Qty</th>
                    <th className="text-right pb-3 text-xs font-semibold text-gray-400 uppercase">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.top_products.map((p, i) => (
                    <tr key={i}>
                      <td className="py-3 font-medium text-gray-900">{p.name}</td>
                      <td className="py-3 text-right text-gray-600">{p.total_qty}</td>
                      <td className="py-3 text-right font-semibold text-primary-700">
                        {formatCurrency(p.total_revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
        <TopCustomersWidget customers={data.top_customers ?? []} />
      </div>
    </div>
  );
}

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
```

- [ ] **Step 7: Commit**

```bash
cd frontend
git add src/hooks/useDashboard.ts src/api/dashboard.ts src/components/dashboard/ src/pages/Dashboard.tsx
git commit -m "feat: enhanced dashboard with sales chart, monthly revenue, overdue aging, top customers"
```

---

## Task 12: Frontend — Bulk Upload/Export UI

**Files:**
- Create: `frontend/src/utils/excelUtils.ts`
- Create: `frontend/src/components/bulk/BulkActions.tsx`
- Modify: `frontend/src/pages/products/ProductList.tsx`
- Modify: `frontend/src/pages/customers/CustomerList.tsx`
- Modify: `frontend/src/api/products.ts`
- Modify: `frontend/src/api/customers.ts`

- [ ] **Step 1: Create Excel utils**

```typescript
// frontend/src/utils/excelUtils.ts
import * as XLSX from 'xlsx';

export function downloadTemplate(filename: string, headers: string[], exampleRow: (string | number)[]) {
  const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, filename);
}

export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: keyof T; header: string }[],
  filename: string
) {
  const rows = data.map((row) => columns.map((col) => row[col.key] ?? ''));
  const ws = XLSX.utils.aoa_to_sheet([columns.map((c) => c.header), ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Export');
  XLSX.writeFile(wb, filename);
}

export function parseExcelFile(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });
        resolve(rows);
      } catch {
        reject(new Error('Invalid Excel file'));
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

export function exportToPDF(
  title: string,
  columns: string[],
  rows: (string | number)[][],
  filename: string
) {
  import('jspdf').then(({ default: jsPDF }) => {
    import('jspdf-autotable').then(() => {
      const doc = new jsPDF({ orientation: 'landscape' });
      doc.setFontSize(16);
      doc.text(title, 14, 16);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 23);
      (doc as any).autoTable({
        head: [columns],
        body: rows,
        startY: 28,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [99, 102, 241] },
      });
      doc.save(filename);
    });
  });
}
```

- [ ] **Step 2: Create BulkActions component**

```tsx
// frontend/src/components/bulk/BulkActions.tsx
import { useRef, useState } from 'react';
import { Upload, Download, ChevronDown, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '../ui/Button';
import { parseExcelFile } from '../../utils/excelUtils';
import { toast } from '../../store/uiStore';

interface Props {
  onDownloadTemplate: () => void;
  onImport: (rows: Record<string, string>[]) => Promise<{ created: number; errors: string[] }>;
  onExportExcel: () => void;
  onExportPDF: () => void;
  importing?: boolean;
}

export function BulkActions({ onDownloadTemplate, onImport, onExportExcel, onExportPDF, importing }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [exportOpen, setExportOpen] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const rows = await parseExcelFile(file);
      const result = await onImport(rows);
      if (result.errors.length > 0) {
        toast.warning(`Imported ${result.created}, ${result.errors.length} errors`, result.errors.slice(0, 3).join('; '));
      } else {
        toast.success(`Imported ${result.created} items successfully`);
      }
    } catch {
      toast.error('Import failed', 'Invalid file format');
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" leftIcon={<Download className="h-4 w-4" />} onClick={onDownloadTemplate}>
        Template
      </Button>
      <Button
        variant="outline"
        size="sm"
        leftIcon={<Upload className="h-4 w-4" />}
        onClick={() => fileRef.current?.click()}
        isLoading={importing}
      >
        Import
      </Button>
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />

      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          leftIcon={<Download className="h-4 w-4" />}
          rightIcon={<ChevronDown className="h-3 w-3" />}
          onClick={() => setExportOpen((o) => !o)}
        >
          Export
        </Button>
        {exportOpen && (
          <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
            <button
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => { onExportExcel(); setExportOpen(false); }}
            >
              <FileSpreadsheet className="h-4 w-4 text-green-600" /> Excel
            </button>
            <button
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => { onExportPDF(); setExportOpen(false); }}
            >
              <FileText className="h-4 w-4 text-red-600" /> PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add bulk import to products API**

Append to `frontend/src/api/products.ts`:

```typescript
bulkImport: (items: Record<string, unknown>[]) =>
  apiClient.post<BulkImportResult>('/products/bulk-import', items).then((r) => r.data),
```

Ensure `BulkImportResult` is imported from types.

- [ ] **Step 4: Add bulk import to customers API**

Append to `frontend/src/api/customers.ts`:

```typescript
bulkImport: (items: Record<string, unknown>[]) =>
  apiClient.post<BulkImportResult>('/customers/bulk-import', items).then((r) => r.data),
```

- [ ] **Step 5: Integrate BulkActions into ProductList**

Read `frontend/src/pages/products/ProductList.tsx`, then add to its toolbar (next to the "Add Product" button):

```tsx
import { BulkActions } from '../../components/bulk/BulkActions';
import { downloadTemplate, exportToExcel, exportToPDF } from '../../utils/excelUtils';
import { productsApi } from '../../api/products';

// In the component, add import state:
const [importing, setImporting] = useState(false);

// Template columns:
const PRODUCT_TEMPLATE_HEADERS = ['Name*', 'SKU', 'HSN Code', 'Unit', 'Selling Price*', 'Purchase Price', 'GST Rate', 'Stock Qty', 'Low Stock Alert'];
const PRODUCT_TEMPLATE_EXAMPLE = ['Sample Product', 'SKU001', '1234', 'piece', '100', '80', '18', '50', '10'];

// Handlers:
function handleDownloadTemplate() {
  downloadTemplate('products_template.xlsx', PRODUCT_TEMPLATE_HEADERS, PRODUCT_TEMPLATE_EXAMPLE);
}

async function handleImport(rows: Record<string, string>[]) {
  setImporting(true);
  try {
    const items = rows.map((r) => ({
      name: r['Name*'] || r['Name'] || '',
      sku: r['SKU'] || '',
      hsn_code: r['HSN Code'] || '',
      unit_type: r['Unit'] || 'piece',
      selling_price: parseFloat(r['Selling Price*'] || r['Selling Price'] || '0') || 0,
      purchase_price: parseFloat(r['Purchase Price'] || '0') || 0,
      gst_rate: parseFloat(r['GST Rate'] || '0') || 0,
      stock_quantity: parseFloat(r['Stock Qty'] || '0') || 0,
      low_stock_alert: parseFloat(r['Low Stock Alert'] || '10') || 10,
    }));
    const result = await productsApi.bulkImport(items);
    queryClient.invalidateQueries({ queryKey: ['products'] });
    return result;
  } finally {
    setImporting(false);
  }
}

function handleExportExcel() {
  exportToExcel(products ?? [], [
    { key: 'name', header: 'Name' },
    { key: 'sku', header: 'SKU' },
    { key: 'hsnCode', header: 'HSN Code' },
    { key: 'sellingPrice', header: 'Selling Price' },
    { key: 'gstRate', header: 'GST Rate' },
    { key: 'stockQuantity', header: 'Stock Qty' },
  ], 'products_export.xlsx');
}

function handleExportPDF() {
  exportToPDF('Products List', ['Name', 'SKU', 'Price', 'GST', 'Stock'],
    (products ?? []).map((p) => [p.name, p.sku || '', p.sellingPrice, `${p.gstRate}%`, p.stockQuantity]),
    'products_export.pdf'
  );
}

// In JSX toolbar, add:
<BulkActions
  onDownloadTemplate={handleDownloadTemplate}
  onImport={handleImport}
  onExportExcel={handleExportExcel}
  onExportPDF={handleExportPDF}
  importing={importing}
/>
```

- [ ] **Step 6: Integrate BulkActions into CustomerList similarly**

Same pattern as ProductList. Customer template headers:
```
['Name*', 'Phone', 'Email', 'GSTIN', 'PAN', 'Billing Address', 'State', 'Credit Limit', 'Payment Terms']
```

Map row keys similarly, call `customersApi.bulkImport`.

- [ ] **Step 7: Commit**

```bash
cd frontend
git add src/utils/excelUtils.ts src/components/bulk/ src/api/products.ts src/api/customers.ts src/pages/products/ProductList.tsx src/pages/customers/CustomerList.tsx
git commit -m "feat: bulk template/import/export (Excel + PDF) for products and customers"
```

---

## Task 13: Frontend — Audit History UI

**Files:**
- Create: `frontend/src/api/audit.ts`
- Create: `frontend/src/hooks/useAuditLog.ts`
- Create: `frontend/src/components/audit/AuditHistory.tsx`
- Modify: `frontend/src/pages/bills/BillDetail.tsx`
- Modify: `frontend/src/pages/products/ProductDetail.tsx`
- Modify: `frontend/src/pages/customers/CustomerDetail.tsx`

- [ ] **Step 1: Create audit API**

```typescript
// frontend/src/api/audit.ts
import { apiClient } from './client';
import type { AuditLogEntry, PaginatedResponse } from '../types';

export const auditApi = {
  list: (entityType: string, entityId: string, page = 1) =>
    apiClient
      .get<PaginatedResponse<AuditLogEntry>>('/audit-logs', {
        params: { entity_type: entityType, entity_id: entityId, page, limit: 20 },
      })
      .then((r) => r.data),
};
```

- [ ] **Step 2: Create useAuditLog hook**

```typescript
// frontend/src/hooks/useAuditLog.ts
import { useQuery } from '@tanstack/react-query';
import { auditApi } from '../api/audit';

export function useAuditLog(entityType: string, entityId: string) {
  return useQuery({
    queryKey: ['audit', entityType, entityId],
    queryFn: () => auditApi.list(entityType, entityId),
    enabled: !!entityId,
  });
}
```

- [ ] **Step 3: Create AuditHistory component**

```tsx
// frontend/src/components/audit/AuditHistory.tsx
import { Clock, Plus, Edit2, Trash2 } from 'lucide-react';
import { useAuditLog } from '../../hooks/useAuditLog';
import { formatDate } from '../../utils/format';
import type { AuditLogEntry } from '../../types';

const actionIcon = {
  create: <Plus className="h-3.5 w-3.5 text-green-600" />,
  update: <Edit2 className="h-3.5 w-3.5 text-blue-600" />,
  delete: <Trash2 className="h-3.5 w-3.5 text-red-600" />,
};

const actionLabel = { create: 'Created', update: 'Updated', delete: 'Deleted' };

function diffSummary(entry: AuditLogEntry): string {
  if (entry.action !== 'update' || !entry.old_data || !entry.new_data) return '';
  const changed = Object.keys(entry.new_data).filter(
    (k) => JSON.stringify(entry.old_data![k]) !== JSON.stringify(entry.new_data![k])
  );
  return changed.length > 0 ? `Changed: ${changed.join(', ')}` : '';
}

interface Props {
  entityType: string;
  entityId: string;
}

export function AuditHistory({ entityType, entityId }: Props) {
  const { data, isLoading } = useAuditLog(entityType, entityId);

  if (isLoading) return <div className="py-8 text-center text-sm text-gray-400">Loading history…</div>;
  if (!data?.data?.length) {
    return <div className="py-8 text-center text-sm text-gray-400">No history recorded yet</div>;
  }

  return (
    <div className="space-y-1">
      {data.data.map((entry) => (
        <div key={entry.id} className="flex gap-3 py-3 border-b border-gray-50 last:border-0">
          <div className="mt-0.5 h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
            {actionIcon[entry.action] ?? <Clock className="h-3.5 w-3.5 text-gray-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">{actionLabel[entry.action] ?? entry.action}</p>
            {diffSummary(entry) && (
              <p className="text-xs text-gray-500 mt-0.5">{diffSummary(entry)}</p>
            )}
            <p className="text-xs text-gray-400 mt-0.5">{formatDate(entry.created_at)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Add History tab to BillDetail**

Read `frontend/src/pages/bills/BillDetail.tsx`. Add a tab system at the bottom with "Details" and "History" tabs. In the History tab:

```tsx
import { AuditHistory } from '../../components/audit/AuditHistory';
// Inside component, after existing content, add tab state:
const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');

// Tab bar JSX:
<div className="flex border-b border-gray-100 mb-4">
  {(['details', 'history'] as const).map((tab) => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px ${
        activeTab === tab
          ? 'border-primary-600 text-primary-700'
          : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {tab}
    </button>
  ))}
</div>
{activeTab === 'history' && <AuditHistory entityType="bill" entityId={bill.id} />}
```

- [ ] **Step 5: Add History tab to ProductDetail and CustomerDetail similarly**

Same pattern. `entityType="product"` and `entityType="customer"`.

- [ ] **Step 6: Commit**

```bash
cd frontend
git add src/api/audit.ts src/hooks/useAuditLog.ts src/components/audit/ src/pages/bills/BillDetail.tsx src/pages/products/ProductDetail.tsx src/pages/customers/CustomerDetail.tsx
git commit -m "feat: audit history tab on bill, product, customer detail pages"
```

---

## Task 14: Frontend — Super Admin Pages

**Files:**
- Create: `frontend/src/api/admin.ts`
- Create: `frontend/src/hooks/useAdmin.ts`
- Create: `frontend/src/pages/admin/UserList.tsx`
- Create: `frontend/src/pages/admin/CreateUser.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create admin API**

```typescript
// frontend/src/api/admin.ts
import { apiClient } from './client';
import type { AdminUser, PaginatedResponse } from '../types';

export const adminApi = {
  listUsers: (params?: { search?: string; page?: number; role?: string }) =>
    apiClient.get<PaginatedResponse<AdminUser>>('/admin/users', { params }).then((r) => r.data),

  createUser: (input: { email: string; password: string; name: string; phone?: string }) =>
    apiClient.post<AdminUser>('/admin/users', input).then((r) => r.data),

  updateUser: (id: string, data: { name?: string; is_active?: boolean }) =>
    apiClient.put<AdminUser>(`/admin/users/${id}`, data).then((r) => r.data),

  getUser: (id: string) =>
    apiClient.get<AdminUser>(`/admin/users/${id}`).then((r) => r.data),
};
```

- [ ] **Step 2: Create useAdmin hook**

```typescript
// frontend/src/hooks/useAdmin.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/admin';

export function useAdminUsers(params?: { search?: string; page?: number }) {
  return useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => adminApi.listUsers(params),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.createUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; is_active?: boolean } }) =>
      adminApi.updateUser(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}
```

- [ ] **Step 3: Create admin UserList page**

```tsx
// frontend/src/pages/admin/UserList.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Shield } from 'lucide-react';
import { useAdminUsers, useUpdateUser } from '../../hooks/useAdmin';
import { Button } from '../../components/ui/Button';
import { formatDate } from '../../utils/format';
import { toast } from '../../store/uiStore';

export default function AdminUserList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { data, isLoading } = useAdminUsers({ search });
  const updateUser = useUpdateUser();

  async function toggleActive(id: string, current: boolean) {
    try {
      await updateUser.mutateAsync({ id, data: { is_active: !current } });
      toast.success(!current ? 'User activated' : 'User deactivated');
    } catch {
      toast.error('Failed to update user');
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary-600" />
          <h1 className="text-xl font-bold text-gray-900">Admin — Users</h1>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate('/admin/users/create')}>
          Create User
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Search users…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Name', 'Email', 'Role', 'Status', 'Created', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data?.data?.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{user.name}</td>
                  <td className="px-4 py-3 text-gray-500">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      user.role === 'super_admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {user.role === 'super_admin' ? 'Super Admin' : 'User'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{formatDate(user.created_at)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(user.id, user.is_active)}
                      className="text-xs text-primary-600 hover:underline"
                    >
                      {user.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create admin CreateUser page**

```tsx
// frontend/src/pages/admin/CreateUser.tsx
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useCreateUser } from '../../hooks/useAdmin';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { toast } from '../../store/uiStore';

interface FormData {
  name: string;
  email: string;
  password: string;
  phone: string;
}

export default function CreateUser() {
  const navigate = useNavigate();
  const createUser = useCreateUser();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();

  async function onSubmit(data: FormData) {
    try {
      await createUser.mutateAsync(data);
      toast.success('User created successfully');
      navigate('/admin/users');
    } catch (err: any) {
      toast.error('Failed to create user', err?.response?.data?.error);
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-lg">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Create User</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Name" {...register('name', { required: 'Required' })} error={errors.name?.message} />
        <Input label="Email" type="email" {...register('email', { required: 'Required' })} error={errors.email?.message} />
        <Input label="Password" type="password" {...register('password', { required: 'Required', minLength: { value: 6, message: 'Min 6 chars' } })} error={errors.password?.message} />
        <Input label="Phone" {...register('phone')} />
        <div className="flex gap-3 pt-2">
          <Button type="submit" isLoading={createUser.isPending}>Create User</Button>
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 5: Add admin routes to App.tsx**

```tsx
// Add to lazy imports:
const AdminUserList = lazy(() => import('./pages/admin/UserList'));
const CreateUser = lazy(() => import('./pages/admin/CreateUser'));

// Add RequireSuperAdmin guard:
function RequireSuperAdmin({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isSuperAdmin } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isSuperAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

// Add routes inside <Routes>:
<Route path="admin" element={<RequireSuperAdmin><AppLayout /></RequireSuperAdmin>}>
  <Route path="users" element={<AdminUserList />} />
  <Route path="users/create" element={<CreateUser />} />
</Route>
```

- [ ] **Step 6: Add Admin link to Sidebar for super admins**

In `Sidebar.tsx`, import `useAuthStore` (already imported) and add conditional nav item:

```tsx
import { Shield } from 'lucide-react';
// Inside component, get isSuperAdmin:
const { business, user, isSuperAdmin } = useAuthStore();

// At bottom of navItems map, conditionally show:
{isSuperAdmin && (
  <NavLink
    to="/admin/users"
    className={({ isActive }) =>
      clsx(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 mb-1 text-sm font-medium transition-colors',
        isActive ? 'bg-purple-50 text-purple-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
        !sidebarOpen && 'justify-center'
      )
    }
  >
    {({ isActive }) => (
      <>
        <Shield className={clsx('h-5 w-5 flex-shrink-0', isActive ? 'text-purple-600' : 'text-gray-400')} />
        {sidebarOpen && <span>Admin</span>}
      </>
    )}
  </NavLink>
)}
```

- [ ] **Step 7: Commit**

```bash
cd frontend
git add src/api/admin.ts src/hooks/useAdmin.ts src/pages/admin/ src/App.tsx src/components/layout/Sidebar.tsx
git commit -m "feat: super admin pages — user list, create user, route guard"
```

---

## Task 15: API Consistency + Axios Interceptor

**Files:**
- Modify: `frontend/src/api/client.ts`

- [ ] **Step 1: Read current client.ts**

```bash
cat frontend/src/api/client.ts
```

- [ ] **Step 2: Update axios client with 401 interceptor + consistent response unwrapping**

Replace `frontend/src/api/client.ts`:

```typescript
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    // Unwrap { success, data } envelope
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      response.data = response.data.data;
    }
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

**Note:** If existing API calls already account for the `{ success, data }` envelope by doing `r.data.data`, remove those `.data.data` double-accesses after this change — they'll break. Check each api file and update to just `.then((r) => r.data)`.

- [ ] **Step 3: Audit all api/*.ts files**

Read each of: `auth.ts`, `business.ts`, `products.ts`, `customers.ts`, `accounts.ts`, `bills.ts`, `reports.ts`. Find any `.data.data` double-access patterns and fix to `.data`.

- [ ] **Step 4: Commit**

```bash
cd frontend
git add src/api/client.ts src/api/
git commit -m "fix: axios interceptor unwraps API envelope, auto-logout on 401"
```

---

## Task 16: Backend — Audit Logging in Handlers

**Files:**
- Modify: `backend/internal/handlers/product.go`
- Modify: `backend/internal/handlers/customer.go`
- Modify: `backend/internal/handlers/bill.go`

- [ ] **Step 1: Add DB field to ProductHandler and log on create/update/delete**

In `backend/internal/handlers/product.go`:

```go
type ProductHandler struct {
	repo     *repository.ProductRepository
	db       *gorm.DB
	validate *validator.Validate
}

func NewProductHandler(repo *repository.ProductRepository, db *gorm.DB) *ProductHandler {
	return &ProductHandler{repo: repo, db: db, validate: validator.New()}
}
```

Update `main.go` call: `handlers.NewProductHandler(productRepo, db)`

In `Create` handler, after `h.repo.Create(p)`:
```go
utils.LogAudit(h.db, userID, "product", p.ID.String(), "create", "", c.IP(), nil, p)
```

In `Update` handler, after `h.repo.Update(p)`:
```go
utils.LogAudit(h.db, userID, "product", p.ID.String(), "update", c.IP(), old, p)
```
(capture `old` as a copy before updating fields)

In `Delete` handler, after `h.repo.Delete`:
```go
utils.LogAudit(h.db, userID, "product", id, "delete", c.IP(), p, nil)
```

- [ ] **Step 2: Same pattern for CustomerHandler**

Add `db *gorm.DB` field. Update `NewCustomerHandler`. Log audit on create/update/delete.
Update `main.go` call: `handlers.NewCustomerHandler(customerRepo, billRepo, db)`

- [ ] **Step 3: Same pattern for BillHandler**

Add `db *gorm.DB` field (already has `db` likely — check). Log audit on create/update/delete/mark-paid.

- [ ] **Step 4: Compile**

```bash
cd backend && go build ./...
```

- [ ] **Step 5: Commit**

```bash
git add backend/internal/handlers/ backend/cmd/server/main.go
git commit -m "feat: audit logging on product, customer, bill create/update/delete"
```

---

## Task 17: Mobile UX Polish

**Files:**
- Modify: `frontend/src/components/layout/AppLayout.tsx`
- Modify: `frontend/src/components/layout/BottomNav.tsx`

- [ ] **Step 1: Read AppLayout and BottomNav**

```bash
cat frontend/src/components/layout/AppLayout.tsx
cat frontend/src/components/layout/BottomNav.tsx
```

- [ ] **Step 2: Update BottomNav with primary color and better active state**

Replace hardcoded `indigo-` in BottomNav with `primary-`. Ensure min touch target 44px (use `py-2 min-h-[56px]`). Add active indicator dot or underline.

- [ ] **Step 3: Add FAB to list pages on mobile**

In `ProductList.tsx`, `CustomerList.tsx`, `BillList.tsx` — wrap the existing "Add" button in a mobile FAB:

```tsx
{/* Mobile FAB */}
<button
  onClick={() => navigate('/bills/create')}
  className="md:hidden fixed bottom-20 right-4 h-14 w-14 bg-primary-600 text-white rounded-full shadow-lg flex items-center justify-center z-20 hover:bg-primary-700 active:scale-95 transition-all"
>
  <Plus className="h-6 w-6" />
</button>
```

- [ ] **Step 4: Commit**

```bash
cd frontend
git add src/components/layout/
git commit -m "feat: mobile UX — FAB, primary color bottom nav, 44px touch targets"
```

---

## Task 18: Final Build Verification

- [ ] **Step 1: Backend build**

```bash
cd backend && go build ./...
```
Expected: no errors

- [ ] **Step 2: Frontend build**

```bash
cd frontend && npm run build
```
Expected: no TypeScript errors, build succeeds

- [ ] **Step 3: Fix any TypeScript errors found**

Common issues to watch for:
- `DashboardData` field references — old camelCase vs new snake_case
- `StatCard` `trend` prop — update if `positive` field not in original interface
- `BillStatusBadge` receiving string from `recent_bills`

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: fix TypeScript errors from full upgrade"
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Super admin hierarchy (Tasks 1, 4, 5, 14)
- ✅ Multi-tenant isolation unchanged (user_id on all tables — preserved)
- ✅ Role in JWT + middleware (Task 4)
- ✅ Theme system 6 themes (Task 10)
- ✅ Dashboard enhancements — sales chart fix, monthly, aging, top customers (Tasks 7, 11)
- ✅ Bulk upload — template, import, export Excel/PDF (Tasks 8, 12)
- ✅ Audit log table + backend utility + handler integration (Tasks 2, 3, 6, 16)
- ✅ Audit history UI (Task 13)
- ✅ Backend reusability — pagination, filter utils (Task 3)
- ✅ API consistency — axios interceptor, snake_case alignment (Task 15)
- ✅ Mobile UX — FAB, touch targets, bottom nav (Task 17)

**Known gotcha:** Task 15 (axios interceptor unwrapping) may require sweeping all `api/*.ts` files to remove existing double `.data.data` patterns. Do this carefully to avoid breaking existing features.

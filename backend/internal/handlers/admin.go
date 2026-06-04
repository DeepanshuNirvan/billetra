package handlers

import (
	"log"
	"strings"
	"time"

	"github.com/billetra/backend/internal/repository"
	"github.com/billetra/backend/internal/services"
	"github.com/billetra/backend/internal/utils"
	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
)

type AdminHandler struct {
	userRepo     *repository.UserRepository
	authService  *services.AuthService
	productRepo  *repository.ProductRepository
	customerRepo *repository.CustomerRepository
	billRepo     *repository.BillRepository
	accountRepo  *repository.AccountRepository
	validate     *validator.Validate
}

func NewAdminHandler(
	userRepo *repository.UserRepository,
	authService *services.AuthService,
	productRepo *repository.ProductRepository,
	customerRepo *repository.CustomerRepository,
	billRepo *repository.BillRepository,
	accountRepo *repository.AccountRepository,
) *AdminHandler {
	return &AdminHandler{
		userRepo:     userRepo,
		authService:  authService,
		productRepo:  productRepo,
		customerRepo: customerRepo,
		billRepo:     billRepo,
		accountRepo:  accountRepo,
		validate:     validator.New(),
	}
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
	if len(updates) == 0 {
		return utils.BadRequest(c, "no fields to update")
	}
	if err := h.userRepo.UpdateFields(id, updates); err != nil {
		return utils.InternalError(c, "failed to update user")
	}
	user, _ := h.userRepo.FindByID(id)
	return utils.OK(c, user)
}

// ── View any user's data (super_admin) ──────────────────────────────────────

func (h *AdminHandler) GetUserProducts(c *fiber.Ctx) error {
	target := c.Params("id")
	p := utils.ParsePagination(c)
	items, total, err := h.productRepo.List(target, c.Query("search"), c.Query("category"), p.Page, p.Limit)
	if err != nil {
		return utils.InternalError(c, "failed to fetch products")
	}
	return utils.OKPaginated(c, items, total, p.Page, p.Limit)
}

func (h *AdminHandler) GetUserCustomers(c *fiber.Ctx) error {
	target := c.Params("id")
	p := utils.ParsePagination(c)
	items, total, err := h.customerRepo.List(target, c.Query("search"), p.Page, p.Limit)
	if err != nil {
		return utils.InternalError(c, "failed to fetch customers")
	}
	return utils.OKPaginated(c, items, total, p.Page, p.Limit)
}

func (h *AdminHandler) GetUserBills(c *fiber.Ctx) error {
	target := c.Params("id")
	p := utils.ParsePagination(c)
	items, total, err := h.billRepo.List(target, c.Query("status"), c.Query("customer_id"), c.Query("search"), nil, nil, p.Page, p.Limit)
	if err != nil {
		return utils.InternalError(c, "failed to fetch bills")
	}
	return utils.OKPaginated(c, items, total, p.Page, p.Limit)
}

func (h *AdminHandler) GetUserBillDetail(c *fiber.Ctx) error {
	target := c.Params("id")
	billID := c.Params("billId")
	bill, err := h.billRepo.FindByID(billID, target)
	if err != nil {
		return utils.NotFound(c, "bill not found")
	}
	return utils.OK(c, bill)
}

func (h *AdminHandler) GetUserAccounts(c *fiber.Ctx) error {
	target := c.Params("id")
	accounts, err := h.accountRepo.ListByUser(target)
	if err != nil {
		return utils.InternalError(c, "failed to fetch accounts")
	}
	return utils.OK(c, accounts)
}

func (h *AdminHandler) GetUserStats(c *fiber.Ctx) error {
	target := c.Params("id")
	stats, err := h.billRepo.GetDashboardStats(target)
	if err != nil {
		return utils.InternalError(c, "failed to fetch stats")
	}
	return utils.OK(c, stats)
}

// ── Reports for any user (super_admin) ──────────────────────────────────────

func parseAdminReportDates(c *fiber.Ctx) (from, to time.Time) {
	now := time.Now()
	from = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	to = now

	fromStr := c.Query("from")
	if fromStr == "" {
		fromStr = c.Query("startDate")
	}
	toStr := c.Query("to")
	if toStr == "" {
		toStr = c.Query("endDate")
	}

	if t, err := time.Parse("2006-01-02", fromStr); err == nil {
		from = t
	}
	if t, err := time.Parse("2006-01-02", toStr); err == nil {
		to = time.Date(t.Year(), t.Month(), t.Day(), 23, 59, 59, 0, t.Location())
	}
	return
}

func (h *AdminHandler) GetUserSalesReport(c *fiber.Ctx) error {
	target := c.Params("id")
	from, to := parseAdminReportDates(c)
	groupBy := c.Query("groupBy")
	if groupBy == "" {
		groupBy = c.Query("group_by", "day")
	}
	if groupBy != "month" {
		groupBy = "day"
	}
	data, err := h.billRepo.GetSalesReport(target, from, to, groupBy)
	if err != nil {
		log.Printf("admin sales report error: %v", err)
		return utils.InternalError(c, "failed to generate sales report")
	}
	if data == nil {
		data = []repository.SalesReportRow{}
	}
	return utils.OK(c, data)
}

func (h *AdminHandler) GetUserGSTReport(c *fiber.Ctx) error {
	target := c.Params("id")
	from, to := parseAdminReportDates(c)
	data, err := h.billRepo.GetGSTReport(target, from, to)
	if err != nil {
		log.Printf("admin gst report error: %v", err)
		return utils.InternalError(c, "failed to generate GST report")
	}
	if data == nil {
		data = []repository.GSTReportRow{}
	}
	return utils.OK(c, data)
}

func (h *AdminHandler) GetUserInventoryReport(c *fiber.Ctx) error {
	target := c.Params("id")
	data, err := h.billRepo.GetInventoryReport(target)
	if err != nil {
		log.Printf("admin inventory report error: %v", err)
		return utils.InternalError(c, "failed to generate inventory report")
	}
	if data == nil {
		data = []repository.InventoryReportRow{}
	}
	return utils.OK(c, data)
}

// ── Edit any user's business profile (super_admin) ──────────────────────────

func (h *AdminHandler) GetUserBusiness(c *fiber.Ctx) error {
	target := c.Params("id")
	var biz struct {
		ID              string `json:"id"`
		UserID          string `json:"user_id"`
		Name            string `json:"name"`
		GSTIN           string `json:"gstin"`
		PAN             string `json:"pan"`
		Phone           string `json:"phone"`
		Email           string `json:"email"`
		Address         string `json:"address"`
		City            string `json:"city"`
		State           string `json:"state"`
		Pincode         string `json:"pincode"`
		LogoURL         string `json:"logo_url"`
		DefaultTemplate string `json:"default_template"`
		DefaultBillSize string `json:"default_bill_size"`
		InvoicePrefix   string `json:"invoice_prefix"`
		InvoiceCounter  int    `json:"invoice_counter"`
	}
	if err := h.billRepo.GetDB().Raw(
		`SELECT * FROM businesses WHERE user_id = ? LIMIT 1`, target,
	).Scan(&biz).Error; err != nil {
		return utils.InternalError(c, "failed to fetch business")
	}
	return utils.OK(c, biz)
}

func (h *AdminHandler) UpdateUserBusiness(c *fiber.Ctx) error {
	target := c.Params("id")
	var input map[string]interface{}
	if err := c.BodyParser(&input); err != nil {
		return utils.BadRequest(c, "invalid request body")
	}
	// Trim string fields and validate lengths
	if v, ok := input["gstin"].(string); ok {
		input["gstin"] = strings.TrimSpace(v)
		if len(input["gstin"].(string)) > 20 {
			return utils.BadRequest(c, "GSTIN must be at most 20 characters")
		}
	}
	if v, ok := input["pan"].(string); ok {
		input["pan"] = strings.TrimSpace(v)
		if len(input["pan"].(string)) > 15 {
			return utils.BadRequest(c, "PAN must be at most 15 characters")
		}
	}
	// Remove protected fields
	delete(input, "id")
	delete(input, "user_id")
	delete(input, "invoice_counter")
	delete(input, "created_at")

	if len(input) == 0 {
		return utils.BadRequest(c, "no fields to update")
	}

	if err := h.billRepo.GetDB().
		Table("businesses").
		Where("user_id = ?", target).
		Updates(input).Error; err != nil {
		log.Printf("admin update business error: %v", err)
		return utils.InternalError(c, "failed to update business")
	}
	return h.GetUserBusiness(c)
}

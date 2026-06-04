package handlers

import (
	"encoding/csv"
	"fmt"
	"log"
	"strconv"
	"strings"

	"github.com/billetra/backend/internal/models"
	"github.com/billetra/backend/internal/repository"
	"github.com/billetra/backend/internal/utils"
	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ProductHandler struct {
	repo     *repository.ProductRepository
	db       *gorm.DB
	validate *validator.Validate
}

func NewProductHandler(repo *repository.ProductRepository, db *gorm.DB) *ProductHandler {
	return &ProductHandler{repo: repo, db: db, validate: validator.New()}
}

type CreateProductInput struct {
	CategoryID    *string `json:"category_id"`
	Name          string  `json:"name" validate:"required"`
	SKU           string  `json:"sku"`
	Description   string  `json:"description"`
	HSNCode       string  `json:"hsn_code"`
	UnitType      string  `json:"unit_type"`
	CustomUnit    string  `json:"custom_unit"`
	SizeVariant   string  `json:"size_variant"`
	SellingPrice  float64 `json:"selling_price" validate:"gte=0"`
	PurchasePrice float64 `json:"purchase_price"`
	GSTRate       float64 `json:"gst_rate"`
	StockQuantity float64 `json:"stock_quantity"`
	LowStockAlert float64 `json:"low_stock_alert"`
	IsActive      *bool   `json:"is_active"`
}

func (h *ProductHandler) List(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 20)
	search := c.Query("search")
	category := c.Query("category")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	products, total, err := h.repo.List(userID, search, category, page, limit)
	if err != nil {
		log.Printf("list products error: %v", err)
		return utils.InternalError(c, "failed to fetch products")
	}
	return utils.OKPaginated(c, products, total, page, limit)
}

func (h *ProductHandler) Create(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var input CreateProductInput
	if err := c.BodyParser(&input); err != nil {
		return utils.BadRequest(c, "invalid request body")
	}
	if err := h.validate.Struct(input); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	uid, _ := uuid.Parse(userID)
	p := &models.Product{
		UserID:        uid,
		Name:          input.Name,
		SKU:           input.SKU,
		Description:   input.Description,
		HSNCode:       input.HSNCode,
		UnitType:      input.UnitType,
		CustomUnit:    input.CustomUnit,
		SizeVariant:   input.SizeVariant,
		SellingPrice:  input.SellingPrice,
		PurchasePrice: input.PurchasePrice,
		GSTRate:       input.GSTRate,
		StockQuantity: input.StockQuantity,
		LowStockAlert: input.LowStockAlert,
	}
	if input.IsActive != nil {
		p.IsActive = *input.IsActive
	} else {
		p.IsActive = true
	}
	if input.CategoryID != nil && *input.CategoryID != "" {
		cid, err := uuid.Parse(*input.CategoryID)
		if err != nil {
			return utils.BadRequest(c, "invalid category_id")
		}
		p.CategoryID = &cid
	}
	if p.UnitType == "" {
		p.UnitType = "piece"
	}

	if err := h.repo.Create(p); err != nil {
		log.Printf("create product error: %v", err)
		return utils.InternalError(c, "failed to create product")
	}
	utils.LogAudit(h.db, userID, "product", p.ID.String(), "create", c.IP(), nil, p)
	return utils.Created(c, p)
}

func (h *ProductHandler) GetByID(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	id := c.Params("id")

	p, err := h.repo.FindByID(id, userID)
	if err != nil {
		return utils.NotFound(c, "product not found")
	}
	return utils.OK(c, p)
}

func (h *ProductHandler) Update(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	id := c.Params("id")

	p, err := h.repo.FindByID(id, userID)
	if err != nil {
		return utils.NotFound(c, "product not found")
	}

	var input CreateProductInput
	if err := c.BodyParser(&input); err != nil {
		return utils.BadRequest(c, "invalid request body")
	}

	if input.Name != "" {
		p.Name = input.Name
	}
	if input.SKU != "" {
		p.SKU = input.SKU
	}
	if input.Description != "" {
		p.Description = input.Description
	}
	if input.HSNCode != "" {
		p.HSNCode = input.HSNCode
	}
	if input.UnitType != "" {
		p.UnitType = input.UnitType
	}
	p.CustomUnit = input.CustomUnit
	p.SizeVariant = input.SizeVariant
	p.SellingPrice = input.SellingPrice
	p.PurchasePrice = input.PurchasePrice
	p.GSTRate = input.GSTRate
	p.StockQuantity = input.StockQuantity
	p.LowStockAlert = input.LowStockAlert
	if input.IsActive != nil {
		p.IsActive = *input.IsActive
	}
	if input.CategoryID != nil {
		if *input.CategoryID == "" {
			p.CategoryID = nil
		} else {
			cid, err := uuid.Parse(*input.CategoryID)
			if err != nil {
				return utils.BadRequest(c, "invalid category_id")
			}
			p.CategoryID = &cid
		}
	}

	if err := h.repo.Update(p); err != nil {
		log.Printf("update product error: %v", err)
		return utils.InternalError(c, "failed to update product")
	}
	utils.LogAudit(h.db, userID, "product", p.ID.String(), "update", c.IP(), nil, p)
	return utils.OK(c, p)
}

func (h *ProductHandler) Delete(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	id := c.Params("id")

	_, err := h.repo.FindByID(id, userID)
	if err != nil {
		return utils.NotFound(c, "product not found")
	}

	if err := h.repo.Delete(id, userID); err != nil {
		log.Printf("delete product error: %v", err)
		return utils.InternalError(c, "failed to delete product")
	}
	utils.LogAudit(h.db, userID, "product", id, "delete", c.IP(), nil, nil)
	return utils.OKMessage(c, "product deleted")
}

// BulkImport handles JSON array: POST /products/bulk-import
// Accepts flexible field names to handle different Excel template versions.
func (h *ProductHandler) BulkImport(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	uid, _ := uuid.Parse(userID)

	// Use a flexible map to handle field name variations from Excel exports
	var rawRows []map[string]interface{}
	if err := c.BodyParser(&rawRows); err != nil {
		return utils.BadRequest(c, "invalid JSON array — expected array of objects")
	}
	if len(rawRows) == 0 {
		return utils.BadRequest(c, "no items provided")
	}
	if len(rawRows) > 500 {
		return utils.BadRequest(c, "max 500 items per import")
	}

	getStr := func(row map[string]interface{}, keys ...string) string {
		for _, k := range keys {
			if v, ok := row[k]; ok && v != nil {
				return strings.TrimSpace(fmt.Sprintf("%v", v))
			}
		}
		return ""
	}
	getFloat := func(row map[string]interface{}, keys ...string) float64 {
		for _, k := range keys {
			if v, ok := row[k]; ok && v != nil {
				switch n := v.(type) {
				case float64:
					return n
				case int:
					return float64(n)
				case string:
					var f float64
					fmt.Sscanf(n, "%f", &f)
					return f
				}
			}
		}
		return 0
	}

	var products []models.Product
	var errs []string

	for i, row := range rawRows {
		name := getStr(row, "name", "Name", "product_name", "ProductName")
		if name == "" {
			errs = append(errs, fmt.Sprintf("row %d: name is required", i+1))
			continue
		}
		unitType := getStr(row, "unit_type", "unitType", "UnitType", "unit")
		if unitType == "" {
			unitType = "piece"
		}
		p := models.Product{
			UserID:        uid,
			Name:          name,
			SKU:           getStr(row, "sku", "SKU", "Sku"),
			Description:   getStr(row, "description", "Description"),
			HSNCode:       getStr(row, "hsn_code", "hsnCode", "HSNCode", "hsn"),
			UnitType:      unitType,
			CustomUnit:    getStr(row, "custom_unit", "customUnit"),
			SizeVariant:   getStr(row, "size_variant", "sizeVariant"),
			SellingPrice:  getFloat(row, "selling_price", "sellingPrice", "price", "sell_price"),
			PurchasePrice: getFloat(row, "purchase_price", "purchasePrice", "cost_price", "costPrice", "cost"),
			GSTRate:       getFloat(row, "gst_rate", "gstRate", "gst", "tax_rate"),
			StockQuantity: getFloat(row, "stock_quantity", "stockQuantity", "stock", "qty", "quantity"),
			LowStockAlert: getFloat(row, "low_stock_alert", "lowStockAlert", "low_stock", "alert"),
			IsActive:      true,
		}
		if p.LowStockAlert == 0 {
			p.LowStockAlert = 5 // sensible default
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

// BulkUpload handles CSV: name,sku,price,gst_rate,hsn_code,stock
func (h *ProductHandler) BulkUpload(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	uid, _ := uuid.Parse(userID)

	fileHeader, err := c.FormFile("file")
	if err != nil {
		return utils.BadRequest(c, "file is required (multipart field: file)")
	}

	file, err := fileHeader.Open()
	if err != nil {
		return utils.InternalError(c, "failed to open uploaded file")
	}
	defer file.Close()

	reader := csv.NewReader(file)
	records, err := reader.ReadAll()
	if err != nil {
		return utils.BadRequest(c, "invalid CSV format")
	}

	if len(records) < 2 {
		return utils.BadRequest(c, "CSV must have header row and at least one data row")
	}

	var products []models.Product
	var errors []string

	for i, row := range records[1:] { // skip header
		if len(row) < 6 {
			errors = append(errors, "row "+strconv.Itoa(i+2)+": insufficient columns (need name,sku,price,gst_rate,hsn_code,stock)")
			continue
		}

		name := strings.TrimSpace(row[0])
		sku := strings.TrimSpace(row[1])
		priceStr := strings.TrimSpace(row[2])
		gstRateStr := strings.TrimSpace(row[3])
		hsnCode := strings.TrimSpace(row[4])
		stockStr := strings.TrimSpace(row[5])

		if name == "" {
			errors = append(errors, "row "+strconv.Itoa(i+2)+": name is required")
			continue
		}

		price, err := strconv.ParseFloat(priceStr, 64)
		if err != nil {
			errors = append(errors, "row "+strconv.Itoa(i+2)+": invalid price")
			continue
		}
		gstRate, _ := strconv.ParseFloat(gstRateStr, 64)
		stock, _ := strconv.ParseFloat(stockStr, 64)

		products = append(products, models.Product{
			UserID:        uid,
			Name:          name,
			SKU:           sku,
			HSNCode:       hsnCode,
			SellingPrice:  price,
			GSTRate:       gstRate,
			StockQuantity: stock,
			UnitType:      "piece",
			IsActive:      true,
			LowStockAlert: 10,
		})
	}

	if len(products) == 0 {
		return utils.BadRequest(c, "no valid products found in CSV")
	}

	if err := h.repo.BulkCreate(products); err != nil {
		log.Printf("bulk create products error: %v", err)
		return utils.InternalError(c, "failed to bulk create products")
	}

	return utils.Created(c, fiber.Map{
		"created": len(products),
		"errors":  errors,
	})
}

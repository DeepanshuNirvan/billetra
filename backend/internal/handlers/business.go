package handlers

import (
	"log"

	"github.com/billetra/backend/internal/models"
	"github.com/billetra/backend/internal/utils"
	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type BusinessHandler struct {
	db       *gorm.DB
	validate *validator.Validate
}

func NewBusinessHandler(db *gorm.DB) *BusinessHandler {
	return &BusinessHandler{db: db, validate: validator.New()}
}

type UpdateBusinessInput struct {
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
}

func (h *BusinessHandler) Get(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var business models.Business
	err := h.db.Where("user_id = ?", userID).First(&business).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return utils.NotFound(c, "business profile not found")
		}
		log.Printf("get business error: %v", err)
		return utils.InternalError(c, "failed to fetch business")
	}
	return utils.OK(c, business)
}

func (h *BusinessHandler) Update(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var input UpdateBusinessInput
	if err := c.BodyParser(&input); err != nil {
		return utils.BadRequest(c, "invalid request body")
	}

	var business models.Business
	err := h.db.Where("user_id = ?", userID).First(&business).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return utils.NotFound(c, "business profile not found")
		}
		log.Printf("get business error: %v", err)
		return utils.InternalError(c, "failed to fetch business")
	}

	if input.Name != "" {
		business.Name = input.Name
	}
	if input.GSTIN != "" {
		business.GSTIN = input.GSTIN
	}
	if input.PAN != "" {
		business.PAN = input.PAN
	}
	if input.Phone != "" {
		business.Phone = input.Phone
	}
	if input.Email != "" {
		business.Email = input.Email
	}
	if input.Address != "" {
		business.Address = input.Address
	}
	if input.City != "" {
		business.City = input.City
	}
	if input.State != "" {
		business.State = input.State
	}
	if input.Pincode != "" {
		business.Pincode = input.Pincode
	}
	if input.LogoURL != "" {
		business.LogoURL = input.LogoURL
	}
	if input.DefaultTemplate != "" {
		business.DefaultTemplate = input.DefaultTemplate
	}
	if input.DefaultBillSize != "" {
		business.DefaultBillSize = input.DefaultBillSize
	}
	if input.InvoicePrefix != "" {
		business.InvoicePrefix = input.InvoicePrefix
	}

	if err := h.db.Save(&business).Error; err != nil {
		log.Printf("update business error: %v", err)
		return utils.InternalError(c, "failed to update business")
	}
	return utils.OK(c, business)
}

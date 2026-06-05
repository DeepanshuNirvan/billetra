package handlers

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/jpeg"
	_ "image/gif"
	_ "image/png"
	"io"
	"log"
	"strings"

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
	ShowLogoOnBills *bool  `json:"show_logo_on_bills"`
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

	// Validate lengths before hitting the DB
	if len(strings.TrimSpace(input.GSTIN)) > 20 {
		return utils.BadRequest(c, "GSTIN must be at most 20 characters")
	}
	if len(strings.TrimSpace(input.PAN)) > 15 {
		return utils.BadRequest(c, "PAN must be at most 15 characters")
	}
	if len(strings.TrimSpace(input.InvoicePrefix)) > 20 {
		return utils.BadRequest(c, "invoice prefix must be at most 20 characters")
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
		business.Name = strings.TrimSpace(input.Name)
	}
	// Allow clearing optional fields by accepting empty strings
	business.GSTIN = strings.TrimSpace(input.GSTIN)
	business.PAN = strings.TrimSpace(input.PAN)
	business.Phone = strings.TrimSpace(input.Phone)
	business.Email = strings.TrimSpace(input.Email)
	business.Address = strings.TrimSpace(input.Address)
	business.City = strings.TrimSpace(input.City)
	business.State = strings.TrimSpace(input.State)
	business.Pincode = strings.TrimSpace(input.Pincode)
	business.LogoURL = strings.TrimSpace(input.LogoURL)
	if input.DefaultTemplate != "" {
		business.DefaultTemplate = input.DefaultTemplate
	}
	if input.DefaultBillSize != "" {
		business.DefaultBillSize = input.DefaultBillSize
	}
	if input.InvoicePrefix != "" {
		business.InvoicePrefix = strings.TrimSpace(input.InvoicePrefix)
	}
	if input.ShowLogoOnBills != nil {
		business.ShowLogoOnBills = *input.ShowLogoOnBills
	}

	if err := h.db.Save(&business).Error; err != nil {
		log.Printf("update business error: %v", err)
		return utils.InternalError(c, "failed to update business")
	}
	return utils.OK(c, business)
}

const maxLogoBytes = 2 * 1024 * 1024 // 2MB

// UploadLogo stores the uploaded image as a base64 data URI on the business.
// Keeping it in the DB avoids a filesystem dependency and works in PDFs + web.
func (h *BusinessHandler) UploadLogo(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	fileHeader, err := c.FormFile("logo")
	if err != nil {
		return utils.BadRequest(c, "logo file is required")
	}
	if fileHeader.Size > maxLogoBytes {
		return utils.BadRequest(c, "logo must be at most 2MB")
	}

	f, err := fileHeader.Open()
	if err != nil {
		return utils.InternalError(c, "failed to read logo")
	}
	defer f.Close()

	data, err := io.ReadAll(io.LimitReader(f, maxLogoBytes+1))
	if err != nil {
		return utils.InternalError(c, "failed to read logo")
	}
	if len(data) > maxLogoBytes {
		return utils.BadRequest(c, "logo must be at most 2MB")
	}

	// Decode + re-encode to a baseline JPEG (transparency flattened onto white).
	// This both validates the upload and guarantees the PDF renderer can embed
	// it — gofpdf rejects/panics on some PNG variants (16-bit, interlaced, etc.).
	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return utils.BadRequest(c, "file must be a valid PNG, JPG or GIF image")
	}
	bounds := img.Bounds()
	flat := image.NewRGBA(bounds)
	draw.Draw(flat, bounds, image.NewUniform(color.White), image.Point{}, draw.Src)
	draw.Draw(flat, bounds, img, bounds.Min, draw.Over)

	var jpegBuf bytes.Buffer
	if err := jpeg.Encode(&jpegBuf, flat, &jpeg.Options{Quality: 85}); err != nil {
		return utils.InternalError(c, "failed to process logo")
	}

	dataURI := fmt.Sprintf("data:image/jpeg;base64,%s", base64.StdEncoding.EncodeToString(jpegBuf.Bytes()))

	var business models.Business
	if err := h.db.Where("user_id = ?", userID).First(&business).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return utils.NotFound(c, "business profile not found")
		}
		return utils.InternalError(c, "failed to fetch business")
	}

	business.LogoURL = dataURI
	if err := h.db.Save(&business).Error; err != nil {
		log.Printf("update logo error: %v", err)
		return utils.InternalError(c, "failed to save logo")
	}

	return utils.OK(c, fiber.Map{"logo_url": dataURI})
}

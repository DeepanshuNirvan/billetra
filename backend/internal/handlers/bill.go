package handlers

import (
	"log"
	"time"

	"github.com/billetra/backend/internal/models"
	"github.com/billetra/backend/internal/repository"
	"github.com/billetra/backend/internal/services"
	"github.com/billetra/backend/internal/utils"
	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type BillHandler struct {
	billService  *services.BillService
	billRepo     *repository.BillRepository
	pdfService   *services.PDFService
	db           *gorm.DB
	validate     *validator.Validate
}

func NewBillHandler(
	billService *services.BillService,
	billRepo *repository.BillRepository,
	pdfService *services.PDFService,
	db *gorm.DB,
) *BillHandler {
	return &BillHandler{
		billService: billService,
		billRepo:    billRepo,
		pdfService:  pdfService,
		db:          db,
		validate:    validator.New(),
	}
}

func (h *BillHandler) List(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 20)
	status := c.Query("status")
	customerID := c.Query("customer_id")
	search := c.Query("search")
	fromStr := c.Query("from")
	toStr := c.Query("to")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	var from, to *time.Time
	if fromStr != "" {
		t, err := time.Parse("2006-01-02", fromStr)
		if err == nil {
			from = &t
		}
	}
	if toStr != "" {
		t, err := time.Parse("2006-01-02", toStr)
		if err == nil {
			to = &t
		}
	}

	bills, total, err := h.billRepo.List(userID, status, customerID, search, from, to, page, limit)
	if err != nil {
		log.Printf("list bills error: %v", err)
		return utils.InternalError(c, "failed to fetch bills")
	}
	return utils.OKPaginated(c, bills, total, page, limit)
}

func (h *BillHandler) Create(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var input services.CreateBillInput
	if err := c.BodyParser(&input); err != nil {
		return utils.BadRequest(c, "invalid request body")
	}
	if err := h.validate.Struct(input); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	bill, err := h.billService.Create(userID, input)
	if err != nil {
		log.Printf("create bill error: %v", err)
		return utils.BadRequest(c, err.Error())
	}

	// Reload with associations
	fullBill, err := h.billRepo.FindByID(bill.ID.String(), userID)
	if err != nil {
		return utils.Created(c, bill)
	}
	utils.LogAudit(h.db, userID, "bill", bill.ID.String(), "create", c.IP(), nil, fullBill)
	return utils.Created(c, fullBill)
}

func (h *BillHandler) GetByID(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	id := c.Params("id")

	bill, err := h.billRepo.FindByID(id, userID)
	if err != nil {
		return utils.NotFound(c, "bill not found")
	}
	return utils.OK(c, bill)
}

func (h *BillHandler) Update(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	id := c.Params("id")

	var input services.CreateBillInput
	if err := c.BodyParser(&input); err != nil {
		return utils.BadRequest(c, "invalid request body")
	}

	bill, err := h.billService.Update(userID, id, input)
	if err != nil {
		log.Printf("update bill error: %v", err)
		return utils.BadRequest(c, err.Error())
	}
	utils.LogAudit(h.db, userID, "bill", id, "update", c.IP(), nil, bill)
	return utils.OK(c, bill)
}

func (h *BillHandler) Delete(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	id := c.Params("id")

	if err := h.billService.Delete(userID, id); err != nil {
		log.Printf("delete bill error: %v", err)
		return utils.BadRequest(c, err.Error())
	}
	utils.LogAudit(h.db, userID, "bill", id, "delete", c.IP(), nil, nil)
	return utils.OKMessage(c, "bill deleted")
}

func (h *BillHandler) Duplicate(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	id := c.Params("id")

	bill, err := h.billService.Duplicate(userID, id)
	if err != nil {
		log.Printf("duplicate bill error: %v", err)
		return utils.BadRequest(c, err.Error())
	}
	return utils.Created(c, bill)
}

func (h *BillHandler) MarkPaid(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	id := c.Params("id")

	var body struct {
		PaidAmount float64 `json:"paid_amount"`
	}
	if err := c.BodyParser(&body); err != nil {
		return utils.BadRequest(c, "invalid request body")
	}

	bill, err := h.billService.MarkPaid(userID, id, body.PaidAmount)
	if err != nil {
		log.Printf("mark paid error: %v", err)
		return utils.BadRequest(c, err.Error())
	}
	return utils.OK(c, bill)
}

func (h *BillHandler) GetPDF(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	id := c.Params("id")

	bill, err := h.billRepo.FindByID(id, userID)
	if err != nil {
		return utils.NotFound(c, "bill not found")
	}

	var business models.Business
	if err := h.db.Where("user_id = ?", userID).First(&business).Error; err != nil {
		return utils.InternalError(c, "business profile not found")
	}

	pdfBytes, err := h.pdfService.GenerateBillPDF(bill, &business)
	if err != nil {
		log.Printf("pdf generation error: %v", err)
		return utils.InternalError(c, "failed to generate PDF")
	}

	filename := "invoice-" + bill.InvoiceNumber + ".pdf"
	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", "inline; filename=\""+filename+"\"")
	return c.Send(pdfBytes)
}

// Templates returns the list of selectable invoice templates.
func (h *BillHandler) Templates(c *fiber.Ctx) error {
	return utils.OK(c, services.Templates)
}

// Preview renders a PDF for an unsaved bill (live preview while editing).
func (h *BillHandler) Preview(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var input services.CreateBillInput
	if err := c.BodyParser(&input); err != nil {
		return utils.BadRequest(c, "invalid request body")
	}

	bill, err := h.billService.BuildPreview(userID, input)
	if err != nil {
		return utils.BadRequest(c, err.Error())
	}

	var business models.Business
	if err := h.db.Where("user_id = ?", userID).First(&business).Error; err != nil {
		// fall back to a placeholder so preview still works pre-onboarding
		business = models.Business{Name: "Your Business"}
	}

	pdfBytes, err := h.pdfService.GenerateBillPDF(bill, &business)
	if err != nil {
		log.Printf("preview pdf error: %v", err)
		return utils.InternalError(c, "failed to generate preview")
	}
	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", "inline; filename=\"preview.pdf\"")
	return c.Send(pdfBytes)
}

// TemplateSample renders a dummy bill so users can preview a template's look.
// Uses the caller's own business details when available for realism.
func (h *BillHandler) TemplateSample(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	tpl := c.Query("template", "modern")

	bill, sampleBiz := services.SampleBill()
	bill.Template = tpl

	business := *sampleBiz
	var real models.Business
	if err := h.db.Where("user_id = ?", userID).First(&real).Error; err == nil && real.Name != "" {
		// keep sample customer/items, but show the real business identity
		business.Name = real.Name
		business.GSTIN = real.GSTIN
		business.PAN = real.PAN
		business.Phone = real.Phone
		business.Email = real.Email
		business.Address = real.Address
		business.City = real.City
		business.State = real.State
		business.Pincode = real.Pincode
	}

	pdfBytes, err := h.pdfService.GenerateBillPDF(bill, &business)
	if err != nil {
		log.Printf("sample pdf error: %v", err)
		return utils.InternalError(c, "failed to generate sample")
	}
	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", "inline; filename=\"sample.pdf\"")
	return c.Send(pdfBytes)
}

// Cancel voids a bill (restores stock + balance, marks cancelled).
func (h *BillHandler) Cancel(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	id := c.Params("id")

	bill, err := h.billService.Cancel(userID, id)
	if err != nil {
		log.Printf("cancel bill error: %v", err)
		return utils.BadRequest(c, err.Error())
	}
	utils.LogAudit(h.db, userID, "bill", id, "cancel", c.IP(), nil, bill)
	return utils.OK(c, bill)
}

package handlers

import (
	"log"

	"github.com/billetra/backend/internal/models"
	"github.com/billetra/backend/internal/repository"
	"github.com/billetra/backend/internal/utils"
	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type CustomerHandler struct {
	repo     *repository.CustomerRepository
	billRepo *repository.BillRepository
	validate *validator.Validate
}

func NewCustomerHandler(repo *repository.CustomerRepository, billRepo *repository.BillRepository) *CustomerHandler {
	return &CustomerHandler{repo: repo, billRepo: billRepo, validate: validator.New()}
}

type CreateCustomerInput struct {
	Name               string  `json:"name" validate:"required"`
	Phone              string  `json:"phone"`
	Email              string  `json:"email"`
	GSTIN              string  `json:"gstin"`
	PAN                string  `json:"pan"`
	BillingAddress     string  `json:"billing_address"`
	ShippingAddress    string  `json:"shipping_address"`
	State              string  `json:"state"`
	CreditLimit        float64 `json:"credit_limit"`
	PaymentTerms       string  `json:"payment_terms"`
}

func (h *CustomerHandler) List(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 20)
	search := c.Query("search")
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	customers, total, err := h.repo.List(userID, search, page, limit)
	if err != nil {
		log.Printf("list customers error: %v", err)
		return utils.InternalError(c, "failed to fetch customers")
	}
	return utils.OKPaginated(c, customers, total, page, limit)
}

func (h *CustomerHandler) Create(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var input CreateCustomerInput
	if err := c.BodyParser(&input); err != nil {
		return utils.BadRequest(c, "invalid request body")
	}
	if err := h.validate.Struct(input); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	uid, _ := uuid.Parse(userID)
	customer := &models.Customer{
		UserID:          uid,
		Name:            input.Name,
		Phone:           input.Phone,
		Email:           input.Email,
		GSTIN:           input.GSTIN,
		PAN:             input.PAN,
		BillingAddress:  input.BillingAddress,
		ShippingAddress: input.ShippingAddress,
		State:           input.State,
		CreditLimit:     input.CreditLimit,
		PaymentTerms:    input.PaymentTerms,
		IsActive:        true,
	}
	if err := h.repo.Create(customer); err != nil {
		log.Printf("create customer error: %v", err)
		return utils.InternalError(c, "failed to create customer")
	}
	return utils.Created(c, customer)
}

func (h *CustomerHandler) GetByID(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	id := c.Params("id")

	customer, err := h.repo.FindByID(id, userID)
	if err != nil {
		return utils.NotFound(c, "customer not found")
	}
	return utils.OK(c, customer)
}

func (h *CustomerHandler) Update(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	id := c.Params("id")

	customer, err := h.repo.FindByID(id, userID)
	if err != nil {
		return utils.NotFound(c, "customer not found")
	}

	var input CreateCustomerInput
	if err := c.BodyParser(&input); err != nil {
		return utils.BadRequest(c, "invalid request body")
	}

	if input.Name != "" {
		customer.Name = input.Name
	}
	customer.Phone = input.Phone
	customer.Email = input.Email
	customer.GSTIN = input.GSTIN
	customer.PAN = input.PAN
	customer.BillingAddress = input.BillingAddress
	customer.ShippingAddress = input.ShippingAddress
	customer.State = input.State
	customer.CreditLimit = input.CreditLimit
	customer.PaymentTerms = input.PaymentTerms

	if err := h.repo.Update(customer); err != nil {
		log.Printf("update customer error: %v", err)
		return utils.InternalError(c, "failed to update customer")
	}
	return utils.OK(c, customer)
}

func (h *CustomerHandler) Delete(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	id := c.Params("id")

	_, err := h.repo.FindByID(id, userID)
	if err != nil {
		return utils.NotFound(c, "customer not found")
	}

	if err := h.repo.Delete(id, userID); err != nil {
		log.Printf("delete customer error: %v", err)
		return utils.InternalError(c, "failed to delete customer")
	}
	return utils.OKMessage(c, "customer deleted")
}

func (h *CustomerHandler) Statement(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	id := c.Params("id")

	_, err := h.repo.FindByID(id, userID)
	if err != nil {
		return utils.NotFound(c, "customer not found")
	}

	bills, err := h.billRepo.FindByCustomer(userID, id)
	if err != nil {
		log.Printf("customer statement error: %v", err)
		return utils.InternalError(c, "failed to fetch customer statement")
	}
	return utils.OK(c, bills)
}

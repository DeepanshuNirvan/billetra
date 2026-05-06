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

type AccountHandler struct {
	repo     *repository.AccountRepository
	validate *validator.Validate
}

func NewAccountHandler(repo *repository.AccountRepository) *AccountHandler {
	return &AccountHandler{repo: repo, validate: validator.New()}
}

type CreateAccountInput struct {
	Name          string  `json:"name" validate:"required"`
	AccountType   string  `json:"account_type" validate:"required,oneof=bank cash upi"`
	AccountNumber string  `json:"account_number"`
	IFSC          string  `json:"ifsc"`
	UPIID         string  `json:"upi_id"`
	Branch        string  `json:"branch"`
	IsDefault     bool    `json:"is_default"`
	Balance       float64 `json:"balance"`
}

func (h *AccountHandler) List(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	accounts, err := h.repo.ListByUser(userID)
	if err != nil {
		log.Printf("list accounts error: %v", err)
		return utils.InternalError(c, "failed to fetch accounts")
	}
	return utils.OK(c, accounts)
}

func (h *AccountHandler) Create(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var input CreateAccountInput
	if err := c.BodyParser(&input); err != nil {
		return utils.BadRequest(c, "invalid request body")
	}
	if err := h.validate.Struct(input); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	uid, _ := uuid.Parse(userID)
	account := &models.Account{
		UserID:        uid,
		Name:          input.Name,
		AccountType:   input.AccountType,
		AccountNumber: input.AccountNumber,
		IFSC:          input.IFSC,
		UPIID:         input.UPIID,
		Branch:        input.Branch,
		IsDefault:     input.IsDefault,
		Balance:       input.Balance,
		IsActive:      true,
	}

	if input.IsDefault {
		if err := h.repo.ClearDefault(userID); err != nil {
			log.Printf("clear default account error: %v", err)
		}
	}

	if err := h.repo.Create(account); err != nil {
		log.Printf("create account error: %v", err)
		return utils.InternalError(c, "failed to create account")
	}
	return utils.Created(c, account)
}

func (h *AccountHandler) Update(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	id := c.Params("id")

	account, err := h.repo.FindByID(id, userID)
	if err != nil {
		return utils.NotFound(c, "account not found")
	}

	var input CreateAccountInput
	if err := c.BodyParser(&input); err != nil {
		return utils.BadRequest(c, "invalid request body")
	}

	if input.Name != "" {
		account.Name = input.Name
	}
	if input.AccountType != "" {
		account.AccountType = input.AccountType
	}
	account.AccountNumber = input.AccountNumber
	account.IFSC = input.IFSC
	account.UPIID = input.UPIID
	account.Branch = input.Branch
	account.Balance = input.Balance

	if err := h.repo.Update(account); err != nil {
		log.Printf("update account error: %v", err)
		return utils.InternalError(c, "failed to update account")
	}
	return utils.OK(c, account)
}

func (h *AccountHandler) Delete(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	id := c.Params("id")

	_, err := h.repo.FindByID(id, userID)
	if err != nil {
		return utils.NotFound(c, "account not found")
	}

	if err := h.repo.Delete(id, userID); err != nil {
		log.Printf("delete account error: %v", err)
		return utils.InternalError(c, "failed to delete account")
	}
	return utils.OKMessage(c, "account deleted")
}

func (h *AccountHandler) SetDefault(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	id := c.Params("id")

	_, err := h.repo.FindByID(id, userID)
	if err != nil {
		return utils.NotFound(c, "account not found")
	}

	if err := h.repo.ClearDefault(userID); err != nil {
		log.Printf("clear default error: %v", err)
		return utils.InternalError(c, "failed to update default account")
	}
	if err := h.repo.SetDefault(id, userID); err != nil {
		log.Printf("set default error: %v", err)
		return utils.InternalError(c, "failed to set default account")
	}
	return utils.OKMessage(c, "default account updated")
}

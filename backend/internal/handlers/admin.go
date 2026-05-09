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
	if len(updates) == 0 {
		return utils.BadRequest(c, "no fields to update")
	}
	if err := h.userRepo.UpdateFields(id, updates); err != nil {
		return utils.InternalError(c, "failed to update user")
	}
	user, _ := h.userRepo.FindByID(id)
	return utils.OK(c, user)
}

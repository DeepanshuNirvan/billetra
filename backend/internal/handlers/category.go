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

type CategoryHandler struct {
	repo     *repository.CategoryRepository
	validate *validator.Validate
}

func NewCategoryHandler(repo *repository.CategoryRepository) *CategoryHandler {
	return &CategoryHandler{repo: repo, validate: validator.New()}
}

type CreateCategoryInput struct {
	Name string `json:"name" validate:"required"`
}

func (h *CategoryHandler) List(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	cats, err := h.repo.ListByUser(userID)
	if err != nil {
		log.Printf("list categories error: %v", err)
		return utils.InternalError(c, "failed to fetch categories")
	}
	return utils.OK(c, cats)
}

func (h *CategoryHandler) Create(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var input CreateCategoryInput
	if err := c.BodyParser(&input); err != nil {
		return utils.BadRequest(c, "invalid request body")
	}
	if err := h.validate.Struct(input); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	uid, _ := uuid.Parse(userID)
	cat := &models.Category{
		UserID: uid,
		Name:   input.Name,
	}
	if err := h.repo.Create(cat); err != nil {
		log.Printf("create category error: %v", err)
		return utils.InternalError(c, "failed to create category")
	}
	return utils.Created(c, cat)
}

func (h *CategoryHandler) Delete(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	id := c.Params("id")

	_, err := h.repo.FindByID(id, userID)
	if err != nil {
		return utils.NotFound(c, "category not found")
	}

	if err := h.repo.Delete(id, userID); err != nil {
		log.Printf("delete category error: %v", err)
		return utils.InternalError(c, "failed to delete category")
	}
	return utils.OKMessage(c, "category deleted")
}

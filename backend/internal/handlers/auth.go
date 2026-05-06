package handlers

import (
	"log"

	"github.com/billetra/backend/internal/services"
	"github.com/billetra/backend/internal/utils"
	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
)

type AuthHandler struct {
	authService *services.AuthService
	validate    *validator.Validate
}

func NewAuthHandler(authService *services.AuthService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
		validate:    validator.New(),
	}
}

func (h *AuthHandler) Signup(c *fiber.Ctx) error {
	var input services.RegisterInput
	if err := c.BodyParser(&input); err != nil {
		return utils.BadRequest(c, "invalid request body")
	}
	if err := h.validate.Struct(input); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	tokens, err := h.authService.Register(input)
	if err != nil {
		log.Printf("signup error: %v", err)
		return utils.BadRequest(c, err.Error())
	}
	return utils.Created(c, tokens)
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var input services.LoginInput
	if err := c.BodyParser(&input); err != nil {
		return utils.BadRequest(c, "invalid request body")
	}
	if err := h.validate.Struct(input); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	tokens, err := h.authService.Login(input)
	if err != nil {
		log.Printf("login error: %v", err)
		return utils.Unauthorized(c, err.Error())
	}
	return utils.OK(c, tokens)
}

func (h *AuthHandler) Refresh(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	tokens, err := h.authService.RefreshToken(userID)
	if err != nil {
		log.Printf("refresh error: %v", err)
		return utils.Unauthorized(c, err.Error())
	}
	return utils.OK(c, tokens)
}

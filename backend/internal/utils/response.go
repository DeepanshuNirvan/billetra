package utils

import "github.com/gofiber/fiber/v2"

type Response struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

type PaginatedPayload struct {
	Data       interface{} `json:"data"`
	Total      int64       `json:"total"`
	Page       int         `json:"page"`
	Limit      int         `json:"limit"`
	TotalPages int64       `json:"totalPages"`
}

func OK(c *fiber.Ctx, data interface{}) error {
	return c.Status(200).JSON(Response{Success: true, Data: data})
}

func Created(c *fiber.Ctx, data interface{}) error {
	return c.Status(201).JSON(Response{Success: true, Data: data})
}

func OKMessage(c *fiber.Ctx, message string) error {
	return c.Status(200).JSON(Response{Success: true, Message: message})
}

func OKPaginated(c *fiber.Ctx, data interface{}, total int64, page, limit int) error {
	totalPages := (total + int64(limit) - 1) / int64(limit)
	if totalPages < 1 {
		totalPages = 1
	}
	return c.Status(200).JSON(Response{
		Success: true,
		Data: PaginatedPayload{
			Data:       data,
			Total:      total,
			Page:       page,
			Limit:      limit,
			TotalPages: totalPages,
		},
	})
}

func BadRequest(c *fiber.Ctx, msg string) error {
	return c.Status(400).JSON(Response{Success: false, Error: msg})
}

func Unauthorized(c *fiber.Ctx, msg string) error {
	return c.Status(401).JSON(Response{Success: false, Error: msg})
}

func Forbidden(c *fiber.Ctx, msg string) error {
	return c.Status(403).JSON(Response{Success: false, Error: msg})
}

func NotFound(c *fiber.Ctx, msg string) error {
	return c.Status(404).JSON(Response{Success: false, Error: msg})
}

func InternalError(c *fiber.Ctx, msg string) error {
	return c.Status(500).JSON(Response{Success: false, Error: msg})
}

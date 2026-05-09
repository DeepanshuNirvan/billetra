package utils

import "github.com/gofiber/fiber/v2"

type PaginationParams struct {
	Page   int
	Limit  int
	Offset int
}

func ParsePagination(c *fiber.Ctx) PaginationParams {
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 20)
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	return PaginationParams{
		Page:   page,
		Limit:  limit,
		Offset: (page - 1) * limit,
	}
}

package utils

import (
	"time"

	"github.com/gofiber/fiber/v2"
)

type DateRange struct {
	From *time.Time
	To   *time.Time
}

func ParseDateRange(c *fiber.Ctx) DateRange {
	var dr DateRange
	if f := c.Query("from"); f != "" {
		t, err := time.Parse("2006-01-02", f)
		if err == nil {
			dr.From = &t
		}
	}
	if t := c.Query("to"); t != "" {
		parsed, err := time.Parse("2006-01-02", t)
		if err == nil {
			end := parsed.Add(24*time.Hour - time.Second)
			dr.To = &end
		}
	}
	return dr
}

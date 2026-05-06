package handlers

import (
	"log"
	"time"

	"github.com/billetra/backend/internal/repository"
	"github.com/billetra/backend/internal/utils"
	"github.com/gofiber/fiber/v2"
)

type ReportHandler struct {
	billRepo    *repository.BillRepository
	productRepo *repository.ProductRepository
}

func NewReportHandler(billRepo *repository.BillRepository, productRepo *repository.ProductRepository) *ReportHandler {
	return &ReportHandler{billRepo: billRepo, productRepo: productRepo}
}

func (h *ReportHandler) Sales(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	fromStr := c.Query("from")
	toStr := c.Query("to")
	groupBy := c.Query("group_by", "day")

	now := time.Now()
	from := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	to := now

	if fromStr != "" {
		if t, err := time.Parse("2006-01-02", fromStr); err == nil {
			from = t
		}
	}
	if toStr != "" {
		if t, err := time.Parse("2006-01-02", toStr); err == nil {
			to = t
		}
	}

	if groupBy != "month" && groupBy != "day" {
		groupBy = "day"
	}

	data, err := h.billRepo.GetSalesReport(userID, from, to, groupBy)
	if err != nil {
		log.Printf("sales report error: %v", err)
		return utils.InternalError(c, "failed to generate sales report")
	}

	return utils.OK(c, fiber.Map{
		"from":     from.Format("2006-01-02"),
		"to":       to.Format("2006-01-02"),
		"group_by": groupBy,
		"data":     data,
	})
}

func (h *ReportHandler) GST(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	fromStr := c.Query("from")
	toStr := c.Query("to")

	now := time.Now()
	from := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	to := now

	if fromStr != "" {
		if t, err := time.Parse("2006-01-02", fromStr); err == nil {
			from = t
		}
	}
	if toStr != "" {
		if t, err := time.Parse("2006-01-02", toStr); err == nil {
			to = t
		}
	}

	data, err := h.billRepo.GetGSTReport(userID, from, to)
	if err != nil {
		log.Printf("gst report error: %v", err)
		return utils.InternalError(c, "failed to generate GST report")
	}

	return utils.OK(c, fiber.Map{
		"from": from.Format("2006-01-02"),
		"to":   to.Format("2006-01-02"),
		"data": data,
	})
}

func (h *ReportHandler) Inventory(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	// All products with stock info
	products, _, err := h.productRepo.List(userID, "", "", 1, 1000)
	if err != nil {
		log.Printf("inventory report error: %v", err)
		return utils.InternalError(c, "failed to generate inventory report")
	}

	lowStock, err := h.productRepo.GetLowStock(userID)
	if err != nil {
		log.Printf("low stock report error: %v", err)
	}

	return utils.OK(c, fiber.Map{
		"products":  products,
		"low_stock": lowStock,
	})
}

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

// parseReportDates accepts either "from/to" or "startDate/endDate" query params.
func parseReportDates(c *fiber.Ctx) (from, to time.Time) {
	now := time.Now()
	from = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	to = now

	fromStr := c.Query("from")
	if fromStr == "" {
		fromStr = c.Query("startDate")
	}
	toStr := c.Query("to")
	if toStr == "" {
		toStr = c.Query("endDate")
	}

	if t, err := time.Parse("2006-01-02", fromStr); err == nil {
		from = t
	}
	if t, err := time.Parse("2006-01-02", toStr); err == nil {
		to = time.Date(t.Year(), t.Month(), t.Day(), 23, 59, 59, 0, t.Location())
	}
	return
}

func (h *ReportHandler) Sales(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	from, to := parseReportDates(c)

	groupBy := c.Query("groupBy")
	if groupBy == "" {
		groupBy = c.Query("group_by", "day")
	}
	if groupBy != "month" && groupBy != "day" {
		groupBy = "day"
	}

	data, err := h.billRepo.GetSalesReport(userID, from, to, groupBy)
	if err != nil {
		log.Printf("sales report error: %v", err)
		return utils.InternalError(c, "failed to generate sales report")
	}
	if data == nil {
		data = []repository.SalesReportRow{}
	}

	return utils.OK(c, data)
}

func (h *ReportHandler) GST(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	from, to := parseReportDates(c)

	data, err := h.billRepo.GetGSTReport(userID, from, to)
	if err != nil {
		log.Printf("gst report error: %v", err)
		return utils.InternalError(c, "failed to generate GST report")
	}
	if data == nil {
		data = []repository.GSTReportRow{}
	}

	return utils.OK(c, data)
}

func (h *ReportHandler) Inventory(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	data, err := h.billRepo.GetInventoryReport(userID)
	if err != nil {
		log.Printf("inventory report error: %v", err)
		return utils.InternalError(c, "failed to generate inventory report")
	}
	if data == nil {
		data = []repository.InventoryReportRow{}
	}

	return utils.OK(c, data)
}

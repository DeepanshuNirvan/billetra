package handlers

import (
	"log"

	"github.com/billetra/backend/internal/repository"
	"github.com/billetra/backend/internal/utils"
	"github.com/gofiber/fiber/v2"
)

type DashboardHandler struct {
	billRepo    *repository.BillRepository
	productRepo *repository.ProductRepository
}

func NewDashboardHandler(billRepo *repository.BillRepository, productRepo *repository.ProductRepository) *DashboardHandler {
	return &DashboardHandler{billRepo: billRepo, productRepo: productRepo}
}

type DashboardResponse struct {
	TodaySales       float64                         `json:"today_sales"`
	MonthSales       float64                         `json:"month_sales"`
	TotalOutstanding float64                         `json:"total_outstanding"`
	GSTCollected     float64                         `json:"gst_collected"`
	TotalBills       int64                           `json:"total_bills"`
	PaidBills        int64                           `json:"paid_bills"`
	PendingBills     int64                           `json:"pending_bills"`
	TopProducts      []repository.TopProduct         `json:"top_products"`
	TopCustomers     []repository.TopCustomer        `json:"top_customers"`
	RecentBills      []repository.BillSummary        `json:"recent_bills"`
	LowStockProducts interface{}                     `json:"low_stock_products"`
}

func (h *DashboardHandler) Get(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	stats, err := h.billRepo.GetDashboardStats(userID)
	if err != nil {
		log.Printf("dashboard stats error: %v", err)
		return utils.InternalError(c, "failed to fetch dashboard stats")
	}

	topProducts, err := h.billRepo.GetTopProducts(userID, 5)
	if err != nil {
		log.Printf("top products error: %v", err)
		topProducts = []repository.TopProduct{}
	}

	topCustomers, err := h.billRepo.GetTopCustomers(userID, 5)
	if err != nil {
		log.Printf("top customers error: %v", err)
		topCustomers = []repository.TopCustomer{}
	}

	recentBills, err := h.billRepo.GetRecentBills(userID, 10)
	if err != nil {
		log.Printf("recent bills error: %v", err)
		recentBills = []repository.BillSummary{}
	}

	lowStock, err := h.productRepo.GetLowStock(userID)
	if err != nil {
		log.Printf("low stock error: %v", err)
		lowStock = nil
	}

	resp := DashboardResponse{
		TodaySales:       stats.TodaySales,
		MonthSales:       stats.MonthSales,
		TotalOutstanding: stats.TotalOutstanding,
		GSTCollected:     stats.GSTCollected,
		TotalBills:       stats.TotalBills,
		PaidBills:        stats.PaidBills,
		PendingBills:     stats.PendingBills,
		TopProducts:      topProducts,
		TopCustomers:     topCustomers,
		RecentBills:      recentBills,
		LowStockProducts: lowStock,
	}

	return utils.OK(c, resp)
}

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
	TodaySales       float64                  `json:"today_sales"`
	YesterdaySales   float64                  `json:"yesterday_sales"`
	MonthSales       float64                  `json:"month_sales"`
	LastMonthSales   float64                  `json:"last_month_sales"`
	TotalOutstanding float64                  `json:"total_outstanding"`
	GSTCollected     float64                  `json:"gst_collected"`
	TotalBills       int64                    `json:"total_bills"`
	PaidBills        int64                    `json:"paid_bills"`
	PendingBills     int64                    `json:"pending_bills"`
	TopProducts      []repository.TopProduct  `json:"top_products"`
	TopCustomers     []repository.TopCustomer `json:"top_customers"`
	RecentBills      []repository.BillSummary `json:"recent_bills"`
	LowStockProducts interface{}              `json:"low_stock_products"`
	SalesChart       []repository.ChartPoint  `json:"sales_chart"`
	MonthlyRevenue   []repository.MonthPoint  `json:"monthly_revenue"`
	OverdueAging     *repository.AgingBuckets `json:"overdue_aging"`
}

func (h *DashboardHandler) Get(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	stats, err := h.billRepo.GetDashboardStats(userID)
	if err != nil {
		log.Printf("dashboard stats error: %v", err)
		return utils.InternalError(c, "failed to fetch dashboard stats")
	}

	yesterdaySales, _ := h.billRepo.GetYesterdaySales(userID)
	lastMonthSales, _ := h.billRepo.GetLastMonthSales(userID)

	topProducts, err := h.billRepo.GetTopProducts(userID, 5)
	if err != nil {
		topProducts = []repository.TopProduct{}
	}
	topCustomers, err := h.billRepo.GetTopCustomers(userID, 5)
	if err != nil {
		topCustomers = []repository.TopCustomer{}
	}
	recentBills, err := h.billRepo.GetRecentBills(userID, 10)
	if err != nil {
		recentBills = []repository.BillSummary{}
	}
	lowStock, _ := h.productRepo.GetLowStock(userID)
	salesChart, _ := h.billRepo.GetSalesChart(userID, 30)
	monthlyRevenue, _ := h.billRepo.GetMonthlyRevenue(userID, 6)
	overdueAging, _ := h.billRepo.GetOverdueAging(userID)

	return utils.OK(c, DashboardResponse{
		TodaySales:       stats.TodaySales,
		YesterdaySales:   yesterdaySales,
		MonthSales:       stats.MonthSales,
		LastMonthSales:   lastMonthSales,
		TotalOutstanding: stats.TotalOutstanding,
		GSTCollected:     stats.GSTCollected,
		TotalBills:       stats.TotalBills,
		PaidBills:        stats.PaidBills,
		PendingBills:     stats.PendingBills,
		TopProducts:      topProducts,
		TopCustomers:     topCustomers,
		RecentBills:      recentBills,
		LowStockProducts: lowStock,
		SalesChart:       salesChart,
		MonthlyRevenue:   monthlyRevenue,
		OverdueAging:     overdueAging,
	})
}

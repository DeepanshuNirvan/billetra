package repository

import (
	"time"

	"github.com/billetra/backend/internal/models"
	"gorm.io/gorm"
)

type BillRepository struct {
	db *gorm.DB
}

func NewBillRepository(db *gorm.DB) *BillRepository {
	return &BillRepository{db: db}
}

func (r *BillRepository) List(userID, status, customerID, search string, from, to *time.Time, page, limit int) ([]models.Bill, int64, error) {
	var bills []models.Bill
	var total int64

	q := r.db.Model(&models.Bill{}).Where("user_id = ?", userID)
	if status != "" {
		q = q.Where("status = ?", status)
	}
	if customerID != "" {
		q = q.Where("customer_id = ?", customerID)
	}
	if search != "" {
		q = q.Where("invoice_number ILIKE ?", "%"+search+"%")
	}
	if from != nil {
		q = q.Where("bill_date >= ?", from)
	}
	if to != nil {
		q = q.Where("bill_date <= ?", to)
	}

	q.Count(&total)
	offset := (page - 1) * limit
	err := q.Preload("Customer").Preload("Account").
		Order("bill_date desc, created_at desc").
		Offset(offset).Limit(limit).Find(&bills).Error
	return bills, total, err
}

func (r *BillRepository) Create(tx *gorm.DB, bill *models.Bill) error {
	return tx.Create(bill).Error
}

func (r *BillRepository) FindByID(id, userID string) (*models.Bill, error) {
	var bill models.Bill
	err := r.db.
		Preload("Customer").
		Preload("Account").
		Preload("BillItems").
		Where("id = ? AND user_id = ?", id, userID).
		First(&bill).Error
	if err != nil {
		return nil, err
	}
	return &bill, nil
}

func (r *BillRepository) Update(tx *gorm.DB, bill *models.Bill) error {
	db := r.db
	if tx != nil {
		db = tx
	}
	return db.Save(bill).Error
}

func (r *BillRepository) Delete(id, userID string) error {
	return r.db.Where("id = ? AND user_id = ?", id, userID).Delete(&models.Bill{}).Error
}

func (r *BillRepository) DeleteItems(tx *gorm.DB, billID string) error {
	return tx.Where("bill_id = ?", billID).Delete(&models.BillItem{}).Error
}

func (r *BillRepository) CreateItems(tx *gorm.DB, items []models.BillItem) error {
	return tx.CreateInBatches(items, 50).Error
}

func (r *BillRepository) FindByCustomer(userID, customerID string) ([]models.Bill, error) {
	var bills []models.Bill
	err := r.db.Where("user_id = ? AND customer_id = ?", userID, customerID).
		Preload("BillItems").
		Order("bill_date desc").Find(&bills).Error
	return bills, err
}

func (r *BillRepository) GetDB() *gorm.DB {
	return r.db
}

// IncrementInvoiceCounter atomically increments and returns new counter
func (r *BillRepository) IncrementInvoiceCounter(tx *gorm.DB, userID string) (int, string, error) {
	var result struct {
		InvoiceCounter int
		InvoicePrefix  string
	}
	err := tx.Raw(`
		UPDATE businesses
		SET invoice_counter = invoice_counter + 1, updated_at = NOW()
		WHERE user_id = ?
		RETURNING invoice_counter, invoice_prefix
	`, userID).Scan(&result).Error
	if err != nil {
		return 0, "", err
	}
	return result.InvoiceCounter, result.InvoicePrefix, nil
}

// DashboardStats returns aggregate numbers
type DashboardStats struct {
	TodaySales       float64
	MonthSales       float64
	TotalOutstanding float64
	GSTCollected     float64
	TotalBills       int64
	PaidBills        int64
	PendingBills     int64
}

func (r *BillRepository) GetDashboardStats(userID string) (*DashboardStats, error) {
	var stats DashboardStats

	now := time.Now()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())

	r.db.Model(&models.Bill{}).
		Where("user_id = ? AND bill_date >= ? AND status != 'cancelled'", userID, startOfDay).
		Select("COALESCE(SUM(total_amount),0)").Scan(&stats.TodaySales)

	r.db.Model(&models.Bill{}).
		Where("user_id = ? AND bill_date >= ? AND status != 'cancelled'", userID, startOfMonth).
		Select("COALESCE(SUM(total_amount),0)").Scan(&stats.MonthSales)

	r.db.Model(&models.Bill{}).
		Where("user_id = ? AND status IN ('pending','partial')", userID).
		Select("COALESCE(SUM(total_amount - paid_amount),0)").Scan(&stats.TotalOutstanding)

	r.db.Model(&models.Bill{}).
		Where("user_id = ? AND bill_date >= ? AND status != 'cancelled'", userID, startOfMonth).
		Select("COALESCE(SUM(total_tax),0)").Scan(&stats.GSTCollected)

	r.db.Model(&models.Bill{}).Where("user_id = ?", userID).Count(&stats.TotalBills)
	r.db.Model(&models.Bill{}).Where("user_id = ? AND status = 'paid'", userID).Count(&stats.PaidBills)
	r.db.Model(&models.Bill{}).Where("user_id = ? AND status = 'pending'", userID).Count(&stats.PendingBills)

	return &stats, nil
}

type TopProduct struct {
	ProductID   string  `json:"product_id"`
	Name        string  `json:"name"`
	TotalQty    float64 `json:"total_qty"`
	TotalRevenue float64 `json:"total_revenue"`
}

func (r *BillRepository) GetTopProducts(userID string, limit int) ([]TopProduct, error) {
	var results []TopProduct
	err := r.db.Raw(`
		SELECT bi.product_id::text, bi.name,
		       SUM(bi.quantity) as total_qty,
		       SUM(bi.total) as total_revenue
		FROM bill_items bi
		JOIN bills b ON b.id = bi.bill_id
		WHERE b.user_id = ? AND b.status != 'cancelled' AND bi.product_id IS NOT NULL
		GROUP BY bi.product_id, bi.name
		ORDER BY total_revenue DESC
		LIMIT ?
	`, userID, limit).Scan(&results).Error
	return results, err
}

type TopCustomer struct {
	CustomerID   string  `json:"customer_id"`
	Name         string  `json:"name"`
	TotalBills   int64   `json:"total_bills"`
	TotalAmount  float64 `json:"total_amount"`
}

func (r *BillRepository) GetTopCustomers(userID string, limit int) ([]TopCustomer, error) {
	var results []TopCustomer
	err := r.db.Raw(`
		SELECT b.customer_id::text, c.name,
		       COUNT(b.id) as total_bills,
		       SUM(b.total_amount) as total_amount
		FROM bills b
		JOIN customers c ON c.id = b.customer_id
		WHERE b.user_id = ? AND b.status != 'cancelled' AND b.customer_id IS NOT NULL
		GROUP BY b.customer_id, c.name
		ORDER BY total_amount DESC
		LIMIT ?
	`, userID, limit).Scan(&results).Error
	return results, err
}

type BillSummary struct {
	ID            string     `json:"id"`
	InvoiceNumber string     `json:"invoice_number"`
	CustomerName  string     `json:"customer_name"`
	BillDate      time.Time  `json:"bill_date"`
	TotalAmount   float64    `json:"total_amount"`
	Status        string     `json:"status"`
}

func (r *BillRepository) GetRecentBills(userID string, limit int) ([]BillSummary, error) {
	var results []BillSummary
	err := r.db.Raw(`
		SELECT b.id::text, b.invoice_number, COALESCE(c.name,'') as customer_name,
		       b.bill_date, b.total_amount, b.status
		FROM bills b
		LEFT JOIN customers c ON c.id = b.customer_id
		WHERE b.user_id = ?
		ORDER BY b.created_at DESC
		LIMIT ?
	`, userID, limit).Scan(&results).Error
	return results, err
}

type ChartPoint struct {
	Date   string  `json:"date"`
	Amount float64 `json:"amount"`
}

func (r *BillRepository) GetSalesChart(userID string, days int) ([]ChartPoint, error) {
	var results []ChartPoint
	err := r.db.Raw(`
		SELECT TO_CHAR(gs.day, 'YYYY-MM-DD') as date,
		       COALESCE(SUM(b.total_amount), 0) as amount
		FROM generate_series(
			NOW() - INTERVAL '1 day' * $1, NOW(), '1 day'::interval
		) gs(day)
		LEFT JOIN bills b ON DATE(b.bill_date) = DATE(gs.day)
			AND b.user_id = $2 AND b.status != 'cancelled'
		GROUP BY gs.day
		ORDER BY gs.day ASC
	`, days-1, userID).Scan(&results).Error
	return results, err
}

type MonthPoint struct {
	Month  string  `json:"month"`
	Amount float64 `json:"amount"`
}

func (r *BillRepository) GetMonthlyRevenue(userID string, months int) ([]MonthPoint, error) {
	var results []MonthPoint
	err := r.db.Raw(`
		SELECT TO_CHAR(gs.month, 'Mon YYYY') as month,
		       COALESCE(SUM(b.total_amount), 0) as amount
		FROM generate_series(
			date_trunc('month', NOW() - INTERVAL '1 month' * ($1-1)),
			date_trunc('month', NOW()),
			'1 month'::interval
		) gs(month)
		LEFT JOIN bills b ON date_trunc('month', b.bill_date) = gs.month
			AND b.user_id = $2 AND b.status != 'cancelled'
		GROUP BY gs.month
		ORDER BY gs.month ASC
	`, months, userID).Scan(&results).Error
	return results, err
}

type AgingBuckets struct {
	Days0to30  float64 `json:"days_0_30"`
	Days31to60 float64 `json:"days_31_60"`
	Days61to90 float64 `json:"days_61_90"`
	Days90plus float64 `json:"days_90_plus"`
}

func (r *BillRepository) GetOverdueAging(userID string) (*AgingBuckets, error) {
	var b AgingBuckets
	err := r.db.Raw(`
		SELECT
			COALESCE(SUM(CASE WHEN AGE(NOW(), due_date) <= INTERVAL '30 days' THEN total_amount - paid_amount ELSE 0 END), 0) as days_0_to_30,
			COALESCE(SUM(CASE WHEN AGE(NOW(), due_date) > INTERVAL '30 days' AND AGE(NOW(), due_date) <= INTERVAL '60 days' THEN total_amount - paid_amount ELSE 0 END), 0) as days_31_to_60,
			COALESCE(SUM(CASE WHEN AGE(NOW(), due_date) > INTERVAL '60 days' AND AGE(NOW(), due_date) <= INTERVAL '90 days' THEN total_amount - paid_amount ELSE 0 END), 0) as days_61_to_90,
			COALESCE(SUM(CASE WHEN AGE(NOW(), due_date) > INTERVAL '90 days' THEN total_amount - paid_amount ELSE 0 END), 0) as days_90_plus
		FROM bills
		WHERE user_id = ? AND status IN ('pending', 'overdue') AND due_date IS NOT NULL
	`, userID).Scan(&b).Error
	return &b, err
}

func (r *BillRepository) GetYesterdaySales(userID string) (float64, error) {
	var result struct{ Amount float64 }
	yesterday := time.Now().AddDate(0, 0, -1)
	start := time.Date(yesterday.Year(), yesterday.Month(), yesterday.Day(), 0, 0, 0, 0, yesterday.Location())
	end := start.Add(24*time.Hour - time.Second)
	r.db.Model(&models.Bill{}).
		Where("user_id = ? AND bill_date BETWEEN ? AND ? AND status != 'cancelled'", userID, start, end).
		Select("COALESCE(SUM(total_amount),0) as amount").Scan(&result)
	return result.Amount, nil
}

func (r *BillRepository) GetLastMonthSales(userID string) (float64, error) {
	var result struct{ Amount float64 }
	now := time.Now()
	firstOfLastMonth := time.Date(now.Year(), now.Month()-1, 1, 0, 0, 0, 0, now.Location())
	lastOfLastMonth := time.Date(now.Year(), now.Month(), 0, 23, 59, 59, 0, now.Location())
	r.db.Model(&models.Bill{}).
		Where("user_id = ? AND bill_date BETWEEN ? AND ? AND status != 'cancelled'", userID, firstOfLastMonth, lastOfLastMonth).
		Select("COALESCE(SUM(total_amount),0) as amount").Scan(&result)
	return result.Amount, nil
}

type SalesReport struct {
	Period      string  `json:"period"`
	TotalSales  float64 `json:"total_sales"`
	TotalBills  int64   `json:"total_bills"`
	TotalTax    float64 `json:"total_tax"`
}

func (r *BillRepository) GetSalesReport(userID string, from, to time.Time, groupBy string) ([]SalesReport, error) {
	var results []SalesReport
	var dateFormat string
	if groupBy == "month" {
		dateFormat = "YYYY-MM"
	} else {
		dateFormat = "YYYY-MM-DD"
	}

	err := r.db.Raw(`
		SELECT TO_CHAR(bill_date, ?) as period,
		       COALESCE(SUM(total_amount),0) as total_sales,
		       COUNT(*) as total_bills,
		       COALESCE(SUM(total_tax),0) as total_tax
		FROM bills
		WHERE user_id = ? AND bill_date BETWEEN ? AND ? AND status != 'cancelled'
		GROUP BY period
		ORDER BY period ASC
	`, dateFormat, userID, from, to).Scan(&results).Error
	return results, err
}

type GSTReport struct {
	GSTRate     float64 `json:"gst_rate"`
	HSNCode     string  `json:"hsn_code"`
	Taxable     float64 `json:"taxable"`
	CGSTAmount  float64 `json:"cgst_amount"`
	SGSTAmount  float64 `json:"sgst_amount"`
	IGSTAmount  float64 `json:"igst_amount"`
	TotalGST    float64 `json:"total_gst"`
}

func (r *BillRepository) GetGSTReport(userID string, from, to time.Time) ([]GSTReport, error) {
	var results []GSTReport
	err := r.db.Raw(`
		SELECT bi.gst_rate,
		       COALESCE(bi.hsn_code,'') as hsn_code,
		       SUM(bi.price * bi.quantity - bi.discount_amount) as taxable,
		       SUM(CASE WHEN b.is_interstate = false THEN bi.gst_amount / 2 ELSE 0 END) as cgst_amount,
		       SUM(CASE WHEN b.is_interstate = false THEN bi.gst_amount / 2 ELSE 0 END) as sgst_amount,
		       SUM(CASE WHEN b.is_interstate = true THEN bi.gst_amount ELSE 0 END) as igst_amount,
		       SUM(bi.gst_amount) as total_gst
		FROM bill_items bi
		JOIN bills b ON b.id = bi.bill_id
		WHERE b.user_id = ? AND b.bill_date BETWEEN ? AND ? AND b.status != 'cancelled'
		GROUP BY bi.gst_rate, bi.hsn_code
		ORDER BY bi.gst_rate
	`, userID, from, to).Scan(&results).Error
	return results, err
}

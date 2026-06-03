package services

import (
	"errors"
	"time"

	"github.com/billetra/backend/internal/models"
	"github.com/billetra/backend/internal/repository"
	"github.com/billetra/backend/internal/utils"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type BillService struct {
	billRepo     *repository.BillRepository
	productRepo  *repository.ProductRepository
	customerRepo *repository.CustomerRepository
}

func NewBillService(
	billRepo *repository.BillRepository,
	productRepo *repository.ProductRepository,
	customerRepo *repository.CustomerRepository,
) *BillService {
	return &BillService{
		billRepo:     billRepo,
		productRepo:  productRepo,
		customerRepo: customerRepo,
	}
}

type BillItemInput struct {
	ProductID     *string `json:"product_id"`
	Name          string  `json:"name" validate:"required"`
	HSNCode       string  `json:"hsn_code"`
	Quantity      float64 `json:"quantity" validate:"required,gt=0"`
	Unit          string  `json:"unit"`
	Price         float64 `json:"price" validate:"required,gte=0"`
	DiscountType  string  `json:"discount_type"`
	DiscountValue float64 `json:"discount_value"`
	GSTRate       float64 `json:"gst_rate"`
}

type CreateBillInput struct {
	CustomerID    *string        `json:"customer_id"`
	AccountID     *string        `json:"account_id"`
	BillDate      string         `json:"bill_date" validate:"required"`
	DueDate       *string        `json:"due_date"`
	BillSize      string         `json:"bill_size"`
	Template      string         `json:"template"`
	DiscountType  string         `json:"discount_type"`
	DiscountValue float64        `json:"discount_value"`
	Notes         string         `json:"notes"`
	IsInterstate  bool           `json:"is_interstate"`
	Items         []BillItemInput `json:"items" validate:"required,min=1,dive"`
}

func (s *BillService) Create(userID string, input CreateBillInput) (*models.Bill, error) {
	db := s.billRepo.GetDB()

	var bill *models.Bill
	var createErr error

	txErr := db.Transaction(func(tx *gorm.DB) error {
		// Increment invoice counter atomically
		counter, prefix, err := s.billRepo.IncrementInvoiceCounter(tx, userID)
		if err != nil {
			return errors.New("could not generate invoice number")
		}

		invoiceNumber := utils.GenerateInvoiceNumber(prefix, counter)

		billDate, err := time.Parse("2006-01-02", input.BillDate)
		if err != nil {
			return errors.New("invalid bill_date format, use YYYY-MM-DD")
		}

		var dueDate *time.Time
		if input.DueDate != nil && *input.DueDate != "" {
			d, err := time.Parse("2006-01-02", *input.DueDate)
			if err != nil {
				return errors.New("invalid due_date format")
			}
			dueDate = &d
		}

		userUUID, _ := uuid.Parse(userID)

		b := &models.Bill{
			UserID:        userUUID,
			InvoiceNumber: invoiceNumber,
			BillDate:      billDate,
			DueDate:       dueDate,
			Status:        "pending",
			Notes:         input.Notes,
			IsInterstate:  input.IsInterstate,
			DiscountType:  input.DiscountType,
			DiscountValue: input.DiscountValue,
		}

		if input.BillSize != "" {
			b.BillSize = input.BillSize
		} else {
			b.BillSize = "a4_portrait"
		}
		if input.Template != "" {
			b.Template = input.Template
		} else {
			b.Template = "modern"
		}

		if input.CustomerID != nil && *input.CustomerID != "" {
			cid, err := uuid.Parse(*input.CustomerID)
			if err != nil {
				return errors.New("invalid customer_id")
			}
			b.CustomerID = &cid
		}
		if input.AccountID != nil && *input.AccountID != "" {
			aid, err := uuid.Parse(*input.AccountID)
			if err != nil {
				return errors.New("invalid account_id")
			}
			b.AccountID = &aid
		}

		// Calculate items
		var items []models.BillItem
		var subtotal, totalTaxableAmount, totalTax float64

		for _, itemInput := range input.Items {
			item := models.BillItem{
				BillID:        b.ID,
				Name:          itemInput.Name,
				HSNCode:       itemInput.HSNCode,
				Quantity:      itemInput.Quantity,
				Unit:          itemInput.Unit,
				Price:         itemInput.Price,
				DiscountType:  itemInput.DiscountType,
				DiscountValue: itemInput.DiscountValue,
				GSTRate:       itemInput.GSTRate,
			}

			if itemInput.ProductID != nil && *itemInput.ProductID != "" {
				pid, err := uuid.Parse(*itemInput.ProductID)
				if err != nil {
					return errors.New("invalid product_id in item")
				}
				item.ProductID = &pid
			}

			lineSubtotal := item.Price * item.Quantity
			var discountAmt float64
			if item.DiscountType == "percent" {
				discountAmt = lineSubtotal * item.DiscountValue / 100
			} else {
				discountAmt = item.DiscountValue
			}
			item.DiscountAmount = discountAmt

			taxable := lineSubtotal - discountAmt
			gstAmt := taxable * item.GSTRate / 100
			item.GSTAmount = gstAmt
			item.Total = taxable + gstAmt

			subtotal += lineSubtotal
			totalTaxableAmount += taxable
			totalTax += gstAmt

			items = append(items, item)
		}

		// Apply bill-level discount
		var billDiscountAmt float64
		if input.DiscountType == "percent" {
			billDiscountAmt = subtotal * input.DiscountValue / 100
		} else {
			billDiscountAmt = input.DiscountValue
		}

		// Adjust taxable amount for bill-level discount
		finalTaxable := totalTaxableAmount - billDiscountAmt
		if finalTaxable < 0 {
			finalTaxable = 0
		}

		b.Subtotal = subtotal
		b.DiscountAmount = billDiscountAmt
		b.TaxableAmount = finalTaxable
		b.TotalTax = totalTax
		b.TotalAmount = finalTaxable + totalTax

		if input.IsInterstate {
			b.IGSTAmount = totalTax
			b.CGSTAmount = 0
			b.SGSTAmount = 0
		} else {
			b.CGSTAmount = totalTax / 2
			b.SGSTAmount = totalTax / 2
			b.IGSTAmount = 0
		}

		if err := s.billRepo.Create(tx, b); err != nil {
			return err
		}

		// Assign bill ID to items
		for i := range items {
			items[i].BillID = b.ID
		}

		if err := s.billRepo.CreateItems(tx, items); err != nil {
			return err
		}

		// Deduct stock
		for _, item := range items {
			if item.ProductID != nil {
				if err := s.productRepo.DeductStock(tx, item.ProductID.String(), userID, item.Quantity); err != nil {
					return err
				}
			}
		}

		// Update customer outstanding balance
		if b.CustomerID != nil {
			if err := s.customerRepo.UpdateOutstandingBalance(tx, b.CustomerID.String(), b.TotalAmount); err != nil {
				return err
			}
		}

		bill = b
		return nil
	})

	if txErr != nil {
		createErr = txErr
	}

	return bill, createErr
}

func (s *BillService) Update(userID, billID string, input CreateBillInput) (*models.Bill, error) {
	db := s.billRepo.GetDB()

	existingBill, err := s.billRepo.FindByID(billID, userID)
	if err != nil {
		return nil, errors.New("bill not found")
	}
	if existingBill.IsLocked {
		return nil, errors.New("bill is locked and cannot be edited")
	}

	var updatedBill *models.Bill

	txErr := db.Transaction(func(tx *gorm.DB) error {
		// Restore stock for existing items
		for _, item := range existingBill.BillItems {
			if item.ProductID != nil {
				if err := s.productRepo.RestoreStock(tx, item.ProductID.String(), userID, item.Quantity); err != nil {
					return err
				}
			}
		}

		// Restore customer outstanding balance
		if existingBill.CustomerID != nil {
			if err := s.customerRepo.UpdateOutstandingBalance(tx, existingBill.CustomerID.String(), -existingBill.TotalAmount); err != nil {
				return err
			}
		}

		// Delete old items
		if err := s.billRepo.DeleteItems(tx, billID); err != nil {
			return err
		}

		billDate, err := time.Parse("2006-01-02", input.BillDate)
		if err != nil {
			return errors.New("invalid bill_date format")
		}

		var dueDate *time.Time
		if input.DueDate != nil && *input.DueDate != "" {
			d, err := time.Parse("2006-01-02", *input.DueDate)
			if err != nil {
				return errors.New("invalid due_date format")
			}
			dueDate = &d
		}

		existingBill.BillDate = billDate
		existingBill.DueDate = dueDate
		existingBill.Notes = input.Notes
		existingBill.IsInterstate = input.IsInterstate
		existingBill.DiscountType = input.DiscountType
		existingBill.DiscountValue = input.DiscountValue

		if input.BillSize != "" {
			existingBill.BillSize = input.BillSize
		}
		if input.Template != "" {
			existingBill.Template = input.Template
		}

		if input.CustomerID != nil && *input.CustomerID != "" {
			cid, _ := uuid.Parse(*input.CustomerID)
			existingBill.CustomerID = &cid
		} else {
			existingBill.CustomerID = nil
		}
		if input.AccountID != nil && *input.AccountID != "" {
			aid, _ := uuid.Parse(*input.AccountID)
			existingBill.AccountID = &aid
		} else {
			existingBill.AccountID = nil
		}

		var items []models.BillItem
		var subtotal, totalTaxable, totalTax float64

		for _, itemInput := range input.Items {
			item := models.BillItem{
				BillID:        existingBill.ID,
				Name:          itemInput.Name,
				HSNCode:       itemInput.HSNCode,
				Quantity:      itemInput.Quantity,
				Unit:          itemInput.Unit,
				Price:         itemInput.Price,
				DiscountType:  itemInput.DiscountType,
				DiscountValue: itemInput.DiscountValue,
				GSTRate:       itemInput.GSTRate,
			}
			if itemInput.ProductID != nil && *itemInput.ProductID != "" {
				pid, _ := uuid.Parse(*itemInput.ProductID)
				item.ProductID = &pid
			}

			lineSubtotal := item.Price * item.Quantity
			var discountAmt float64
			if item.DiscountType == "percent" {
				discountAmt = lineSubtotal * item.DiscountValue / 100
			} else {
				discountAmt = item.DiscountValue
			}
			item.DiscountAmount = discountAmt
			taxable := lineSubtotal - discountAmt
			gstAmt := taxable * item.GSTRate / 100
			item.GSTAmount = gstAmt
			item.Total = taxable + gstAmt

			subtotal += lineSubtotal
			totalTaxable += taxable
			totalTax += gstAmt
			items = append(items, item)
		}

		var billDiscountAmt float64
		if input.DiscountType == "percent" {
			billDiscountAmt = subtotal * input.DiscountValue / 100
		} else {
			billDiscountAmt = input.DiscountValue
		}
		finalTaxable := totalTaxable - billDiscountAmt
		if finalTaxable < 0 {
			finalTaxable = 0
		}

		existingBill.Subtotal = subtotal
		existingBill.DiscountAmount = billDiscountAmt
		existingBill.TaxableAmount = finalTaxable
		existingBill.TotalTax = totalTax
		existingBill.TotalAmount = finalTaxable + totalTax

		if input.IsInterstate {
			existingBill.IGSTAmount = totalTax
			existingBill.CGSTAmount = 0
			existingBill.SGSTAmount = 0
		} else {
			existingBill.CGSTAmount = totalTax / 2
			existingBill.SGSTAmount = totalTax / 2
			existingBill.IGSTAmount = 0
		}

		if err := s.billRepo.Update(tx, existingBill); err != nil {
			return err
		}

		if err := s.billRepo.CreateItems(tx, items); err != nil {
			return err
		}

		for _, item := range items {
			if item.ProductID != nil {
				if err := s.productRepo.DeductStock(tx, item.ProductID.String(), userID, item.Quantity); err != nil {
					return err
				}
			}
		}

		if existingBill.CustomerID != nil {
			if err := s.customerRepo.UpdateOutstandingBalance(tx, existingBill.CustomerID.String(), existingBill.TotalAmount); err != nil {
				return err
			}
		}

		updatedBill = existingBill
		return nil
	})

	return updatedBill, txErr
}

func (s *BillService) Delete(userID, billID string) error {
	db := s.billRepo.GetDB()

	bill, err := s.billRepo.FindByID(billID, userID)
	if err != nil {
		return errors.New("bill not found")
	}

	return db.Transaction(func(tx *gorm.DB) error {
		// Restore stock
		for _, item := range bill.BillItems {
			if item.ProductID != nil {
				if err := s.productRepo.RestoreStock(tx, item.ProductID.String(), userID, item.Quantity); err != nil {
					return err
				}
			}
		}

		// Restore customer balance
		if bill.CustomerID != nil {
			if err := s.customerRepo.UpdateOutstandingBalance(tx, bill.CustomerID.String(), -bill.TotalAmount); err != nil {
				return err
			}
		}

		return s.billRepo.Delete(billID, userID)
	})
}

func (s *BillService) MarkPaid(userID, billID string, paidAmount float64) (*models.Bill, error) {
	bill, err := s.billRepo.FindByID(billID, userID)
	if err != nil {
		return nil, errors.New("bill not found")
	}

	bill.PaidAmount = paidAmount
	if paidAmount >= bill.TotalAmount {
		bill.Status = "paid"
	} else if paidAmount > 0 {
		bill.Status = "partial"
	} else {
		bill.Status = "pending"
	}

	// Update customer outstanding
	db := s.billRepo.GetDB()
	db.Transaction(func(tx *gorm.DB) error {
		if bill.CustomerID != nil {
			// Recalculate: reduce outstanding by paid amount diff
			s.customerRepo.UpdateOutstandingBalance(tx, bill.CustomerID.String(), -paidAmount)
		}
		return s.billRepo.Update(tx, bill)
	})

	return bill, nil
}

func (s *BillService) Duplicate(userID, billID string) (*models.Bill, error) {
	original, err := s.billRepo.FindByID(billID, userID)
	if err != nil {
		return nil, errors.New("bill not found")
	}

	// Build input from original
	input := CreateBillInput{
		BillDate:      time.Now().Format("2006-01-02"),
		BillSize:      original.BillSize,
		Template:      original.Template,
		DiscountType:  original.DiscountType,
		DiscountValue: original.DiscountValue,
		Notes:         original.Notes,
		IsInterstate:  original.IsInterstate,
	}
	if original.CustomerID != nil {
		s := original.CustomerID.String()
		input.CustomerID = &s
	}
	if original.AccountID != nil {
		s := original.AccountID.String()
		input.AccountID = &s
	}

	for _, item := range original.BillItems {
		ii := BillItemInput{
			Name:          item.Name,
			HSNCode:       item.HSNCode,
			Quantity:      item.Quantity,
			Unit:          item.Unit,
			Price:         item.Price,
			DiscountType:  item.DiscountType,
			DiscountValue: item.DiscountValue,
			GSTRate:       item.GSTRate,
		}
		if item.ProductID != nil {
			ps := item.ProductID.String()
			ii.ProductID = &ps
		}
		input.Items = append(input.Items, ii)
	}

	return s.Create(userID, input)
}

// BuildPreview computes a bill (with totals) from input WITHOUT persisting it.
// Used to render a live PDF preview before the bill is saved.
func (s *BillService) BuildPreview(userID string, input CreateBillInput) (*models.Bill, error) {
	billDate := time.Now()
	if input.BillDate != "" {
		if d, err := time.Parse("2006-01-02", input.BillDate); err == nil {
			billDate = d
		}
	}
	var dueDate *time.Time
	if input.DueDate != nil && *input.DueDate != "" {
		if d, err := time.Parse("2006-01-02", *input.DueDate); err == nil {
			dueDate = &d
		}
	}

	b := &models.Bill{
		InvoiceNumber: "PREVIEW",
		BillDate:      billDate,
		DueDate:       dueDate,
		Status:        "pending",
		Notes:         input.Notes,
		IsInterstate:  input.IsInterstate,
		DiscountType:  input.DiscountType,
		DiscountValue: input.DiscountValue,
		Template:      input.Template,
		BillSize:      input.BillSize,
	}

	var items []models.BillItem
	var subtotal, totalTaxable, totalTax float64
	for _, in := range input.Items {
		item := models.BillItem{
			Name: in.Name, HSNCode: in.HSNCode, Quantity: in.Quantity, Unit: in.Unit,
			Price: in.Price, DiscountType: in.DiscountType, DiscountValue: in.DiscountValue, GSTRate: in.GSTRate,
		}
		line := item.Price * item.Quantity
		var disc float64
		if item.DiscountType == "percent" {
			disc = line * item.DiscountValue / 100
		} else {
			disc = item.DiscountValue
		}
		item.DiscountAmount = disc
		taxable := line - disc
		item.GSTAmount = taxable * item.GSTRate / 100
		item.Total = taxable + item.GSTAmount
		subtotal += line
		totalTaxable += taxable
		totalTax += item.GSTAmount
		items = append(items, item)
	}

	var billDisc float64
	if input.DiscountType == "percent" {
		billDisc = subtotal * input.DiscountValue / 100
	} else {
		billDisc = input.DiscountValue
	}
	finalTaxable := totalTaxable - billDisc
	if finalTaxable < 0 {
		finalTaxable = 0
	}
	b.BillItems = items
	b.Subtotal = subtotal
	b.DiscountAmount = billDisc
	b.TaxableAmount = finalTaxable
	b.TotalTax = totalTax
	b.TotalAmount = finalTaxable + totalTax
	if input.IsInterstate {
		b.IGSTAmount = totalTax
	} else {
		b.CGSTAmount = totalTax / 2
		b.SGSTAmount = totalTax / 2
	}

	if input.CustomerID != nil && *input.CustomerID != "" {
		if cust, err := s.customerRepo.FindByID(*input.CustomerID, userID); err == nil {
			b.Customer = cust
		}
	}
	return b, nil
}

// Cancel voids a bill: restores stock and customer balance, marks it cancelled.
func (s *BillService) Cancel(userID, billID string) (*models.Bill, error) {
	bill, err := s.billRepo.FindByID(billID, userID)
	if err != nil {
		return nil, errors.New("bill not found")
	}
	if bill.Status == "cancelled" {
		return bill, nil
	}

	db := s.billRepo.GetDB()
	txErr := db.Transaction(func(tx *gorm.DB) error {
		for _, item := range bill.BillItems {
			if item.ProductID != nil {
				if err := s.productRepo.RestoreStock(tx, item.ProductID.String(), userID, item.Quantity); err != nil {
					return err
				}
			}
		}
		if bill.CustomerID != nil {
			remaining := bill.TotalAmount - bill.PaidAmount
			if remaining != 0 {
				if err := s.customerRepo.UpdateOutstandingBalance(tx, bill.CustomerID.String(), -remaining); err != nil {
					return err
				}
			}
		}
		bill.Status = "cancelled"
		return s.billRepo.Update(tx, bill)
	})
	if txErr != nil {
		return nil, txErr
	}
	return bill, nil
}

package models

import (
	"time"

	"github.com/google/uuid"
)

type Bill struct {
	ID             uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID         uuid.UUID  `gorm:"type:uuid;not null;index" json:"user_id"`
	InvoiceNumber  string     `gorm:"not null" json:"invoice_number"`
	CustomerID     *uuid.UUID `gorm:"type:uuid" json:"customer_id"`
	AccountID      *uuid.UUID `gorm:"type:uuid" json:"account_id"`
	BillDate       time.Time  `gorm:"type:date;not null" json:"bill_date"`
	DueDate        *time.Time `gorm:"type:date" json:"due_date"`
	Status         string     `gorm:"default:'pending';index" json:"status"` // pending, paid, partial, cancelled
	BillSize       string     `gorm:"default:'a4_portrait'" json:"bill_size"`
	Template       string     `gorm:"default:'modern'" json:"template"`
	Subtotal       float64    `gorm:"type:decimal(12,2);default:0" json:"subtotal"`
	DiscountType   string     `gorm:"default:'fixed'" json:"discount_type"`
	DiscountValue  float64    `gorm:"type:decimal(12,2);default:0" json:"discount_value"`
	DiscountAmount float64    `gorm:"type:decimal(12,2);default:0" json:"discount_amount"`
	TaxableAmount  float64    `gorm:"type:decimal(12,2);default:0" json:"taxable_amount"`
	CGSTAmount     float64    `gorm:"type:decimal(12,2);default:0" json:"cgst_amount"`
	SGSTAmount     float64    `gorm:"type:decimal(12,2);default:0" json:"sgst_amount"`
	IGSTAmount     float64    `gorm:"type:decimal(12,2);default:0" json:"igst_amount"`
	TotalTax       float64    `gorm:"type:decimal(12,2);default:0" json:"total_tax"`
	TotalAmount    float64    `gorm:"type:decimal(12,2);default:0" json:"total_amount"`
	PaidAmount     float64    `gorm:"type:decimal(12,2);default:0" json:"paid_amount"`
	Notes          string     `json:"notes"`
	IsInterstate   bool       `gorm:"default:false" json:"is_interstate"`
	PDFURL         string     `json:"pdf_url"`
	IsLocked       bool       `gorm:"default:false" json:"is_locked"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`

	Customer  *Customer  `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`
	Account   *Account   `gorm:"foreignKey:AccountID" json:"account,omitempty"`
	BillItems []BillItem `gorm:"foreignKey:BillID" json:"bill_items,omitempty"`
}

type BillItem struct {
	ID             uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	BillID         uuid.UUID  `gorm:"type:uuid;not null;index" json:"bill_id"`
	ProductID      *uuid.UUID `gorm:"type:uuid" json:"product_id"`
	Name           string     `gorm:"not null" json:"name"`
	HSNCode        string     `json:"hsn_code"`
	Quantity       float64    `gorm:"type:decimal(12,3);not null" json:"quantity"`
	Unit           string     `json:"unit"`
	Price          float64    `gorm:"type:decimal(12,2);not null" json:"price"`
	DiscountType   string     `gorm:"default:'fixed'" json:"discount_type"`
	DiscountValue  float64    `gorm:"type:decimal(12,2);default:0" json:"discount_value"`
	DiscountAmount float64    `gorm:"type:decimal(12,2);default:0" json:"discount_amount"`
	GSTRate        float64    `gorm:"type:decimal(5,2);default:0" json:"gst_rate"`
	GSTAmount      float64    `gorm:"type:decimal(12,2);default:0" json:"gst_amount"`
	Total          float64    `gorm:"type:decimal(12,2);not null" json:"total"`
	CreatedAt      time.Time  `json:"created_at"`
}

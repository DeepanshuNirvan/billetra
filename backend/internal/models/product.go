package models

import (
	"time"

	"github.com/google/uuid"
)

type Product struct {
	ID            uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID        uuid.UUID  `gorm:"type:uuid;not null;index" json:"user_id"`
	CategoryID    *uuid.UUID `gorm:"type:uuid" json:"category_id"`
	Name          string     `gorm:"not null;index" json:"name"`
	SKU           string     `json:"sku"`
	Description   string     `json:"description"`
	HSNCode       string     `json:"hsn_code"`
	UnitType      string     `gorm:"default:'piece'" json:"unit_type"`
	CustomUnit    string     `json:"custom_unit"`
	SizeVariant   string     `json:"size_variant"`
	SellingPrice  float64    `gorm:"type:decimal(12,2);not null;default:0" json:"selling_price"`
	PurchasePrice float64    `gorm:"type:decimal(12,2);default:0" json:"purchase_price"`
	GSTRate       float64    `gorm:"type:decimal(5,2);default:0" json:"gst_rate"`
	StockQuantity float64    `gorm:"type:decimal(12,3);default:0" json:"stock_quantity"`
	LowStockAlert float64    `gorm:"type:decimal(12,3);default:10" json:"low_stock_alert"`
	IsActive      bool       `gorm:"default:true" json:"is_active"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`

	Category *Category `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
}

package models

import (
	"time"

	"github.com/google/uuid"
)

type Customer struct {
	ID                 uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID             uuid.UUID `gorm:"type:uuid;not null;index" json:"user_id"`
	Name               string    `gorm:"not null" json:"name"`
	Phone              string    `json:"phone"`
	Email              string    `json:"email"`
	GSTIN              string    `json:"gstin"`
	PAN                string    `json:"pan"`
	BillingAddress     string    `json:"billing_address"`
	ShippingAddress    string    `json:"shipping_address"`
	State              string    `json:"state"`
	CreditLimit        float64   `gorm:"type:decimal(12,2);default:0" json:"credit_limit"`
	PaymentTerms       string    `json:"payment_terms"`
	OutstandingBalance float64   `gorm:"type:decimal(12,2);default:0" json:"outstanding_balance"`
	IsActive           bool      `gorm:"default:true" json:"is_active"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

package models

import (
	"time"

	"github.com/google/uuid"
)

type Account struct {
	ID            uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID        uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	Name          string    `gorm:"not null" json:"name"`
	AccountType   string    `gorm:"not null" json:"account_type"` // bank, cash, upi
	AccountNumber string    `json:"account_number"`
	IFSC          string    `json:"ifsc"`
	UPIID         string    `json:"upi_id"`
	Branch        string    `json:"branch"`
	IsDefault     bool      `gorm:"default:false" json:"is_default"`
	Balance       float64   `gorm:"type:decimal(12,2);default:0" json:"balance"`
	IsActive      bool      `gorm:"default:true" json:"is_active"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

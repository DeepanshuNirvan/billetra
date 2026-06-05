package models

import (
	"time"

	"github.com/google/uuid"
)

type Business struct {
	ID              uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID          uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	Name            string    `gorm:"not null" json:"name"`
	GSTIN           string    `json:"gstin"`
	PAN             string    `json:"pan"`
	Phone           string    `json:"phone"`
	Email           string    `json:"email"`
	Address         string    `json:"address"`
	City            string    `json:"city"`
	State           string    `json:"state"`
	Pincode         string    `json:"pincode"`
	LogoURL         string    `json:"logo_url"`
	DefaultTemplate string    `gorm:"default:'modern'" json:"default_template"`
	DefaultBillSize string    `gorm:"default:'a4_portrait'" json:"default_bill_size"`
	InvoicePrefix   string    `gorm:"default:'INV'" json:"invoice_prefix"`
	InvoiceCounter  int       `gorm:"default:1" json:"invoice_counter"`
	ShowLogoOnBills bool      `gorm:"default:true" json:"show_logo_on_bills"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

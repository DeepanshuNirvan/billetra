package models

import (
	"time"

	"github.com/google/uuid"
)

const (
	RoleSuperAdmin = "super_admin"
	RoleUser       = "user"
)

type User struct {
	ID           uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Email        string     `gorm:"uniqueIndex;not null" json:"email"`
	PasswordHash string     `gorm:"not null" json:"-"`
	Name         string     `gorm:"not null" json:"name"`
	Phone        string     `json:"phone"`
	Role         string     `gorm:"not null;default:'user'" json:"role"`
	IsActive     bool       `gorm:"default:true" json:"is_active"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`

	Business *Business `gorm:"foreignKey:UserID" json:"business,omitempty"`
}

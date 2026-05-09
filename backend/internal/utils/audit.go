package utils

import (
	"encoding/json"
	"log"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AuditLog struct {
	ID         uuid.UUID       `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID     uuid.UUID       `gorm:"type:uuid;not null" json:"user_id"`
	EntityType string          `gorm:"not null" json:"entity_type"`
	EntityID   uuid.UUID       `gorm:"type:uuid;not null" json:"entity_id"`
	Action     string          `gorm:"not null" json:"action"`
	OldData    json.RawMessage `gorm:"type:jsonb" json:"old_data,omitempty"`
	NewData    json.RawMessage `gorm:"type:jsonb" json:"new_data,omitempty"`
	IPAddress  string          `json:"ip_address,omitempty"`
	CreatedAt  time.Time       `json:"created_at"`
}

func (AuditLog) TableName() string { return "audit_logs" }

func LogAudit(db *gorm.DB, userID, entityType, entityID, action, ip string, oldData, newData interface{}) {
	go func() {
		uid, err := uuid.Parse(userID)
		if err != nil {
			return
		}
		eid, err := uuid.Parse(entityID)
		if err != nil {
			return
		}
		var oldJSON, newJSON json.RawMessage
		if oldData != nil {
			oldJSON, _ = json.Marshal(oldData)
		}
		if newData != nil {
			newJSON, _ = json.Marshal(newData)
		}
		entry := AuditLog{
			UserID:     uid,
			EntityType: entityType,
			EntityID:   eid,
			Action:     action,
			OldData:    oldJSON,
			NewData:    newJSON,
			IPAddress:  ip,
		}
		if err := db.Create(&entry).Error; err != nil {
			log.Printf("audit log error: %v", err)
		}
	}()
}

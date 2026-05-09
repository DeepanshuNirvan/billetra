package handlers

import (
	"log"

	"github.com/billetra/backend/internal/utils"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type AuditHandler struct {
	db *gorm.DB
}

func NewAuditHandler(db *gorm.DB) *AuditHandler {
	return &AuditHandler{db: db}
}

func (h *AuditHandler) List(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	entityType := c.Query("entity_type")
	entityID := c.Query("entity_id")
	p := utils.ParsePagination(c)

	var logs []utils.AuditLog
	var total int64

	q := h.db.Model(&utils.AuditLog{}).Where("user_id = ?", userID)
	if entityType != "" {
		q = q.Where("entity_type = ?", entityType)
	}
	if entityID != "" {
		q = q.Where("entity_id = ?", entityID)
	}
	q.Count(&total)
	err := q.Order("created_at desc").Offset(p.Offset).Limit(p.Limit).Find(&logs).Error
	if err != nil {
		log.Printf("audit list error: %v", err)
		return utils.InternalError(c, "failed to fetch audit logs")
	}
	return utils.OKPaginated(c, logs, total, p.Page, p.Limit)
}

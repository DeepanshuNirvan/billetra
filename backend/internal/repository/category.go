package repository

import (
	"github.com/billetra/backend/internal/models"
	"gorm.io/gorm"
)

type CategoryRepository struct {
	db *gorm.DB
}

func NewCategoryRepository(db *gorm.DB) *CategoryRepository {
	return &CategoryRepository{db: db}
}

func (r *CategoryRepository) ListByUser(userID string) ([]models.Category, error) {
	var categories []models.Category
	err := r.db.Where("user_id = ?", userID).Order("name asc").Find(&categories).Error
	return categories, err
}

func (r *CategoryRepository) Create(cat *models.Category) error {
	return r.db.Create(cat).Error
}

func (r *CategoryRepository) FindByID(id, userID string) (*models.Category, error) {
	var cat models.Category
	err := r.db.Where("id = ? AND user_id = ?", id, userID).First(&cat).Error
	if err != nil {
		return nil, err
	}
	return &cat, nil
}

func (r *CategoryRepository) Delete(id, userID string) error {
	return r.db.Where("id = ? AND user_id = ?", id, userID).Delete(&models.Category{}).Error
}

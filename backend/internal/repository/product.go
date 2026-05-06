package repository

import (
	"github.com/billetra/backend/internal/models"
	"gorm.io/gorm"
)

type ProductRepository struct {
	db *gorm.DB
}

func NewProductRepository(db *gorm.DB) *ProductRepository {
	return &ProductRepository{db: db}
}

func (r *ProductRepository) List(userID, search, category string, page, limit int) ([]models.Product, int64, error) {
	var products []models.Product
	var total int64

	q := r.db.Model(&models.Product{}).Where("user_id = ?", userID)
	if search != "" {
		q = q.Where("name ILIKE ? OR sku ILIKE ?", "%"+search+"%", "%"+search+"%")
	}
	if category != "" {
		q = q.Where("category_id = ?", category)
	}

	q.Count(&total)
	offset := (page - 1) * limit
	err := q.Preload("Category").Order("created_at desc").Offset(offset).Limit(limit).Find(&products).Error
	return products, total, err
}

func (r *ProductRepository) Create(p *models.Product) error {
	return r.db.Create(p).Error
}

func (r *ProductRepository) FindByID(id, userID string) (*models.Product, error) {
	var p models.Product
	err := r.db.Preload("Category").Where("id = ? AND user_id = ?", id, userID).First(&p).Error
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *ProductRepository) Update(p *models.Product) error {
	return r.db.Save(p).Error
}

func (r *ProductRepository) Delete(id, userID string) error {
	return r.db.Where("id = ? AND user_id = ?", id, userID).Delete(&models.Product{}).Error
}

func (r *ProductRepository) DeductStock(tx *gorm.DB, productID string, userID string, qty float64) error {
	return tx.Model(&models.Product{}).
		Where("id = ? AND user_id = ?", productID, userID).
		UpdateColumn("stock_quantity", gorm.Expr("stock_quantity - ?", qty)).Error
}

func (r *ProductRepository) RestoreStock(tx *gorm.DB, productID string, userID string, qty float64) error {
	return tx.Model(&models.Product{}).
		Where("id = ? AND user_id = ?", productID, userID).
		UpdateColumn("stock_quantity", gorm.Expr("stock_quantity + ?", qty)).Error
}

func (r *ProductRepository) GetLowStock(userID string) ([]models.Product, error) {
	var products []models.Product
	err := r.db.Where("user_id = ? AND stock_quantity <= low_stock_alert AND is_active = true", userID).
		Find(&products).Error
	return products, err
}

func (r *ProductRepository) BulkCreate(products []models.Product) error {
	return r.db.CreateInBatches(products, 100).Error
}

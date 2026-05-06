package repository

import (
	"github.com/billetra/backend/internal/models"
	"gorm.io/gorm"
)

type CustomerRepository struct {
	db *gorm.DB
}

func NewCustomerRepository(db *gorm.DB) *CustomerRepository {
	return &CustomerRepository{db: db}
}

func (r *CustomerRepository) List(userID, search string, page, limit int) ([]models.Customer, int64, error) {
	var customers []models.Customer
	var total int64

	q := r.db.Model(&models.Customer{}).Where("user_id = ?", userID)
	if search != "" {
		q = q.Where("name ILIKE ? OR phone ILIKE ? OR email ILIKE ?",
			"%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	q.Count(&total)
	offset := (page - 1) * limit
	err := q.Order("name asc").Offset(offset).Limit(limit).Find(&customers).Error
	return customers, total, err
}

func (r *CustomerRepository) Create(c *models.Customer) error {
	return r.db.Create(c).Error
}

func (r *CustomerRepository) FindByID(id, userID string) (*models.Customer, error) {
	var c models.Customer
	err := r.db.Where("id = ? AND user_id = ?", id, userID).First(&c).Error
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *CustomerRepository) Update(c *models.Customer) error {
	return r.db.Save(c).Error
}

func (r *CustomerRepository) Delete(id, userID string) error {
	return r.db.Where("id = ? AND user_id = ?", id, userID).Delete(&models.Customer{}).Error
}

func (r *CustomerRepository) UpdateOutstandingBalance(tx *gorm.DB, customerID string, amount float64) error {
	return tx.Model(&models.Customer{}).
		Where("id = ?", customerID).
		UpdateColumn("outstanding_balance", gorm.Expr("outstanding_balance + ?", amount)).Error
}

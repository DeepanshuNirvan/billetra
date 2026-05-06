package repository

import (
	"github.com/billetra/backend/internal/models"
	"gorm.io/gorm"
)

type AccountRepository struct {
	db *gorm.DB
}

func NewAccountRepository(db *gorm.DB) *AccountRepository {
	return &AccountRepository{db: db}
}

func (r *AccountRepository) ListByUser(userID string) ([]models.Account, error) {
	var accounts []models.Account
	err := r.db.Where("user_id = ?", userID).Order("is_default desc, name asc").Find(&accounts).Error
	return accounts, err
}

func (r *AccountRepository) Create(a *models.Account) error {
	return r.db.Create(a).Error
}

func (r *AccountRepository) FindByID(id, userID string) (*models.Account, error) {
	var a models.Account
	err := r.db.Where("id = ? AND user_id = ?", id, userID).First(&a).Error
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *AccountRepository) Update(a *models.Account) error {
	return r.db.Save(a).Error
}

func (r *AccountRepository) Delete(id, userID string) error {
	return r.db.Where("id = ? AND user_id = ?", id, userID).Delete(&models.Account{}).Error
}

func (r *AccountRepository) ClearDefault(userID string) error {
	return r.db.Model(&models.Account{}).
		Where("user_id = ?", userID).
		Update("is_default", false).Error
}

func (r *AccountRepository) SetDefault(id, userID string) error {
	return r.db.Model(&models.Account{}).
		Where("id = ? AND user_id = ?", id, userID).
		Update("is_default", true).Error
}

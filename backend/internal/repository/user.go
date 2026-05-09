package repository

import (
	"github.com/billetra/backend/internal/models"
	"gorm.io/gorm"
)

type UserRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) Create(user *models.User) error {
	return r.db.Create(user).Error
}

func (r *UserRepository) FindByEmail(email string) (*models.User, error) {
	var user models.User
	err := r.db.Where("email = ?", email).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) FindByID(id string) (*models.User, error) {
	var user models.User
	err := r.db.Where("id = ?", id).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) Update(user *models.User) error {
	return r.db.Save(user).Error
}

type UserListParams struct {
	Page   int
	Limit  int
	Search string
	Role   string
}

func (r *UserRepository) ListAll(params UserListParams) ([]models.User, int64, error) {
	var users []models.User
	var total int64
	q := r.db.Model(&models.User{})
	if params.Search != "" {
		q = q.Where("name ILIKE ? OR email ILIKE ?", "%"+params.Search+"%", "%"+params.Search+"%")
	}
	if params.Role != "" {
		q = q.Where("role = ?", params.Role)
	}
	q.Count(&total)
	offset := (params.Page - 1) * params.Limit
	if offset < 0 {
		offset = 0
	}
	err := q.Preload("Business").Order("created_at desc").Offset(offset).Limit(params.Limit).Find(&users).Error
	return users, total, err
}

func (r *UserRepository) UpdateFields(id string, updates map[string]interface{}) error {
	return r.db.Model(&models.User{}).Where("id = ?", id).Updates(updates).Error
}

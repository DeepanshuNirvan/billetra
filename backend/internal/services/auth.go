package services

import (
	"errors"
	"time"

	"github.com/billetra/backend/internal/config"
	"github.com/billetra/backend/internal/models"
	"github.com/billetra/backend/internal/repository"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	userRepo *repository.UserRepository
}

func NewAuthService(userRepo *repository.UserRepository) *AuthService {
	return &AuthService{userRepo: userRepo}
}

type RegisterInput struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
	Name     string `json:"name" validate:"required"`
	Phone    string `json:"phone"`
}

type LoginInput struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type CreateUserInput struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
	Name     string `json:"name" validate:"required"`
	Phone    string `json:"phone"`
	Role     string `json:"role"`
}

type AuthTokens struct {
	AccessToken string       `json:"access_token"`
	TokenType   string       `json:"token_type"`
	ExpiresIn   int          `json:"expires_in"`
	User        *models.User `json:"user"`
}

func (s *AuthService) Register(input RegisterInput) (*AuthTokens, error) {
	existing, _ := s.userRepo.FindByEmail(input.Email)
	if existing != nil {
		return nil, errors.New("email already registered")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &models.User{
		Email:        input.Email,
		PasswordHash: string(hash),
		Name:         input.Name,
		Phone:        input.Phone,
		Role:         models.RoleUser,
	}

	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}

	return s.generateTokens(user)
}

func (s *AuthService) Login(input LoginInput) (*AuthTokens, error) {
	user, err := s.userRepo.FindByEmail(input.Email)
	if err != nil {
		return nil, errors.New("invalid email or password")
	}

	if !user.IsActive {
		return nil, errors.New("account is deactivated")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)); err != nil {
		return nil, errors.New("invalid email or password")
	}

	return s.generateTokens(user)
}

func (s *AuthService) CreateUser(input CreateUserInput) (*models.User, error) {
	existing, _ := s.userRepo.FindByEmail(input.Email)
	if existing != nil {
		return nil, errors.New("email already registered")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}
	role := input.Role
	if role == "" {
		role = models.RoleUser
	}
	user := &models.User{
		Email:        input.Email,
		PasswordHash: string(hash),
		Name:         input.Name,
		Phone:        input.Phone,
		Role:         role,
	}
	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}
	return user, nil
}

func (s *AuthService) generateTokens(user *models.User) (*AuthTokens, error) {
	expiresIn := 24 * 60 * 60

	claims := jwt.MapClaims{
		"user_id": user.ID.String(),
		"email":   user.Email,
		"role":    user.Role,
		"exp":     time.Now().Add(24 * time.Hour).Unix(),
		"iat":     time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(config.AppConfig.JWTSecret))
	if err != nil {
		return nil, err
	}

	return &AuthTokens{
		AccessToken: signed,
		TokenType:   "Bearer",
		ExpiresIn:   expiresIn,
		User:        user,
	}, nil
}

func (s *AuthService) RefreshToken(userID string) (*AuthTokens, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return nil, errors.New("user not found")
	}
	return s.generateTokens(user)
}

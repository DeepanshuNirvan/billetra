package middleware

import (
	"strings"

	"github.com/billetra/backend/internal/config"
	"github.com/billetra/backend/internal/utils"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

func AuthRequired() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return utils.Unauthorized(c, "missing authorization header")
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			return utils.Unauthorized(c, "invalid authorization header format")
		}

		tokenStr := parts[1]
		token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fiber.ErrUnauthorized
			}
			return []byte(config.AppConfig.JWTSecret), nil
		})
		if err != nil || !token.Valid {
			return utils.Unauthorized(c, "invalid or expired token")
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			return utils.Unauthorized(c, "invalid token claims")
		}

		userID, ok := claims["user_id"].(string)
		if !ok || userID == "" {
			return utils.Unauthorized(c, "invalid token: missing user_id")
		}

		email, _ := claims["email"].(string)
		role, _ := claims["role"].(string)
		if role == "" {
			role = "user"
		}

		c.Locals("user_id", userID)
		c.Locals("email", email)
		c.Locals("role", role)

		return c.Next()
	}
}

// RequireRole returns middleware that allows only users with the given role.
func RequireRole(role string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userRole, _ := c.Locals("role").(string)
		if userRole != role {
			return utils.Forbidden(c, "insufficient permissions")
		}
		return c.Next()
	}
}

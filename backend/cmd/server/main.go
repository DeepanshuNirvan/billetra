package main

import (
	"log"

	"github.com/billetra/backend/internal/config"
	"github.com/billetra/backend/internal/database"
	"github.com/billetra/backend/internal/handlers"
	"github.com/billetra/backend/internal/middleware"
	"github.com/billetra/backend/internal/repository"
	"github.com/billetra/backend/internal/services"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}

	if err := database.RunMigrations(db); err != nil {
		log.Fatalf("failed to run migrations: %v", err)
	}

	// Repositories
	userRepo := repository.NewUserRepository(db)
	categoryRepo := repository.NewCategoryRepository(db)
	productRepo := repository.NewProductRepository(db)
	customerRepo := repository.NewCustomerRepository(db)
	accountRepo := repository.NewAccountRepository(db)
	billRepo := repository.NewBillRepository(db)

	// Services
	authService := services.NewAuthService(userRepo)
	billService := services.NewBillService(billRepo, productRepo, customerRepo)
	pdfService := services.NewPDFService()

	// Handlers
	authHandler := handlers.NewAuthHandler(authService)
	adminHandler := handlers.NewAdminHandler(userRepo, authService, productRepo, customerRepo, billRepo, accountRepo)
	auditHandler := handlers.NewAuditHandler(db)
	businessHandler := handlers.NewBusinessHandler(db)
	categoryHandler := handlers.NewCategoryHandler(categoryRepo)
	productHandler := handlers.NewProductHandler(productRepo, db)
	customerHandler := handlers.NewCustomerHandler(customerRepo, billRepo, db)
	accountHandler := handlers.NewAccountHandler(accountRepo)
	billHandler := handlers.NewBillHandler(billService, billRepo, pdfService, db)
	dashboardHandler := handlers.NewDashboardHandler(billRepo, productRepo)
	reportHandler := handlers.NewReportHandler(billRepo, productRepo)

	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{
				"success": false,
				"error":   err.Error(),
			})
		},
	})

	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(middleware.CORS())

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	api := app.Group("/api")

	// Auth (public)
	auth := api.Group("/auth")
	auth.Post("/signup", authHandler.Signup)
	auth.Post("/login", authHandler.Login)
	auth.Post("/refresh", middleware.AuthRequired(), authHandler.Refresh)

	// Protected
	protected := api.Group("", middleware.AuthRequired())

	// Business
	protected.Get("/business", businessHandler.Get)
	protected.Put("/business", businessHandler.Update)

	// Categories
	protected.Get("/categories", categoryHandler.List)
	protected.Post("/categories", categoryHandler.Create)
	protected.Delete("/categories/:id", categoryHandler.Delete)

	// Products — bulk-import must come before :id routes
	protected.Post("/products/bulk-import", productHandler.BulkImport)
	protected.Post("/products/bulk-upload", productHandler.BulkUpload)
	protected.Get("/products", productHandler.List)
	protected.Post("/products", productHandler.Create)
	protected.Get("/products/:id", productHandler.GetByID)
	protected.Put("/products/:id", productHandler.Update)
	protected.Delete("/products/:id", productHandler.Delete)

	// Customers
	protected.Post("/customers/bulk-import", customerHandler.BulkImport)
	protected.Get("/customers", customerHandler.List)
	protected.Post("/customers", customerHandler.Create)
	protected.Get("/customers/:id", customerHandler.GetByID)
	protected.Put("/customers/:id", customerHandler.Update)
	protected.Delete("/customers/:id", customerHandler.Delete)
	protected.Get("/customers/:id/statement", customerHandler.Statement)

	// Accounts
	protected.Get("/accounts", accountHandler.List)
	protected.Post("/accounts", accountHandler.Create)
	protected.Put("/accounts/:id", accountHandler.Update)
	protected.Delete("/accounts/:id", accountHandler.Delete)
	protected.Put("/accounts/:id/set-default", accountHandler.SetDefault)

	// Bills — static paths must precede /bills/:id
	protected.Get("/bills/templates", billHandler.Templates)
	protected.Get("/bills/template-sample", billHandler.TemplateSample)
	protected.Post("/bills/preview", billHandler.Preview)
	protected.Get("/bills", billHandler.List)
	protected.Post("/bills", billHandler.Create)
	protected.Get("/bills/:id", billHandler.GetByID)
	protected.Put("/bills/:id", billHandler.Update)
	protected.Delete("/bills/:id", billHandler.Delete)
	protected.Post("/bills/:id/duplicate", billHandler.Duplicate)
	protected.Post("/bills/:id/cancel", billHandler.Cancel)
	protected.Get("/bills/:id/pdf", billHandler.GetPDF)
	protected.Put("/bills/:id/mark-paid", billHandler.MarkPaid)

	// Dashboard
	protected.Get("/dashboard", dashboardHandler.Get)

	// Reports
	protected.Get("/reports/sales", reportHandler.Sales)
	protected.Get("/reports/gst", reportHandler.GST)
	protected.Get("/reports/inventory", reportHandler.Inventory)

	// Audit logs
	protected.Get("/audit-logs", auditHandler.List)

	// Admin — super_admin only
	admin := api.Group("/admin", middleware.AuthRequired(), middleware.RequireRole("super_admin"))
	admin.Get("/users", adminHandler.ListUsers)
	admin.Post("/users", adminHandler.CreateUser)
	admin.Get("/users/:id", adminHandler.GetUser)
	admin.Put("/users/:id", adminHandler.UpdateUser)
	admin.Get("/users/:id/products", adminHandler.GetUserProducts)
	admin.Get("/users/:id/customers", adminHandler.GetUserCustomers)
	admin.Get("/users/:id/bills", adminHandler.GetUserBills)
	admin.Get("/users/:id/bills/:billId", adminHandler.GetUserBillDetail)
	admin.Get("/users/:id/accounts", adminHandler.GetUserAccounts)
	admin.Get("/users/:id/stats", adminHandler.GetUserStats)
	admin.Get("/users/:id/business", adminHandler.GetUserBusiness)
	admin.Put("/users/:id/business", adminHandler.UpdateUserBusiness)
	admin.Get("/users/:id/reports/sales", adminHandler.GetUserSalesReport)
	admin.Get("/users/:id/reports/gst", adminHandler.GetUserGSTReport)
	admin.Get("/users/:id/reports/inventory", adminHandler.GetUserInventoryReport)

	log.Printf("Billetra backend starting on port %s", cfg.Port)
	if err := app.Listen(":" + cfg.Port); err != nil {
		log.Fatalf("server error: %v", err)
	}
}

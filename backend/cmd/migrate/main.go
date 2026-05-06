package main

import (
	"database/sql"
	"log"
	"os"

	"github.com/billetra/backend/internal/config"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config error: %v", err)
	}

	db, err := sql.Open("pgx", cfg.DBDSN)
	if err != nil {
		log.Fatalf("failed to open db: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("failed to ping db: %v", err)
	}

	goose.SetDialect("postgres")

	args := os.Args[1:]
	command := "up"
	if len(args) > 0 {
		command = args[0]
	}

	migrationsDir := "migrations"
	// When run from project root via make, migrations dir is at root level
	if _, err := os.Stat(migrationsDir); os.IsNotExist(err) {
		migrationsDir = "../../migrations"
	}

	if err := goose.Run(command, db, migrationsDir); err != nil {
		log.Fatalf("goose %s error: %v", command, err)
	}

	log.Printf("Migration '%s' completed successfully", command)
}

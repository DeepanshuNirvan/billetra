.PHONY: run migrate seed build test tidy

run:
	go run cmd/server/main.go

migrate:
	go run cmd/migrate/main.go up

seed:
	go run cmd/migrate/main.go up

build:
	go build -o bin/server cmd/server/main.go

test:
	go test ./...

tidy:
	go mod tidy

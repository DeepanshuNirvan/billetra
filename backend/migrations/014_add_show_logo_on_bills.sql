-- +goose Up
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS show_logo_on_bills BOOLEAN NOT NULL DEFAULT true;

-- +goose Down
ALTER TABLE businesses DROP COLUMN IF EXISTS show_logo_on_bills;

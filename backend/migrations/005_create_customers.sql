-- +goose Up
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    gstin VARCHAR(15),
    pan VARCHAR(10),
    billing_address TEXT,
    shipping_address TEXT,
    state VARCHAR(100),
    credit_limit DECIMAL(12,2) DEFAULT 0,
    payment_terms VARCHAR(100),
    outstanding_balance DECIMAL(12,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_customers_user_id ON customers(user_id);
-- +goose Down
DROP TABLE IF EXISTS customers;

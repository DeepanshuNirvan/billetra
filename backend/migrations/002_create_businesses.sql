-- +goose Up
CREATE TABLE businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    gstin VARCHAR(15),
    pan VARCHAR(10),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    logo_url TEXT,
    default_template VARCHAR(50) DEFAULT 'modern',
    default_bill_size VARCHAR(20) DEFAULT 'a4_portrait',
    invoice_prefix VARCHAR(20) DEFAULT 'INV',
    invoice_counter INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- +goose Down
DROP TABLE IF EXISTS businesses;

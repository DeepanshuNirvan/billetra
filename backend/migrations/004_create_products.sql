-- +goose Up
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    description TEXT,
    hsn_code VARCHAR(20),
    unit_type VARCHAR(50) DEFAULT 'piece',
    custom_unit VARCHAR(50),
    size_variant VARCHAR(100),
    selling_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    purchase_price DECIMAL(12,2) DEFAULT 0,
    gst_rate DECIMAL(5,2) DEFAULT 0,
    stock_quantity DECIMAL(12,3) DEFAULT 0,
    low_stock_alert DECIMAL(12,3) DEFAULT 10,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_products_name ON products(name);
-- +goose Down
DROP TABLE IF EXISTS products;

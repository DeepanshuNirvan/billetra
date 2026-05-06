-- +goose Up
CREATE TABLE bill_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    hsn_code VARCHAR(20),
    quantity DECIMAL(12,3) NOT NULL,
    unit VARCHAR(50),
    price DECIMAL(12,2) NOT NULL,
    discount_type VARCHAR(20) DEFAULT 'fixed',
    discount_value DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    gst_rate DECIMAL(5,2) DEFAULT 0,
    gst_amount DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_bill_items_bill_id ON bill_items(bill_id);
-- +goose Down
DROP TABLE IF EXISTS bill_items;

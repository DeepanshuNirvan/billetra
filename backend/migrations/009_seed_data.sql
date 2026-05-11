-- +goose Up
-- Seed a demo user (password: Demo@1234)
INSERT INTO users (id, email, password_hash, name, phone) VALUES
('00000000-0000-0000-0000-000000000001', 'demo@billetra.com', '$2a$10$nXU2NxWtzHpzr3ANIr3URuqsn8pWi6AFRU0tCWMMW3NxnOFjHHJMu', 'Demo Business', '9876543210');

INSERT INTO businesses (user_id, name, gstin, phone, email, address, city, state, pincode, invoice_prefix) VALUES
('00000000-0000-0000-0000-000000000001', 'Demo Traders', '29ABCDE1234F1Z5', '9876543210', 'demo@billetra.com', '123 Market Street', 'Bangalore', 'Karnataka', '560001', 'INV');

INSERT INTO categories (id, user_id, name) VALUES
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Electronics'),
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Stationery'),
('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'General');

INSERT INTO products (user_id, category_id, name, sku, hsn_code, unit_type, selling_price, purchase_price, gst_rate, stock_quantity, low_stock_alert) VALUES
('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'USB Cable Type-C', 'USB-TC-001', '8544', 'piece', 299.00, 150.00, 18.00, 100, 10),
('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Wireless Mouse', 'WM-002', '8471', 'piece', 799.00, 450.00, 18.00, 50, 5),
('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'A4 Paper Ream', 'PAPER-A4', '4802', 'box', 450.00, 350.00, 12.00, 200, 20),
('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'Pen Blue (Box)', 'PEN-BLU-12', '9608', 'box', 120.00, 70.00, 12.00, 500, 50);

INSERT INTO customers (user_id, name, phone, email, gstin, state, billing_address) VALUES
('00000000-0000-0000-0000-000000000001', 'Rahul Sharma', '9123456789', 'rahul@example.com', '29XYZAB1234C1Z1', 'Karnataka', '45 MG Road, Bangalore'),
('00000000-0000-0000-0000-000000000001', 'Priya Electronics', '9234567890', 'priya@elec.com', '07PQRST5678D2Z3', 'Delhi', '12 Nehru Place, New Delhi'),
('00000000-0000-0000-0000-000000000001', 'Mohan Stationery', '9345678901', NULL, NULL, 'Karnataka', '78 Brigade Road, Bangalore');

INSERT INTO accounts (user_id, name, account_type, account_number, ifsc, branch, is_default) VALUES
('00000000-0000-0000-0000-000000000001', 'HDFC Current Account', 'bank', '50200012345678', 'HDFC0001234', 'Bangalore Main', true),
('00000000-0000-0000-0000-000000000001', 'Cash', 'cash', NULL, NULL, NULL, false),
('00000000-0000-0000-0000-000000000001', 'GPay UPI', 'upi', NULL, NULL, NULL, false);

-- +goose Down
DELETE FROM accounts WHERE user_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM customers WHERE user_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM products WHERE user_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM categories WHERE user_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM businesses WHERE user_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM users WHERE id = '00000000-0000-0000-0000-000000000001';

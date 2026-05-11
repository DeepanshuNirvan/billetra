-- +goose Up
-- Fix demo user password hash (Demo@1234)
UPDATE users SET password_hash = '$2a$10$nXU2NxWtzHpzr3ANIr3URuqsn8pWi6AFRU0tCWMMW3NxnOFjHHJMu'
WHERE email = 'demo@billetra.com';

-- Seed super admin (password: Admin@1234)
INSERT INTO users (email, password_hash, name, phone, role)
VALUES (
  'admin@billetra.com',
  '$2a$10$cLnt1PrD2qtxvL4XB8lNtOvCoRK3Du3PdAlxrbyZghuIY5PBrxhT2',
  'Super Admin',
  '9000000000',
  'super_admin'
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role;

-- +goose Down
UPDATE users SET password_hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVyGrAcN0e'
WHERE email = 'demo@billetra.com';
DELETE FROM users WHERE email = 'admin@billetra.com';

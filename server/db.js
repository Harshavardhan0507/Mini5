import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'kisan.sqlite');
const db = new Database(dbPath);

// Enable WAL mode for high concurrency and reliability
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT,
    farm_location TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    total_amount REAL NOT NULL,
    shipping_name TEXT NOT NULL,
    shipping_phone TEXT NOT NULL,
    shipping_address TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Confirmed',
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS diagnosis_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    disease_id TEXT,
    disease_name TEXT NOT NULL,
    severity TEXT,
    image_url TEXT,
    query_text TEXT,
    language TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

// User queries
export const getUserByEmail = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)');
export const getUserById = db.prepare('SELECT id, name, email, phone, farm_location as farmLocation, created_at as createdAt FROM users WHERE id = ?');
export const insertUser = db.prepare(`
  INSERT INTO users (id, name, email, password, phone, farm_location, created_at)
  VALUES (@id, @name, @email, @password, @phone, @farmLocation, @createdAt)
`);

// Order queries
const insertOrderStmt = db.prepare(`
  INSERT INTO orders (id, user_id, total_amount, shipping_name, shipping_phone, shipping_address, payment_method, status, created_at)
  VALUES (@id, @userId, @totalAmount, @shippingName, @shippingPhone, @shippingAddress, @paymentMethod, @status, @createdAt)
`);

const insertOrderItemStmt = db.prepare(`
  INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price)
  VALUES (@orderId, @productId, @productName, @quantity, @unitPrice)
`);

export const getOrdersByUserStmt = db.prepare(`
  SELECT id, user_id as userId, total_amount as totalAmount, shipping_name, shipping_phone, shipping_address, payment_method as paymentMethod, status, created_at as createdAt
  FROM orders
  WHERE user_id = ?
  ORDER BY created_at DESC
`);

export const getOrderItemsByOrderStmt = db.prepare(`
  SELECT product_id as productId, product_name as name, quantity, unit_price as unitPrice
  FROM order_items
  WHERE order_id = ?
`);

export const getOrderByIdStmt = db.prepare(`
  SELECT id, user_id as userId, total_amount as totalAmount, shipping_name, shipping_phone, shipping_address, payment_method as paymentMethod, status, created_at as createdAt
  FROM orders
  WHERE id = ?
`);

/**
 * Transactional order creation
 */
export const createOrderTransaction = db.transaction((orderData, items) => {
  insertOrderStmt.run(orderData);
  for (const item of items) {
    insertOrderItemStmt.run({
      orderId: orderData.id,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice
    });
  }
});

// Diagnosis queries
export const insertDiagnosisStmt = db.prepare(`
  INSERT INTO diagnosis_history (user_id, disease_id, disease_name, severity, image_url, query_text, language, created_at)
  VALUES (@userId, @diseaseId, @diseaseName, @severity, @imageUrl, @queryText, @language, @createdAt)
`);

export const getDiagnosisByUserStmt = db.prepare(`
  SELECT id, disease_id as diseaseId, disease_name as diseaseName, severity, image_url as imageUrl, query_text as queryText, language, created_at as createdAt
  FROM diagnosis_history
  WHERE user_id = ?
  ORDER BY created_at DESC
  LIMIT 20
`);

export const getDiagnosisCountByUserStmt = db.prepare(`
  SELECT COUNT(*) as count FROM diagnosis_history WHERE user_id = ?
`);

export default db;

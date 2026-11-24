import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isVercel = Boolean(process.env.VERCEL);
const defaultDataDir = path.join(__dirname, 'data');
const dataDir = process.env.DATA_DIR || (isVercel ? '/tmp/data' : defaultDataDir);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.SQLITE_DB_PATH || path.join(dataDir, 'kisan.sqlite');

// On Vercel's ephemeral /tmp filesystem, initialize with pre-seeded database file if available
if (isVercel && !fs.existsSync(dbPath)) {
  const bundledDbPath = path.join(defaultDataDir, 'kisan.sqlite');
  if (fs.existsSync(bundledDbPath)) {
    try {
      fs.copyFileSync(bundledDbPath, dbPath);
    } catch (copyErr) {
      console.warn('Could not copy bundled sqlite database to /tmp:', copyErr.message);
    }
  }
}

let db;
try {
  const { default: Database } = await import('better-sqlite3');
  db = new Database(dbPath);
} catch (err) {
  // If better-sqlite3 native binary cannot be loaded (e.g. Windows Application Control policy ERR_DLOPEN_FAILED
  // or unsupported prebuilds), fallback to Node.js 22+ built-in node:sqlite module seamlessly.
  const { DatabaseSync } = await import('node:sqlite');
  const nativeDb = new DatabaseSync(dbPath);

  function sanitizeParam(val) {
    return val === undefined ? null : val;
  }
  function sanitizeArgs(args) {
    if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
      if (Array.isArray(args[0])) {
        return args[0].map(sanitizeParam);
      }
      const cleanObj = {};
      for (const key of Object.keys(args[0])) {
        const val = args[0][key];
        cleanObj[key] = val === undefined ? null : val;
      }
      return [cleanObj];
    }
    return args.map(sanitizeParam);
  }

  const origPrepare = nativeDb.prepare.bind(nativeDb);
  nativeDb.prepare = function (sql) {
    const stmt = origPrepare(sql);
    return {
      run(...args) {
        return stmt.run(...sanitizeArgs(args));
      },
      get(...args) {
        return stmt.get(...sanitizeArgs(args));
      },
      all(...args) {
        return stmt.all(...sanitizeArgs(args));
      }
    };
  };

  nativeDb.pragma = function (sql) {
    if (sql.includes('=')) {
      return nativeDb.exec(`PRAGMA ${sql};`);
    }
    return nativeDb.prepare(`PRAGMA ${sql}`).all();
  };

  nativeDb.transaction = function (fn) {
    return (...args) => {
      nativeDb.exec('BEGIN');
      try {
        const result = fn(...args);
        nativeDb.exec('COMMIT');
        return result;
      } catch (e) {
        try {
          nativeDb.exec('ROLLBACK');
        } catch (_) {}
        throw e;
      }
    };
  };

  db = nativeDb;
}

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
    role TEXT NOT NULL DEFAULT 'customer',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL,
    mrp REAL,
    rating REAL NOT NULL DEFAULT 4.5,
    stock INTEGER NOT NULL DEFAULT 0,
    weight TEXT,
    image TEXT,
    description TEXT,
    dosage TEXT,
    suitable_crops TEXT,
    target_problems TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    subtotal REAL,
    shipping_fee REAL NOT NULL DEFAULT 0,
    total_amount REAL NOT NULL,
    shipping_name TEXT NOT NULL,
    shipping_phone TEXT NOT NULL,
    shipping_address TEXT NOT NULL,
    shipping_pincode TEXT,
    payment_method TEXT NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'pending',
    payment_reference TEXT,
    status TEXT NOT NULL DEFAULT 'Confirmed',
    cancel_reason TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT,
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

  CREATE TABLE IF NOT EXISTS email_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT,
    recipient TEXT NOT NULL,
    subject TEXT,
    status TEXT NOT NULL,
    error TEXT,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
  CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
`);

/**
 * Add a column to an existing table when upgrading an older database file.
 * Table/column names are internal constants, never user input.
 */
function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

// Migrations for databases created before these features existed
ensureColumn('users', 'role', "TEXT NOT NULL DEFAULT 'customer'");
ensureColumn('products', 'rating', 'REAL NOT NULL DEFAULT 4.5');
ensureColumn('orders', 'subtotal', 'REAL');
ensureColumn('orders', 'shipping_fee', 'REAL NOT NULL DEFAULT 0');
ensureColumn('orders', 'shipping_pincode', 'TEXT');
ensureColumn('orders', 'payment_status', "TEXT NOT NULL DEFAULT 'pending'");
ensureColumn('orders', 'payment_reference', 'TEXT');
ensureColumn('orders', 'cancel_reason', 'TEXT');
ensureColumn('orders', 'updated_at', 'TEXT');

// User queries
export const getUserByEmail = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)');
export const getUserById = db.prepare(`
  SELECT id, name, email, phone, farm_location as farmLocation, role, created_at as createdAt
  FROM users WHERE id = ?
`);
export const insertUser = db.prepare(`
  INSERT INTO users (id, name, email, password, phone, farm_location, role, created_at)
  VALUES (@id, @name, @email, @password, @phone, @farmLocation, @role, @createdAt)
`);
export const updateUserRole = db.prepare('UPDATE users SET role = @role WHERE id = @id');
export const listUsersStmt = db.prepare(`
  SELECT u.id, u.name, u.email, u.phone, u.farm_location as farmLocation, u.role, u.created_at as createdAt,
    (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) as orderCount
  FROM users u
  ORDER BY u.created_at DESC
`);

// Product queries
export const listAllProductsStmt = db.prepare(`
  SELECT * FROM products ORDER BY is_active DESC, category ASC, name ASC
`);
export const listActiveProductsStmt = db.prepare(`
  SELECT * FROM products WHERE is_active = 1 ORDER BY category ASC, name ASC
`);
export const getProductRowStmt = db.prepare('SELECT * FROM products WHERE id = ?');
export const insertProductStmt = db.prepare(`
  INSERT INTO products (
    id, name, category, price, mrp, rating, stock, weight, image, description, dosage,
    suitable_crops, target_problems, is_active, created_at, updated_at
  ) VALUES (
    @id, @name, @category, @price, @mrp, @rating, @stock, @weight, @image, @description, @dosage,
    @suitableCrops, @targetProblems, @isActive, @createdAt, @updatedAt
  )
`);
export const updateProductStmt = db.prepare(`
  UPDATE products SET
    name = @name, category = @category, price = @price, mrp = @mrp, rating = @rating, stock = @stock,
    weight = @weight, image = @image, description = @description, dosage = @dosage,
    suitable_crops = @suitableCrops, target_problems = @targetProblems,
    is_active = @isActive, updated_at = @updatedAt
  WHERE id = @id
`);
export const deactivateProductStmt = db.prepare(
  'UPDATE products SET is_active = 0, updated_at = @now WHERE id = @id'
);

// Atomic stock movements: the `stock >= qty` guard prevents overselling under concurrency
export const decrementStockStmt = db.prepare(`
  UPDATE products SET stock = stock - @qty, updated_at = @now
  WHERE id = @id AND is_active = 1 AND stock >= @qty
`);
export const restoreStockStmt = db.prepare(`
  UPDATE products SET stock = stock + @qty, updated_at = @now WHERE id = @id
`);

// Order queries
const ORDER_COLUMNS = `
  id, user_id as userId, subtotal, shipping_fee as shippingFee, total_amount as totalAmount,
  shipping_name as shippingName, shipping_phone as shippingPhone, shipping_address as shippingAddress,
  shipping_pincode as shippingPincode, payment_method as paymentMethod,
  payment_status as paymentStatus, payment_reference as paymentReference,
  status, cancel_reason as cancelReason, created_at as createdAt, updated_at as updatedAt
`;

const insertOrderStmt = db.prepare(`
  INSERT INTO orders (
    id, user_id, subtotal, shipping_fee, total_amount, shipping_name, shipping_phone,
    shipping_address, shipping_pincode, payment_method, payment_status, payment_reference,
    status, cancel_reason, created_at, updated_at
  ) VALUES (
    @id, @userId, @subtotal, @shippingFee, @totalAmount, @shippingName, @shippingPhone,
    @shippingAddress, @shippingPincode, @paymentMethod, @paymentStatus, @paymentReference,
    @status, @cancelReason, @createdAt, @updatedAt
  )
`);

const insertOrderItemStmt = db.prepare(`
  INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price)
  VALUES (@orderId, @productId, @productName, @quantity, @unitPrice)
`);

export const getOrdersByUserStmt = db.prepare(`
  SELECT ${ORDER_COLUMNS}
  FROM orders
  WHERE user_id = ?
  ORDER BY created_at DESC
`);

export const getOrderItemsByOrderStmt = db.prepare(`
  SELECT product_id as productId, product_name as name, quantity, unit_price as unitPrice
  FROM order_items
  WHERE order_id = ?
`);

export const getOrderByIdStmt = db.prepare(`SELECT ${ORDER_COLUMNS} FROM orders WHERE id = ?`);
export const getOrdersByStatusStmt = db.prepare(
  `SELECT ${ORDER_COLUMNS} FROM orders WHERE status = ? ORDER BY created_at DESC`
);
export const getAllOrdersStmt = db.prepare(`SELECT ${ORDER_COLUMNS} FROM orders ORDER BY created_at DESC`);
export const updateOrderStatusStmt = db.prepare(
  'UPDATE orders SET status = @status, updated_at = @now WHERE id = @id'
);
export const updatePaymentStatusStmt = db.prepare(`
  UPDATE orders SET payment_status = @paymentStatus, payment_reference = @paymentReference,
    updated_at = @now WHERE id = @id
`);
const cancelOrderStmt = db.prepare(`
  UPDATE orders SET status = 'Cancelled', cancel_reason = @reason, updated_at = @now WHERE id = @id
`);

export class InsufficientStockError extends Error {
  constructor(productName, available, requested) {
    super(`Insufficient stock for ${productName}. Available: ${available}, requested: ${requested}.`);
    this.name = 'InsufficientStockError';
    this.statusCode = 409;
  }
}

export class OrderStateError extends Error {
  constructor(message) {
    super(message);
    this.name = 'OrderStateError';
    this.statusCode = 409;
  }
}

/**
 * Transactional order creation: inserts the order + line items and decrements
 * stock with an atomic guard. Any failure rolls the whole order back.
 */
export const createOrderTransaction = db.transaction((orderData, items) => {
  insertOrderStmt.run(orderData);

  for (const item of items) {
    const result = decrementStockStmt.run({
      id: item.productId,
      qty: item.quantity,
      now: orderData.createdAt
    });

    if (result.changes === 0) {
      const row = getProductRowStmt.get(item.productId);
      throw new InsufficientStockError(item.productName, row ? row.stock : 0, item.quantity);
    }

    insertOrderItemStmt.run({
      orderId: orderData.id,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice
    });
  }
});

/**
 * Cancel an order that has not shipped yet and put every unit back in stock.
 */
export const cancelOrderTransaction = db.transaction((orderId, reason) => {
  const order = getOrderByIdStmt.get(orderId);
  if (!order) {
    throw new OrderStateError('Order not found.');
  }
  if (!['Confirmed', 'Packed'].includes(order.status)) {
    throw new OrderStateError(`Orders marked "${order.status}" can no longer be cancelled.`);
  }

  const now = new Date().toISOString();
  const items = getOrderItemsByOrderStmt.all(orderId);
  for (const item of items) {
    restoreStockStmt.run({ id: item.productId, qty: item.quantity, now });
  }

  cancelOrderStmt.run({ id: orderId, reason: reason || 'Cancelled by customer', now });
  return getOrderByIdStmt.get(orderId);
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

// Email log
export const insertEmailLogStmt = db.prepare(`
  INSERT INTO email_log (order_id, recipient, subject, status, error, created_at)
  VALUES (@orderId, @recipient, @subject, @status, @error, @createdAt)
`);
export const listEmailLogStmt = db.prepare(`
  SELECT id, order_id as orderId, recipient, subject, status, error, created_at as createdAt
  FROM email_log ORDER BY id DESC LIMIT 50
`);

// Admin counters
export const countOrdersStmt = db.prepare('SELECT COUNT(*) as count FROM orders');
export const countRevenueStmt = db.prepare(
  "SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status != 'Cancelled'"
);
export const countCustomersStmt = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'customer'");
export const countLowStockStmt = db.prepare(
  'SELECT COUNT(*) as count FROM products WHERE is_active = 1 AND stock <= 5'
);
export const countOpenOrdersStmt = db.prepare(
  "SELECT COUNT(*) as count FROM orders WHERE status IN ('Confirmed', 'Packed')"
);

export default db;

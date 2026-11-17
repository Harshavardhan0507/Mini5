import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import db, {
  getUserByEmail,
  insertUser,
  insertProductStmt,
  updateUserRole,
  createOrderTransaction,
  getOrdersByUserStmt
} from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const productsPath = path.join(__dirname, 'data/products.json');

const DEMO_EMAIL = 'farmer.harsha@kisan.com';
const DEMO_PASSWORD = 'kisan1234';

async function seedProducts() {
  const existing = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  if (existing > 0) return;

  const catalog = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
  const now = new Date().toISOString();

  const insertAll = db.transaction((products) => {
    for (const p of products) {
      insertProductStmt.run({
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price,
        mrp: p.mrp ?? p.price,
        rating: p.rating ?? 4.5,
        stock: Number.isFinite(p.stock) ? p.stock : 0,
        weight: p.weight || '',
        image: p.image || '',
        description: p.description || '',
        dosage: p.dosage || '',
        suitableCrops: JSON.stringify(p.suitableCrops || []),
        targetProblems: JSON.stringify(p.targetProblems || []),
        isActive: 1,
        createdAt: now,
        updatedAt: now
      });
    }
  });

  insertAll(catalog);
  console.log(`🌱 Seeded ${catalog.length} products into SQLite.`);
}

async function seedAdmin() {
  const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('⚠️  ADMIN_EMAIL / ADMIN_PASSWORD not set — no admin account was created.');
    }
    return;
  }
  if (adminPassword.length < 8) {
    console.warn('⚠️  ADMIN_PASSWORD should be at least 8 characters.');
  }

  const existing = getUserByEmail.get(adminEmail);
  if (existing) {
    if (existing.role !== 'admin') {
      updateUserRole.run({ role: 'admin', id: existing.id });
      console.log(`✅ Promoted existing account ${adminEmail} to admin.`);
    }
    return;
  }

  const salt = await bcrypt.genSalt(10);
  insertUser.run({
    id: 'usr_admin_1',
    name: 'Store Admin',
    email: adminEmail,
    password: await bcrypt.hash(adminPassword, salt),
    phone: '',
    farmLocation: 'Guntur, Andhra Pradesh',
    role: 'admin',
    createdAt: new Date().toISOString()
  });
  console.log(`✅ Admin account created: ${adminEmail}`);
}

async function seedDemoFarmer() {
  if (process.env.NODE_ENV === 'production' || process.env.SEED_DEMO === 'false') {
    return;
  }

  const existing = getUserByEmail.get(DEMO_EMAIL);
  if (!existing) {
    console.log('🌱 Seeding demo farmer account into SQLite...');
    const salt = await bcrypt.genSalt(10);

    insertUser.run({
      id: 'usr_demo_1',
      name: 'Harshavardhan (Farmer)',
      email: DEMO_EMAIL,
      password: await bcrypt.hash(DEMO_PASSWORD, salt),
      phone: '9849012345',
      farmLocation: 'Andhra Pradesh, India',
      role: 'customer',
      createdAt: new Date().toISOString()
    });
    console.log(`✅ Demo account seeded: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  }

  const existingOrders = getOrdersByUserStmt.all('usr_demo_1');
  if (existingOrders.length > 0) return;

  const products = db.prepare('SELECT id, name, price FROM products').all();
  const priceOf = (id) => products.find((p) => p.id === id)?.price ?? 0;
  const nameOf = (id) => products.find((p) => p.id === id)?.name ?? id;

  const now = Date.now();
  const oldOrderId = 'ORD-169344';
  const recentOrderId = 'ORD-842190';
  if (db.prepare('SELECT id FROM orders WHERE id IN (?, ?)').all(oldOrderId, recentOrderId).length > 0) {
    return;
  }

  const demoBase = {
    userId: 'usr_demo_1',
    shippingName: 'Harshavardhan',
    shippingPhone: '9849012345',
    shippingAddress: 'Plot 14, Green Fields Farm, Guntur',
    shippingPincode: '522001',
    shippingFee: 0,
    cancelReason: null
  };

  createOrderTransaction(
    {
      ...demoBase,
      id: oldOrderId,
      subtotal: priceOf('prod-1'),
      totalAmount: priceOf('prod-1'),
      paymentMethod: 'Cash on Delivery (Pay at Farm)',
      paymentStatus: 'paid',
      paymentReference: null,
      status: 'Delivered',
      createdAt: new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    [{ productId: 'prod-1', productName: nameOf('prod-1'), quantity: 1, unitPrice: priceOf('prod-1') }]
  );

  const recentSubtotal = priceOf('prod-4') * 2 + priceOf('prod-2');
  createOrderTransaction(
    {
      ...demoBase,
      id: recentOrderId,
      subtotal: recentSubtotal,
      totalAmount: recentSubtotal,
      paymentMethod: 'UPI / Online Payment',
      paymentStatus: 'awaiting_payment',
      paymentReference: null,
      status: 'Confirmed',
      createdAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now - 24 * 60 * 60 * 1000).toISOString()
    },
    [
      { productId: 'prod-4', productName: nameOf('prod-4'), quantity: 2, unitPrice: priceOf('prod-4') },
      { productId: 'prod-2', productName: nameOf('prod-2'), quantity: 1, unitPrice: priceOf('prod-2') }
    ]
  );

  console.log('✅ Sample demo orders seeded.');
}

export async function seedDatabase() {
  await seedProducts();
  await seedAdmin();
  // Demo data must never stop a real server from booting
  await seedDemoFarmer().catch((error) => {
    console.warn('Demo data seeding skipped:', error.message);
  });
}

// Allow direct execution: `node seed.js`
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase()
    .then(() => {
      console.log('Database seeding complete.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seeding failed:', err);
      process.exit(1);
    });
}

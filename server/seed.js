import bcrypt from 'bcryptjs';
import db, { getUserByEmail, insertUser, createOrderTransaction, getOrdersByUserStmt } from './db.js';

export async function seedDatabase() {
  const demoEmail = 'farmer.harsha@kisan.com';
  const existing = getUserByEmail.get(demoEmail);

  if (!existing) {
    console.log('🌱 Seeding demo farmer account into SQLite...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('kisan1234', salt);

    insertUser.run({
      id: 'usr_demo_1',
      name: 'Harshavardhan (Farmer)',
      email: demoEmail,
      password: hashedPassword,
      phone: '9849012345',
      farmLocation: 'Andhra Pradesh, India',
      createdAt: new Date().toISOString()
    });
    console.log('✅ Demo account seeded: farmer.harsha@kisan.com / kisan1234');
  }

  const existingOrders = getOrdersByUserStmt.all('usr_demo_1');
  if (existingOrders.length === 0) {
    console.log('🌱 Seeding sample demo orders into SQLite...');
    createOrderTransaction(
      {
        id: 'ORD-169344',
        userId: 'usr_demo_1',
        totalAmount: 349,
        shippingName: 'Harshavardhan',
        shippingPhone: '9849012345',
        shippingAddress: 'Plot 14, Green Fields Farm, Guntur, AP - 522001',
        paymentMethod: 'Cash on Delivery (Pay at Farm)',
        status: 'Delivered',
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
      },
      [
        {
          productId: 'prod-1',
          productName: 'Kisan Copper Oxychloride 50% WP (Fungicide)',
          quantity: 1,
          unitPrice: 349
        }
      ]
    );

    createOrderTransaction(
      {
        id: 'ORD-842190',
        userId: 'usr_demo_1',
        totalAmount: 760,
        shippingName: 'Harshavardhan',
        shippingPhone: '9849012345',
        shippingAddress: 'Plot 14, Green Fields Farm, Guntur, AP - 522001',
        paymentMethod: 'UPI / Online Payment',
        status: 'Confirmed',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      [
        {
          productId: 'prod-4',
          productName: 'NPK 19:19:19 100% Water Soluble Fertilizer',
          quantity: 2,
          unitPrice: 240
        },
        {
          productId: 'prod-2',
          productName: 'Bio-Neem Supreme (Cold Pressed 10,000 PPM)',
          quantity: 1,
          unitPrice: 280
        }
      ]
    );
    console.log('✅ Sample demo orders seeded.');
  }
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

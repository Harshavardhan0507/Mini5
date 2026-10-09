import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ordersFilePath = path.join(__dirname, '../data/orders.json');

const router = Router();

function getOrders() {
  if (!fs.existsSync(ordersFilePath)) {
    fs.writeFileSync(ordersFilePath, JSON.stringify([]));
    return [];
  }
  return JSON.parse(fs.readFileSync(ordersFilePath, 'utf-8'));
}

function saveOrders(orders) {
  fs.writeFileSync(ordersFilePath, JSON.stringify(orders, null, 2));
}

// Create new order
router.post('/', (req, res) => {
  try {
    const { userId, items, shippingAddress, totalAmount, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Order must contain items' });
    }

    const orders = getOrders();
    const newOrder = {
      id: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
      userId: userId || 'guest',
      items,
      totalAmount,
      shippingAddress: shippingAddress || {},
      paymentMethod: paymentMethod || 'Cash on Delivery',
      status: 'Confirmed',
      createdAt: new Date().toISOString()
    };

    orders.unshift(newOrder);
    saveOrders(orders);

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      order: newOrder
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to place order' });
  }
});

// Get orders by user
router.get('/user/:userId', (req, res) => {
  try {
    const orders = getOrders();
    const userOrders = orders.filter((o) => o.userId === req.params.userId);
    return res.json({ success: true, orders: userOrders });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve orders' });
  }
});

export default router;

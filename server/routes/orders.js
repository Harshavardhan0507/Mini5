import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuth } from '../middleware/auth.js';
import {
  createOrderTransaction,
  getOrdersByUserStmt,
  getOrderItemsByOrderStmt,
  getOrderByIdStmt
} from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const productsPath = path.join(__dirname, '../data/products.json');

const router = Router();

function loadProducts() {
  return JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
}

/**
 * Place a new order
 * Requires authentication.
 * Server recomputes total from products.json and validates stock.
 */
router.post('/', requireAuth, (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod } = req.body;
    const userId = req.user.id;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Order must contain at least one item.' });
    }

    if (!shippingAddress || !shippingAddress.name || !shippingAddress.phone || !shippingAddress.address) {
      return res.status(400).json({
        success: false,
        message: 'Shipping name, phone number, and delivery address are required.'
      });
    }

    const products = loadProducts();
    const verifiedItems = [];
    let computedTotal = 0;

    for (const item of items) {
      const productId = item.productId || item.product?.id || item.id;
      const quantity = parseInt(item.quantity || item.qty, 10);

      if (!productId || isNaN(quantity) || quantity <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid product or quantity specified.' });
      }

      const product = products.find((p) => p.id === productId);
      if (!product) {
        return res.status(400).json({ success: false, message: `Product '${productId}' not found in catalog.` });
      }

      if (product.stock !== undefined && quantity > product.stock) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}, requested: ${quantity}.`
        });
      }

      const unitPrice = product.price;
      computedTotal += unitPrice * quantity;

      verifiedItems.push({
        productId: product.id,
        productName: product.name,
        quantity,
        unitPrice
      });
    }

    const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    const createdAt = new Date().toISOString();

    const orderData = {
      id: orderId,
      userId,
      totalAmount: computedTotal,
      shippingName: shippingAddress.name.trim(),
      shippingPhone: shippingAddress.phone.trim(),
      shippingAddress: shippingAddress.address.trim(),
      paymentMethod: paymentMethod || 'Cash on Delivery (Pay at Farm)',
      status: 'Confirmed',
      createdAt
    };

    createOrderTransaction(orderData, verifiedItems);

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      order: {
        ...orderData,
        items: verifiedItems.map((i) => ({
          productId: i.productId,
          name: i.productName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          product: { id: i.productId, name: i.productName, price: i.unitPrice }
        }))
      }
    });
  } catch (error) {
    console.error('Order creation error:', error);
    return res.status(500).json({ success: false, message: 'Failed to place order. Please try again.' });
  }
});

/**
 * Get authenticated user's orders
 */
router.get('/my-orders', requireAuth, (req, res) => {
  try {
    const orders = getOrdersByUserStmt.all(req.user.id);
    const formattedOrders = orders.map((order) => {
      const items = getOrderItemsByOrderStmt.all(order.id);
      return {
        ...order,
        shippingAddress: {
          name: order.shipping_name,
          phone: order.shipping_phone,
          address: order.shipping_address
        },
        items: items.map((i) => ({
          ...i,
          product: { id: i.productId, name: i.name, price: i.unitPrice }
        }))
      };
    });

    return res.json({ success: true, orders: formattedOrders });
  } catch (error) {
    console.error('Fetch user orders error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve orders.' });
  }
});

/**
 * Get orders by user ID (strictly secured to only allow owner or admin)
 */
router.get('/user/:userId', requireAuth, (req, res) => {
  try {
    if (req.user.id !== req.params.userId) {
      return res.status(403).json({ success: false, message: 'Forbidden: You cannot access another user\'s orders.' });
    }

    const orders = getOrdersByUserStmt.all(req.params.userId);
    const formattedOrders = orders.map((order) => {
      const items = getOrderItemsByOrderStmt.all(order.id);
      return {
        ...order,
        shippingAddress: {
          name: order.shipping_name,
          phone: order.shipping_phone,
          address: order.shipping_address
        },
        items: items.map((i) => ({
          ...i,
          product: { id: i.productId, name: i.name, price: i.unitPrice }
        }))
      };
    });

    return res.json({ success: true, orders: formattedOrders });
  } catch (error) {
    console.error('Fetch user orders error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve orders.' });
  }
});

export default router;

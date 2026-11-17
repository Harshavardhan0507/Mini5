import { Router } from 'express';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import {
  getProductRowStmt,
  createOrderTransaction,
  cancelOrderTransaction,
  getOrdersByUserStmt,
  getOrderItemsByOrderStmt,
  getOrderByIdStmt,
  InsufficientStockError
} from '../db.js';
import { PAYMENT_METHODS, paymentStatusFor, formatOrder } from '../utils/orders.js';
import { rowToProduct } from '../utils/products.js';
import { sendNewOrderEmail, sendOrderStatusEmail } from '../services/mailer.js';

const router = Router();

function resolvePaymentMethod(raw) {
  const value = String(raw || '').trim().toLowerCase();
  if (value === 'cod' || value.startsWith('cash on delivery')) return PAYMENT_METHODS.cod;
  if (value === 'upi' || value.startsWith('upi')) return PAYMENT_METHODS.upi;
  return null;
}

function newOrderId() {
  const now = new Date();
  const stamp = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}`;
  return `ORD-${stamp}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}

function uniqueOrderId() {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const id = newOrderId();
    if (!getOrderByIdStmt.get(id)) return id;
  }
  return `ORD-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

/**
 * Place a new order.
 * Requires authentication. The server recomputes prices from the product
 * catalog, decrements stock atomically and emails the store.
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Order must contain at least one item.' });
    }
    if (items.length > 50) {
      return res.status(400).json({ success: false, message: 'Too many distinct items in one order.' });
    }

    const name = String(shippingAddress?.name || '').trim();
    const phone = String(shippingAddress?.phone || '').trim();
    const address = String(shippingAddress?.address || '').trim();
    const pincode = String(shippingAddress?.pincode || '').trim();

    if (name.length < 2 || name.length > 80) {
      return res.status(400).json({ success: false, message: 'A valid delivery name is required.' });
    }
    if (!/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Enter a valid 10-digit Indian mobile number (starting with 6-9).'
      });
    }
    if (address.length < 10 || address.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Delivery address must be between 10 and 500 characters.'
      });
    }
    if (!/^\d{6}$/.test(pincode)) {
      return res.status(400).json({ success: false, message: 'Enter a valid 6-digit PIN code.' });
    }

    const resolvedPaymentMethod = resolvePaymentMethod(paymentMethod);
    if (!resolvedPaymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Choose a payment method: Cash on Delivery or UPI.'
      });
    }

    const verifiedItems = [];
    const seen = new Set();
    let subtotal = 0;

    for (const item of items) {
      const productId = item?.productId || item?.id;
      const quantity = Number(item?.quantity);

      if (!productId || !Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
        return res.status(400).json({ success: false, message: 'Invalid product or quantity specified.' });
      }
      if (seen.has(productId)) {
        return res.status(400).json({ success: false, message: 'Duplicate product in the cart.' });
      }
      seen.add(productId);

      const product = rowToProduct(getProductRowStmt.get(productId));
      if (!product || !product.isActive) {
        return res.status(400).json({
          success: false,
          message: 'One of the products in your cart is no longer available. Please review your cart.'
        });
      }
      if (quantity > product.stock) {
        return res.status(409).json({
          success: false,
          message: `Only ${product.stock} unit(s) of ${product.name} are in stock. Please update your cart.`
        });
      }

      subtotal += product.price * quantity;
      verifiedItems.push({
        productId: product.id,
        productName: product.name,
        quantity,
        unitPrice: product.price
      });
    }

    subtotal = Math.round(subtotal * 100) / 100;
    const createdAt = new Date().toISOString();
    const orderData = {
      id: uniqueOrderId(),
      userId: req.user.id,
      subtotal,
      shippingFee: 0,
      totalAmount: subtotal,
      shippingName: name,
      shippingPhone: phone,
      shippingAddress: address,
      shippingPincode: pincode,
      paymentMethod: resolvedPaymentMethod,
      paymentStatus: paymentStatusFor(resolvedPaymentMethod),
      paymentReference: null,
      status: 'Confirmed',
      cancelReason: null,
      createdAt,
      updatedAt: createdAt
    };

    try {
      createOrderTransaction(orderData, verifiedItems);
    } catch (error) {
      if (error instanceof InsufficientStockError) {
        return res.status(409).json({ success: false, message: error.message });
      }
      throw error;
    }

    const savedOrder = getOrderByIdStmt.get(orderData.id);
    const formatted = formatOrder(savedOrder, getOrderItemsByOrderStmt.all(orderData.id), req.user);

    // Notify the store inbox. A mail problem never fails the order itself.
    const notification = await sendNewOrderEmail({
      order: formatted,
      items: formatted.items,
      customer: req.user
    });

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully.',
      order: formatted,
      notification
    });
  } catch (error) {
    console.error('Order creation error:', error);
    return res.status(500).json({ success: false, message: 'Failed to place order. Please try again.' });
  }
});

/**
 * Get the authenticated user's orders
 */
router.get('/my-orders', requireAuth, (req, res) => {
  try {
    const orders = getOrdersByUserStmt.all(req.user.id).map((order) =>
      formatOrder(order, getOrderItemsByOrderStmt.all(order.id), req.user)
    );
    return res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    console.error('Fetch user orders error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve orders.' });
  }
});

/**
 * Get one order — only its owner or an admin may read it
 */
router.get('/:id', requireAuth, (req, res) => {
  try {
    const order = getOrderByIdStmt.get(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    if (order.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You cannot access this order.' });
    }

    return res.json({
      success: true,
      order: formatOrder(order, getOrderItemsByOrderStmt.all(order.id), req.user)
    });
  } catch (error) {
    console.error('Fetch order error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve the order.' });
  }
});

/**
 * Cancel an order that has not shipped yet (restocks every item)
 */
router.patch('/:id/cancel', requireAuth, async (req, res) => {
  try {
    const order = getOrderByIdStmt.get(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    if (order.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You cannot cancel this order.' });
    }

    const reason = String(req.body?.reason || 'Cancelled by customer').slice(0, 200);

    try {
      cancelOrderTransaction(order.id, reason);
    } catch (error) {
      return res
        .status(error.statusCode || 409)
        .json({ success: false, message: error.message || 'This order can no longer be cancelled.' });
    }

    const updated = getOrderByIdStmt.get(order.id);
    const formatted = formatOrder(updated, getOrderItemsByOrderStmt.all(order.id), req.user);

    await sendOrderStatusEmail({
      order: formatted,
      customer: req.user,
      status: 'Cancelled',
      note: reason
    });

    return res.json({ success: true, message: 'Order cancelled.', order: formatted });
  } catch (error) {
    console.error('Cancel order error:', error);
    return res.status(500).json({ success: false, message: 'Failed to cancel the order.' });
  }
});

export default router;

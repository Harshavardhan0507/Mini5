import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import {
  listAllProductsStmt,
  getProductRowStmt,
  insertProductStmt,
  updateProductStmt,
  deactivateProductStmt,
  getAllOrdersStmt,
  getOrdersByStatusStmt,
  getOrderByIdStmt,
  getOrderItemsByOrderStmt,
  updateOrderStatusStmt,
  updatePaymentStatusStmt,
  cancelOrderTransaction,
  getUserById,
  listUsersStmt,
  listEmailLogStmt,
  countOrdersStmt,
  countRevenueStmt,
  countCustomersStmt,
  countLowStockStmt,
  countOpenOrdersStmt
} from '../db.js';
import { normalizeProductInput, rowToProduct } from '../utils/products.js';
import { formatOrder, ORDER_STATUSES, PAYMENT_STATUSES } from '../utils/orders.js';
import { sendNewOrderEmail, sendOrderStatusEmail } from '../services/mailer.js';

const router = Router();

// Every admin endpoint requires a valid session belonging to an admin user
router.use(requireAuth, requireAdmin);

function loadOrderWithItems(orderId) {
  const order = getOrderByIdStmt.get(orderId);
  if (!order) return null;
  const items = getOrderItemsByOrderStmt.all(orderId);
  const customer = getUserById.get(order.userId);
  return { order, items, customer };
}

/* ------------------------------- Dashboard ------------------------------- */

router.get('/stats', (req, res) => {
  try {
    const lowStockProducts = listAllProductsStmt
      .all()
      .map(rowToProduct)
      .filter((p) => p.isActive && p.stock <= 5)
      .slice(0, 10);

    return res.json({
      success: true,
      stats: {
        orders: countOrdersStmt.get().count,
        revenue: countRevenueStmt.get().total,
        customers: countCustomersStmt.get().count,
        lowStock: countLowStockStmt.get().count,
        openOrders: countOpenOrdersStmt.get().count
      },
      lowStockProducts,
      recentOrders: getAllOrdersStmt.all().slice(0, 6).map((order) => {
        const items = getOrderItemsByOrderStmt.all(order.id);
        const customer = getUserById.get(order.userId);
        return formatOrder(order, items, customer);
      }),
      recentEmails: listEmailLogStmt.all().slice(0, 8)
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load dashboard stats.' });
  }
});

/* -------------------------------- Products -------------------------------- */

router.get('/products', (req, res) => {
  try {
    return res.json({
      success: true,
      products: listAllProductsStmt.all().map(rowToProduct)
    });
  } catch (error) {
    console.error('Admin product list error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load products.' });
  }
});

router.post('/products', (req, res) => {
  try {
    const { errors, value } = normalizeProductInput(req.body || {});
    if (errors.length) {
      return res.status(400).json({ success: false, message: errors.join(' '), errors });
    }

    const now = new Date().toISOString();
    const id = `prod-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    const createdAt = now;

    insertProductStmt.run({
      id,
      ...value,
      suitableCrops: JSON.stringify(value.suitableCrops),
      targetProblems: JSON.stringify(value.targetProblems),
      createdAt,
      updatedAt: now
    });

    return res.status(201).json({
      success: true,
      message: 'Product created.',
      product: rowToProduct(getProductRowStmt.get(id))
    });
  } catch (error) {
    console.error('Admin product create error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create product.' });
  }
});

router.put('/products/:id', (req, res) => {
  try {
    const existing = getProductRowStmt.get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const { errors, value } = normalizeProductInput(req.body || {});
    if (errors.length) {
      return res.status(400).json({ success: false, message: errors.join(' '), errors });
    }

    updateProductStmt.run({
      id: existing.id,
      ...value,
      suitableCrops: JSON.stringify(value.suitableCrops),
      targetProblems: JSON.stringify(value.targetProblems),
      updatedAt: new Date().toISOString()
    });

    return res.json({
      success: true,
      message: 'Product updated.',
      product: rowToProduct(getProductRowStmt.get(existing.id))
    });
  } catch (error) {
    console.error('Admin product update error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update product.' });
  }
});

router.delete('/products/:id', (req, res) => {
  try {
    const existing = getProductRowStmt.get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    deactivateProductStmt.run({ id: existing.id, now: new Date().toISOString() });
    return res.json({ success: true, message: 'Product removed from the store.' });
  } catch (error) {
    console.error('Admin product delete error:', error);
    return res.status(500).json({ success: false, message: 'Failed to remove product.' });
  }
});

/* --------------------------------- Orders --------------------------------- */

router.get('/orders', (req, res) => {
  try {
    const { status } = req.query;
    const rows = status ? getOrdersByStatusStmt.all(String(status)) : getAllOrdersStmt.all();
    const orders = rows.map((order) => {
      const items = getOrderItemsByOrderStmt.all(order.id);
      const customer = getUserById.get(order.userId);
      return formatOrder(order, items, customer);
    });
    return res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    console.error('Admin order list error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load orders.' });
  }
});

router.patch('/orders/:id/status', async (req, res) => {
  try {
    const { status, note } = req.body || {};
    if (!ORDER_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${ORDER_STATUSES.join(', ')}.`
      });
    }

    const found = loadOrderWithItems(req.params.id);
    if (!found) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (found.order.status === status) {
      return res.json({ success: true, order: formatOrder(found.order, found.items, found.customer) });
    }

    if (status === 'Cancelled') {
      if (found.order.status === 'Delivered') {
        return res.status(409).json({ success: false, message: 'Delivered orders cannot be cancelled.' });
      }
      cancelOrderTransaction(found.order.id, note || 'Cancelled by store');
    } else {
      if (found.order.status === 'Cancelled') {
        return res.status(409).json({ success: false, message: 'Cancelled orders cannot be reopened.' });
      }
      updateOrderStatusStmt.run({
        id: found.order.id,
        status,
        now: new Date().toISOString()
      });
    }

    const updated = getOrderByIdStmt.get(found.order.id);
    const formatted = formatOrder(updated, found.items, found.customer);

    // Keep the customer informed; a mail failure must not fail the status change
    await sendOrderStatusEmail({
      order: formatted,
      customer: found.customer,
      status,
      note
    });

    return res.json({ success: true, order: formatted });
  } catch (error) {
    console.error('Admin order status error:', error);
    return res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || 'Failed to update order status.' });
  }
});

router.patch('/orders/:id/payment', (req, res) => {
  try {
    const { paymentStatus, paymentReference } = req.body || {};
    if (!PAYMENT_STATUSES.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: `Payment status must be one of: ${PAYMENT_STATUSES.join(', ')}.`
      });
    }

    const found = loadOrderWithItems(req.params.id);
    if (!found) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    updatePaymentStatusStmt.run({
      id: found.order.id,
      paymentStatus,
      paymentReference:
        paymentReference !== undefined
          ? String(paymentReference).slice(0, 120)
          : found.order.paymentReference,
      now: new Date().toISOString()
    });

    const updated = getOrderByIdStmt.get(found.order.id);
    return res.json({ success: true, order: formatOrder(updated, found.items, found.customer) });
  } catch (error) {
    console.error('Admin payment update error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update payment status.' });
  }
});

router.post('/orders/:id/notify', async (req, res) => {
  try {
    const found = loadOrderWithItems(req.params.id);
    if (!found) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const formatted = formatOrder(found.order, found.items, found.customer);
    const result = await sendNewOrderEmail({
      order: formatted,
      items: formatted.items,
      customer: found.customer
    });

    return res.json({
      success: true,
      sent: result.sent,
      message: result.sent
        ? 'Order email sent to the store inbox.'
        : 'Email was not sent. Check the SMTP settings and the email log.'
    });
  } catch (error) {
    console.error('Admin order notify error:', error);
    return res.status(500).json({ success: false, message: 'Failed to send the order email.' });
  }
});

/* -------------------------------- Customers ------------------------------- */

router.get('/customers', (req, res) => {
  try {
    return res.json({ success: true, customers: listUsersStmt.all() });
  } catch (error) {
    console.error('Admin customer list error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load customers.' });
  }
});

router.get('/emails', (req, res) => {
  try {
    return res.json({ success: true, emails: listEmailLogStmt.all() });
  } catch (error) {
    console.error('Admin email log error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load the email log.' });
  }
});

export default router;

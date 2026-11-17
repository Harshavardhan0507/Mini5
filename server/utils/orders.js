export const ORDER_STATUSES = ['Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled'];
export const PAYMENT_STATUSES = ['cod_pending', 'awaiting_payment', 'paid', 'failed', 'refunded'];

export const PAYMENT_METHODS = {
  cod: 'Cash on Delivery (Pay at Farm)',
  upi: 'UPI / Online Payment'
};

export const PAYMENT_STATUS_LABELS = {
  cod_pending: 'Cash on delivery',
  awaiting_payment: 'UPI payment pending',
  paid: 'Paid',
  failed: 'Payment failed',
  refunded: 'Refunded'
};

export function paymentStatusFor(method) {
  return method === PAYMENT_METHODS.cod ? 'cod_pending' : 'awaiting_payment';
}

/**
 * Shape an order row + its items for the client/email templates.
 */
export function formatOrder(row, items, customer) {
  return {
    ...row,
    subtotal: row.subtotal ?? row.totalAmount,
    shippingAddress: {
      name: row.shippingName,
      phone: row.shippingPhone,
      address: row.shippingAddress,
      pincode: row.shippingPincode || ''
    },
    customer: customer
      ? { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone }
      : undefined,
    items: items.map((item) => ({
      ...item,
      product: { id: item.productId, name: item.name, price: item.unitPrice }
    }))
  };
}

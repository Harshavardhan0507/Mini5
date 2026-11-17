import nodemailer from 'nodemailer';
import { insertEmailLogStmt } from '../db.js';

const ORDER_RECIPIENT = process.env.ORDER_NOTIFICATION_EMAIL || 'business615@gmail.com';
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM =
  process.env.SMTP_FROM || (SMTP_USER ? `KisanAgro <${SMTP_USER}>` : `KisanAgro <${ORDER_RECIPIENT}>`);

const transporter = SMTP_HOST
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
      connectionTimeout: 10000,
      greetingTimeout: 10000
    })
  : null;

export function getMailerStatus() {
  return {
    configured: Boolean(transporter),
    recipient: ORDER_RECIPIENT,
    host: SMTP_HOST || null,
    from: SMTP_FROM
  };
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function money(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

/** Orders expose the address as { name, phone, address, pincode }; older rows are plain strings. */
function addressText(order) {
  const raw = order.shippingAddress;
  const line = typeof raw === 'string' ? raw : raw?.address || '';
  const pin = order.shippingPincode || (typeof raw === 'object' ? raw?.pincode : '');
  return `${line}${pin ? `, PIN ${pin}` : ''}`;
}

function logEmail({ orderId, recipient, subject, status, error }) {
  try {
    insertEmailLogStmt.run({
      orderId: orderId || null,
      recipient,
      subject,
      status,
      error: error ? String(error).slice(0, 500) : null,
      createdAt: new Date().toISOString()
    });
  } catch (logErr) {
    console.error('Could not write email log entry:', logErr.message);
  }
}

async function sendMail({ to, subject, html, text, replyTo, orderId }) {
  if (!transporter) {
    console.warn(`📭 SMTP not configured — skipped email "${subject}" to ${to}. Order data is saved in the email log.`);
    logEmail({ orderId, recipient: to, subject, status: 'not_configured' });
    return { sent: false, reason: 'not_configured' };
  }

  try {
    await transporter.sendMail({ from: SMTP_FROM, to, replyTo, subject, html, text });
    console.log(`📧 Sent email "${subject}" to ${to}`);
    logEmail({ orderId, recipient: to, subject, status: 'sent' });
    return { sent: true };
  } catch (error) {
    console.error(`📧 Failed to send email to ${to}:`, error.message);
    logEmail({ orderId, recipient: to, subject, status: 'failed', error: error.message });
    return { sent: false, reason: 'send_failed' };
  }
}

function orderRowsHtml(order, items) {
  return items
    .map(
      (item) => `
        <tr>
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;">
            ${escapeHtml(item.productName || item.name)}
          </td>
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:center;">${item.quantity}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:right;">${money(item.unitPrice)}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:right;">${money(
            item.unitPrice * item.quantity
          )}</td>
        </tr>`
    )
    .join('');
}

function orderSummaryText(order, items) {
  const lines = items.map(
    (item) =>
      `- ${item.productName || item.name} x${item.quantity} @ ${money(item.unitPrice)} = ${money(
        item.unitPrice * item.quantity
      )}`
  );
  return [
    `Order: ${order.id}`,
    `Customer: ${order.customerName}`,
    `Phone: ${order.shippingPhone}`,
    `Email: ${order.customerEmail || '—'}`,
    `Address: ${addressText(order)}`,
    `Payment: ${order.paymentMethod} (${order.paymentStatus})`,
    '',
    ...lines,
    '',
    `Subtotal: ${money(order.subtotal ?? order.totalAmount)}`,
    `Delivery: ${order.shippingFee ? money(order.shippingFee) : 'FREE'}`,
    `Total: ${money(order.totalAmount)}`
  ].join('\n');
}

/**
 * Notify the store owner about a newly placed order.
 * Never throws: a mail failure must not fail the customer's order.
 */
export async function sendNewOrderEmail({ order, items, customer }) {
  const subject = `🌾 New order ${order.id} — ${money(order.totalAmount)} — ${order.paymentMethod}`;
  const adminUrl = `${process.env.CLIENT_ORIGIN?.split(',')[0] || 'http://localhost:5173'}/admin`;
  const fullOrder = {
    ...order,
    customerName: customer?.name || order.shippingName,
    customerEmail: customer?.email || ''
  };

  const html = `
    <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background:#f8fafc;padding:24px;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
        <div style="background:#15803d;color:#ffffff;padding:20px 24px;">
          <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:.85;">KisanAgro — new order</div>
          <div style="font-size:24px;font-weight:800;margin-top:4px;">${escapeHtml(order.id)}</div>
          <div style="margin-top:6px;font-size:14px;">${money(order.totalAmount)} • ${escapeHtml(
            order.paymentMethod
          )}</div>
        </div>

        <div style="padding:24px;color:#0f172a;">
          <h3 style="margin:0 0 8px;font-size:15px;">Customer</h3>
          <p style="margin:0 0 4px;font-size:14px;font-weight:700;">${escapeHtml(
            fullOrder.customerName
          )}</p>
          <p style="margin:0 0 4px;font-size:13px;color:#475569;">
            <a href="tel:${escapeHtml(order.shippingPhone)}" style="color:#15803d;">${escapeHtml(
              order.shippingPhone
            )}</a>
            ${
              fullOrder.customerEmail
                ? ` • <a href="mailto:${escapeHtml(fullOrder.customerEmail)}" style="color:#15803d;">${escapeHtml(
                    fullOrder.customerEmail
                  )}</a>`
                : ''
            }
          </p>
          <p style="margin:0;font-size:13px;color:#475569;line-height:1.5;">
            ${escapeHtml(addressText(order))}
          </p>

          <h3 style="margin:24px 0 8px;font-size:15px;">Items</h3>
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="background:#f1f5f9;text-align:left;">
                <th style="padding:8px 10px;">Product</th>
                <th style="padding:8px 10px;text-align:center;">Qty</th>
                <th style="padding:8px 10px;text-align:right;">Price</th>
                <th style="padding:8px 10px;text-align:right;">Line total</th>
              </tr>
            </thead>
            <tbody>${orderRowsHtml(order, items)}</tbody>
          </table>

          <table style="width:100%;margin-top:16px;font-size:13px;">
            <tr><td style="padding:4px 0;color:#475569;">Subtotal</td>
              <td style="padding:4px 0;text-align:right;">${money(order.subtotal ?? order.totalAmount)}</td></tr>
            <tr><td style="padding:4px 0;color:#475569;">Delivery</td>
              <td style="padding:4px 0;text-align:right;">${order.shippingFee ? money(order.shippingFee) : 'FREE'}</td></tr>
            <tr><td style="padding:8px 0;font-weight:800;">Total</td>
              <td style="padding:8px 0;text-align:right;font-weight:800;">${money(order.totalAmount)}</td></tr>
          </table>

          <p style="margin:20px 0 0;font-size:13px;color:#475569;">
            Payment: <strong>${escapeHtml(order.paymentMethod)}</strong>
            (<span style="text-transform:capitalize;">${escapeHtml(
              String(order.paymentStatus || '').replaceAll('_', ' ')
            )}</span>)<br/>
            Placed: ${escapeHtml(new Date(order.createdAt).toLocaleString('en-IN'))}
          </p>

          <p style="margin:24px 0 0;">
            <a href="${escapeHtml(adminUrl)}"
              style="display:inline-block;background:#15803d;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:10px;font-size:13px;font-weight:700;">
              Open admin panel
            </a>
          </p>
        </div>
      </div>
      <p style="max-width:640px;margin:12px auto 0;font-size:11px;color:#94a3b8;text-align:center;">
        Reply to this email to answer the customer directly.
      </p>
    </div>
  `;

  return sendMail({
    to: ORDER_RECIPIENT,
    subject,
    html,
    text: orderSummaryText(fullOrder, items),
    replyTo: fullOrder.customerEmail || undefined,
    orderId: order.id
  });
}

/**
 * Send the customer an update when the store changes the order status.
 */
export async function sendOrderStatusEmail({ order, customer, status, note }) {
  if (!customer?.email) {
    return { sent: false, reason: 'no_customer_email' };
  }

  const subject = `Order ${order.id} is now ${status}`;
  const html = `
    <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background:#f8fafc;padding:24px;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
        <div style="background:#15803d;color:#ffffff;padding:20px 24px;">
          <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:.85;">KisanAgro order update</div>
          <div style="font-size:22px;font-weight:800;margin-top:4px;">${escapeHtml(status)}</div>
        </div>
        <div style="padding:24px;color:#0f172a;font-size:14px;line-height:1.6;">
          <p style="margin:0 0 12px;">Hello ${escapeHtml(customer.name || 'farmer')},</p>
          <p style="margin:0 0 12px;">
            Your order <strong>${escapeHtml(order.id)}</strong> is now
            <strong>${escapeHtml(status)}</strong>.
          </p>
          ${note ? `<p style="margin:0 0 12px;color:#475569;">${escapeHtml(note)}</p>` : ''}
          <p style="margin:0 0 12px;">
            Items: ${order.items
              .map((item) => `${escapeHtml(item.name)} × ${item.quantity}`)
              .join(', ')}
          </p>
          <p style="margin:0;">Total: <strong>${money(order.totalAmount)}</strong> (${escapeHtml(
            order.paymentMethod
          )})</p>
        </div>
      </div>
    </div>
  `;

  return sendMail({
    to: customer.email,
    subject,
    html,
    text: `Hello ${customer.name || 'farmer'},\n\nOrder ${order.id} is now ${status}.\n${
      note || ''
    }\nTotal: ${money(order.totalAmount)}\n\n— KisanAgro`,
    replyTo: ORDER_RECIPIENT,
    orderId: order.id
  });
}

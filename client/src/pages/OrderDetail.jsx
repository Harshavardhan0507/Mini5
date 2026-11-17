import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchOrderById, cancelOrder } from '../services/api';
import { STORE_INFO } from '../data/storeInfo';
import {
  ArrowLeft,
  Loader2,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Printer,
  Phone
} from 'lucide-react';

const STEPS = ['Confirmed', 'Packed', 'Shipped', 'Delivered'];

const PAYMENT_LABELS = {
  cod_pending: 'Cash on delivery',
  awaiting_payment: 'UPI payment pending',
  paid: 'Paid',
  failed: 'Payment failed',
  refunded: 'Refunded',
  pending: 'Payment pending'
};

const STATUS_STYLES = {
  Confirmed: 'bg-blue-100 text-blue-800',
  Packed: 'bg-amber-100 text-amber-800',
  Shipped: 'bg-indigo-100 text-indigo-800',
  Delivered: 'bg-emerald-100 text-emerald-800',
  Cancelled: 'bg-rose-100 text-rose-800'
};

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetchOrderById(id);
        if (!active) return;
        if (res.success && res.order) {
          setOrder(res.order);
        } else {
          setError(res.message || 'Order not found.');
        }
      } catch {
        setError('Could not load this order.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [id]);

  const handleCancel = async () => {
    if (!window.confirm('Cancel this order? The stock will be returned to the store.')) return;
    setCancelling(true);
    setActionError('');
    try {
      const res = await cancelOrder(order.id, 'Cancelled by customer');
      if (res.success && res.order) {
        setOrder(res.order);
      } else {
        setActionError(res.message || 'Could not cancel the order.');
      }
    } catch {
      setActionError('Connection error. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-agro-600" />
        <span className="text-sm">Loading order...</span>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="text-2xl font-black text-slate-900">{error || 'Order not found'}</h1>
        <Link to="/dashboard" className="inline-flex px-5 py-2.5 bg-agro-600 text-white rounded-xl text-sm font-bold">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const currentStep = STEPS.indexOf(order.status);
  const canCancel = ['Confirmed', 'Packed'].includes(order.status);
  const address = order.shippingAddress || {};

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between no-print">
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-agro-700">
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <Printer className="w-3.5 h-3.5" /> Print invoice
          </button>
          {canCancel && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5" /> {cancelling ? 'Cancelling...' : 'Cancel order'}
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl no-print">{actionError}</div>
      )}

      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 print-area">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
              {STORE_INFO.brand} — order invoice
            </div>
            <h1 className="text-2xl font-black text-slate-900 font-mono">{order.id}</h1>
            <p className="text-xs text-slate-500 mt-1">Placed {formatDate(order.createdAt)}</p>
            <p className="text-[11px] text-slate-500 mt-1">
              {STORE_INFO.legalName} • {STORE_INFO.address}
              <br />
              {STORE_INFO.email}
              {STORE_INFO.gstin ? ` • GSTIN ${STORE_INFO.gstin}` : ''}
              {STORE_INFO.fertilizerLicense ? ` • Fertilizer licence ${STORE_INFO.fertilizerLicense}` : ''}
              {STORE_INFO.insecticideLicense ? ` • Insecticide licence ${STORE_INFO.insecticideLicense}` : ''}
            </p>
          </div>
          <div className="text-left sm:text-right space-y-1">
            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${STATUS_STYLES[order.status] || 'bg-slate-100 text-slate-700'}`}>
              {order.status}
            </span>
            <p className="text-xs text-slate-600">{PAYMENT_LABELS[order.paymentStatus] || order.paymentStatus}</p>
            <p className="text-[11px] text-slate-500">{order.paymentMethod}</p>
          </div>
        </div>

        {order.status === 'Cancelled' ? (
          <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 no-print">
            <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              This order was cancelled.{order.cancelReason ? ` Reason: ${order.cancelReason}.` : ''} Stock has been
              returned to the store.
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 no-print">
            {STEPS.map((step, index) => {
              const done = index <= currentStep;
              const Icon = index === 0 ? CheckCircle2 : index === 1 ? Package : index === 2 ? Truck : CheckCircle2;
              return (
                <div key={step} className="text-center space-y-1.5">
                  <div
                    className={`mx-auto w-9 h-9 rounded-full flex items-center justify-center ${
                      done ? 'bg-agro-600 text-white' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className={`text-[10px] font-bold ${done ? 'text-agro-800' : 'text-slate-400'}`}>{step}</div>
                </div>
              );
            })}
          </div>
        )}

        {order.paymentStatus === 'awaiting_payment' && order.status !== 'Cancelled' && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 no-print flex items-start gap-2">
            <Clock className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              UPI payment is pending. {STORE_INFO.upiId ? `Pay to ${STORE_INFO.upiId} with ${order.id} in the note.` : 'Our team will contact you on your mobile number with the payment details.'}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Delivered to</h3>
            <p className="text-sm font-bold text-slate-900">{address.name}</p>
            <p className="text-xs text-slate-600 leading-relaxed">
              {address.address}
              {address.pincode ? `, PIN ${address.pincode}` : ''}
            </p>
            <p className="text-xs text-slate-600 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-slate-400" /> {address.phone}
            </p>
          </div>
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Delivery</h3>
            <p className="text-xs text-slate-600 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" /> {STORE_INFO.deliveryArea}
            </p>
            <p className="text-xs text-slate-600 flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-slate-400" /> {STORE_INFO.deliveryTime}
            </p>
            <p className="text-xs text-slate-600">Support: {STORE_INFO.supportHours}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-2">Item</th>
                <th className="py-2 text-center">Qty</th>
                <th className="py-2 text-right">Price</th>
                <th className="py-2 text-right">Line total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.productId} className="border-b border-slate-100">
                  <td className="py-2.5 pr-3 font-medium text-slate-800">{item.name}</td>
                  <td className="py-2.5 text-center">{item.quantity}</td>
                  <td className="py-2.5 text-right">₹{item.unitPrice}</td>
                  <td className="py-2.5 text-right font-bold">₹{(item.unitPrice * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end">
          <div className="w-full sm:w-64 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>₹{Number(order.subtotal ?? order.totalAmount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Delivery</span>
              <span>{Number(order.shippingFee) > 0 ? `₹${order.shippingFee}` : 'FREE'}</span>
            </div>
            <div className="flex justify-between text-sm font-black text-slate-900 border-t border-slate-200 pt-2">
              <span>Total</span>
              <span>₹{Number(order.totalAmount).toFixed(2)}</span>
            </div>
            <p className="text-[10px] text-slate-400 text-right">Inclusive of all taxes</p>
          </div>
        </div>

        <p className="text-[10px] text-slate-400 border-t border-slate-100 pt-3">
          This is a computer-generated invoice. For returns within {STORE_INFO.returnsWindowDays} days, contact{' '}
          {STORE_INFO.email} with your order ID.
        </p>
      </div>
    </div>
  );
}

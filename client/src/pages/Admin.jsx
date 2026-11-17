import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  fetchAdminStats,
  fetchAdminProducts,
  fetchAdminOrders,
  createProduct,
  updateProduct,
  deleteProduct,
  updateOrderStatus,
  updateOrderPayment,
  resendOrderEmail
} from '../services/api';
import {
  BarChart3,
  Boxes,
  ClipboardList,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  Mail,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  IndianRupee,
  Users
} from 'lucide-react';

const ORDER_STATUSES = ['Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled'];
const PAYMENT_OPTIONS = [
  { value: 'cod_pending', label: 'Cash on delivery' },
  { value: 'awaiting_payment', label: 'UPI pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' }
];
const CATEGORIES = [
  { value: 'npk', label: 'NPK & Macro' },
  { value: 'organic', label: 'Organic / Bio' },
  { value: 'micronutrient', label: 'Micronutrient' },
  { value: 'fungicide_pesticide', label: 'Fungicide / Pesticide' }
];

const EMPTY_PRODUCT = {
  name: '',
  category: 'npk',
  price: '',
  mrp: '',
  stock: 0,
  weight: '',
  image: '',
  description: '',
  dosage: '',
  suitableCrops: '',
  targetProblems: '',
  rating: 4.5,
  isActive: true
};

function toForm(product) {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    price: String(product.price),
    mrp: String(product.mrp ?? product.price),
    stock: product.stock,
    weight: product.weight || '',
    image: product.image || '',
    description: product.description || '',
    dosage: product.dosage || '',
    suitableCrops: (product.suitableCrops || []).join(', '),
    targetProblems: (product.targetProblems || []).join(', '),
    rating: product.rating ?? 4.5,
    isActive: product.isActive !== false
  };
}

function splitList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—';
}

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const [editor, setEditor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busyOrder, setBusyOrder] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, productsRes, ordersRes] = await Promise.all([
        fetchAdminStats(),
        fetchAdminProducts(),
        fetchAdminOrders()
      ]);
      if (statsRes.success) setStats(statsRes);
      if (productsRes.success) setProducts(productsRes.products);
      if (ordersRes.success) setOrders(ordersRes.orders);
      if (!statsRes.success || !productsRes.success || !ordersRes.success) {
        setError(statsRes.message || productsRes.message || ordersRes.message || 'Could not load admin data.');
      }
    } catch {
      setError('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') loadAll();
  }, [user, loadAll]);

  const flash = (type, text) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  };

  const lowStock = useMemo(
    () => products.filter((p) => p.isActive && p.stock <= 5).slice(0, 5),
    [products]
  );

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-agro-600" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;

  const handleSaveProduct = async (event) => {
    event.preventDefault();
    setSaving(true);
    const payload = {
      name: editor.name,
      category: editor.category,
      price: Number(editor.price),
      mrp: Number(editor.mrp || editor.price),
      stock: Number(editor.stock),
      weight: editor.weight,
      image: editor.image,
      description: editor.description,
      dosage: editor.dosage,
      suitableCrops: splitList(editor.suitableCrops),
      targetProblems: splitList(editor.targetProblems),
      rating: Number(editor.rating),
      isActive: editor.isActive
    };

    try {
      const res = editor.id ? await updateProduct(editor.id, payload) : await createProduct(payload);
      if (res.success) {
        flash('success', res.message || 'Product saved.');
        setEditor(null);
        await loadAll();
      } else {
        flash('error', res.message || 'Could not save the product.');
      }
    } catch {
      flash('error', 'Could not reach the server.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Remove "${product.name}" from the store?`)) return;
    const res = await deleteProduct(product.id);
    if (res.success) {
      flash('success', 'Product removed from the store.');
      await loadAll();
    } else {
      flash('error', res.message || 'Could not remove the product.');
    }
  };

  const changeStatus = async (order, status) => {
    setBusyOrder(order.id);
    try {
      const res = await updateOrderStatus(order.id, status);
      if (res.success) {
        setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, ...res.order } : o)));
        flash('success', `${order.id} marked ${status}.`);
      } else {
        flash('error', res.message || 'Could not update the order.');
      }
    } catch {
      flash('error', 'Could not reach the server.');
    } finally {
      setBusyOrder('');
    }
  };

  const changePayment = async (order, paymentStatus) => {
    setBusyOrder(order.id);
    try {
      const res = await updateOrderPayment(order.id, paymentStatus);
      if (res.success) {
        setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, ...res.order } : o)));
        flash('success', `Payment status for ${order.id} updated.`);
      } else {
        flash('error', res.message || 'Could not update payment.');
      }
    } catch {
      flash('error', 'Could not reach the server.');
    } finally {
      setBusyOrder('');
    }
  };

  const resendEmail = async (order) => {
    setBusyOrder(order.id);
    try {
      const res = await resendOrderEmail(order.id);
      flash(res.sent ? 'success' : 'error', res.message || 'Email request finished.');
      await loadAll();
    } catch {
      flash('error', 'Could not reach the server.');
    } finally {
      setBusyOrder('');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Store admin</h1>
          <p className="text-xs text-slate-500">
            Signed in as {user.email} • orders are emailed to the store inbox
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/shop"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <ExternalLink className="w-3.5 h-3.5" /> View storefront
          </Link>
          <button
            onClick={loadAll}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-agro-600 text-white rounded-xl text-xs font-bold hover:bg-agro-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {notice && (
        <div
          className={`flex items-start gap-2 p-3 rounded-xl border text-xs ${
            notice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {notice.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">{error}</div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'orders', label: `Orders (${orders.length})`, icon: ClipboardList },
          { id: 'products', label: `Products (${products.length})`, icon: Boxes }
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition ${
              tab === item.id ? 'bg-agro-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <item.icon className="w-4 h-4" /> {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-agro-600" />
        </div>
      ) : (
        <>
          {tab === 'overview' && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { label: 'Orders', value: stats.stats.orders, icon: ClipboardList, tone: 'bg-blue-50 text-blue-700' },
                  {
                    label: 'Revenue',
                    value: `₹${Number(stats.stats.revenue).toLocaleString('en-IN')}`,
                    icon: IndianRupee,
                    tone: 'bg-emerald-50 text-emerald-700'
                  },
                  { label: 'Open orders', value: stats.stats.openOrders, icon: Boxes, tone: 'bg-amber-50 text-amber-700' },
                  { label: 'Customers', value: stats.stats.customers, icon: Users, tone: 'bg-indigo-50 text-indigo-700' },
                  { label: 'Low stock', value: stats.stats.lowStock, icon: AlertTriangle, tone: 'bg-rose-50 text-rose-700' }
                ].map((card) => (
                  <div key={card.label} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.tone}`}>
                      <card.icon className="w-4 h-4" />
                    </div>
                    <div className="text-[11px] text-slate-500 font-semibold">{card.label}</div>
                    <div className="text-xl font-black text-slate-900">{card.value}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                  <h2 className="text-sm font-bold text-slate-900">Recent orders</h2>
                  {stats.recentOrders.length === 0 ? (
                    <p className="text-xs text-slate-500">No orders yet.</p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {stats.recentOrders.map((order) => (
                        <div key={order.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                          <div className="min-w-0">
                            <Link to={`/orders/${order.id}`} className="font-bold text-slate-900 hover:text-agro-700 font-mono">
                              {order.id}
                            </Link>
                            <div className="text-slate-500 truncate">
                              {order.customer?.name || order.shippingName} • {formatDate(order.createdAt)}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-bold text-slate-900">₹{order.totalAmount}</div>
                            <div className="text-[10px] text-slate-500">{order.status}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-agro-600" /> Recent order emails
                  </h2>
                  {stats.recentEmails.length === 0 ? (
                    <p className="text-xs text-slate-500">No emails attempted yet.</p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {stats.recentEmails.map((email) => (
                        <div key={email.id} className="py-2.5 text-xs space-y-0.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono font-bold text-slate-800">{email.orderId || '—'}</span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                email.status === 'sent'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : email.status === 'failed'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {email.status.replaceAll('_', ' ')}
                            </span>
                          </div>
                          <div className="text-slate-500 truncate">{email.subject}</div>
                          <div className="text-[10px] text-slate-400">to {email.recipient}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                    "Not configured" means SMTP is empty, so the order was saved but no email left the server.
                  </p>
                </div>
              </div>

              {lowStock.length > 0 && (
                <div className="bg-white border border-rose-200 rounded-2xl p-5 space-y-2">
                  <h2 className="text-sm font-bold text-rose-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Low stock
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {lowStock.map((product) => (
                      <div key={product.id} className="flex justify-between border border-slate-100 rounded-lg px-3 py-2">
                        <span className="truncate text-slate-700">{product.name}</span>
                        <span className="font-bold text-rose-700">{product.stock} left</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'products' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-500">Prices, stock and visibility update the storefront instantly.</p>
                <button
                  onClick={() => setEditor({ ...EMPTY_PRODUCT })}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-agro-600 text-white rounded-xl text-xs font-bold hover:bg-agro-700"
                >
                  <Plus className="w-4 h-4" /> Add product
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500 text-left">
                    <tr>
                      <th className="p-3">Product</th>
                      <th className="p-3">Category</th>
                      <th className="p-3 text-right">Price</th>
                      <th className="p-3 text-right">Stock</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id} className="border-t border-slate-100 align-middle">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <img
                              src={product.image}
                              alt=""
                              className="w-9 h-9 rounded-lg object-cover bg-slate-100"
                              onError={(e) => {
                                e.currentTarget.src = '/placeholder-product.svg';
                              }}
                            />
                            <div className="min-w-0">
                              <div className="font-bold text-slate-800 truncate max-w-[260px]">{product.name}</div>
                              <div className="text-[10px] text-slate-400">{product.weight || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-slate-600">{product.category}</td>
                        <td className="p-3 text-right font-bold">₹{product.price}</td>
                        <td className={`p-3 text-right font-bold ${product.stock <= 5 ? 'text-rose-600' : 'text-slate-700'}`}>
                          {product.stock}
                        </td>
                        <td className="p-3">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              product.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {product.isActive ? 'Active' : 'Hidden'}
                          </span>
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => setEditor(toForm(product))}
                            className="p-1.5 text-slate-500 hover:text-agro-700 hover:bg-agro-50 rounded-lg"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(product)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg ml-1"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'orders' && (
            <div className="space-y-4">
              {orders.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-sm text-slate-500">
                  No orders yet.
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-500 text-left">
                      <tr>
                        <th className="p-3">Order</th>
                        <th className="p-3">Customer</th>
                        <th className="p-3 text-right">Total</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Payment</th>
                        <th className="p-3 text-right">Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.id} className="border-t border-slate-100 align-top">
                          <td className="p-3">
                            <Link to={`/orders/${order.id}`} className="font-mono font-bold text-agro-700 hover:underline">
                              {order.id}
                            </Link>
                            <div className="text-[10px] text-slate-400">{formatDate(order.createdAt)}</div>
                            <div className="text-[10px] text-slate-500 max-w-[160px]">
                              {order.items.map((i) => `${i.name} ×${i.quantity}`).join(', ')}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-800">{order.customer?.name || order.shippingName}</div>
                            <div className="text-[10px] text-slate-500">{order.shippingPhone}</div>
                            <div className="text-[10px] text-slate-400 max-w-[180px]">
                              {order.shippingAddress?.address || order.shippingAddress}
                              {order.shippingAddress?.pincode ? ` — ${order.shippingAddress.pincode}` : ''}
                            </div>
                          </td>
                          <td className="p-3 text-right font-bold">₹{order.totalAmount}</td>
                          <td className="p-3">
                            <select
                              value={order.status}
                              disabled={busyOrder === order.id}
                              onChange={(e) => changeStatus(order, e.target.value)}
                              className="border border-slate-300 rounded-lg px-2 py-1 text-[11px] bg-white"
                            >
                              {ORDER_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-3">
                            <select
                              value={order.paymentStatus}
                              disabled={busyOrder === order.id}
                              onChange={(e) => changePayment(order, e.target.value)}
                              className="border border-slate-300 rounded-lg px-2 py-1 text-[11px] bg-white"
                            >
                              {PAYMENT_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <div className="text-[10px] text-slate-400 mt-1 max-w-[120px]">{order.paymentMethod}</div>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => resendEmail(order)}
                              disabled={busyOrder === order.id}
                              className="inline-flex items-center gap-1 px-2 py-1.5 border border-slate-300 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                            >
                              <Mail className="w-3 h-3" /> Resend
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {editor && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-start justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveProduct}
            className="bg-white rounded-2xl w-full max-w-2xl p-6 space-y-4 my-8"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">{editor.id ? 'Edit product' : 'New product'}</h2>
              <button type="button" onClick={() => setEditor(null)} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="sm:col-span-2 text-xs font-bold text-slate-700">
                Name
                <input
                  required
                  maxLength={140}
                  value={editor.name}
                  onChange={(e) => setEditor({ ...editor, name: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-normal"
                />
              </label>
              <label className="text-xs font-bold text-slate-700">
                Category
                <select
                  value={editor.category}
                  onChange={(e) => setEditor({ ...editor, category: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-normal"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold text-slate-700">
                Pack size
                <input
                  value={editor.weight}
                  onChange={(e) => setEditor({ ...editor, weight: e.target.value })}
                  placeholder="500g / 1L"
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-normal"
                />
              </label>
              <label className="text-xs font-bold text-slate-700">
                Selling price (₹)
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={editor.price}
                  onChange={(e) => setEditor({ ...editor, price: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-normal"
                />
              </label>
              <label className="text-xs font-bold text-slate-700">
                MRP (₹)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editor.mrp}
                  onChange={(e) => setEditor({ ...editor, mrp: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-normal"
                />
              </label>
              <label className="text-xs font-bold text-slate-700">
                Stock (units)
                <input
                  required
                  type="number"
                  min="0"
                  step="1"
                  value={editor.stock}
                  onChange={(e) => setEditor({ ...editor, stock: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-normal"
                />
              </label>
              <label className="text-xs font-bold text-slate-700">
                Rating (0-5)
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={editor.rating}
                  onChange={(e) => setEditor({ ...editor, rating: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-normal"
                />
              </label>
              <label className="sm:col-span-2 text-xs font-bold text-slate-700">
                Image URL
                <input
                  value={editor.image}
                  onChange={(e) => setEditor({ ...editor, image: e.target.value })}
                  placeholder="https://... or /uploads/pack.jpg"
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-normal"
                />
              </label>
              <label className="sm:col-span-2 text-xs font-bold text-slate-700">
                Description
                <textarea
                  rows={2}
                  maxLength={2000}
                  value={editor.description}
                  onChange={(e) => setEditor({ ...editor, description: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-normal resize-none"
                />
              </label>
              <label className="sm:col-span-2 text-xs font-bold text-slate-700">
                Dosage & application
                <textarea
                  rows={2}
                  maxLength={500}
                  value={editor.dosage}
                  onChange={(e) => setEditor({ ...editor, dosage: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-normal resize-none"
                />
              </label>
              <label className="text-xs font-bold text-slate-700">
                Suitable crops (comma separated)
                <input
                  value={editor.suitableCrops}
                  onChange={(e) => setEditor({ ...editor, suitableCrops: e.target.value })}
                  placeholder="Tomato, Chilli, Paddy"
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-normal"
                />
              </label>
              <label className="text-xs font-bold text-slate-700">
                Controls (comma separated)
                <input
                  value={editor.targetProblems}
                  onChange={(e) => setEditor({ ...editor, targetProblems: e.target.value })}
                  placeholder="Leaf spot, Blight"
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-normal"
                />
              </label>
            </div>

            <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={editor.isActive}
                onChange={(e) => setEditor({ ...editor, isActive: e.target.checked })}
                className="w-4 h-4 accent-agro-600"
              />
              Visible in the shop
            </label>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditor(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-agro-600 text-white rounded-xl text-xs font-bold disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save product'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

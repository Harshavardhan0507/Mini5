import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { placeOrder, fetchProducts } from '../services/api';
import { STORE_INFO } from '../data/storeInfo';
import {
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  ShieldCheck,
  Truck
} from 'lucide-react';

const PAYMENT_COD = 'cod';
const PAYMENT_UPI = 'upi';

export default function Cart() {
  const { cart, removeFromCart, updateQuantity, clearCart, cartTotal, refreshCartProducts } = useCart();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [shippingDetails, setShippingDetails] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: '',
    pincode: '',
    paymentMethod: PAYMENT_COD
  });

  const [loading, setLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [orderError, setOrderError] = useState('');

  // Prices and stock may have changed since the cart was saved locally
  useEffect(() => {
    let active = true;
    async function sync() {
      try {
        const res = await fetchProducts('all');
        if (active && res.success && res.products) {
          refreshCartProducts(res.products);
        }
      } catch (error) {
        console.warn('Could not refresh cart prices:', error);
      }
    }
    sync();
    return () => {
      active = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user) {
      setShippingDetails((prev) => ({
        ...prev,
        name: prev.name || user.name || '',
        phone: prev.phone || user.phone || ''
      }));
    }
  }, [user]);

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setOrderError('');

    if (!user) {
      setOrderError('Please log in to place an order.');
      return;
    }

    setLoading(true);
    try {
      const orderPayload = {
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity
        })),
        shippingAddress: {
          name: shippingDetails.name,
          phone: shippingDetails.phone,
          address: shippingDetails.address,
          pincode: shippingDetails.pincode
        },
        paymentMethod: shippingDetails.paymentMethod
      };

      const res = await placeOrder(orderPayload);
      if (res.success && res.order) {
        setOrderSuccess({ order: res.order, notification: res.notification });
        clearCart();
      } else {
        setOrderError(res.message || 'Order failed. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setOrderError('Connection error. Please check the server is running and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (orderSuccess) {
    const { order, notification } = orderSuccess;
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full mx-auto flex items-center justify-center">
          <CheckCircle className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-slate-900">{t.cart.successMsg}</h2>
          <p className="text-sm text-slate-600">
            Order Reference: <strong className="text-agro-700 font-mono text-base">{order.id}</strong>
          </p>
          <p className="text-xs text-slate-500">
            Payment: {order.paymentMethod} • Total: ₹{order.totalAmount}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 text-left text-xs text-slate-600 space-y-2">
          <p className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-agro-600 shrink-0" />
            {notification?.sent
              ? `A copy of this order has been emailed to ${STORE_INFO.email}.`
              : 'Your order is saved and waiting for the store team.'}
          </p>
          <p className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-agro-600 shrink-0" />
            Expected delivery in {STORE_INFO.deliveryTime} across {STORE_INFO.deliveryArea}.
          </p>
          {order.paymentMethod?.startsWith('UPI') && (
            <p className="flex items-start gap-2 text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                UPI order: we will share payment details on your mobile number. Your order is confirmed once
                payment is received.
              </span>
            </p>
          )}
        </div>

        <div className="pt-2 flex flex-wrap justify-center gap-3">
          <Link
            to={`/orders/${order.id}`}
            className="px-6 py-3 bg-agro-600 hover:bg-agro-700 text-white rounded-xl font-bold text-sm shadow-md transition"
          >
            View order
          </Link>
          <Link
            to="/dashboard"
            className="px-6 py-3 bg-white border border-slate-300 text-slate-800 rounded-xl font-bold text-sm hover:bg-slate-50 transition"
          >
            {t.cart.backToDash}
          </Link>
          <Link
            to="/shop"
            className="px-6 py-3 bg-white border border-slate-300 text-slate-800 rounded-xl font-bold text-sm hover:bg-slate-50 transition"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-20 h-20 bg-agro-50 text-agro-600 rounded-full mx-auto flex items-center justify-center">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">{t.cart.empty}</h2>
        <p className="text-sm text-slate-500">Add fertilizers and pest treatments to protect your crop yield.</p>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 px-6 py-3 bg-agro-600 hover:bg-agro-700 text-white rounded-xl font-bold text-sm shadow-md transition"
        >
          <span>{t.cart.browseShop}</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{t.cart.title}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Cart Items List */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs divide-y divide-slate-100 space-y-4">
          {cart.map((item) => (
            <div key={item.product.id} className="pt-4 first:pt-0 flex items-center gap-4">
              <Link to={`/product/${item.product.id}`} className="shrink-0">
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  className="w-20 h-20 rounded-2xl object-cover bg-slate-100"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder-product.svg';
                  }}
                />
              </Link>

              <div className="flex-1 min-w-0">
                <Link
                  to={`/product/${item.product.id}`}
                  className="font-bold text-sm text-slate-900 truncate hover:text-agro-700 block"
                >
                  {item.product.name}
                </Link>
                <div className="text-xs text-slate-500 mt-0.5">
                  ₹{item.product.price} each • {item.product.weight || 'Standard pack'}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {item.product.stock} in stock
                </div>
                <div className="text-sm font-black text-slate-900 mt-1">
                  ₹{(item.product.price * item.quantity).toFixed(2)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden bg-slate-50">
                  <button
                    onClick={() => updateQuantity(item.product.id, -1)}
                    className="p-1.5 hover:bg-slate-200 text-slate-600 transition"
                    aria-label={`Decrease quantity of ${item.product.name}`}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-3 text-xs font-bold text-slate-800" aria-label={`Quantity: ${item.quantity}`}>
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.product.id, 1)}
                    disabled={item.quantity >= Number(item.product.stock)}
                    className="p-1.5 hover:bg-slate-200 disabled:opacity-40 text-slate-600 transition"
                    aria-label={`Increase quantity of ${item.product.name}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => removeFromCart(item.product.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 transition"
                  aria-label={`Remove ${item.product.name} from cart`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Checkout Form & Order Summary */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-5">
            <h3 className="font-bold text-base text-slate-900 pb-3 border-b border-slate-100">
              {t.cart.checkoutTitle}
            </h3>

            {orderError && (
              <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{orderError}</span>
              </div>
            )}

            {!user && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                <strong>Login required</strong> to place an order.{' '}
                <Link to="/login" className="underline font-bold">Log in here</Link>
              </div>
            )}

            <form onSubmit={handleCheckoutSubmit} className="space-y-4">
              <div>
                <label htmlFor="shipping-name" className="block text-xs font-bold text-slate-700 mb-1">
                  {t.cart.farmerName} *
                </label>
                <input
                  id="shipping-name"
                  type="text"
                  required
                  maxLength={80}
                  value={shippingDetails.name}
                  onChange={(e) => setShippingDetails({ ...shippingDetails, name: e.target.value })}
                  placeholder="Farmer name"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-agro-500 focus:bg-white"
                />
              </div>

              <div>
                <label htmlFor="shipping-phone" className="block text-xs font-bold text-slate-700 mb-1">
                  {t.cart.phone} *
                </label>
                <input
                  id="shipping-phone"
                  type="tel"
                  required
                  pattern="[6-9][0-9]{9}"
                  maxLength={10}
                  value={shippingDetails.phone}
                  onChange={(e) => setShippingDetails({ ...shippingDetails, phone: e.target.value })}
                  placeholder="10-digit mobile number"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-agro-500 focus:bg-white"
                />
                <p className="text-[10px] text-slate-400 mt-1">We call this number to confirm delivery.</p>
              </div>

              <div>
                <label htmlFor="shipping-address" className="block text-xs font-bold text-slate-700 mb-1">
                  {t.cart.address} *
                </label>
                <textarea
                  id="shipping-address"
                  required
                  rows={2}
                  minLength={10}
                  maxLength={500}
                  value={shippingDetails.address}
                  onChange={(e) => setShippingDetails({ ...shippingDetails, address: e.target.value })}
                  placeholder="House / field, village, landmark, district"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-agro-500 focus:bg-white resize-none"
                />
              </div>

              <div>
                <label htmlFor="shipping-pincode" className="block text-xs font-bold text-slate-700 mb-1">
                  PIN Code *
                </label>
                <input
                  id="shipping-pincode"
                  type="text"
                  inputMode="numeric"
                  required
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={shippingDetails.pincode}
                  onChange={(e) =>
                    setShippingDetails({ ...shippingDetails, pincode: e.target.value.replace(/\D/g, '') })
                  }
                  placeholder="6-digit PIN code"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-agro-500 focus:bg-white"
                />
              </div>

              <div>
                <label htmlFor="payment-method" className="block text-xs font-bold text-slate-700 mb-1">
                  {t.cart.paymentMethod}
                </label>
                <select
                  id="payment-method"
                  value={shippingDetails.paymentMethod}
                  onChange={(e) => setShippingDetails({ ...shippingDetails, paymentMethod: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-agro-500"
                >
                  <option value={PAYMENT_COD}>Cash on Delivery (Pay at Farm)</option>
                  <option value={PAYMENT_UPI}>UPI / Online Payment</option>
                </select>
              </div>

              {shippingDetails.paymentMethod === PAYMENT_UPI && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 space-y-1">
                  <p className="font-bold">How UPI payment works</p>
                  {STORE_INFO.upiId ? (
                    <p>Pay to <strong>{STORE_INFO.upiId}</strong> and mention your order ID in the note.</p>
                  ) : (
                    <p>
                      Place the order and our team will share the UPI ID / payment link on your mobile number.
                      Your order is packed after payment is received.
                    </p>
                  )}
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>{t.cart.subtotal}</span>
                  <span className="font-semibold text-slate-900">₹{cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>{t.cart.delivery}</span>
                  <span className="font-bold text-emerald-600">{t.cart.free}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-100">
                  <span>{t.cart.total}</span>
                  <span className="text-agro-700">₹{cartTotal.toFixed(2)}</span>
                </div>
                <p className="text-[10px] text-slate-400 text-right">Inclusive of all taxes</p>
              </div>

              <button
                type="submit"
                disabled={loading || !user}
                className="w-full py-3 bg-agro-600 hover:bg-agro-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm shadow-md transition active:scale-98 flex items-center justify-center gap-2"
              >
                <span>{loading ? 'Placing order...' : t.cart.placeOrder}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

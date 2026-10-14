import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { placeOrder } from '../services/api';
import {
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

export default function Cart() {
  const { cart, removeFromCart, updateQuantity, clearCart, cartTotal } = useCart();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [shippingDetails, setShippingDetails] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.farmLocation ? `Farm at ${user.farmLocation}` : '',
    paymentMethod: 'Cash on Delivery (Pay at Farm)'
  });

  const [loading, setLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [orderError, setOrderError] = useState('');

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setOrderError('');

    // Require login before placing order
    if (!user) {
      setOrderError('Please log in to place an order.');
      return;
    }

    setLoading(true);
    try {
      // Send productId + quantity — server recomputes total from products.json
      const orderPayload = {
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity
        })),
        shippingAddress: {
          name: shippingDetails.name,
          phone: shippingDetails.phone,
          address: shippingDetails.address
        },
        paymentMethod: shippingDetails.paymentMethod
      };

      const res = await placeOrder(orderPayload);
      if (res.success && res.order) {
        setOrderSuccess(res.order);
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
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full mx-auto flex items-center justify-center">
          <CheckCircle className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-slate-900">
            {t.cart.successMsg}
          </h2>
          <p className="text-sm text-slate-600">
            Order Reference: <strong className="text-agro-700 font-mono text-base">{orderSuccess.id}</strong>
          </p>
          <p className="text-xs text-slate-500">
            Payment: {orderSuccess.paymentMethod} • Total: ₹{orderSuccess.totalAmount}
          </p>
        </div>

        <div className="pt-4 flex justify-center gap-3">
          <Link
            to="/dashboard"
            className="px-6 py-3 bg-agro-600 hover:bg-agro-700 text-white rounded-xl font-bold text-sm shadow-md transition"
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
      <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
        {t.cart.title}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Cart Items List */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs divide-y divide-slate-100 space-y-4">
          {cart.map((item) => (
            <div key={item.product.id} className="pt-4 first:pt-0 flex items-center gap-4">
              <img
                src={item.product.image}
                alt={item.product.name}
                className="w-20 h-20 rounded-2xl object-cover bg-slate-100 shrink-0"
              />

              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm text-slate-900 truncate">
                  {item.product.name}
                </h3>
                <div className="text-xs text-slate-500 mt-0.5">
                  ₹{item.product.price} each • {item.product.weight || 'Standard pack'}
                </div>
                <div className="text-sm font-black text-slate-900 mt-1">
                  ₹{item.product.price * item.quantity}
                </div>
              </div>

              {/* Quantity controls */}
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
                    className="p-1.5 hover:bg-slate-200 text-slate-600 transition"
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

            {/* Inline error message instead of alert() */}
            {orderError && (
              <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{orderError}</span>
              </div>
            )}

            {/* Login prompt if not authenticated */}
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
                  value={shippingDetails.phone}
                  onChange={(e) => setShippingDetails({ ...shippingDetails, phone: e.target.value })}
                  placeholder="10-digit mobile number"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-agro-500 focus:bg-white"
                />
              </div>

              <div>
                <label htmlFor="shipping-address" className="block text-xs font-bold text-slate-700 mb-1">
                  {t.cart.address} *
                </label>
                <textarea
                  id="shipping-address"
                  required
                  rows={2}
                  value={shippingDetails.address}
                  onChange={(e) => setShippingDetails({ ...shippingDetails, address: e.target.value })}
                  placeholder="Village, Landmark, District, Pincode"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-agro-500 focus:bg-white resize-none"
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
                  <option value="Cash on Delivery (Pay at Farm)">{t.cart.cod}</option>
                  <option value="UPI / Online Payment">{t.cart.upi}</option>
                </select>
              </div>

              {/* Price summary */}
              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>{t.cart.subtotal}</span>
                  <span className="font-semibold text-slate-900">₹{cartTotal}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>{t.cart.delivery}</span>
                  <span className="font-bold text-emerald-600">{t.cart.free}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-100">
                  <span>{t.cart.total}</span>
                  <span className="text-agro-700">₹{cartTotal}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !user}
                className="w-full py-3 bg-agro-600 hover:bg-agro-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm shadow-md transition active:scale-98 flex items-center justify-center gap-2"
              >
                <span>{loading ? 'Processing Order...' : t.cart.placeOrder}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

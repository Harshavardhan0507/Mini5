import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { fetchUserOrders, fetchProducts } from '../services/api';
import ChatbotWindow from '../components/ChatbotWindow';
import ProductCard from '../components/ProductCard';
import {
  Bot,
  Package,
  Activity,
  MapPin,
  Sparkles,
  ShoppingBag,
  Clock,
  ArrowUpRight,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [seasonalProducts, setSeasonalProducts] = useState([]);
  const [activeTab, setActiveTab] = useState('chatbot'); // 'chatbot' | 'orders'

  useEffect(() => {
    async function loadData() {
      if (user?.id) {
        try {
          const res = await fetchUserOrders(user.id);
          if (res.success && res.orders) {
            setOrders(res.orders);
          }
        } catch (e) {
          console.error('Failed to load user orders:', e);
        }
      }

      try {
        const prodRes = await fetchProducts('all');
        if (prodRes.success && prodRes.products) {
          setSeasonalProducts(prodRes.products.slice(0, 3));
        }
      } catch (e) {
        console.error('Failed to load seasonal products:', e);
      }
    }
    loadData();
  }, [user]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Welcome Banner */}
      <div className="bg-gradient-to-r from-agro-800 via-agro-700 to-agro-900 text-white rounded-3xl p-6 sm:p-8 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-white/10 backdrop-blur-xs text-agro-200 text-xs font-bold rounded-full">
              🌾 Farmer Portal
            </span>
            {user?.farmLocation && (
              <span className="flex items-center gap-1 text-xs text-agro-200 font-medium">
                <MapPin className="w-3.5 h-3.5" />
                {user.farmLocation}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {t.dashboard.welcome}, {user?.name || 'Farmer'}!
          </h1>
          <p className="text-sm text-agro-100/90 max-w-xl">
            {t.dashboard.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/chatbot"
            className="flex items-center gap-2 px-5 py-3 bg-white text-agro-900 hover:bg-agro-50 rounded-xl text-xs sm:text-sm font-bold shadow-md transition"
          >
            <Bot className="w-4 h-4 text-agro-600" />
            <span>Full-Screen Chatbot</span>
          </Link>
          <Link
            to="/shop"
            className="flex items-center gap-2 px-5 py-3 bg-agro-600 hover:bg-agro-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Visit Shop</span>
          </Link>
        </div>
      </div>

      {/* Quick Statistics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-agro-100 text-agro-700 flex items-center justify-center shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">{t.dashboard.statScans}</div>
            <div className="text-2xl font-black text-slate-900">12 Scans</div>
            <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> 100% Diagnostic Accuracy
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">{t.dashboard.statOrders}</div>
            <div className="text-2xl font-black text-slate-900">{orders.length} Placed</div>
            <div className="text-[10px] text-slate-400">Direct village delivery</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">{t.dashboard.statSavings}</div>
            <div className="text-2xl font-black text-slate-900">98.5%</div>
            <div className="text-[10px] text-emerald-600 font-bold">Crop yield protection</div>
          </div>
        </div>
      </div>

      {/* Main Feature Tabs: AI Chatbot vs Recent Orders */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('chatbot')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition ${
              activeTab === 'chatbot'
                ? 'bg-agro-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>AI Plant Doctor Chatbot</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-300 text-amber-950">
              Live
            </span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition ${
              activeTab === 'orders'
                ? 'bg-agro-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>{t.dashboard.recentOrders} ({orders.length})</span>
          </button>
        </div>

        {/* Tab 1: Embedded Chatbot Feature on Dashboard */}
        {activeTab === 'chatbot' && (
          <div className="space-y-4">
            <div className="p-4 bg-agro-50 border border-agro-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-agro-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-agro-600" />
                  {t.dashboard.quickScanTitle}
                </h3>
                <p className="text-xs text-agro-700">
                  {t.dashboard.quickScanDesc}
                </p>
              </div>
              <span className="text-xs font-semibold text-agro-800 bg-white px-3 py-1.5 rounded-xl border border-agro-200 shrink-0">
                Language: Telugu • Kannada • Hindi • English
              </span>
            </div>

            <ChatbotWindow compact={true} />
          </div>
        )}

        {/* Tab 2: Orders Section */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900">{t.dashboard.recentOrders}</h3>

            {orders.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <Package className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="text-sm text-slate-500">{t.dashboard.noOrders}</p>
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-agro-600 hover:bg-agro-700 text-white rounded-xl text-xs font-bold"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Browse Shop</span>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {orders.map((order) => (
                  <div key={order.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{order.id}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800">
                          {order.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{order.paymentMethod}</span>
                      </div>
                      <div className="text-xs text-slate-600">
                        {order.items.map((i) => `${i.product.name} (x${i.quantity})`).join(', ')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-slate-900">₹{order.totalAmount}</div>
                      <span className="text-[10px] text-slate-400">Total Paid/COD</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recommended Fertilizers for this Season */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Recommended Fertilizers for Your Soil</h3>
            <p className="text-xs text-slate-500">Formulated for higher yield and root strength</p>
          </div>
          <Link to="/shop" className="text-xs font-bold text-agro-600 hover:underline flex items-center gap-1">
            <span>Explore All</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {seasonalProducts.map((prod) => (
            <ProductCard key={prod.id} product={prod} />
          ))}
        </div>
      </div>
    </div>
  );
}

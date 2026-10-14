import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from './LanguageSelector';
import { Sprout, ShoppingCart, Bot, User, LogOut, Menu, X, LayoutDashboard } from 'lucide-react';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { cartCount, lastAddedItem } = useCart();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      {/* Toast alert for item added to cart */}
      {lastAddedItem && (
        <div className="bg-agro-600 text-white text-xs py-1 px-4 text-center font-medium animate-pulse">
          🛒 Added to Cart: {lastAddedItem}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-agro-600 to-agro-400 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-agro-900 group-hover:text-agro-600 transition">
                {t.nav.brand}
              </span>
              <span className="block text-[10px] uppercase tracking-widest font-semibold text-agro-600">
                Agro & Plant Care
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1 font-medium text-sm">
            <Link
              to="/"
              className={`px-3 py-2 rounded-lg transition ${
                isActive('/') ? 'text-agro-700 bg-agro-50 font-bold' : 'text-slate-600 hover:text-agro-600 hover:bg-slate-50'
              }`}
            >
              {t.nav.home}
            </Link>
            <Link
              to="/shop"
              className={`px-3 py-2 rounded-lg transition ${
                isActive('/shop') ? 'text-agro-700 bg-agro-50 font-bold' : 'text-slate-600 hover:text-agro-600 hover:bg-slate-50'
              }`}
            >
              {t.nav.shop}
            </Link>
            <Link
              to="/chatbot"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition ${
                isActive('/chatbot')
                  ? 'text-white bg-agro-600 font-bold shadow-sm'
                  : 'text-agro-700 bg-agro-50/70 hover:bg-agro-100'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>{t.nav.aiDoctor}</span>
            </Link>
            {isAuthenticated && (
              <Link
                to="/dashboard"
                className={`flex items-center gap-1 px-3 py-2 rounded-lg transition ${
                  isActive('/dashboard') ? 'text-agro-700 bg-agro-50 font-bold' : 'text-slate-600 hover:text-agro-600 hover:bg-slate-50'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>{t.nav.dashboard}</span>
              </Link>
            )}
          </nav>

          {/* Right Action Items */}
          <div className="flex items-center gap-3">
            <LanguageSelector />

            {/* Shopping Cart Button */}
            <Link
              to="/cart"
              className="relative p-2 text-slate-700 hover:text-agro-600 hover:bg-slate-100 rounded-lg transition"
              title={t.nav.cart}
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* Auth Buttons */}
            {isAuthenticated ? (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  to="/dashboard"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  <User className="w-3.5 h-3.5 text-agro-600" />
                  <span>{user?.name?.split(' ')[0]}</span>
                </Link>
                <button
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  title={t.nav.logout}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 text-sm font-semibold text-slate-700 hover:text-agro-600 transition"
                >
                  {t.nav.login}
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-1.5 text-sm font-semibold text-white bg-agro-600 hover:bg-agro-700 rounded-lg shadow-sm transition"
                >
                  {t.nav.signup}
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-4 space-y-2">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-slate-700 font-medium hover:bg-slate-50"
          >
            {t.nav.home}
          </Link>
          <Link
            to="/shop"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-slate-700 font-medium hover:bg-slate-50"
          >
            {t.nav.shop}
          </Link>
          <Link
            to="/chatbot"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg bg-agro-50 text-agro-700 font-bold"
          >
            {t.nav.aiDoctor}
          </Link>
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-slate-700 font-medium hover:bg-slate-50"
              >
                {t.nav.dashboard}
              </Link>
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                  navigate('/');
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-red-600 font-medium hover:bg-red-50"
              >
                {t.nav.logout}
              </button>
            </>
          ) : (
            <div className="pt-2 flex gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center py-2 text-sm font-semibold border border-slate-300 rounded-lg"
              >
                {t.nav.login}
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center py-2 text-sm font-semibold bg-agro-600 text-white rounded-lg"
              >
                {t.nav.signup}
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

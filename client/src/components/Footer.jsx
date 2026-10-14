import { useLanguage } from '../context/LanguageContext';
import { Sprout, ShieldCheck, Truck, Headphones } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-slate-900 text-slate-300 pt-12 pb-8 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Value props banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-10 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-agro-900/60 text-agro-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-white">100% Certified Fertilizers</h4>
              <p className="text-xs text-slate-400">Government approved NPK & bio-nutrients</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-agro-900/60 text-agro-400 flex items-center justify-center shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-white">Direct Farm Delivery</h4>
              <p className="text-xs text-slate-400">Express delivery to villages & fields</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-agro-900/60 text-agro-400 flex items-center justify-center shrink-0">
              <Headphones className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-white">Kisan AI 24/7 Helpline</h4>
              <p className="text-xs text-slate-400">Telugu, Kannada, Hindi & English crop advice</p>
            </div>
          </div>
        </div>

        {/* Links section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 py-10">
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-agro-600 flex items-center justify-center text-white">
                <Sprout className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold text-white">{t.nav.brand}</span>
            </div>
            <p className="text-sm text-slate-400 max-w-sm">
              Empowering farmers across India with AI-powered plant disease vision diagnostics and certified fertilizers tailored for high crop yield.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link to="/" className="hover:text-agro-400 transition">{t.nav.home}</Link></li>
              <li><Link to="/shop" className="hover:text-agro-400 transition">{t.nav.shop}</Link></li>
              <li><Link to="/chatbot" className="hover:text-agro-400 transition">{t.nav.aiDoctor}</Link></li>
              <li><Link to="/dashboard" className="hover:text-agro-400 transition">{t.nav.dashboard}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Regional Support</h4>
            <p className="text-xs text-slate-400 mb-2">Available Languages:</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2.5 py-1 bg-slate-800 rounded-md text-agro-300 font-medium">తెలుగు (Telugu)</span>
              <span className="px-2.5 py-1 bg-slate-800 rounded-md text-agro-300 font-medium">ಕನ್ನಡ (Kannada)</span>
              <span className="px-2.5 py-1 bg-slate-800 rounded-md text-agro-300 font-medium">हिंदी (Hindi)</span>
              <span className="px-2.5 py-1 bg-slate-800 rounded-md text-agro-300 font-medium">English</span>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800 text-center text-xs text-slate-500">
          © 2026 KisanAgro E-Commerce & AI Diagnostics. Designed for Farmers & Agri-dealers.
        </div>
      </div>
    </footer>
  );
}

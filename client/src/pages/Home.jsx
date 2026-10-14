import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { fetchProducts } from '../services/api';
import ProductCard from '../components/ProductCard';
import { Bot, Sprout, ShieldCheck, Languages, ArrowRight, Zap, Sparkles } from 'lucide-react';

export default function Home() {
  const { t } = useLanguage();
  const [popularProducts, setPopularProducts] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetchProducts('all');
        if (res.success && res.products) {
          setPopularProducts(res.products.slice(0, 4));
        }
      } catch (e) {
        console.error('Failed to load products:', e);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-agro-50 via-white to-slate-50 pt-12 pb-16 border-b border-agro-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-agro-100 border border-agro-300/60 text-agro-800 text-xs sm:text-sm font-bold shadow-2xs">
                <span>{t.home.badge}</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-[1.15]">
                {t.home.heroTitle}
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                {t.home.heroSubtitle}
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <Link
                  to="/chatbot"
                  className="flex items-center justify-center gap-2 px-6 py-3.5 bg-agro-600 hover:bg-agro-700 active:scale-98 text-white rounded-xl font-bold shadow-md transition"
                >
                  <Bot className="w-5 h-5" />
                  <span>{t.home.scanBtn}</span>
                </Link>

                <Link
                  to="/shop"
                  className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded-xl font-bold shadow-xs transition"
                >
                  <Sprout className="w-5 h-5 text-agro-600" />
                  <span>{t.home.shopBtn}</span>
                </Link>
              </div>

              {/* Regional language badge */}
              <div className="pt-2 flex items-center gap-2 text-xs text-slate-500 font-medium">
                <Languages className="w-4 h-4 text-agro-600" />
                <span>Available in: <strong>తెలుగు</strong>, <strong>ಕನ್ನಡ</strong>, <strong>हिंदी</strong>, &amp; <strong>English</strong></span>
              </div>
            </div>

            {/* Right Visual Card — clearly labelled sample diagnosis */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md bg-white rounded-3xl p-5 shadow-xl border border-slate-200">
                <div className="relative rounded-2xl overflow-hidden aspect-4/3 mb-4">
                  <img
                    src="https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=700&q=80"
                    alt="Sample crop leaf diagnosis"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-4">
                    <div className="text-white">
                      {/* Clearly labelled SAMPLE — not a real live diagnosis */}
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-slate-600 rounded-md">
                        Sample Demo
                      </span>
                      <h4 className="text-sm font-bold mt-1">ఆకు మచ్చల తెగులు (Telugu Diagnosis)</h4>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-agro-50 rounded-xl border border-agro-200/80">
                    <div className="flex items-center justify-between text-xs font-bold text-agro-900 mb-1">
                      <span>Sample Recommendation:</span>
                      <span className="text-agro-700">Copper Oxychloride 50% WP</span>
                    </div>
                    <p className="text-[11px] text-agro-800">
                      This is a demo card. Upload your own leaf photo for a real diagnosis.
                    </p>
                  </div>

                  <Link
                    to="/chatbot"
                    className="w-full py-2.5 bg-agro-600 hover:bg-agro-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition"
                  >
                    <span>Diagnose Your Plant</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
            {t.home.featuresTitle}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-agro-100 text-agro-700 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-900 mb-2">{t.home.f1Title}</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{t.home.f1Desc}</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
              <Languages className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-900 mb-2">{t.home.f2Title}</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{t.home.f2Desc}</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-900 mb-2">{t.home.f3Title}</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{t.home.f3Desc}</p>
          </div>
        </div>
      </section>

      {/* Popular Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              {t.home.popularTitle}
            </h2>
            <p className="text-sm text-slate-500 mt-1">High-grade bio and chemical nutrients for maximum field output</p>
          </div>
          <Link
            to="/shop"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-agro-600 hover:text-agro-700"
          >
            <span>View All Fertilizers</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {popularProducts.map((prod) => (
            <ProductCard key={prod.id} product={prod} />
          ))}
        </div>
      </section>

      {/* AI Doctor Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-agro-900 to-agro-800 text-white rounded-3xl p-8 sm:p-12 shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl">
            <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-amber-300">
              <Sparkles className="w-3.5 h-3.5" /> 24/7 Agro AI Support
            </span>
            <h3 className="text-2xl sm:text-4xl font-black tracking-tight">
              Have a sick crop or yellow leaves?
            </h3>
            <p className="text-sm sm:text-base text-agro-100/90 leading-relaxed">
              Take a photo with your mobile phone, upload it, and receive an instant diagnosis in Telugu, Kannada, Hindi, or English.
            </p>
          </div>
          <Link
            to="/chatbot"
            className="px-8 py-4 bg-white text-agro-900 hover:bg-agro-50 active:scale-95 rounded-2xl font-black text-sm shadow-lg transition shrink-0"
          >
            Launch AI Crop Doctor
          </Link>
        </div>
      </section>
    </div>
  );
}

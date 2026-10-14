import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { fetchProducts } from '../services/api';
import ProductCard from '../components/ProductCard';
import { Search, Loader2 } from 'lucide-react';

export default function Shop() {
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const categories = [
    { id: 'all', label: t.shop.all },
    { id: 'npk', label: t.shop.npk },
    { id: 'organic', label: t.shop.organic },
    { id: 'micronutrient', label: t.shop.micronutrient },
    { id: 'fungicide_pesticide', label: t.shop.fungicide_pesticide }
  ];

  const loadProducts = useCallback(async (category, query) => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetchProducts(category, query);
      if (res.success && res.products) {
        setProducts(res.products);
      } else {
        setError(true);
        setProducts([]);
      }
    } catch (e) {
      console.error(e);
      setError(true);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts(selectedCategory, searchQuery);
  }, [selectedCategory, searchQuery, loadProducts]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadProducts(selectedCategory, searchQuery);
  };

  const handleReset = () => {
    setSelectedCategory('all');
    setSearchQuery('');
    loadProducts('all', '');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2 text-center max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          {t.shop.title}
        </h1>
        <p className="text-sm text-slate-600">
          {t.shop.subtitle}
        </p>
      </div>

      {/* Search & Category Filter Controls */}
      <div className="space-y-4">
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="max-w-xl mx-auto relative flex items-center">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" aria-hidden="true" />
          <label htmlFor="product-search" className="sr-only">{t.shop.searchPlaceholder}</label>
          <input
            id="product-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.shop.searchPlaceholder}
            className="w-full pl-12 pr-28 py-3 bg-white border border-slate-300 rounded-2xl text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-agro-500 focus:border-transparent transition"
          />
          <button
            type="submit"
            className="absolute right-2 px-4 py-2 bg-agro-600 hover:bg-agro-700 text-white rounded-xl text-xs font-bold transition"
          >
            {t.shop.searchBtn || 'Search'}
          </button>
        </form>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2" role="group" aria-label="Filter by category">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              aria-pressed={selectedCategory === cat.id}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                selectedCategory === cat.id
                  ? 'bg-agro-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2" aria-live="polite">
          <Loader2 className="w-8 h-8 animate-spin text-agro-600" />
          <span className="text-sm">{t.shop.loading || 'Loading products...'}</span>
        </div>
      ) : error ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-rose-100 p-8 space-y-3">
          <p className="text-base font-bold text-rose-700">Could not load products. Is the server running?</p>
          <p className="text-xs text-slate-500">Make sure the backend server is started on the configured port.</p>
          <button
            onClick={loadProducts}
            className="px-4 py-2 bg-agro-600 text-white text-xs font-bold rounded-xl"
          >
            Retry
          </button>
        </div>
      ) : products.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
          <p className="text-base font-bold text-slate-700">{t.shop.noResults || 'No products found matching your query.'}</p>
          <p className="text-xs text-slate-500">Try a different crop name or category.</p>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-agro-600 text-white text-xs font-bold rounded-xl"
          >
            {t.shop.resetFilters || 'Reset Filters'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

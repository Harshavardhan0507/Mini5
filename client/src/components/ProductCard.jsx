import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { ShoppingCart, Star, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function ProductCard({ product }) {
  const { addToCart } = useCart();
  const { t } = useLanguage();

  const categoryLabels = {
    npk: 'NPK Fertilizer',
    organic: 'Organic / Bio',
    micronutrient: 'Micronutrient',
    fungicide_pesticide: 'Disease Control'
  };

  const categoryColors = {
    npk: 'bg-blue-100 text-blue-800 border-blue-200',
    organic: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    micronutrient: 'bg-amber-100 text-amber-800 border-amber-200',
    fungicide_pesticide: 'bg-rose-100 text-rose-800 border-rose-200'
  };

  const inStock = Number(product.stock) > 0;
  const lowStock = inStock && Number(product.stock) <= 5;
  const hasDiscount = Number(product.mrp) > Number(product.price);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden group">
      <Link to={`/product/${product.id}`} className="relative aspect-4/3 overflow-hidden bg-slate-100 block">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = '/placeholder-product.svg';
          }}
        />
        <span
          className={`absolute top-3 left-3 px-2.5 py-0.5 text-xs font-semibold rounded-full border shadow-xs ${
            categoryColors[product.category] || 'bg-slate-100 text-slate-800'
          }`}
        >
          {categoryLabels[product.category] || product.category}
        </span>
        {product.weight && (
          <span className="absolute bottom-3 right-3 px-2 py-0.5 text-xs font-medium rounded-md bg-black/60 text-white backdrop-blur-xs">
            {product.weight}
          </span>
        )}
        {!inStock && (
          <span className="absolute inset-0 bg-white/70 flex items-center justify-center text-xs font-black uppercase tracking-wide text-rose-700">
            Out of stock
          </span>
        )}
      </Link>

      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <div className="flex items-center gap-1 text-amber-500 font-semibold">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{product.rating}</span>
            </div>
            {inStock ? (
              <span className="text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> {t.shop.stock}
              </span>
            ) : (
              <span className="text-rose-600 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Out of stock
              </span>
            )}
          </div>

          <Link to={`/product/${product.id}`}>
            <h3 className="font-bold text-slate-900 group-hover:text-agro-700 transition line-clamp-1 text-base">
              {product.name}
            </h3>
          </Link>

          <p className="text-xs text-slate-600 line-clamp-2 mt-1 leading-relaxed">
            {product.description}
          </p>

          {product.targetProblems && product.targetProblems.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2.5">
              {product.targetProblems.slice(0, 2).map((problem) => (
                <span
                  key={problem}
                  className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium"
                >
                  ✓ {problem}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <div>
            {hasDiscount && (
              <span className="text-[11px] text-slate-400 line-through block leading-none">
                ₹{product.mrp}
              </span>
            )}
            <div className="text-lg font-black text-slate-900">₹{product.price}</div>
            {lowStock && (
              <div className="text-[10px] font-bold text-amber-600">Only {product.stock} left</div>
            )}
          </div>

          <button
            onClick={() => addToCart(product)}
            disabled={!inStock}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-agro-600 hover:bg-agro-700 disabled:bg-slate-300 disabled:cursor-not-allowed active:scale-95 text-white rounded-xl text-xs font-bold shadow-sm transition"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>{inStock ? t.shop.addToCart : 'Out of stock'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

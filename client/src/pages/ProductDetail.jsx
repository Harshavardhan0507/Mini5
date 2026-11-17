import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchProductById, fetchProducts } from '../services/api';
import { useCart } from '../context/CartContext';
import ProductCard from '../components/ProductCard';
import { STORE_INFO } from '../data/storeInfo';
import {
  ArrowLeft,
  Minus,
  Plus,
  ShoppingCart,
  CheckCircle2,
  Truck,
  ShieldCheck,
  Loader2,
  Star,
  Leaf
} from 'lucide-react';

const CATEGORY_LABELS = {
  npk: 'NPK & Macro Nutrients',
  organic: 'Organic & Bio-Fertilizers',
  micronutrient: 'Micronutrients',
  fungicide_pesticide: 'Fungicides & Disease Control'
};

export default function ProductDetail() {
  const { id } = useParams();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      setQuantity(1);
      setAdded(false);
      try {
        const res = await fetchProductById(id);
        if (!active) return;
        if (res.success && res.product) {
          setProduct(res.product);
          const rel = await fetchProducts(res.product.category);
          if (active && rel.success) {
            setRelated(rel.products.filter((p) => p.id !== res.product.id).slice(0, 3));
          }
        } else {
          setError(res.message || 'Product not found.');
        }
      } catch {
        setError('Could not load this product. Please check the server is running.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-agro-600" />
        <span className="text-sm">Loading product...</span>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="text-2xl font-black text-slate-900">{error || 'Product not found'}</h1>
        <Link to="/shop" className="inline-flex px-5 py-2.5 bg-agro-600 text-white rounded-xl text-sm font-bold">
          Back to shop
        </Link>
      </div>
    );
  }

  const maxQuantity = Math.max(1, Number(product.stock) || 0);
  const inStock = Number(product.stock) > 0;
  const hasDiscount = Number(product.mrp) > Number(product.price);

  const handleAdd = () => {
    addToCart(product, Math.min(quantity, maxQuantity));
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      <Link to="/shop" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-agro-700">
        <ArrowLeft className="w-4 h-4" /> Back to fertilizer shop
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
          <div className="aspect-square bg-slate-100">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = '/placeholder-product.svg';
              }}
            />
          </div>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <span className="inline-flex px-2.5 py-1 rounded-full bg-agro-50 border border-agro-200 text-[11px] font-bold text-agro-800">
              {CATEGORY_LABELS[product.category] || product.category}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">{product.name}</h1>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1 font-bold text-amber-500">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> {product.rating}
              </span>
              {product.weight && <span>Pack size: {product.weight}</span>}
            </div>
          </div>

          <div className="flex items-end gap-3">
            <span className="text-3xl font-black text-slate-900">₹{product.price}</span>
            {hasDiscount && <span className="text-base text-slate-400 line-through">₹{product.mrp}</span>}
            <span className="text-[11px] text-slate-500 pb-1">Inclusive of all taxes</span>
          </div>

          {inStock ? (
            <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
              {Number(product.stock) <= 5
                ? `Only ${product.stock} pack(s) left in stock`
                : 'In stock — ready to dispatch'}
            </p>
          ) : (
            <p className="text-xs font-bold text-rose-700">Out of stock. Please check back soon.</p>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden bg-slate-50">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={!inStock || quantity <= 1}
                className="p-2.5 hover:bg-slate-200 disabled:opacity-40 transition"
                aria-label="Decrease quantity"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="px-4 text-sm font-bold text-slate-800">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                disabled={!inStock || quantity >= maxQuantity}
                className="p-2.5 hover:bg-slate-200 disabled:opacity-40 transition"
                aria-label="Increase quantity"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleAdd}
              disabled={!inStock}
              className="flex-1 min-w-[180px] flex items-center justify-center gap-2 px-6 py-3 bg-agro-600 hover:bg-agro-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm shadow-md transition"
            >
              <ShoppingCart className="w-4 h-4" />
              {inStock ? 'Add to cart' : 'Out of stock'}
            </button>
          </div>

          {added && (
            <p className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
              Added to your cart. <Link to="/cart" className="underline">View cart</Link>
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="flex items-start gap-2 p-3 bg-white border border-slate-200 rounded-xl">
              <Truck className="w-4 h-4 text-agro-600 mt-0.5" />
              <div className="text-[11px] text-slate-600">
                <strong className="block text-slate-900 text-xs">Farm delivery</strong>
                {STORE_INFO.freeDeliveryNote} {STORE_INFO.deliveryTime} across {STORE_INFO.deliveryArea}.
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-white border border-slate-200 rounded-xl">
              <ShieldCheck className="w-4 h-4 text-agro-600 mt-0.5" />
              <div className="text-[11px] text-slate-600">
                <strong className="block text-slate-900 text-xs">Genuine products</strong>
                Sourced from licensed manufacturers. Batch and expiry on the pack.
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900">
            <strong>Safety first:</strong> read the label before use, follow the stated dose, wear gloves while
            spraying and keep out of reach of children.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
          <h2 className="text-lg font-bold text-slate-900">About this product</h2>
          <p className="text-sm text-slate-600 leading-relaxed">{product.description || 'No description provided.'}</p>

          {product.dosage && (
            <div className="pt-3 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Dosage & application</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{product.dosage}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          {product.suitableCrops?.length > 0 && (
            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-900 mb-2">
                <Leaf className="w-4 h-4 text-agro-600" /> Suitable crops
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {product.suitableCrops.map((crop) => (
                  <span key={crop} className="text-[11px] bg-agro-50 text-agro-800 border border-agro-200 px-2 py-0.5 rounded-md">
                    {crop}
                  </span>
                ))}
              </div>
            </div>
          )}

          {product.targetProblems?.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">Controls</h3>
              <div className="flex flex-wrap gap-1.5">
                {product.targetProblems.map((problem) => (
                  <span key={problem} className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                    {problem}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900">Similar products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

function stockLimit(product) {
  return Number.isFinite(Number(product?.stock)) ? Number(product.stock) : 99;
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('kisan_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [lastAddedItem, setLastAddedItem] = useState(null);

  useEffect(() => {
    localStorage.setItem('kisan_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product, quantity = 1) => {
    const max = stockLimit(product);
    if (max <= 0) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + quantity, max), product }
            : item
        );
      }
      return [...prev, { product, quantity: Math.min(quantity, max) }];
    });

    setLastAddedItem(product.name);
    setTimeout(() => setLastAddedItem(null), 3000);
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const max = stockLimit(item.product);
            const newQty = Math.min(item.quantity + delta, max);
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  /**
   * Replace stale cart product snapshots (price, stock, availability) with the
   * latest catalog data. Items that disappeared from the catalog are dropped.
   */
  const refreshCartProducts = (products) => {
    setCart((prev) =>
      prev
        .map((item) => {
          const fresh = products.find((p) => p.id === item.product.id);
          if (!fresh || Number(fresh.stock) <= 0) return null;
          return {
            ...item,
            quantity: Math.min(item.quantity, stockLimit(fresh)),
            product: fresh
          };
        })
        .filter(Boolean)
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        refreshCartProducts,
        clearCart,
        cartCount,
        cartTotal,
        lastAddedItem
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

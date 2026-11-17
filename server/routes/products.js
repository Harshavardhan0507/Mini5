import { Router } from 'express';
import { listActiveProductsStmt, getProductRowStmt } from '../db.js';
import { rowToProduct } from '../utils/products.js';

const router = Router();

// Get all active products with optional category or search filtering
router.get('/', (req, res) => {
  try {
    const { category, search } = req.query;
    let products = listActiveProductsStmt.all().map(rowToProduct);

    if (category && category !== 'all') {
      products = products.filter((p) => p.category === category);
    }

    if (search) {
      const q = String(search).toLowerCase().trim();
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.suitableCrops.some((c) => c.toLowerCase().includes(q)) ||
          p.targetProblems.some((problem) => problem.toLowerCase().includes(q))
      );
    }

    return res.json({ success: true, count: products.length, products });
  } catch (error) {
    console.error('Product list error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch products.' });
  }
});

// Get single product by ID
router.get('/:id', (req, res) => {
  try {
    const product = rowToProduct(getProductRowStmt.get(req.params.id));
    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    return res.json({ success: true, product });
  } catch (error) {
    console.error('Product fetch error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch product.' });
  }
});

export default router;

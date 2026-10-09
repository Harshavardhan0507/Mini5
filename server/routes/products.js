import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const productsPath = path.join(__dirname, '../data/products.json');

const router = Router();

// Get all products with optional category or search filtering
router.get('/', (req, res) => {
  try {
    const { category, search } = req.query;
    let products = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));

    if (category && category !== 'all') {
      products = products.filter((p) => p.category === category);
    }

    if (search) {
      const q = search.toLowerCase();
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          (p.suitableCrops || []).some((c) => c.toLowerCase().includes(q)) ||
          (p.targetProblems || []).some((prob) => prob.toLowerCase().includes(q))
      );
    }

    return res.json({ success: true, count: products.length, products });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
});

// Get single product by ID
router.get('/:id', (req, res) => {
  try {
    const products = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
    const product = products.find((p) => p.id === req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    return res.json({ success: true, product });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch product' });
  }
});

export default router;

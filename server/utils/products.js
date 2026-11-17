export const PRODUCT_CATEGORIES = ['npk', 'organic', 'micronutrient', 'fungicide_pesticide'];
export const DEFAULT_PRODUCT_IMAGE = '/placeholder-product.svg';

function safeParseArray(raw) {
  if (Array.isArray(raw)) return raw.map((item) => String(item).trim()).filter(Boolean);
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((item) => String(item).trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function rowToProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: row.price,
    mrp: row.mrp ?? row.price,
    rating: row.rating ?? 4.5,
    stock: row.stock,
    weight: row.weight || '',
    image: row.image || DEFAULT_PRODUCT_IMAGE,
    description: row.description || '',
    dosage: row.dosage || '',
    suitableCrops: safeParseArray(row.suitable_crops),
    targetProblems: safeParseArray(row.target_problems),
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function cleanString(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function cleanList(value) {
  const list = Array.isArray(value) ? value : safeParseArray(value);
  return list.map((item) => cleanString(item, 60)).filter(Boolean).slice(0, 20);
}

/**
 * Validate and normalize a product payload coming from the admin panel.
 * Returns { errors, value } so the route can answer with a useful 400.
 */
export function normalizeProductInput(body) {
  const errors = [];

  const name = cleanString(body.name, 140);
  if (name.length < 2) errors.push('Product name must be at least 2 characters.');

  const category = cleanString(body.category, 40);
  if (!PRODUCT_CATEGORIES.includes(category)) {
    errors.push(`Category must be one of: ${PRODUCT_CATEGORIES.join(', ')}.`);
  }

  const price = Number(body.price);
  if (!Number.isFinite(price) || price < 0) errors.push('Selling price must be a positive number.');

  const mrpRaw = body.mrp === '' || body.mrp === undefined || body.mrp === null ? price : Number(body.mrp);
  const mrp = Number.isFinite(mrpRaw) && mrpRaw >= price ? mrpRaw : price;

  const stock = Number(body.stock);
  if (!Number.isInteger(stock) || stock < 0) errors.push('Stock must be a whole number, 0 or more.');

  const ratingRaw = Number(body.rating ?? 4.5);
  const rating = Number.isFinite(ratingRaw) ? Math.min(5, Math.max(0, ratingRaw)) : 4.5;

  return {
    errors,
    value: {
      name,
      category,
      price: Number(price.toFixed(2)),
      mrp: Number(mrp.toFixed(2)),
      rating,
      stock,
      weight: cleanString(body.weight, 40),
      image: cleanString(body.image, 500) || DEFAULT_PRODUCT_IMAGE,
      description: cleanString(body.description, 2000),
      dosage: cleanString(body.dosage, 500),
      suitableCrops: cleanList(body.suitableCrops),
      targetProblems: cleanList(body.targetProblems),
      isActive: body.isActive === false || body.isActive === 0 ? 0 : 1
    }
  };
}

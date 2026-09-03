// ============================================================
// Catalog search — tolerant of how people actually type.
// ============================================================
// Buyers do not send keywords, they send sentences:
//   "cotton saree dikhao", "1000 ke under", "mujhe paithani chahiye"
// Requiring every token to match returned nothing for all of those, which
// made the agent look broken. Search now drops filler words, matches on ANY
// remaining term, and ranks by where the match landed.
// ============================================================

import type { Product, CatalogQuery } from '@/types';
import { products } from './data.ts';

/**
 * Filler words carrying no product meaning — Hinglish, Marathi and English.
 * Stripped before matching so a conversational phrase still finds sarees.
 */
const STOPWORDS = new Set([
  // Hinglish / Hindi
  'dikhao', 'dikhaao', 'dikha', 'chahiye', 'chaahiye', 'mujhe', 'muje',
  'hai', 'hain', 'ke', 'ka', 'ki', 'ko', 'mein', 'niche', 'wali', 'wala',
  'kuch', 'accha', 'acha', 'sundar', 'batao', 'koi', 'aur', 'ya', 'par',
  'se', 'liye', 'lie', 'hoga', 'chalega', 'pehli', 'dusri', 'teesri',
  // Marathi
  'dakhva', 'dakhava', 'mala', 'pahije', 'aahe', 'ahe', 'ani', 'kahi',
  // English
  'show', 'me', 'want', 'need', 'the', 'for', 'with', 'and', 'or', 'some',
  'any', 'please', 'looking', 'find', 'get', 'buy', 'under', 'below',
  'less', 'than', 'good', 'nice', 'best', 'my', 'all', 'everything',
  /* Every product here IS a saree, so the word carries no discriminating
     information — it matched all sixteen on incidental tags and produced a
     near-random ranking. "show me all sarees" now reduces to no terms at all,
     which is correct: she asked to see things, so show her things, cheapest
     first. */
  'saree', 'sarees', 'sari', 'saris', 'sadi', 'sadya', 'साडी', 'साड्या',
]);

/** Terms worth matching on, once filler and bare numbers are removed. */
function meaningfulTerms(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[\s,.!?;:()]+/)
    .filter(Boolean)
    .filter((t) => !STOPWORDS.has(t))
    /* A bare number is a price intent, not a product word. Price arrives
       separately as max_price; "1000" here would match nothing useful. */
    .filter((t) => !/^\d+$/.test(t))
    .filter((t) => t.length > 1);
}

/**
 * Score one product against one term. Higher is more relevant.
 * A hit in the name beats one buried in the description — otherwise a silk
 * saree whose description mentions a "cotton border" outranks real cotton.
 */
function scoreTerm(product: Product, term: string): number {
  const inAny = (values: string[]) =>
    values.some((v) => v.toLowerCase().includes(term));

  if (product.name.toLowerCase().includes(term)) return 10;
  if (product.name_hindi.toLowerCase().includes(term)) return 10;
  if (inAny(product.tags)) return 6;
  if (inAny(product.tags_hindi)) return 6;
  if (inAny(product.colors)) return 3;
  if (product.category.toLowerCase().includes(term)) return 2;
  if (product.description.toLowerCase().includes(term)) return 1;
  return 0;
}

/**
 * Search the catalog by conversational query, price range and category.
 *
 * A query made entirely of filler ("mujhe chahiye dikhao") is treated as no
 * query at all — the buyer asked to see things, so show her things.
 */
export function searchProducts(query: CatalogQuery): Product[] {
  let results = [...products];
  const terms = query.q ? meaningfulTerms(query.q) : [];

  if (terms.length > 0) {
    results = results
      .map((product) => ({
        product,
        score: terms.reduce((sum, t) => sum + scoreTerm(product, t), 0),
      }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || a.product.price - b.product.price)
      .map((r) => r.product);
  }

  if (query.max_price !== undefined) {
    results = results.filter((p) => p.price <= query.max_price!);
  }
  if (query.min_price !== undefined) {
    results = results.filter((p) => p.price >= query.min_price!);
  }
  if (query.category) {
    results = results.filter(
      (p) => p.category.toLowerCase() === query.category!.toLowerCase(),
    );
  }

  /* With no meaningful text there is no relevance order, so fall back to
     price ascending — the cheapest options are the ones inside a cap. */
  if (terms.length === 0) {
    results.sort((a, b) => a.price - b.price);
  }

  return results;
}

/** Get a single product by its id. */
export function getProductById(id: string): Product | undefined {
  return products.find((product) => product.id === id);
}

/** Only products that can actually be bought right now. */
export function getInStockProducts(): Product[] {
  return products.filter((product) => product.in_stock);
}

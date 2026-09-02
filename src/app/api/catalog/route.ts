// ============================================================
// GET /api/catalog — Product search & filtering endpoint
// ============================================================
//
// Query params:
//   q         — search text (matches name, hindi name, tags, etc.)
//   max_price — maximum price in ₹
//   min_price — minimum price in ₹
//   category  — product category filter
//
// Example:
//   GET /api/catalog?q=cotton&max_price=1000
//   GET /api/catalog?q=paithani
//   GET /api/catalog?category=sarees
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { searchProducts } from '@/lib/catalog/search';
import type { CatalogResponse } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const q = searchParams.get('q') || undefined;
    const max_price = searchParams.get('max_price')
      ? Number(searchParams.get('max_price'))
      : undefined;
    const min_price = searchParams.get('min_price')
      ? Number(searchParams.get('min_price'))
      : undefined;
    const category = searchParams.get('category') || undefined;

    // Validate price params
    if (max_price !== undefined && isNaN(max_price)) {
      return NextResponse.json(
        { error: 'invalid_param', message: 'max_price must be a number' },
        { status: 400 }
      );
    }
    if (min_price !== undefined && isNaN(min_price)) {
      return NextResponse.json(
        { error: 'invalid_param', message: 'min_price must be a number' },
        { status: 400 }
      );
    }

    const products = searchProducts({ q, max_price, min_price, category });

    const response: CatalogResponse = { products };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[/api/catalog] Error:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to search catalog' },
      { status: 500 }
    );
  }
}

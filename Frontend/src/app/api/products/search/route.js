import { NextResponse } from 'next/server';
import channel3 from '@/lib/channel3';

export async function GET(request) {
  let searchParams;
  try {
    searchParams = request.nextUrl ? request.nextUrl.searchParams : new URL(request.url).searchParams;
  } catch {
    // Fallback if accessed during static build
    return NextResponse.json({ success: true, products: [] });
  }

  try {
    const query = (searchParams.get('q') || '').trim();
    if (!query) {
      return NextResponse.json({ success: true, products: [] });
    }
    const limit = parseInt(searchParams.get('limit') || '5', 10);

    const page = await channel3.products.search({
      query,
      limit,
    });

    return NextResponse.json({
      success: true,
      products: page.data || [],
    });
  } catch (error) {
    console.error('Channel3 search error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to search products with Channel3',
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { base64Image, query, limit = 10 } = body;

    if (!base64Image && !query) {
      return NextResponse.json(
        { success: false, error: 'Either base64Image or query must be provided.' },
        { status: 400 }
      );
    }

    let cleanBase64 = base64Image;
    if (cleanBase64 && cleanBase64.includes(',')) {
      cleanBase64 = cleanBase64.split(',')[1];
    }

    const searchParams = {
      limit: Math.min(Math.max(limit, 1), 30),
    };
    if (cleanBase64) {
      searchParams.base64_image = cleanBase64;
    }
    if (query && query.trim()) {
      searchParams.query = query.trim();
    }

    const page = await channel3.products.search(searchParams);
    const rawProducts = page.data || [];

    const recommendations = rawProducts.map((p, idx) => {
      const offers = (p.offers || []).map((o) => ({
        merchantDomain: o.domain || 'Store',
        price: typeof o.price === 'object' ? o.price?.price ?? 0 : Number(o.price) || 0,
        currency: (typeof o.price === 'object' ? o.price?.currency : null) || 'USD',
        productUrl: o.url || '',
        inStock: o.availability ? o.availability.toLowerCase().includes('in') : true,
      }));

      const selectedOffer = offers[0] || {
        merchantDomain: 'Store',
        price: 0,
        currency: 'USD',
        productUrl: '',
        inStock: true,
      };

      const imageUrls = (p.images || [])
        .map((img) => (typeof img === 'string' ? img : img.cleaned_url || img.url))
        .filter(Boolean);
      const mainImage = p.image_url || imageUrls[0] || '';

      const normalizedProduct = {
        source: 'CHANNEL3',
        productId: p.id || `c3_${idx}`,
        name: p.title || 'Product',
        brand: p.brands?.[0]?.name || '',
        category: p.category?.title || p.category?.slug || '',
        description: p.description || '',
        imageUrl: mainImage,
        inStock: offers.length > 0 ? offers.some((o) => o.inStock) : true,
        offers,
        variants: p.variants || null,
        images: imageUrls,
      };

      return {
        rank: idx + 1,
        product: normalizedProduct,
        selectedOffer,
        matchedFeatureCount: (p.key_features || []).length || 1,
        matchedFeatures:
          p.key_features && p.key_features.length > 0
            ? p.key_features
            : ['Visual Match', 'Channel3 Catalog'],
        explanation: 'Matched visually using Channel3 image search.',
      };
    });

    return NextResponse.json({
      success: true,
      recommendations,
      intent: {
        intentSummary: 'Visual product search',
        category: rawProducts[0]?.category?.title || 'Visual Search',
        budget: null,
        constraints: ['visual_match'],
      },
      notice:
        recommendations.length > 0
          ? `Found ${recommendations.length} products matching your image.`
          : 'No visual matches found. Try another image.',
    });
  } catch (error) {
    console.error('Channel3 image search error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to search by image.',
      },
      { status: 500 }
    );
  }
}

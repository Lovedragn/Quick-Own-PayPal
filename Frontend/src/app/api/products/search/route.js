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

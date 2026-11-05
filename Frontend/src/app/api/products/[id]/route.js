import { NextResponse } from 'next/server';
import channel3 from '@/lib/channel3';

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams?.id;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Product ID is required' }, { status: 400 });
    }

    const product = await channel3.products.retrieve({
      product_id: id,
    });
    return NextResponse.json({
      success: true,
      product: product || null,
    });
  } catch (error) {
    console.error('Channel3 product retrieve error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to retrieve product from Channel3',
      },
      { status: 500 }
    );
  }
}

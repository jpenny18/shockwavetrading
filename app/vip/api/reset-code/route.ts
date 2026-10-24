import { NextRequest, NextResponse } from 'next/server';
import { VIP_RESET_DISCOUNT_PERCENT } from '../../config';
import { validateResetCode } from '../../lib/records';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await validateResetCode(String(body?.code || ''));
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      code: result.code,
      percent: VIP_RESET_DISCOUNT_PERCENT,
    });
  } catch (error) {
    console.error('VIP reset code error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Unable to check that reset code' }, { status: 500 });
  }
}

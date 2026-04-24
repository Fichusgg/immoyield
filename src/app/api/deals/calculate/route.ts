import { NextResponse } from 'next/server';
import { dealSchema } from '@/lib/validations/deal';
import { analyzeRentalDeal } from '@/lib/calculations/rental';
import { calculateProjections } from '@/lib/calculations/projections';
import { checkRateLimit, getClientIp, limiters, rateLimitHeaders } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const rl = await checkRateLimit(limiters.standard, `deals-calc:${getClientIp(req)}`);
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Muitas requisições.' },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  try {
    const body = await req.json();

    // 1. Validation
    const validatedData = dealSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: 'Invalid input data', details: validatedData.error.format() },
        { status: 400 }
      );
    }

    // 2. Calculation
    const analysis = analyzeRentalDeal(validatedData.data);
    const projections = calculateProjections(validatedData.data);

    // 3. Response
    return NextResponse.json({
      success: true,
      data: {
        ...analysis,
        projections,
      },
    });
  } catch (error) {
    console.error('[CALCULATION_ERROR]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

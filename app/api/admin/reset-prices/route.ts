import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/require-admin';
import {
  applyGlobalPriceUpdate,
  buildGlobalCatalog,
  listCustomResetUsers,
  parseResetPriceRule,
  parseResetPriceRuleMap,
  type ResetPriceRule,
} from '@/lib/reset-price-config';
import { readResetPriceConfig, ResetPriceUpdateError, updateResetPriceConfig } from '@/lib/reset-price-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function payload(config: Awaited<ReturnType<typeof readResetPriceConfig>>) {
  return {
    catalog: buildGlobalCatalog(config),
    global: config.global,
    users: config.users,
    customUsers: listCustomResetUsers(config),
    updatedAt: config.updatedAt,
    updatedBy: config.updatedBy,
  };
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const config = await readResetPriceConfig();
    return NextResponse.json(payload(config));
  } catch (error) {
    console.error('Error fetching reset prices:', error);
    return NextResponse.json({ error: 'Failed to load reset prices' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Reset price changes are missing.' }, { status: 400 });
    }

    const update: {
      rules?: Record<string, ResetPriceRule | null>;
      applyAll?: ResetPriceRule | null;
      clearAll?: boolean;
    } = {};

    if (body.clearAll === true) update.clearAll = true;
    if (body.rules != null) {
      const parsed = parseResetPriceRuleMap(body.rules);
      if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
      update.rules = parsed.rules;
    }
    if (body.applyAll != null) {
      const parsed = parseResetPriceRule(body.applyAll);
      if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
      update.applyAll = parsed.rule;
    }

    if (!update.clearAll && !update.rules && !update.applyAll) {
      return NextResponse.json({ error: 'Choose a price to save.' }, { status: 400 });
    }

    const saved = await updateResetPriceConfig(admin.uid, (current) => applyGlobalPriceUpdate(current, update));
    return NextResponse.json(payload(saved));
  } catch (error) {
    if (error instanceof ResetPriceUpdateError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error saving reset prices:', error);
    return NextResponse.json({ error: 'Failed to save reset prices' }, { status: 500 });
  }
}

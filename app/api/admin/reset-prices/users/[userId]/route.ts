import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/require-admin';
import {
  applyUserPriceUpdate,
  buildAccountResetPrices,
  buildUserCatalog,
  isOpenResetAccount,
  isSafeResetUserId,
  parseResetPriceRule,
  parseResetPriceRuleMap,
  type ResetPriceConfig,
  type ResetPriceRule,
} from '@/lib/reset-price-config';
import { readResetPriceConfig, ResetPriceUpdateError, updateResetPriceConfig } from '@/lib/reset-price-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: { userId: string } };

type OpenAccount = {
  accountId: string;
  accountType?: string | null;
  accountSize?: number | string | null;
  platform?: string | null;
  status?: string | null;
  step?: number | string | null;
  profitSplit?: number | string | null;
};

function displayNameFrom(profile: Record<string, unknown>, fallback: string): string {
  const explicit = typeof profile.displayName === 'string' ? profile.displayName.trim() : '';
  const combined = `${typeof profile.firstName === 'string' ? profile.firstName : ''} ${typeof profile.lastName === 'string' ? profile.lastName : ''}`.trim();
  return explicit || combined || fallback;
}

async function loadCustomer(userId: string) {
  const authUser = await auth.getUser(userId);
  const profileSnap = await db.collection('users').doc(userId).get();
  const profile = profileSnap.exists ? (profileSnap.data() || {}) : {};
  const email = authUser.email || (typeof profile.email === 'string' ? profile.email : '');
  return {
    uid: authUser.uid,
    email,
    displayName: displayNameFrom(profile, authUser.displayName || email || userId),
  };
}

async function loadOpenAccounts(userId: string): Promise<OpenAccount[]> {
  const snapshot = await db.collection('userMetaApiAccounts').where('userId', '==', userId).get();
  return snapshot.docs
    .map((entry) => entry.data())
    .filter((account) => isOpenResetAccount(account))
    .map((account) => ({
      accountId: String(account.accountId || ''),
      accountType: account.accountType,
      accountSize: account.accountSize,
      platform: account.platform,
      status: account.status,
      step: account.step,
      profitSplit: account.profitSplit,
    }));
}

function customerPayload(config: ResetPriceConfig, user: { uid: string; email: string; displayName: string }, accounts: OpenAccount[]) {
  const priced = buildAccountResetPrices(config, user.uid, accounts);
  return {
    user,
    catalog: buildUserCatalog(config, user.uid),
    accounts: priced.accounts,
    unpricedCount: priced.unpricedCount,
  };
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = decodeURIComponent(params.userId || '').trim();
  if (!isSafeResetUserId(userId)) {
    return NextResponse.json({ error: 'Unknown customer.' }, { status: 400 });
  }

  try {
    const [user, accounts, config] = await Promise.all([
      loadCustomer(userId),
      loadOpenAccounts(userId),
      readResetPriceConfig(),
    ]);
    return NextResponse.json(customerPayload(config, user, accounts));
  } catch (error: any) {
    if (error?.code === 'auth/user-not-found') {
      return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });
    }
    console.error('Error loading customer reset prices:', error);
    return NextResponse.json({ error: 'Failed to load this customer.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = decodeURIComponent(params.userId || '').trim();
  if (!isSafeResetUserId(userId)) {
    return NextResponse.json({ error: 'Unknown customer.' }, { status: 400 });
  }

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Reset price changes are missing.' }, { status: 400 });
    }

    const hasWork = body.clearCatalog === true
      || body.clearAccounts === true
      || body.applyAllCatalog != null
      || body.applyAllAccounts != null
      || body.catalog != null
      || body.accounts != null;
    if (!hasWork) return NextResponse.json({ error: 'Choose a price to save.' }, { status: 400 });

    let catalog: Record<string, ResetPriceRule | null> | undefined;
    if (body.catalog != null) {
      const parsed = parseResetPriceRuleMap(body.catalog);
      if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
      catalog = parsed.rules;
    }

    let accountsPatch: Record<string, ResetPriceRule | null> | undefined;
    if (body.accounts != null) {
      const parsed = parseResetPriceRuleMap(body.accounts);
      if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
      accountsPatch = parsed.rules;
    }

    let applyAllCatalog: ResetPriceRule | undefined;
    if (body.applyAllCatalog != null) {
      const parsed = parseResetPriceRule(body.applyAllCatalog);
      if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
      applyAllCatalog = parsed.rule;
    }

    let applyAllAccounts: ResetPriceRule | undefined;
    if (body.applyAllAccounts != null) {
      const parsed = parseResetPriceRule(body.applyAllAccounts);
      if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
      applyAllAccounts = parsed.rule;
    }

    const user = await loadCustomer(userId);
    const openAccounts = await loadOpenAccounts(userId);
    const saved = await updateResetPriceConfig(admin.uid, (current) => {
      const priced = buildAccountResetPrices(current, user.uid, openAccounts);
      return applyUserPriceUpdate(current, {
        userId: user.uid,
        email: user.email,
        displayName: user.displayName,
        clearCatalog: body.clearCatalog === true,
        clearAccounts: body.clearAccounts === true,
        catalog,
        accounts: accountsPatch,
        applyAllCatalog,
        applyAllAccounts,
        pricedAccounts: priced.accounts.map((account) => ({
          accountId: account.accountId,
          originalPrice: account.originalPrice,
          label: `${account.productLabel} ${account.amountLabel}`,
        })),
      });
    });

    return NextResponse.json(customerPayload(saved, user, openAccounts));
  } catch (error: any) {
    if (error instanceof ResetPriceUpdateError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error?.code === 'auth/user-not-found') {
      return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });
    }
    console.error('Error saving customer reset prices:', error);
    return NextResponse.json({ error: 'Failed to save this customer.' }, { status: 500 });
  }
}

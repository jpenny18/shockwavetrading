import { NextRequest, NextResponse } from 'next/server';
import { auth as adminAuth, db } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/require-admin';
import { sendTemplateEmail } from '@/lib/email';
import { buildLoginCredentialsTemplate, escapeHtml, platformLabel } from '@/lib/login-credentials-email';

export const dynamic = 'force-dynamic';

interface StoredCredentials {
  login?: string;
  password?: string;
  server?: string;
}

interface AccountRecord {
  accountId: string;
  accountType?: string;
  accountSize?: number;
  platform?: string;
  status?: string;
  loginCredentials?: StoredCredentials;
  updatedAt?: { toMillis?: () => number; toDate?: () => Date } | string;
}

function toMillis(value: AccountRecord['updatedAt']) {
  if (!value) return 0;
  if (typeof value === 'string') {
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  return 0;
}

function parseMoney(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/[$,\s]/g, '').toLowerCase();
  const match = cleaned.match(/^(\d+(?:\.\d+)?)([km])?$/);
  if (!match) return null;
  let amount = Number(match[1]);
  if (!Number.isFinite(amount)) return null;
  if (match[2] === 'k') amount *= 1000;
  if (match[2] === 'm') amount *= 1_000_000;
  return amount;
}

function platformsMatch(orderPlatform: string | undefined, accountPlatform: string | undefined) {
  const order = (orderPlatform || '').toLowerCase();
  const account = (accountPlatform || '').toLowerCase();
  if (!order || !account) return false;
  const orderIsMt5 = order.includes('mt5') || order.includes('5');
  const accountIsMt5 = account.includes('mt5') || account.includes('5');
  return orderIsMt5 === accountIsMt5;
}

function hasCredentials(account: AccountRecord) {
  const credentials = account.loginCredentials;
  return Boolean(credentials?.login?.trim() && credentials?.password && credentials?.server?.trim());
}

function publicAccount(account: AccountRecord) {
  return {
    accountId: account.accountId,
    accountType: account.accountType || 'standard',
    accountSize: account.accountSize || 0,
    platform: account.platform || '',
    status: account.status || '',
    login: account.loginCredentials?.login || '',
    server: account.loginCredentials?.server || '',
  };
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : '';
    const accountId = typeof body.accountId === 'string' ? body.accountId : '';
    const challengeAmount = body.challengeAmount;
    const platform = typeof body.platform === 'string' ? body.platform : '';

    if (!email) {
      return NextResponse.json({ error: 'Customer email is required' }, { status: 400 });
    }

    const userRecord = await adminAuth.getUserByEmail(email);
    const profileSnap = await db.collection('users').doc(userRecord.uid).get();
    const profile = profileSnap.exists ? profileSnap.data() : null;

    const accountsSnap = await db.collection('userMetaApiAccounts').where('userId', '==', userRecord.uid).get();
    const accounts = accountsSnap.docs
      .map((doc) => doc.data() as AccountRecord)
      .filter((account) => account.accountId && hasCredentials(account));

    if (accounts.length === 0) {
      return NextResponse.json(
        { error: 'No stored trading credentials were found for this customer. Add them from MetaAPI Accounts first.' },
        { status: 404 }
      );
    }

    let selected: AccountRecord | undefined;
    if (accountId) {
      selected = accounts.find((account) => account.accountId === accountId);
      if (!selected) {
        return NextResponse.json({ error: 'That trading account has no stored credentials.' }, { status: 404 });
      }
    } else if (accounts.length === 1) {
      selected = accounts[0];
    } else {
      const targetSize = parseMoney(challengeAmount);
      const ranked = [...accounts].sort((a, b) => {
        const score = (account: AccountRecord) => {
          let value = 0;
          if (targetSize !== null && account.accountSize === targetSize) value += 4;
          if (platformsMatch(platform, account.platform)) value += 2;
          return value;
        };
        const scoreDiff = score(b) - score(a);
        if (scoreDiff !== 0) return scoreDiff;
        return toMillis(b.updatedAt) - toMillis(a.updatedAt);
      });

      const scoreOf = (account: AccountRecord) => {
        let value = 0;
        if (targetSize !== null && account.accountSize === targetSize) value += 4;
        if (platformsMatch(platform, account.platform)) value += 2;
        return value;
      };

      if (scoreOf(ranked[0]) > scoreOf(ranked[1])) {
        selected = ranked[0];
      } else {
        return NextResponse.json({
          selectionRequired: true,
          accounts: ranked.map(publicAccount),
        });
      }
    }

    const credentials = selected.loginCredentials!;
    const firstName = profile?.firstName || userRecord.displayName?.split(' ')[0] || 'Trader';
    const lastName = profile?.lastName || userRecord.displayName?.split(' ').slice(1).join(' ') || '';
    const result = await sendTemplateEmail(
      buildLoginCredentialsTemplate(),
      {
        email: userRecord.email || email,
        firstName,
        lastName,
        displayName: userRecord.displayName || `${firstName} ${lastName}`.trim(),
      },
      {
        firstName: escapeHtml(firstName),
        platform: platformLabel(selected.platform),
        loginId: escapeHtml(credentials.login!.trim()),
        password: escapeHtml(credentials.password!),
        server: escapeHtml(credentials.server!.trim()),
      }
    );

    if (!result.success) {
      return NextResponse.json({ error: 'Failed to send the credentials email' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      sentTo: userRecord.email || email,
      login: credentials.login,
      server: credentials.server,
      accountSize: selected.accountSize || 0,
      platform: platformLabel(selected.platform),
    });
  } catch (error: any) {
    if (error?.code === 'auth/user-not-found') {
      return NextResponse.json(
        { error: 'No customer account exists for this email, so credentials cannot be resent.' },
        { status: 404 }
      );
    }
    console.error('Error resending login credentials:', error);
    return NextResponse.json({ error: 'Failed to resend credentials' }, { status: 500 });
  }
}

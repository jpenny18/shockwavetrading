import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/require-admin';

export const dynamic = 'force-dynamic';

const SETTINGS_DOC = 'settings';
const ADMIN_DOC_ID = 'admin';

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Asia/Tokyo',
] as const;

const DEFAULT_GENERAL = {
  siteName: 'Shockwave Capital',
  supportEmail: 'support@shockwavecapital.com',
  phoneNumber: '',
  timezone: 'America/New_York',
};

const DEFAULT_NOTIFICATIONS = {
  emailNotifications: true,
  orderNotifications: true,
  customerSignups: true,
  paymentFailures: true,
  dailySummary: true,
};

function isConfigured(value: string | undefined) {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  const placeholders = ['your-metaapi-auth-token-here', 'xxxx', 'changeme', 'placeholder'];
  const lower = trimmed.toLowerCase();
  return !placeholders.some((placeholder) => lower.includes(placeholder));
}

function integrationStatus() {
  return {
    stripe: isConfigured(process.env.STRIPE_SECRET_KEY) || isConfigured(process.env.STRIPE_TEST_SECRET_KEY),
    stripePublishable:
      isConfigured(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) ||
      isConfigured(process.env.NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY),
    resend: isConfigured(process.env.RESEND_API_KEY),
    metaApi: isConfigured(process.env.METAAPI_AUTH_TOKEN),
    firebaseAdmin: isConfigured(process.env.FIREBASE_ADMIN_PROJECT_ID) && isConfigured(process.env.FIREBASE_ADMIN_CLIENT_EMAIL),
  };
}

function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeSettings(data: Record<string, any> | undefined) {
  const general = data?.general || {};
  const notifications = data?.notifications || {};

  return {
    general: {
      siteName: typeof general.siteName === 'string' && general.siteName.trim() ? general.siteName : DEFAULT_GENERAL.siteName,
      supportEmail:
        typeof general.supportEmail === 'string' && general.supportEmail.trim()
          ? general.supportEmail
          : DEFAULT_GENERAL.supportEmail,
      phoneNumber: typeof general.phoneNumber === 'string' ? general.phoneNumber : DEFAULT_GENERAL.phoneNumber,
      timezone: (TIMEZONES as readonly string[]).includes(general.timezone) ? general.timezone : DEFAULT_GENERAL.timezone,
    },
    notifications: {
      emailNotifications: asBoolean(notifications.emailNotifications, DEFAULT_NOTIFICATIONS.emailNotifications),
      orderNotifications: asBoolean(notifications.orderNotifications, DEFAULT_NOTIFICATIONS.orderNotifications),
      customerSignups: asBoolean(notifications.customerSignups, DEFAULT_NOTIFICATIONS.customerSignups),
      paymentFailures: asBoolean(notifications.paymentFailures, DEFAULT_NOTIFICATIONS.paymentFailures),
      dailySummary: asBoolean(notifications.dailySummary, DEFAULT_NOTIFICATIONS.dailySummary),
    },
    integrations: integrationStatus(),
    updatedAt: typeof data?.updatedAt === 'string' ? data.updatedAt : null,
  };
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const doc = await db.collection(SETTINGS_DOC).doc(ADMIN_DOC_ID).get();
    return NextResponse.json(normalizeSettings(doc.exists ? doc.data() : undefined));
  } catch (error) {
    console.error('Error fetching admin settings:', error);
    return NextResponse.json({ error: 'Failed to fetch admin settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const general = body?.general;
    const notifications = body?.notifications;

    if (!general || typeof general !== 'object' || !notifications || typeof notifications !== 'object') {
      return NextResponse.json({ error: 'General and notification settings are required' }, { status: 400 });
    }

    const siteName = typeof general.siteName === 'string' ? general.siteName.trim() : '';
    const supportEmail = typeof general.supportEmail === 'string' ? general.supportEmail.trim() : '';
    const phoneNumber = typeof general.phoneNumber === 'string' ? general.phoneNumber.trim() : '';
    const timezone = general.timezone;

    if (!siteName || siteName.length > 80) {
      return NextResponse.json({ error: 'Site name is required and must be 80 characters or fewer' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) {
      return NextResponse.json({ error: 'Enter a valid support email' }, { status: 400 });
    }
    if (phoneNumber.length > 40) {
      return NextResponse.json({ error: 'Phone number must be 40 characters or fewer' }, { status: 400 });
    }
    if (typeof timezone !== 'string' || !(TIMEZONES as readonly string[]).includes(timezone)) {
      return NextResponse.json({ error: 'Choose a supported timezone' }, { status: 400 });
    }

    const notificationKeys = Object.keys(DEFAULT_NOTIFICATIONS) as (keyof typeof DEFAULT_NOTIFICATIONS)[];
    for (const key of notificationKeys) {
      if (typeof notifications[key] !== 'boolean') {
        return NextResponse.json({ error: `${key} must be true or false` }, { status: 400 });
      }
    }

    const next = {
      general: { siteName, supportEmail, phoneNumber, timezone },
      notifications: {
        emailNotifications: notifications.emailNotifications,
        orderNotifications: notifications.orderNotifications,
        customerSignups: notifications.customerSignups,
        paymentFailures: notifications.paymentFailures,
        dailySummary: notifications.dailySummary,
      },
      updatedAt: new Date().toISOString(),
      updatedBy: admin.uid,
    };

    await db.collection(SETTINGS_DOC).doc(ADMIN_DOC_ID).set(next, { merge: true });

    return NextResponse.json({
      ...next,
      integrations: integrationStatus(),
    });
  } catch (error) {
    console.error('Error saving admin settings:', error);
    return NextResponse.json({ error: 'Failed to save admin settings' }, { status: 500 });
  }
}

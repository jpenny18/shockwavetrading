import { NextRequest, NextResponse } from 'next/server';

const METAAPI_AUTH_TOKEN = process.env.METAAPI_AUTH_TOKEN || 'your-metaapi-auth-token-here';
const BASE_URL = 'https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai';

export const maxDuration = 120;

async function readBody(response: Response): Promise<any> {
  const raw = await response.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return { message: raw };
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryWaitMs(response: Response, data: any): number {
  const retryAfter = response.headers.get('Retry-After');
  if (retryAfter) {
    const asDate = Date.parse(retryAfter);
    if (!Number.isNaN(asDate)) {
      return Math.min(Math.max(asDate - Date.now(), 1000), 60_000);
    }
    const seconds = Number(retryAfter);
    if (!Number.isNaN(seconds) && seconds > 0) {
      return Math.min(seconds * 1000, 60_000);
    }
  }

  const message = String(data?.message || '');
  const secondsMatch = message.match(/retry in (\d+) seconds/i);
  if (secondsMatch) {
    return Math.min(Number(secondsMatch[1]) * 1000, 60_000);
  }

  return 15_000;
}

function formatMetaApiError(status: number, data: any): string {
  const details = data?.details;
  const detailsCode = typeof details === 'string' ? details : details?.code;
  let baseMessage = data?.message || data?.error || `MetaAPI request failed with status ${status}`;
  if (typeof baseMessage === 'string' && (baseMessage.length > 400 || baseMessage.trim().startsWith('<'))) {
    baseMessage = `MetaAPI request failed with status ${status}`;
  }

  if (detailsCode === 'E_SRV_NOT_FOUND') {
    return `${baseMessage} Check the broker server name, or create the account with a provisioning profile.`;
  }
  if (detailsCode === 'E_AUTH') {
    return 'MetaAPI could not authenticate with the broker. Check the login, password, server, and platform.';
  }
  if (detailsCode === 'E_SERVER_TIMEZONE') {
    return `${baseMessage} Broker settings detection failed. Retry in a moment or use a provisioning profile.`;
  }
  if (detailsCode === 'E_RESOURCE_SLOTS') {
    return `${baseMessage} This account needs more MetaAPI resource slots.`;
  }
  if (status === 401) {
    return 'MetaAPI authentication failed. Please check if your METAAPI_AUTH_TOKEN is valid and has the correct permissions.';
  }
  if (status === 403) {
    return 'MetaAPI access forbidden. Your token may not have permission to create accounts.';
  }
  if (status === 429) {
    return 'MetaAPI rate limit exceeded. Please try again later.';
  }

  return baseMessage;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { login, password, name, server, platform, magic = 0, keywords = [], transactionId } = body;

    if (!login || !password || !name || !server || !platform || !transactionId) {
      return NextResponse.json(
        { error: 'Missing required parameters: login, password, name, server, platform, and transactionId are required' },
        { status: 400 }
      );
    }

    if (METAAPI_AUTH_TOKEN === 'your-metaapi-auth-token-here') {
      console.log('MetaAPI token not configured, returning mock response for development');
      const mockAccountId = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      return NextResponse.json({
        accountId: mockAccountId,
        message: 'Mock account created successfully (MetaAPI token not configured)',
        warning: 'This is a mock response. Please configure METAAPI_AUTH_TOKEN environment variable for production use.'
      });
    }

    const url = `${BASE_URL}/users/current/accounts`;
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'auth-token': METAAPI_AUTH_TOKEN,
      'transaction-id': transactionId
    };

    const requestBody = {
      login: login.toString(),
      password,
      name,
      server,
      platform,
      magic,
      keywords,
      metastatsApiEnabled: true,
      riskManagementApiEnabled: true,
      reliability: 'high'
    };

    console.log('Creating MetaAPI account:', {
      login,
      server,
      platform,
      name,
      transactionId: transactionId.substring(0, 8) + '...'
    });

    const maxAttempts = 5;
    let lastData: any = {};
    let lastStatus = 500;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      const data = await readBody(response);
      lastData = data;
      lastStatus = response.status;

      if ((response.status === 201 || response.ok) && data?.id) {
        console.log('MetaAPI account created successfully:', {
          accountId: data.id,
          login,
          attempt
        });

        return NextResponse.json({
          accountId: data.id,
          message: 'Account created successfully with MetaStats API, Risk Management API, and high reliability enabled'
        });
      }

      // MetaAPI returns 202 while broker settings detection is still running.
      // Reuse the same transaction-id until it completes.
      if (response.status === 202) {
        if (attempt === maxAttempts) break;
        const waitMs = retryWaitMs(response, data);
        console.log(`MetaAPI account creation still in progress (202). Retrying in ${Math.round(waitMs / 1000)}s (attempt ${attempt}/${maxAttempts})`);
        await sleep(waitMs);
        continue;
      }

      console.error('MetaAPI create account error:', {
        status: response.status,
        statusText: response.statusText,
        error: data
      });

      const errorMessage = formatMetaApiError(response.status, data);
      return NextResponse.json(
        {
          error: errorMessage,
          message: errorMessage,
          details: data,
          status: response.status
        },
        { status: response.status >= 400 ? response.status : 502 }
      );
    }

    const timeoutMessage = lastData?.message
      || 'MetaAPI is still detecting broker settings. Please wait a minute and try connecting again with the same credentials.';
    return NextResponse.json(
      {
        error: timeoutMessage,
        message: timeoutMessage,
        details: lastData,
        status: lastStatus
      },
      { status: 504 }
    );

  } catch (error: any) {
    console.error('Error creating MetaAPI account:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error', message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

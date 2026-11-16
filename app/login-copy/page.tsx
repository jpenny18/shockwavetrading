'use client';

import { useEffect, useState } from 'react';

type SinglePayload = { kind: 'single'; label: string; value: string };
type AllPayload = { kind: 'all'; platform: string; login: string; password: string; server: string };
type Payload = SinglePayload | AllPayload | null;

const FIELD_LABELS: Record<string, string> = {
  login: 'Login ID',
  password: 'Password',
  server: 'Server',
  platform: 'Platform',
  value: 'Value',
};

let cachedPayload: Payload | undefined;

function parseHash(hash: string): Payload {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const single = params.get('value');
  if (single != null && params.has('value')) {
    const field = params.get('field') || 'value';
    if (!single) return null;
    return { kind: 'single', label: FIELD_LABELS[field] || 'Value', value: single };
  }

  const platform = params.get('platform') || '';
  const login = params.get('login') || '';
  const password = params.get('password') || '';
  const server = params.get('server') || '';
  if (!platform && !login && !password && !server) return null;
  return { kind: 'all', platform, login, password, server };
}

function readPayload(): Payload {
  if (cachedPayload !== undefined) return cachedPayload;
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash;
  const parsed = hash ? parseHash(hash) : null;
  if (hash) window.history.replaceState(null, '', window.location.pathname);
  cachedPayload = parsed;
  return parsed;
}

function formatAll(data: AllPayload) {
  return [
    data.platform ? `Platform: ${data.platform}` : '',
    data.login ? `Login ID: ${data.login}` : '',
    data.password ? `Password: ${data.password}` : '',
    data.server ? `Server: ${data.server}` : '',
  ].filter(Boolean).join('\n');
}

async function writeClipboard(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = value;
      area.setAttribute('readonly', 'true');
      area.style.position = 'fixed';
      area.style.top = '0';
      area.style.left = '0';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.focus();
      area.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(area);
      return copied;
    } catch {
      return false;
    }
  }
}

function ValueField({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold tracking-[0.12em] text-zinc-400 mb-2">{label}</span>
      <input
        readOnly
        value={value}
        onFocus={(event) => event.currentTarget.select()}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className="w-full rounded-xl border border-white/10 bg-[#121214] px-4 py-3 text-base text-white font-mono"
      />
    </label>
  );
}

export default function LoginCopyPage() {
  const [payload, setPayload] = useState<Payload>(null);
  const [ready, setReady] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copyFailed, setCopyFailed] = useState(false);

  useEffect(() => {
    setPayload(readPayload());
    setReady(true);
  }, []);

  const copyValue = async (key: string, value: string) => {
    const copied = await writeClipboard(value);
    setCopyFailed(!copied);
    setCopiedKey(copied ? key : null);
    if (copied) {
      window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? null : current));
      }, 1600);
    }
  };

  const rows = payload?.kind === 'all'
    ? [
        payload.platform ? { key: 'platform', label: 'Platform', value: payload.platform } : null,
        payload.login ? { key: 'login', label: 'Login ID', value: payload.login } : null,
        payload.password ? { key: 'password', label: 'Password', value: payload.password } : null,
        payload.server ? { key: 'server', label: 'Server', value: payload.server } : null,
      ].filter((row): row is { key: string; label: string; value: string } => Boolean(row))
    : [];

  const allText = payload?.kind === 'all' ? formatAll(payload) : payload?.kind === 'single' ? payload.value : '';

  return (
    <main className="min-h-screen bg-black text-white px-5 pt-10 pb-28">
      <div className="max-w-md mx-auto">
        <p className="text-[11px] font-bold tracking-[0.18em] text-[#0FF1CE]">SHOCKWAVE CAPITAL</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Copy login details</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Tap the button to put the details on your clipboard. You can also tap a field and choose Copy.
        </p>

        {!ready && (
          <div className="mt-8 text-sm text-zinc-500">Loading login details...</div>
        )}

        {ready && !payload && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-[#111113] p-5 text-sm leading-6 text-zinc-300">
            Open this page from the Copy button in your Shockwave Capital email. If the button didn't include the details, go back to the email, press and hold the value, then tap Copy.
          </div>
        )}

        {payload?.kind === 'single' && (
          <div className="mt-8">
            <ValueField label={payload.label} value={payload.value} />
          </div>
        )}

        {payload?.kind === 'all' && (
          <div className="mt-8 space-y-4">
            {rows.map((row) => (
              <div key={row.key} className="flex items-end gap-2">
                <div className="flex-1 min-w-0">
                  <ValueField label={row.label} value={row.value} />
                </div>
                <button
                  type="button"
                  onClick={() => { void copyValue(row.key, row.value); }}
                  className="mb-0.5 h-12 shrink-0 rounded-xl border border-white/10 px-3 text-sm font-semibold text-[#0FF1CE]"
                >
                  {copiedKey === row.key ? 'Copied' : 'Copy'}
                </button>
              </div>
            ))}
          </div>
        )}

        {copyFailed && (
          <p className="mt-4 text-sm text-amber-300" role="status">
            Clipboard access was blocked. Tap the field, then choose Copy.
          </p>
        )}
      </div>

      {payload && (
        <div className="fixed inset-x-0 bottom-0 border-t border-white/10 bg-black/95 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => { void copyValue('all', allText); }}
            className="mx-auto flex h-12 w-full max-w-md items-center justify-center rounded-xl bg-[#0FF1CE] text-base font-bold text-black"
          >
            {copiedKey === 'all' ? 'Copied' : payload.kind === 'single' ? `Copy ${payload.label}` : 'Copy all details'}
          </button>
        </div>
      )}
    </main>
  );
}

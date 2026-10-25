'use client';

import React, { useState } from 'react';
import { Check, ChevronDown, Copy, KeyRound } from 'lucide-react';

export interface VipLoginCredentials {
  login: string;
  password: string;
  server: string;
}

export default function VipLoginCredentialsAccordion({
  credentials,
  platform,
  emptyMessage = 'Login details will appear here after your account is connected with broker credentials.'
}: {
  credentials?: VipLoginCredentials | null;
  platform?: string;
  emptyMessage?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const hasCredentials = Boolean(credentials?.login && credentials?.password && credentials?.server);

  const copyText = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 1600);
    } catch (error) {
      console.error('Failed to copy credentials:', error);
    }
  };

  const copyAll = () => {
    if (!credentials) return;
    const platformLabel = platform?.toUpperCase() || 'MT5';
    copyText(
      'all',
      `Platform: ${platformLabel}\nServer: ${credentials.server}\nLogin ID: ${credentials.login}\nPassword: ${credentials.password}`
    );
  };

  return (
    <div
      className="mt-4 pt-4 border-t border-[#2F2F2F]/50"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-3 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm text-white font-medium">
          <KeyRound size={15} className="text-[#0FF1CE]" />
          Login credentials
        </span>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-80 opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
        {hasCredentials && credentials ? (
          <div className="bg-[#0D0D0D]/70 border border-[#2F2F2F]/60 rounded-xl p-3 space-y-2">
            <CredentialRow label="Server" value={credentials.server} copied={copied === 'server'} onCopy={() => copyText('server', credentials.server)} />
            <CredentialRow label="Login ID" value={credentials.login} copied={copied === 'login'} onCopy={() => copyText('login', credentials.login)} />
            <CredentialRow label="Password" value={credentials.password} copied={copied === 'password'} onCopy={() => copyText('password', credentials.password)} />
            <button
              type="button"
              onClick={copyAll}
              className="w-full mt-1 inline-flex items-center justify-center gap-2 bg-[#0FF1CE]/10 hover:bg-[#0FF1CE]/20 text-[#0FF1CE] text-xs font-medium py-2 rounded-lg transition-colors"
            >
              {copied === 'all' ? <Check size={14} /> : <Copy size={14} />}
              {copied === 'all' ? 'Copied login details' : 'Copy all to clipboard'}
            </button>
          </div>
        ) : (
          <p className="text-xs text-gray-500">
            {emptyMessage}
          </p>
        )}
      </div>
    </div>
  );
}

function CredentialRow({
  label,
  value,
  copied,
  onCopy
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 bg-[#151515] border border-[#2F2F2F]/50 rounded-lg px-3 py-2">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
        <p className="text-sm text-white font-mono truncate">{value}</p>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="flex-shrink-0 p-1.5 rounded-md text-gray-400 hover:text-[#0FF1CE] hover:bg-[#0FF1CE]/10 transition-colors"
        aria-label={`Copy ${label}`}
      >
        {copied ? <Check size={14} className="text-[#0FF1CE]" /> : <Copy size={14} />}
      </button>
    </div>
  );
}

'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  blankAccountLine,
  buildProposalText,
  draftFromOffer,
  draftTotals,
  formatSignedUsd,
  formatUsdExact,
  offerBenefits,
  parseVipOfferDraft,
  privateRefreshDraft,
  type VipCustomOfferRecord,
  type VipOfferDraft
} from '@/lib/vip-offers';
import { CheckCircle, ChevronDown, Copy, Loader2, Plus, RefreshCw, Search, Send, Trash2, XCircle } from 'lucide-react';

type ResolvedUser = {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
};

type StoredOffer = VipCustomOfferRecord & { id: string };

const inputClass = 'w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#0FF1CE]/50';

function recipientLabel(user: ResolvedUser) {
  const name = `${user.firstName} ${user.lastName}`.trim();
  return name || user.email;
}

export default function PrivateOfferComposer() {
  const [draft, setDraft] = useState<VipOfferDraft>(privateRefreshDraft);
  const [email, setEmail] = useState('');
  const [recipient, setRecipient] = useState<ResolvedUser | null>(null);
  const [offers, setOffers] = useState<StoredOffer[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPaymentStatus, setEditingPaymentStatus] = useState<StoredOffer['paymentStatus'] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const totals = draftTotals(draft);
  const parsed = parseVipOfferDraft(draft);
  const priceLocked = !!editingPaymentStatus && editingPaymentStatus !== 'unpaid';

  const loadOffers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/vip-offers', { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not load private offers.');
      setOffers(Array.isArray(data.offers) ? data.offers : []);
    } catch (error) {
      console.error('Error loading private offers:', error);
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Could not load private offers.' });
      setComposerOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOffers();
  }, []);

  const updateDraft = (patch: Partial<VipOfferDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const updateAccount = (key: string, patch: Partial<VipOfferDraft['accounts'][number]>) => {
    setDraft((current) => ({
      ...current,
      accounts: current.accounts.map((account) => account.key === key ? { ...account, ...patch } : account)
    }));
  };

  const searchUser = async () => {
    if (!email.trim()) return;
    try {
      setIsSearching(true);
      setMessage(null);
      const response = await fetch('/api/admin/resolve-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (response.ok) {
        const resolved: ResolvedUser = await response.json();
        setRecipient(resolved);
        if (editingId) {
          const current = offers.find((offer) => offer.id === editingId);
          if (current && current.userId !== resolved.uid) {
            setEditingId(null);
            setEditingPaymentStatus(null);
          }
        }
      } else if (response.status === 404) {
        setRecipient(null);
        setMessage({ type: 'error', text: 'No account was found for that email.' });
      } else {
        setMessage({ type: 'error', text: 'Could not search for that email.' });
      }
    } catch (error) {
      console.error('Error searching offer recipient:', error);
      setMessage({ type: 'error', text: 'Could not search for that email.' });
    } finally {
      setIsSearching(false);
    }
  };

  const resetValues = () => {
    const template = privateRefreshDraft();
    setDraft(template);
    setCopied(false);
  };

  const startNew = () => {
    setDraft(privateRefreshDraft());
    setRecipient(null);
    setEmail('');
    setEditingId(null);
    setEditingPaymentStatus(null);
    setMessage(null);
  };

  const loadOffer = (offer: StoredOffer) => {
    setDraft(draftFromOffer(offer));
    setRecipient({
      uid: offer.userId,
      email: offer.userEmail,
      firstName: offer.recipientName,
      lastName: ''
    });
    setEmail(offer.userEmail);
    setEditingId(offer.id);
    setEditingPaymentStatus(offer.paymentStatus);
    setMessage(null);
    setComposerOpen(true);
    requestAnimationFrame(() => {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const copyProposal = async () => {
    if (!parsed.ok) {
      setMessage({ type: 'error', text: parsed.error });
      return;
    }
    try {
      await navigator.clipboard.writeText(buildProposalText(parsed.value, recipient ? recipientLabel(recipient) : undefined));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying proposal:', error);
      setMessage({ type: 'error', text: 'Could not copy the proposal.' });
    }
  };

  const sendOffer = async () => {
    if (!recipient) {
      setMessage({ type: 'error', text: 'Search for the client email before sending the offer.' });
      return;
    }
    if (!parsed.ok) {
      setMessage({ type: 'error', text: parsed.error });
      return;
    }

    const openOffer = offers.find((offer) =>
      offer.userId === recipient.uid &&
      offer.id !== editingId &&
      offer.status !== 'revoked' &&
      offer.paymentStatus === 'unpaid'
    );
    if (!editingId && openOffer && !window.confirm(`${recipient.email} already has an open private offer. Send another one?`)) {
      return;
    }

    try {
      setIsSaving(true);
      setMessage(null);
      const response = await fetch('/api/admin/vip-offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: editingId ? 'update' : 'create',
          offerId: editingId,
          userId: recipient.uid,
          draft
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not save the offer.');
      setOffers(Array.isArray(data.offers) ? data.offers : []);
      if (editingId) {
        setMessage({ type: 'success', text: `Updated the offer for ${recipient.email}.` });
      } else {
        setMessage({ type: 'success', text: `Sent the private offer to ${recipient.email}. It is now on their VIP portal.` });
        setDraft(privateRefreshDraft());
        setRecipient(null);
        setEmail('');
      }
    } catch (error) {
      console.error('Error saving private offer:', error);
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Could not save the offer.' });
    } finally {
      setIsSaving(false);
    }
  };

  const changeOffer = async (offer: StoredOffer, action: 'revoke' | 'paid') => {
    if (action === 'revoke' && !window.confirm(`Remove the private offer for ${offer.userEmail}? It will disappear from their VIP portal.`)) return;
    try {
      const response = await fetch('/api/admin/vip-offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, offerId: offer.id })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not update the offer.');
      if (action === 'revoke' && editingId === offer.id) startNew();
      setOffers(Array.isArray(data.offers) ? data.offers : []);
    } catch (error) {
      console.error('Error updating private offer:', error);
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Could not update the offer.' });
    }
  };

  const openOfferCount = offers.filter((offer) => offer.status !== 'revoked' && offer.paymentStatus === 'unpaid').length;

  return (
    <section ref={sectionRef} className="bg-black rounded-xl border border-white/10 mb-5 md:mb-8">
      <button
        type="button"
        onClick={() => setComposerOpen((open) => !open)}
        aria-expanded={composerOpen}
        className="flex w-full items-start justify-between gap-4 p-4 text-left md:p-6"
      >
        <span className="min-w-0">
          <span className="block text-base font-semibold text-white md:text-lg">Private VIP Offer</span>
          <span className="mt-1 block max-w-2xl text-xs text-gray-400 md:text-sm">
            {composerOpen
              ? 'Build a one-client offer, search their email, and send it to their VIP portal. Reset restores the private refresh template, including the sample account figures, so edit the balances before sending it to someone else.'
              : openOfferCount > 0
                ? `${openOfferCount} open ${openOfferCount === 1 ? 'offer' : 'offers'}. Open this to edit one or send a new offer.`
                : 'Open this to build a one-client offer and send it to their VIP portal.'}
          </span>
        </span>
        <ChevronDown className={`mt-1 h-5 w-5 shrink-0 text-gray-400 transition-transform ${composerOpen ? 'rotate-180' : ''}`} />
      </button>

      {composerOpen && (
      <div className="border-t border-white/10 px-4 pb-4 pt-4 md:px-6 md:pb-6">
      {editingId && (
        <div className="mb-4 flex justify-end">
          <button type="button" onClick={startNew} className="text-sm text-[#0FF1CE] hover:underline">
            New offer
          </button>
        </div>
      )}

      {message && (
        <div className={`mb-4 rounded-lg border px-3 py-2 text-sm ${message.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-red-500/30 bg-red-500/10 text-red-200'}`}>
          {message.text}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') searchUser(); }}
          placeholder="Client email"
          className={`${inputClass} flex-1`}
        />
        <button
          type="button"
          onClick={searchUser}
          disabled={isSearching || !email.trim()}
          className="px-4 py-2 bg-[#0FF1CE] text-black rounded-lg text-sm font-medium disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Search
        </button>
      </div>

      {recipient && (
        <div className="mb-4 rounded-lg border border-white/10 px-3 py-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#0FF1CE]">
            {editingId ? 'Editing offer for' : 'Editable worksheet'}
          </p>
          <p className="mt-1 text-white font-medium">{recipientLabel(recipient)}</p>
          <p className="text-sm text-gray-400">{recipient.email}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <Field label="Headline" value={draft.headline} onChange={(value) => updateDraft({ headline: value })} />
        <Field label="Card subtitle" value={draft.subtitle} onChange={(value) => updateDraft({ subtitle: value })} />
        <Field label="Package name" value={draft.packageName} onChange={(value) => updateDraft({ packageName: value })} />
        <Field label="Package summary" value={draft.packageSummary} onChange={(value) => updateDraft({ packageSummary: value })} />
        <Field label="Eyebrow" value={draft.eyebrow} onChange={(value) => updateDraft({ eyebrow: value })} />
        <Field label="Proposal title" value={draft.title} onChange={(value) => updateDraft({ title: value })} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Offer price (USD)</label>
          <input className={inputClass} inputMode="decimal" value={draft.price} disabled={priceLocked} onChange={(event) => updateDraft({ price: event.target.value })} />
          <p className="mt-1 text-[11px] text-gray-500">One-time payment</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Refreshed allocations</label>
          <input className={inputClass} inputMode="decimal" value={draft.refreshedAllocation} disabled={priceLocked} onChange={(event) => updateDraft({ refreshedAllocation: event.target.value })} />
          <input className={`${inputClass} mt-2`} value={draft.refreshedAllocationLabel} onChange={(event) => updateDraft({ refreshedAllocationLabel: event.target.value })} placeholder="VIP reset + funded reactivation" />
        </div>
      </div>

      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-white">Account balances</h3>
          <button
            type="button"
            onClick={() => setDraft((current) => ({ ...current, accounts: [...current.accounts, blankAccountLine()] }))}
            className="inline-flex items-center gap-1 text-xs text-[#0FF1CE]"
          >
            <Plus className="w-3.5 h-3.5" />
            Add account
          </button>
        </div>
        <div className="space-y-3">
          {draft.accounts.map((account, index) => (
            <div key={account.key} className="rounded-lg border border-white/10 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs text-gray-500">Account {index + 1}</p>
                {draft.accounts.length > 1 && (
                  <button type="button" onClick={() => setDraft((current) => ({ ...current, accounts: current.accounts.filter((row) => row.key !== account.key) }))} className="text-gray-500 hover:text-red-300" aria-label="Remove account">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                <input className={inputClass} value={account.name} onChange={(event) => updateAccount(account.key, { name: event.target.value })} placeholder="Account name" />
                <input className={inputClass} value={account.detail} onChange={(event) => updateAccount(account.key, { detail: event.target.value })} placeholder="MT5 login or note" />
                <input className={inputClass} inputMode="decimal" value={account.currentBalance} disabled={priceLocked} onChange={(event) => updateAccount(account.key, { currentBalance: event.target.value })} placeholder="Current ($)" />
                <input className={inputClass} inputMode="decimal" value={account.afterBalance} disabled={priceLocked} onChange={(event) => updateAccount(account.key, { afterBalance: event.target.value })} placeholder="After offer ($)" />
                <input className={inputClass} value={account.afterLabel} onChange={(event) => updateAccount(account.key, { afterLabel: event.target.value })} placeholder="Reset, Reactivated, Unchanged" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-white/10 p-4 mb-5 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-gray-400">Combined current balances</span>
          <span className="text-white">{formatUsdExact(totals.current)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-gray-400">Combined after offer</span>
          <span className="text-white">{formatUsdExact(totals.after)}</span>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-2">
          <span className="text-gray-400">Additional notional trading-account balance</span>
          <span className="font-semibold text-[#3DDC97]">{formatSignedUsd(totals.additional)}</span>
        </div>
        <p className="text-[11px] leading-relaxed text-gray-500">Not cash profit, withdrawable funds, or a guaranteed financial benefit.</p>
        {parsed.ok && (
          <ul className="pt-2 space-y-1 text-xs text-gray-300">
            {offerBenefits(parsed.value).map((benefit) => <li key={benefit}>• {benefit}</li>)}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Field label="Profit split (%)" value={draft.profitSplit} onChange={(value) => updateDraft({ profitSplit: value })} />
        <Field label="First withdrawal (days)" value={draft.firstWithdrawalDays} onChange={(value) => updateDraft({ firstWithdrawalDays: value })} />
        <Field label="First payout cap ($)" value={draft.firstPayoutCap} onChange={(value) => updateDraft({ firstPayoutCap: value })} disabled={priceLocked} />
        <Field label="No payout cap from day" value={draft.noPayoutCapFromDay} onChange={(value) => updateDraft({ noPayoutCapFromDay: value })} />
        <Field label="Max drawdown (%)" value={draft.maxDrawdown} onChange={(value) => updateDraft({ maxDrawdown: value })} />
        <Field label="Daily drawdown (%)" value={draft.dailyDrawdown} onChange={(value) => updateDraft({ dailyDrawdown: value })} />
        <Field label="Leverage" value={draft.leverage} onChange={(value) => updateDraft({ leverage: value })} />
        <Field label="Offer valid (hours)" value={draft.validHours} onChange={(value) => updateDraft({ validHours: value })} />
      </div>
      <div className="mb-5">
        <Field label="Target activation" value={draft.targetActivation} onChange={(value) => updateDraft({ targetActivation: value })} />
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <button type="button" onClick={copyProposal} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm text-white">
          <Copy className="w-4 h-4" />
          {copied ? 'Copied' : 'Copy proposal'}
        </button>
        <button type="button" onClick={resetValues} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm text-white">
          <RefreshCw className="w-4 h-4" />
          Reset values
        </button>
        <button
          type="button"
          onClick={sendOffer}
          disabled={isSaving || !recipient}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#0FF1CE] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {recipient ? `${editingId ? 'Update offer for' : 'Send offer to'} ${recipient.email}` : 'Search a user to send'}
        </button>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Sent offers</h3>
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-[#0FF1CE]" />
        ) : offers.length === 0 ? (
          <p className="text-sm text-gray-500">No private offers yet.</p>
        ) : (
          <div className="space-y-2">
            {offers.map((offer) => (
              <div key={offer.id} className="flex flex-col gap-3 rounded-lg border border-white/10 p-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p className="text-sm text-white">{offer.recipientName || offer.userEmail}</p>
                  <p className="text-xs text-gray-500 truncate">{offer.userEmail} · {offer.headline} · {formatUsdExact(offer.price)}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-gray-400">
                    {offer.status === 'revoked' ? 'Removed' : offer.paymentStatus} · {offer.validHours}h
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => loadOffer(offer)} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white">Edit</button>
                  {offer.paymentStatus !== 'completed' && offer.status !== 'revoked' && (
                    <button type="button" onClick={() => changeOffer(offer, 'paid')} className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 px-3 py-1.5 text-xs text-emerald-300">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Mark paid
                    </button>
                  )}
                  {offer.status !== 'revoked' && (
                    <button type="button" onClick={() => changeOffer(offer, 'revoke')} className="inline-flex items-center gap-1 rounded-lg border border-red-500/40 px-3 py-1.5 text-xs text-red-300">
                      <XCircle className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
      )}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-gray-400">{label}</span>
      <input className={inputClass} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

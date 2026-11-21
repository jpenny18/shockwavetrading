'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, Clock } from 'lucide-react';
import { auth, VIPActivation } from '@/lib/firebase';
import { acceptMyVipOffer } from '@/lib/vip-offer-client';
import { VIP_RULES } from '@/lib/vip-accounts';
import {
  formatUsd,
  formatUsdExact,
  formatSignedUsd,
  inferOfferPlatform,
  offerBenefits,
  offerIsExpired,
  offerRuleRows,
  offerTotals,
  OFFER_NOTIONAL_DISCLAIMER,
  OFFER_TERMS_DISCLAIMER,
  VIP_CUSTOM_OFFER_KIND,
  VIP_PORTAL_OFFER_KIND,
  type VipCustomOfferRecord
} from '@/lib/vip-offers';
import VipOnboarding from './VipOnboarding';
import VipOfferPaymentModal from './VipOfferPaymentModal';

type StoredOffer = VipCustomOfferRecord & { id: string };

type PayTarget = {
  kind: typeof VIP_PORTAL_OFFER_KIND | typeof VIP_CUSTOM_OFFER_KIND;
  offerId: string;
  title: string;
  summary: string;
  price: number;
  amountLabel: string;
  initialPlatform: 'MT4' | 'MT5' | '';
};

function activationTitle(activation: VIPActivation) {
  return `${activation.accountSize} Private Allocation`;
}

function activationSubtitle(activation: VIPActivation) {
  return activation.tierName
    ? `Your private ${activation.tierName.toLowerCase()} allocation`
    : 'Your private allocation';
}

function RuleList({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="border-t border-white/10 px-4 sm:px-5">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between gap-4 border-b border-white/5 py-3 text-sm last:border-b-0">
          <span className="text-gray-400">{label}</span>
          <span className="text-right font-medium text-white">{value}</span>
        </div>
      ))}
    </div>
  );
}

function OfferSelectCard({
  selected,
  eyebrow,
  title,
  subtitle,
  price,
  publicPrice,
  note,
  expired,
  onSelect
}: {
  selected: boolean;
  eyebrow: string;
  title: string;
  subtitle: string;
  price: string;
  publicPrice?: string;
  note?: string;
  expired?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex h-full w-full flex-col rounded-2xl border p-4 text-left transition ${
        selected
          ? 'border-[#0FF1CE] bg-[#071614] shadow-[0_0_0_1px_rgba(15,241,206,0.25)]'
          : 'border-white/10 bg-black hover:border-white/20'
      }`}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0FF1CE]">{eyebrow}</span>
        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-[#0FF1CE] bg-[#0FF1CE] text-black' : 'border-white/20'}`}>
          {selected && <Check size={12} strokeWidth={3} />}
        </span>
      </span>
      <span className="mt-3 block text-2xl font-semibold text-white">{title}</span>
      <span className="mt-1 block text-sm text-gray-400">{subtitle}</span>
      <span className="mt-4 block">
        {publicPrice && <span className="block text-sm text-gray-500 line-through">{publicPrice}</span>}
        <span className="block text-xl font-semibold text-white">{price}</span>
        {note && (
          <span className={`mt-1 flex items-center gap-1.5 text-xs ${expired ? 'text-amber-300' : 'text-gray-500'}`}>
            {!expired && <Clock size={12} className="text-[#0FF1CE]" />}
            {note}
          </span>
        )}
      </span>
    </button>
  );
}

export default function AllocationOffers({
  userId,
  activation,
  offers,
  onActivationUpdated,
  onOffersUpdated
}: {
  userId: string;
  activation: VIPActivation | null;
  offers: StoredOffer[];
  onActivationUpdated: () => Promise<void>;
  onOffersUpdated: () => Promise<void>;
}) {
  const cards = useMemo(() => {
    const next: Array<{ id: string; kind: 'activation' | 'custom' }> = [];
    if (activation) next.push({ id: 'activation', kind: 'activation' });
    offers.forEach((offer) => next.push({ id: offer.id, kind: 'custom' }));
    return next;
  }, [activation, offers]);

  const [selectedId, setSelectedId] = useState('');
  const [rulesOpen, setRulesOpen] = useState(false);
  const [section, setSection] = useState<'payment' | 'agreement'>('payment');
  const [payTarget, setPayTarget] = useState<PayTarget | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    setSelectedId((current) => {
      if (current && cards.some((card) => card.id === current)) return current;
      const openCustom = offers.find((offer) => offer.paymentStatus === 'unpaid' && !offerIsExpired(offer));
      if (openCustom) return openCustom.id;
      return cards[0]?.id || '';
    });
  }, [cards, offers]);

  useEffect(() => {
    setRulesOpen(false);
    setSection('payment');
  }, [selectedId]);

  const selectedOffer = offers.find((offer) => offer.id === selectedId) || null;
  const activationSelected = selectedId === 'activation' && !!activation;

  const refreshPaid = async () => {
    await Promise.all([onActivationUpdated(), onOffersUpdated()]);
  };

  const acceptCustomTerms = async (offer: StoredOffer, accepted: boolean) => {
    if (!accepted || offer.termsAcceptedAt) return;
    try {
      setAccepting(true);
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      await acceptMyVipOffer(token, offer.id);
      await onOffersUpdated();
    } catch (error) {
      console.error('Error saving offer terms acceptance:', error);
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="space-y-4">
      <section>
        <h2 className="text-base font-semibold text-white">Available offers</h2>
        <p className="mt-1 text-sm text-gray-500">Choose an offer to review the terms and complete it.</p>
        <div className={`mt-3 grid grid-cols-1 gap-3 ${cards.length > 1 ? 'sm:grid-cols-2' : ''}`}>
          {activation && (
            <OfferSelectCard
              selected={activationSelected}
              eyebrow={activation.tierName || 'Allocation'}
              title={activation.accountSize}
              subtitle="Your private allocation"
              price={activation.paymentStatus === 'completed' ? 'Paid' : activation.paymentStatus === 'pending' ? 'In review' : formatUsd(activation.price)}
              publicPrice={activation.paymentStatus === 'unpaid' && activation.publicPrice && activation.publicPrice > activation.price ? formatUsd(activation.publicPrice) : undefined}
              note={
                activation.paymentStatus === 'unpaid' && activation.publicPrice && activation.publicPrice > activation.price
                  ? `You save ${formatUsd(activation.publicPrice - activation.price)}`
                  : activation.paymentStatus === 'unpaid'
                    ? 'One-time fee'
                    : undefined
              }
              onSelect={() => setSelectedId('activation')}
            />
          )}
          {offers.map((offer) => {
            const expired = offerIsExpired(offer);
            const price = offer.paymentStatus === 'completed'
              ? 'Paid'
              : offer.paymentStatus === 'pending'
                ? 'In review'
                : formatUsd(offer.price);
            return (
              <OfferSelectCard
                key={offer.id}
                selected={selectedId === offer.id}
                eyebrow={offer.eyebrow || 'Private offer'}
                title={offer.headline}
                subtitle={offer.subtitle || offer.packageSummary}
                price={price}
                note={offer.paymentStatus === 'unpaid' ? (expired ? 'This offer has expired' : `Available for ${offer.validHours} hours`) : undefined}
                expired={expired}
                onSelect={() => setSelectedId(offer.id)}
              />
            );
          })}
        </div>
      </section>

      {activationSelected && activation && (
        <>
          <section className="overflow-hidden rounded-2xl border border-white/10 bg-black">
            <div className="flex items-start justify-between gap-4 p-4 sm:p-5">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold text-white">{activationTitle(activation)}</h2>
                <p className="mt-1 text-sm text-gray-400">{activationSubtitle(activation)}{activation.platform ? ` · ${activation.platform}` : ''}</p>
              </div>
              {activation.paymentStatus === 'unpaid' && (
                <p className="text-xl font-semibold text-white">{formatUsd(activation.price)}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setRulesOpen((open) => !open)}
              className="flex w-full items-center justify-between gap-3 border-t border-white/10 px-4 py-3 text-left text-sm text-gray-300 sm:px-5"
              aria-expanded={rulesOpen}
            >
              Allocation rules & benefits
              <ChevronDown size={16} className={`shrink-0 text-gray-400 transition-transform ${rulesOpen ? 'rotate-180' : ''}`} />
            </button>
            {rulesOpen && (
              <>
                <RuleList
                  rows={[
                    ['Maximum drawdown', `${VIP_RULES.maxDrawdown}%`],
                    ['Daily drawdown', `${VIP_RULES.maxDailyDrawdown}%`],
                    ['Leverage', VIP_RULES.leverage],
                    ['Starting profit split', `${VIP_RULES.profitSplit}%`]
                  ]}
                />
                <p className="px-4 pb-4 text-xs leading-relaxed text-gray-500 sm:px-5">{OFFER_TERMS_DISCLAIMER}</p>
              </>
            )}
          </section>
          <VipOnboarding
            userId={userId}
            activation={activation}
            onUpdated={onActivationUpdated}
            heading="Complete selected offer"
            checkoutLabel={`${activation.accountSize} ${activation.tierName || 'institutional'} allocation`}
            checkoutTotal={`${formatUsdExact(activation.price)} USD`}
            onOpenPayment={() => setPayTarget({
              kind: VIP_PORTAL_OFFER_KIND,
              offerId: userId,
              title: activationTitle(activation),
              summary: activationSubtitle(activation),
              price: activation.price,
              amountLabel: activation.accountSize,
              initialPlatform: (activation.platform || '').toUpperCase() === 'MT4' || (activation.platform || '').toUpperCase() === 'MT5'
                ? (activation.platform || '').toUpperCase() as 'MT4' | 'MT5'
                : ''
            })}
          />
        </>
      )}

      {selectedOffer && (
        <CustomOfferDetail
          offer={selectedOffer}
          rulesOpen={rulesOpen}
          onToggleRules={() => setRulesOpen((open) => !open)}
          section={section}
          onSection={setSection}
          accepting={accepting}
          onAccept={(accepted) => acceptCustomTerms(selectedOffer, accepted)}
          onPay={() => setPayTarget({
            kind: VIP_CUSTOM_OFFER_KIND,
            offerId: selectedOffer.id,
            title: selectedOffer.packageName || selectedOffer.headline,
            summary: selectedOffer.packageSummary || selectedOffer.subtitle,
            price: selectedOffer.price,
            amountLabel: selectedOffer.headline,
            initialPlatform: inferOfferPlatform(selectedOffer.accounts)
          })}
        />
      )}

      {payTarget && (
        <VipOfferPaymentModal
          {...payTarget}
          onClose={() => setPayTarget(null)}
          onSubmitted={refreshPaid}
        />
      )}
    </div>
  );
}

function CustomOfferDetail({
  offer,
  rulesOpen,
  onToggleRules,
  section,
  onSection,
  accepting,
  onAccept,
  onPay
}: {
  offer: StoredOffer;
  rulesOpen: boolean;
  onToggleRules: () => void;
  section: 'payment' | 'agreement';
  onSection: (section: 'payment' | 'agreement') => void;
  accepting: boolean;
  onAccept: (accepted: boolean) => void;
  onPay: () => void;
}) {
  const expired = offerIsExpired(offer);
  const payable = offer.paymentStatus === 'unpaid' && !expired;
  const benefits = offerBenefits(offer);
  const totals = offerTotals(offer.accounts);
  const signed = !!offer.termsAcceptedAt;

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-black">
        <div className="flex items-start justify-between gap-4 p-4 sm:p-5">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-white">{offer.packageName || offer.headline}</h2>
            <p className="mt-1 text-sm text-gray-400">{offer.packageSummary || offer.subtitle}</p>
            {offer.targetActivation && (
              <p className="mt-2 text-xs text-gray-500">Target activation {offer.targetActivation}</p>
            )}
          </div>
          <p className="shrink-0 text-xl font-semibold text-white">
            {offer.paymentStatus === 'completed' ? 'Paid' : offer.paymentStatus === 'pending' ? 'In review' : formatUsd(offer.price)}
          </p>
        </div>
        {benefits.length > 0 && (
          <ul className="mx-4 mb-4 space-y-3 rounded-xl border border-white/5 bg-white/[0.03] p-4 sm:mx-5">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3 text-sm text-gray-200">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0FF1CE]/15 text-[#0FF1CE]">
                  <Check size={12} strokeWidth={3} />
                </span>
                {benefit}
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={onToggleRules}
          className="flex w-full items-center justify-between gap-3 border-t border-white/10 px-4 py-3 text-left text-sm text-gray-300 sm:px-5"
          aria-expanded={rulesOpen}
        >
          Allocation rules & benefits
          <ChevronDown size={16} className={`shrink-0 text-gray-400 transition-transform ${rulesOpen ? 'rotate-180' : ''}`} />
        </button>
        {rulesOpen && (
          <>
            <RuleList rows={offerRuleRows(offer)} />
            <p className="px-4 pb-4 text-xs leading-relaxed text-gray-500 sm:px-5">{OFFER_TERMS_DISCLAIMER}</p>
          </>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-black p-4 sm:p-5">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Complete selected offer</h2>
            <p className="mt-1 text-sm text-gray-500">
              {offer.paymentStatus === 'completed' ? 'Payment confirmed' : offer.paymentStatus === 'pending' ? 'Payment in review' : expired ? 'Offer expired' : 'Payment required'}
              {' · '}
              {signed ? 'Terms accepted' : 'Review terms'}
            </p>
          </div>
          <div className="grid grid-cols-2 rounded-lg border border-white/10 p-1 text-sm sm:flex">
            <button type="button" onClick={() => onSection('payment')} className={`rounded-md px-3 py-1.5 ${section === 'payment' ? 'bg-white/10 text-white' : 'text-gray-400'}`}>
              Payment
            </button>
            <button type="button" onClick={() => onSection('agreement')} className={`rounded-md px-3 py-1.5 ${section === 'agreement' ? 'bg-white/10 text-white' : 'text-gray-400'}`}>
              Agreement
            </button>
          </div>
        </div>

        {section === 'payment' && (
          <div>
            {offer.paymentStatus === 'completed' && (
              <p className="flex items-start gap-2 text-sm text-gray-300">
                <Check size={16} className="mt-0.5 shrink-0 text-[#0FF1CE]" />
                Payment for {offer.packageName || offer.headline} is confirmed.
              </p>
            )}
            {offer.paymentStatus === 'pending' && (
              <div className="text-sm text-gray-300">
                <p className="flex items-start gap-2">
                  <Clock size={16} className="mt-0.5 shrink-0 text-amber-300" />
                  Payment submitted. Confirmation usually takes up to 30 minutes.
                </p>
                {offer.cryptoOrderId && (
                  <p className="mt-2 break-all text-gray-500">
                    Order reference <span className="font-mono text-[#0FF1CE]">{offer.cryptoOrderId}</span>
                  </p>
                )}
              </div>
            )}
            {offer.paymentStatus === 'unpaid' && expired && (
              <p className="text-sm text-amber-200">This offer is no longer available for payment. Contact your account manager if it should be reopened.</p>
            )}
            {payable && (
              <div>
                <div className="rounded-xl border border-white/10 bg-[#0D0D0D]">
                  <div className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
                    <span className="text-gray-400">Your selected offer</span>
                    <span className="text-right text-white">{offer.packageSummary || offer.headline}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-t border-white/10 px-4 py-3">
                    <span className="font-medium text-white">Total due</span>
                    <span className="text-base font-semibold text-white">{formatUsdExact(offer.price)} USD</span>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-gray-500">
                  Complete payment in the secure checkout window after reviewing the offer terms.
                </p>
                <button
                  type="button"
                  onClick={onPay}
                  className="mt-4 flex w-full items-center justify-center rounded-xl bg-[#0FF1CE] px-4 py-3 text-sm font-semibold text-black transition hover:brightness-110"
                >
                  Open payment portal
                </button>
              </div>
            )}
          </div>
        )}

        {section === 'agreement' && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <div className="min-w-[28rem]">
              <div className="grid grid-cols-[1.2fr_0.8fr_0.9fr] gap-2 border-b border-white/10 px-3 py-2 text-[11px] uppercase tracking-wide text-gray-500">
                <span>Account</span>
                <span className="text-right">Current</span>
                <span className="text-right">After activation</span>
              </div>
              { (offer.accounts || []).map((account) => (
                <div key={`${account.name}-${account.detail}`} className="grid grid-cols-[1.2fr_0.8fr_0.9fr] gap-2 border-b border-white/5 px-3 py-3 text-sm last:border-b-0">
                  <div className="min-w-0">
                    <p className="font-medium text-white">{account.name}</p>
                    {account.detail && <p className="text-xs text-gray-500">{account.detail}</p>}
                  </div>
                  <p className="text-right text-gray-300">{account.currentBalance > 0 ? formatUsdExact(account.currentBalance) : 'Inactive'}</p>
                  <div className="text-right">
                    <p className="font-medium text-[#0FF1CE]">{formatUsdExact(account.afterBalance)}</p>
                    <p className="text-[11px] text-gray-500">{account.afterLabel}</p>
                  </div>
                </div>
              ))}
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-400">Total account balances</span>
                <span className="font-semibold text-white">{formatUsdExact(totals.after)}</span>
              </div>
              <p className="text-[#3DDC97]">{formatSignedUsd(totals.additional)} in restored account balances</p>
              <p className="text-xs leading-relaxed text-gray-500">{OFFER_NOTIONAL_DISCLAIMER}</p>
            </div>
            <label className="flex items-start gap-3 rounded-lg border border-white/10 px-3 py-3 text-sm text-white">
              <input
                type="checkbox"
                checked={signed}
                disabled={signed || accepting}
                onChange={(event) => onAccept(event.target.checked)}
                className="mt-0.5"
              />
              <span>
                I have read this private offer, including that the restored balances are notional trading-account balances.
                <span className="mt-1 block text-xs text-gray-500">
                  {signed ? 'Terms accepted.' : 'Checking this box records your acceptance.'}
                </span>
              </span>
            </label>
          </div>
        )}
      </section>
    </>
  );
}

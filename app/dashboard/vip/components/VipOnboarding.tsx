'use client';

import React, { useState } from 'react';
import {
  Timestamp,
  updateVIPActivation,
  uploadFile,
  VIPActivation
} from '@/lib/firebase';
import { VIP_PAYMENT_PORTAL_URL } from '@/lib/vip-portal';
import FundedAgreement from './FundedAgreement';
import {
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Trash2,
  Upload,
  XCircle
} from 'lucide-react';

const inputClass =
  'w-full rounded-lg border border-[#2F2F2F] bg-[#101010] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#0FF1CE]/50';

function signedOn(value?: { toDate?: () => Date }) {
  return value?.toDate?.().toLocaleDateString() || 'record';
}

export default function VipOnboarding({
  userId,
  activation,
  onUpdated
}: {
  userId: string;
  activation: VIPActivation;
  onUpdated: () => Promise<void>;
}) {
  const [companyName, setCompanyName] = useState(activation.companyName || '');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [customTermsAccepted, setCustomTermsAccepted] = useState(false);
  const [activeTermsTab, setActiveTermsTab] = useState<'funded' | 'custom'>('funded');
  const [isSubmittingKyb, setIsSubmittingKyb] = useState(false);
  const [kybError, setKybError] = useState('');
  const [showAgreement, setShowAgreement] = useState(false);

  const existingDocs = activation.documents?.corporateDocs || [];
  const agreementAlreadySigned = !!activation.documents?.agreementSignedAt;
  const hasCustomTerms = !!activation.customTerms?.content;
  const customTermsTitle = activation.customTerms?.title || 'Additional Account Terms';
  const customTermsAlreadySigned = !!activation.documents?.customTermsSignedAt;
  const showKybForm =
    activation.kybStatus === 'not_submitted' ||
    activation.kybStatus === 'rejected' ||
    activation.kybStatus === 'needs_resubmission';
  const needsAction = activation.paymentStatus === 'unpaid' || showKybForm;

  const [section, setSection] = useState<'payment' | 'verification'>(
    activation.paymentStatus === 'unpaid' ? 'payment' : 'verification'
  );

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...files]);
      setKybError('');
    }
    event.target.value = '';
  };

  const handleKybSubmit = async () => {
    if (existingDocs.length === 0 && selectedFiles.length === 0) {
      setKybError('Please upload at least one corporate/KYB document');
      return;
    }
    if (!agreementAlreadySigned && !agreementAccepted) {
      setKybError('Please review and accept the account terms');
      return;
    }
    if (hasCustomTerms && !customTermsAlreadySigned && !customTermsAccepted) {
      setKybError(`Please review and accept the ${customTermsTitle}`);
      return;
    }

    try {
      setIsSubmittingKyb(true);
      setKybError('');

      const uploadedDocs = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const ext = file.name.split('.').pop();
        const path = `vip/${userId}/corporate-doc-${Date.now()}-${i}.${ext}`;
        const url = await uploadFile(file, path);
        uploadedDocs.push({
          url,
          fileName: file.name,
          uploadedAt: Timestamp.now()
        });
      }

      const documentsUpdate: VIPActivation['documents'] = {
        corporateDocs: [...existingDocs, ...uploadedDocs]
      };
      if (!agreementAlreadySigned) documentsUpdate.agreementSignedAt = Timestamp.now();
      if (hasCustomTerms && !customTermsAlreadySigned) documentsUpdate.customTermsSignedAt = Timestamp.now();

      const update: Partial<VIPActivation> = {
        kybStatus: 'pending',
        kybSubmittedAt: Timestamp.now(),
        documents: documentsUpdate
      };
      if (companyName.trim()) update.companyName = companyName.trim();

      await updateVIPActivation(userId, update);
      setSelectedFiles([]);
      await onUpdated();
    } catch (error) {
      console.error('Error submitting KYB documents:', error);
      setKybError('Failed to submit documents. Please try again.');
    } finally {
      setIsSubmittingKyb(false);
    }
  };

  const paymentLabel =
    activation.paymentStatus === 'completed'
      ? 'Payment confirmed'
      : activation.paymentStatus === 'pending'
        ? 'Payment in review'
        : 'Payment required';
  const documentLabel =
    activation.kybStatus === 'approved'
      ? 'Documents approved'
      : activation.kybStatus === 'pending'
        ? 'Documents in review'
        : activation.kybStatus === 'rejected'
          ? 'Documents rejected'
          : activation.kybStatus === 'needs_resubmission'
            ? 'Documents need an update'
            : 'Documents required';

  if (!needsAction) {
    return (
      <section className="h-full rounded-2xl border border-white/10 bg-black p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 text-sm text-gray-300">
            <p className="flex items-center gap-2">
              {activation.paymentStatus === 'completed' ? (
                <CheckCircle2 size={16} className="text-[#0FF1CE]" />
              ) : (
                <Clock size={16} className="text-amber-300" />
              )}
              {paymentLabel}
              {activation.cryptoOrderId && activation.paymentStatus === 'pending' && (
                <span className="break-all font-mono text-xs text-gray-500">{activation.cryptoOrderId}</span>
              )}
            </p>
            <p className="flex items-center gap-2">
              {activation.kybStatus === 'approved' ? (
                <CheckCircle2 size={16} className="text-[#0FF1CE]" />
              ) : (
                <Clock size={16} className="text-amber-300" />
              )}
              {documentLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAgreement((open) => !open)}
            className="text-sm text-gray-400 hover:text-white"
          >
            {showAgreement ? 'Hide agreement' : 'View agreement'}
          </button>
        </div>
        {showAgreement && (
          <div className="mt-4 max-h-80 overflow-y-auto rounded-xl border border-white/10 bg-[#0D0D0D] p-4">
            <FundedAgreement />
            {hasCustomTerms && (
              <div className="mt-6 whitespace-pre-line border-t border-white/10 pt-6 text-sm text-gray-400">
                <h3 className="mb-3 text-center text-base font-semibold text-white">{customTermsTitle}</h3>
                {activation.customTerms?.content}
              </div>
            )}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="h-full rounded-2xl border border-white/10 bg-black p-4 sm:p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Finish this allocation</h2>
          <p className="mt-1 text-sm text-gray-500">
            {paymentLabel} · {documentLabel}
          </p>
        </div>
        <div className="grid grid-cols-2 rounded-lg border border-white/10 p-1 text-sm sm:flex">
          <button
            type="button"
            onClick={() => setSection('payment')}
            className={`rounded-md px-3 py-1.5 ${section === 'payment' ? 'bg-white/10 text-white' : 'text-gray-400'}`}
          >
            Payment
          </button>
          <button
            type="button"
            onClick={() => setSection('verification')}
            className={`rounded-md px-3 py-1.5 ${section === 'verification' ? 'bg-white/10 text-white' : 'text-gray-400'}`}
          >
            Agreement
          </button>
        </div>
      </div>

      {section === 'payment' && (
        <div>
          {activation.paymentStatus === 'completed' && (
            <div>
              <p className="flex items-start gap-2 text-sm text-gray-300">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#0FF1CE]" />
                Payment for the {activation.accountSize} allocation is confirmed.
              </p>
              {showKybForm && (
                <button type="button" onClick={() => setSection('verification')} className="mt-3 text-sm text-[#0FF1CE]">
                  Continue to agreement and documents
                </button>
              )}
            </div>
          )}

          {activation.paymentStatus === 'pending' && (
            <div className="text-sm text-gray-300">
              <p className="flex items-start gap-2">
                <Clock size={16} className="mt-0.5 shrink-0 text-amber-300" />
                Payment submitted. Confirmation usually takes up to 30 minutes.
              </p>
              {activation.cryptoOrderId && (
                <p className="mt-2 break-all text-gray-500">
                  Order reference <span className="font-mono text-[#0FF1CE]">{activation.cryptoOrderId}</span>
                </p>
              )}
              {showKybForm && (
                <button type="button" onClick={() => setSection('verification')} className="mt-3 text-sm text-[#0FF1CE]">
                  Continue to agreement and documents
                </button>
              )}
            </div>
          )}

          {activation.paymentStatus === 'unpaid' && (
            <div>
              <p className="text-sm text-gray-400">
                Pay for this allocation on the VIP payment portal.
              </p>
              <a
                href={VIP_PAYMENT_PORTAL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] px-4 py-2.5 text-sm font-semibold text-black sm:w-auto"
              >
                Open payment portal
              </a>
            </div>
          )}
        </div>
      )}

      {section === 'verification' && (
        <div>
          {activation.kybStatus === 'approved' && (
            <p className="flex items-center gap-2 text-sm text-gray-300">
              <CheckCircle2 size={16} className="text-[#0FF1CE]" />
              Documents approved. Credentials are added once the allocation is connected.
            </p>
          )}
          {activation.kybStatus === 'pending' && (
            <div>
              <p className="flex items-center gap-2 text-sm text-gray-300">
                <Clock size={16} className="text-amber-300" />
                Documents are in review. This usually takes 1–2 business days.
              </p>
              <DocumentList docs={existingDocs} />
            </div>
          )}

          {showKybForm && (
            <div>
              {(activation.kybStatus === 'rejected' || activation.kybStatus === 'needs_resubmission') && (
                <div className={`mb-4 flex items-start gap-2 rounded-lg border px-3 py-3 text-sm ${
                  activation.kybStatus === 'rejected'
                    ? 'border-red-500/30 bg-red-500/10 text-red-300'
                    : 'border-orange-500/30 bg-orange-500/10 text-orange-200'
                }`}>
                  {activation.kybStatus === 'rejected' ? <XCircle size={16} className="mt-0.5" /> : <Clock size={16} className="mt-0.5" />}
                  <p>Update the documents below and submit them again.</p>
                </div>
              )}

              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTermsTab('funded')}
                  className={`max-w-full rounded-lg border px-3 py-1.5 text-left text-sm leading-snug ${
                    !hasCustomTerms || activeTermsTab === 'funded'
                      ? 'border-[#0FF1CE]/40 text-[#0FF1CE]'
                      : 'border-white/10 text-gray-400'
                  }`}
                >
                  Funded Trader Agreement{(agreementAlreadySigned || agreementAccepted) ? ' · signed' : ''}
                </button>
                {hasCustomTerms && (
                  <button
                    type="button"
                    onClick={() => setActiveTermsTab('custom')}
                    className={`max-w-full rounded-lg border px-3 py-1.5 text-left text-sm leading-snug ${
                      activeTermsTab === 'custom'
                        ? 'border-[#0FF1CE]/40 text-[#0FF1CE]'
                        : 'border-white/10 text-gray-400'
                    }`}
                  >
                    {customTermsTitle}{(customTermsAlreadySigned || customTermsAccepted) ? ' · signed' : ''}
                  </button>
                )}
              </div>

              <div className="mb-4 max-h-72 overflow-y-auto rounded-xl border border-white/10 bg-[#0D0D0D] p-4">
                {hasCustomTerms && activeTermsTab === 'custom' ? (
                  <div className="whitespace-pre-line text-sm text-gray-400">
                    <h3 className="mb-4 text-center text-base font-semibold text-white">{customTermsTitle}</h3>
                    {activation.customTerms?.content}
                  </div>
                ) : (
                  <FundedAgreement />
                )}
              </div>

              <div className="space-y-3">
                <AgreementCheck
                  signed={agreementAlreadySigned}
                  signedLabel={`Funded Trader Agreement signed on ${signedOn(activation.documents?.agreementSignedAt)}`}
                  checked={agreementAccepted}
                  onChange={setAgreementAccepted}
                  label="I have read, understood, and agree to the Shockwave Capital Funded Trader Agreement"
                />
                {hasCustomTerms && (
                  <AgreementCheck
                    signed={customTermsAlreadySigned}
                    signedLabel={`${customTermsTitle} signed on ${signedOn(activation.documents?.customTermsSignedAt)}`}
                    checked={customTermsAccepted}
                    onChange={setCustomTermsAccepted}
                    label={`I have read, understood, and agree to the ${customTermsTitle}`}
                  />
                )}
              </div>

              <div className="mt-5">
                <label className="mb-1.5 block text-xs text-gray-500">Company / entity name (optional)</label>
                <input className={inputClass} value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
              </div>

              <div className="mt-4">
                <p className="text-sm text-white">Corporate documents</p>
                <p className="mt-1 text-xs text-gray-500">
                  Certificate of incorporation, articles, proof of address, director ID, or other KYB files. PNG, JPG, or PDF.
                </p>
                <DocumentList docs={existingDocs} />
                {selectedFiles.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-lg border border-[#0FF1CE]/30 px-3 py-2">
                        <span className="flex min-w-0 items-center gap-2 text-sm text-white">
                          <FileText size={14} className="text-[#0FF1CE]" />
                          <span className="truncate">{file.name}</span>
                        </span>
                        <button type="button" onClick={() => setSelectedFiles((prev) => prev.filter((_, item) => item !== index))} className="text-gray-400 hover:text-red-300">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="mt-3 block cursor-pointer rounded-xl border border-dashed border-white/15 px-4 py-6 text-center hover:border-[#0FF1CE]/40">
                  <input type="file" accept="image/*,.pdf" multiple onChange={handleFileSelect} className="hidden" />
                  <Upload className="mx-auto mb-2 text-gray-500" size={20} />
                  <span className="text-sm text-gray-300">Upload documents</span>
                </label>
              </div>

              {kybError && <p className="mt-3 text-sm text-red-300">{kybError}</p>}

              <button
                type="button"
                onClick={handleKybSubmit}
                disabled={
                  isSubmittingKyb ||
                  (existingDocs.length === 0 && selectedFiles.length === 0) ||
                  (!agreementAlreadySigned && !agreementAccepted) ||
                  (hasCustomTerms && !customTermsAlreadySigned && !customTermsAccepted)
                }
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] py-2.5 text-sm font-semibold text-black disabled:opacity-50"
              >
                {isSubmittingKyb && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit for review
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function AgreementCheck({
  signed,
  signedLabel,
  checked,
  onChange,
  label
}: {
  signed: boolean;
  signedLabel: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  if (signed) {
    return (
      <p className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-3 text-sm text-gray-300">
        <CheckCircle2 size={16} className="text-[#0FF1CE]" />
        {signedLabel}
      </p>
    );
  }

  return (
    <label className="flex items-start gap-3 rounded-lg border border-white/10 px-3 py-3 text-sm text-white">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-0.5" />
      <span>
        {label}
        <span className="mt-1 block text-xs text-gray-500">Checking this box is your electronic signature.</span>
      </span>
    </label>
  );
}

function DocumentList({ docs }: { docs: Array<{ fileName: string }> }) {
  if (docs.length === 0) return null;
  return (
    <div className="mt-3 space-y-2">
      {docs.map((docItem, index) => (
        <div key={`${docItem.fileName}-${index}`} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-300">
          <CheckCircle2 size={14} className="text-[#0FF1CE]" />
          <span className="truncate">{docItem.fileName}</span>
        </div>
      ))}
    </div>
  );
}

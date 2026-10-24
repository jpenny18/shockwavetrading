'use client';

import React, { useEffect, useState } from 'react';
import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Plus, Tag, Trash2 } from 'lucide-react';

const DISCOUNT_PERCENT = 20;

interface ResetCode {
  id: string;
  code: string;
  active: boolean;
  discountPercent: number;
  expiresAt: Timestamp | null;
  usageLimit: number | null;
  usageCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export default function VipResetCodesPage() {
  const [codes, setCodes] = useState<ResetCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [active, setActive] = useState(true);
  const [expiresAt, setExpiresAt] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [error, setError] = useState('');

  const loadCodes = async () => {
    try {
      const snapshot = await getDocs(query(collection(db, 'vipResetCodes'), orderBy('createdAt', 'desc')));
      setCodes(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as ResetCode));
    } catch (loadError) {
      console.error('Error fetching VIP reset codes:', loadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCodes();
  }, []);

  const resetForm = () => {
    setCode('');
    setActive(true);
    setExpiresAt('');
    setUsageLimit('');
    setError('');
    setEditingId(null);
    setIsCreating(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]+$/.test(normalized)) {
      setError('Code must contain only uppercase letters, numbers, underscores, and hyphens');
      return;
    }
    if (usageLimit && Number(usageLimit) <= 0) {
      setError('Usage limit must be greater than 0');
      return;
    }

    try {
      const now = Timestamp.now();
      const payload = {
        code: normalized,
        active,
        discountPercent: DISCOUNT_PERCENT,
        expiresAt: expiresAt ? Timestamp.fromDate(new Date(expiresAt)) : null,
        usageLimit: usageLimit ? Number(usageLimit) : null,
        updatedAt: now,
      };

      if (editingId) {
        await updateDoc(doc(db, 'vipResetCodes', editingId), payload);
      } else {
        const existing = await getDocs(query(collection(db, 'vipResetCodes'), where('code', '==', normalized)));
        if (!existing.empty) {
          setError('This code already exists');
          return;
        }
        await addDoc(collection(db, 'vipResetCodes'), {
          ...payload,
          usageCount: 0,
          createdAt: now,
        });
      }

      await loadCodes();
      resetForm();
    } catch (saveError) {
      console.error('Error saving VIP reset code:', saveError);
      setError('Unable to save this code. Confirm you are signed in as an admin.');
    }
  };

  const startEdit = (item: ResetCode) => {
    setEditingId(item.id);
    setCode(item.code);
    setActive(item.active);
    setExpiresAt(item.expiresAt ? item.expiresAt.toDate().toISOString().split('T')[0] : '');
    setUsageLimit(item.usageLimit ? String(item.usageLimit) : '');
    setError('');
    setIsCreating(true);
  };

  if (loading) {
    return <div className="p-8 text-[#0FF1CE]">Loading...</div>;
  }

  return (
    <div>
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold text-white md:text-2xl">VIP Reset Codes</h1>
          <p className="mt-1 text-sm text-gray-400">Each code takes {DISCOUNT_PERCENT}% off any VIP allocation.</p>
        </div>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center justify-center gap-2 rounded-lg bg-[#0FF1CE] px-4 py-2 text-sm font-medium text-black hover:bg-[#0FF1CE]/90"
          >
            <Plus size={14} />
            Create reset code
          </button>
        )}
      </div>

      {isCreating && (
        <form onSubmit={handleSubmit} className="mb-6 space-y-4 rounded-xl border border-[#2F2F2F] bg-[#0D0D0D] p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm text-gray-400">Code</span>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-[#2F2F2F] bg-[#151515] py-2 pl-10 pr-4 text-white focus:border-[#0FF1CE]/50 focus:outline-none"
                  placeholder="RESET20"
                />
              </div>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-gray-400">Expires</span>
              <input
                type="date"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
                className="w-full rounded-lg border border-[#2F2F2F] bg-[#151515] px-4 py-2 text-white focus:border-[#0FF1CE]/50 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-gray-400">Usage limit</span>
              <input
                type="number"
                min={1}
                value={usageLimit}
                onChange={(event) => setUsageLimit(event.target.value)}
                placeholder="Unlimited"
                className="w-full rounded-lg border border-[#2F2F2F] bg-[#151515] px-4 py-2 text-white focus:border-[#0FF1CE]/50 focus:outline-none"
              />
            </label>
            <label className="flex items-center gap-3 pt-6 text-sm text-white">
              <input
                type="checkbox"
                checked={active}
                onChange={(event) => setActive(event.target.checked)}
                className="h-4 w-4 rounded border-gray-600 bg-[#1A1A1A] text-[#0FF1CE]"
              />
              Active
            </label>
          </div>
          <p className="text-sm text-gray-400">Discount is fixed at {DISCOUNT_PERCENT}% for every allocation size.</p>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" className="rounded-lg bg-[#0FF1CE] px-4 py-2 text-sm font-medium text-black">
              {editingId ? 'Save code' : 'Create code'}
            </button>
            <button type="button" onClick={resetForm} className="rounded-lg border border-[#2F2F2F] px-4 py-2 text-sm text-gray-300">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-[#2F2F2F] bg-[#0D0D0D]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#2F2F2F] text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Discount</th>
              <th className="px-4 py-3 font-medium">Uses</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {codes.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No reset codes yet.
                </td>
              </tr>
            )}
            {codes.map((item) => (
              <tr key={item.id} className="border-b border-[#2F2F2F]/60 text-white">
                <td className="px-4 py-3 font-medium">{item.code}</td>
                <td className="px-4 py-3">{item.discountPercent || DISCOUNT_PERCENT}%</td>
                <td className="px-4 py-3">
                  {item.usageCount || 0}
                  {item.usageLimit ? ` / ${item.usageLimit}` : ''}
                </td>
                <td className="px-4 py-3">{item.active ? 'Active' : 'Inactive'}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => startEdit(item)} className="mr-3 text-[#0FF1CE]">
                    Edit
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm('Delete this reset code?')) return;
                      await deleteDoc(doc(db, 'vipResetCodes', item.id));
                      await loadCodes();
                    }}
                    className="text-red-400"
                    aria-label={`Delete ${item.code}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

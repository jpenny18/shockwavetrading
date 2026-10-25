'use client';
import React, { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
  where
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Plus,
  Trash2,
  Edit,
  X,
  Check,
  AlertCircle,
  Tag,
  Calendar,
  Hash,
  Percent,
  DollarSign,
  Loader
} from 'lucide-react';

interface DiscountCode {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  active: boolean;
  expiresAt: Timestamp | null;
  usageLimit: number | null;
  usageCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface FormData {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  active: boolean;
  expiresAt: string;
  usageLimit: number | null;
}

interface FormErrors {
  code?: string;
  type?: string;
  value?: string;
  active?: string;
  expiresAt?: string;
  usageLimit?: string;
}

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    code: '',
    type: 'percentage',
    value: 0,
    active: true,
    expiresAt: '',
    usageLimit: null
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const fetchDiscounts = async () => {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, 'discounts'), orderBy('createdAt', 'desc'))
      );
      
      const discountsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DiscountCode[];
      
      setDiscounts(discountsData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching discounts:', error);
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    
    if (!formData.code.trim()) {
      errors.code = 'Code is required';
    } else if (!/^[A-Z0-9_-]+$/.test(formData.code)) {
      errors.code = 'Code must contain only uppercase letters, numbers, underscores, and hyphens';
    }
    
    if (formData.type === 'percentage' && (formData.value <= 0 || formData.value > 100)) {
      errors.value = 'Percentage must be between 1 and 100';
    } else if (formData.type === 'fixed' && formData.value <= 0) {
      errors.value = 'Amount must be greater than 0';
    }
    
    if (formData.usageLimit !== null && formData.usageLimit <= 0) {
      errors.usageLimit = 'Usage limit must be greater than 0';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      const now = Timestamp.now();
      const discountData = {
        code: formData.code.toUpperCase(),
        type: formData.type,
        value: formData.value,
        active: formData.active,
        expiresAt: formData.expiresAt ? Timestamp.fromDate(new Date(formData.expiresAt)) : null,
        usageLimit: formData.usageLimit,
        usageCount: 0,
        createdAt: now,
        updatedAt: now
      };
      
      if (editingId) {
        await updateDoc(doc(db, 'discounts', editingId), {
          ...discountData,
          createdAt: discounts.find(d => d.id === editingId)?.createdAt || now
        });
      } else {
        // Check if code already exists
        const existingCode = await getDocs(
          query(collection(db, 'discounts'), where('code', '==', formData.code.toUpperCase()))
        );
        
        if (!existingCode.empty) {
          setFormErrors({ code: 'This code already exists' });
          return;
        }
        
        await addDoc(collection(db, 'discounts'), discountData);
      }
      
      await fetchDiscounts();
      handleCancel();
    } catch (error) {
      console.error('Error saving discount:', error);
    }
  };

  const handleEdit = (discount: DiscountCode) => {
    setFormData({
      code: discount.code,
      type: discount.type,
      value: discount.value,
      active: discount.active,
      expiresAt: discount.expiresAt ? discount.expiresAt.toDate().toISOString().split('T')[0] : '',
      usageLimit: discount.usageLimit
    });
    setEditingId(discount.id);
    setIsCreating(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this discount code?')) return;
    
    try {
      await deleteDoc(doc(db, 'discounts', id));
      await fetchDiscounts();
    } catch (error) {
      console.error('Error deleting discount:', error);
    }
  };

  const handleCancel = () => {
    setFormData({
      code: '',
      type: 'percentage',
      value: 0,
      active: true,
      expiresAt: '',
      usageLimit: null
    });
    setFormErrors({});
    setEditingId(null);
    setIsCreating(false);
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await updateDoc(doc(db, 'discounts', id), {
        active: !currentActive,
        updatedAt: Timestamp.now()
      });
      await fetchDiscounts();
    } catch (error) {
      console.error('Error toggling discount status:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-[#0FF1CE]">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
        <h1 className="text-xl md:text-2xl font-bold text-white">Discount Codes</h1>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 bg-[#0FF1CE] text-black px-3 md:px-4 py-2 rounded-lg font-medium hover:bg-[#0FF1CE]/90 transition-colors text-sm w-full sm:w-auto justify-center sm:justify-start"
          >
            <Plus size={14} />
            <span>Create Discount</span>
          </button>
        )}
      </div>

      {isCreating && (
        <div className="bg-black rounded-xl p-6 border border-white/10 mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Code</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="pl-10 w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#0FF1CE]/50"
                    placeholder="SUMMER2024"
                  />
                </div>
                {formErrors.code && (
                  <p className="mt-1 text-sm text-red-400">{formErrors.code}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'percentage' | 'fixed' })}
                  className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#0FF1CE]/50"
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Value</label>
                <div className="relative">
                  {formData.type === 'percentage' ? (
                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  ) : (
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  )}
                  <input
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                    className="pl-10 w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#0FF1CE]/50"
                    placeholder={formData.type === 'percentage' ? '10' : '25'}
                    min={0}
                    step={formData.type === 'percentage' ? 1 : 0.01}
                  />
                </div>
                {formErrors.value && (
                  <p className="mt-1 text-sm text-red-400">{formErrors.value}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Usage Limit</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="number"
                    value={formData.usageLimit || ''}
                    onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value ? Number(e.target.value) : null })}
                    className="pl-10 w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#0FF1CE]/50"
                    placeholder="No limit"
                    min={1}
                  />
                </div>
                {formErrors.usageLimit && (
                  <p className="mt-1 text-sm text-red-400">{formErrors.usageLimit}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Expiration Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="date"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                    className="pl-10 w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#0FF1CE]/50"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-black peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0FF1CE]"></div>
                  <span className="ml-3 text-sm font-medium text-gray-400">Active</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 bg-[#0FF1CE] text-black px-6 py-2 rounded-lg font-medium hover:bg-[#0FF1CE]/90 transition-colors"
              >
                {editingId ? 'Update' : 'Create'} Discount
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mobile card view */}
      <div className="md:hidden space-y-2">
        {discounts.length === 0 ? (
          <div className="bg-black rounded-xl border border-white/10 px-4 py-10 text-center text-gray-500">
            <Tag className="mx-auto mb-2" size={24} />
            <p>No discount codes found</p>
          </div>
        ) : discounts.map((discount) => (
          <div key={discount.id} className="bg-black rounded-xl border border-white/10 p-3">
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="text-white font-bold text-sm font-mono">{discount.code}</span>
                <div className="text-gray-400 text-xs mt-0.5 capitalize">
                  {discount.type} · {discount.type === 'percentage' ? `${discount.value}%` : `$${discount.value}`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleToggleActive(discount.id, discount.active)} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${discount.active ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-400'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full mr-1 ${discount.active ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                  {discount.active ? 'Active' : 'Inactive'}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-gray-500 text-xs">
                Used {discount.usageCount}/{discount.usageLimit || '∞'} · Expires {discount.expiresAt ? discount.expiresAt.toDate().toLocaleDateString() : 'Never'}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handleEdit(discount)} className="p-1.5 rounded hover:bg-white/5 transition-colors"><Edit size={14} className="text-gray-400" /></button>
                <button onClick={() => handleDelete(discount.id)} className="p-1.5 rounded hover:bg-white/5 transition-colors"><Trash2 size={14} className="text-gray-400" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-black rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 text-sm border-b border-white/10">
                <th className="px-6 py-4 font-medium">Code</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Value</th>
                <th className="px-6 py-4 font-medium">Usage</th>
                <th className="px-6 py-4 font-medium">Expires</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {discounts.map((discount) => (
                <tr 
                  key={discount.id}
                  className="border-b border-white/10 last:border-b-0 text-white hover:bg-black transition-colors"
                >
                  <td className="px-6 py-4 font-medium">{discount.code}</td>
                  <td className="px-6 py-4 capitalize">{discount.type}</td>
                  <td className="px-6 py-4">
                    {discount.type === 'percentage' ? `${discount.value}%` : `$${discount.value}`}
                  </td>
                  <td className="px-6 py-4">
                    {discount.usageCount} / {discount.usageLimit || '∞'}
                  </td>
                  <td className="px-6 py-4">
                    {discount.expiresAt ? discount.expiresAt.toDate().toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleActive(discount.id, discount.active)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        discount.active 
                          ? 'bg-green-500/20 text-green-500' 
                          : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {discount.active ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
                          Active
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-1.5"></span>
                          Inactive
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(discount)}
                        className="p-1.5 rounded hover:bg-white/5 transition-colors"
                        title="Edit"
                      >
                        <Edit size={16} className="text-gray-400 hover:text-white" />
                      </button>
                      <button
                        onClick={() => handleDelete(discount.id)}
                        className="p-1.5 rounded hover:bg-white/5 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} className="text-gray-400 hover:text-white" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              
              {discounts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                    <Tag className="mx-auto mb-2" size={24} />
                    <p>No discount codes found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 
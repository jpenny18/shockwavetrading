'use client';
import React, { useState, useEffect } from 'react';
import { ToggleLeft, RefreshCw, AlertCircle, Check } from 'lucide-react';

export default function FeatureTogglesPage() {
  const [gauntletResetEnabled, setGauntletResetEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/site-settings');
      if (!response.ok) throw new Error('Failed to load settings');
      const data = await response.json();
      setGauntletResetEnabled(data.gauntletResetEnabled);
    } catch (err) {
      console.error('Error loading settings:', err);
      setError('Failed to load settings. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleToggle = async () => {
    if (gauntletResetEnabled === null || saving) return;

    const newValue = !gauntletResetEnabled;
    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/site-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gauntletResetEnabled: newValue })
      });

      if (!response.ok) throw new Error('Failed to save');

      setGauntletResetEnabled(newValue);
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save. The setting was not changed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
        <h1 className="text-xl md:text-2xl font-bold text-white">Feature Toggles</h1>
        <button
          onClick={loadSettings}
          disabled={loading || saving}
          className="flex items-center gap-2 bg-black border border-white/10 text-white px-3 md:px-4 py-2 rounded-lg font-medium hover:border-[#0FF1CE]/50 transition-colors text-sm w-full sm:w-auto justify-center sm:justify-start disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {savedMessage && (
        <div className="mb-4 p-4 bg-[#0FF1CE]/10 border border-[#0FF1CE]/30 rounded-lg flex items-center gap-2 text-[#0FF1CE] text-sm">
          <Check size={16} />
          <span>Setting saved. The change is live immediately.</span>
        </div>
      )}

      <div className="bg-black rounded-xl border border-white/10 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-[#0FF1CE]/20 flex items-center justify-center text-[#0FF1CE]">
            <ToggleLeft size={20} />
          </div>
          <h2 className="text-xl font-semibold text-white">Gauntlet Activation</h2>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 py-4 text-gray-400 text-sm">
            <div className="w-5 h-5 border-2 border-[#0FF1CE] border-t-transparent rounded-full animate-spin"></div>
            <span>Loading settings...</span>
          </div>
        ) : (
          <div className="flex items-center justify-between py-2">
            <div className="pr-4">
              <h3 className="text-white font-medium">Reset Account Option</h3>
              <p className="text-gray-400 text-sm mt-1">
                Shows the &quot;Reset Account&quot; option (12% off the activation fee) on the public
                gauntlet-activation page. When off, visitors only see &quot;Activate Account&quot; at full price.
              </p>
              <p className={`text-xs mt-2 font-medium ${gauntletResetEnabled ? 'text-[#0FF1CE]' : 'text-gray-500'}`}>
                Currently {gauntletResetEnabled ? 'VISIBLE to customers' : 'HIDDEN from customers'}
              </p>
            </div>
            <label className={`relative inline-flex items-center flex-shrink-0 ${saving ? 'cursor-wait opacity-60' : 'cursor-pointer'}`}>
              <input
                type="checkbox"
                className="sr-only peer"
                checked={gauntletResetEnabled === true}
                onChange={handleToggle}
                disabled={saving}
              />
              <div className="w-11 h-6 bg-black rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0FF1CE]"></div>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';
import React, { useEffect, useState } from 'react';
import { Save, Lock, Bell, Globe, Check, AlertCircle, Loader2 } from 'lucide-react';

interface GeneralSettings {
  siteName: string;
  supportEmail: string;
  phoneNumber: string;
  timezone: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  orderNotifications: boolean;
  customerSignups: boolean;
  paymentFailures: boolean;
  dailySummary: boolean;
}

interface IntegrationStatus {
  stripe: boolean;
  stripePublishable: boolean;
  resend: boolean;
  metaApi: boolean;
  firebaseAdmin: boolean;
}

const notificationFields: { key: keyof NotificationSettings; title: string; description: string }[] = [
  {
    key: 'emailNotifications',
    title: 'Header Alerts',
    description: 'Show order, signup, and payment items in the admin header bell',
  },
  {
    key: 'orderNotifications',
    title: 'New Order Alerts',
    description: 'Include pending card and crypto orders in the header bell',
  },
  {
    key: 'customerSignups',
    title: 'Customer Signup Alerts',
    description: 'Include customers who joined in the last 24 hours',
  },
  {
    key: 'paymentFailures',
    title: 'Payment Failure Alerts',
    description: 'Include failed card payments in the header bell',
  },
  {
    key: 'dailySummary',
    title: 'Dashboard Summary',
    description: 'Keep a shortcut to the dashboard summary in the header bell',
  },
];

export default function SettingsPage() {
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
    siteName: '',
    supportEmail: '',
    phoneNumber: '',
    timezone: 'America/New_York',
  });
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    orderNotifications: true,
    customerSignups: true,
    paymentFailures: true,
    dailySummary: true,
  });
  const [integrations, setIntegrations] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/settings');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load settings');
      setGeneralSettings(data.general);
      setNotificationSettings(data.notifications);
      setIntegrations(data.integrations);
    } catch (err) {
      console.error('Error loading admin settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleGeneralSettingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setGeneralSettings((current) => ({ ...current, [name]: value }));
    setSavedMessage(null);
  };

  const handleNotificationToggle = (setting: keyof NotificationSettings) => {
    setNotificationSettings((current) => ({ ...current, [setting]: !current[setting] }));
    setSavedMessage(null);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setError(null);
    setSavedMessage(null);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          general: generalSettings,
          notifications: notificationSettings,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save settings');
      setGeneralSettings(data.general);
      setNotificationSettings(data.notifications);
      setIntegrations(data.integrations);
      setSavedMessage('Settings saved. Header alerts use these notification preferences.');
    } catch (err) {
      console.error('Error saving admin settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
        <h1 className="text-xl md:text-2xl font-bold text-white">Settings</h1>
        <button
          onClick={handleSaveSettings}
          disabled={loading || saving}
          className="flex items-center gap-2 bg-[#0FF1CE] text-black px-3 md:px-4 py-2 rounded-lg font-medium hover:bg-[#0FF1CE]/90 transition-colors text-sm w-full sm:w-auto justify-center sm:justify-start disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          <span>{saving ? 'Saving...' : 'Save Settings'}</span>
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
          <span>{savedMessage}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-3 py-10 text-gray-400 text-sm">
          <Loader2 size={18} className="animate-spin text-[#0FF1CE]" />
          <span>Loading settings...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-[#0D0D0D]/80 backdrop-blur-sm rounded-xl border border-[#2F2F2F]/50 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-[#0FF1CE]/20 flex items-center justify-center text-[#0FF1CE]">
                <Globe size={20} />
              </div>
              <h2 className="text-xl font-semibold text-white">General Settings</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Site Name</label>
                <input
                  type="text"
                  name="siteName"
                  value={generalSettings.siteName}
                  onChange={handleGeneralSettingChange}
                  className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#0FF1CE]/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Support Email</label>
                <input
                  type="email"
                  name="supportEmail"
                  value={generalSettings.supportEmail}
                  onChange={handleGeneralSettingChange}
                  className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#0FF1CE]/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Phone Number</label>
                <input
                  type="text"
                  name="phoneNumber"
                  value={generalSettings.phoneNumber}
                  onChange={handleGeneralSettingChange}
                  placeholder="Add a support phone number"
                  className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#0FF1CE]/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Timezone</label>
                <select
                  name="timezone"
                  value={generalSettings.timezone}
                  onChange={handleGeneralSettingChange}
                  className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#0FF1CE]/50"
                >
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="Europe/London">London (GMT)</option>
                  <option value="Asia/Tokyo">Tokyo (JST)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-[#0D0D0D]/80 backdrop-blur-sm rounded-xl border border-[#2F2F2F]/50 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-[#0FF1CE]/20 flex items-center justify-center text-[#0FF1CE]">
                <Lock size={20} />
              </div>
              <h2 className="text-xl font-semibold text-white">Integrations</h2>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              API keys stay in server environment variables. This page only reports whether each integration is configured.
            </p>
            <div>
              {[
                { label: 'Stripe secret key', ok: integrations?.stripe, detail: 'Used for card payments and webhooks' },
                { label: 'Stripe publishable key', ok: integrations?.stripePublishable, detail: 'Used by the checkout card form' },
                { label: 'Resend', ok: integrations?.resend, detail: 'Used to send customer and admin emails' },
                { label: 'MetaAPI', ok: integrations?.metaApi, detail: 'Used to connect and refresh trading accounts' },
                { label: 'Firebase Admin', ok: integrations?.firebaseAdmin, detail: 'Used for admin sessions and server data access' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-4 py-3 border-b border-[#2F2F2F] last:border-0">
                  <div>
                    <h3 className="text-white font-medium">{item.label}</h3>
                    <p className="text-gray-400 text-sm">{item.detail}</p>
                  </div>
                  <span className={`text-sm font-medium whitespace-nowrap ${item.ok ? 'text-[#0FF1CE]' : 'text-yellow-400'}`}>
                    {item.ok ? 'Configured' : 'Missing'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#0D0D0D]/80 backdrop-blur-sm rounded-xl border border-[#2F2F2F]/50 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-[#0FF1CE]/20 flex items-center justify-center text-[#0FF1CE]">
                <Bell size={20} />
              </div>
              <h2 className="text-xl font-semibold text-white">Notification Settings</h2>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              These preferences control the admin header bell. Customer emails continue to send from their existing order and account flows.
            </p>

            <div className="space-y-4">
              {notificationFields.map((field, index) => (
                <div
                  key={field.key}
                  className={`flex items-center justify-between py-2 ${index < notificationFields.length - 1 ? 'border-b border-[#2F2F2F]' : ''}`}
                >
                  <div className="pr-4">
                    <h3 className="text-white font-medium">{field.title}</h3>
                    <p className="text-gray-400 text-sm">{field.description}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={notificationSettings[field.key]}
                      onChange={() => handleNotificationToggle(field.key)}
                    />
                    <div className="w-11 h-6 bg-[#151515] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0FF1CE]"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';
import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { collection, getCountFromServer, query, Timestamp, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  BarChart2, 
  Users, 
  ShoppingCart, 
  Settings,
  Mail,
  LogOut,
  Menu,
  X,
  Sliders,
  Bell,
  Search,
  MessageSquare,
  Tag,
  Bitcoin,
  Server,
  Shield,
  DollarSign,
  CreditCard,
  FlaskConical,
  ToggleLeft,
  Crown,
  LineChart
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', href: '/admin', icon: BarChart2 },
  { name: 'Orders', href: '/admin/orders', icon: ShoppingCart },
  { name: 'Crypto Orders', href: '/admin/crypto-orders', icon: Bitcoin },
  { name: 'Card Orders', href: '/admin/card-orders', icon: CreditCard },
  { name: 'Customers', href: '/admin/customers', icon: Users },
  { name: 'KYC Management', href: '/admin/kyc', icon: Shield },
  { name: 'VIP Portal', href: '/admin/vip', icon: Crown },
  { name: 'VIP Accounts', href: '/admin/vip-accounts', icon: LineChart },
  { name: 'Withdrawals', href: '/admin/withdrawals', icon: DollarSign },
  { name: 'MetaAPI Accounts', href: '/admin/accounts', icon: Server },
  { name: 'Email Templates', href: '/admin/emails', icon: Mail },
  { name: 'Pulse Management', href: '/admin/pulse', icon: MessageSquare },
  { name: 'Discount Codes', href: '/admin/discounts', icon: Tag },
  { name: 'VIP Reset Codes', href: '/admin/vip-reset-codes', icon: Tag },
  { name: 'Feature Toggles', href: '/admin/feature-toggles', icon: ToggleLeft },
  { name: 'Settings', href: '/admin/settings', icon: Settings }
];

const devNavItems = process.env.NODE_ENV === 'development'
  ? [{ name: 'Dev Tools', href: '/admin/dev-tools', icon: FlaskConical, isDevOnly: true }]
  : [];

function isNavActive(pathname: string, href: string) {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function initials(name: string, email: string) {
  const source = name && name !== 'Admin' ? name : email;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  const first = parts[0]?.[0] || 'A';
  const second = parts[1]?.[0] || '';
  return `${first}${second}`.toUpperCase();
}

async function countDocs(countQuery: ReturnType<typeof query>) {
  try {
    const snapshot = await getCountFromServer(countQuery);
    return snapshot.data().count;
  } catch (error) {
    console.error('Error counting admin alerts:', error);
    return 0;
  }
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchRef = useRef<HTMLDivElement>(null);
  const alertsRef = useRef<HTMLDivElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [siteName, setSiteName] = useState('Shockwave Capital');
  const [adminProfile, setAdminProfile] = useState({ name: 'Admin', email: '' });
  const [alerts, setAlerts] = useState<{ label: string; href: string; count: number }[]>([]);

  const searchableItems = [...navItems, ...devNavItems];
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const searchResults = searchableItems.filter((item) =>
    !normalizedSearch || item.name.toLowerCase().includes(normalizedSearch)
  );

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (searchRef.current && !searchRef.current.contains(target)) setSearchOpen(false);
      if (alertsRef.current && !alertsRef.current.contains(target)) setAlertsOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadShell = async () => {
      const [profileResult, settingsResult] = await Promise.allSettled([
        fetch('/api/auth/admin-profile').then((response) => (response.ok ? response.json() : null)),
        fetch('/api/admin/settings').then((response) => (response.ok ? response.json() : null)),
      ]);

      if (cancelled) return;

      const profile = profileResult.status === 'fulfilled' ? profileResult.value : null;
      const settings = settingsResult.status === 'fulfilled' ? settingsResult.value : null;
      if (profile?.email || profile?.name) {
        setAdminProfile({
          name: profile.name || 'Admin',
          email: profile.email || '',
        });
      }
      if (settings?.general?.siteName) setSiteName(settings.general.siteName);

      const notifications = settings?.notifications || {
        emailNotifications: true,
        orderNotifications: true,
        customerSignups: true,
        paymentFailures: true,
        dailySummary: true,
      };
      const showEmailAlerts = notifications.emailNotifications !== false;
      const since = Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
      const [pendingOrders, pendingCrypto, failedPayments, newSignups, pendingWithdrawals, pendingKyc] = await Promise.all([
        showEmailAlerts && notifications.orderNotifications !== false
          ? countDocs(query(collection(db, 'orders'), where('paymentStatus', '==', 'pending')))
          : 0,
        showEmailAlerts && notifications.orderNotifications !== false
          ? countDocs(query(collection(db, 'crypto-orders'), where('status', '==', 'PENDING')))
          : 0,
        showEmailAlerts && notifications.paymentFailures !== false
          ? countDocs(query(collection(db, 'orders'), where('paymentStatus', '==', 'failed')))
          : 0,
        showEmailAlerts && notifications.customerSignups !== false
          ? countDocs(query(collection(db, 'users'), where('createdAt', '>=', since)))
          : 0,
        countDocs(query(collection(db, 'withdrawalRequests'), where('status', '==', 'pending'))),
        countDocs(query(collection(db, 'kycSubmissions'), where('status', '==', 'pending'))),
      ]);

      if (cancelled) return;

      const nextAlerts = [
        { label: 'Pending card orders', href: '/admin/orders', count: pendingOrders },
        { label: 'Pending crypto orders', href: '/admin/crypto-orders', count: pendingCrypto },
        { label: 'Failed card payments', href: '/admin/orders', count: failedPayments },
        { label: 'New signups (24h)', href: '/admin/customers?joined=24h', count: newSignups },
        { label: 'Pending withdrawals', href: '/admin/withdrawals', count: pendingWithdrawals },
        { label: 'Pending KYC', href: '/admin/kyc', count: pendingKyc },
      ].filter((item) => item.count > 0);

      if (showEmailAlerts && notifications.dailySummary !== false) {
        nextAlerts.push({ label: 'Open dashboard summary', href: '/admin', count: 0 });
      }

      setAlerts(nextAlerts);
    };

    loadShell();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      setLogoutError(null);
      
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Logout failed');
      }

      router.push('/admin-auth');
    } catch (error) {
      console.error('Logout error:', error);
      setLogoutError('Logout failed. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const alertCount = alerts.reduce((sum, item) => sum + item.count, 0);
  const adminInitials = initials(adminProfile.name, adminProfile.email);

  const goToSearchResult = (href: string) => {
    setSearchOpen(false);
    setSearchQuery('');
    router.push(href);
  };

  return (
    <div className="flex min-h-screen bg-black">
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50">
        <div className="h-14 bg-black border-b border-white/10 px-4 flex items-center justify-between">
          <Image
            src="/logo.png"
            alt="Shockwave Capital"
            width={140}
            height={40}
            className="h-auto w-32"
          />
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="text-gray-400 hover:text-[#0FF1CE] p-2 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:sticky top-0 md:top-0 left-0 h-screen w-72 md:w-64 bg-black z-50
          transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:flex md:flex-col
          border-r border-white/10
        `}
      >
        <div className="flex flex-col h-full p-4">
          <div className="mb-6 pt-2">
            <Image
              src="/logo.png"
              alt={siteName}
              width={160}
              height={48}
              className="h-auto w-40"
            />
          </div>
          
          <nav className="flex-1 space-y-0.5 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isNavActive(pathname, item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 md:py-2 rounded-lg transition-colors group ${
                    active
                      ? 'text-[#0FF1CE] border border-[#0FF1CE]/40'
                      : 'text-gray-400 border border-transparent hover:text-white'
                  }`}
                >
                  <Icon size={18} className={`flex-shrink-0 ${active ? 'text-[#0FF1CE]' : 'group-hover:text-[#0FF1CE]'}`} />
                  <span className="text-sm font-medium">{item.name}</span>
                </Link>
              );
            })}

            {devNavItems.length > 0 && (
              <>
                <div className="pt-2 pb-1 px-3">
                  <div className="border-t border-white/10" />
                  <p className="text-orange-500/70 text-xs font-semibold uppercase tracking-wider mt-2">Dev Only</p>
                </div>
                {devNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = isNavActive(pathname, item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 md:py-2 rounded-lg transition-all group active:bg-orange-400/15 ${
                        active
                          ? 'text-orange-400 bg-orange-400/10'
                          : 'text-orange-400/70 hover:text-orange-400 hover:bg-orange-400/10'
                      }`}
                    >
                      <Icon size={18} className="group-hover:text-orange-400 flex-shrink-0" />
                      <span className="text-sm font-medium">{item.name}</span>
                    </Link>
                  );
                })}
              </>
            )}
          </nav>

          {/* User Section */}
          <div className="border-t border-white/10 pt-4 mt-4">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-black border border-[#0FF1CE]/50 flex items-center justify-center">
                <span className="text-[#0FF1CE] font-medium text-sm">{adminInitials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate">{adminProfile.name}</div>
                <div className="text-gray-400 text-xs truncate">{adminProfile.email || 'Signed in'}</div>
              </div>
              <button 
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="text-gray-400 hover:text-[#0FF1CE] p-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 pt-[58px] md:pt-0">
        {/* Desktop Header */}
        <header className="hidden md:flex h-16 bg-black border-b border-white/10 items-center justify-between px-8">
          <div className="flex-1 max-w-md" ref={searchRef}>
            <div className="relative">
              <input 
                type="text"
                value={searchQuery}
                placeholder="Search pages..."
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setSearchOpen(false);
                  if (event.key === 'Enter' && searchResults[0]) {
                    event.preventDefault();
                    goToSearchResult(searchResults[0].href);
                  }
                }}
                className="w-full bg-black border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-[#0FF1CE]/50"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              {searchOpen && (
                <div className="absolute z-50 mt-2 w-full bg-black border border-white/10 rounded-lg overflow-hidden">
                  {searchResults.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-400">No matching pages</div>
                  ) : (
                    searchResults.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.href}
                          type="button"
                          onClick={() => goToSearchResult(item.href)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-300 hover:text-[#0FF1CE]"
                        >
                          <Icon size={16} />
                          <span>{item.name}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative" ref={alertsRef}>
              <button
                type="button"
                onClick={() => setAlertsOpen((open) => !open)}
                className="p-2 text-gray-400 hover:text-[#0FF1CE] rounded-lg transition-colors relative"
                aria-label="Open alerts"
              >
                <Bell size={20} />
                {alertCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-[#0FF1CE] text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                    {alertCount > 99 ? '99+' : alertCount}
                  </span>
                )}
              </button>
              {alertsOpen && (
                <div className="absolute right-0 z-50 mt-2 w-72 bg-black border border-white/10 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/10 text-sm font-medium text-white">Needs attention</div>
                  {alerts.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-400">Nothing waiting right now</div>
                  ) : (
                    alerts.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={() => setAlertsOpen(false)}
                        className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-[#0FF1CE]"
                      >
                        <span>{item.label}</span>
                        {item.count > 0 && <span className="text-[#0FF1CE] font-medium">{item.count}</span>}
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>
            <Link
              href="/admin/feature-toggles"
              className="p-2 text-gray-400 hover:text-[#0FF1CE] rounded-lg transition-colors"
              aria-label="Feature toggles"
            >
              <Sliders size={20} />
            </Link>
            <div className="w-px h-6 bg-white/10"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-black border border-[#0FF1CE]/50 flex items-center justify-center">
                <span className="text-[#0FF1CE] font-medium text-sm">{adminInitials}</span>
              </div>
              <span className="text-white text-sm">{adminProfile.name}</span>
            </div>
            <button 
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="p-2 text-gray-400 hover:text-[#0FF1CE] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>
        
        {/* Page Content */}
        {logoutError && (
          <div className="mx-4 md:mx-8 mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {logoutError}
          </div>
        )}
        <main className="flex-1 p-4 md:p-6">
          <div className="md:rounded-3xl md:border md:border-white/10 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
} 
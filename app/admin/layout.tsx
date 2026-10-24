'use client';
import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  ToggleLeft
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', href: '/admin', icon: BarChart2 },
  { name: 'Orders', href: '/admin/orders', icon: ShoppingCart },
  { name: 'Crypto Orders', href: '/admin/crypto-orders', icon: Bitcoin },
  { name: 'Card Orders', href: '/admin/card-orders', icon: CreditCard },
  { name: 'Customers', href: '/admin/customers', icon: Users },
  { name: 'KYC Management', href: '/admin/kyc', icon: Shield },
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

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Logout failed');
      }

      // Redirect to admin login page
      router.push('/admin-auth');
    } catch (error) {
      console.error('Logout error:', error);
      // You might want to show an error message to the user here
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-[#0D0D0D] via-[#121212] to-[#151515]">
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50">
        {/* Brand accent line */}
        <div className="h-0.5 bg-gradient-to-r from-[#0FF1CE] via-[#00D9FF] to-[#0FF1CE]/30" />
        <div className="h-14 bg-[#0D0D0D]/95 backdrop-blur-md border-b border-[#2F2F2F]/80 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image
              src="/logo.png"
              alt="Shockwave Capital Admin"
              width={32}
              height={32}
              className="h-7 w-auto"
            />
            <div>
              <span className="text-white font-bold text-sm tracking-wide">Shockwave</span>
              <span className="ml-1 text-[#0FF1CE] font-bold text-sm tracking-wide">Admin</span>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="text-gray-400 hover:text-[#0FF1CE] p-2 rounded-lg hover:bg-[#0FF1CE]/10 transition-all active:scale-95"
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
          fixed md:sticky top-0 md:top-0 left-0 h-screen w-72 md:w-64 bg-[#0D0D0D] z-50
          transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:flex md:flex-col
          border-r border-[#2F2F2F]/50
        `}
      >
        <div className="flex flex-col h-full p-4">
          {/* Sidebar brand header */}
          <div className="mb-6 flex items-center pt-2">
            <Image
              src="/logo.png"
              alt="Shockwave Capital Admin"
              width={36}
              height={36}
              className="h-8 w-auto"
            />
            <div className="ml-2.5">
              <div className="text-white font-bold text-sm">Shockwave Capital</div>
              <div className="text-[#0FF1CE] text-xs font-medium tracking-wider uppercase">Admin Panel</div>
            </div>
          </div>
          {/* Gradient divider */}
          <div className="h-px bg-gradient-to-r from-[#0FF1CE]/50 via-[#0FF1CE]/20 to-transparent mb-4" />
          
          <nav className="flex-1 space-y-0.5 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 md:py-2 text-gray-400 hover:text-[#0FF1CE] rounded-lg hover:bg-[#0FF1CE]/10 transition-all group active:bg-[#0FF1CE]/15"
                >
                  <Icon size={18} className="group-hover:text-[#0FF1CE] flex-shrink-0" />
                  <span className="text-sm font-medium">{item.name}</span>
                </Link>
              );
            })}

            {devNavItems.length > 0 && (
              <>
                <div className="pt-2 pb-1 px-3">
                  <div className="border-t border-[#2F2F2F]" />
                  <p className="text-orange-500/70 text-xs font-semibold uppercase tracking-wider mt-2">Dev Only</p>
                </div>
                {devNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsSidebarOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 md:py-2 text-orange-400/70 hover:text-orange-400 rounded-lg hover:bg-orange-400/10 transition-all group active:bg-orange-400/15"
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
          <div className="border-t border-[#2F2F2F] pt-4 mt-4">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-[#0FF1CE]/20 flex items-center justify-center">
                <span className="text-[#0FF1CE] font-medium text-sm">AD</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate">Admin User</div>
                <div className="text-gray-400 text-xs truncate">admin@shockwave.capital</div>
              </div>
              <button 
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="text-gray-400 hover:text-[#0FF1CE] p-1.5 rounded-lg hover:bg-[#0FF1CE]/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
        <header className="hidden md:flex h-16 bg-[#0D0D0D] border-b border-[#2F2F2F] items-center justify-between px-8">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <input 
                type="text"
                placeholder="Search..."
                className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-[#0FF1CE]/50"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2 text-gray-400 hover:text-[#0FF1CE] rounded-lg hover:bg-[#0FF1CE]/10 transition-all relative">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#0FF1CE] rounded-full"></span>
            </button>
            <button className="p-2 text-gray-400 hover:text-[#0FF1CE] rounded-lg hover:bg-[#0FF1CE]/10 transition-all">
              <Sliders size={20} />
            </button>
            <div className="w-px h-6 bg-[#2F2F2F]"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#0FF1CE]/20 flex items-center justify-center">
                <span className="text-[#0FF1CE] font-medium text-sm">AD</span>
              </div>
              <span className="text-white text-sm">Admin</span>
            </div>
            <button 
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="p-2 text-gray-400 hover:text-[#0FF1CE] rounded-lg hover:bg-[#0FF1CE]/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>
        
        {/* Page Content */}
        <main className="flex-1 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
} 
'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  BarChart2, 
  Users, 
  Wallet, 
  HelpCircle, 
  MessageCircle,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  Calculator,
  BookOpen,
  Award
} from 'lucide-react';
import { auth, signOut } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: BarChart2 },
  { name: 'My Accounts', href: '/dashboard/accounts', icon: Users },
  { name: 'KYC Verification', href: '/dashboard/kyc', icon: Shield },
  { name: 'Trading Calculators', href: '/dashboard/calculators', icon: Calculator },
  { name: 'Educational Hub', href: '/dashboard/education', icon: BookOpen },
  { name: 'Payouts', href: '/dashboard/payouts', icon: Wallet },
  { name: 'Support', href: '/dashboard/support', icon: MessageCircle },
  { name: 'FAQ', href: '/dashboard/faq', icon: HelpCircle },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings }
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [initials, setInitials] = useState('');

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUser(user);
        // Generate initials from display name or email
        if (user.displayName) {
          setInitials(user.displayName.split(' ').map(n => n[0]).join('').toUpperCase());
        } else {
          setInitials(user.email?.[0].toUpperCase() || '');
        }
      } else {
        // If no user, redirect to landing page
        router.push('/');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#0D0D0D] via-[#0D0D0D] to-[#151515]">
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#121212]/90 backdrop-blur-md border-b border-[#2F2F2F]/50 z-50 px-4 flex items-center justify-between">
        <Image
          src="/logo.png"
          alt="Shockwave Capital"
          width={120}
          height={120}
          className="h-32 w-auto"
        />
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="text-white p-2"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
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
          fixed md:sticky top-0 md:top-0 left-0 h-screen w-64 bg-[#0D0D0D]/95 backdrop-blur-sm border-r border-[#2F2F2F]/50 z-50
          transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:flex md:flex-col
        `}
      >
        <div className="flex flex-col h-full p-4">
          <div className="mb-8">
            <Image
              src="/logo.png"
              alt="Shockwave Capital"
              width={120}
              height={120}
              className="h-8 w-auto"
            />
          </div>
          
          <nav className="flex-1 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 group ${
                    isActive
                      ? 'bg-[#0FF1CE]/10 text-[#0FF1CE] border border-[#0FF1CE]/20'
                      : 'text-gray-400 border border-transparent hover:text-[#0FF1CE] hover:bg-[#0FF1CE]/10'
                  }`}
                >
                  <Icon size={20} className={isActive ? 'text-[#0FF1CE]' : 'group-hover:text-[#0FF1CE]'} />
                  <span className="text-sm">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="border-t border-[#2F2F2F]/50 pt-4 mt-4">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0FF1CE]/30 to-[#00D4FF]/20 border border-[#0FF1CE]/30 flex items-center justify-center">
                <span className="text-[#0FF1CE] font-medium text-sm">{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate">
                  {user?.displayName || 'User'}
                </div>
                <div className="text-gray-400 text-xs truncate">{user?.email}</div>
              </div>
              <button 
                onClick={handleLogout}
                className="text-gray-400 hover:text-[#0FF1CE] p-1.5 rounded-lg hover:bg-[#0FF1CE]/10 transition-all"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 pt-16 md:pt-0 pb-24 md:pb-0">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 md:hidden z-50 transition-opacity duration-300 ${isSidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="flex items-center gap-4 bg-[#121212]/90 backdrop-blur-md border border-[#2F2F2F]/50 rounded-full px-6 py-3 shadow-[0_0_20px_rgba(15,241,206,0.15)]">
          <Link
            href="/dashboard/accounts"
            className="flex flex-col items-center text-gray-400 hover:text-[#0FF1CE] transition-all"
          >
            <Users size={20} />
            <span className="text-xs mt-1">Accounts</span>
          </Link>
          <Link
            href="/dashboard"
            className="flex flex-col items-center text-gray-400 hover:text-[#0FF1CE] transition-all"
          >
            <BarChart2 size={20} />
            <span className="text-xs mt-1">Dashboard</span>
          </Link>
          <Link
            href="/dashboard/support"
            className="flex flex-col items-center text-gray-400 hover:text-[#0FF1CE] transition-all"
          >
            <MessageCircle size={20} />
            <span className="text-xs mt-1">Support</span>
          </Link>
        </div>
      </div>
    </div>
  );
} 
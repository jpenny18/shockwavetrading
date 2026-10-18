import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navItems = [
    { name: 'Home', href: '/' },
    { name: 'FAQ', href: '/#faq' },
    { name: 'How Shockwave Operates', href: '/How-Shockwave-Operates' },
    { name: 'Shockwave Pulse', href: '/Shockwave-Pulse' }
  ];

  return (
    <header
      className={`fixed w-full top-0 z-50 transition-all duration-300 bg-black ${
        isScrolled
          ? 'backdrop-blur-xl border-b border-[#0FF1CE]/10 shadow-[0_4px_30px_rgba(0,0,0,0.5)]'
          : 'backdrop-blur-md border-b border-[#2F2F2F]/60'
      }`}
    >
      {/* Subtle top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#0FF1CE]/40 to-transparent pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo + Desktop Navigation */}
          <div className="flex items-center gap-8">
            <div className="flex-shrink-0">
              <Link href="/" className="block group">
                <Image
                  src="/logo.png"
                  alt="Shockwave Capital"
                  width={80}
                  height={80}
                  className="h-auto w-auto transition-transform duration-300 group-hover:scale-105 drop-shadow-[0_0_12px_rgba(15,241,206,0.15)]"
                  priority
                />
              </Link>
            </div>

            <nav className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="relative py-2 text-sm font-medium text-gray-300 hover:text-[#0FF1CE] transition-colors duration-300 group"
                >
                  {item.name}
                  <span className="absolute left-0 -bottom-0.5 h-0.5 w-0 rounded-full bg-gradient-to-r from-[#0FF1CE] to-[#00D9FF] transition-all duration-300 group-hover:w-full" />
                </a>
              ))}
            </nav>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Client Area Button */}
            <Link href="/access">
              <button className="group relative overflow-hidden bg-gradient-to-r from-[#0FF1CE]/10 to-[#00D9FF]/10 backdrop-blur-sm border border-[#0FF1CE]/30 text-[#0FF1CE] px-4 py-2 md:px-6 md:py-2.5 text-sm md:text-base rounded-xl font-semibold hover:border-[#0FF1CE]/60 hover:from-[#0FF1CE]/20 hover:to-[#00D9FF]/20 hover:shadow-[0_0_20px_rgba(15,241,206,0.25)] hover:scale-[1.03] active:scale-[0.97] transition-all duration-300">
                <span className="relative z-10">Client Area</span>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#0FF1CE]/0 to-[#00D9FF]/0 group-hover:from-[#0FF1CE]/10 group-hover:to-[#00D9FF]/10 transition-all duration-300"></div>
              </button>
            </Link>

            {/* Mobile menu button */}
            <div className="flex md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={isMenuOpen}
                className="text-white p-2 rounded-lg hover:bg-white/5 active:bg-white/10 transition-colors duration-300"
              >
                <div className="w-6 h-5 relative flex flex-col justify-between">
                  <span className={`w-full h-0.5 rounded-full bg-white transform transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-2 bg-[#0FF1CE]' : ''}`} />
                  <span className={`w-full h-0.5 rounded-full bg-white transition-all duration-300 ${isMenuOpen ? 'opacity-0' : ''}`} />
                  <span className={`w-full h-0.5 rounded-full bg-white transform transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-2 bg-[#0FF1CE]' : ''}`} />
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <div
          className={`md:hidden transition-all duration-300 ease-in-out ${
            isMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          } overflow-hidden`}
        >
          <nav className="mb-4 p-2 space-y-1 rounded-2xl bg-[#0D0D0D]/80 backdrop-blur-xl border border-[#2F2F2F]/60">
            {navItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-gray-300 hover:text-[#0FF1CE] hover:bg-[#0FF1CE]/5 active:bg-[#0FF1CE]/10 transition-all duration-300 group"
                onClick={() => setIsMenuOpen(false)}
              >
                <span>{item.name}</span>
                <span className="text-[#0FF1CE]/40 group-hover:text-[#0FF1CE] group-hover:translate-x-0.5 transition-all duration-300">›</span>
              </a>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}

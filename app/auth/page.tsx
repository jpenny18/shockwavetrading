'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/access');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-8 h-8 border-4 border-[#0FF1CE] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

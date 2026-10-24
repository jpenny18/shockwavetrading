import { Suspense } from 'react';
import VipReturnClient from './return-client';

export default function VipReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0D0D0D]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0FF1CE] border-t-transparent" />
        </div>
      }
    >
      <VipReturnClient />
    </Suspense>
  );
}

'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackMetaPageView } from '@/lib/meta-pixel';

export default function MetaPixelPageViews() {
  const pathname = usePathname();
  const trackedPath = useRef<string | null>(null);

  useEffect(() => {
    if (trackedPath.current === pathname) return;
    const isInitialView = trackedPath.current === null;
    trackedPath.current = pathname;
    if (isInitialView) return;
    trackMetaPageView();
  }, [pathname]);

  return null;
}

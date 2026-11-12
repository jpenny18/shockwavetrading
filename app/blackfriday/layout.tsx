import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Black Friday 2026 · Shockwave Capital',
  description:
    'Black Friday at Shockwave Capital: 50% off trading evaluations and one free retry. Code BLACKFRIDAY is applied at checkout.',
};

export default function BlackFridayLayout({ children }: { children: React.ReactNode }) {
  return children;
}

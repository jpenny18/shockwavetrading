import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Copy login details',
  robots: { index: false, follow: false },
};

export default function LoginCopyLayout({ children }: { children: React.ReactNode }) {
  return children;
}

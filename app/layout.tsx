import './globals.css'
import type { Metadata } from 'next'
import Script from 'next/script'
import MetaPixelPageViews from './components/MetaPixelPageViews'
import { META_PIXEL_BOOTSTRAP, META_PIXEL_ID } from '@/lib/meta-pixel'

export const metadata: Metadata = {
  title: 'Shockwave Capital',
  description: 'High-octane funding for elite traders',
  icons: {
    icon: '/shockwaveS.png',
    shortcut: '/shockwaveS.png',
    apple: '/shockwaveS.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" style={{ backgroundColor: "#000" }} className="bg-black">
      <body className="min-h-screen overflow-x-hidden bg-black">
        <Script
          id="meta-pixel"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: META_PIXEL_BOOTSTRAP }}
        />
        <noscript
          dangerouslySetInnerHTML={{
            __html: `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1" alt="" />`,
          }}
        />
        <MetaPixelPageViews />
        {children}
      </body>
    </html>
  )
} 
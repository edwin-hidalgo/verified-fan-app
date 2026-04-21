import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { MiniKitProvider } from '@/components/MiniKitProvider'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Verified Fan — Prove Your Fandom',
  description:
    'Connect your Spotify, verify you\'re human with World ID, and show artists who your real fans are.',
  metadataBase: new URL('http://localhost:3000'),
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground" suppressHydrationWarning>
        <MiniKitProvider>
          {children}
        </MiniKitProvider>
      </body>
    </html>
  )
}

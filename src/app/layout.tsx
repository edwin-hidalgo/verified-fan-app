import type { Metadata } from 'next'
import { Roboto_Flex, Roboto_Mono } from 'next/font/google'
import { MiniKitProvider } from '@/components/MiniKitProvider'
import Header from '@/components/Header'
import './globals.css'

const robotoFlex = Roboto_Flex({
  variable: '--font-roboto-flex',
  subsets: ['latin'],
})

const robotoMono = Roboto_Mono({
  variable: '--font-roboto-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'ekos — Music Trust Layer for the AI Era',
  description:
    'Register music with on-chain provenance and verified engagement. Eradicate streaming fraud. Licensed by verified humans.',
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
      className={`${robotoFlex.variable} ${robotoMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground" suppressHydrationWarning>
        <MiniKitProvider>
          <Header />
          <main className="flex-1">
            {children}
          </main>
        </MiniKitProvider>
      </body>
    </html>
  )
}

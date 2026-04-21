'use client'

import { usePathname, useRouter } from 'next/navigation'

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  // Only show on profile and related pages
  const showNav = ['/profile', '/artist', '/dashboard', '/fan'].some((path) =>
    pathname.startsWith(path)
  )

  if (!showNav) return null

  const isActive = (path: string) => pathname.startsWith(path)

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur border-t border-gray-800 z-40">
      <div className="max-w-4xl mx-auto px-4 flex justify-around">
        {/* Home */}
        <button
          onClick={() => router.push('/profile')}
          className={`flex-1 py-4 px-4 text-center border-t-2 transition-colors ${
            isActive('/profile') && !isActive('/artist') && !isActive('/fan')
              ? 'border-white text-white'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <div className="text-xl mb-1">🏠</div>
          <div className="text-xs font-semibold">Home</div>
        </button>

        {/* Dashboard (Artist Mode) */}
        <button
          onClick={() => router.push('/dashboard')}
          className={`flex-1 py-4 px-4 text-center border-t-2 transition-colors ${
            isActive('/dashboard')
              ? 'border-white text-white'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <div className="text-xl mb-1">📊</div>
          <div className="text-xs font-semibold">Dashboard</div>
        </button>

        {/* Settings */}
        <button
          onClick={() => {
            // Settings not built yet - for now just show an alert
            alert('Settings coming soon')
          }}
          className="flex-1 py-4 px-4 text-center border-t-2 border-transparent text-gray-400 hover:text-white transition-colors"
        >
          <div className="text-xl mb-1">⚙️</div>
          <div className="text-xs font-semibold">Settings</div>
        </button>
      </div>
    </div>
  )
}

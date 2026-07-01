'use client'

import { ReactNode, useEffect } from 'react'

interface MiniKitProviderProps {
  children: ReactNode
}

/**
 * MiniKitProvider
 * Installs the MiniKit SDK on mount using dynamic import.
 *
 * Uses dynamic import instead of static import to prevent
 * @worldcoin/minikit-js from being evaluated during SSR,
 * which would crash the bundle since MiniKit expects browser APIs.
 */
export function MiniKitProvider({ children }: MiniKitProviderProps) {
  useEffect(() => {
    // Dynamically import MiniKit only in the browser after hydration
    import('@worldcoin/minikit-js')
      .then(({ MiniKit }) => {
        try {
          const appId = process.env.NEXT_PUBLIC_WORLD_APP_ID
          MiniKit.install(appId)
          console.log('[MiniKitProvider] MiniKit.install() succeeded with appId:', appId)
        } catch (e) {
          console.error('[MiniKitProvider] MiniKit.install() failed:', e)
        }
      })
      .catch((e) => {
        console.error('[MiniKitProvider] Failed to import MiniKit:', e)
      })
  }, [])

  return <>{children}</>
}

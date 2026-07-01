'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface AuthedUser {
  id: string
  world_wallet_address: string
  world_username?: string
  orb_verified: boolean
}

export function useAuthedUser() {
  const router = useRouter()
  const [user, setUser] = useState<AuthedUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = () => {
      try {
        // Try localStorage first, then fallback to cookies (for World App webview persistence)
        let userId = localStorage.getItem('user_id')
        let userDataStr = localStorage.getItem('user_data')

        if (!userId) {
          // Fallback to cookies
          const cookies = document.cookie.split('; ').reduce((acc, cookie) => {
            const [key, value] = cookie.split('=')
            acc[key] = decodeURIComponent(value)
            return acc
          }, {} as Record<string, string>)
          userId = cookies.user_id || null
          userDataStr = cookies.user_data || null
        }

        if (!userId) {
          setUser(null)
          setIsLoading(false)
          return
        }

        if (userDataStr) {
          const userData = JSON.parse(userDataStr)
          setUser({
            id: userId,
            world_wallet_address: userData.world_wallet_address,
            world_username: userData.world_username,
            orb_verified: userData.orb_verified,
          })
        } else {
          setUser({
            id: userId,
            world_wallet_address: '',
            orb_verified: false,
          })
        }
      } catch (error) {
        console.error('Error checking auth:', error)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  return { user, isLoading }
}

export function useRequireAuth() {
  const router = useRouter()
  const { user, isLoading } = useAuthedUser()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/')
    }
  }, [user, isLoading, router])

  return { user, isLoading }
}

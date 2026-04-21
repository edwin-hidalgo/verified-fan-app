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
        const userId = localStorage.getItem('user_id')
        const userDataStr = localStorage.getItem('user_data')

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

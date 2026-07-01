'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

export default function Header() {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const isActive = (href: string) => pathname === href

  const links = [
    { href: '/', label: 'Home' },
    { href: '/catalog', label: 'Feed' },
    { href: '/create', label: 'Create' },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-[#1b1b1b] bg-[#d9dbdd]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <svg className="w-8 h-8" viewBox="0 0 100 100" fill="none">
              {/* Outer rings */}
              <ellipse cx="50" cy="50" rx="40" ry="32" stroke="white" strokeWidth="3.5" />
              <ellipse cx="50" cy="50" rx="30" ry="24" stroke="white" strokeWidth="3.5" />
              <ellipse cx="50" cy="50" rx="20" ry="16" stroke="white" strokeWidth="3.5" />
              <ellipse cx="50" cy="50" rx="10" ry="8" stroke="white" strokeWidth="3.5" />
            </svg>
            <span className="font-bold text-[#1b1b1b] text-lg">ekos</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? 'text-[#1b1b1b] font-semibold'
                    : 'text-[#1b1b1b80] hover:text-[#1b1b1b]'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-[#1b1b1b80] hover:text-[#1b1b1b]"
          >
            <span className="sr-only">Open menu</span>
            {isMobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <nav className="md:hidden pb-4 space-y-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  isActive(link.href)
                    ? 'text-[#1b1b1b] font-semibold'
                    : 'text-[#1b1b1b80] hover:text-[#1b1b1b]'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  )
}

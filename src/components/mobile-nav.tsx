'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Sparkles,
  LayoutGrid,
  Shield,
  FileText,
  Settings,
} from 'lucide-react'

const mobileNavItems = [
  { title: 'Picks', href: '/jobs', icon: Sparkles },
  { title: 'Tracker', href: '/tracker', icon: LayoutGrid },
  { title: 'Immigration', href: '/immigration', icon: Shield },
  { title: 'Docs', href: '/documents', icon: FileText },
  { title: 'Settings', href: '/settings', icon: Settings },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around py-2">
        {mobileNavItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs transition-colors ${
                isActive
                  ? 'text-ocean font-medium'
                  : 'text-muted-foreground'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <item.icon className="size-5" />
              <span>{item.title}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

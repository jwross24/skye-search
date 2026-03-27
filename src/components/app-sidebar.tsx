'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Sparkles,
  LayoutGrid,
  Shield,
  FileText,
  Users,
  Settings,
  Coffee,
  Inbox,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
  SidebarRail,
} from '@/components/ui/sidebar'

const navItems = [
  { title: "Today's Picks", href: '/jobs', icon: Sparkles },
  { title: 'Tracker', href: '/tracker', icon: LayoutGrid },
  { title: 'Immigration HQ', href: '/immigration', icon: Shield },
  { title: 'Inbox', href: '/emails', icon: Inbox },
  { title: 'Documents', href: '/documents', icon: FileText },
  { title: 'Network', href: '/network', icon: Users },
  { title: 'Settings', href: '/settings', icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()
  const [unprocessedCount, setUnprocessedCount] = useState(0)

  useEffect(() => {
    // Same-origin fetch — no CSP/ad-blocker issues
    fetch('/api/inbox-count')
      .then((res) => res.json())
      .then((data) => setUnprocessedCount(data.count ?? 0))
      .catch(() => {}) // Badge stays 0 on failure
  }, [pathname])

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-5 transition-[padding] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-data-[state=collapsed]:px-2 group-data-[state=collapsed]:py-4">
        <Link href="/" className="flex items-center gap-2 overflow-hidden">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-ocean/10">
            <svg viewBox="0 0 24 24" fill="none" className="size-5 text-ocean" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 3C7 3 3 7 3 12s4 9 9 9 9-4 9-9" strokeLinecap="round" />
              <path d="M21 12c-2 0-4 1.5-6 1.5S11 12 9 12s-4 1.5-6 1.5" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-lg font-semibold tracking-tight text-ocean-deep whitespace-nowrap transition-opacity duration-200 group-data-[state=collapsed]:opacity-0">
            SkyeSearch
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(item.href + '/')

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                    {item.href === '/emails' && unprocessedCount > 0 && (
                      <SidebarMenuBadge className="bg-ocean/10 text-ocean text-xs font-medium">
                        {unprocessedCount}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-4 py-3 transition-[padding] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-data-[state=collapsed]:px-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/settings#break-mode" />}
              className="text-muted-foreground"
            >
              <Coffee />
              <span>Take a break</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

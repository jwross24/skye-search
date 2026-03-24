import type { Metadata } from 'next'
import '@fontsource-variable/plus-jakarta-sans'
import { Geist_Mono } from 'next/font/google'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppSidebar } from '@/components/app-sidebar'
import { MobileNav } from '@/components/mobile-nav'
import './globals.css'

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'SkyeSearch',
  description: 'Immigration-aware career companion for international PhD students',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistMono.variable} h-full antialiased`}
      style={{ fontFamily: "'Plus Jakarta Sans Variable', sans-serif" }}
    >
      <body className="min-h-full flex flex-col">
        <TooltipProvider>
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <header className="flex h-12 items-center gap-2 border-b border-border px-4 md:hidden">
                <SidebarTrigger />
                <span className="text-sm font-semibold text-ocean-deep">
                  SkyeSearch
                </span>
              </header>
              <main className="flex-1 pb-16 md:pb-0">{children}</main>
            </SidebarInset>
          </SidebarProvider>
          <MobileNav />
        </TooltipProvider>
      </body>
    </html>
  )
}

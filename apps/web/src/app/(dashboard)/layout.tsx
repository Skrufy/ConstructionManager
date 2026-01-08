import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-helpers'
import { Sidebar } from '@/components/navigation/sidebar'
import { Header } from '@/components/navigation/header'
import { MobileNav } from '@/components/navigation/mobile-nav'
import { OfflineProvider } from '@/components/providers/offline-provider'
import { SettingsProvider } from '@/components/providers/settings-provider'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { ToastProvider } from '@/components/ui/toast'
import { ClientOnly } from '@/components/ui/client-only'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // Create session-like object for backward compatibility with components
  const sessionUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  }

  return (
    <SettingsProvider>
      <ThemeProvider>
        <OfflineProvider>
          <ToastProvider>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
              <ClientOnly fallback={<div className="hidden lg:fixed lg:inset-y-0 lg:w-64 lg:bg-gray-900" />}>
                <Sidebar userRole={user.role} />
              </ClientOnly>
              <div className="lg:pl-64">
                <ClientOnly>
                  <Header user={sessionUser} />
                </ClientOnly>
                <main className="py-6 px-4 sm:px-6 lg:px-8">
                  {children}
                </main>
              </div>
              <ClientOnly>
                <MobileNav userRole={user.role} />
              </ClientOnly>
            </div>
          </ToastProvider>
        </OfflineProvider>
      </ThemeProvider>
    </SettingsProvider>
  )
}

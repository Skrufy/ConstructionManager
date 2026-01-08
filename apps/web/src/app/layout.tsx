import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/providers/auth-provider'
import { ErrorBoundary } from '@/components/providers/error-boundary'
import { SWRProvider } from '@/components/providers/swr-provider'
import { VersionCheck } from '@/components/ui/version-check'
import { DynamicFavicon } from '@/components/ui/dynamic-favicon'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Construction Management Platform',
  description: 'Streamline project execution, resource management, and daily reporting',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <SWRProvider>
            <AuthProvider>
              <DynamicFavicon />
              {children}
              <VersionCheck />
            </AuthProvider>
          </SWRProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}

import type { Metadata } from 'next'
import './globals.css'
import { Suspense } from 'react'
import { ErrorBoundaryWrapper } from '@/app/error-boundary-wrapper'
import { AuthProvider } from '@/lib/auth-context'
import { PostProvider } from '@/lib/post-context'
import { DateProvider } from '@/lib/date-context'
import { Toaster as ToasterProvider } from '@/components/ui/toaster'
import { Inter, Great_Vibes } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const signature = Great_Vibes({ subsets: ['latin'], weight: '400', variable: '--font-signature' })

// Providers are imported statically to preserve hook order across renders

export const metadata: Metadata = {
  title: 'FlowCore Social - Social Media Dashboard',
  description: 'Manage your social media presence with AI-powered content creation and scheduling',
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${signature.variable}`}>
        <a href="#main" className="sr-only focus:not-sr-only">Skip to content</a>
        <div id="cursor-glow" aria-hidden="true"></div>
        <ErrorBoundaryWrapper>
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
            </div>
          }>
            <AuthProvider>
              <PostProvider>
                <DateProvider>
                  {children}
                  <ToasterProvider />
                </DateProvider>
              </PostProvider>
            </AuthProvider>
          </Suspense>
        </ErrorBoundaryWrapper>
      </body>
    </html>
  )
}

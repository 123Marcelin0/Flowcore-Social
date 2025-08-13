import type { Metadata } from 'next'
import './globals.css'
import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { ErrorBoundaryWrapper } from '@/app/error-boundary-wrapper'
import { Inter, Great_Vibes } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const signature = Great_Vibes({ subsets: ['latin'], weight: '400', variable: '--font-signature' })

const AuthProvider = dynamic(() => import('@/lib/auth-context').then(mod => mod.AuthProvider), {
  ssr: true
})

const PostProvider = dynamic(() => import('@/lib/post-context').then(mod => mod.PostProvider), {
  ssr: true
})

// Create a client-side only wrapper for Toaster
const ToasterProvider = dynamic(() => import('@/components/ui/toaster').then(mod => mod.Toaster), {
  ssr: true
})

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
        <div id="cursor-glow" aria-hidden="true"></div>
        <ErrorBoundaryWrapper>
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
            </div>
          }>
            <AuthProvider>
              <PostProvider>
                {children}
                <ToasterProvider />
              </PostProvider>
            </AuthProvider>
          </Suspense>
        </ErrorBoundaryWrapper>
      </body>
    </html>
  )
}

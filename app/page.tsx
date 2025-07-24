"use client"

import dynamic from 'next/dynamic'

// Dynamically import the client component
const ClientPageRoot = dynamic(() => import('./client-root').then(mod => ({ default: mod.ClientPageRoot })), {
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
    </div>
  )
})

export default function Page() {
  return <ClientPageRoot />
}

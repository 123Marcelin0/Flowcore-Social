'use client'

import dynamic from 'next/dynamic'

const Sonner = dynamic(async () => (await import('sonner')).Toaster, { ssr: false })

const Toaster = () => {
  return (
    <Sonner
      theme="system"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
      }}
    />
  )
}

export { Toaster }

"use client"

import React from "react"
import { AppNavSidebar } from "@/components/app-nav-sidebar"
import { usePathname } from "next/navigation"

export function AppShell({ children }: { children: React.ReactNode }) {
	const pathname = usePathname()
	const isAIStudio = pathname?.startsWith('/ai-studio')
	return (
		<div className="flex h-screen bg-gray-50">
			{!isAIStudio && <AppNavSidebar />}
			<main className="flex-1 overflow-y-auto">{children}</main>
		</div>
	)
}

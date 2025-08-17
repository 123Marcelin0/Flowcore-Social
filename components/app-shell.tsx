"use client"

import React from "react"
import { AppNavSidebar } from "@/components/app-nav-sidebar"

export function AppShell({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex h-screen bg-gray-50">
			<AppNavSidebar />
			<main className="flex-1 overflow-y-auto">{children}</main>
		</div>
	)
}
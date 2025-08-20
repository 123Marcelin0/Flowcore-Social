import { AppShell } from "@/components/app-shell"
import React from "react"
import { usePathname } from "next/navigation"

export default function RoutedLayout({ children }: { children: React.ReactNode }) {
	return (
		<>
			<a href="#main" className="sr-only focus:not-sr-only">Skip to content</a>
			<AppShell>
				<div id="main" className="h-full">{children}</div>
			</AppShell>
		</>
	)
}

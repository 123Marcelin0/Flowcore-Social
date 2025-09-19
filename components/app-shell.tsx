"use client"

import React from "react"
import { AppNavSidebar } from "@/components/app-nav-sidebar"
import { usePathname } from "next/navigation"

export function AppShell({ children }: { children: React.ReactNode }) {
	const pathname = usePathname()
	const isAIStudio = pathname?.startsWith('/ai-studio')
	
	return (
		<div 
			className="h-screen w-screen overflow-hidden relative"
			style={{
				backgroundImage: 'url(/background.png)',
				backgroundSize: 'cover',
				backgroundPosition: 'center',
				backgroundRepeat: 'no-repeat',
				backgroundAttachment: 'fixed'
			}}
		>
			{/* Glass Container - unified surface for both sidebar and main content */}
			<div 
				className="absolute top-6 left-6 right-6 bottom-6 rounded-3xl bg-white/15 border border-white/30 shadow-2xl overflow-hidden"
				style={{
					boxShadow: `
						inset 0 1px 0 0 rgba(255, 255, 255, 0.8),
						inset 0 -1px 0 0 rgba(255, 255, 255, 0.8),
						0 0 60px -10px rgba(255, 255, 255, 0.4),
						0 0 120px -20px rgba(255, 255, 255, 0.2),
						0 8px 32px -8px rgba(0, 0, 0, 0.3)
					`
				}}
			>
				<div className="flex h-full">
					{/* Sidebar - no visual separation, integrated into glass surface */}
					{!isAIStudio && (
						<div className="w-72 flex-shrink-0">
							<AppNavSidebar />
						</div>
					)}
					
					{/* Main Content - seamlessly integrated with hidden scrollbar */}
					<main 
						className="flex-1 overflow-y-auto"
						style={{
							scrollbarWidth: 'none', /* Firefox */
							msOverflowStyle: 'none', /* Internet Explorer 10+ */
						}}
					>
						<style jsx>{`
							main::-webkit-scrollbar {
								display: none; /* Safari and Chrome */
							}
						`}</style>
						{children}
					</main>
				</div>
			</div>
		</div>
	)
}

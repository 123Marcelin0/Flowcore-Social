"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ROUTES, RouteGroup, RouteItem } from "@/src/routes/manifest"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Home,
  Calendar,
  Sparkles,
  MessageSquare,
  Lightbulb,
  Settings,
  ImageIcon,
  VideoIcon,
  Film,
  Edit3,
  FileText,
  Clock3,
  Scissors,
  Database,
  TestTube,
} from "lucide-react"

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Home,
  Calendar,
  Sparkles,
  MessageSquare,
  Lightbulb,
  Settings,
  ImageIcon,
  VideoIcon,
  Film,
  Edit3,
  FileText,
  Clock3,
  Scissors,
  Database,
  TestTube,
}

function getIcon(name?: string) {
	if (!name) return null
	const Icon = ICONS[name]
	return Icon ? <Icon className="w-4 h-4" aria-hidden="true" /> : null
}

export function AppNavSidebar() {
	const pathname = usePathname()
	// Only show core primary navigation in the main app sidebar
	const groups: RouteGroup[] = ROUTES.groups.filter(g => g.id === "primary")

	return (
		<nav aria-label="Primary" className="w-72 h-screen bg-white border-r">
			<div className="p-6">
				<Link href="/dashboard" aria-label="Flowcore Social" className="inline-flex items-baseline">
					<span
						className="text-transparent bg-clip-text text-2xl tracking-tight font-medium bg-gradient-to-r from-[#dc2626] via-[#ea580c] to-[#f97316]"
						style={{ fontFamily: 'Circular, Helvetica Neue, Arial, sans-serif' }}
					>
						flowcore
					</span>
					<span
						className="ml-1 text-transparent bg-clip-text font-medium text-lg tracking-tight bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500"
						style={{ fontFamily: 'Circular, Helvetica Neue, Arial, sans-serif' }}
					>
						social
					</span>
				</Link>
			</div>
			<div className="px-4 space-y-8">
				{groups.map(group => (
					<div key={group.id}>
						<div className="px-2 text-xs uppercase text-slate-500 tracking-wide mb-2">{group.title}</div>
						<ul className="space-y-1">
							{group.routes.map((r: RouteItem) => {
								const isActive = pathname === r.path || (r.path !== "/" && pathname.startsWith(r.path + "/"))
								return (
								<li key={r.path}>
									<Link href={r.path} className="block">
										<Button
											variant="ghost"
											className={cn(
												"w-full justify-start gap-3 px-4 py-3 text-sm rounded-2xl",
												isActive ? "bg-blue-50 text-blue-700 border border-blue-200" : "text-slate-700 hover:bg-gray-50 hover:text-slate-800"
											)}
											aria-current={isActive ? "page" : undefined}
										>
											{getIcon(r.icon)}
											<span className="font-medium tracking-tight">{r.title}</span>
										</Button>
									</Link>
								</li>
								)
							})}
						</ul>
					</div>
				))}
			</div>
		</nav>
	)
}

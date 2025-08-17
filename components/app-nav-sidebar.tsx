"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ROUTES, RouteGroup, RouteItem } from "@/src/routes/manifest"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import * as Icons from "lucide-react"

function getIcon(name?: string) {
	if (!name) return null
	// @ts-ignore dynamic index
	const Icon = Icons[name]
	return Icon ? <Icon className="w-4 h-4" aria-hidden="true" /> : null
}

export function AppNavSidebar() {
	const pathname = usePathname()
	const groups: RouteGroup[] = ROUTES.groups.filter(g => g.id === "primary" || g.id === "ai-studio")

	return (
		<nav aria-label="Primary" className="w-72 h-screen bg-white border-r">
			<div className="p-6">
				<div className="text-2xl font-semibold tracking-tight">flowcore <span className="text-slate-500">social</span></div>
			</div>
			<div className="px-4 space-y-8">
				{groups.map(group => (
					<div key={group.id}>
						<div className="px-2 text-xs uppercase text-slate-500 tracking-wide mb-2">{group.title}</div>
						<ul className="space-y-1">
							{group.routes.map((r: RouteItem) => (
								<li key={r.path}>
									<Link href={r.path} className="block">
										<Button
											variant="ghost"
											className={cn(
												"w-full justify-start gap-3 px-4 py-3 text-sm rounded-2xl",
												pathname === r.path ? "bg-blue-50 text-blue-700 border border-blue-200" : "text-slate-700 hover:bg-gray-50 hover:text-slate-800"
											)}
											aria-current={pathname === r.path ? "page" : undefined}
										>
											{getIcon(r.icon)}
											<span className="font-medium tracking-tight">{r.title}</span>
										</Button>
									</Link>
								</li>
							))}
						</ul>
					</div>
				))}
			</div>
		</nav>
	)
}
"use client"

import React, { useEffect } from "react"
import { usePathname } from "next/navigation"

export default function AIStudioLayout({ children }: { children: React.ReactNode }) {
	const pathname = usePathname()
	useEffect(() => {
		const body = document.body
		const html = document.documentElement
		const classes = [
			"ai-studio-interior",
			"ai-studio-video-editor",
			"ai-studio-content-create",
			"ai-studio-video-edit",
			"ai-studio-image-generation",
			"ai-studio-video-merger",
		]
		classes.forEach(c => { body.classList.remove(c); html.classList.remove(c) })
		if (pathname.startsWith("/ai-studio/interior-design")) { body.classList.add("ai-studio-interior"); html.classList.add("ai-studio-interior") }
		if (pathname.startsWith("/ai-studio/video-editor")) { body.classList.add("ai-studio-video-editor"); html.classList.add("ai-studio-video-editor") }
		if (pathname.startsWith("/ai-studio/content-create")) { body.classList.add("ai-studio-content-create"); html.classList.add("ai-studio-content-create") }
		if (pathname.startsWith("/ai-studio/video-edit")) { body.classList.add("ai-studio-video-edit"); html.classList.add("ai-studio-video-edit") }
		if (pathname.startsWith("/ai-studio/image-generation")) { body.classList.add("ai-studio-image-generation"); html.classList.add("ai-studio-image-generation") }
		if (pathname.startsWith("/ai-studio/video-merger")) { body.classList.add("ai-studio-video-merger"); html.classList.add("ai-studio-video-merger") }
		return () => { classes.forEach(c => { body.classList.remove(c); html.classList.remove(c) }) }
	}, [pathname])
	return <><a href="#main" className="sr-only focus:not-sr-only">Skip to content</a>{children}</>
}
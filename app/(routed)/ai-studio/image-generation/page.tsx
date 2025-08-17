"use client"

import React from "react"
import { ProtectedRoute } from "@/lib/auth-context"
import LoginPage from "@/components/auth/login-page"
import { AIStudioImageGenerator } from "@/app/components/ai-studio-image-generator"
import { AIStudioToolbar } from "@/app/components/ai-studio-toolbar"

export default function ImageGenerationToolPage() {
	return (
		<ProtectedRoute fallback={<LoginPage />}>
			<div className="relative flex w-full">
				<div className="absolute left-0 top-0 bottom-0 z-40">
					<AIStudioToolbar onBack={() => history.back()} activeTool="image-generation" />
				</div>
				<main className="flex-1 overflow-y-auto relative z-20 ml-72">
					<AIStudioImageGenerator />
				</main>
			</div>
		</ProtectedRoute>
	)
}
"use client"

import React from "react"
import { ProtectedRoute } from "@/lib/auth-context"
import LoginPage from "@/components/auth/login-page"
import { AIInteractions } from "@/app/components/ai-interactions"

export default function AssistantRoutedPage() {
	return (
		<ProtectedRoute fallback={<LoginPage />}>
			<AIInteractions />
		</ProtectedRoute>
	)
}
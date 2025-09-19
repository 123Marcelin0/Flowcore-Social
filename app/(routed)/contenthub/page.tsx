"use client"

import React from "react"
import { ProtectedRoute } from "@/lib/auth-context"
import LoginPage from "@/components/auth/login-page"
import { ContentHubView } from "@/app/components/content-hub-view"

export default function ContentHubPage() {
	return (
		<ProtectedRoute fallback={<LoginPage />}>
			<div className="h-full">
				<ContentHubView />
			</div>
		</ProtectedRoute>
	)
}
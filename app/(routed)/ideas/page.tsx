"use client"

import React from "react"
import { ProtectedRoute } from "@/lib/auth-context"
import LoginPage from "@/components/auth/login-page"
import { ContentIdeas } from "@/app/components/content-ideas"

export default function IdeasRoutedPage() {
	return (
		<ProtectedRoute fallback={<LoginPage />}>
			<ContentIdeas />
		</ProtectedRoute>
	)
}
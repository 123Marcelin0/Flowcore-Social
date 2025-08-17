"use client"

import React from "react"
import { ProtectedRoute } from "@/lib/auth-context"
import LoginPage from "@/components/auth/login-page"
import { ContentHub } from "@/app/components/content-hub"

export default function CalendarRoutedPage() {
	return (
		<ProtectedRoute fallback={<LoginPage />}>
			<ContentHub />
		</ProtectedRoute>
	)
}
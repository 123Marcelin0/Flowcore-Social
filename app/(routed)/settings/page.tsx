"use client"

import React from "react"
import { ProtectedRoute } from "@/lib/auth-context"
import LoginPage from "@/components/auth/login-page"
import { SettingsPage } from "@/components/settings/settings-page"

export default function SettingsRoutedPage() {
	return (
		<ProtectedRoute fallback={<LoginPage />}>
			<SettingsPage />
		</ProtectedRoute>
	)
}
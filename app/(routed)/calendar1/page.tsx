"use client"

import React from "react"
import { ProtectedRoute } from "@/lib/auth-context"
import LoginPage from "@/components/auth/login-page"
import { CalendarAndPlannerView } from "@/app/components/calendar-and-planner-view"

export default function Calendar1Page() {
	return (
		<ProtectedRoute fallback={<LoginPage />}>
			<div className="h-full">
				<CalendarAndPlannerView />
			</div>
		</ProtectedRoute>
	)
}
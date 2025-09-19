"use client"

import React, { useState } from "react"
import { ProtectedRoute } from "@/lib/auth-context"
import LoginPage from "@/components/auth/login-page"
import { AIInteractions } from "@/app/components/ai-interactions"
import { DashboardButtonGroup } from "@/app/components/dashboard-button-group"

export default function AssistantRoutedPage() {
	const [selectedStatus, setSelectedStatus] = useState<string>("Alle")

	return (
		<ProtectedRoute fallback={<LoginPage />}>
			<div className="h-full w-full overflow-y-auto p-8">
				<div className="max-w-[1400px] mx-auto pb-4">
					<DashboardButtonGroup 
						selectedStatus={selectedStatus}
						setSelectedStatus={setSelectedStatus}
					/>
				</div>
				<div className="h-full">
					<AIInteractions />
				</div>
			</div>
		</ProtectedRoute>
	)
}

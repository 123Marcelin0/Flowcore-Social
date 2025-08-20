"use client"

import React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { ProtectedRoute } from "@/lib/auth-context"
import LoginPage from "@/components/auth/login-page"
import { ContentStrategyWorkflow } from "@/app/components/content-strategy-workflow"

export default function ContentStrategyWorkflowPage() {
	const params = useSearchParams()
	const router = useRouter()
	const strategyData = params.get('strategyData')
	let strategy: any = null
	if (strategyData) {
		try { strategy = JSON.parse(decodeURIComponent(strategyData)) } catch {}
	}
	return (
		<ProtectedRoute fallback={<LoginPage />}>
			<div className="flex h-screen bg-gray-50">
				<ContentStrategyWorkflow 
					strategy={strategy || {}} 
					onBack={() => router.push('/calendar')} 
				/>
			</div>
		</ProtectedRoute>
	)
}



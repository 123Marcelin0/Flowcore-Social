"use client"

import React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { ProtectedRoute } from "@/lib/auth-context"
import LoginPage from "@/components/auth/login-page"
import { TrendOptimizationWorkflow } from "@/app/components/trend-optimization-workflow"

export default function TrendOptimizationWorkflowPage() {
	const params = useSearchParams()
	const router = useRouter()
	const eventData = params.get('eventData')
	let trend: any = null
	if (eventData) {
		try { trend = JSON.parse(decodeURIComponent(eventData)) } catch {}
	}
	return (
		<ProtectedRoute fallback={<LoginPage />}>
			<div className="flex h-screen bg-gray-50">
				<TrendOptimizationWorkflow 
					trend={trend || { id: 'unknown', thumbnail_url: '/placeholder.jpg', reel_url: '#', title: 'Trend', description: '', creator: 'Deep Link' }}
					onBack={() => router.push('/calendar')}
				/>
			</div>
		</ProtectedRoute>
	)
}



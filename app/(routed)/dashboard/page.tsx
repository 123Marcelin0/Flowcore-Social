"use client"

import React from "react"
import { ProtectedRoute } from "@/lib/auth-context"
import LoginPage from "@/components/auth/login-page"
import { DashboardOverviewOptimized } from "@/app/components/dashboard-overview-optimized"

export default function DashboardRoutedPage() {
  return (
    <ProtectedRoute fallback={<LoginPage />}>
      <DashboardOverviewOptimized />
    </ProtectedRoute>
  )
}





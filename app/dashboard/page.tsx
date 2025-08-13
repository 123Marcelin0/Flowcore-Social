"use client"

import React from "react"
import { ProtectedRoute } from "@/lib/auth-context"
import LoginPage from "@/components/auth/login-page"
import { ClientPageRoot } from "../client-root"

export default function DashboardPage() {
  return (
    <ProtectedRoute fallback={<LoginPage />}>
      <ClientPageRoot />
    </ProtectedRoute>
  )
}



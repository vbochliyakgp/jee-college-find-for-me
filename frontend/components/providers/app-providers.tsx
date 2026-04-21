"use client"

import type React from "react"
import { AdvancedQueryProvider } from "@/components/advanced-query/advanced-query-context"

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <AdvancedQueryProvider>{children}</AdvancedQueryProvider>
}

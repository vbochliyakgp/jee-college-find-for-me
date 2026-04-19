import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { PredictView } from "@/components/predict/predict-view"
import { fetchPrediction } from "@/lib/predict/api"
import type { ExamType, Gender, IndianState } from "@/lib/predict/types"
import type { InitialParams } from "@/components/predict/predict-view"

export const metadata: Metadata = {
  title: "Predict",
  description: "Explore eligible colleges and programs from your JEE rank using the Go predictor API.",
  robots: {
    index: false,
    follow: true,
  },
}

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function PredictPage({ searchParams }: PageProps) {
  const p = await searchParams

  const str = (key: string) => {
    const v = p[key]
    return typeof v === "string" ? v : undefined
  }

  const exam = str("exam")
  const score = str("score")
  const gender = str("gender")
  const category = str("category")

  // Required params must all be present — otherwise send back to the home form
  if (!exam || !score || !gender || !category) redirect("/")

  const initialParams: InitialParams = {
    examType: exam as ExamType,
    score,
    gender: gender as Gender,
    homeState: (str("state") as IndianState | undefined) ?? "",
    category,
    categoryRank: str("categoryRank"),
    openPwdRank: str("openPwdRank"),
    categoryPwdRank: str("categoryPwdRank"),
    isPWD: str("pwd") === "true",
  }

  const prediction = await fetchPrediction(initialParams)

  return (
    <PredictView
      initialParams={initialParams}
      initialColleges={prediction.colleges}
      resolvedRank={prediction.resolvedRank}
    />
  )
}

import type { InitialParams } from "@/components/predict/predict-view"
import type { PredictApiResponse } from "@/lib/predict/types"

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8080"

function apiBaseUrl() {
  return process.env.NEXT_PUBLIC_GO_PREDICTOR_API_BASE_URL ?? process.env.GO_PREDICTOR_API_BASE_URL ?? DEFAULT_API_BASE_URL
}

export async function fetchPrediction(params: InitialParams): Promise<PredictApiResponse> {
  return fetchPredictionWithMode(params, "combined")
}

export type PredictMode = "combined" | "without-category" | "category-only"

export async function fetchPredictionWithMode(params: InitialParams, mode: PredictMode): Promise<PredictApiResponse> {
  const response = await fetch(`${apiBaseUrl()}/api/predict`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      examType: params.examType,
      rank: params.score,
      mode,
      gender: params.gender,
      homeState: params.homeState,
      category: params.category,
      categoryRank: params.categoryRank ?? null,
      isPWD: params.isPWD,
      pwdRank: params.pwdRank?.trim() ? params.pwdRank.trim() : null,
    }),
  })

  if (!response.ok) {
    let message = `Prediction API failed with status ${response.status}`
    try {
      const body = (await response.json()) as { error?: string }
      if (body.error) message = body.error
    } catch {}
    throw new Error(message)
  }

  return (await response.json()) as PredictApiResponse
}

export function calculateRankFromPercentile(percentile: number): number {
  const totalCandidates = 1300000
  const rank = Math.round((100 - percentile) * (totalCandidates / 100))
  return Math.max(1, rank)
}

package cutoffquery

// GroupClosingBands groups rank clauses by targetPool for per-tab queries (OR within a tab).
func GroupClosingBands(bands []ClosingRankBand) map[string][]ClosingRankBand {
	out := make(map[string][]ClosingRankBand)
	for _, b := range bands {
		out[b.TargetPool] = append(out[b.TargetPool], b)
	}
	return out
}

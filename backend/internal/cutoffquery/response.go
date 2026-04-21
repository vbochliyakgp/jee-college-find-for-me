package cutoffquery

// PoolsPayload holds up to four tab results; global filters already applied per query.
type PoolsPayload struct {
	Open        []ResultRow `json:"open"`
	Category    []ResultRow `json:"category"`
	OpenPwd     []ResultRow `json:"openPwd"`
	CategoryPwd []ResultRow `json:"categoryPwd"`
}

// QueryResponse is the successful JSON body for POST /api/cutoffs/query.
type QueryResponse struct {
	OK    bool         `json:"ok"`
	Pools PoolsPayload `json:"pools"`
}

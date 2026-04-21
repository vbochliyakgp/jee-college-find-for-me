package cutoffquery

// PoolsPayload holds up to four tab results; global filters already applied per query.
type PoolsPayload struct {
	Open        []ResultRow `json:"open"`
	Category    []ResultRow `json:"category"`
	OpenPwd     []ResultRow `json:"openPwd"`
	CategoryPwd []ResultRow `json:"categoryPwd"`
}

// PoolMeta indicates backend-side result limiting/truncation per tab pool.
type PoolMeta struct {
	Open        PoolMetaItem `json:"open"`
	Category    PoolMetaItem `json:"category"`
	OpenPwd     PoolMetaItem `json:"openPwd"`
	CategoryPwd PoolMetaItem `json:"categoryPwd"`
}

type PoolMetaItem struct {
	ReturnedRows int  `json:"returnedRows"`
	Truncated    bool `json:"truncated"`
	HasMore      bool `json:"hasMore"`
	Page         int  `json:"page"`
	PageSize     int  `json:"pageSize"`
}

// QueryResponse is the successful JSON body for POST /api/cutoffs/query.
type QueryResponse struct {
	OK    bool         `json:"ok"`
	Pools PoolsPayload `json:"pools"`
	Meta  PoolMeta     `json:"meta"`
}

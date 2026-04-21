package cutoffquery

import (
	"context"
	"database/sql"
	"fmt"
)

// Service runs validated cutoff queries against SQLite.
type Service struct {
	db    *sql.DB
	table string
}

// NewService wires the main cutoff snapshot table.
func NewService(db *sql.DB) *Service {
	return &Service{db: db, table: DefaultCutoffTable}
}

// QueryPools runs one DB query per logical pool that has closing-rank bands.
// Caller must validate the request first (see Validate).
func (s *Service) QueryPools(ctx context.Context, req Request) (*QueryResponse, error) {
	if s.db == nil {
		return nil, fmt.Errorf("nil db")
	}
	table := s.table
	if table == "" {
		table = DefaultCutoffTable
	}

	genderDB, err := ToDBGender(req.GenderPool)
	if err != nil {
		return nil, err
	}

	grouped := GroupClosingBands(req.PowerMode.ClosingRankBands)
	out := &QueryResponse{OK: true}

	pools := []struct {
		key string
		dst *[]ResultRow
	}{
		{"open", &out.Pools.Open},
		{"category", &out.Pools.Category},
		{"open_pwd", &out.Pools.OpenPwd},
		{"category_pwd", &out.Pools.CategoryPwd},
	}

	for _, p := range pools {
		clauses := grouped[p.key]
		if len(clauses) == 0 {
			*p.dst = []ResultRow{}
			continue
		}
		if !RankBandAllowed(p.key, req.Category, req.IsPwd) {
			// Defensive fallback: skip ineligible pools instead of failing whole request.
			// Normal HTTP flow validates this earlier.
			*p.dst = []ResultRow{}
			continue
		}

		seatTypes, err := SeatTypesForTargetPool(p.key, req.Category)
		if err != nil {
			return nil, fmt.Errorf("pool %s: %w", p.key, err)
		}

		rows, err := QueryCutoffPool(ctx, s.db, PoolQueryInput{
			Table:            table,
			ExamType:         req.ExamType,
			GenderDB:         genderDB,
			Quotas:           req.Quotas,
			InstituteTypes:   req.InstituteTypes,
			SeatTypes:        seatTypes,
			ClosingRankBands: clauses,
			HomeState:        req.HomeState,
		})
		if err != nil {
			return nil, fmt.Errorf("pool %s: %w", p.key, err)
		}
		*p.dst = rows
	}

	return out, nil
}

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
	if req.Counseling == "csab" {
		table = "csab_cutoff_rows"
	} else if table == "" {
		table = DefaultCutoffTable
	}

	genderDBs, err := ToDBGenders(req.GenderPool)
	if err != nil {
		return nil, err
	}

	grouped := GroupClosingBands(req.PowerMode.ClosingRankBands)

	// Auto-fill logical pools from "open" if they are empty but allowed for this user (CSAB only).
	if req.Counseling == "csab" {
		if openBands, ok := grouped["open"]; ok && len(openBands) > 0 {
			targets := []string{"category", "open_pwd", "category_pwd"}
			for _, t := range targets {
				if len(grouped[t]) == 0 && RankBandAllowed(t, req.Category, req.IsPwd) {
					for _, b := range openBands {
						nb := b
						nb.TargetPool = t
						grouped[t] = append(grouped[t], nb)
					}
				}
			}
		}
	}

	out := &QueryResponse{OK: true}

	pools := []struct {
		key string
		dst *[]ResultRow
		mt  *PoolMetaItem
	}{
		{"open", &out.Pools.Open, &out.Meta.Open},
		{"category", &out.Pools.Category, &out.Meta.Category},
		{"open_pwd", &out.Pools.OpenPwd, &out.Meta.OpenPwd},
		{"category_pwd", &out.Pools.CategoryPwd, &out.Meta.CategoryPwd},
	}

	for _, p := range pools {
		page := 1
		pageSize := maxRowsPerPool
		if req.Pagination != nil {
			page = req.Pagination.Page
			pageSize = req.Pagination.PageSize
			if p.key != req.Pagination.TargetPool {
				*p.dst = []ResultRow{}
				*p.mt = PoolMetaItem{ReturnedRows: 0, Truncated: false, HasMore: false, Page: page, PageSize: pageSize}
				continue
			}
		}
		clauses := grouped[p.key]
		if len(clauses) == 0 {
			*p.dst = []ResultRow{}
			*p.mt = PoolMetaItem{ReturnedRows: 0, Truncated: false, HasMore: false, Page: page, PageSize: pageSize}
			continue
		}
		if !RankBandAllowed(p.key, req.Category, req.IsPwd) {
			// Defensive fallback: skip ineligible pools instead of failing whole request.
			// Normal HTTP flow validates this earlier.
			*p.dst = []ResultRow{}
			*p.mt = PoolMetaItem{ReturnedRows: 0, Truncated: false, HasMore: false, Page: page, PageSize: pageSize}
			continue
		}

		seatTypes, err := SeatTypesForTargetPool(p.key, req.Category)
		if err != nil {
			return nil, fmt.Errorf("pool %s: %w", p.key, err)
		}

		res, err := QueryCutoffPool(ctx, s.db, PoolQueryInput{
			Table:            table,
			ExamType:         req.ExamType,
			GenderDBs:        genderDBs,
			Quotas:           req.Quotas,
			InstituteTypes:   req.InstituteTypes,
			SeatTypes:        seatTypes,
			ClosingRankBands: clauses,
			HomeState:        req.HomeState,
			Page:             page,
			PageSize:         pageSize,
		})
		if err != nil {
			return nil, fmt.Errorf("pool %s: %w", p.key, err)
		}
		*p.dst = res.Rows
		*p.mt = PoolMetaItem{
			ReturnedRows: res.TotalShown,
			Truncated:    res.Truncated,
			HasMore:      res.HasMore,
			Page:         page,
			PageSize:     pageSize,
		}
	}

	return out, nil
}

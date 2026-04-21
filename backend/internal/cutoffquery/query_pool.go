package cutoffquery

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
)

// DefaultCutoffTable is the live JoSAA snapshot table populated by the importer.
const DefaultCutoffTable = "cutoff_rows"
const maxRowsPerPool = 1000

// PoolQueryInput carries global filters plus one tab’s seat types and closing-rank OR clauses.
type PoolQueryInput struct {
	Table            string
	ExamType         string
	GenderDB         string
	Quotas           []string
	InstituteTypes   []string
	SeatTypes        []string
	ClosingRankBands []ClosingRankBand
	// HomeState is set for JEE Main when the client sent a domicile; it refines HS/OS/GO/JK/LA rows (ALGORITHM.md §5).
	HomeState *string
	Page      int
	PageSize  int
}

type PoolQueryOutput struct {
	Rows       []ResultRow
	Truncated  bool
	TotalShown int
	HasMore    bool
}

// QueryCutoffPool returns DISTINCT rows matching global filters, seat types for this tab,
// and any of the closing-rank bands (OR). Empty bands yields nil without querying.
func QueryCutoffPool(ctx context.Context, db *sql.DB, in PoolQueryInput) (PoolQueryOutput, error) {
	if len(in.ClosingRankBands) == 0 {
		return PoolQueryOutput{Rows: []ResultRow{}}, nil
	}
	if len(in.SeatTypes) == 0 {
		return PoolQueryOutput{}, fmt.Errorf("seat types required for pool query")
	}
	if len(in.Quotas) == 0 {
		return PoolQueryOutput{}, fmt.Errorf("quotas required")
	}
	if len(in.InstituteTypes) == 0 {
		// Defensive fallback: if caller passes no institute filters, answer is empty.
		// Normal HTTP flow validates this and returns 400 before service/query.
		return PoolQueryOutput{Rows: []ResultRow{}}, nil
	}

	closingParts, closingArgs := buildClosingRankOr(in.ClosingRankBands)
	if closingParts == "" {
		return PoolQueryOutput{Rows: []ResultRow{}}, nil
	}

	qIn := SQLIn(len(in.Quotas))
	iIn := SQLIn(len(in.InstituteTypes))
	sIn := SQLIn(len(in.SeatTypes))

	homeSQL, homeArgs := homeStateQuotaSQL(in.HomeState)
	page := in.Page
	if page < 1 {
		page = 1
	}
	pageSize := in.PageSize
	if pageSize < 1 {
		pageSize = maxRowsPerPool
	}
	offset := (page - 1) * pageSize

	query := fmt.Sprintf(`
SELECT DISTINCT exam_type, institute, department, institute_type, state, nirf, quota, gender, seat_type, opening_rank, closing_rank
FROM %s
WHERE exam_type = ?
  AND gender = ?
  AND quota IN (%s)
  AND institute_type IN (%s)
  AND seat_type IN (%s)
%s  AND (%s)
ORDER BY closing_rank ASC, institute ASC, department ASC
LIMIT ?
OFFSET ?
`, in.Table, qIn, iIn, sIn, homeSQL, closingParts)

	args := make([]any, 0, 2+len(in.Quotas)+len(in.InstituteTypes)+len(in.SeatTypes)+len(homeArgs)+len(closingArgs)+2)
	args = append(args, in.ExamType, in.GenderDB)
	for _, q := range in.Quotas {
		args = append(args, q)
	}
	for _, it := range in.InstituteTypes {
		args = append(args, it)
	}
	for _, st := range in.SeatTypes {
		args = append(args, st)
	}
	args = append(args, homeArgs...)
	args = append(args, closingArgs...)
	args = append(args, pageSize+1, offset)

	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return PoolQueryOutput{}, fmt.Errorf("query pool: %w", err)
	}
	defer rows.Close()

	var out []ResultRow
	for rows.Next() {
		var r ResultRow
		var nirf sql.NullString
		if err := rows.Scan(
			&r.ExamType,
			&r.Institute,
			&r.Department,
			&r.InstituteType,
			&r.State,
			&nirf,
			&r.Quota,
			&r.Gender,
			&r.SeatType,
			&r.OpeningRank,
			&r.ClosingRank,
		); err != nil {
			return PoolQueryOutput{}, fmt.Errorf("scan row: %w", err)
		}
		if nirf.Valid {
			s := nirf.String
			r.NIRF = &s
		}
		out = append(out, r)
	}
	if err := rows.Err(); err != nil {
		return PoolQueryOutput{}, err
	}
	truncated := false
	hasMore := false
	if len(out) > pageSize {
		out = out[:pageSize]
		truncated = pageSize >= maxRowsPerPool
		hasMore = true
	}
	if len(out) == 0 {
		return PoolQueryOutput{Rows: []ResultRow{}, Truncated: false, TotalShown: 0, HasMore: false}, nil
	}
	return PoolQueryOutput{Rows: out, Truncated: truncated, TotalShown: len(out), HasMore: hasMore}, nil
}

// homeStateQuotaSQL adds domicile-aware row filters when JEE Main sends homeState (ALGORITHM.md §5).
func homeStateQuotaSQL(h *string) (sql string, args []any) {
	if !HomeStatePresent(h) {
		return "", nil
	}
	hs := strings.TrimSpace(*h)
	const frag = `
  AND (quota != 'HS' OR state = ?)
  AND (quota != 'OS' OR state != ?)
  AND (quota != 'GO' OR ? = 'Goa')
  AND (quota != 'JK' OR ? = 'Jammu and Kashmir')
  AND (quota != 'LA' OR ? = 'Ladakh')
`
	return frag, []any{hs, hs, hs, hs, hs}
}

func buildClosingRankOr(bands []ClosingRankBand) (sqlExpr string, args []any) {
	var parts []string
	for _, b := range bands {
		var sub []string
		if b.ClosingRankMin != nil {
			sub = append(sub, "closing_rank >= ?")
			args = append(args, *b.ClosingRankMin)
		}
		if b.ClosingRankMax != nil {
			sub = append(sub, "closing_rank <= ?")
			args = append(args, *b.ClosingRankMax)
		}
		if len(sub) == 0 {
			continue
		}
		parts = append(parts, "("+strings.Join(sub, " AND ")+")")
	}
	if len(parts) == 0 {
		return "", nil
	}
	return strings.Join(parts, " OR "), args
}

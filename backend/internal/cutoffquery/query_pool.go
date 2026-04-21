package cutoffquery

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
)

// DefaultCutoffTable is the live JoSAA snapshot table populated by the importer.
const DefaultCutoffTable = "cutoff_rows"

// PoolQueryInput carries global filters plus one tab’s seat types and closing-rank OR clauses.
type PoolQueryInput struct {
	Table            string
	ExamType         string
	GenderDB         string
	Quotas           []string
	InstituteTypes   []string
	SeatTypes        []string
	ClosingRankBands []ClosingRankBand
}

// QueryCutoffPool returns DISTINCT rows matching global filters, seat types for this tab,
// and any of the closing-rank bands (OR). Empty bands yields nil without querying.
func QueryCutoffPool(ctx context.Context, db *sql.DB, in PoolQueryInput) ([]ResultRow, error) {
	if len(in.ClosingRankBands) == 0 {
		return nil, nil
	}
	if len(in.SeatTypes) == 0 {
		return nil, fmt.Errorf("seat types required for pool query")
	}
	if len(in.Quotas) == 0 || len(in.InstituteTypes) == 0 {
		return nil, fmt.Errorf("quotas and instituteTypes required")
	}

	closingParts, closingArgs := buildClosingRankOr(in.ClosingRankBands)
	if closingParts == "" {
		return nil, nil
	}

	qIn := SQLIn(len(in.Quotas))
	iIn := SQLIn(len(in.InstituteTypes))
	sIn := SQLIn(len(in.SeatTypes))

	query := fmt.Sprintf(`
SELECT DISTINCT exam_type, institute, department, institute_type, state, nirf, quota, gender, seat_type, opening_rank, closing_rank
FROM %s
WHERE exam_type = ?
  AND gender = ?
  AND quota IN (%s)
  AND institute_type IN (%s)
  AND seat_type IN (%s)
  AND (%s)
ORDER BY closing_rank ASC, institute ASC, department ASC
`, in.Table, qIn, iIn, sIn, closingParts)

	args := make([]any, 0, 2+len(in.Quotas)+len(in.InstituteTypes)+len(in.SeatTypes)+len(closingArgs))
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
	args = append(args, closingArgs...)

	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("query pool: %w", err)
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
			return nil, fmt.Errorf("scan row: %w", err)
		}
		if nirf.Valid {
			s := nirf.String
			r.NIRF = &s
		}
		out = append(out, r)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(out) == 0 {
		return []ResultRow{}, nil
	}
	return out, nil
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

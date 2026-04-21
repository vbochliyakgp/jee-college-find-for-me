package db

import (
	"context"
	"database/sql"
	"fmt"

	_ "modernc.org/sqlite"
)

func OpenInMemory(ctx context.Context) (*sql.DB, error) {
	database, err := sql.Open("sqlite", "file:cutoffs?mode=memory&cache=shared")
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}

	database.SetMaxOpenConns(1)

	if err := database.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("ping sqlite: %w", err)
	}

	if err := createSchema(ctx, database); err != nil {
		return nil, err
	}

	return database, nil
}

func createSchema(ctx context.Context, database *sql.DB) error {
	statements := baseTableStatements("cutoff_rows", "idx_cutoff")
	for round := 1; round <= 5; round++ {
		tableName := fmt.Sprintf("cutoff_rows_round_%d", round)
		indexPrefix := fmt.Sprintf("idx_cutoff_r%d", round)
		statements = append(statements, baseTableStatements(tableName, indexPrefix)...)
	}

	for _, stmt := range statements {
		if _, err := database.ExecContext(ctx, stmt); err != nil {
			return fmt.Errorf("exec schema statement: %w", err)
		}
	}

	return nil
}

func baseTableStatements(tableName string, indexPrefix string) []string {
	return []string{
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS %s (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			exam_type TEXT NOT NULL,
			institute TEXT NOT NULL,
			department TEXT NOT NULL,
			institute_type TEXT NOT NULL,
			state TEXT NOT NULL,
			nirf TEXT NULL,
			quota TEXT NOT NULL,
			gender TEXT NOT NULL,
			seat_type TEXT NOT NULL,
			opening_rank INTEGER NOT NULL,
			closing_rank INTEGER NOT NULL
		)`, tableName),
		fmt.Sprintf(`CREATE INDEX IF NOT EXISTS %s_exam_type ON %s (exam_type)`, indexPrefix, tableName),
		fmt.Sprintf(`CREATE INDEX IF NOT EXISTS %s_institute_type ON %s (institute_type)`, indexPrefix, tableName),
		fmt.Sprintf(`CREATE INDEX IF NOT EXISTS %s_quota_state ON %s (quota, state)`, indexPrefix, tableName),
		fmt.Sprintf(`CREATE INDEX IF NOT EXISTS %s_gender_seat_type ON %s (gender, seat_type)`, indexPrefix, tableName),
		fmt.Sprintf(`CREATE INDEX IF NOT EXISTS %s_closing_rank ON %s (closing_rank)`, indexPrefix, tableName),
		fmt.Sprintf(`CREATE INDEX IF NOT EXISTS %s_cutoff_lookup ON %s (exam_type, quota, state, gender, seat_type, closing_rank)`, indexPrefix, tableName),
	}
}

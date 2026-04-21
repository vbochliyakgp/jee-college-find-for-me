package cutoffquery

import "testing"

func TestToDBGenders(t *testing.T) {
	t.Run("neutral", func(t *testing.T) {
		got, err := ToDBGenders("neutral")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(got) != 1 || got[0] != "Neutral" {
			t.Fatalf("unexpected genders: %+v", got)
		}
	})

	t.Run("female includes neutral", func(t *testing.T) {
		got, err := ToDBGenders("female")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(got) != 2 {
			t.Fatalf("want 2 genders, got %+v", got)
		}
		if got[0] != "Female" || got[1] != "Neutral" {
			t.Fatalf("unexpected order/content: %+v", got)
		}
	})

	t.Run("unknown", func(t *testing.T) {
		if _, err := ToDBGenders("other"); err == nil {
			t.Fatal("expected error for unknown pool")
		}
	})
}

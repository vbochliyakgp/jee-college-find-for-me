package cutoffquery

import "testing"

func TestSeatTypesForTargetPool(t *testing.T) {
	t.Parallel()
	st, err := SeatTypesForTargetPool("open", "General")
	if err != nil || len(st) != 1 || st[0] != "OPEN" {
		t.Fatalf("open: %v %v", st, err)
	}
	st, err = SeatTypesForTargetPool("category", "OBC")
	if err != nil || st[0] != "OBC-NCL" {
		t.Fatalf("category OBC: %v %v", st, err)
	}
	_, err = SeatTypesForTargetPool("category", "General")
	if err == nil {
		t.Fatal("expected error for General category pool")
	}
	st, err = SeatTypesForTargetPool("category_pwd", "EWS")
	if err != nil || st[0] != "EWS (PwD)" {
		t.Fatalf("ews pwd: %v %v", st, err)
	}
}

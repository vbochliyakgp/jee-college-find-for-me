package importer

import "testing"

func TestInferState_NITSurathkalNotGujarat(t *testing.T) {
	const name = "National Institute of Technology Karnataka, Surathkal"
	got := inferState(name)
	if got != "Karnataka" {
		t.Fatalf("inferState(%q) = %q, want Karnataka", name, got)
	}
}

func TestInferState_NITSuratGujarat(t *testing.T) {
	const name = "Sardar Vallabhbhai National Institute of Technology, Surat"
	got := inferState(name)
	if got != "Gujarat" {
		t.Fatalf("inferState(%q) = %q, want Gujarat", name, got)
	}
}

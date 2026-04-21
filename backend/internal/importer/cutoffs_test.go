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

func TestIsExcludedProgram(t *testing.T) {
	tests := []struct {
		name    string
		program string
		want    bool
	}{
		{name: "b arch short", program: "Architecture (5 Years, B.Arch)", want: true},
		{name: "bachelor architecture", program: "Architecture (5 Years, Bachelor of Architecture)", want: true},
		{name: "b planning short", program: "Planning (4 Years, B.Planning)", want: true},
		{name: "bachelor planning", program: "Planning (4 Years, Bachelor of Planning)", want: true},
		{name: "regular btech", program: "Computer Science and Engineering (4 Years, Bachelor of Technology)", want: false},
	}
	for _, tc := range tests {
		got := isExcludedProgram(tc.program)
		if got != tc.want {
			t.Fatalf("%s: isExcludedProgram(%q) = %v, want %v", tc.name, tc.program, got, tc.want)
		}
	}
}

func TestIsPreparatoryRank(t *testing.T) {
	tests := []struct {
		rank string
		want bool
	}{
		{rank: "50P", want: true},
		{rank: " 14p ", want: true},
		{rank: "123", want: false},
		{rank: "", want: false},
	}
	for _, tc := range tests {
		got := isPreparatoryRank(tc.rank)
		if got != tc.want {
			t.Fatalf("isPreparatoryRank(%q) = %v, want %v", tc.rank, got, tc.want)
		}
	}
}

func TestNormalizeRecord_ExcludedRowsAreSkipped(t *testing.T) {
	valid := []string{
		"6",
		"2025-26",
		"Indian Institute of Technology Bombay",
		"Computer Science and Engineering (4 Years, Bachelor of Technology)",
		"AI",
		"OPEN",
		"Gender-Neutral",
		"1",
		"60",
	}
	if _, ok := normalizeRecord(valid); !ok {
		t.Fatal("expected valid non-excluded record to be accepted")
	}

	excludedProgram := append([]string(nil), valid...)
	excludedProgram[3] = "Architecture (5 Years, Bachelor of Architecture)"
	if _, ok := normalizeRecord(excludedProgram); ok {
		t.Fatal("expected B.Arch program record to be skipped")
	}

	prepRank := append([]string(nil), valid...)
	prepRank[7] = "50P"
	if _, ok := normalizeRecord(prepRank); ok {
		t.Fatal("expected preparatory rank record to be skipped")
	}
}

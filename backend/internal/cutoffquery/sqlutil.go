package cutoffquery

import "strings"

// SQLIn expands to "?,?,?" for n placeholders.
func SQLIn(n int) string {
	if n <= 0 {
		return ""
	}
	b := make([]string, n)
	for i := range b {
		b[i] = "?"
	}
	return strings.Join(b, ",")
}

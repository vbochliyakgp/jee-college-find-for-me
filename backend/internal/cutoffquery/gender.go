package cutoffquery

import "fmt"

// ToDBGender maps API genderPool to values stored in cutoff_rows.gender.
func ToDBGender(genderPool string) (string, error) {
	switch genderPool {
	case "neutral":
		return "Neutral", nil
	case "female":
		return "Female", nil
	default:
		return "", fmt.Errorf("unknown genderPool %q", genderPool)
	}
}

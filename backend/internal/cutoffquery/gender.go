package cutoffquery

import "fmt"

// ToDBGenders maps API genderPool to values stored in cutoff_rows.gender.
func ToDBGenders(genderPool string) ([]string, error) {
	switch genderPool {
	case "neutral":
		return []string{"Neutral"}, nil
	case "female":
		// Female candidates are eligible for both female and gender-neutral seats.
		return []string{"Female", "Neutral"}, nil
	default:
		return nil, fmt.Errorf("unknown genderPool %q", genderPool)
	}
}

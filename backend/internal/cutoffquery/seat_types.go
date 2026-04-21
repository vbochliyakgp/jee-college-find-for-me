package cutoffquery

import "fmt"

// SeatTypesForTargetPool returns JoSAA seat_type strings for one logical result tab.
func SeatTypesForTargetPool(targetPool, category string) ([]string, error) {
	switch targetPool {
	case "open":
		return []string{"OPEN"}, nil
	case "category":
		return categorySeatTypes(category, false)
	case "open_pwd":
		return []string{"OPEN (PwD)"}, nil
	case "category_pwd":
		return categorySeatTypes(category, true)
	default:
		return nil, fmt.Errorf("unknown targetPool %q", targetPool)
	}
}

func categorySeatTypes(category string, pwd bool) ([]string, error) {
	if category == "General" {
		return nil, fmt.Errorf("category pool requires non-General category")
	}
	if pwd {
		switch category {
		case "OBC":
			return []string{"OBC-NCL (PwD)"}, nil
		case "SC":
			return []string{"SC (PwD)"}, nil
		case "ST":
			return []string{"ST (PwD)"}, nil
		case "EWS":
			return []string{"EWS (PwD)"}, nil
		default:
			return nil, fmt.Errorf("unsupported category %q", category)
		}
	}
	switch category {
	case "OBC":
		return []string{"OBC-NCL"}, nil
	case "SC":
		return []string{"SC"}, nil
	case "ST":
		return []string{"ST"}, nil
	case "EWS":
		return []string{"EWS"}, nil
	default:
		return nil, fmt.Errorf("unsupported category %q", category)
	}
}

package importer

import (
	"context"
	"database/sql"
	"encoding/csv"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"

	"jee-college-find-for-me/complete-stack/backend/internal/models"
)

// cityMatchOrder is cityToState keys sorted by descending length so shorter keys
// (e.g. "Surat") cannot match inside longer institute tokens ("Surathkal").
var cityMatchOrder []string

func init() {
	for city := range cityToState {
		cityMatchOrder = append(cityMatchOrder, city)
	}
	sort.Slice(cityMatchOrder, func(i, j int) bool {
		li, lj := len(cityMatchOrder[i]), len(cityMatchOrder[j])
		if li != lj {
			return li > lj
		}
		return cityMatchOrder[i] < cityMatchOrder[j]
	})
}

type LoadStats struct {
	Files int `json:"files"`
	Rows  int `json:"rows"`
}

type CounselingType string

const (
	CounselingJOSAA CounselingType = "josaa"
	CounselingCSAB  CounselingType = "csab"
)

type CSVLoader struct {
	Directory      string
	CounselingType CounselingType
}

func (l CSVLoader) Load(ctx context.Context, database *sql.DB) (*LoadStats, error) {
	pattern := filepath.Join(l.Directory, "round-*-cutoffs.csv")
	paths, err := filepath.Glob(pattern)
	if err != nil {
		return nil, fmt.Errorf("glob cutoff csvs: %w", err)
	}
	if len(paths) == 0 {
		return nil, fmt.Errorf("no cutoff csvs found in %s", l.Directory)
	}

	sort.Strings(paths)
	pathsByRound, latestRound := groupPathsByRound(paths)
	if latestRound == -1 || len(pathsByRound) == 0 {
		return nil, fmt.Errorf("no round CSVs available after filtering")
	}

	tx, err := database.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("begin import transaction: %w", err)
	}
	defer tx.Rollback()

	tablePrefix := "cutoff_rows"
	maxRounds := 5
	if l.CounselingType == CounselingCSAB {
		tablePrefix = "csab_cutoff_rows"
		maxRounds = 3
	}

	for round := 1; round <= maxRounds; round++ {
		if _, err := tx.ExecContext(ctx, fmt.Sprintf(`DELETE FROM %s_round_%d`, tablePrefix, round)); err != nil {
			return nil, fmt.Errorf("clear %s_round_%d: %w", tablePrefix, round, err)
		}
	}
	if _, err := tx.ExecContext(ctx, fmt.Sprintf(`DELETE FROM %s`, tablePrefix)); err != nil {
		return nil, fmt.Errorf("clear %s: %w", tablePrefix, err)
	}

	stats := &LoadStats{}
	for round, roundPaths := range pathsByRound {
		tableName := tablePrefix
		if round != latestRound {
			tableName = fmt.Sprintf("%s_round_%d", tablePrefix, round)
		}

		stmt, err := prepareInsertStatement(ctx, tx, tableName)
		if err != nil {
			return nil, err
		}

		for _, path := range roundPaths {
			inserted, err := loadFile(ctx, stmt, path)
			if err != nil {
				_ = stmt.Close()
				return nil, err
			}
			stats.Rows += inserted
			stats.Files++
		}
		_ = stmt.Close()
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit import transaction: %w", err)
	}

	return stats, nil
}

var roundPattern = regexp.MustCompile(`round-(\d+)-cutoffs\.csv$`)

func groupPathsByRound(paths []string) (map[int][]string, int) {
	maxRound := -1
	byRound := make(map[int][]string)

	for _, path := range paths {
		name := filepath.Base(path)
		matches := roundPattern.FindStringSubmatch(name)
		if len(matches) != 2 {
			continue
		}

		round, err := strconv.Atoi(matches[1])
		if err != nil {
			continue
		}

		byRound[round] = append(byRound[round], path)
		if round > maxRound {
			maxRound = round
		}
	}

	if maxRound == -1 {
		return nil, -1
	}
	for round := range byRound {
		sort.Strings(byRound[round])
	}
	return byRound, maxRound
}

func prepareInsertStatement(ctx context.Context, tx *sql.Tx, tableName string) (*sql.Stmt, error) {
	stmt, err := tx.PrepareContext(ctx, fmt.Sprintf(`
		INSERT INTO %s (
			exam_type, institute, department, institute_type, state, nirf,
			quota, gender, seat_type, opening_rank, closing_rank
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, tableName))
	if err != nil {
		return nil, fmt.Errorf("prepare insert statement for %s: %w", tableName, err)
	}
	return stmt, nil
}

func loadFile(ctx context.Context, stmt *sql.Stmt, path string) (int, error) {
	file, err := os.Open(path)
	if err != nil {
		return 0, fmt.Errorf("open csv %s: %w", path, err)
	}
	defer file.Close()

	reader := csv.NewReader(file)
	reader.FieldsPerRecord = -1

	if _, err := reader.Read(); err != nil {
		return 0, fmt.Errorf("read header %s: %w", path, err)
	}

	rows := 0
	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return 0, fmt.Errorf("read csv record %s: %w", path, err)
		}
		if len(record) < 9 {
			continue
		}

		row, ok := normalizeRecord(record)
		if !ok {
			continue
		}

		if _, err := stmt.ExecContext(
			ctx,
			row.ExamType,
			row.Institute,
			row.Department,
			row.InstituteType,
			row.State,
			row.NIRF,
			row.Quota,
			row.Gender,
			row.SeatType,
			row.OpeningRank,
			row.ClosingRank,
		); err != nil {
			return 0, fmt.Errorf("insert row from %s: %w", path, err)
		}

		rows++
	}

	return rows, nil
}

func normalizeRecord(record []string) (models.CutoffRow, bool) {
	rawInstitute := strings.TrimSpace(record[2])
	rawDepartment := strings.TrimSpace(record[3])
	quota := strings.TrimSpace(record[4])
	seatType := strings.TrimSpace(record[5])
	gender := strings.TrimSpace(record[6])
	openStr := strings.TrimSpace(record[7])
	closeStr := strings.TrimSpace(record[8])

	if isExcludedProgram(rawDepartment) {
		return models.CutoffRow{}, false
	}
	if isPreparatoryRank(openStr) || isPreparatoryRank(closeStr) {
		return models.CutoffRow{}, false
	}

	openingRank, err := strconv.Atoi(openStr)
	if err != nil {
		return models.CutoffRow{}, false
	}
	closingRank, err := strconv.Atoi(closeStr)
	if err != nil {
		return models.CutoffRow{}, false
	}

	examType := models.ExamTypeJEEMain
	if instituteType(rawInstitute) == "IIT" {
		examType = models.ExamTypeJEEAdvanced
	}
	institute := shortInstituteName(rawInstitute)
	department := shortProgramName(rawDepartment)

	return models.CutoffRow{
		ExamType:      string(examType),
		Institute:     institute,
		Department:    department,
		InstituteType: instituteType(rawInstitute),
		State:         inferState(rawInstitute),
		NIRF:          nil,
		Quota:         normalizeQuota(quota),
		Gender:        normalizeGender(gender),
		SeatType:      seatType,
		OpeningRank:   openingRank,
		ClosingRank:   closingRank,
	}, true
}

func isExcludedProgram(program string) bool {
	p := strings.ToLower(strings.TrimSpace(program))
	return strings.Contains(p, "b.arch") ||
		strings.Contains(p, "b. arch") ||
		strings.Contains(p, "bachelor of architecture") ||
		strings.Contains(p, "b.planning") ||
		strings.Contains(p, "b. planning") ||
		strings.Contains(p, "bachelor of planning")
}

func isPreparatoryRank(rank string) bool {
	r := strings.ToUpper(strings.TrimSpace(rank))
	return strings.HasSuffix(r, "P")
}

func instituteType(name string) string {
	switch {
	case strings.Contains(name, "Indian Institute of Information Technology"):
		return "IIIT"
	case strings.Contains(name, "Indian Institute of Technology"):
		return "IIT"
	case strings.Contains(name, "National Institute of Technology"):
		return "NIT"
	default:
		return "GFTI"
	}
}

var instituteShortReplacer = strings.NewReplacer(
	"Indian Institute of Information Technology", "IIIT",
	"Indian Institute of Technology", "IIT",
	"National Institute of Technology", "NIT",
)

func shortInstituteName(name string) string {
	return strings.TrimSpace(instituteShortReplacer.Replace(name))
}

var programShortReplacer = strings.NewReplacer(
	"Bachelor of Technology", "BTech",
	"Bachelor of Engineering", "BE",
	"Bachelor of Science", "BSc",
	"Master of Technology", "MTech",
	"Master of Science", "MSc",
)

func shortProgramName(name string) string {
	return strings.TrimSpace(programShortReplacer.Replace(name))
}

func normalizeGender(value string) string {
	if strings.HasPrefix(value, "Female") {
		return string(models.GenderFemale)
	}
	return string(models.GenderNeutral)
}

// normalizeQuota keeps the raw JoSAA quota bucket used by cutoff import and query filters.
//
// Supported core and regional buckets:
//   - "AI", "HS", "OS"
//   - "GO", "JK", "LA" (regional quotas that should not be collapsed into OS)
func normalizeQuota(value string) string {
	switch value {
	case "HS", "Home State":
		return "HS"
	case "AI", "All India":
		return "AI"
	case "OS", "Other State":
		return "OS"
	case "GO", "JK", "LA":
		return value
	default:
		return "OS"
	}
}

func inferState(institute string) string {
	if state, ok := instituteToState[institute]; ok {
		return state
	}

	if nitMatch := nitPattern(institute); nitMatch != "" {
		if state, ok := cityToState[nitMatch]; ok {
			return state
		}
	}

	if iitMatch := iitPattern(institute); iitMatch != "" {
		if state, ok := iitCampusToState[iitMatch]; ok {
			return state
		}
	}

	for _, city := range cityMatchOrder {
		if strings.Contains(institute, city) {
			return cityToState[city]
		}
	}

	return "India"
}

// nitPattern extracts the location token from an NIT name, e.g.
//
//	"National Institute of Technology, Durgapur"            → "Durgapur"
//	"Dr. B R Ambedkar National Institute of Technology, Jalandhar" → "Jalandhar"
//	"Motilal Nehru National Institute of Technology Allahabad"     → "Allahabad"
//
// The old code used strings.TrimPrefix which only strips the substring when the
// string starts with it, so any NIT with a personal-name prefix (Dr. B R Ambedkar,
// Motilal Nehru, Sardar Vallabhbhai, Visvesvaraya…) silently returned the full
// institute name, preventing state lookup.
func nitPattern(institute string) string {
	const prefix = "National Institute of Technology"
	idx := strings.Index(institute, prefix)
	if idx == -1 {
		return ""
	}
	suffix := strings.TrimSpace(institute[idx+len(prefix):])
	suffix = strings.TrimPrefix(suffix, ",")
	return strings.TrimSpace(suffix)
}

func iitPattern(institute string) string {
	prefix := "Indian Institute of Technology"
	if !strings.Contains(institute, prefix) {
		return ""
	}
	suffix := strings.TrimSpace(strings.TrimPrefix(institute, prefix))
	suffix = strings.TrimSpace(strings.TrimPrefix(suffix, "("))
	suffix = strings.TrimSpace(strings.TrimPrefix(suffix, ")"))
	return firstField(suffix)
}

func firstField(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	return strings.Fields(value)[0]
}

var cityToState = map[string]string{
	"Durgapur":   "West Bengal",
	"Jamshedpur": "Jharkhand",
	"Allahabad":  "Uttar Pradesh",
	// nitPattern for NIT Surathkal is "Karnataka, Surathkal" — match before generic Contains.
	"Karnataka, Surathkal": "Karnataka",
	"Surat":      "Gujarat",
	"Jalandhar":         "Punjab",
	"Warangal":          "Telangana",
	"Trichy":            "Tamil Nadu",
	"Tiruchirappalli":   "Tamil Nadu",
	"Surathkal":         "Karnataka",
	"Calicut":           "Kerala",
	"Hamirpur":          "Himachal Pradesh",
	"Jaipur":            "Rajasthan",
	"Kurukshetra":       "Haryana",
	"Silchar":           "Assam",
	"Patna":             "Bihar",
	"Raipur":            "Chhattisgarh",
	"Rourkela":          "Odisha",
	"Agartala":          "Tripura",
	"Goa":               "Goa",
	"Srinagar":          "Jammu and Kashmir",
	"Delhi":             "Delhi",
	"New Delhi":         "Delhi",
	"Bhopal":            "Madhya Pradesh",
	"Nagpur":            "Maharashtra",
	"Puducherry":        "Puducherry",
	"Andhra Pradesh":    "Andhra Pradesh",
	"Arunachal Pradesh": "Arunachal Pradesh",
	"Sikkim":            "Sikkim",
	"Uttarakhand":       "Uttarakhand",
	"Manipur":           "Manipur",
	"Mizoram":           "Mizoram",
	"Meghalaya":         "Meghalaya",
	"Nagaland":          "Nagaland",
	"Gwalior":           "Madhya Pradesh",
	"Ranchi":            "Jharkhand",
	"Kokrajar":          "Assam",
	"Vadodara":          "Gujarat",
	"Malda":             "West Bengal",
	"Haridwar":          "Uttarakhand",
	"Bhadohi":           "Uttar Pradesh",
	"Shibpur":           "West Bengal",
	"Salem":             "Tamil Nadu",
	"Pune":              "Maharashtra",
	"Chittoor":          "Andhra Pradesh",
	"Kota":              "Rajasthan",
	"Bhagalpur":         "Bihar",
	"Lucknow":           "Uttar Pradesh",
	"Dharwad":           "Karnataka",
	"Kalyani":           "West Bengal",
	"Sonepat":           "Haryana",
	"Kottayam":          "Kerala",
	"Una":               "Himachal Pradesh",
	"Kancheepuram":      "Tamil Nadu",
	"Diu":               "Dadra and Nagar Haveli and Daman and Diu",
	"Raichur":           "Karnataka",
	"Sagar":             "Madhya Pradesh",
	"Ahmedabad":         "Gujarat",
	"Gandhinagar":       "Gujarat",
	"Kashmir":           "Jammu and Kashmir",
	"Ajmer":             "Rajasthan",
	"Aurangabad":        "Maharashtra",
	"Greater Noida":     "Uttar Pradesh",
	"Gorakhpur":         "Uttar Pradesh",
	"Kundli":            "Haryana",
	"Thanjavur":         "Tamil Nadu",
	"Shillong":          "Meghalaya",
	"Jabalpur":          "Madhya Pradesh",
	"Chandigarh":        "Chandigarh",
	"Amethi":            "Uttar Pradesh",
	"Longowal":          "Punjab",
	"Tezpur":            "Assam",
	"Vijayawada":        "Andhra Pradesh",
	"Visakhapatnam":     "Andhra Pradesh",
	"Bilaspur":          "Chhattisgarh",
	"Manipal":           "Karnataka",
}

var iitCampusToState = map[string]string{
	"Bombay":      "Maharashtra",
	"Delhi":       "Delhi",
	"Madras":      "Tamil Nadu",
	"Kanpur":      "Uttar Pradesh",
	"Kharagpur":   "West Bengal",
	"Roorkee":     "Uttarakhand",
	"Guwahati":    "Assam",
	"Hyderabad":   "Telangana",
	"Mandi":       "Himachal Pradesh",
	"Patna":       "Bihar",
	"Bhubaneswar": "Odisha",
	"Gandhinagar": "Gujarat",
	"Jodhpur":     "Rajasthan",
	"Ropar":       "Punjab",
	"Indore":      "Madhya Pradesh",
	"Varanasi":    "Uttar Pradesh",
	"Palakkad":    "Kerala",
	"Tirupati":    "Andhra Pradesh",
	"Dhanbad":     "Jharkhand",
	"Bhilai":      "Chhattisgarh",
	"Goa":         "Goa",
	"Jammu":       "Jammu and Kashmir",
	"Dharwad":     "Karnataka",
}

var instituteToState = map[string]string{
	"Atal Bihari Vajpayee Indian Institute of Information Technology & Management Gwalior":                  "Madhya Pradesh",
	"Birla Institute of Technology, Deoghar Off-Campus":                                                      "Jharkhand",
	"Birla Institute of Technology, Mesra, Ranchi":                                                           "Jharkhand",
	"CU Jharkhand":                                                                                            "Jharkhand",
	"Central University of Haryana":                                                                          "Haryana",
	"Central University of Jammu":                                                                            "Jammu and Kashmir",
	"Central University of Rajasthan, Rajasthan":                                                             "Rajasthan",
	"Central institute of Technology Kokrajar, Assam":                                                       "Assam",
	"Chhattisgarh Swami Vivekanada Technical University, Bhilai (CSVTU Bhilai)":                             "Chhattisgarh",
	"Gati Shakti Vishwavidyalaya, Vadodara":                                                                  "Gujarat",
	"Ghani Khan Choudhary Institute of Engineering and Technology, Malda, West Bengal":                      "West Bengal",
	"Gurukula Kangri Vishwavidyalaya, Haridwar":                                                              "Uttarakhand",
	"INDIAN INSTITUTE OF INFORMATION TECHNOLOGY SENAPATI MANIPUR":                                            "Manipur",
	"Indian Institute of Carpet Technology, Bhadohi":                                                         "Uttar Pradesh",
	"Indian Institute of Engineering Science and Technology, Shibpur":                                        "West Bengal",
	"Indian Institute of Handloom Technology(IIHT), Varanasi":                                                "Uttar Pradesh",
	"Indian Institute of Handloom Technology, Salem":                                                         "Tamil Nadu",
	"Indian Institute of Information Technology (IIIT) Pune":                                                 "Maharashtra",
	"Indian Institute of Information Technology (IIIT) Ranchi":                                               "Jharkhand",
	"Indian Institute of Information Technology (IIIT), Sri City, Chittoor":                                 "Andhra Pradesh",
	"Indian Institute of Information Technology (IIIT)Kota, Rajasthan":                                       "Rajasthan",
	"Indian Institute of Information Technology Bhagalpur":                                                   "Bihar",
	"Indian Institute of Information Technology Guwahati":                                                    "Assam",
	"Indian Institute of Information Technology Lucknow":                                                     "Uttar Pradesh",
	"Indian Institute of Information Technology(IIIT) Dharwad":                                               "Karnataka",
	"Indian Institute of Information Technology(IIIT) Kalyani, West Bengal":                                 "West Bengal",
	"Indian Institute of Information Technology(IIIT) Kilohrad, Sonepat, Haryana":                           "Haryana",
	"Indian Institute of Information Technology(IIIT) Kottayam":                                              "Kerala",
	"Indian Institute of Information Technology(IIIT) Una, Himachal Pradesh":                                "Himachal Pradesh",
	"Indian Institute of Information Technology(IIIT), Vadodara, Gujrat":                                     "Gujarat",
	"Indian Institute of Information Technology, Design & Manufacturing, Kancheepuram":                       "Tamil Nadu",
	"Indian Institute of Information Technology, Vadodara International Campus Diu (IIITVICD)":              "Dadra and Nagar Haveli and Daman and Diu",
	"Indian Institute of Technology (BHU) Varanasi":                                                          "Uttar Pradesh",
	"Indian Institute of Technology (ISM) Dhanbad":                                                           "Jharkhand",
	"Indian Institute of Technology Dharwad":                                                                 "Karnataka",
	"Indian institute of information technology, Raichur, Karnataka":                                         "Karnataka",
	"Institute of Chemical Technology, Mumbai: Indian Oil Odisha Campus, Bhubaneswar":                       "Odisha",
	"Institute of Engineering and Technology, Dr. H. S. Gour University. Sagar (A Central University)":      "Madhya Pradesh",
	"Institute of Infrastructure, Technology, Research and Management-Ahmedabad":                             "Gujarat",
	"International Institute of Information Technology, Bhubaneswar":                                         "Odisha",
	"Islamic University of Science and Technology Kashmir":                                                    "Jammu and Kashmir",
	"National Institute of Advanced Manufacturing Technology, Ranchi":                                        "Jharkhand",
	"National Institute of Electronics and Information Technology, Ajmer (Rajasthan)":                        "Rajasthan",
	"National Institute of Electronics and Information Technology, Aurangabad (Maharashtra)":                 "Maharashtra",
	"National Institute of Electronics and Information Technology, Gorakhpur (UP)":                           "Uttar Pradesh",
	"National Institute of Electronics and Information Technology, Ropar (Punjab)":                           "Punjab",
	"National Institute of Food Technology Entrepreneurship and Management, Kundli":                          "Haryana",
	"National Institute of Food Technology Entrepreneurship and Management, Thanjavur":                       "Tamil Nadu",
	"National Institute of Technology Nagaland":                                                              "Nagaland",
	"North-Eastern Hill University, Shillong":                                                                "Meghalaya",
	"Pt. Dwarka Prasad Mishra Indian Institute of Information Technology, Design & Manufacture Jabalpur":    "Madhya Pradesh",
	"Punjab Engineering College, Chandigarh":                                                                 "Chandigarh",
	"Rajiv Gandhi National Aviation University, Fursatganj, Amethi (UP)":                                    "Uttar Pradesh",
	"Sant Longowal Institute of Engineering and Technology":                                                  "Punjab",
	"School of Engineering, Tezpur University, Napaam, Tezpur":                                               "Assam",
	"School of Planning & Architecture: Vijayawada":                                                          "Andhra Pradesh",
	"School of Studies of Engineering and Technology, Guru Ghasidas Vishwavidyalaya, Bilaspur":             "Chhattisgarh",
	"Shri G. S. Institute of Technology and Science Indore":                                                  "Madhya Pradesh",
	"Shri Mata Vaishno Devi University, Katra, Jammu & Kashmir":                                              "Jammu and Kashmir",
	"University of Hyderabad":                                                                                "Telangana",
}

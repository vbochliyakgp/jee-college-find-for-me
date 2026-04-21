package httpapi

import (
	"context"
	"database/sql"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"time"

	"jee-college-find-for-me/complete-stack/backend/internal/cutoffquery"
)

type Handler struct {
	svc *cutoffquery.Service
}

func NewHandler(db *sql.DB) *Handler {
	return &Handler{svc: cutoffquery.NewService(db)}
}

const maxCutoffQueryBodyBytes int64 = 64 << 10 // 64 KiB

func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("/health", h.handleHealth)
	mux.HandleFunc("/api/cutoffs/query", h.handleCutoffsQuery)
}

func (h *Handler) handleHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) handleCutoffsQuery(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var req cutoffquery.Request
	r.Body = http.MaxBytesReader(w, r.Body, maxCutoffQueryBodyBytes)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json body")
		return
	}
	if err := dec.Decode(&struct{}{}); err != io.EOF {
		writeError(w, http.StatusBadRequest, "invalid json body")
		return
	}

	if details := cutoffquery.Validate(req); len(details) > 0 {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"error":   "validation failed",
			"details": details,
		})
		return
	}

	ctx := r.Context()
	resp, err := h.queryWithTimeout(ctx, req)
	if err != nil {
		log.Printf("cutoffs query: %v", err)
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) queryWithTimeout(ctx context.Context, req cutoffquery.Request) (*cutoffquery.QueryResponse, error) {
	ctx, cancel := context.WithTimeout(ctx, defaultQueryTimeout)
	defer cancel()
	return h.svc.QueryPools(ctx, req)
}

const defaultQueryTimeout = 15 * time.Second

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		log.Printf("write json: %v", err)
	}
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

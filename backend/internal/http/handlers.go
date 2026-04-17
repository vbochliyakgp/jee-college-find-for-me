package httpapi

import (
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"

	"jee-college-find-for-me/complete-stack/backend/internal/models"
	"jee-college-find-for-me/complete-stack/backend/internal/predict"
)

type Handler struct {
	service *predict.Service
}

const maxPredictBodyBytes int64 = 64 << 10 // 64 KiB

func NewHandler(service *predict.Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("/health", h.handleHealth)
	mux.HandleFunc("/api/meta/filters", h.handleFilters)
	mux.HandleFunc("/api/predict", h.handlePredict)
}

func (h *Handler) handleHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) handleFilters(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	response, err := h.service.Filters(r.Context())
	if err != nil {
		log.Printf("filters failed: %v", err)
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	writeJSON(w, http.StatusOK, response)
}

func (h *Handler) handlePredict(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var req models.PredictRequest
	r.Body = http.MaxBytesReader(w, r.Body, maxPredictBodyBytes)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json body")
		return
	}
	if err := decoder.Decode(&struct{}{}); err != io.EOF {
		writeError(w, http.StatusBadRequest, "invalid json body")
		return
	}

	response, err := h.service.Predict(r.Context(), req)
	if err != nil {
		status := http.StatusInternalServerError
		if isValidationError(err) {
			status = http.StatusBadRequest
		}
		if status >= 500 {
			log.Printf("predict failed: %v", err)
			writeError(w, status, "internal server error")
			return
		}
		writeError(w, status, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, response)
}

func isValidationError(err error) bool {
	var validationErr *predict.ValidationError
	return errors.As(err, &validationErr)
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

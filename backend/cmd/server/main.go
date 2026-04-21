package main

import (
	"context"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"jee-college-find-for-me/complete-stack/backend/internal/db"
	httpapi "jee-college-find-for-me/complete-stack/backend/internal/http"
	"jee-college-find-for-me/complete-stack/backend/internal/importer"
)

func main() {
	ctx := context.Background()

	database, err := db.OpenInMemory(ctx)
	if err != nil {
		log.Fatalf("database init failed: %v", err)
	}
	defer database.Close()

	csvDir := envOrDefault("CUTOFFS_CSV_DIR", defaultCSVDir())
	loader := importer.CSVLoader{Directory: csvDir}
	stats, err := loader.Load(ctx, database)
	if err != nil {
		log.Fatalf("csv import failed: %v", err)
	}

	handler := httpapi.NewHandler(database)

	mux := http.NewServeMux()
	handler.Register(mux)

	server := &http.Server{
		Addr:              listenAddr(),
		Handler:           withCORS(mux),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      20 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    1 << 20, // 1 MiB
	}

	log.Printf("loaded %d rows from %d files", stats.Rows, stats.Files)
	log.Printf("backend listening on %s", server.Addr)

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server exited with error: %v", err)
	}
}

func envOrDefault(key string, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

// listenAddr returns the address to bind to.
// Accepts PORT as either "8080" or ":8080" — cloud platforms typically set it
// without the leading colon, which http.Server would reject.
func listenAddr() string {
	port := strings.TrimSpace(os.Getenv("PORT"))
	if port == "" {
		return ":8080"
	}
	if !strings.HasPrefix(port, ":") {
		return ":" + port
	}
	return port
}

func defaultCSVDir() string {
	candidates := []string{
		filepath.Clean("data-processing/data/cutoffs"),
		filepath.Clean("../data-processing/data/cutoffs"),
	}

	for _, candidate := range candidates {
		if info, err := os.Stat(candidate); err == nil && info.IsDir() {
			return candidate
		}
	}

	return candidates[0]
}

func withCORS(next http.Handler) http.Handler {
	allowedOrigins := buildAllowedOrigins()

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := strings.TrimSpace(r.Header.Get("Origin"))
		if _, ok := allowedOrigins[origin]; ok {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		}
		w.Header().Add("Vary", "Origin")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func buildAllowedOrigins() map[string]struct{} {
	allowed := map[string]struct{}{
		"http://localhost:3000":  {},
		"http://127.0.0.1:3000":  {},
		"https://localhost:3000": {},
		"https://127.0.0.1:3000": {},
	}

	rawDomain := strings.TrimSpace(os.Getenv("API_DOMAIN"))
	if rawDomain == "" {
		return allowed
	}

	// Accept either a bare domain (api.example.com) or full URL.
	if parsed, err := url.Parse(rawDomain); err == nil && parsed.Scheme != "" && parsed.Host != "" {
		allowed[parsed.Scheme+"://"+parsed.Host] = struct{}{}
		return allowed
	}

	domain := strings.TrimPrefix(rawDomain, "http://")
	domain = strings.TrimPrefix(domain, "https://")
	domain = strings.TrimSuffix(domain, "/")
	if domain == "" {
		return allowed
	}

	// Production origin should be HTTPS. Keep HTTP only for local development.
	allowed["https://"+domain] = struct{}{}
	if domain == "localhost" || strings.HasPrefix(domain, "127.0.0.1") {
		allowed["http://"+domain] = struct{}{}
	}
	return allowed
}

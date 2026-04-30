package main

import (
	"context"
	"encoding/json"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
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
	josaaLoader := importer.CSVLoader{
		Directory:      csvDir,
		CounselingType: importer.CounselingJOSAA,
	}
	josaaStats, err := josaaLoader.Load(ctx, database)
	if err != nil {
		log.Fatalf("josaa csv import failed: %v", err)
	}

	csabDir := envOrDefault("CSAB_CSV_DIR", defaultCSABDir())
	csabLoader := importer.CSVLoader{
		Directory:      csabDir,
		CounselingType: importer.CounselingCSAB,
	}
	csabStats, err := csabLoader.Load(ctx, database)
	if err != nil {
		// Log error but don't fail if CSAB data is missing (it might be optional in some envs)
		log.Printf("csab csv import failed (skipping): %v", err)
	} else {
		log.Printf("loaded %d CSAB rows from %d files", csabStats.Rows, csabStats.Files)
	}

	handler := httpapi.NewHandler(database)

	mux := http.NewServeMux()
	handler.Register(mux)

	server := &http.Server{
		Addr:              listenAddr(),
		Handler:           withCORS(withRateLimit(mux)),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      20 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    1 << 20, // 1 MiB
	}

	log.Printf("loaded %d JOSAA rows from %d files", josaaStats.Rows, josaaStats.Files)
	log.Printf("backend listening on %s", server.Addr)

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server exited with error: %v", err)
	}
}

const (
	apiLimitPerMinute = 100
	apiWindow         = time.Minute
)

type rateWindow struct {
	count   int
	expires time.Time
}

type fixedWindowLimiter struct {
	mu      sync.Mutex
	windows map[string]rateWindow
}

func newFixedWindowLimiter() *fixedWindowLimiter {
	return &fixedWindowLimiter{
		windows: make(map[string]rateWindow),
	}
}

func (l *fixedWindowLimiter) allow(key string, now time.Time) (allowed bool, retryAfterSec int) {
	l.mu.Lock()
	defer l.mu.Unlock()

	w, ok := l.windows[key]
	if !ok || now.After(w.expires) {
		l.windows[key] = rateWindow{count: 1, expires: now.Add(apiWindow)}
		return true, 0
	}
	if w.count >= apiLimitPerMinute {
		retry := int(time.Until(w.expires).Seconds())
		if retry < 1 {
			retry = 1
		}
		return false, retry
	}
	w.count++
	l.windows[key] = w
	return true, 0
}

func withRateLimit(next http.Handler) http.Handler {
	limiter := newFixedWindowLimiter()

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasPrefix(r.URL.Path, "/api/") {
			next.ServeHTTP(w, r)
			return
		}

		key := clientKey(r)
		ok, retryAfterSec := limiter.allow(key, time.Now())
		if ok {
			next.ServeHTTP(w, r)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Retry-After", strconv.Itoa(retryAfterSec))
		w.WriteHeader(http.StatusTooManyRequests)
		_ = json.NewEncoder(w).Encode(map[string]string{
			"error": "rate limit exceeded, retry after some time",
		})
	})
}

func clientKey(r *http.Request) string {
	if ip := strings.TrimSpace(r.Header.Get("CF-Connecting-IP")); ip != "" {
		return ip
	}
	if xff := strings.TrimSpace(r.Header.Get("X-Forwarded-For")); xff != "" {
		parts := strings.Split(xff, ",")
		if len(parts) > 0 {
			first := strings.TrimSpace(parts[0])
			if first != "" {
				return first
			}
		}
	}
	host, _, err := net.SplitHostPort(strings.TrimSpace(r.RemoteAddr))
	if err == nil && host != "" {
		return host
	}
	return strings.TrimSpace(r.RemoteAddr)
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

func defaultCSABDir() string {
	candidates := []string{
		filepath.Clean("data-processing/data/dasa&csab"),
		filepath.Clean("../data-processing/data/dasa&csab"),
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

package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHealthHandler(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()

	healthHandler(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}

	var body map[string]string
	json.NewDecoder(w.Body).Decode(&body)

	if body["status"] != "ok" {
		t.Errorf("expected status ok, got %s", body["status"])
	}
	if body["service"] != "scheduler" {
		t.Errorf("expected service scheduler, got %s", body["service"])
	}
}

func TestScheduleHandler_MissingFields(t *testing.T) {
	// Tanpa name dan run_at
	body := bytes.NewBufferString(`{}`)
	req := httptest.NewRequest(http.MethodPost, "/schedule", body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	// Override projectID supaya tidak connect ke GCP
	projectID = "test-project"

	scheduleHandler(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestScheduleHandler_InvalidDate(t *testing.T) {
	body := bytes.NewBufferString(`{"name":"test","run_at":"bukan-tanggal"}`)
	req := httptest.NewRequest(http.MethodPost, "/schedule", body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	scheduleHandler(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 untuk tanggal invalid, got %d", w.Code)
	}

	var resp map[string]string
	json.NewDecoder(w.Body).Decode(&resp)
	if resp["error"] == "" {
		t.Error("expected error message, got kosong")
	}
}

func TestScheduleHandler_WrongMethod(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/schedule", nil)
	w := httptest.NewRecorder()

	scheduleHandler(w, req)

	if w.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405, got %d", w.Code)
	}
}

func TestRunHandler_WrongMethod(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/run", nil)
	w := httptest.NewRecorder()

	runHandler(w, req)

	if w.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405, got %d", w.Code)
	}
}

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"cloud.google.com/go/firestore"
)

var projectID = os.Getenv("GCP_PROJECT")

type Job struct {
	ID        string `json:"id,omitempty" firestore:"-"`
	Name      string `json:"name" firestore:"name"`
	Status    string `json:"status" firestore:"status"`
	RunAt     string `json:"run_at" firestore:"run_at"`
	CreatedAt string `json:"created_at" firestore:"created_at"`
}

func newFirestore(ctx context.Context) (*firestore.Client, error) {
	client, err := firestore.NewClient(ctx, projectID)
	if err != nil {
		return nil, fmt.Errorf("gagal koneksi Firestore: %w", err)
	}
	return client, nil
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(v)
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{
		"status":  "ok",
		"service": "scheduler",
	})
}

func scheduleHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method tidak diizinkan"})
		return
	}

	var req struct {
		Name  string `json:"name"`
		RunAt string `json:"run_at"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "body tidak valid"})
		return
	}
	if req.Name == "" || req.RunAt == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "name dan run_at wajib diisi"})
		return
	}
	if _, err := time.Parse(time.RFC3339, req.RunAt); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "format run_at tidak valid, gunakan ISO 8601 contoh: 2024-01-15T10:00:00Z",
		})
		return
	}

	ctx := context.Background()
	client, err := newFirestore(ctx)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	defer client.Close()

	job := Job{
		Name:      req.Name,
		Status:    "pending",
		RunAt:     req.RunAt,
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}

	ref, _, err := client.Collection("scheduled_jobs").Add(ctx, job)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal menyimpan job"})
		return
	}

	job.ID = ref.ID
	log.Printf("Job dijadwalkan: %s — %s pada %s", job.ID, job.Name, job.RunAt)
	writeJSON(w, http.StatusCreated, job)
}

func listJobsHandler(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	client, err := newFirestore(ctx)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	defer client.Close()

	docs, err := client.Collection("scheduled_jobs").
		OrderBy("created_at", firestore.Desc).
		Limit(20).
		Documents(ctx).
		GetAll()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal mengambil jobs"})
		return
	}

	jobs := make([]map[string]any, 0, len(docs))
	for _, d := range docs {
		data := d.Data()
		data["id"] = d.Ref.ID
		jobs = append(jobs, data)
	}

	writeJSON(w, http.StatusOK, map[string]any{"jobs": jobs})
}

func getJobHandler(w http.ResponseWriter, r *http.Request, id string) {
	ctx := context.Background()
	client, err := newFirestore(ctx)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	defer client.Close()

	doc, err := client.Collection("scheduled_jobs").Doc(id).Get(ctx)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "job tidak ditemukan"})
		return
	}

	data := doc.Data()
	data["id"] = doc.Ref.ID
	writeJSON(w, http.StatusOK, data)
}

func deleteJobHandler(w http.ResponseWriter, r *http.Request, id string) {
	ctx := context.Background()
	client, err := newFirestore(ctx)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	defer client.Close()

	_, err = client.Collection("scheduled_jobs").Doc(id).Delete(ctx)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal menghapus job"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "job berhasil dihapus"})
}

func runHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method tidak diizinkan"})
		return
	}

	ctx := context.Background()
	client, err := newFirestore(ctx)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	defer client.Close()

	now := time.Now().UTC().Format(time.RFC3339)

	docs, err := client.Collection("scheduled_jobs").
		Where("status", "==", "pending").
		Where("run_at", "<=", now).
		Documents(ctx).
		GetAll()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal query jobs"})
		return
	}

	if len(docs) == 0 {
		writeJSON(w, http.StatusOK, map[string]any{
			"jobs_ran": 0,
			"message":  "tidak ada job yang perlu dijalankan",
		})
		return
	}

	batch := client.Batch()
	executed := make([]map[string]string, 0, len(docs))
	for _, d := range docs {
		batch.Update(d.Ref, []firestore.Update{
			{Path: "status", Value: "completed"},
			{Path: "executed_at", Value: now},
		})
		executed = append(executed, map[string]string{
			"id":   d.Ref.ID,
			"name": fmt.Sprintf("%v", d.Data()["name"]),
		})
		log.Printf("Menjalankan job: %s", d.Ref.ID)
	}

	if _, err := batch.Commit(ctx); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal update jobs"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"jobs_ran": len(executed),
		"executed": executed,
	})
}

func jobsRouter(w http.ResponseWriter, r *http.Request) {
	// /jobs atau /jobs/{id}
	id := r.URL.Path[len("/jobs"):]
	if len(id) > 0 && id[0] == '/' {
		id = id[1:]
	}

	if id == "" {
		switch r.Method {
		case http.MethodGet:
			listJobsHandler(w, r)
		default:
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method tidak diizinkan"})
		}
		return
	}

	switch r.Method {
	case http.MethodGet:
		getJobHandler(w, r, id)
	case http.MethodDelete:
		deleteJobHandler(w, r, id)
	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method tidak diizinkan"})
	}
}

func main() {
	if projectID == "" {
		projectID = "local-dev"
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "3002"
	}

	http.HandleFunc("/health", healthHandler)
	http.HandleFunc("/schedule", scheduleHandler)
	http.HandleFunc("/jobs", jobsRouter)
	http.HandleFunc("/jobs/", jobsRouter)
	http.HandleFunc("/run", runHandler)

	log.Printf("Scheduler running on port %s (project: %s)", port, projectID)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}

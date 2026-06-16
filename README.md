# GCP Cloud Platform

Tiga microservice yang di-deploy ke Google Cloud Platform menggunakan Terraform dan GitHub Actions. API Gateway dan Worker pakai Node.js, Scheduler pakai Go. Database pakai Firestore. Semua jalan gratis di GCP Free Tier.

---

## Arsitektur

```
┌──────────────────────────────────────────────────────────────┐
│                         Developer                            │
│                      git push main                           │
└──────────────────────┬───────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│                    GitHub Actions                            │
│                                                              │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────────┐  │
│  │  Terraform  │──▶│ Docker Build │──▶│  Deploy Cloud    │  │
│  │   Apply     │   │ & Push Image │   │      Run         │  │
│  └─────────────┘   └──────────────┘   └──────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│                      GCP Project                             │
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │              Artifact Registry                      │   │
│   │         (menyimpan Docker images)                   │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│   │ API Gateway  │  │    Worker    │  │    Scheduler     │  │
│   │  Cloud Run   │  │  Cloud Run   │  │   Cloud Run      │  │
│   │  (Node.js)   │  │  (Node.js)   │  │      (Go)        │  │
│   │              │  │              │  │                  │  │
│   │ CRUD items   │  │ Proses job   │  │ Kelola jadwal    │  │
│   └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│          │                 │                   │            │
│          └─────────────────┴───────────────────┘            │
│                            │                                │
│                            ▼                                │
│                  ┌─────────────────┐                        │
│                  │    Firestore    │                        │
│                  │                 │                        │
│                  │  /items         │                        │
│                  │  /job_results   │                        │
│                  │  /scheduled_jobs│                        │
│                  └─────────────────┘                        │
└──────────────────────────────────────────────────────────────┘
```

Semua Cloud Run service **scale to zero** saat tidak ada traffic — tidak ada biaya saat idle.

---

## Penjelasan Tiap Service

**API Gateway (Node.js)** — pintu masuk utama. Menerima request dari luar dan melakukan operasi CRUD ke koleksi `items` di Firestore. Port 3000 saat lokal.

**Worker (Node.js)** — menerima job, memprosesnya, lalu menyimpan hasilnya ke Firestore koleksi `job_results`. Di project nyata bisa dipakai untuk mengirim email, resize gambar, generate laporan. Port 3001 saat lokal.

**Scheduler (Go)** — menyimpan job yang dijadwalkan ke koleksi `scheduled_jobs`. Endpoint `/run` dipanggil periodik (lewat Cloud Scheduler atau cron) untuk mengeksekusi job yang sudah waktunya jalan. Port 3002 saat lokal.

---

## Struktur Repository

```
gcp-platform/
│
├── README.md
├── .gitignore
│
├── terraform/
│   ├── main.tf                    Entry point, panggil semua module
│   ├── variables.tf               Input: project_id, region
│   ├── outputs.tf                 Output: URL tiap service
│   ├── terraform.tfvars.example   Template konfigurasi
│   └── modules/
│       ├── cloud-run/             Module reusable deploy Cloud Run
│       ├── firestore/             Provision Firestore database
│       ├── iam/                   Service accounts & permissions
│       └── artifact-registry/    Docker registry + cleanup policy
│
├── services/
│   ├── api-gateway/               Node.js
│   │   ├── src/app.js             Express app: route & logika
│   │   ├── src/index.js           Entry point, jalankan server
│   │   ├── tests/api.test.js      Unit test
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   ├── worker/                    Node.js
│   │   ├── src/index.js           Express app, job processor
│   │   ├── tests/worker.test.js   Unit test
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   └── scheduler/                 Go
│       ├── main.go                HTTP server, job scheduler
│       ├── main_test.go           Unit test
│       ├── go.mod
│       └── Dockerfile
│
└── .github/
    └── workflows/
        └── deploy.yml             Pipeline CI/CD
```

---

## Bagian 1 — Setup & Testing Lokal

### Yang Perlu Diinstall

**Node.js v18+** (untuk api-gateway & worker)
```bash
node --version
npm --version
```
Kalau belum ada, download di [nodejs.org](https://nodejs.org), pilih versi LTS.

**Go v1.21+** (untuk scheduler)
```bash
go version
```
Kalau belum ada, download di [go.dev/dl](https://go.dev/dl/), atau Mac: `brew install go`.

**gcloud CLI** (untuk Firestore Emulator)
```bash
gcloud --version
gcloud components install cloud-firestore-emulator
```
Download di [cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install) kalau belum ada.

**Java v11+** (dibutuhkan oleh emulator)
```bash
java --version

# Ubuntu/Debian:
sudo apt install openjdk-17-jre
# Mac:
brew install openjdk
```

---

### Clone & Install Dependencies

```bash
git clone https://github.com/username/gcp-platform.git
cd gcp-platform

# Node.js services
cd services/api-gateway && npm install && cd ../..
cd services/worker && npm install && cd ../..

# Go service
cd services/scheduler && go mod tidy && cd ../..
```

---

### Jalankan Firestore Emulator

Buka **terminal baru**, biarkan tetap jalan:

```bash
gcloud emulators firestore start --host-port=localhost:8090
```

Tunggu sampai muncul:
```
[firestore] Dev App Server is now running on port 8090
```

---

### Jalankan Semua Service (3 terminal terpisah)

**Terminal 1 — API Gateway**
```bash
cd services/api-gateway
export FIRESTORE_EMULATOR_HOST=localhost:8090
export PORT=3000
npm start
```

**Terminal 2 — Worker**
```bash
cd services/worker
export FIRESTORE_EMULATOR_HOST=localhost:8090
export PORT=3001
npm start
```

**Terminal 3 — Scheduler (Go)**
```bash
cd services/scheduler
export FIRESTORE_EMULATOR_HOST=localhost:8090
export GCP_PROJECT=local-dev
export PORT=3002
go run main.go
```

> `FIRESTORE_EMULATOR_HOST` memberitahu SDK Firestore (baik Node.js maupun Go) untuk pakai emulator lokal, bukan Firestore GCP sungguhan. Tidak perlu internet, tidak ada biaya.

---

### Unit Test

Test tidak butuh emulator nyala — Firestore di-mock.

```bash
# Node.js services
cd services/api-gateway && npm test && cd ../..
cd services/worker && npm test && cd ../..

# Go service
cd services/scheduler && go test ./... -v && cd ../..
```

---

### Testing Manual Pakai curl

Pastikan emulator + 3 service sudah nyala dulu.

**Cek semua service hidup:**
```bash
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health
```

**API Gateway — buat & ambil item:**
```bash
curl -X POST http://localhost:3000/api/items \
  -H "Content-Type: application/json" \
  -d '{"name": "laptop", "description": "buat kerja"}'

curl http://localhost:3000/api/items
```

**Worker — kirim job:**
```bash
curl -X POST http://localhost:3001/process \
  -H "Content-Type: application/json" \
  -d '{"job_id": "job-001", "payload": {"type": "email"}}'

curl http://localhost:3001/results/job-001
```

**Scheduler — jadwalkan & jalankan job:**
```bash
curl -X POST http://localhost:3002/schedule \
  -H "Content-Type: application/json" \
  -d '{"name": "cleanup", "run_at": "2024-01-01T00:00:00Z"}'

curl http://localhost:3002/jobs

curl -X POST http://localhost:3002/run
```

---

## Bagian 2 — Deploy ke GCP

### 1. Buat GCP Project

```bash
gcloud auth login
gcloud auth application-default login

gcloud projects create your-project-id
gcloud config set project your-project-id
```

Aktifkan billing di [console.cloud.google.com/billing](https://console.cloud.google.com/billing) — wajib meski pakai free tier, tapi tidak akan kena charge selama masih dalam limit.

---

### 2. Provision Infrastruktur dengan Terraform

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`, isi dengan project ID kamu:
```hcl
project_id  = "your-project-id"
region      = "asia-southeast2"
environment = "dev"
```

Jalankan:
```bash
terraform init
terraform plan
terraform apply
```

Terraform akan membuat: Firestore database, Artifact Registry repo, tiga Cloud Run service (kosong dulu, image belum ada), service account untuk Cloud Run, service account untuk GitHub Actions, dan semua IAM binding yang diperlukan.

Catatan: `terraform apply` pertama kali bisa gagal kalau image Docker belum ada di Artifact Registry. Kalau itu terjadi, build & push image dulu manual (lihat langkah 3), baru `terraform apply` lagi.

---

### 3. Build & Push Image Manual (Opsional, Sekali Saja)

Kalau mau coba deploy manual dulu sebelum setup CI/CD:

```bash
gcloud auth configure-docker asia-southeast2-docker.pkg.dev

# Build & push api-gateway
cd services/api-gateway
docker build -t asia-southeast2-docker.pkg.dev/your-project-id/app-repo/api-gateway:latest .
docker push asia-southeast2-docker.pkg.dev/your-project-id/app-repo/api-gateway:latest
cd ../..

# Build & push worker
cd services/worker
docker build -t asia-southeast2-docker.pkg.dev/your-project-id/app-repo/worker:latest .
docker push asia-southeast2-docker.pkg.dev/your-project-id/app-repo/worker:latest
cd ../..

# Build & push scheduler
cd services/scheduler
docker build -t asia-southeast2-docker.pkg.dev/your-project-id/app-repo/scheduler:latest .
docker push asia-southeast2-docker.pkg.dev/your-project-id/app-repo/scheduler:latest
cd ../..
```

Ganti `your-project-id` dengan project ID GCP kamu di semua command di atas.

---

### 4. Setup CI/CD Otomatis (GitHub Actions)

Supaya setiap `git push` otomatis build & deploy, perlu setup Workload Identity Federation — cara GitHub Actions login ke GCP tanpa menyimpan file JSON service account key.

**a. Buat Workload Identity Pool:**
```bash
gcloud iam workload-identity-pools create "github-pool" \
  --location="global" \
  --display-name="GitHub Actions Pool"
```

**b. Buat Provider untuk pool tersebut:**
```bash
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"
```

**c. Izinkan repo GitHub kamu memakai service account:**
```bash
gcloud iam service-accounts add-iam-policy-binding \
  "github-actions-sa@your-project-id.iam.gserviceaccount.com" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/attribute.repository/username/gcp-platform"
```
Ganti `PROJECT_NUMBER` (bukan project ID — beda angka, cek lewat `gcloud projects describe your-project-id`), `username/gcp-platform` dengan path repo GitHub kamu.

**d. Ambil resource name provider untuk dipakai sebagai secret:**
```bash
gcloud iam workload-identity-pools providers describe "github-provider" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --format="value(name)"
```

**e. Tambahkan secrets di GitHub repo** (`Settings → Secrets and variables → Actions`):

| Secret | Isi |
|--------|-----|
| `GCP_PROJECT_ID` | Project ID GCP kamu |
| `WIF_PROVIDER` | Output dari langkah d |
| `WIF_SERVICE_ACCOUNT` | `github-actions-sa@your-project-id.iam.gserviceaccount.com` |

---

### 5. Push dan Deploy

```bash
git add .
git commit -m "setup CI/CD"
git push origin main
```

Buka tab **Actions** di GitHub repo untuk lihat pipeline berjalan: Terraform apply → build image → deploy ke Cloud Run. Kalau berhasil, URL tiap service muncul di output Terraform atau di GCP Console → Cloud Run.

---

### 6. Cek Hasil Deploy

```bash
gcloud run services list --region=asia-southeast2
```

Test API yang sudah live:
```bash
curl https://api-gateway-xxxxx-as.a.run.app/health
```
(URL asli akan beda, ambil dari output `gcloud run services list` atau Terraform output)

---

## API Reference

### API Gateway (port 3000 lokal)
```
GET    /health              Cek status service
GET    /api/items           Ambil semua items (max 20)
POST   /api/items           Buat item baru
                            Body: { "name": "...", "description": "..." }
GET    /api/items/:id       Ambil item by ID
DELETE /api/items/:id       Hapus item
```

### Worker (port 3001 lokal)
```
GET    /health              Cek status service
POST   /process             Kirim job untuk diproses
                            Body: { "job_id": "...", "payload": {...} }
GET    /results/:job_id     Ambil hasil job by ID
GET    /results             Ambil semua hasil job
```

### Scheduler (port 3002 lokal)
```
GET    /health              Cek status service
POST   /schedule            Jadwalkan job baru
                            Body: { "name": "...", "run_at": "2024-01-15T10:00:00Z" }
GET    /jobs                Lihat semua scheduled jobs
GET    /jobs/:id            Lihat job by ID
POST   /run                 Eksekusi jobs yang sudah waktunya
DELETE /jobs/:id            Hapus job
```

---

## Estimasi Biaya

Semua dalam **GCP Always Free Tier** — bukan trial, permanen selama tidak melebihi limit:

| Service | Free Tier |
|---------|-----------|
| Cloud Run | 2 juta request/bulan, scale to zero saat idle |
| Firestore | 1 GB storage, 50k read & 20k write per hari |
| Artifact Registry | 0.5 GB |
| Cloud Build | 120 menit/hari |

Total: **$0/bulan** untuk skala penggunaan portfolio/dev.

---

## Security

- **Workload Identity Federation** — GitHub Actions login ke GCP tanpa menyimpan service account key
- **Least privilege IAM** — Cloud Run service account hanya dapat akses Firestore dan Secret Manager
- **`.gitignore`** — file `*.tfvars`, `*.json` credential, dan `.terraform/` tidak ikut commit

---

## Screenshots

### Terraform Apply
![Terraform Apply](screenshots/terraform-apply.png)

### Cloud Run Services
![Cloud Run Services](screenshots/cloud-run-services.png)

### GitHub Actions Pipeline
![GitHub Actions Pipeline](screenshots/github-actions-pipeline.png)

### Firestore Collections
![Firestore Collections](screenshots/firestore-collections.png)

### API Response
![API Response](screenshots/api-response.png)

### Unit Test Results
![Unit Test Results](screenshots/unit-test-results.png)

---

*Dibuat untuk belajar cloud computing dan portfolio.*

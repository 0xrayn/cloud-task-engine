terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  # Simpan state di GCS (opsional, bisa pakai local dulu)
  # backend "gcs" {
  #   bucket = "your-tfstate-bucket"
  #   prefix = "terraform/state"
  # }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Enable GCP APIs
resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "firestore.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "cloudbuild.googleapis.com",
    "iam.googleapis.com",
    "cloudresourcemanager.googleapis.com",
  ])
  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

# Artifact Registry
module "artifact_registry" {
  source     = "./modules/artifact-registry"
  project_id = var.project_id
  region     = var.region
  depends_on = [google_project_service.apis]
}

# Firestore
module "firestore" {
  source     = "./modules/firestore"
  project_id = var.project_id
  region     = var.region
  depends_on = [google_project_service.apis]
}

# IAM & Service Accounts
module "iam" {
  source     = "./modules/iam"
  project_id = var.project_id
  depends_on = [google_project_service.apis]
}

# Cloud Run Services
module "api_gateway" {
  source              = "./modules/cloud-run"
  project_id          = var.project_id
  region              = var.region
  service_name        = "api-gateway"
  image               = "${var.region}-docker.pkg.dev/${var.project_id}/app-repo/api-gateway:latest"
  service_account     = module.iam.cloud_run_sa_email
  is_public           = true
  env_vars = {
    NODE_ENV    = "production"
    GCP_PROJECT = var.project_id
  }
  depends_on = [module.artifact_registry, module.iam]
}

module "worker" {
  source              = "./modules/cloud-run"
  project_id          = var.project_id
  region              = var.region
  service_name        = "worker"
  image               = "${var.region}-docker.pkg.dev/${var.project_id}/app-repo/worker:latest"
  service_account     = module.iam.cloud_run_sa_email
  is_public           = false
  env_vars = {
    NODE_ENV    = "production"
    GCP_PROJECT = var.project_id
  }
  depends_on = [module.artifact_registry, module.iam]
}

module "scheduler" {
  source              = "./modules/cloud-run"
  project_id          = var.project_id
  region              = var.region
  service_name        = "scheduler"
  image               = "${var.region}-docker.pkg.dev/${var.project_id}/app-repo/scheduler:latest"
  service_account     = module.iam.cloud_run_sa_email
  is_public           = false
  env_vars = {
    GCP_PROJECT = var.project_id
    WORKER_URL  = module.worker.service_url
  }
  depends_on = [module.artifact_registry, module.iam]
}

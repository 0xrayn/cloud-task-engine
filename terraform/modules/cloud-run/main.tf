variable "project_id" { type = string }
variable "region" { type = string }
variable "service_name" { type = string }
variable "image" { type = string }
variable "service_account" { type = string }
variable "env_vars" {
  type    = map(string)
  default = {}
}

variable "is_public" {
  type    = bool
  default = true
}

resource "google_cloud_run_v2_service" "service" {
  name     = var.service_name
  location = var.region
  project  = var.project_id

  template {
    service_account = var.service_account

    containers {
      image = var.image

      dynamic "env" {
        for_each = var.env_vars
        content {
          name  = env.key
          value = env.value
        }
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        # Scale to zero saat tidak ada request = $0
        cpu_idle = true
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 3
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}

# Allow public access (unauthenticated)
resource "google_cloud_run_v2_service_iam_member" "public" {
  count    = var.is_public ? 1 : 0
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.service.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Restrict to service account if is_public is false
resource "google_cloud_run_v2_service_iam_member" "private" {
  count    = var.is_public ? 0 : 1
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.service.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${var.service_account}"
}

output "service_url" {
  value = google_cloud_run_v2_service.service.uri
}

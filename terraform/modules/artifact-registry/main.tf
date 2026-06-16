variable "project_id" { type = string }
variable "region" { type = string }

resource "google_artifact_registry_repository" "app_repo" {
  project       = var.project_id
  location      = var.region
  repository_id = "app-repo"
  description   = "Docker images for GCP Platform services"
  format        = "DOCKER"

  cleanup_policies {
    id     = "keep-last-5"
    action = "KEEP"
    most_recent_versions {
      keep_count = 5
    }
  }
}

output "repository_url" {
  value = "${var.region}-docker.pkg.dev/${var.project_id}/app-repo"
}

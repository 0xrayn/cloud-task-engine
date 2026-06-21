variable "project_id" { type = string }
variable "region" { type = string }

resource "google_firestore_database" "default" {
  project     = var.project_id
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"

  # Hapus proteksi untuk dev (biar bisa terraform destroy)
  delete_protection_state = "DELETE_PROTECTION_DISABLED"
  deletion_policy         = "DELETE"
}

output "database_name" {
  value = google_firestore_database.default.name
}

resource "google_firestore_index" "scheduled_jobs_index" {
  project    = var.project_id
  database   = google_firestore_database.default.name
  collection = "scheduled_jobs"

  fields {
    field_path = "status"
    order      = "ASCENDING"
  }

  fields {
    field_path = "run_at"
    order      = "ASCENDING"
  }
}

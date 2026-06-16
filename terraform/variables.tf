variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "asia-southeast2" # Jakarta
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

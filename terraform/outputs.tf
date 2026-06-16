output "api_gateway_url" {
  description = "URL of the API Gateway Cloud Run service"
  value       = module.api_gateway.service_url
}

output "worker_url" {
  description = "URL of the Worker Cloud Run service"
  value       = module.worker.service_url
}

output "scheduler_url" {
  description = "URL of the Scheduler Cloud Run service"
  value       = module.scheduler.service_url
}

output "artifact_registry_repo" {
  description = "Artifact Registry repository URL"
  value       = module.artifact_registry.repository_url
}

output "api_endpoint" {
  value = module.api.endpoint
}

output "user_pool_id" {
  value = module.auth.user_pool_id
}

output "user_pool_client_id" {
  value = module.auth.client_id
}

output "table_name" {
  value = module.table.name
}

output "alarm_topic_arn" {
  value = module.observability.alarm_topic_arn
}

output "websocket_url" {
  value = module.websocket.url
}

output "event_bus_name" {
  value = module.events.bus_name
}

output "web_url" {
  value = module.frontend.url
}

output "web_bucket" {
  value = module.frontend.bucket
}

output "web_distribution_id" {
  value = module.frontend.distribution_id
}

output "cognito_region" {
  value = var.region
}

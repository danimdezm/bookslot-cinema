locals {
  name_prefix  = "${var.project}-${var.environment}"
  backend_dist = "${path.root}/../../../backend/dist"

  catalog = { function_name = module.fn_catalog.function_name, invoke_arn = module.fn_catalog.invoke_arn }
  booking = { function_name = module.fn_booking.function_name, invoke_arn = module.fn_booking.invoke_arn }
  admin   = { function_name = module.fn_admin.function_name, invoke_arn = module.fn_admin.invoke_arn }
  health  = { function_name = module.fn_health.function_name, invoke_arn = module.fn_health.invoke_arn }
  webhook = { function_name = module.fn_stripe_webhook.function_name, invoke_arn = module.fn_stripe_webhook.invoke_arn }

  public_routes = {
    "GET /health"                 = local.health
    "GET /movies"                 = local.catalog
    "GET /movies/{movieId}"       = local.catalog
    "GET /movies/{movieId}/shows" = local.catalog
    "GET /shows/{showId}"         = local.catalog
    "POST /webhooks/stripe"       = local.webhook
  }

  private_routes = {
    "GET /me"                               = local.health
    "POST /shows/{showId}/holds"            = local.booking
    "GET /holds/{holdId}"                   = local.booking
    "DELETE /holds/{holdId}"                = local.booking
    "POST /holds/{holdId}/payment"          = local.booking
    "POST /holds/{holdId}/confirm"          = local.booking
    "GET /me/bookings"                      = local.booking
    "GET /me/bookings/{bookingId}"          = local.booking
    "DELETE /me/bookings/{bookingId}"       = local.booking
    "POST /admin/movies"                    = local.admin
    "GET /admin/rooms"                      = local.admin
    "POST /admin/rooms"                     = local.admin
    "GET /admin/shows"                      = local.admin
    "POST /admin/shows"                     = local.admin
    "GET /admin/shows/{showId}/bookings"    = local.admin
    "GET /admin/shows/{showId}/audit"       = local.admin
    "POST /admin/shows/{showId}/block"      = local.admin
    "POST /admin/shows/{showId}/unblock"    = local.admin
    "GET /admin/bookings/{bookingId}"       = local.admin
    "GET /admin/bookings/{bookingId}/audit" = local.admin
    "DELETE /admin/bookings/{bookingId}"    = local.admin
  }
}

module "table" {
  source              = "../../modules/dynamodb"
  name                = local.name_prefix
  deletion_protection = var.deletion_protection
}

module "auth" {
  source              = "../../modules/auth"
  name                = local.name_prefix
  deletion_protection = var.deletion_protection
}

module "api" {
  source       = "../../modules/api"
  name         = local.name_prefix
  jwt_issuer   = module.auth.issuer
  jwt_audience = module.auth.client_id

  routes = merge(
    { for k, r in local.public_routes : k => merge(r, { authorized = false }) },
    { for k, r in local.private_routes : k => merge(r, { authorized = true }) },
  )
}

module "observability" {
  source                = "../../modules/observability"
  name_prefix           = local.name_prefix
  alarm_email           = var.alarm_email
  lambda_function_names = local.all_functions
  api_id                = module.api.api_id
  api_stage             = module.api.stage_name
  table_name            = module.table.name
  dlq_names             = [module.events.dlq_name, aws_sqs_queue.stream_dlq.name]
}

module "budget" {
  source      = "../../modules/budget"
  name_prefix = local.name_prefix
  limit_usd   = var.monthly_budget_usd
  email       = var.alarm_email
}

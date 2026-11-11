locals {
  catalog = { function_name = module.lambda["catalog"].function_name, invoke_arn = module.lambda["catalog"].invoke_arn }
  booking = { function_name = module.lambda["booking"].function_name, invoke_arn = module.lambda["booking"].invoke_arn }
  admin   = { function_name = module.lambda["admin"].function_name, invoke_arn = module.lambda["admin"].invoke_arn }
  health  = { function_name = module.lambda["health"].function_name, invoke_arn = module.lambda["health"].invoke_arn }

  public_routes = {
    "GET /health"                 = local.health
    "GET /movies"                 = local.catalog
    "GET /movies/{movieId}"       = local.catalog
    "GET /movies/{movieId}/shows" = local.catalog
    "GET /shows/{showId}"         = local.catalog
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

  api_routes = merge(
    { for k, r in local.public_routes : k => merge(r, { authorized = false }) },
    { for k, r in local.private_routes : k => merge(r, { authorized = true }) },
  )
}

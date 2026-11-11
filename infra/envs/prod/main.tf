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

module "frontend" {
  source = "../../modules/frontend"
  name   = local.name_prefix
}

module "api" {
  source             = "../../modules/api"
  name               = local.name_prefix
  jwt_issuer         = module.auth.issuer
  jwt_audience       = module.auth.client_id
  cors_allow_origins = [module.frontend.url, "http://localhost:5174"]
  routes             = local.api_routes
}

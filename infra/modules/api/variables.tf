variable "name" {
  type = string
}

variable "routes" {
  description = "route_key (\"GET /shows/{id}\") => función destino y si requiere JWT"
  type = map(object({
    function_name = string
    invoke_arn    = string
    authorized    = bool
  }))
}

variable "jwt_issuer" {
  type = string
}

variable "jwt_audience" {
  description = "Client ID de Cognito"
  type        = string
}

variable "cors_allow_origins" {
  description = "Se restringirá al dominio de CloudFront en la fase del frontend"
  type        = list(string)
  default     = ["*"]
}

variable "throttling_burst_limit" {
  type    = number
  default = 500
}

variable "throttling_rate_limit" {
  type    = number
  default = 200
}

variable "log_retention_days" {
  type    = number
  default = 30
}

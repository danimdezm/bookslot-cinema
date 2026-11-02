variable "name" {
  description = "Nombre de la función y de su rol IAM (debe empezar por el prefijo del proyecto)"
  type        = string
}

variable "description" {
  type    = string
  default = ""
}

variable "source_dir" {
  description = "Directorio con el bundle index.js"
  type        = string
}

variable "environment" {
  type    = map(string)
  default = {}
}

variable "policies" {
  description = "Políticas inline adicionales: nombre => JSON"
  type        = map(string)
  default     = {}
}

variable "memory_size" {
  type    = number
  default = 256
}

variable "timeout" {
  type    = number
  default = 10
}

variable "reserved_concurrency" {
  type    = number
  default = -1
}

variable "log_retention_days" {
  type    = number
  default = 30
}

variable "role_prefix" {
  type    = string
  default = ""
}

variable "permissions_boundary" {
  type    = string
  default = null
}

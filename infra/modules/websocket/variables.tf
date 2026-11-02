variable "name" {
  type = string
}

variable "function_name" {
  description = "Lambda que atiende $connect, $disconnect y $default"
  type        = string
}

variable "invoke_arn" {
  type = string
}

variable "stage_name" {
  type    = string
  default = "live"
}

variable "throttling_burst_limit" {
  type    = number
  default = 200
}

variable "throttling_rate_limit" {
  type    = number
  default = 100
}

variable "name_prefix" {
  type = string
}

variable "alarm_email" {
  type = string
}

variable "lambda_function_names" {
  type = list(string)
}

variable "api_id" {
  type = string
}

variable "api_stage" {
  type    = string
  default = "$default"
}

variable "table_name" {
  type = string
}

variable "dlq_names" {
  description = "Colas de mensajes fallidos: cualquier mensaje en ellas dispara una alarma"
  type        = list(string)
  default     = []
}

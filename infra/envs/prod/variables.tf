variable "region" {
  type    = string
  default = "eu-west-1"
}

variable "project" {
  type    = string
  default = "bookslot"
}

variable "environment" {
  type    = string
  default = "prod"
}

variable "owner" {
  type = string
}

variable "alarm_email" {
  description = "Email que recibe alarmas de CloudWatch y de AWS Budgets"
  type        = string
}

variable "monthly_budget_usd" {
  type    = number
  default = 20
}

variable "deletion_protection" {
  description = "Protege tabla y user pool; poner a false antes de terraform destroy"
  type        = bool
  default     = true
}

variable "sender_email" {
  description = "Remitente de los emails (SES). En el sandbox de SES, los destinatarios también deben estar verificados"
  type        = string
}

variable "payment_provider" {
  description = "mock (pago simulado con POST /holds/{id}/confirm) o stripe (requiere cargar el secreto)"
  type        = string
  default     = "mock"

  validation {
    condition     = contains(["mock", "stripe"], var.payment_provider)
    error_message = "payment_provider debe ser mock o stripe."
  }
}

variable "iam_role_prefix" {
  description = "Prefijo obligatorio de los roles IAM en la cuenta del laboratorio"
  type        = string
  default     = "student-"
}

variable "permissions_boundary_name" {
  description = "Permissions boundary que exige la cuenta del laboratorio (vacío para no usarla)"
  type        = string
  default     = "StudentBoundary"
}

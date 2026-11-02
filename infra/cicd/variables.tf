variable "region" {
  type    = string
  default = "eu-west-1"
}

variable "project" {
  type    = string
  default = "bookslot"
}

variable "owner" {
  type = string
}

variable "github_repo" {
  description = "Repositorio en formato owner/nombre"
  type        = string
}

variable "branch" {
  type    = string
  default = "main"
}

variable "alarm_email" {
  type = string
}

variable "sender_email" {
  type = string
}

variable "iam_role_prefix" {
  type    = string
  default = "student-"
}

variable "permissions_boundary_name" {
  type    = string
  default = "StudentBoundary"
}

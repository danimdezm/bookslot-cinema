variable "region" {
  type    = string
  default = "eu-west-1"
}

variable "project" {
  type    = string
  default = "bookslot"
}

variable "owner" {
  description = "Valor del tag Owner (p. ej. tu email o nombre)"
  type        = string
}

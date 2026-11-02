variable "name" {
  type = string
}

variable "deletion_protection" {
  description = "Impide borrar la tabla; hay que desactivarlo antes de terraform destroy"
  type        = bool
  default     = true
}

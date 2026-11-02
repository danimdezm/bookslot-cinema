variable "name" {
  type = string
}

variable "event_source" {
  description = "Campo source de los eventos que publica el backend (EVENT_SOURCE)"
  type        = string
  default     = "bookslot"
}

variable "visibility_timeout_seconds" {
  description = "Al menos 6 veces el timeout de la Lambda consumidora"
  type        = number
  default     = 180
}

variable "max_receive_count" {
  description = "Intentos antes de mover el mensaje a la DLQ"
  type        = number
  default     = 5
}

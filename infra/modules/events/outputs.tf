output "bus_name" {
  value = aws_cloudwatch_event_bus.this.name
}

output "bus_arn" {
  value = aws_cloudwatch_event_bus.this.arn
}

output "queue_arn" {
  value = aws_sqs_queue.notifications.arn
}

output "dlq_name" {
  value = aws_sqs_queue.notifications_dlq.name
}

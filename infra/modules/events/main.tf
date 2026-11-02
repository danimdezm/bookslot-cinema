resource "aws_cloudwatch_event_bus" "this" {
  name = var.name
}

resource "aws_sqs_queue" "notifications_dlq" {
  name                      = "${var.name}-notifications-dlq"
  message_retention_seconds = 1209600
  sqs_managed_sse_enabled   = true
}

resource "aws_sqs_queue" "notifications" {
  name                       = "${var.name}-notifications"
  visibility_timeout_seconds = var.visibility_timeout_seconds
  message_retention_seconds  = 345600
  sqs_managed_sse_enabled    = true

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.notifications_dlq.arn
    maxReceiveCount     = var.max_receive_count
  })
}

resource "aws_cloudwatch_event_rule" "notifications" {
  name           = "${var.name}-notifications"
  description    = "Eventos de BookSlot que generan emails"
  event_bus_name = aws_cloudwatch_event_bus.this.name
  event_pattern = jsonencode({
    source      = [var.event_source]
    detail-type = ["BookingConfirmed", "BookingCancelled", "PaymentRefunded"]
  })
}

resource "aws_cloudwatch_event_target" "notifications" {
  rule           = aws_cloudwatch_event_rule.notifications.name
  event_bus_name = aws_cloudwatch_event_bus.this.name
  arn            = aws_sqs_queue.notifications.arn

  retry_policy {
    maximum_event_age_in_seconds = 3600
    maximum_retry_attempts       = 10
  }

  dead_letter_config {
    arn = aws_sqs_queue.notifications_dlq.arn
  }
}

data "aws_iam_policy_document" "from_eventbridge" {
  for_each = {
    notifications     = aws_sqs_queue.notifications.arn
    notifications_dlq = aws_sqs_queue.notifications_dlq.arn
  }

  statement {
    actions   = ["sqs:SendMessage"]
    resources = [each.value]

    principals {
      type        = "Service"
      identifiers = ["events.amazonaws.com"]
    }

    condition {
      test     = "ArnEquals"
      variable = "aws:SourceArn"
      values   = [aws_cloudwatch_event_rule.notifications.arn]
    }
  }
}

resource "aws_sqs_queue_policy" "notifications" {
  queue_url = aws_sqs_queue.notifications.id
  policy    = data.aws_iam_policy_document.from_eventbridge["notifications"].json
}

resource "aws_sqs_queue_policy" "notifications_dlq" {
  queue_url = aws_sqs_queue.notifications_dlq.id
  policy    = data.aws_iam_policy_document.from_eventbridge["notifications_dlq"].json
}

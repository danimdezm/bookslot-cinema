module "events" {
  source = "../../modules/events"
  name   = local.name_prefix
}

module "websocket" {
  source        = "../../modules/websocket"
  name          = local.name_prefix
  function_name = module.fn_websocket.function_name
  invoke_arn    = module.fn_websocket.invoke_arn
}

resource "aws_scheduler_schedule_group" "this" {
  name = local.name_prefix
}

resource "aws_sesv2_email_identity" "sender" {
  email_identity = var.sender_email
}

resource "aws_sqs_queue" "stream_dlq" {
  name                      = "${local.name_prefix}-stream-dlq"
  message_retention_seconds = 1209600
  sqs_managed_sse_enabled   = true
}

resource "aws_lambda_event_source_mapping" "stream" {
  function_name                      = module.fn_stream_processor.arn
  event_source_arn                   = module.table.stream_arn
  starting_position                  = "LATEST"
  batch_size                         = 100
  maximum_batching_window_in_seconds = 1
  bisect_batch_on_function_error     = true
  maximum_retry_attempts             = 5
  maximum_record_age_in_seconds      = 3600

  filter_criteria {
    filter {
      pattern = jsonencode({
        dynamodb = { NewImage = { type = { S = ["SEAT", "BOOKING", "HOLD", "SHOW"] } } }
      })
    }
  }

  destination_config {
    on_failure {
      destination_arn = aws_sqs_queue.stream_dlq.arn
    }
  }
}

resource "aws_lambda_event_source_mapping" "notifications" {
  function_name                      = module.fn_notifier.arn
  event_source_arn                   = module.events.queue_arn
  batch_size                         = 10
  maximum_batching_window_in_seconds = 5
  function_response_types            = ["ReportBatchItemFailures"]
}

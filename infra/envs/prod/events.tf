module "events" {
  source = "../../modules/events"
  name   = local.name_prefix
}

resource "aws_scheduler_schedule_group" "this" {
  name = local.name_prefix
}

resource "aws_sesv2_email_identity" "sender" {
  email_identity = var.sender_email
}

resource "aws_lambda_event_source_mapping" "notifications" {
  function_name                      = module.lambda["notifier"].arn
  event_source_arn                   = module.events.queue_arn
  batch_size                         = 10
  maximum_batching_window_in_seconds = 5
  function_response_types            = ["ReportBatchItemFailures"]
}

module "fn_websocket" {
  source               = "../../modules/lambda_node"
  name                 = "${local.name_prefix}-websocket"
  description          = "$connect/$disconnect del API WebSocket (suscripción por sesión)"
  source_dir           = "${local.backend_dist}/websocket"
  environment          = local.env_base
  policies             = { table = data.aws_iam_policy_document.table_write.json }
  role_prefix          = local.role_prefix
  permissions_boundary = local.permissions_boundary
}

module "websocket" {
  source        = "../../modules/websocket"
  name          = local.name_prefix
  function_name = module.fn_websocket.function_name
  invoke_arn    = module.fn_websocket.invoke_arn
}

resource "aws_sqs_queue" "stream_dlq" {
  name                      = "${local.name_prefix}-stream-dlq"
  message_retention_seconds = 1209600
  sqs_managed_sse_enabled   = true
}

resource "aws_lambda_event_source_mapping" "stream" {
  function_name                      = module.lambda["stream-processor"].arn
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

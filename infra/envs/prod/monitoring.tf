module "observability" {
  source                = "../../modules/observability"
  name_prefix           = local.name_prefix
  alarm_email           = var.alarm_email
  lambda_function_names = concat([for fn in module.lambda : fn.function_name], [module.fn_websocket.function_name])
  api_id                = module.api.api_id
  api_stage             = module.api.stage_name
  table_name            = module.table.name
  dlq_names             = [module.events.dlq_name, aws_sqs_queue.stream_dlq.name]
}

module "budget" {
  source      = "../../modules/budget"
  name_prefix = local.name_prefix
  limit_usd   = var.monthly_budget_usd
  email       = var.alarm_email
}

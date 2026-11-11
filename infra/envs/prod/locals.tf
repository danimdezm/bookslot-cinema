locals {
  name_prefix  = "${var.project}-${var.environment}"
  backend_dist = "${path.root}/../../../backend/dist"

  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.region

  role_prefix          = var.iam_role_prefix
  permissions_boundary = var.permissions_boundary_name == "" ? null : "arn:aws:iam::${local.account_id}:policy/${var.permissions_boundary_name}"

  table_resources = [module.table.arn, "${module.table.arn}/index/*"]
  schedules_arn   = "arn:aws:scheduler:${local.region}:${local.account_id}:schedule/${aws_scheduler_schedule_group.this.name}/*"
  function_arn    = "arn:aws:lambda:${local.region}:${local.account_id}:function:${local.name_prefix}"

  env_base = {
    APP_ENV    = var.environment
    TABLE_NAME = module.table.name
  }

  env_scheduler = {
    SCHEDULER_GROUP    = aws_scheduler_schedule_group.this.name
    SCHEDULER_ROLE_ARN = aws_iam_role.scheduler.arn
    HOLD_EXPIRER_ARN   = "${local.function_arn}-hold-expirer"
    REMINDER_ARN       = "${local.function_arn}-reminder"
  }

  env_events = {
    EVENT_BUS_NAME = module.events.bus_name
  }

  env_mail = {
    MAILER     = "ses"
    FROM_EMAIL = "BookSlot Cinema <${var.sender_email}>"
  }
}

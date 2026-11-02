locals {
  env_base = {
    APP_ENV    = var.environment
    TABLE_NAME = module.table.name
  }

  env_payments = {
    PAYMENT_PROVIDER  = var.payment_provider
    STRIPE_SECRET_ARN = aws_secretsmanager_secret.stripe.arn
  }

  env_scheduler = {
    SCHEDULER_GROUP    = aws_scheduler_schedule_group.this.name
    SCHEDULER_ROLE_ARN = aws_iam_role.scheduler.arn
    HOLD_EXPIRER_ARN   = module.fn_hold_expirer.arn
    REMINDER_ARN       = module.fn_reminder.arn
  }

  env_events = {
    EVENT_BUS_NAME = module.events.bus_name
  }

  env_mail = {
    MAILER     = "ses"
    FROM_EMAIL = "BookSlot Cinema <${var.sender_email}>"
  }

  booking_policies = {
    table     = data.aws_iam_policy_document.table_write.json
    scheduler = data.aws_iam_policy_document.scheduler.json
    stripe    = data.aws_iam_policy_document.stripe_secret.json
    events    = data.aws_iam_policy_document.events_publish.json
  }
}

module "fn_health" {
  source               = "../../modules/lambda_node"
  role_prefix          = local.role_prefix
  permissions_boundary = local.permissions_boundary
  name                 = "${local.name_prefix}-health"
  description          = "Health check y eco de claims JWT"
  source_dir           = "${local.backend_dist}/health"
  environment          = { APP_ENV = var.environment }
}

module "fn_catalog" {
  source               = "../../modules/lambda_node"
  role_prefix          = local.role_prefix
  permissions_boundary = local.permissions_boundary
  name                 = "${local.name_prefix}-catalog"
  description          = "Cartelera, sesiones y mapa de butacas (solo lectura)"
  source_dir           = "${local.backend_dist}/catalog"
  environment          = local.env_base
  policies             = { table = data.aws_iam_policy_document.table_read.json }
}

module "fn_booking" {
  source               = "../../modules/lambda_node"
  role_prefix          = local.role_prefix
  permissions_boundary = local.permissions_boundary
  name                 = "${local.name_prefix}-booking"
  description          = "Holds, pago, confirmación y cancelación (control de concurrencia)"
  source_dir           = "${local.backend_dist}/booking"
  timeout              = 15
  memory_size          = 512
  environment          = merge(local.env_base, local.env_payments, local.env_scheduler, local.env_events)
  policies             = local.booking_policies
}

module "fn_admin" {
  source               = "../../modules/lambda_node"
  role_prefix          = local.role_prefix
  permissions_boundary = local.permissions_boundary
  name                 = "${local.name_prefix}-admin"
  description          = "Panel de administración: catálogo, bloqueo de sesiones, reservas y auditoría"
  source_dir           = "${local.backend_dist}/admin"
  timeout              = 29
  memory_size          = 512
  environment          = merge(local.env_base, local.env_payments, local.env_scheduler, local.env_events)
  policies             = local.booking_policies
}

module "fn_stripe_webhook" {
  source               = "../../modules/lambda_node"
  role_prefix          = local.role_prefix
  permissions_boundary = local.permissions_boundary
  name                 = "${local.name_prefix}-stripe-webhook"
  description          = "Webhook de Stripe (firma verificada): confirma o reembolsa el hold pagado"
  source_dir           = "${local.backend_dist}/stripe-webhook"
  timeout              = 15
  environment          = merge(local.env_base, local.env_payments, local.env_scheduler, local.env_events)
  policies             = local.booking_policies
}

module "fn_hold_expirer" {
  source               = "../../modules/lambda_node"
  role_prefix          = local.role_prefix
  permissions_boundary = local.permissions_boundary
  name                 = "${local.name_prefix}-hold-expirer"
  description          = "Libera las butacas de un hold no pagado al caducar"
  source_dir           = "${local.backend_dist}/hold-expirer"
  environment          = local.env_base
  policies             = { table = data.aws_iam_policy_document.table_write.json }
}

module "fn_reminder" {
  source               = "../../modules/lambda_node"
  role_prefix          = local.role_prefix
  permissions_boundary = local.permissions_boundary
  name                 = "${local.name_prefix}-reminder"
  description          = "Email de recordatorio antes de la sesión"
  source_dir           = "${local.backend_dist}/reminder"
  environment          = merge(local.env_base, local.env_mail)
  policies = {
    table = data.aws_iam_policy_document.table_read.json
    ses   = data.aws_iam_policy_document.ses_send.json
  }
}

module "fn_notifier" {
  source               = "../../modules/lambda_node"
  role_prefix          = local.role_prefix
  permissions_boundary = local.permissions_boundary
  name                 = "${local.name_prefix}-notifier"
  description          = "Consume la cola de notificaciones y envía emails por SES"
  source_dir           = "${local.backend_dist}/notifier"
  timeout              = 30
  environment          = merge(local.env_base, local.env_mail)
  policies = {
    table = data.aws_iam_policy_document.table_read.json
    ses   = data.aws_iam_policy_document.ses_send.json
    queue = data.aws_iam_policy_document.notifications_consume.json
  }
}

module "fn_stream_processor" {
  source               = "../../modules/lambda_node"
  role_prefix          = local.role_prefix
  permissions_boundary = local.permissions_boundary
  name                 = "${local.name_prefix}-stream-processor"
  description          = "DynamoDB Streams: auditoría, eventos de dominio y push WebSocket"
  source_dir           = "${local.backend_dist}/stream-processor"
  timeout              = 60
  memory_size          = 512
  environment = merge(local.env_base, local.env_events, {
    WS_MANAGEMENT_ENDPOINT = module.websocket.management_endpoint
  })
  policies = {
    table  = data.aws_iam_policy_document.table_write.json
    stream = data.aws_iam_policy_document.table_stream.json
    events = data.aws_iam_policy_document.events_publish.json
    ws     = data.aws_iam_policy_document.ws_push.json
  }
}

module "fn_websocket" {
  source               = "../../modules/lambda_node"
  role_prefix          = local.role_prefix
  permissions_boundary = local.permissions_boundary
  name                 = "${local.name_prefix}-websocket"
  description          = "$connect/$disconnect del API WebSocket (suscripción por sesión)"
  source_dir           = "${local.backend_dist}/websocket"
  environment          = local.env_base
  policies             = { table = data.aws_iam_policy_document.table_write.json }
}

locals {
  all_functions = [
    module.fn_health.function_name,
    module.fn_catalog.function_name,
    module.fn_booking.function_name,
    module.fn_admin.function_name,
    module.fn_stripe_webhook.function_name,
    module.fn_hold_expirer.function_name,
    module.fn_reminder.function_name,
    module.fn_notifier.function_name,
    module.fn_stream_processor.function_name,
    module.fn_websocket.function_name,
  ]
}

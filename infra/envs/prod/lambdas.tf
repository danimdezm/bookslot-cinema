locals {
  booking_policies = {
    table     = data.aws_iam_policy_document.table_write.json
    scheduler = data.aws_iam_policy_document.scheduler.json
    events    = data.aws_iam_policy_document.events_publish.json
  }

  lambdas = {
    health = {
      description = "Health check y eco de claims JWT"
      environment = { APP_ENV = var.environment }
      policies    = {}
    }
    catalog = {
      description = "Cartelera, sesiones y mapa de butacas (solo lectura)"
      environment = local.env_base
      policies    = { table = data.aws_iam_policy_document.table_read.json }
    }
    booking = {
      description = "Holds, pago, confirmación y cancelación (control de concurrencia)"
      timeout     = 15
      memory_size = 512
      environment = merge(local.env_base, local.env_scheduler, local.env_events)
      policies    = local.booking_policies
    }
    admin = {
      description = "Panel de administración: catálogo, bloqueo de sesiones, reservas y auditoría"
      timeout     = 29
      memory_size = 512
      environment = merge(local.env_base, local.env_scheduler, local.env_events)
      policies    = local.booking_policies
    }
    hold-expirer = {
      description = "Libera las butacas de un hold no pagado al caducar"
      environment = local.env_base
      policies    = { table = data.aws_iam_policy_document.table_write.json }
    }
    reminder = {
      description = "Email de recordatorio antes de la sesión"
      environment = merge(local.env_base, local.env_mail)
      policies = {
        table = data.aws_iam_policy_document.table_read.json
        ses   = data.aws_iam_policy_document.ses_send.json
      }
    }
    notifier = {
      description = "Consume la cola de notificaciones y envía emails por SES"
      timeout     = 30
      environment = merge(local.env_base, local.env_mail)
      policies = {
        table = data.aws_iam_policy_document.table_read.json
        ses   = data.aws_iam_policy_document.ses_send.json
        queue = data.aws_iam_policy_document.notifications_consume.json
      }
    }
    stream-processor = {
      description = "DynamoDB Streams: auditoría, eventos de dominio y push WebSocket"
      timeout     = 60
      memory_size = 512
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
  }
}

module "lambda" {
  for_each = local.lambdas

  source               = "../../modules/lambda_node"
  name                 = "${local.name_prefix}-${each.key}"
  description          = each.value.description
  source_dir           = "${local.backend_dist}/${each.key}"
  timeout              = try(each.value.timeout, 10)
  memory_size          = try(each.value.memory_size, 256)
  environment          = each.value.environment
  policies             = each.value.policies
  role_prefix          = local.role_prefix
  permissions_boundary = local.permissions_boundary
}

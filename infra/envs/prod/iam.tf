data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  role_prefix          = var.iam_role_prefix
  permissions_boundary = var.permissions_boundary_name == "" ? null : "arn:aws:iam::${data.aws_caller_identity.current.account_id}:policy/${var.permissions_boundary_name}"
  table_resources      = [module.table.arn, "${module.table.arn}/index/*"]
  schedules_arn        = "arn:aws:scheduler:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:schedule/${aws_scheduler_schedule_group.this.name}/*"
}

data "aws_iam_policy_document" "table_read" {
  statement {
    actions   = ["dynamodb:GetItem", "dynamodb:BatchGetItem", "dynamodb:Query"]
    resources = local.table_resources
  }
}

data "aws_iam_policy_document" "table_write" {
  statement {
    actions = [
      "dynamodb:GetItem",
      "dynamodb:BatchGetItem",
      "dynamodb:Query",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
      "dynamodb:BatchWriteItem",
      "dynamodb:ConditionCheckItem",
    ]
    resources = local.table_resources
  }
}

data "aws_iam_policy_document" "table_stream" {
  statement {
    actions = [
      "dynamodb:DescribeStream",
      "dynamodb:GetRecords",
      "dynamodb:GetShardIterator",
      "dynamodb:ListStreams",
    ]
    resources = [module.table.stream_arn]
  }

  statement {
    actions   = ["sqs:SendMessage"]
    resources = [aws_sqs_queue.stream_dlq.arn]
  }
}

data "aws_iam_policy_document" "scheduler" {
  statement {
    actions   = ["scheduler:CreateSchedule", "scheduler:DeleteSchedule"]
    resources = [local.schedules_arn]
  }

  statement {
    actions   = ["iam:PassRole"]
    resources = [aws_iam_role.scheduler.arn]

    condition {
      test     = "StringEquals"
      variable = "iam:PassedToService"
      values   = ["scheduler.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "events_publish" {
  statement {
    actions   = ["events:PutEvents"]
    resources = [module.events.bus_arn]
  }
}

data "aws_iam_policy_document" "ws_push" {
  statement {
    actions   = ["execute-api:ManageConnections"]
    resources = [module.websocket.connections_arn]
  }
}

data "aws_iam_policy_document" "notifications_consume" {
  statement {
    actions = [
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:ChangeMessageVisibility",
      "sqs:GetQueueAttributes",
    ]
    resources = [module.events.queue_arn]
  }
}

data "aws_iam_policy_document" "ses_send" {
  statement {
    actions   = ["ses:SendEmail"]
    resources = ["arn:aws:ses:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:identity/*"]

    condition {
      test     = "StringEquals"
      variable = "ses:FromAddress"
      values   = [var.sender_email]
    }
  }
}

data "aws_iam_policy_document" "scheduler_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["scheduler.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }
}

resource "aws_iam_role" "scheduler" {
  name                 = "${local.role_prefix}${local.name_prefix}-scheduler"
  assume_role_policy   = data.aws_iam_policy_document.scheduler_assume.json
  permissions_boundary = local.permissions_boundary
}

data "aws_iam_policy_document" "scheduler_invoke" {
  statement {
    actions   = ["lambda:InvokeFunction"]
    resources = [module.fn_hold_expirer.arn, module.fn_reminder.arn]
  }
}

resource "aws_iam_role_policy" "scheduler_invoke" {
  name   = "invoke-targets"
  role   = aws_iam_role.scheduler.id
  policy = data.aws_iam_policy_document.scheduler_invoke.json
}

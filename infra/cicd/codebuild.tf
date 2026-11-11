resource "aws_cloudwatch_log_group" "build" {
  name              = "/aws/codebuild/${local.name}-deploy"
  retention_in_days = 30
}

resource "aws_codebuild_project" "deploy" {
  name          = "${local.name}-deploy"
  service_role  = aws_iam_role.build.arn
  build_timeout = 30

  source {
    type      = "CODEPIPELINE"
    buildspec = "buildspec.yml"
  }

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    type         = "LINUX_CONTAINER"
    compute_type = "BUILD_GENERAL1_SMALL"
    image        = "aws/codebuild/amazonlinux-x86_64-standard:6.0"

    environment_variable {
      name  = "TF_STATE_BUCKET"
      value = local.state_bucket
    }
    environment_variable {
      name  = "TF_VAR_owner"
      value = var.owner
    }
    environment_variable {
      name  = "TF_VAR_alarm_email"
      value = var.alarm_email
    }
    environment_variable {
      name  = "TF_VAR_sender_email"
      value = var.sender_email
    }
  }

  logs_config {
    cloudwatch_logs {
      group_name = aws_cloudwatch_log_group.build.name
    }
  }
}

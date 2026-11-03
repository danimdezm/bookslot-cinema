data "aws_caller_identity" "current" {}

locals {
  name         = "${var.project}-prod"
  account_id   = data.aws_caller_identity.current.account_id
  state_bucket = "${var.project}-tfstate-${local.account_id}"
  boundary_arn = "arn:aws:iam::${local.account_id}:policy/${var.permissions_boundary_name}"
}

resource "aws_codestarconnections_connection" "github" {
  name          = "${var.project}-github"
  provider_type = "GitHub"
}

resource "aws_s3_bucket" "artifacts" {
  bucket        = "${local.name}-pipeline-${local.account_id}"
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "artifacts" {
  bucket                  = aws_s3_bucket.artifacts.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudwatch_log_group" "build" {
  name              = "/aws/codebuild/${local.name}-deploy"
  retention_in_days = 30
}

resource "aws_iam_role" "build" {
  name                 = "${var.iam_role_prefix}${local.name}-deploy"
  permissions_boundary = local.boundary_arn
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "codebuild.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "build" {
  name = "deploy"
  role = aws_iam_role.build.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ProjectServices"
        Effect = "Allow"
        Action = [
          "apigateway:*", "lambda:*", "dynamodb:*", "cognito-idp:*", "ses:*", "sqs:*",
          "events:*", "scheduler:*", "logs:*", "cloudwatch:*", "sns:*",
          "xray:*", "s3:*", "cloudfront:*", "budgets:*", "sts:GetCallerIdentity",
        ]
        Resource = "*"
      },
      {
        Sid      = "ReadIam"
        Effect   = "Allow"
        Action   = ["iam:Get*", "iam:List*"]
        Resource = "*"
      },
      {
        Sid      = "PassProjectRoles"
        Effect   = "Allow"
        Action   = "iam:PassRole"
        Resource = "arn:aws:iam::${local.account_id}:role/${var.iam_role_prefix}${local.name}-*"
      },
    ]
  })
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

resource "aws_iam_role" "pipeline" {
  name                 = "${var.iam_role_prefix}${local.name}-pipeline"
  permissions_boundary = local.boundary_arn
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "codepipeline.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "pipeline" {
  name = "pipeline"
  role = aws_iam_role.pipeline.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:GetObjectVersion", "s3:PutObject", "s3:GetBucketVersioning"]
        Resource = [aws_s3_bucket.artifacts.arn, "${aws_s3_bucket.artifacts.arn}/*"]
      },
      {
        Effect   = "Allow"
        Action   = ["codestar-connections:UseConnection", "codeconnections:UseConnection"]
        Resource = aws_codestarconnections_connection.github.arn
      },
      {
        Effect   = "Allow"
        Action   = ["codebuild:StartBuild", "codebuild:BatchGetBuilds"]
        Resource = aws_codebuild_project.deploy.arn
      },
    ]
  })
}

resource "aws_codepipeline" "deploy" {
  name           = "${local.name}-deploy"
  role_arn       = aws_iam_role.pipeline.arn
  pipeline_type  = "V2"
  execution_mode = "QUEUED"

  artifact_store {
    type     = "S3"
    location = aws_s3_bucket.artifacts.bucket
  }

  trigger {
    provider_type = "CodeStarSourceConnection"
    git_configuration {
      source_action_name = "Source"
      push {
        branches {
          includes = [var.branch]
        }
      }
    }
  }

  stage {
    name = "Source"
    action {
      name             = "Source"
      category         = "Source"
      owner            = "AWS"
      provider         = "CodeStarSourceConnection"
      version          = "1"
      output_artifacts = ["source"]
      configuration = {
        ConnectionArn    = aws_codestarconnections_connection.github.arn
        FullRepositoryId = var.github_repo
        BranchName       = var.branch
      }
    }
  }

  stage {
    name = "Deploy"
    action {
      name            = "Deploy"
      category        = "Build"
      owner           = "AWS"
      provider        = "CodeBuild"
      version         = "1"
      input_artifacts = ["source"]
      configuration = {
        ProjectName = aws_codebuild_project.deploy.name
      }
    }
  }
}

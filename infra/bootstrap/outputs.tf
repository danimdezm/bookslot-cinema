output "state_bucket" {
  value = aws_s3_bucket.tfstate.bucket
}

output "github_deploy_role_arn" {
  description = "Guardar como secret AWS_DEPLOY_ROLE_ARN en GitHub"
  value       = aws_iam_role.github_deploy.arn
}

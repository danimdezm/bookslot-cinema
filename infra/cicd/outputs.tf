output "pipeline_name" {
  value = aws_codepipeline.deploy.name
}

output "connection_status" {
  value = aws_codestarconnections_connection.github.connection_status
}

output "connection_url" {
  value = "https://${var.region}.console.aws.amazon.com/codesuite/settings/connections"
}

output "api_id" {
  value = aws_apigatewayv2_api.this.id
}

output "endpoint" {
  value = aws_apigatewayv2_api.this.api_endpoint
}

output "execution_arn" {
  value = aws_apigatewayv2_api.this.execution_arn
}

output "stage_name" {
  value = aws_apigatewayv2_stage.default.name
}

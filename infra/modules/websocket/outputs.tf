output "api_id" {
  value = aws_apigatewayv2_api.this.id
}

output "url" {
  description = "wss://… para el frontend"
  value       = aws_apigatewayv2_stage.this.invoke_url
}

output "management_endpoint" {
  description = "https://… para PostToConnection (WS_MANAGEMENT_ENDPOINT)"
  value       = "https://${aws_apigatewayv2_api.this.id}.execute-api.${data.aws_region.current.region}.amazonaws.com/${aws_apigatewayv2_stage.this.name}"
}

output "connections_arn" {
  description = "ARN para execute-api:ManageConnections"
  value       = "${aws_apigatewayv2_api.this.execution_arn}/${aws_apigatewayv2_stage.this.name}/POST/@connections/*"
}

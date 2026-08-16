output "data_volume_id" {
  description = "Persistent EBS volume ID for DeepSeek Harness data"
  value       = aws_ebs_volume.dsh_data.id
}

output "availability_zone" {
  description = "Availability Zone of the persistent EBS volume"
  value       = aws_ebs_volume.dsh_data.availability_zone
}

output "secret_arn" {
  description = "ARN of the DeepSeek API key secret"
  value       = aws_secretsmanager_secret.deepseek_api_key.arn
}

output "secret_name" {
  description = "Name of the DeepSeek API key secret"
  value       = aws_secretsmanager_secret.deepseek_api_key.name
}
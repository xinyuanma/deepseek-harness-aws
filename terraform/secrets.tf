resource "aws_secretsmanager_secret" "deepseek_api_key" {
  name                    = var.secret_name
  description             = "DeepSeek API key for DeepSeek Harness"
  recovery_window_in_days = 0

  tags = {
    Project = "deepseek-harness"
  }
}
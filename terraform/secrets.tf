resource "aws_secretsmanager_secret" "deepseek_api_key" {
  name        = "deepseek-harness/deepseek-api-key"
  description = "DeepSeek API key for DeepSeek Harness"

  tags = {
    Project = "deepseek-harness"
  }
}
resource "aws_secretsmanager_secret" "deepseek_api_key" {
  name                    = var.secret_name
  description             = "DeepSeek API key for DeepSeek Harness"
  recovery_window_in_days = 0

  tags = {
    Project = "deepseek-harness"
  }
}

resource "aws_secretsmanager_secret" "discord_bot_token" {
  name                    = var.discord_secret_name
  description             = "Discord bot token for DeepSeek Harness Discord integration"
  recovery_window_in_days = 0

  tags = {
    Project = "deepseek-harness"
  }
}
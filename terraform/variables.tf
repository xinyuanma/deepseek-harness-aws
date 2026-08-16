variable "aws_region" {
  description = "AWS region where the infrastructure will be deployed"
  type        = string
  default     = "eu-north-1"
}

variable "instance_type" {
  description = "EC2 instance type used to run and build DeepSeek Harness"
  type        = string
  default     = "t3.small"
}

variable "root_volume_size" {
  description = "Size of the EC2 root EBS volume in GiB"
  type        = number
  default     = 20

  validation {
    condition     = var.root_volume_size >= 8
    error_message = "root_volume_size must at least 8 GiB."
  }
}

variable "repository_url" {
  description = "Git repository containing the DeepSeek Harness deployment source"
  type        = string
  default     = "https://github.com/xinyuanma/deepseek-harness-aws.git"
}

variable "repository_ref" {
  description = "Git branch or tag to deploy"
  type        = string
  default     = "main"
}

variable "secret_name" {
  description = "AWS Secrets Manager secret containing the DeepSeek API key"
  type        = string
  default     = "deepseek-harness/deepseek-api-key"
}

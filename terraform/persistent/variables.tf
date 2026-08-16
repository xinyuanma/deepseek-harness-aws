variable "aws_region" {
  description = "AWS region for persistent DeepSeek Harness data"
  type        = string
  default     = "eu-north-1"
}

variable "availability_zone" {
  description = "Availability Zone where the persistent EBS volume will be created"
  type        = string
  default     = "eu-north-1b"
}

variable "data_volume_size" {
  description = "Size of the persistent DSH data volume in GiB"
  type        = number
  default     = 20

  validation {
    condition     = var.data_volume_size >= 8
    error_message = "data_volume_size must be at least 8 GiB."
  }
}
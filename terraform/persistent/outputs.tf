output "data_volume_id" {
  description = "Persistent EBS volume ID for DeepSeek Harness data"
  value       = aws_ebs_volume.dsh_data.id
}

output "availability_zone" {
  description = "Availability Zone of the persistent EBS volume"
  value       = aws_ebs_volume.dsh_data.availability_zone
}
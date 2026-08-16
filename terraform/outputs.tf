output "instance_id" {
  description = "EC2 instance ID for the DeepSeek Harness host"
  value       = aws_instance.agent.id
}

output "ssm_shell_command" {
  description = "Command to open an SSM shell session to the EC2 instance"
  value       = "aws ssm start-session --target ${aws_instance.agent.id}"
}

output "web_ui_forward_command" {
  description = "Command to forward the DeepSeek Harness Web UI to localhost:3080"
  value       = "aws ssm start-session --target ${aws_instance.agent.id} --document-name AWS-StartPortForwardingSession --parameters '{\"portNumber\":[\"3080\"],\"localPortNumber\":[\"3080\"]}'"
}
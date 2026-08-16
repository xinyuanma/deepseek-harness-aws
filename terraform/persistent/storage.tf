resource "aws_ebs_volume" "dsh_data" {
  availability_zone = var.availability_zone
  size              = var.data_volume_size
  type              = "gp3"
  encrypted         = true

  tags = {
    Name    = "deepseek-harness-data"
    Project = "deepseek-harness"
    Purpose = "persistent-data"
  }
}
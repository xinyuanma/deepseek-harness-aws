data "aws_ami" "ubuntu" {
  most_recent = true

  owners = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_instance" "agent" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = "t3.small"
  user_data                   = file("${path.module}/../bootstrap/cloud-init.yaml")
  user_data_replace_on_change = true
  subnet_id                   = aws_subnet.public.id

  vpc_security_group_ids = [
    aws_security_group.agent.id
  ]

  iam_instance_profile = aws_iam_instance_profile.ec2.name

  associate_public_ip_address = true

  root_block_device {
    volume_type = "gp3"
    volume_size = 20
    encrypted   = true
  }

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }

  tags = {
    Name    = "deepseek-harness-agent"
    Project = "deepseek-harness"
  }
}
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
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type
  user_data = templatefile(
    "${path.module}/../bootstrap/cloud-init.yaml.tftpl",
    {
      repository_url = var.repository_url
      repository_ref = var.repository_ref
      secret_name    = var.secret_name
      data_volume_id = data.terraform_remote_state.persistent.outputs.data_volume_id
    }
  )
  user_data_replace_on_change = true
  subnet_id                   = aws_subnet.public.id

  vpc_security_group_ids = [
    aws_security_group.agent.id
  ]

  iam_instance_profile = aws_iam_instance_profile.ec2.name

  depends_on = [
    aws_iam_role_policy.deepseek_secret,
    aws_iam_role_policy_attachment.ssm
  ]

  associate_public_ip_address = true

  root_block_device {
    volume_type = "gp3"
    volume_size = var.root_volume_size
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
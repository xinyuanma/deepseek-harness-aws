data "terraform_remote_state" "persistent" {
  backend = "local"

  config = {
    path = "${path.module}/persistent/terraform.tfstate"
  }
}

resource "aws_volume_attachment" "dsh_data" {
  device_name = "/dev/sdf"
  volume_id   = data.terraform_remote_state.persistent.outputs.data_volume_id
  instance_id = aws_instance.agent.id
}
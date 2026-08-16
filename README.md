# DeepSeek Harness on AWS

Deploy DeepSeek Harness on AWS with Terraform and Docker, persistent EBS storage, and access through AWS Systems Manager (SSM).

> **Compute is disposable; DSH state is persistent.**

The EC2 instance can be destroyed and recreated while DeepSeek Harness conversations, settings, and workspace data remain on a separate persistent EBS volume.

## What you get

- Terraform-managed AWS infrastructure
- DeepSeek Harness built on the EC2 instance instead of requiring a prebuilt project image
- Docker Compose runtime
- Persistent EBS storage for DSH state and workspace data
- AWS Systems Manager Session Manager access instead of inbound SSH
- Web UI access through SSM port forwarding
- Optional DeepSeek API key injection from AWS Secrets Manager
- Separate persistent and disposable compute lifecycles

## Architecture

```text
Persistent layer — terraform/persistent/
├── EBS data volume
└── Secrets Manager secret
        │
        │ remote-state outputs
        ▼
Compute layer — terraform/
├── VPC / subnet / routing
├── security group
├── IAM role / instance profile
├── EC2 instance
└── EBS attachment
        │
        ▼
cloud-init
├── install dependencies
├── clone repository
├── identify and mount persistent EBS
├── optionally read DeepSeek API key
├── build Docker image
└── start DeepSeek Harness
        │
        ▼
Docker
├── /root/.dsh  -> persistent EBS
└── /workspace  -> persistent EBS
```

Destroying the compute layer does **not** destroy the persistent EBS volume or Secrets Manager secret.

## Prerequisites

You need an AWS account, AWS CLI, Terraform, Git, configured AWS credentials, and a DeepSeek API key for inference.

Verify your tools and AWS authentication:

```bash
aws --version
terraform version
git --version
aws sts get-caller-identity
```

If your AWS login/session has expired, authenticate again before running Terraform.

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/xinyuanma/deepseek-harness-aws.git
cd deepseek-harness-aws
```

### 2. Deploy the persistent layer

```bash
cd terraform/persistent
terraform init
terraform fmt
terraform validate
terraform plan
terraform apply
```

Review the plan before approving it.

By default this creates a 20 GiB encrypted gp3 EBS volume and an AWS Secrets Manager secret.

Current defaults:

```text
AWS region:        eu-north-1
Availability Zone: eu-north-1b
```

> **Important:** the persistent EBS volume and EC2 instance must use the same Availability Zone. If you change `availability_zone`, use the same value in both Terraform layers.

### 3. Deploy the compute layer

```bash
cd ..
terraform init
terraform fmt
terraform validate
terraform plan
terraform apply
```

The default EC2 instance type is `t3.small`.

Terraform creates the compute infrastructure and attaches the persistent EBS volume. Cloud-init then installs the required software, clones this repository, mounts the persistent volume, builds the Docker image, and starts DeepSeek Harness.

### 4. Wait for bootstrap

Get the SSM command:

```bash
terraform output -raw ssm_shell_command
```

Run the command it prints. Inside EC2:

```bash
sudo cloud-init status --wait
sudo docker ps
```

A successful bootstrap ends with `status: done`, and `docker ps` should show the `deepseek-harness` container.

### 5. Open the Web UI

From your local machine:

```bash
terraform output -raw web_ui_forward_command
```

Run the command it prints, then open:

```text
http://localhost:3080
```

The Web UI is forwarded through AWS Systems Manager; no public inbound Web UI port is required.

### 6. Configure the DeepSeek API key

For a normal first-time deployment, configure your DeepSeek API key in the DeepSeek Harness Web UI.

If no usable API key exists in AWS Secrets Manager, bootstrap continues and Harness starts without one. You can then add the API key through the UI and start using DeepSeek Harness.

## Optional: Secrets Manager API key injection

The persistent Terraform layer creates a Secrets Manager secret named by default:

```text
deepseek-harness/deepseek-api-key
```

If that secret already contains a valid value, cloud-init retrieves it and injects it into the Harness container automatically.

This is optional. The default open-source onboarding path does **not** require users to place their API key in Terraform.

Do not put API keys directly in committed Terraform files, `.tfvars`, Dockerfiles, or the repository.

## Persistent Data

Docker mounts:

```text
/mnt/dsh-data/dsh       -> /root/.dsh
/mnt/dsh-data/workspace -> /workspace
```

The persistent EBS volume stores DSH state, including conversations/settings, as well as workspace data.

The persistence lifecycle has been tested end to end by creating a real DSH conversation, destroying the entire compute layer, rebuilding it from scratch, reattaching the existing EBS volume, and confirming that the original conversation was restored.

## Destroy and Recreate Compute

To remove the EC2 instance and compute infrastructure while keeping DSH data:

```bash
cd terraform
terraform plan -destroy
terraform destroy
```

This removes the compute lifecycle domain but does **not** destroy resources managed by `terraform/persistent/`.

Later, recreate compute with:

```bash
terraform apply
```

The new EC2 instance will attach the existing EBS volume and reuse the persisted DSH state.

## Permanently Delete Persistent Resources

> **WARNING: This is destructive.** Destroying the persistent Terraform layer can permanently delete your DSH data. Always review the destroy plan first.

Remove compute first:

```bash
cd terraform
terraform destroy
```

Then, only if you intentionally want to remove persistent resources:

```bash
cd persistent
terraform plan -destroy
terraform destroy
```

Do not destroy the persistent layer if you expect conversations or workspace data to survive.

## Useful Commands

```bash
# SSM shell
terraform output -raw ssm_shell_command

# Web UI tunnel
terraform output -raw web_ui_forward_command

# Bootstrap status
sudo cloud-init status --long
sudo cloud-init status --wait

# Container status
sudo docker ps

# Persistent storage
lsblk -o NAME,SIZE,FSTYPE,MOUNTPOINTS,SERIAL
df -h /mnt/dsh-data
sudo du -sh /mnt/dsh-data/dsh

# Bootstrap logs
sudo tail -n 100 /var/log/cloud-init-output.log
```

Confirm Docker mounts:

```bash
sudo docker inspect deepseek-harness   --format '{{range .Mounts}}{{println .Source "->" .Destination}}{{end}}'
```

Expected:

```text
/mnt/dsh-data/dsh -> /root/.dsh
/mnt/dsh-data/workspace -> /workspace
```

## Troubleshooting

### Terraform cannot find AWS credentials

First verify:

```bash
aws sts get-caller-identity
```

If necessary, reauthenticate your AWS CLI session.

If you authenticated using the newer `aws login` flow and the AWS CLI works but Terraform reports:

```text
No valid credential sources found
failed to refresh cached credentials, load login token: token file not found
```

create a compatibility profile using `credential_process`. Replace `YOUR_LOGIN_PROFILE` with the profile used for `aws login`:

```bash
aws configure set credential_process   "aws configure export-credentials --profile YOUR_LOGIN_PROFILE --format process"   --profile terraform

aws configure set region eu-north-1 --profile terraform
```

On macOS/Linux:

```bash
export AWS_PROFILE=terraform
```

On Windows PowerShell:

```powershell
$env:AWS_PROFILE="terraform"
```

Then verify and retry:

```bash
aws sts get-caller-identity
terraform plan
```

### SSM does not connect immediately

The instance may still be starting and registering with Systems Manager. Wait briefly and retry:

```bash
terraform output -raw ssm_shell_command
```

### `docker ps` is empty immediately after `terraform apply`

Terraform can finish creating EC2 before cloud-init finishes installation and Docker startup:

```bash
sudo cloud-init status --wait
sudo docker ps
```

### API key is missing

A missing Secrets Manager value does not prevent Harness from starting. Open the Web UI and configure the DeepSeek API key there.

### EBS does not attach

Confirm that the persistent EBS volume and EC2 instance use the same Availability Zone. EBS volumes cannot attach across Availability Zones.

## Security Notes

This deployment avoids exposing the Harness Web UI or SSH through inbound Internet-facing ports. Administrative shell access and Web UI forwarding use AWS Systems Manager.

Additional characteristics:

- encrypted persistent EBS storage
- IAM-based EC2 access to the configured Secrets Manager secret
- API keys are not baked into the Docker image
- Terraform state, `.tfvars`, and `.env` files are ignored by Git

Always review Terraform plans before applying or destroying infrastructure.

For production or multi-user environments, review the configuration against your organization's AWS security, IAM, networking, logging, backup, and state-management requirements.

## Repository Structure

```text
deepseek-harness-aws/
├── app/
│   ├── Dockerfile
│   └── docker-compose.yml
├── bootstrap/
│   └── cloud-init.yaml.tftpl
├── terraform/
│   ├── persistent/
│   │   ├── providers.tf
│   │   ├── variables.tf
│   │   ├── storage.tf
│   │   ├── secrets.tf
│   │   ├── outputs.tf
│   │   └── terraform.tfvars.example
│   ├── compute.tf
│   ├── iam.tf
│   ├── network.tf
│   ├── outputs.tf
│   ├── providers.tf
│   └── variables.tf
├── LICENSE
└── README.md
```

## Project Status

The core deployment and persistence lifecycle has been validated end to end on AWS.

A clean-room deployment was completed using a fresh Git clone and a separate AWS account with no pre-existing Terraform state, EBS volume, or Secrets Manager value. The validated flow included:

- persistent infrastructure provisioning
- compute infrastructure provisioning
- EC2 bootstrap
- first-time EBS formatting and mounting
- startup without a preconfigured API key
- SSM shell access and Web UI port forwarding
- API key configuration through the Web UI
- successful DeepSeek inference
- conversation persistence across compute destruction and recreation

## License

This project is licensed under the MIT License. See `LICENSE` for details.

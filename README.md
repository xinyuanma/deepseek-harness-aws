# DeepSeek Harness on AWS

A production-oriented deployment and integration layer for running [DeepSeek Harness](https://github.com/deepseek-ai/DeepSeek-Harness) on AWS with Terraform, Docker Compose, persistent EBS storage, AWS Systems Manager, Secrets Manager, and an optional Discord adapter.

> **Compute is disposable; DSH state is persistent.**

The EC2 instance can be destroyed and recreated while DeepSeek Harness state, Discord conversation history, and shared workspace data remain on a separate persistent EBS volume.

## What You Get

- Terraform-managed AWS infrastructure
- Ubuntu 24.04 EC2 deployment
- DeepSeek Harness pinned to `0.1.0-rc.8`
- Docker Compose runtime
- Persistent encrypted EBS storage
- AWS Systems Manager Session Manager access instead of inbound SSH
- Web UI access through SSM port forwarding
- DeepSeek API key injection from AWS Secrets Manager
- Optional Discord bot integration
- Discord conversation resume across process, container, and EC2 replacement
- Separate Web and Discord session ownership
- Shared persistent workspace where intentional
- Disposable compute and durable data lifecycles

## Architecture

```text
AWS Secrets Manager
├── deepseek-harness/deepseek-api-key
└── deepseek-harness/discord-bot-token
             │
             │ IAM GetSecretValue
             ▼

Persistent layer — terraform/persistent/
├── encrypted EBS data volume
├── DeepSeek API key secret
└── Discord bot token secret metadata
             │
             │ remote-state outputs
             ▼

Compute layer — terraform/
├── VPC / public subnet / routing
├── security group
├── IAM role / instance profile
├── SSM access
├── EC2 instance
└── persistent EBS attachment
             │
             ▼

cloud-init
├── installs Docker / Compose / AWS CLI
├── clones this repository
├── finds and mounts persistent EBS
├── fetches runtime secrets
├── builds both containers
└── starts Docker Compose
             │
             ▼

EC2
│
├── DSH Web runtime
│   ├── localhost:3080
│   ├── /root/.dsh
│   └── /workspace
│
└── Discord adapter runtime
    ├── discord.js
    ├── official DSH SDK client
    ├── resume-aware JSON-RPC runtime
    ├── /data/sessions
    └── /workspace
             │
             ▼

Persistent EBS
/mnt/dsh-data/
├── dsh/
├── workspace/
└── discord-sessions/
```

The Web UI is not exposed directly to the Internet. Access is provided through AWS Systems Manager port forwarding.

Discord does not require an inbound port. The adapter connects outbound to Discord.

## Persistence Model

The deployment intentionally separates session ownership:

```text
Web runtime
└── owns Web sessions

Discord runtime
└── owns discord-<channelId> sessions
```

The current v1 persistence backend is JSONL.

A critical rule is:

```text
one live DSH session
→ one authoritative runtime owner
```

Do not allow the Web and Discord runtimes to live-own the same session simultaneously.

The runtimes may share the persistent workspace:

```text
/mnt/dsh-data/workspace
```

but session persistence is kept separate:

```text
Web:
  /mnt/dsh-data/dsh

Discord:
  /mnt/dsh-data/discord-sessions
```

## Prerequisites

You need:

- AWS account
- AWS CLI
- Terraform
- Git
- Docker for local testing
- configured AWS credentials
- DeepSeek API key
- optional Discord application / bot token

Verify:

```bash
aws --version
terraform version
git --version
aws sts get-caller-identity
```

If your AWS login session has expired, authenticate again before running Terraform.

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

Review the plan carefully before approving it.

By default, the persistent layer creates:

- a 20 GiB encrypted gp3 EBS volume
- a DeepSeek API key Secrets Manager secret
- a Discord bot token Secrets Manager secret

Default deployment location:

```text
AWS region:        eu-north-1
Availability Zone: eu-north-1b
```

> The persistent EBS volume and EC2 instance must use the same Availability Zone. EBS volumes cannot attach across Availability Zones.

### 3. Store the DeepSeek API key

Terraform creates the secret container but does not manage the secret value.

Write the API key directly through AWS Secrets Manager:

```bash
aws secretsmanager put-secret-value \
  --secret-id deepseek-harness/deepseek-api-key \
  --secret-string 'YOUR_DEEPSEEK_API_KEY'
```

Do not put the key in committed Terraform files, `.tfvars`, Dockerfiles, or Git history.

### 4. Optional: configure Discord

Create a Discord application and bot, then write the bot token directly into Secrets Manager:

```bash
aws secretsmanager put-secret-value \
  --secret-id deepseek-harness/discord-bot-token \
  --secret-string 'YOUR_DISCORD_BOT_TOKEN'
```

The token value is intentionally not managed by Terraform so it does not need to be stored in Terraform state.

If you do not want Discord integration, you can leave the Discord secret without a value. The Web runtime remains usable independently.

### 5. Deploy the compute layer

```bash
cd ..

terraform init
terraform fmt
terraform validate
terraform plan
terraform apply
```

The default EC2 instance type is:

```text
t3.small
```

Terraform creates the disposable compute layer and attaches the persistent EBS volume.

Cloud-init then:

1. installs Docker and AWS CLI
2. clones this repository
3. detects and mounts the persistent EBS volume
4. creates the persistent directories
5. fetches Secrets Manager values
6. builds the Web and Discord images
7. starts Docker Compose

### 6. Wait for bootstrap

Get the SSM shell command:

```bash
terraform output -raw ssm_shell_command
```

Run it.

Inside EC2:

```bash
sudo cloud-init status --wait
sudo docker ps
```

Successful bootstrap should end with:

```text
status: done
```

Expected containers:

```text
deepseek-harness
deepseek-harness-discord
```

If Discord is intentionally not configured, inspect its logs if it is restarting because of missing authentication.

### 7. Open the Web UI

From your local machine:

```bash
terraform output -raw web_ui_forward_command
```

Run the command it prints, then open:

```text
http://localhost:3080
```

The Web UI is accessed through SSM port forwarding.

No public inbound Web UI port is required.

## Discord Integration

The Discord adapter uses:

```text
Discord
  ↓
discord.js adapter
  ↓
official DeepSeek Harness SDK client
  ↓
JSON-RPC runtime
  ↓
DSH agent/session runtime
```

Current session mapping:

```text
Discord channel
→ one DSH session
```

Session IDs are deterministic:

```text
discord-<channelId>
```

This provides:

- same-channel conversation continuity
- channel isolation
- restart resume
- serialization within a single channel
- concurrency across different channels

### Discord UX behavior

Implemented behavior includes:

- long-response splitting below Discord message limits
- `(1/N)` pagination for multi-part responses
- `👀` while processing
- `✅` on success
- `❌` on failure
- refreshed typing indicator during long runs
- empty and whitespace-only input handling
- attachment-only friendly response
- text + attachment currently processes text only
- DSH runtime error extraction from the event stream
- empty final-response guard
- graceful `SIGINT` / `SIGTERM` shutdown

Full attachment and vision support are intentionally not implemented yet.

## Local Discord Development

The production Discord adapter lives in:

```text
integrations/discord/
```

Install:

```bash
cd integrations/discord
npm ci
```

Run tests:

```bash
npm test
npm run check
```

Start locally:

```bash
npm start
```

Expected environment variables:

```text
DEEPSEEK_API_KEY
DISCORD_BOT_TOKEN
```

Optional:

```text
DSH_MODEL
DSH_SESSION_ROOT
DSH_CWD
```

## Local Docker Test

Build the Discord adapter:

```bash
cd integrations/discord
docker build -t dsh-discord:local .
```

Example local volumes:

```bash
docker volume create dsh-discord-sessions
docker volume create dsh-discord-workspace
```

Run:

```bash
docker run --rm \
  --name dsh-discord \
  --env-file .env \
  -v dsh-discord-sessions:/data/sessions \
  -v dsh-discord-workspace:/workspace \
  dsh-discord:local
```

The container runs Node directly as PID 1 so `SIGINT` / `SIGTERM` reach the adapter and trigger graceful shutdown.

## Docker Compose

The production Compose stack is defined in:

```text
app/docker-compose.yml
```

It contains:

```text
harness
discord
```

The data root defaults to:

```text
/mnt/dsh-data
```

and can be overridden locally with:

```text
DSH_DATA_ROOT
```

For example:

```bash
export DSH_DATA_ROOT="$PWD/.local-data"
docker compose -f app/docker-compose.yml up --build
```

## Persistent Data

AWS bind mounts:

```text
/mnt/dsh-data/dsh
→ /root/.dsh

/mnt/dsh-data/workspace
→ /workspace

/mnt/dsh-data/discord-sessions
→ /data/sessions
```

The persistence lifecycle has been tested end to end across:

- graceful process restart
- clean npm reinstall
- Docker container deletion and recreation
- Docker Compose down/up
- EC2 destruction and replacement
- EBS reattachment
- Discord session resume
- older Discord conversation history recovery
- Web UI regression checks after replacement

## Destroy and Recreate Compute

To destroy the disposable compute layer while preserving EBS data:

```bash
cd terraform

terraform plan -destroy
terraform destroy
```

This removes resources managed by the compute Terraform layer but does not destroy resources managed by:

```text
terraform/persistent/
```

Later recreate the compute layer:

```bash
terraform apply
```

The new EC2 instance will attach the existing EBS volume.

Web state and Discord session history stored on the persistent volume remain available.

## Permanently Delete Persistent Resources

> **WARNING: destructive operation.**

Destroy compute first:

```bash
cd terraform
terraform destroy
```

Then, only if you intentionally want to delete persistent user data:

```bash
cd persistent
terraform plan -destroy
terraform destroy
```

Destroying the persistent layer may permanently remove conversation history, settings, Discord sessions, and workspace files.

## Useful Commands

### Terraform outputs

```bash
terraform output
terraform output -raw instance_id
terraform output -raw ssm_shell_command
terraform output -raw web_ui_forward_command
```

### EC2 bootstrap

```bash
sudo cloud-init status --long
sudo cloud-init status --wait
sudo tail -n 100 /var/log/cloud-init-output.log
```

### Docker

```bash
sudo docker ps
sudo docker logs --tail 100 deepseek-harness
sudo docker logs --tail 100 deepseek-harness-discord
```

### Storage

```bash
lsblk -o NAME,SIZE,FSTYPE,MOUNTPOINTS,SERIAL
df -h /mnt/dsh-data
sudo find /mnt/dsh-data -maxdepth 2 -type d | sort
sudo du -sh /mnt/dsh-data/*
```

### Verify container mounts

```bash
sudo docker inspect deepseek-harness \
  --format '{{range .Mounts}}{{println .Source "->" .Destination}}{{end}}'
```

```bash
sudo docker inspect deepseek-harness-discord \
  --format '{{range .Mounts}}{{println .Source "->" .Destination}}{{end}}'
```

## SDK Smoke Test

The `sdk-smoke/` directory is intentionally separate from the Discord adapter.

Its purpose is to validate the official DeepSeek Harness SDK/runtime independently of Discord-specific compatibility code.

Run:

```bash
cd sdk-smoke
npm ci
npm run smoke
```

Expected response:

```text
DSH SDK WORKS
```

## Security Model

This deployment intentionally minimizes inbound exposure.

### Web UI

The Harness Web UI is not exposed publicly.

Access path:

```text
local browser
↓
AWS SSM port forwarding
↓
127.0.0.1:3080 on EC2
↓
DSH Web
```

### SSH

No inbound SSH access is required for normal administration.

Use AWS Systems Manager Session Manager.

### Discord

The Discord adapter requires outbound network access but no inbound public port.

### Secrets

The EC2 IAM role is granted `secretsmanager:GetSecretValue` only for the configured DeepSeek and Discord secret ARNs.

Secret values are fetched at runtime.

Do not commit:

```text
.env
DISCORD_BOT_TOKEN
DEEPSEEK_API_KEY
.sessions/
node_modules/
*.tfstate
*.tfstate.*
```

Rotate credentials immediately if they are accidentally exposed.

## Known Limitations

### DSH rc.8 resume compatibility shim

Discord restart resume currently uses a local compatibility package:

```text
integrations/discord/resume-jsonrpc-server/
```

It subclasses the official compiled `HarnessSdkJsonRpcServer` and overrides session creation so an existing persisted session is resumed before a new session is created.

This shim is intentionally coupled to DeepSeek Harness `0.1.0-rc.8`.

The relevant DSH dependencies are therefore pinned to exact rc.8 versions.

When an upstream DeepSeek Harness release provides native resume behavior through the public SDK/runtime seam, this shim should be deleted rather than preserved indefinitely.

### JSONL session ownership

The current v1 persistence backend is JSONL.

Do not run multiple live writers against the same session.

### Discord attachments

Attachment and vision processing are not implemented yet.

Attachment-only messages receive a short unsupported-message response.

Messages containing both text and attachments currently process the text only.

## Troubleshooting

### Terraform cannot find AWS credentials

Verify:

```bash
aws sts get-caller-identity
```

Reauthenticate if necessary.

If you use an AWS CLI profile:

```bash
export AWS_PROFILE=YOUR_PROFILE
```

Then retry:

```bash
terraform plan
```

### SSM does not connect immediately

The instance may still be booting or registering with Systems Manager.

Check:

```bash
terraform output -raw instance_id
```

Then retry the SSM session.

### `docker ps` is empty after `terraform apply`

Terraform can finish before cloud-init finishes.

Inside EC2:

```bash
sudo cloud-init status --wait
sudo docker ps
```

If bootstrap failed:

```bash
sudo tail -n 200 /var/log/cloud-init-output.log
```

### Discord bot does not start

Check:

```bash
sudo docker logs --tail 100 deepseek-harness-discord
```

Common causes include:

- missing Discord token
- invalid or rotated Discord token
- missing DeepSeek API key
- dependency/runtime startup error

Verify secret presence without printing secret values.

### EBS does not attach

Ensure both persistent and compute layers use the same Availability Zone.

EBS volumes cannot attach across Availability Zones.

### Discord history does not resume

Check that:

```text
/mnt/dsh-data/discord-sessions
```

is mounted into:

```text
/data/sessions
```

and that the same Discord channel is being used.

Also verify that only one live Discord runtime owns the session.

## Repository Structure

```text
deepseek-harness-aws/
├── app/
│   ├── Dockerfile
│   └── docker-compose.yml
│
├── bootstrap/
│   └── cloud-init.yaml.tftpl
│
├── integrations/
│   └── discord/
│       ├── Dockerfile
│       ├── .dockerignore
│       ├── package.json
│       ├── package-lock.json
│       ├── discord-dsh.mjs
│       ├── discord-input.mjs
│       ├── discord-input.test.mjs
│       ├── discord-output.mjs
│       ├── discord-reactions.mjs
│       ├── dsh-result.mjs
│       ├── session-queue.mjs
│       ├── session-queue.test.mjs
│       ├── typing-indicator.mjs
│       ├── minimal.cordis.yml
│       └── resume-jsonrpc-server/
│           ├── package.json
│           └── index.mjs
│
├── sdk-smoke/
│   ├── package.json
│   ├── package-lock.json
│   ├── minimal.cordis.yml
│   └── smoke.mjs
│
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
│   ├── persistent-data.tf
│   ├── providers.tf
│   ├── variables.tf
│   └── terraform.tfvars.example
│
├── .gitignore
├── LICENSE
└── README.md
```

## Project Status

The following flows have been validated end to end:

```text
DSH Web deployment                         ✅
SSM shell access                           ✅
SSM Web port forwarding                    ✅
DeepSeek inference                         ✅
Persistent EBS mount                       ✅
Web persistence across EC2 replacement     ✅
Discord SDK integration                    ✅
Discord long responses                     ✅
Discord status reactions                   ✅
Continuous typing indicator                ✅
Per-channel session mapping                ✅
Same-session serialization                 ✅
Cross-session concurrency                  ✅
Graceful shutdown                          ✅
Discord restart resume                     ✅
Clean npm reinstall                        ✅
Dockerized Discord adapter                 ✅
Container replacement persistence          ✅
Docker Compose dual runtime                ✅
Discord persistence across EC2 replacement ✅
Web regression after Discord integration   ✅
```

## License

This project is licensed under the MIT License. See `LICENSE` for details.

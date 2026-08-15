resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"

  tags = {
    Name    = "deepseek-harness-vpc"
    Project = "deepseek-harness"
  }
}

resource "aws_subnet" "public" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.1.0/24"

  tags = {
    Name    = "deepseek-harness-public-subnet"
    Project = "deepseek-harness"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name    = "deepseek-harness-igw"
    Project = "deepseek-harness"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name    = "deepseek-harness-public-rt"
    Project = "deepseek-harness"
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_security_group" "agent" {
  name        = "deepseek-harness-agent"
  description = "Security group for DeepSeek Harness agent"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name    = "deepseek-harness-agent-sg"
    Project = "deepseek-harness"
  }
}

resource "aws_vpc_security_group_egress_rule" "agent_all" {
  security_group_id = aws_security_group.agent.id

  cidr_ipv4   = "0.0.0.0/0"
  ip_protocol = "-1"

  description = "Allow all outbound traffic"
}
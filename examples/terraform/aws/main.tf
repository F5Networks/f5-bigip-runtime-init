module "utils" {
  source = "../utils"
}

provider "aws" {
  region = var.region
}

resource "aws_vpc" "vpc" {
  cidr_block = "10.0.0.0/16"
  enable_dns_support = true
  enable_dns_hostnames = true
  tags = merge(var.global_tags, { Name="vpc-${module.utils.env_unique_id}" })
}

resource "aws_internet_gateway" "gateway" {
  vpc_id = aws_vpc.vpc.id
  tags = merge(var.global_tags, { Name="igw-${module.utils.env_unique_id}" })
}

resource "aws_route_table" "rt_mgmt" {
  vpc_id = aws_vpc.vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.gateway.id
  }

  tags = merge(var.global_tags, { Name="rt-${module.utils.env_unique_id}-mgmt" })

}

resource "aws_route_table" "rt_external" {
  vpc_id = aws_vpc.vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.gateway.id
  }

  tags = merge(var.global_tags, { Name="rt-${module.utils.env_unique_id}-external" })

}

resource "aws_route_table" "rt_internal" {
  vpc_id = aws_vpc.vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.gateway.id
  }

  tags = merge(var.global_tags, { Name="rt-${module.utils.env_unique_id}-internal" })
}

resource "aws_subnet" "subnet_az1_mgmt" {
  vpc_id = aws_vpc.vpc.id
  availability_zone = "${var.region}a"
  cidr_block = "10.0.0.0/24"
  tags = merge(var.global_tags, { Name="subnet-${module.utils.env_unique_id}-az1-mgmt" })
}

resource "aws_subnet" "subnet_az1_external" {
  vpc_id = aws_vpc.vpc.id
  availability_zone = "${var.region}a"
  cidr_block = "10.0.1.0/24"
  tags = merge(var.global_tags, { Name="subnet-${module.utils.env_unique_id}-az1-external" })
}

resource "aws_subnet" "subnet_az1_internal" {
  vpc_id = aws_vpc.vpc.id
  availability_zone = "${var.region}a"
  cidr_block = "10.0.2.0/24"
  tags = merge(var.global_tags, { Name="subnet-${module.utils.env_unique_id}-az1-internal" })
}

resource "aws_route_table_association" "rta_az1_mgmt" {
  subnet_id      = aws_subnet.subnet_az1_mgmt.id
  route_table_id = aws_route_table.rt_mgmt.id
}

resource "aws_route_table_association" "rta_az1_external" {
  subnet_id      = aws_subnet.subnet_az1_external.id
  route_table_id = aws_route_table.rt_external.id
}

resource "aws_route_table_association" "rta_az1_internal" {
  subnet_id      = aws_subnet.subnet_az1_internal.id
  route_table_id = aws_route_table.rt_internal.id
}

resource "aws_security_group" "sg_mgmt" {
  description = "External interface rules"
  vpc_id = aws_vpc.vpc.id

  # Allows SSH access
  ingress {
    from_port = 22
    to_port = 22
    protocol = 6
    cidr_blocks = var.AllowedIPs
  }

  # Allows GUI access
  ingress {
    from_port = 443
    to_port = 443
    protocol = 6
    cidr_blocks = var.AllowedIPs
  }

  ingress {
    from_port = 443
    to_port = 443
    protocol = 6
    security_groups = ["${aws_security_group.sg_external.id}"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.global_tags, { Name="sg-${module.utils.env_unique_id}-bigip-mgmt" })

}

resource "aws_security_group" "sg_external" {
  description = "External interface rules"
  vpc_id = aws_vpc.vpc.id

  # Allows vip service http
  ingress {
    from_port = 80
    to_port = 80
    protocol = 6
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allows vip service https
  ingress {
    from_port = 443
    to_port = 443
    protocol = 6
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allows network failover
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.global_tags, { Name="sg-${module.utils.env_unique_id}-bigip-external" })

}

resource "aws_security_group" "sg_internal" {
  description = "Internal interface rules"
  vpc_id = aws_vpc.vpc.id

  # Allows config-sync
  ingress {
    from_port = 4353
    to_port = 4353
    protocol = 6
    cidr_blocks = ["10.0.0.0/16"]
  }

  # Allows network failover
  ingress {
    from_port = 1026
    to_port = 1026
    protocol = 17
    cidr_blocks = ["10.0.0.0/16"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.global_tags, { Name="sg-${module.utils.env_unique_id}-bigip-internal" })

}

resource "aws_network_interface" "nic_mgmt" {
  description     = "Management Interface for BIG-IP"
  subnet_id       = aws_subnet.subnet_az1_mgmt.id
  private_ips     = ["10.0.0.11"]
  security_groups = ["${aws_security_group.sg_mgmt.id}"]
  tags            = merge(var.global_tags, { Name="nic-${module.utils.env_unique_id}-bigip-mgmt" })
}

resource "aws_network_interface" "nic_external" {
  description = "Public External Interface for the BIG-IP"
  subnet_id = aws_subnet.subnet_az1_external.id
  security_groups = ["${aws_security_group.sg_external.id}"]
  private_ips = ["10.0.1.11"]
  tags = merge(var.global_tags, { Name="nic-${module.utils.env_unique_id}-bigip-external" })
}

resource "aws_network_interface" "nic_internal" {
  description = "Private Internal Interface for the BIG-IP"
  subnet_id = aws_subnet.subnet_az1_internal.id
  private_ips = ["10.0.2.11"]
  security_groups = ["${aws_security_group.sg_internal.id}"]
  tags = merge(var.global_tags, { Name="nic-${module.utils.env_unique_id}-bigip-internal" })
}

resource "aws_eip" "eip_mgmt" {
  vpc = true
  network_interface = aws_network_interface.nic_mgmt.id
  associate_with_private_ip = tolist(aws_network_interface.nic_mgmt.private_ips)[0]
  tags = merge(var.global_tags, { Name="eip-${module.utils.env_unique_id}-bigip-mgmt" })
}

resource "aws_eip" "eip_external" {
  vpc = true
  network_interface = aws_network_interface.nic_external.id
  associate_with_private_ip = tolist(aws_network_interface.nic_external.private_ips)[0]
  tags = merge(var.global_tags, { Name="eip-${module.utils.env_unique_id}-bigip-external" })
}

resource "aws_secretsmanager_secret" "adminsecret" {
  name = "bigIpPass-${module.utils.env_unique_id}"
  tags = merge(var.global_tags, { Name="sm-secret-${module.utils.env_unique_id}-bigip-secret" })

}

resource "aws_secretsmanager_secret_version" "adminSecret" {
  secret_id     = aws_secretsmanager_secret.adminsecret.id
  secret_string = module.utils.admin_password
}

resource "aws_iam_role" "main" {

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF

  tags = merge(var.global_tags, { Name="iam-role-${module.utils.env_unique_id}-bigip" })

}

resource "aws_iam_role_policy" "BigIpPolicy" {
  name = "aws-iam-role-policy-${module.utils.env_unique_id}"
  role = aws_iam_role.main.id

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
        "Effect": "Allow",
        "Action": [
            "secretsmanager:GetSecretValue",
            "secretsmanager:DescribeSecret",
            "secretsmanager:ListSecretVersionIds"
        ],
        "Resource": [
            "arn:aws:secretsmanager:${var.region}:${aws_vpc.vpc.owner_id}:secret:*"
        ]
    }
  ]
}
EOF
}

resource "aws_iam_instance_profile" "instance_profile" {
  name = "aws-iam-instance-profile-${module.utils.env_unique_id}"
  role = aws_iam_role.main.id
  tags = merge(var.global_tags, { Name="instance-prof-${module.utils.env_unique_id}-bigip" })
}

data "aws_ami" "f5_ami" {
  most_recent = true
  // owners      = ["679593333241"]
  owners = ["aws-marketplace"]

  filter {
    name   = "description"
    values = [var.f5_ami_search_name]
  }
}

resource "null_resource" "delay" {
  provisioner "local-exec" {
    command = "sleep 30"
  }
}

resource "aws_instance" "vm" {
  ami = data.aws_ami.f5_ami.id
  instance_type = var.instance_type
  availability_zone = "${var.region}a"
  key_name = var.ssh_key_name

  network_interface {
    network_interface_id = aws_network_interface.nic_mgmt.id
    device_index = 0
  }

  network_interface {
    network_interface_id = aws_network_interface.nic_external.id
    device_index = 1
  }

  network_interface {
    network_interface_id = aws_network_interface.nic_internal.id
    device_index = 2
  }

#  Enables IMDSv2 only; uncomment this when BIGIP will support IMDSv2

#   metadata_options {
#     http_endpoint = "enabled"
#     http_tokens = "required"
#   }

  iam_instance_profile = aws_iam_instance_profile.instance_profile.name

  user_data = templatefile("${path.module}/startup-script.tpl", {
    secret_id: aws_secretsmanager_secret_version.adminSecret.secret_id,
    package_url: var.bigip_runtime_init_package_url
  })

  tags = merge(var.global_tags, { Name="vm-${module.utils.env_unique_id}-bigip" })

  depends_on = [null_resource.delay]

}

resource "time_sleep" "wait_bigip_ready" {
  depends_on      = [aws_instance.vm]
  create_duration = var.wait_bigip_ready
}
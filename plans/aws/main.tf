module "utils" {
  source = "../../modules/utils"
}

provider "aws" {
  region = "${var.AWS_DEFAULT_REGION}"
}

variable "global_tags" {
  type = "map"
  default = {
    creator = "Terraform - SDK Extension"
    delete = "True"
  }
}

# Create 'supporting' network infrastructure for the BIG-IP VMs
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  enable_dns_support = true
  enable_dns_hostnames = true
  tags = merge(var.global_tags, {Name="aws-vpc-${module.utils.env_prefix}"})
}

resource "aws_internet_gateway" "gateway" {
  vpc_id = "${aws_vpc.main.id}"
  tags = merge(var.global_tags, {Name="aws-internet-gateway-${module.utils.env_prefix}"})
}
resource "aws_route_table" "mgmt" {
  vpc_id = "${aws_vpc.main.id}"
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = "${aws_internet_gateway.gateway.id}"
  }
  tags = merge(var.global_tags, {Name="aws-route-table-mgmt-${module.utils.env_prefix}"})
}

resource "aws_route_table" "external" {
  vpc_id = "${aws_vpc.main.id}"
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = "${aws_internet_gateway.gateway.id}"
  }
  tags = merge(var.global_tags, {Name="aws-route-table-external-${module.utils.env_prefix}"})
}

resource "aws_subnet" "mgmtAz1" {
  vpc_id = "${aws_vpc.main.id}"
  availability_zone = "${var.AWS_DEFAULT_REGION}a"
  cidr_block = "10.0.0.0/24"
  tags = merge(var.global_tags, {Name="aws-subnet-mgmtAz1-${module.utils.env_prefix}"})
}

resource "aws_route_table_association" "mgmtAz1" {
  subnet_id      = "${aws_subnet.mgmtAz1.id}"
  route_table_id = "${aws_route_table.mgmt.id}"
}

resource "aws_subnet" "externalAz1" {
  vpc_id = "${aws_vpc.main.id}"
  availability_zone = "${var.AWS_DEFAULT_REGION}a"
  cidr_block = "10.0.1.0/24"
  tags = merge(var.global_tags, {Name="aws-subnet-externalAz1-${module.utils.env_prefix}"})
}

resource "aws_route_table_association" "externalAz1" {
  subnet_id      = "${aws_subnet.externalAz1.id}"
  route_table_id = "${aws_route_table.external.id}"
}

# Creates a BIG-IP for testing
resource "aws_security_group" "external" {
  description = "External interface rules"
  vpc_id = "${aws_vpc.main.id}"
  ingress {
    from_port = 80
    to_port = 80
    protocol = 6
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port = 443
    to_port = 443
    protocol = 6
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port = 4353
    to_port = 4353
    protocol = 6
    self = true
  }
  ingress {
    from_port = 1026
    to_port = 1026
    protocol = 17
    self = true
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = merge(var.global_tags, {Name="aws-security-group-external-${module.utils.env_prefix}"})
}

resource "aws_security_group" "mgmt" {
  description = "External interface rules"
  vpc_id = "${aws_vpc.main.id}"
  ingress {
    from_port = 22
    to_port = 22
    protocol = 6
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port = 443
    to_port = 443
    protocol = 6
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port = 443
    to_port = 443
    protocol = 6
    security_groups = ["${aws_security_group.external.id}"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = merge(var.global_tags, {Name="aws-security-group-mgmt-${module.utils.env_prefix}"})
}

resource "aws_s3_bucket" "configdb" {
  bucket = "aws-s3-bucket-${module.utils.env_prefix}"
  force_destroy = true
  tags = merge(var.global_tags, {Name="aws-s3-bucket-${module.utils.env_prefix}"})
}

resource "aws_secretsmanager_secret" "adminsecret" {
  name = "aws-secretsmanager-${module.utils.env_prefix}"
}

resource "aws_secretsmanager_secret_version" "testAwsAdminSecret" {
  secret_id     = "${aws_secretsmanager_secret.adminsecret.id}"
  secret_string = "StrongPassword2010!"
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
  tags = merge(var.global_tags, {Name="aws-iam-role-${module.utils.env_prefix}"})
}

resource "aws_iam_role_policy" "BigIpPolicy" {
  name = "aws-iam-role-policy-${module.utils.env_prefix}"
  role = "${aws_iam_role.main.id}"
  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
        "Action": [
            "ec2:DescribeInstances",
            "ec2:DescribeInstanceStatus",
            "ec2:DescribeAddresses",
            "ec2:AssociateAddress",
            "ec2:DisassociateAddress",
            "ec2:DescribeNetworkInterfaces",
            "ec2:DescribeTags",
            "ec2:DescribeNetworkInterfaceAttribute",
            "ec2:DescribeRouteTables",
            "ec2:ReplaceRoute",
            "ec2:CreateRoute",
            "ec2:assignprivateipaddresses",
            "sts:AssumeRole",
            "s3:ListAllMyBuckets"
        ],
        "Resource": [
            "*"
        ],
        "Effect": "Allow"
    },
    {
        "Action": [
            "s3:ListBucket",
            "s3:GetBucketTagging"
        ],
        "Resource": "arn:aws:s3:::${aws_s3_bucket.configdb.id}",
        "Effect": "Allow"
    },
    {
        "Action": [
            "s3:PutObject",
            "s3:GetObject",
            "s3:DeleteObject"
        ],
        "Resource": "arn:aws:s3:::${aws_s3_bucket.configdb.id}/*",
        "Effect": "Allow"
    },
    {
        "Effect": "Allow",
        "Action": [
            "secretsmanager:GetResourcePolicy",
            "secretsmanager:GetSecretValue",
            "secretsmanager:PutSecretValue",
            "secretsmanager:DescribeSecret",
            "secretsmanager:ListSecretVersionIds",
            "secretsmanager:UpdateSecretVersionStage"
        ],
        "Resource": [
            "arn:aws:secretsmanager:${var.AWS_DEFAULT_REGION}:${aws_vpc.main.owner_id}:secret:*"
        ]
    }
  ]
}
EOF
}

resource "aws_iam_instance_profile" "instance_profile" {
  name = "aws-iam-instance-profile-${module.utils.env_prefix}"
  role = "${aws_iam_role.main.id}"
}

resource "aws_network_interface" "mgmt1" {
  subnet_id = "${aws_subnet.mgmtAz1.id}"
  security_groups = ["${aws_security_group.mgmt.id}"]
  description = "Management Interface for BIG-IP"
  tags = merge(var.global_tags, {Name="aws-network-interface-mgmt1-${module.utils.env_prefix}"})
}

resource "aws_eip" "mgmt1" {
  vpc = true
  network_interface = "${aws_network_interface.mgmt1.id}"
  associate_with_private_ip = "${tolist(aws_network_interface.mgmt1.private_ips)[0]}"
  tags = merge(var.global_tags, {Name="aws-eip-mgmt1-${module.utils.env_prefix}"})
}

resource "aws_network_interface" "external1" {
  subnet_id = "${aws_subnet.externalAz1.id}"
  security_groups = ["${aws_security_group.external.id}"]
  description = "Public External Interface for the BIG-IP"
  private_ips_count = 1
  tags = merge(var.global_tags, {Name="aws-network-interface-external1-${module.utils.env_prefix}"})
}

resource "aws_eip" "external1" {
  vpc = true
  network_interface = "${aws_network_interface.external1.id}"
  associate_with_private_ip = "${tolist(aws_network_interface.external1.private_ips)[0]}"
  tags = merge(var.global_tags, {Name="aws-eip-external1-${module.utils.env_prefix}"})
}

data "template_file" "user_data_vm0" {
  template = "${file("${path.module}/user_data.tpl")}"
  vars = {
    admin_username  = "${var.admin_username}"
    admin_password  = "${module.utils.admin_password}"
    secret_id = "${aws_secretsmanager_secret_version.testAwsAdminSecret.secret_id}"
  }
}

resource "null_resource" "delay" {
  provisioner "local-exec" {
    command = "sleep 30"
  }
}

resource "aws_instance" "vm0" {
  ami = "${var.AWS_BIGIP_AMI_ID}"
  instance_type = "m5.xlarge"
  availability_zone = "${var.AWS_DEFAULT_REGION}a"
  key_name = "dewpt"
  network_interface {
    network_interface_id = "${aws_network_interface.mgmt1.id}"
    device_index = 0
  }
  network_interface {
    network_interface_id = "${aws_network_interface.external1.id}"
    device_index = 1
  }
  // Enables IMDSv2 only; uncomment this when BIGIP will support IMDSv2
//  metadata_options {
//    http_endpoint = "enabled"
//    http_tokens = "required"
//  }
  iam_instance_profile = "${aws_iam_instance_profile.instance_profile.name}"
  user_data = "${data.template_file.user_data_vm0.rendered}"
  tags = merge(var.global_tags, {Name="runtime-init-vm0-${module.utils.env_prefix}"})
  depends_on = [null_resource.delay]

}

output "deployment_info" {
  value = {
    instances: [
      {
        admin_username = var.admin_username,
        admin_password = module.utils.admin_password,
        mgmt_address = aws_eip.mgmt1.public_ip,
        instanceId = aws_instance.vm0.id,
        mgmt_port = 443
      },
    ],
    deploymentId: module.utils.env_prefix,
    environment: "aws",
    region: var.AWS_DEFAULT_REGION,
    secret_id: aws_secretsmanager_secret_version.testAwsAdminSecret.secret_id
  }
}

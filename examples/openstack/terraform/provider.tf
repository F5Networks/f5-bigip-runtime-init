terraform {
  required_providers {
    openstack = {
      source  = "terraform-provider-openstack/openstack"
      version = "1.33.0"
    }
  }
}

provider "openstack" {
}

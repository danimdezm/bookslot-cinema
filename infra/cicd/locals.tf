data "aws_caller_identity" "current" {}

locals {
  name         = "${var.project}-prod"
  account_id   = data.aws_caller_identity.current.account_id
  state_bucket = "${var.project}-tfstate-${local.account_id}"
  boundary_arn = "arn:aws:iam::${local.account_id}:policy/${var.permissions_boundary_name}"
}

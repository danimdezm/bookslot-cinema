locals {
  gsis = ["GSI1", "GSI2", "GSI3"]
}

resource "aws_dynamodb_table" "this" {
  name         = var.name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  dynamic "attribute" {
    for_each = flatten([for g in local.gsis : ["${g}PK", "${g}SK"]])
    content {
      name = attribute.value
      type = "S"
    }
  }

  dynamic "global_secondary_index" {
    for_each = local.gsis
    content {
      name            = global_secondary_index.value
      projection_type = "ALL"

      key_schema {
        attribute_name = "${global_secondary_index.value}PK"
        key_type       = "HASH"
      }

      key_schema {
        attribute_name = "${global_secondary_index.value}SK"
        key_type       = "RANGE"
      }
    }
  }

  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  point_in_time_recovery {
    enabled                 = true
    recovery_period_in_days = 35
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  server_side_encryption {
    enabled = true
  }

  deletion_protection_enabled = var.deletion_protection
}

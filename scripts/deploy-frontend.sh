#!/usr/bin/env bash
# Uso: scripts/deploy-frontend.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
out() { terraform -chdir="$ROOT/infra/envs/prod" output -raw "$1"; }

BUCKET="$(out web_bucket)"
DISTRIBUTION="$(out web_distribution_id)"

export VITE_API_URL="$(out api_endpoint)"
export VITE_WS_URL="$(out websocket_url)"
export VITE_COGNITO_REGION="$(out cognito_region)"
export VITE_COGNITO_CLIENT_ID="$(out user_pool_client_id)"

pnpm --dir "$ROOT" --filter @bookslot/frontend build

DIST="$ROOT/frontend/dist"
aws s3 sync "$DIST" "s3://$BUCKET" --delete --exclude index.html --only-show-errors \
  --cache-control "public,max-age=31536000,immutable"
aws s3 cp "$DIST/index.html" "s3://$BUCKET/index.html" --only-show-errors \
  --cache-control "no-cache"

aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION" --paths "/index.html" >/dev/null

echo "Web desplegada en $(out web_url)"

#!/usr/bin/env bash

set -euo pipefail

bucket_name="${S3_BUCKET:-mifamilita.com}"
distribution_id="${CLOUDFRONT_DISTRIBUTION_ID:-E1GXOANMDMA1WD}"

npm run build

# Upload hashed Vite bundles first. Old versions stay available for open tabs.
aws s3 sync dist/assets/ "s3://${bucket_name}/assets/" \
  --cache-control "public, max-age=31536000, immutable"

# Upload public assets such as sounds, without giving their stable filenames a long cache lifetime.
aws s3 sync dist/ "s3://${bucket_name}/" \
  --exclude "index.html" \
  --exclude "assets/*" \
  --cache-control "public, max-age=3600"

# Publish HTML last so it only refers to assets that have already reached S3.
aws s3 cp dist/index.html "s3://${bucket_name}/index.html" \
  --content-type "text/html" \
  --cache-control "no-cache, no-store, must-revalidate"

aws cloudfront create-invalidation \
  --distribution-id "${distribution_id}" \
  --paths "/" "/index.html"

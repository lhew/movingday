#!/usr/bin/env bash

set -euo pipefail

BUCKET="${1:-movingday-ed444.firebasestorage.app}"
CONFIG_FILE="${2:-storage.cors.json}"

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "CORS config not found: $CONFIG_FILE" >&2
  exit 1
fi

if command -v gcloud >/dev/null 2>&1; then
  gcloud storage buckets update "gs://$BUCKET" --cors-file="$CONFIG_FILE"
elif command -v gsutil >/dev/null 2>&1; then
  gsutil cors set "$CONFIG_FILE" "gs://$BUCKET"
else
  echo "Install Google Cloud CLI first so either 'gcloud' or 'gsutil' is available." >&2
  exit 1
fi

echo "Applied CORS from $CONFIG_FILE to gs://$BUCKET"
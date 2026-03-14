#!/usr/bin/env bash
# Update .env files with a LocalTunnel domain for OAuth and external access.
#
# Usage:
#   ./scripts/setup-tunnel.sh <tunnel-domain>
#
# Example:
#   ./scripts/setup-tunnel.sh cute-cats-run.loca.lt
#
# To revert to localhost:
#   ./scripts/setup-tunnel.sh localhost:5174

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <tunnel-domain>"
  echo ""
  echo "Example: $0 cute-cats-run.loca.lt"
  echo "Revert:  $0 localhost:5174"
  exit 1
fi

DOMAIN="$1"

if [[ "$DOMAIN" == localhost* ]]; then
  SCHEME="http"
else
  SCHEME="https"
fi

BASE="${SCHEME}://${DOMAIN}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# --- backend/.env ---
ENV_BACKEND="${ROOT_DIR}/backend/.env"
if [ -f "$ENV_BACKEND" ]; then
  sed -i '' "s|^YANDEX_REDIRECT_URI=.*|YANDEX_REDIRECT_URI=${BASE}/api/auth/yandex/callback|" "$ENV_BACKEND"
  sed -i '' "s|^FRONTEND_URL=.*|FRONTEND_URL=${BASE}|" "$ENV_BACKEND"
  sed -i '' "s|^FLEX_BANK_OAUTH_REDIRECT_URI=.*|FLEX_BANK_OAUTH_REDIRECT_URI=${BASE}/api/bank-integration/flex/callback|" "$ENV_BACKEND"
  echo "Updated backend/.env → ${BASE}"
fi

# --- mock-bank/.env ---
ENV_MOCKBANK="${ROOT_DIR}/mock-bank/.env"
if [ -f "$ENV_MOCKBANK" ]; then
  sed -i '' "s|^YANDEX_REDIRECT_URI=.*|YANDEX_REDIRECT_URI=${BASE}/bank-api/auth/yandex/callback|" "$ENV_MOCKBANK"
  sed -i '' "s|^FRONTEND_URL=.*|FRONTEND_URL=${BASE}/bank|" "$ENV_MOCKBANK"
  echo "Updated mock-bank/.env → ${BASE}"
fi

echo ""
echo "Done. Restart backend and mock-bank to apply changes."
echo ""
echo "iOS: Update Configuration.swift apiBaseURL to:"
echo "  ${BASE}/api"

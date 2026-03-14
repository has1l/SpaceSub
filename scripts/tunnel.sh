#!/usr/bin/env bash
# Start LocalTunnel exposing the Vite gateway (port 5174).
#
# Usage:
#   ./scripts/tunnel.sh
#   ./scripts/tunnel.sh --subdomain my-spacesub   # optional: stable subdomain
#
# The tunnel URL (https://<name>.loca.lt) will be printed to stdout.
# No DNS fixes, no sudo, no VPN conflicts — works everywhere.

set -euo pipefail

PORT="${TUNNEL_PORT:-5174}"

if ! command -v lt &>/dev/null; then
  echo "Error: localtunnel is not installed."
  echo "Install: npm install -g localtunnel"
  exit 1
fi

# Check that local server is running
if ! curl -s -o /dev/null --max-time 2 "http://127.0.0.1:${PORT}/" 2>/dev/null; then
  echo "WARNING: No server on http://127.0.0.1:${PORT}"
  echo "Start services first:  npm run dev"
  echo ""
fi

echo "Starting LocalTunnel → http://127.0.0.1:${PORT}"
echo ""

# --local-host 127.0.0.1: explicit IPv4, avoids IPv6 issues on macOS
# --print-requests: log incoming requests for debugging
# Extra args (e.g. --subdomain) are forwarded
exec lt --port "${PORT}" --local-host 127.0.0.1 --print-requests "$@"

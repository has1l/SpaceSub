#!/usr/bin/env bash
# Verify that LocalTunnel is working correctly with SpaceSub.
#
# Usage:
#   ./scripts/test-tunnel.sh [tunnel-url]
#
# If no URL is provided, runs local-only tests (1-2).
# If URL is provided, runs all 5 tests.
#
# Prerequisites:
#   - All services running (npm run dev)
#   - Tunnel running (npm run tunnel) — for tests 3-5

set -euo pipefail

PASS=0
FAIL=0

run_test() {
  local name="$1"
  local result="$2"
  if [ "$result" = "PASS" ]; then
    printf "  \033[32mPASS\033[0m  %s\n" "$name"
    PASS=$((PASS + 1))
  else
    printf "  \033[31mFAIL\033[0m  %s\n" "$name"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "SpaceSub Tunnel Diagnostics"
echo "─────────────────────────────────────"

# ── Test 1: Local server reachable on port 5174 ──
echo ""
echo "Test 1: Local server reachable on port 5174"
LOCAL_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://127.0.0.1:5174/" 2>/dev/null || echo "000")
if [ "$LOCAL_CODE" -ge 200 ] && [ "$LOCAL_CODE" -lt 400 ]; then
  run_test "http://127.0.0.1:5174 responds (HTTP ${LOCAL_CODE})" "PASS"
else
  run_test "http://127.0.0.1:5174 responds (got HTTP ${LOCAL_CODE})" "FAIL"
fi

# ── Test 2: Vite binds to 0.0.0.0 (not just 127.0.0.1) ──
echo ""
echo "Test 2: Vite server binds to 0.0.0.0"
LISTEN_CHECK=$(lsof -iTCP:5174 -sTCP:LISTEN -n -P 2>/dev/null || echo "")
if echo "$LISTEN_CHECK" | grep -q '\*:5174\|0\.0\.0\.0:5174'; then
  run_test "Port 5174 bound to 0.0.0.0 (all interfaces)" "PASS"
elif echo "$LISTEN_CHECK" | grep -q '5174'; then
  BIND_ADDR=$(echo "$LISTEN_CHECK" | grep '5174' | head -1 | awk '{print $9}')
  run_test "Port 5174 bound to ${BIND_ADDR} (should be *:5174)" "FAIL"
else
  run_test "No process listening on port 5174" "FAIL"
fi

# If no tunnel URL provided, stop here
if [ $# -lt 1 ]; then
  echo ""
  echo "─────────────────────────────────────"
  echo "Local tests: ${PASS} passed, ${FAIL} failed"
  echo ""
  echo "To run tunnel tests, provide the URL:"
  echo "  $0 https://xxxxx.loca.lt"
  [ "$FAIL" -gt 0 ] && exit 1
  exit 0
fi

TUNNEL_URL="${1%/}"
echo ""
echo "Tunnel URL: ${TUNNEL_URL}"

# LocalTunnel shows a reminder page on first visit from a browser.
# Use Bypass-Tunnel-Reminder header to skip it in automated tests.
BYPASS="-H Bypass-Tunnel-Reminder:true"

# ── Test 3: Tunnel URL responds ──
echo ""
echo "Test 3: Tunnel URL responds"
TUNNEL_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 ${BYPASS} "${TUNNEL_URL}/" 2>/dev/null || echo "000")
if [ "$TUNNEL_CODE" -ge 200 ] && [ "$TUNNEL_CODE" -lt 400 ]; then
  run_test "Tunnel responds (HTTP ${TUNNEL_CODE})" "PASS"
else
  run_test "Tunnel returns HTTP ${TUNNEL_CODE} (expected 200)" "FAIL"
fi

# ── Test 4: Public URL returns valid HTML ──
echo ""
echo "Test 4: Public URL returns frontend HTML"
BODY=$(curl -s --max-time 15 ${BYPASS} "${TUNNEL_URL}/" 2>/dev/null || echo "")
if echo "$BODY" | grep -qi 'spacesub\|vite\|<!doctype'; then
  run_test "Frontend HTML received through tunnel" "PASS"
else
  if echo "$BODY" | grep -qi '503\|unavailable'; then
    run_test "Tunnel returned 503 — server may be starting" "FAIL"
  else
    run_test "No valid HTML in response" "FAIL"
  fi
fi

# ── Test 5: API proxy works through tunnel ──
echo ""
echo "Test 5: API proxy reachable through tunnel"
API_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 ${BYPASS} "${TUNNEL_URL}/api/health" 2>/dev/null || echo "000")
# 200 = health endpoint exists, 404 = API responding but no health route, both mean proxy works
if [ "$API_CODE" -ge 200 ] && [ "$API_CODE" -lt 500 ]; then
  run_test "API proxy works (HTTP ${API_CODE})" "PASS"
else
  run_test "API proxy (got HTTP ${API_CODE})" "FAIL"
fi

# ── Summary ──
echo ""
echo "─────────────────────────────────────"
echo "Results: ${PASS} passed, ${FAIL} failed"
echo ""

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi

#!/bin/bash
# Pre-deploy verification for Square Daily Route
# Run from the visit-platform root directory
# Usage: bash scripts/verify-square-deploy.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

check_pass() { echo -e "  ${GREEN}✓${NC} $1"; PASS=$((PASS + 1)); }
check_fail() { echo -e "  ${RED}✗${NC} $1"; FAIL=$((FAIL + 1)); }
check_warn() { echo -e "  ${YELLOW}⚠${NC} $1"; WARN=$((WARN + 1)); }

echo ""
echo "========================================"
echo "  SQUARE DAILY ROUTE — PRE-DEPLOY CHECK"
echo "========================================"
echo ""

# 1. Route file exists
echo "1. Route file"
if [ -f "app/api/square/daily/route.ts" ]; then
  check_pass "app/api/square/daily/route.ts exists"
else
  check_fail "app/api/square/daily/route.ts NOT FOUND"
fi

# 2. Import path
echo ""
echo "2. Import path"
if grep -q 'from "@/lib/prisma"' app/api/square/daily/route.ts 2>/dev/null; then
  check_pass "Route imports from @/lib/prisma"
else
  check_fail "Route does NOT import from @/lib/prisma"
fi

if grep -q 'from "@visit/db"' app/api/square/daily/route.ts 2>/dev/null; then
  check_fail "Route still imports from @visit/db — this will break"
else
  check_pass "No @visit/db import (good)"
fi

# 3. Prisma singleton
echo ""
echo "3. Prisma singleton"
if [ -f "lib/prisma.ts" ]; then
  check_pass "lib/prisma.ts exists"
else
  check_fail "lib/prisma.ts NOT FOUND — route will 500"
fi

# 4. Path alias
echo ""
echo "4. TypeScript path alias"
if grep -q '"@/' tsconfig.json 2>/dev/null; then
  check_pass "tsconfig.json has @/ path alias"
else
  check_fail "tsconfig.json missing @/ path alias"
fi

# 5. Schema
echo ""
echo "5. Prisma schema — SyncStatus enum"
if grep -q 'needs_review' prisma/schema.prisma 2>/dev/null; then
  check_pass "SyncStatus enum includes needs_review"
elif grep -q 'needs_review' packages/db/prisma/schema.prisma 2>/dev/null; then
  check_pass "SyncStatus enum includes needs_review (packages/db)"
else
  check_fail "SyncStatus enum missing needs_review"
  echo "         Add 'needs_review' between 'partial' and 'failed' in the SyncStatus enum"
fi

# 6. Backwards compat
echo ""
echo "6. Backwards compatibility"
if grep -q 'orderCount' app/api/square/daily/route.ts 2>/dev/null; then
  check_pass "Route returns orderCount (P&L page compat)"
else
  check_fail "Route missing orderCount"
fi

# 7. Runtime config
echo ""
echo "7. Runtime config"
if grep -q 'force-dynamic' app/api/square/daily/route.ts 2>/dev/null; then
  check_pass "Route has force-dynamic export"
else
  check_warn "Route missing force-dynamic"
fi

if grep -q 'fetchWithRetry' app/api/square/daily/route.ts 2>/dev/null; then
  check_pass "Route has retry wrapper"
else
  check_warn "Route missing fetchWithRetry"
fi

if grep -q 'resolveOffset' app/api/square/daily/route.ts 2>/dev/null; then
  check_pass "Route has DST offset resolver"
else
  check_fail "Route missing resolveOffset — timezone will break on DST"
fi

# 8. Environment
echo ""
echo "8. Environment"
if [ -f ".env" ] && grep -q 'SQUARE_ACCESS_TOKEN' .env 2>/dev/null; then
  check_pass "Local .env has SQUARE_ACCESS_TOKEN"
else
  check_warn "No SQUARE_ACCESS_TOKEN in local .env — make sure it's set in Railway"
fi

# 9. Audit script
echo ""
echo "9. Audit script"
if [ -f "scripts/audit-7-nights.ts" ]; then
  check_pass "scripts/audit-7-nights.ts exists"
else
  check_warn "scripts/audit-7-nights.ts not found"
fi

# 10. No stale files in wrong location
echo ""
echo "10. Cleanup check"
if [ -f "apps/web/app/api/square/daily/route.ts" ]; then
  check_warn "Stale route.ts in apps/web/ — delete to avoid confusion"
else
  check_pass "No stale files in apps/web/"
fi

# Summary
echo ""
echo "========================================"
echo "  RESULTS"
echo "========================================"
echo -e "  ${GREEN}Passed: ${PASS}${NC}"
echo -e "  ${RED}Failed: ${FAIL}${NC}"
echo -e "  ${YELLOW}Warnings: ${WARN}${NC}"
echo ""

if [ $FAIL -gt 0 ]; then
  echo -e "  ${RED}❌ FIX FAILURES BEFORE DEPLOYING${NC}"
  echo ""
  exit 1
elif [ $WARN -gt 0 ]; then
  echo -e "  ${YELLOW}⚠️  Warnings present — review before deploying${NC}"
  echo ""
  exit 0
else
  echo -e "  ${GREEN}✅ ALL CHECKS PASSED — safe to deploy${NC}"
  echo ""
  exit 0
fi

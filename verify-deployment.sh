#!/bin/bash
# Deployment Verification Script
# Run this before pushing to production

set -e

RESET='\033[0m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'

echo "🚀 Golf Charity Platform - Deployment Verification"
echo "=================================================="
echo ""

# Function to check and report
check() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${RESET} $1"
        return 0
    else
        echo -e "${RED}✗${RESET} $1"
        return 1
    fi
}

PASSED=0
FAILED=0

# 1. Directory Structure
echo "${YELLOW}1. Checking Directory Structure${RESET}"
[ -d "frontend" ] && ((PASSED++)) || ((FAILED++))
check "frontend/ exists"
[ -d "backend" ] && ((PASSED++)) || ((FAILED++))
check "backend/ exists"
[ -f ".gitignore" ] && ((PASSED++)) || ((FAILED++))
check "root/.gitignore exists"
echo ""

# 2. Configuration Files
echo "${YELLOW}2. Checking Configuration Files${RESET}"
[ -f "render.yaml" ] && ((PASSED++)) || ((FAILED++))
check "render.yaml exists"
[ -f "frontend/vercel.json" ] && ((PASSED++)) || ((FAILED++))
check "frontend/vercel.json exists"
[ -f "frontend/next.config.ts" ] && ((PASSED++)) || ((FAILED++))
check "frontend/next.config.ts exists"
[ -f "backend/tsconfig.json" ] && ((PASSED++)) || ((FAILED++))
check "backend/tsconfig.json exists"
echo ""

# 3. Environment Templates
echo "${YELLOW}3. Checking Environment Templates${RESET}"
[ -f "frontend/.env.example" ] && ((PASSED++)) || ((FAILED++))
check "frontend/.env.example exists"
[ -f "backend/.env.example" ] && ((PASSED++)) || ((FAILED++))
check "backend/.env.example exists"
echo ""

# 4. Package.json Scripts
echo "${YELLOW}4. Checking Package.json Scripts${RESET}"
cd frontend
grep -q '"build"' package.json && ((PASSED++)) || ((FAILED++))
check "frontend has build script"
grep -q '"start"' package.json && ((PASSED++)) || ((FAILED++))
check "frontend has start script"
grep -q '"lint"' package.json && ((PASSED++)) || ((FAILED++))
check "frontend has lint script"
cd ..

cd backend
grep -q '"build"' package.json && ((PASSED++)) || ((FAILED++))
check "backend has build script"
grep -q '"start"' package.json && ((PASSED++)) || ((FAILED++))
check "backend has start script"
grep -q '"test"' package.json && ((PASSED++)) || ((FAILED++))
check "backend has test script"
cd ..
echo ""

# 5. Source Files
echo "${YELLOW}5. Checking Source Files${RESET}"
[ -f "frontend/src/app/page.tsx" ] && ((PASSED++)) || ((FAILED++))
check "frontend has home page"
[ -f "frontend/src/app/dashboard/page.tsx" ] && ((PASSED++)) || ((FAILED++))
check "frontend has dashboard"
[ -f "frontend/src/app/admin/page.tsx" ] && ((PASSED++)) || ((FAILED++))
check "frontend has admin panel"
[ -f "backend/src/index.ts" ] && ((PASSED++)) || ((FAILED++))
check "backend has entry point"
[ -f "backend/src/razorpay.ts" ] && ((PASSED++)) || ((FAILED++))
check "backend has Razorpay handler"
[ -f "backend/src/draws.ts" ] && ((PASSED++)) || ((FAILED++))
check "backend has draw logic"
echo ""

# 6. Database Schema
echo "${YELLOW}6. Checking Database Schema${RESET}"
[ -f "frontend/supabase/schema.sql" ] && ((PASSED++)) || ((FAILED++))
check "frontend has database schema"
echo ""

# 7. Git Ignore
echo "${YELLOW}7. Checking .gitignore Files${RESET}"
[ -f "backend/.gitignore" ] && ((PASSED++)) || ((FAILED++))
check "backend/.gitignore exists"
grep -q "node_modules" frontend/.gitignore && ((PASSED++)) || ((FAILED++))
check "frontend .gitignore covers dependencies"
grep -q "\.env" frontend/.gitignore && ((PASSED++)) || ((FAILED++))
check "frontend .gitignore covers secrets"
grep -q "node_modules" backend/.gitignore && ((PASSED++)) || ((FAILED++))
check "backend .gitignore covers dependencies"
grep -q "\.env" backend/.gitignore && ((PASSED++)) || ((FAILED++))
check "backend .gitignore covers secrets"
echo ""

# 8. Documentation
echo "${YELLOW}8. Checking Documentation${RESET}"
[ -f "README.md" ] && ((PASSED++)) || ((FAILED++))
check "README.md exists"
[ -f "DEPLOYMENT_CHECKLIST.md" ] && ((PASSED++)) || ((FAILED++))
check "DEPLOYMENT_CHECKLIST.md exists"
[ -f "QUICK_START_DEPLOY.md" ] && ((PASSED++)) || ((FAILED++))
check "QUICK_START_DEPLOY.md exists"
echo ""

# 9. Optional: Check if .env files exist (they shouldn't be committed)
echo "${YELLOW}9. Checking for Sensitive Files (should NOT exist)${RESET}"
if [ ! -f "frontend/.env.local" ]; then
    echo -e "${GREEN}✓${RESET} frontend/.env.local not present (good)"
    ((PASSED++))
else
    echo -e "${RED}✗${RESET} frontend/.env.local present (should be deleted before commit)"
    ((FAILED++))
fi

if [ ! -f "backend/.env" ]; then
    echo -e "${GREEN}✓${RESET} backend/.env not present (good)"
    ((PASSED++))
else
    echo -e "${RED}✗${RESET} backend/.env present (should be deleted before commit)"
    ((FAILED++))
fi
echo ""

# Summary
echo "=================================================="
echo -e "${GREEN}Passed: $PASSED${RESET}"
echo -e "${RED}Failed: $FAILED${RESET}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Ready to deploy.${RESET}"
    exit 0
else
    echo -e "${RED}✗ Some checks failed. Please fix before deploying.${RESET}"
    exit 1
fi

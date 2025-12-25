#!/bin/bash
# Publishing Script for Myceliumail v1.1.0
# Run this AFTER merging the PR on GitHub

set -e  # Exit on error

echo "🚀 Publishing Myceliumail v1.1.0"
echo "================================"
echo ""

# Step 1: Ensure we're on main and up to date
echo "📥 Step 1: Checking out main branch..."
git checkout main
git pull origin main

# Step 2: Verify version
echo ""
echo "🔍 Step 2: Verifying version..."
VERSION=$(node -p "require('./package.json').version")
if [ "$VERSION" != "1.1.0" ]; then
    echo "❌ Error: Version is $VERSION, expected 1.1.0"
    exit 1
fi
echo "✅ Version confirmed: $VERSION"

# Step 3: Build
echo ""
echo "🔨 Step 3: Building project..."
npm run build

# Step 4: Create and push tag
echo ""
echo "🏷️  Step 4: Creating git tag..."
git tag -a v1.1.0 -m "Release v1.1.0 - Agent Wake System & Action Dispatcher"
git push origin v1.1.0
echo "✅ Tag v1.1.0 created and pushed"

# Step 5: Publish to npm
echo ""
echo "📦 Step 5: Publishing to npm..."
echo "⚠️  You may need to login to npm if not already authenticated"
npm publish

echo ""
echo "🎉 SUCCESS! Myceliumail v1.1.0 published!"
echo ""
echo "Next steps:"
echo "1. Create GitHub release: https://github.com/treebird7/Myceliumail/releases/new"
echo "2. Verify: npm view myceliumail version"
echo "3. Test: npm install -g myceliumail && mycmail watch --help"

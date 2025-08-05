#!/bin/bash

# Chain Reaction Game - Project Metrics Script
# Generates comprehensive project statistics

echo "🎯 Chain Reaction Game - Project Metrics"
echo "========================================"
echo

# File counts
echo "📁 File Counts:"
TOTAL_FILES=$(find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.css" -o -name "*.json" | grep -v node_modules | grep -v dist | wc -l | xargs)
TS_FILES=$(find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v dist | wc -l | xargs)
CSS_FILES=$(find . -name "*.css" | grep -v node_modules | grep -v dist | wc -l | xargs)
CONFIG_FILES=$(find . -name "*.json" -o -name "*.js" -o -name "*.ts" | grep -E "(config|\.config\.|eslint|prettier|tsconfig|vite|package)" | grep -v node_modules | grep -v dist | wc -l | xargs)

echo "  • Total project files: $TOTAL_FILES"
echo "  • TypeScript files: $TS_FILES (.ts/.tsx)"
echo "  • CSS files: $CSS_FILES (.css/.module.css)"
echo "  • Config files: $CONFIG_FILES"
echo

# Lines of code
echo "📊 Lines of Code (LOC):"
TS_LOC=$(find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v dist | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}')
CSS_LOC=$(find . -name "*.css" | grep -v node_modules | grep -v dist | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}')
TOTAL_LOC=$(find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.css" \) | grep -v node_modules | grep -v dist | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}')

echo "  • TypeScript: ${TS_LOC:-0} lines"
echo "  • CSS: ${CSS_LOC:-0} lines"
echo "  • Total LOC: ${TOTAL_LOC:-0} lines"
echo

# Project structure
echo "🏗️ Project Structure:"
echo "  • Components: $(find src/components -name "*.tsx" 2>/dev/null | wc -l | xargs) React components"
echo "  • Hooks: $(find src/hooks -name "*.ts" 2>/dev/null | wc -l | xargs) custom hooks"
echo "  • Types: $(find src/types -name "*.ts" 2>/dev/null | wc -l | xargs) type definition files"
echo "  • Utils: $(find src/utils -name "*.ts" 2>/dev/null | wc -l | xargs) utility files"
echo "  • Context: $(find src/context -name "*.ts*" 2>/dev/null | wc -l | xargs) context files"
echo

# Dependencies
echo "📦 Dependencies:"
if [ -f package.json ]; then
    DEPS=$(grep -c '".*":' package.json | head -1)
    DEV_DEPS=$(jq '.devDependencies | length' package.json 2>/dev/null || echo "N/A")
    PROD_DEPS=$(jq '.dependencies | length' package.json 2>/dev/null || echo "N/A")
    echo "  • Production dependencies: $PROD_DEPS"
    echo "  • Development dependencies: $DEV_DEPS"
fi
echo

# Build info
echo "🔧 Build Status:"
if npm run build > /dev/null 2>&1; then
    echo "  • Build: ✅ Success"
else
    echo "  • Build: ❌ Failed"
fi

if npm run lint > /dev/null 2>&1; then
    echo "  • Linting: ✅ Passed"
else
    echo "  • Linting: ❌ Failed"
fi
echo

echo "Generated on: $(date)"
echo "========================================"
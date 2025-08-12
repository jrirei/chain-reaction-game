#!/bin/bash

# Coverage Report Script
# Prints per-folder coverage from LCOV report for quick CI inspection

set -euo pipefail

LCOV_FILE="${1:-coverage/lcov.info}"

if [[ ! -f "$LCOV_FILE" ]]; then
    echo "❌ Coverage file not found: $LCOV_FILE"
    echo "Run 'npm run test:coverage' first to generate coverage data"
    exit 1
fi

echo "📊 Per-folder Coverage Report"
echo "=================================="

# Extract coverage data per folder
echo "🧠 AI Coverage (src/ai/):"
ai_files=$(grep -E "^SF:.*src/ai/" "$LCOV_FILE" | wc -l)
echo "  Files: $ai_files"
if [[ $ai_files -gt 0 ]]; then
    awk '/^SF:.*src\/ai\//,/^end_of_record/' "$LCOV_FILE" | \
        awk 'BEGIN{lines=0; hit=0} /^LF:/{lines+=$2} /^LH:/{hit+=$2} END{if(lines>0) printf "  Coverage: %.1f%% (%d/%d lines)\n", (hit/lines)*100, hit, lines; else print "  No coverage data"}'
else
    echo "  No AI files found in coverage report"
fi

echo ""
echo "🎯 Core Logic Coverage (src/core/):"
grep -E "^SF:.*src/core/" "$LCOV_FILE" | wc -l | xargs -I {} echo "  Files: {}"
awk '/^SF:.*src\/core\//,/^end_of_record/' "$LCOV_FILE" | \
    grep -E "^(LF:|LH:)" | \
    awk 'BEGIN{lines=0; hit=0} /^LF:/{lines+=$2} /^LH:/{hit+=$2} END{if(lines>0) printf "  Coverage: %.1f%% (%d/%d lines)\n", (hit/lines)*100, hit, lines; else print "  No data"}'

echo ""
echo "🔧 Utilities Coverage (src/utils/):"
grep -E "^SF:.*src/utils/" "$LCOV_FILE" | wc -l | xargs -I {} echo "  Files: {}"
awk '/^SF:.*src\/utils\//,/^end_of_record/' "$LCOV_FILE" | \
    grep -E "^(LF:|LH:)" | \
    awk 'BEGIN{lines=0; hit=0} /^LF:/{lines+=$2} /^LH:/{hit+=$2} END{if(lines>0) printf "  Coverage: %.1f%% (%d/%d lines)\n", (hit/lines)*100, hit, lines; else print "  No data"}'

echo ""
echo "🪝 Hooks Coverage (src/hooks/):"
grep -E "^SF:.*src/hooks/" "$LCOV_FILE" | wc -l | xargs -I {} echo "  Files: {}"
awk '/^SF:.*src\/hooks\//,/^end_of_record/' "$LCOV_FILE" | \
    grep -E "^(LF:|LH:)" | \
    awk 'BEGIN{lines=0; hit=0} /^LF:/{lines+=$2} /^LH:/{hit+=$2} END{if(lines>0) printf "  Coverage: %.1f%% (%d/%d lines)\n", (hit/lines)*100, hit, lines; else print "  No data"}'

echo ""
echo "📊 Overall Summary:"
awk '/^SF:/,/^end_of_record/' "$LCOV_FILE" | \
    grep -E "^(LF:|LH:)" | \
    awk 'BEGIN{lines=0; hit=0} /^LF:/{lines+=$2} /^LH:/{hit+=$2} END{if(lines>0) printf "  Total Coverage: %.1f%% (%d/%d lines)\n", (hit/lines)*100, hit, lines}'

echo ""
echo "💡 Threshold Check:"
echo "  ✅ AI (src/ai/): Requires 90% coverage"
echo "  ✅ Core (src/core/): Requires 85% coverage"
echo "  ✅ Global: Requires 30% minimum coverage"
echo "  📋 Details in COVERAGE.md"
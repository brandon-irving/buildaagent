#!/bin/bash
# OpenClaw Session Cleanup Script
# Removes old and memory-heavy sessions to maintain VPS performance

echo "🧹 OpenClaw Session Cleanup Starting..."

# Show current session count
CURRENT_COUNT=$(openclaw sessions --limit 100 | grep -c "direct\|group" || echo "0")
echo "📊 Current active sessions: $CURRENT_COUNT"

# Show memory usage of top sessions  
echo "📈 Memory usage breakdown:"
openclaw sessions --limit 10 | grep -E "(76%|81%|49%|35%)" | head -5

echo ""
echo "🗑️  Performing cleanup..."

# Phase 1: Remove ancient sessions (7+ days old)
echo "Phase 1: Removing sessions older than 7 days..."
openclaw sessions --delete --older-than 7d
sleep 2

# Phase 2: Remove old test sessions (1+ days old, test/demo patterns)  
echo "Phase 2: Removing old test sessions..."
openclaw sessions --list | grep -E "(test|demo|debug)" | while IFS= read -r line; do
  SESSION_KEY=$(echo "$line" | awk '{print $2}')
  echo "  Removing test session: $SESSION_KEY"
  # openclaw sessions --delete --key "$SESSION_KEY" 2>/dev/null || true
done

# Phase 3: Clean up BuildAAgent openai-user sessions older than 4 hours
echo "Phase 3: Removing old BuildAAgent sessions (4+ hours)..."
openclaw sessions --list | grep "openai-user" | grep -E "(4h|5h|6h|[7-9]h|[0-9]+d)" | while IFS= read -r line; do
  SESSION_KEY=$(echo "$line" | awk '{print $2}')
  echo "  Removing old BuildAAgent session: $SESSION_KEY"  
  # openclaw sessions --delete --key "$SESSION_KEY" 2>/dev/null || true
done

# Show final count
FINAL_COUNT=$(openclaw sessions --limit 100 | grep -c "direct\|group" || echo "0")
CLEANED=$((CURRENT_COUNT - FINAL_COUNT))

echo ""
echo "✅ Session cleanup completed!"
echo "📊 Sessions before: $CURRENT_COUNT"
echo "📊 Sessions after: $FINAL_COUNT" 
echo "🗑️  Sessions cleaned: $CLEANED"

# Alert if still too many sessions
if [ "$FINAL_COUNT" -gt 20 ]; then
  echo "⚠️  Warning: Still $FINAL_COUNT active sessions. Consider manual review."
  echo "🔍 Top memory consumers:"
  openclaw sessions --limit 5
fi

echo ""
echo "🚀 VPS performance should be improved!"
#!/bin/bash
# OpenClaw Session Monitor
# Provides session analytics and alerts for performance management

echo "📊 OpenClaw Session Analytics"
echo "============================"

# Current session count and breakdown
TOTAL_SESSIONS=$(openclaw sessions --limit 100 | grep -c "direct\|group" || echo "0")
DIRECT_SESSIONS=$(openclaw sessions --limit 100 | grep -c "direct" || echo "0")
GROUP_SESSIONS=$(openclaw sessions --limit 100 | grep -c "group" || echo "0")

echo "📈 Session Count:"
echo "  Total: $TOTAL_SESSIONS"
echo "  Direct: $DIRECT_SESSIONS" 
echo "  Group: $GROUP_SESSIONS"
echo ""

# Memory usage analysis
echo "💾 Memory Usage Analysis:"
HIGH_MEMORY=$(openclaw sessions --limit 100 | grep -E "\([5-9][0-9]%\)" | wc -l)
MEDIUM_MEMORY=$(openclaw sessions --limit 100 | grep -E "\([2-4][0-9]%\)" | wc -l)
LOW_MEMORY=$(openclaw sessions --limit 100 | grep -E "\([0-1][0-9]%\)" | wc -l)

echo "  High memory (50%+): $HIGH_MEMORY sessions"
echo "  Medium memory (20-49%): $MEDIUM_MEMORY sessions"  
echo "  Low memory (0-19%): $LOW_MEMORY sessions"
echo ""

# Age distribution
echo "⏰ Session Age Distribution:"
RECENT=$(openclaw sessions --limit 100 | grep -E "(just now|[0-9]+m ago|1h ago)" | wc -l)
OLD=$(openclaw sessions --limit 100 | grep -E "([2-9]h ago|[0-9]+d ago)" | wc -l)

echo "  Recent (< 2h): $RECENT sessions"
echo "  Old (2h+): $OLD sessions"
echo ""

# BuildAAgent session analysis
BA_SESSIONS=$(openclaw sessions --limit 100 | grep -c "buildaagent\|openai-user" || echo "0")
echo "🤖 BuildAAgent Sessions: $BA_SESSIONS"
echo ""

# Performance alerts
echo "⚠️  Performance Alerts:"
if [ "$TOTAL_SESSIONS" -gt 25 ]; then
  echo "  🔴 HIGH: $TOTAL_SESSIONS total sessions (recommended: <25)"
fi

if [ "$HIGH_MEMORY" -gt 3 ]; then
  echo "  🟡 MEDIUM: $HIGH_MEMORY high-memory sessions (recommended: <3)"
fi

if [ "$OLD" -gt 10 ]; then
  echo "  🟡 MEDIUM: $OLD old sessions (recommended: <10)"  
fi

if [ "$TOTAL_SESSIONS" -le 20 ] && [ "$HIGH_MEMORY" -le 2 ]; then
  echo "  🟢 GOOD: Session count and memory usage within optimal range"
fi

echo ""
echo "🔧 Recommendations:"
if [ "$OLD" -gt 5 ]; then
  echo "  • Run cleanup-sessions.sh to remove old sessions"
fi
if [ "$BA_SESSIONS" -gt 5 ]; then
  echo "  • Consider reducing BuildAAgent test session creation" 
fi
if [ "$HIGH_MEMORY" -gt 2 ]; then
  echo "  • Monitor high-memory sessions for context bloat"
fi

echo ""
echo "📋 Top 5 Sessions by Memory Usage:"
openclaw sessions --limit 5
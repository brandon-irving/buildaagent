# Quick Start: OpenClaw Integration

This is a **5-minute setup** to test BuildAAgent with OpenClaw integration.

## Prerequisites

- Node.js installed
- OpenClaw installed (`npm install -g openclaw`)

## Step 1: Start OpenClaw

```bash
# Start the OpenClaw gateway (runs on port 8080)
openclaw gateway start
```

## Step 2: Configure BuildAAgent

```bash
cd packages/buildaagent

# Copy example config
cp .env.example .env

# Edit .env - only need these for basic testing:
AI_PROVIDER=openclaw
OPENCLAW_GATEWAY_URL=http://localhost:8080
```

## Step 3: Start BuildAAgent

```bash
npm install
npm start
```

You should see:
```
🚀 BuildAAgent API Server running on port 3000
📱 Mobile app can connect to: http://localhost:3000

Configuration:
  AI Provider: openclaw
  OpenClaw Gateway: http://localhost:8080
  OpenClaw Agent ID: default
```

## Step 4: Test Integration

```bash
# Run the integration test
node test-openclaw-integration.js
```

Expected output:
```
🧪 BuildAAgent → OpenClaw Integration Test
==========================================

🔍 Testing OpenClaw gateway directly...
✅ OpenClaw gateway is healthy

🔍 Testing BuildAAgent health...
✅ BuildAAgent API is healthy
   Gateway provider: openclaw

🔍 Testing chat integration...
✅ Chat integration working
   Response: "Hello! How can I help you today?..."

🎉 All tests passed! OpenClaw integration is working.
```

## Step 5: Test with Mobile App

If you have the React Native mobile app running:

1. **Make sure the app points to your API**: Update `API_BASE_URL` to `http://localhost:3000`
2. **Send a message**: The chat will now go through OpenClaw agents
3. **Check logs**: You'll see OpenClaw session creation and message routing

## What Just Happened?

```
Your Mobile App
      ↓
BuildAAgent API Server (port 3000)
      ↓
OpenClaw Gateway (port 8080)  
      ↓
OpenClaw Agent Session
```

Instead of calling Anthropic/OpenAI directly, your mobile app now uses **full OpenClaw agent infrastructure** with:

- **Persistent sessions** (conversations survive app restarts)
- **Tool access** (Gmail, calendar, etc. when configured)
- **Memory** (agents remember context across messages)
- **Multi-agent orchestration** (spawn sub-agents for complex tasks)

## Adding Gmail Integration

To add Gmail to your OpenClaw agents:

1. **Get Google OAuth credentials** (see main README)
2. **Add to .env**:
   ```env
   TOKEN_ENCRYPTION_KEY=your-32-character-key-here
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```
3. **Connect Gmail in mobile app** → Settings → Connect Gmail
4. **OpenClaw agents automatically get access** via token bridge

## Next Steps

- 🔧 **Production**: Configure proper OAuth, encryption keys, etc.
- 📱 **Mobile**: Test with React Native app  
- 🛠️ **Skills**: Add more services (Calendar, Slack, GitHub)
- ⚙️ **Personas**: Customize agent behavior via YAML configs

## Troubleshooting

### "Cannot reach OpenClaw gateway"
```bash
# Check if running
curl http://localhost:8080/api/health

# If not, start it
openclaw gateway start
```

### "Chat integration failed"  
- Check environment variables in `.env`
- Look at console logs for error details
- Verify OpenClaw sessions with `openclaw sessions list`

### "No response from OpenClaw agent"
- OpenClaw agents might be taking time to respond
- Check OpenClaw logs: `openclaw gateway logs`
- Increase timeout in config if needed
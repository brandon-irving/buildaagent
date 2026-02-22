# OpenClaw Integration Guide

This guide shows how to integrate BuildAAgent with OpenClaw to replace direct LLM API calls with full OpenClaw agent infrastructure.

## Architecture

**Before (Direct):**
```
Mobile App → BuildAAgent API → Anthropic/OpenAI API
```

**After (OpenClaw):**
```
Mobile App → BuildAAgent API → OpenClaw Gateway → OpenClaw Agents
```

## Benefits

- **Full agent capabilities**: Memory, tools, multi-agent orchestration
- **Built-in Gmail integration**: OAuth tokens bridge to OpenClaw Gmail skill  
- **Session persistence**: Conversations maintained across app restarts
- **Extensible**: Easy to add more services and skills

## Setup

### 1. Install & Start OpenClaw

```bash
# Install OpenClaw (if not already installed)
npm install -g openclaw

# Start the OpenClaw gateway
openclaw gateway start
```

The gateway will run on `http://localhost:8080` by default.

### 2. Configure BuildAAgent

Copy the example environment file:

```bash
cp packages/buildaagent/.env.example packages/buildaagent/.env
```

Edit `.env` to use OpenClaw:

```env
# Use OpenClaw instead of direct API calls
AI_PROVIDER=openclaw

# OpenClaw connection
OPENCLAW_GATEWAY_URL=http://localhost:8080
OPENCLAW_AGENT_ID=main
OPENCLAW_MODEL=sonnet
OPENCLAW_SESSION_PREFIX=buildaagent

# Gmail OAuth (same as before)
TOKEN_ENCRYPTION_KEY=your-32-character-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 3. Start BuildAAgent

```bash
cd packages/buildaagent
npm start
```

### 4. Test Integration

The mobile app will now communicate with OpenClaw agents:

1. **Mobile app** sends message to `/api/chat`
2. **BuildAAgent** creates/reuses OpenClaw session for the user
3. **OpenClaw agent** processes the message with full tool access
4. **Response** flows back to the mobile app

## Configuration Options

### OpenClaw Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENCLAW_GATEWAY_URL` | `http://localhost:8080` | OpenClaw gateway endpoint |
| `OPENCLAW_AGENT_ID` | `main` | Which OpenClaw agent to use |
| `OPENCLAW_MODEL` | `sonnet` | Default model for agents |
| `OPENCLAW_SESSION_PREFIX` | `buildaagent` | Session naming prefix |

### Session Management

- **One session per mobile user**: Each user gets their own OpenClaw agent session
- **Session persistence**: Sessions are kept active (`cleanup: 'keep'`)
- **Auto-cleanup**: Inactive sessions are periodically cleaned up

## OAuth Token Bridge

Gmail OAuth tokens from the mobile app are automatically available to OpenClaw agents:

1. **Mobile app** connects Gmail via OAuth
2. **BuildAAgent** stores encrypted tokens
3. **OpenClaw agents** can access Gmail via the email-manager skill

This creates a seamless experience where users authenticate once in the mobile app, and their OpenClaw agents have full access to integrated services.

## Troubleshooting

### Gateway Connection Issues

```bash
# Check if OpenClaw gateway is running
curl http://localhost:8080/api/health

# Check BuildAAgent logs
npm start  # Look for "Creating OpenClaw gateway" message
```

### Session Problems

```bash
# List active OpenClaw sessions
openclaw sessions list

# Check specific session
openclaw sessions history <session-key>
```

### OAuth Integration

- Gmail tokens are stored in BuildAAgent's database
- OpenClaw agents access them via the email-manager skill
- Check `/api/auth/gmail/status?user_id=demo-user` to verify connection

## Development

### Testing Direct vs OpenClaw

You can switch between providers by changing `AI_PROVIDER`:

```env
# Direct Anthropic calls (simple)
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=your_key

# OpenClaw integration (full agent capabilities)  
AI_PROVIDER=openclaw
OPENCLAW_GATEWAY_URL=http://localhost:8080
```

### Adding New Services

1. **Add OAuth flow** in BuildAAgent (like Gmail)
2. **Create token bridge** to make tokens available to OpenClaw
3. **OpenClaw skills** automatically get access to the new service

This pattern makes it easy to add Calendar, Slack, GitHub, etc.
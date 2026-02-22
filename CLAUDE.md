# CLAUDE.md - BuildAAgent Development Alignment

> This file keeps Claude AI aligned on project status, decisions, and next steps as we develop BuildAAgent together.

## 🎯 Project Vision

**BuildAAgent** = "Build-A-Bear for AI agents" - a consumer platform where non-technical users can deploy personalized autonomous AI agents running 24/7 on their own infrastructure.

## 🏗️ Architecture Decisions (Locked In)

### Core Architecture
- **Persona-as-config**: YAML files define agent behavior, skills, schedules
- **Skills-first design**: Registry with manifest contracts, 30-min skill creation
- **User-funded inference**: Users provide their own Claude Pro/ChatGPT Plus API keys
- **AgentGateway abstraction**: Ready for Ilana governance middleware later
- **Hostinger infrastructure**: VPS + API for tenant provisioning

### 🔄 MAJOR PIVOT: Mobile-First Interface

**OLD**: Slack/WhatsApp/Discord integrations  
**NEW**: React Native mobile app client

**Why this is better**:
- ✅ Eliminates complex messaging integrations
- ✅ Mobile-first UX perfect for personal assistants  
- ✅ Push notifications for proactive agent behavior
- ✅ Leverages Brandon's React Native expertise
- ✅ App store presence for discovery/credibility

## 📱 Updated Tech Stack

**Backend**:
- Node.js/Express HTTP API
- Agent runtime with persona loading
- Skill registry and execution
- Hostinger VPS deployment

**Mobile Client**: 
- React Native/Expo
- Simple chat interface
- Persona switching
- Push notifications

**Infrastructure**:
- Hostinger API (hapi CLI) for tenant provisioning
- Docker containers for tenant isolation
- Each tenant gets their own API endpoint

## 📂 Current Monorepo Status

```
buildaagent/
├── packages/
│   ├── buildaagent/              # 🎯 HTTP API runtime (Phase 1)
│   ├── buildaagent-mobile/       # 🎯 React Native app (Phase 1) 
│   ├── buildaagent-site/         # 📄 Marketing site (Phase 2)
│   ├── buildaagent-infra/        # 🏗️ Infrastructure scripts (Phase 2)
│   └── buildaagent-web/          # 🌐 Management hub (Phase 3+)
```

**Phase 1 Focus**: Runtime + Mobile App only  
**buildaagent-web**: Skeleton kept for future onboarding/management interface

## 🎯 Phase 1: Core Validation (Current)

**Goal**: Prove persona-as-config works with mobile interface

**Implementation Plan**:
1. **Claude**: Build HTTP API version of agent runtime
   - Load persona YAML files
   - Execute skills (start with web-search)  
   - AgentGateway with user's AI keys
   - REST endpoints for chat

2. **Brandon**: React Native client
   - Simple chat interface
   - Persona switching UI
   - HTTP API integration
   - Basic tenant connection

**Success Criteria**:
- ✅ RN app loads different personas (Personal Assistant vs Content Creator)
- ✅ Agent behavior changes based on persona config
- ✅ Skills execute from mobile app requests
- ✅ User's own AI subscription powers responses

## 🔧 Technical Specifications

### Agent Runtime API
```
POST /api/chat
{
  "message": "What's the weather?",
  "persona": "personal-assistant",
  "user_id": "tenant123"
}

Response:
{
  "response": "Let me check the weather for you! 🌤️",
  "skill_used": "weather-check",
  "persona": "personal-assistant"
}
```

### Persona Config Format (LOCKED IN)
```yaml
name: "Personal Assistant"
skills: [email-manager, calendar-sync, web-search]
behavior:
  tone: "friendly"
  proactiveness: "high" 
cron_schedules:
  - name: "morning-briefing"
    schedule: "0 9 * * MON-FRI"
first_message: "Hey! I'm your personal assistant..."
```

## 🚧 Work Division (Phase 1)

**Claude's Tasks**:
- [x] Convert runtime from CLI to HTTP API ✅
- [x] Implement web-search skill (no auth needed) ✅
- [x] Set up AgentGateway with user API keys ✅
- [x] Create REST endpoints for chat + persona switching ✅
- [x] Test persona loading and behavior changes ✅

**Brandon's Tasks**:
- [ ] Initialize React Native client in `packages/buildaagent-mobile/`
- [ ] Build chat interface UI
- [ ] Implement persona switching
- [ ] HTTP API integration
- [ ] Push notifications setup (for later phases)

**buildaagent-web**: Kept as skeleton for Phase 3+ onboarding/management interface

## 🎪 Demo Flow (Phase 1 Target)

1. Open RN app, connect to local agent API
2. Select "Personal Assistant" persona
3. Send: "What's the weather?" → Friendly, helpful response
4. Switch to "Content Creator" persona  
5. Send same message → Creative, engaging response style
6. Proves persona-as-config actually works!

## 📋 Development Phases

### Phase 1: Core Validation (Current)
- 🎯 **buildaagent** (HTTP API runtime)
- 🎯 **buildaagent-mobile** (React Native client)
- Goal: Prove persona-as-config works with mobile interface

### Phase 2: Infrastructure & Deployment  
- 🏗️ **buildaagent-infra** (Hostinger VM provisioning)
- 📄 **buildaagent-site** (Marketing site + domain)
- Goal: Multi-tenant deployment pipeline

### Phase 3: Onboarding & Management
- 🌐 **buildaagent-web** (Persona builder + account management)
- Goal: Non-technical user onboarding flow
- Desktop interface for complex configuration
- Analytics dashboard, billing, advanced settings

## 🔐 Secrets Management

- User AI keys stored encrypted per tenant
- No shared API costs - users fund their own inference
- Each tenant isolated (separate containers + storage)

## 🚀 Phase 1 Status Update (2026-02-21)

### ✅ HTTP API Runtime (Complete)
- **Server**: Express.js API with CORS for mobile app
- **Core Classes**: PersonaEngine, SkillRegistry, AgentGateway, Database, Logger
- **Endpoints**: `/api/health`, `/api/personas`, `/api/personas/:id`, `/api/chat`
- **Personas**: Personal Assistant + Content Creator (working examples)
- **Skills**: Web search + weather check (working), email/calendar (placeholders)
- **AI Integration**: Anthropic & OpenAI support via DirectGateway
- **Database**: SQLite for conversation history and user preferences

### ✅ Gmail Integration (Complete)
Real email-manager skill replacing the placeholder. Full OAuth flow with encrypted token storage.

**Backend files:**
- `src/services/gmail/types.ts` — OAuth, email, and label types
- `src/services/token-store.ts` — AES-256-GCM encrypted token storage with auto-refresh
- `src/services/gmail/gmail-service.ts` — Gmail REST API client (fetch-based, no googleapis dep)
- `src/skills/email-manager/executor.ts` — Intent detection (read/send/count/search) + Gmail execution
- `src/api/routes/auth.ts` — OAuth callback, status, disconnect endpoints

**New endpoints:**
- `POST /api/auth/gmail/callback` — Exchange auth code for encrypted tokens
- `GET /api/auth/gmail/status?user_id=` — Check connection status
- `POST /api/auth/gmail/disconnect` — Revoke + delete tokens
- `GET /api/services/status?user_id=` — All service statuses

**Mobile files:**
- `src/services/auth.ts` — Native Google Sign-In via `@react-native-google-signin/google-signin`
- `src/screens/SettingsScreen.tsx` — Connected Services UI (connect/disconnect Gmail)
- `App.tsx` — Bottom tab navigator (Chat + Settings)

**Security:** PKCE, AES-256-GCM at rest, auto token refresh, Google revocation on disconnect, graceful disable if `TOKEN_ENCRYPTION_KEY` not set.

### 🔧 Gmail Setup Guide

#### 1. Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project (or select existing)
3. Enable the **Gmail API** (APIs & Services → Library)
4. Go to **APIs & Services → Credentials**
5. Create OAuth 2.0 Client ID — type **Web application** (for backend token exchange)
   - Note the **Client ID** and **Client Secret**
6. Create OAuth 2.0 Client ID — type **iOS** (for native sign-in)
   - Note the **iOS URL scheme** (looks like `com.googleusercontent.apps.XXXX`)
7. Configure OAuth consent screen with scopes: `gmail.readonly`, `gmail.send`, `gmail.labels`, `userinfo.email`

#### 2. Backend Environment (`.env.local`)
```bash
GOOGLE_CLIENT_ID=<Web client ID from step 5>
GOOGLE_CLIENT_SECRET=<Web client secret from step 5>
TOKEN_ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
```

#### 3. Mobile Configuration
- Set `GOOGLE_CLIENT_ID` in `packages/buildaagent-mobile/src/config.ts` to your **Web** client ID
- Set `iosUrlScheme` in `packages/buildaagent-mobile/app.json` plugin config to the iOS URL scheme from step 6

#### 4. Dev Build (required — won't work in Expo Go)
```bash
cd packages/buildaagent-mobile
npx expo prebuild --clean
npx expo run:ios   # or run:android
```

### 🎯 Ready for Testing
```bash
cd packages/buildaagent
npm install
export ANTHROPIC_API_KEY="your-key-here"
npm run dev
```

API available at: http://localhost:3000

## 📝 Notes & Decisions

- **2026-02-21**: Architecture pivot to React Native client
- **2026-02-21**: Gmail integration implemented (backend + mobile)
- **2026-02-21**: Switched from `expo-auth-session` to `@react-native-google-signin/google-signin` for native sign-in UX (avoids redirect URI issues with Expo Go, requires dev build)
- **Domain**: Will register buildaagent.io through Hostinger
- **Deployment**: Hostinger VPS + Docker for tenant isolation
- **Skills**: Web search + weather check (working), email-manager (working with Gmail), calendar (placeholder)

---

*This file should be updated as we make progress and decisions. Keep Claude aligned!* 🤖
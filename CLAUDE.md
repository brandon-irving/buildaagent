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
│   ├── buildaagent/              # ✅ Runtime engine scaffolded
│   ├── buildaagent-web/          # → Will become admin panel
│   ├── buildaagent-site/         # ✅ Marketing site (Next.js)
│   └── buildaagent-infra/        # ✅ Hostinger API scripts
└── buildaagent-mobile/           # 🔜 Brandon will add RN client
```

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
- [ ] Convert runtime from CLI to HTTP API
- [ ] Implement web-search skill (no auth needed)
- [ ] Set up AgentGateway with user API keys
- [ ] Create REST endpoints for chat + persona switching
- [ ] Test persona loading and behavior changes

**Brandon's Tasks**:
- [ ] Initialize React Native client in `/buildaagent-mobile`
- [ ] Build chat interface UI
- [ ] Implement persona switching
- [ ] HTTP API integration
- [ ] Push notifications setup (for later phases)

## 🎪 Demo Flow (Phase 1 Target)

1. Open RN app, connect to local agent API
2. Select "Personal Assistant" persona
3. Send: "What's the weather?" → Friendly, helpful response
4. Switch to "Content Creator" persona  
5. Send same message → Creative, engaging response style
6. Proves persona-as-config actually works!

## 🔄 Phase 2 Preview

After Phase 1 validation:
- Hostinger VM provisioning (each user gets own agent API)
- Tenant management in RN app
- Production deployment pipeline
- More personas and skills

## 🔐 Secrets Management

- User AI keys stored encrypted per tenant
- No shared API costs - users fund their own inference
- Each tenant isolated (separate containers + storage)

## 📝 Notes & Decisions

- **2026-02-21**: Architecture pivot to React Native client
- **Domain**: Will register buildaagent.io through Hostinger
- **Deployment**: Hostinger VPS + Docker for tenant isolation
- **Skills**: Start with web-search (no auth), then email/calendar

---

*This file should be updated as we make progress and decisions. Keep Claude aligned!* 🤖
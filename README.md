# BuildAAgent

> Build-A-Bear for AI agents

BuildAAgent is a consumer-first platform that lets non-technical users deploy their own autonomous AI agent — pre-configured with a persona, connected to their tools, and running 24/7 on their own infrastructure.

## Architecture

- **Persona-as-config** — one runtime engine powers all personas. Personas are YAML files that define a skill bundle, behavioral defaults, cron schedules, and the agent's first message.
- **Skills as first-class entities** — a skill registry with a standard SDK interface and manifest contract. Every skill is discoverable, versioned, and composable across personas.
- **User-funded inference** — the agent runs on the user's own AI subscription (Claude Pro/Max or ChatGPT Plus), buildaagent has zero inference costs.
- **AgentGateway abstraction** — all LLM calls route through a single gateway interface. Ready for governance middleware (Ilana) when available.

## Packages

- **`buildaagent`** — The agent runtime engine (HTTP API)
- **`buildaagent-mobile`** — React Native mobile client (Primary interface)  
- **`buildaagent-web`** — Web management interface (Phase 3+)
- **`buildaagent-site`** — Marketing site
- **`buildaagent-infra`** — Hostinger API scripts and Docker templates for tenant provisioning

### Development Phases

**Phase 1** (Current): Core validation with mobile-first approach  
**Phase 2**: Infrastructure automation and deployment  
**Phase 3**: Web-based onboarding and management interface

## Infrastructure

Built on Hostinger VPS with native Docker support. Tenant provisioning managed via Hostinger API CLI.

## Development

```bash
# Install dependencies
npm install

# Start development servers
npm run dev

# Build all packages
npm run build
```

## License

MIT
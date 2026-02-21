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

This is a pnpm workspace monorepo. Install pnpm globally first:

```bash
npm install -g pnpm
```

Then install all dependencies:

```bash
pnpm install
```

### API Server

```bash
export ANTHROPIC_API_KEY="your-key-here"
pnpm dev:api
```

API available at: http://localhost:3000

### Mobile App

```bash
pnpm dev:mobile
```

### All Scripts

- `pnpm dev:api` - Start the HTTP API server
- `pnpm dev:mobile` - Start the React Native/Expo development server  
- `pnpm build` - Build all packages
- `pnpm test` - Run tests across all packages
- `pnpm lint` - Lint all packages

## License

MIT
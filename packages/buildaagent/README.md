# BuildAAgent Runtime Engine

The core HTTP API server that powers BuildAAgent personas for React Native mobile app integration.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Environment Variables
Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

### 3. Add Your AI API Key
Set your Anthropic or OpenAI API key:
```bash
# For Anthropic (Claude)
export ANTHROPIC_API_KEY="your-claude-api-key"

# For OpenAI (ChatGPT)
export OPENAI_API_KEY="your-openai-api-key"
```

### 4. Start the Server
```bash
npm run dev
```

The API will be available at: http://localhost:3000

## API Endpoints

### Health Check
```bash
GET /api/health
```

### List Available Personas
```bash
GET /api/personas
```

### Get Persona Details
```bash
GET /api/personas/:personaId
```

### Chat with Agent
```bash
POST /api/chat
{
  "message": "What's the weather today?",
  "persona": "personal-assistant",
  "user_id": "mobile_user_123"
}
```

## Available Personas

- **personal-assistant** - Friendly, proactive personal assistant
- **content-creator** - Creative partner for content and social media

## Mobile App Integration

This API is designed to work with the React Native mobile app in `packages/buildaagent-mobile/`.

The mobile app should:
1. Connect to this API server
2. Allow users to switch personas
3. Send chat messages via POST /api/chat
4. Display agent responses with persona-specific behavior

## Configuration

Environment variables:
- `PORT` - Server port (default: 3000)
- `AI_PROVIDER` - 'anthropic' or 'openai' (default: 'anthropic')
- `AI_KEY_REF` - Environment variable name for API key
- `LOG_LEVEL` - 'debug', 'info', 'warn', or 'error'
- `WORKSPACE_PATH` - Directory for database and files
- `PERSONAS_PATH` - Directory containing persona YAML files

## Skills

Current skills available to personas:
- **web-search** - Search the web for information
- **weather-check** - Get weather information
- **email-manager** - Gmail integration (placeholder)
- **calendar-sync** - Calendar integration (placeholder)
- **file-manager** - File operations (placeholder)
- **task-tracker** - Task management (placeholder)

Placeholder skills return demo responses for Phase 1 testing.

## Development

### Add New Persona
1. Create YAML file in `config/personas/`
2. Define name, skills, behavior, and first message
3. Restart server to load new persona

### Add New Skill
1. Register skill in `src/core/skill-registry.ts`
2. Implement skill executor function
3. Add skill to persona's skill list

### Testing
```bash
npm run test
npm run typecheck
```

### Building
```bash
npm run build
npm start  # Run built version
```
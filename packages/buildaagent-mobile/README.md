# BuildAAgent Mobile

React Native/Expo mobile client for BuildAAgent - your personal AI agent platform.

## Features

- 🤖 **Persona Switching** - Switch between different AI personalities (Personal Assistant, Content Creator, etc.)
- 💬 **Real-time Chat** - Chat interface with your AI agent
- 📱 **Mobile-First** - Designed specifically for mobile interaction
- 🔄 **Live API Integration** - Connects to BuildAAgent HTTP API
- 📴 **Offline Mode** - Falls back to mock data when API server is unavailable

## Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- Expo CLI (`npm install -g @expo/cli`)
- BuildAAgent API server running (see `../buildaagent/README.md`)

## Installation

From the monorepo root:

```bash
pnpm install
```

## Development

### Start the development server:

From the monorepo root:

```bash
pnpm dev:mobile
```

Or directly with Expo:

```bash
cd packages/buildaagent-mobile
npx expo start
```

This will open Expo DevTools in your browser.

### Run on device/simulator:

- **iOS Simulator**: Press `i` in the terminal or click "Run on iOS simulator" in DevTools
- **Android Emulator**: Press `a` in the terminal or click "Run on Android device/emulator" in DevTools  
- **Physical Device**: Download Expo Go app and scan the QR code

## Configuration

### API Connection

Update `src/config.ts` to point to your API server:

```typescript
export const API_CONFIG = {
  baseURL: 'http://192.168.1.100:3000', // Use your computer's IP for device testing
  // ...
};
```

**For device testing**: Replace `localhost` with your computer's local IP address.

## Architecture

```
src/
├── components/          # Reusable UI components
│   ├── ChatInterface.tsx    # Main chat UI
│   └── PersonaSelector.tsx  # Persona switching UI
├── screens/            # Screen components
│   └── HomeScreen.tsx      # Main app screen
├── services/          # API and external services
│   └── api.ts             # API service layer
├── types.ts           # TypeScript type definitions
└── config.ts          # App configuration
```

## Key Components

### HomeScreen
- Main app screen that orchestrates everything
- Handles server connection and persona loading
- Manages app state and navigation

### ChatInterface
- Real-time chat with selected AI persona
- Message history and typing indicators
- Displays skill usage and timestamps

### PersonaSelector
- Horizontal scrollable persona cards
- Visual indicators for selected persona
- Shows persona behavior settings

### ApiService
- HTTP client for BuildAAgent API
- Handles health checks and error states
- Type-safe request/response handling

## Testing

### With API Server (Recommended)

1. Start the BuildAAgent API server:
   ```bash
   # From monorepo root
   pnpm dev:api
   ```

2. Update API config with your IP address (for device testing)

3. Start the mobile app:
   ```bash
   # From monorepo root  
   pnpm dev:mobile
   ```

### Offline Mode

If the API server is not available, the app will offer to run in offline mode with mock personas.

## Features in Detail

### Persona Switching
- Switch between AI personalities with different behaviors
- Each persona has distinct tone, proactiveness, and skills
- Visual persona selector with icons and descriptions

### Chat Interface
- Clean, modern chat UI similar to messaging apps
- Real-time message exchange with API server
- Shows which skills the AI used for responses
- Timestamps and message status indicators

### Error Handling
- Graceful fallback to offline mode
- Network error handling with retry options
- User-friendly error messages

## Customization

### Adding New Persona Icons

Edit `src/components/PersonaSelector.tsx`:

```typescript
const iconMap: { [key: string]: keyof typeof Ionicons.glyphMap } = {
  'Your Persona Name': 'your-icon-name',
  // ...
};
```

### Styling

The app uses a consistent design system:
- Primary color: `#007AFF` (iOS blue)
- Background: `#f5f5f5` (light gray)
- Cards: White with subtle shadows
- Typography: System fonts with proper hierarchy

## Troubleshooting

### "Cannot connect to API server"
- Ensure BuildAAgent API server is running on port 3000
- For device testing, use your computer's IP instead of localhost
- Check firewall settings if testing on physical device

### TypeScript errors
- Run `pnpm install` from monorepo root to ensure all dependencies are installed
- Check that all required packages are properly installed

### Expo build issues
- Clear cache: `npx expo r -c`
- Reinstall node_modules: `rm -rf node_modules && pnpm install` (from monorepo root)

## Next Steps

This foundation includes:
- ✅ Persona switching UI
- ✅ Chat interface with real-time messaging
- ✅ API integration with error handling
- ✅ Offline mode fallback
- ✅ Clean, mobile-first design

Ready for Brandon to test and iterate! 🚀
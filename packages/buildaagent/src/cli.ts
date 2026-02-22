/**
 * BuildAAgent CLI Entry Point
 * 
 * Starts the HTTP API server for mobile app integration
 * Loads configuration from environment variables
 */

import dotenv from 'dotenv'
import path from 'path'

// Load env files: package-level first, then monorepo root as fallback
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), '../../.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') })

import { BuildAAgentServer, ServerConfig } from './api/server'

function getConfig(): ServerConfig {
  const config: ServerConfig = {
    port: parseInt(process.env.PORT || '3000'),
    logLevel: (process.env.LOG_LEVEL as any) || 'info',
    aiProvider: (process.env.AI_PROVIDER as any) || 'anthropic',
    aiKeyRef: process.env.AI_KEY_REF || 'ANTHROPIC_API_KEY',
    workspacePath: process.env.WORKSPACE_PATH || path.join(process.cwd(), 'workspace'),
    personasPath: process.env.PERSONAS_PATH || path.join(process.cwd(), 'config', 'personas'),
    skillsPath: process.env.SKILLS_PATH || path.join(process.cwd(), 'src', 'skills')
  }

  // Add OpenClaw configuration if using openclaw provider
  if (config.aiProvider === 'openclaw') {
    config.openclaw = {
      gatewayUrl: process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789', // For reference only
      agentId: process.env.OPENCLAW_AGENT_ID,
      model: process.env.OPENCLAW_MODEL || 'sonnet',
      sessionPrefix: process.env.OPENCLAW_SESSION_PREFIX || 'buildaagent'
    }
  }

  return config
}

async function main() {
  console.log('🤖 BuildAAgent - Starting HTTP API Server...')
  console.log('')

  try {
    const config = getConfig()
    
    const hasApiKey = !!(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY)

    console.log('Configuration:')
    console.log(`  Port: ${config.port}`)
    console.log(`  AI Provider: ${config.aiProvider}`)
    
    if (config.aiProvider === 'openclaw') {
      console.log(`  OpenClaw Gateway: ${config.openclaw?.gatewayUrl || 'not configured'}`)
      console.log(`  OpenClaw Agent ID: ${config.openclaw?.agentId || 'default'}`)
      console.log(`  OpenClaw Model: ${config.openclaw?.model || 'sonnet'}`)
    } else {
      console.log(`  API Key: ${hasApiKey ? 'loaded' : '⚠️  MISSING'}`)
    }
    
    console.log(`  Log Level: ${config.logLevel}`)
    console.log(`  Workspace: ${config.workspacePath}`)
    console.log(`  Personas: ${config.personasPath}`)
    console.log('')

    const server = new BuildAAgentServer(config)
    
    // Graceful shutdown handling
    const shutdown = async (signal: string) => {
      console.log(`\n📴 Received ${signal}, shutting down gracefully...`)
      await server.stop()
      process.exit(0)
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))

    await server.start()
    
    console.log('')
    console.log('🎯 Ready for mobile app connections!')
    console.log('📱 Test endpoints:')
    console.log(`   GET  http://localhost:${config.port}/api/health`)
    console.log(`   GET  http://localhost:${config.port}/api/personas`)
    console.log(`   POST http://localhost:${config.port}/api/chat`)
    console.log('')
    console.log('💡 Connect your React Native app to this URL')

  } catch (error) {
    console.error('❌ Failed to start BuildAAgent server:', error)
    process.exit(1)
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  main()
}
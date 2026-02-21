/**
 * BuildAAgent CLI Entry Point
 * 
 * Starts the HTTP API server for mobile app integration
 * Loads configuration from environment variables
 */

import { BuildAAgentServer, ServerConfig } from './api/server'
import path from 'path'

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

  return config
}

async function main() {
  console.log('🤖 BuildAAgent - Starting HTTP API Server...')
  console.log('')

  try {
    const config = getConfig()
    
    console.log('Configuration:')
    console.log(`  Port: ${config.port}`)
    console.log(`  AI Provider: ${config.aiProvider}`)
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
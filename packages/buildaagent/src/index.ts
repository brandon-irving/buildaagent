/**
 * BuildAAgent Runtime Engine
 * 
 * The core runtime that powers all personas through:
 * - Persona-as-config system
 * - Skill registry and execution
 * - AgentGateway abstraction for LLM calls
 * - Persistent memory and browser state
 */

import { PersonaEngine } from './core/persona-engine'
import { SkillRegistry } from './core/skill-registry'
import { AgentGateway, DirectGateway } from './gateway/agent-gateway'
import { Database } from './core/database'
import { Logger } from './core/logger'

export interface RuntimeConfig {
  tenantId: string
  personaConfig: string
  aiProvider: 'anthropic' | 'openai'
  aiKeyRef: string
  workspacePath: string
  memoryPath: string
  browserPath: string
  port?: number
  logLevel?: 'debug' | 'info' | 'warn' | 'error'
}

export class BuildAAgentRuntime {
  private personaEngine: PersonaEngine
  private skillRegistry: SkillRegistry
  private gateway: AgentGateway
  private database: Database
  private logger: Logger

  constructor(private config: RuntimeConfig) {
    this.logger = new Logger(config.logLevel || 'info')
    this.database = new Database(config.tenantId, config.workspacePath)
    this.skillRegistry = new SkillRegistry(this.logger)
    this.gateway = new DirectGateway(config.aiProvider, config.aiKeyRef)
    this.personaEngine = new PersonaEngine(
      config.personaConfig,
      this.skillRegistry,
      this.gateway,
      this.database,
      this.logger
    )
  }

  async start(): Promise<void> {
    this.logger.info(`🚀 Starting BuildAAgent Runtime for tenant: ${this.config.tenantId}`)
    
    try {
      // Initialize core systems
      await this.database.init()
      await this.skillRegistry.loadSkills()
      await this.personaEngine.loadPersona(this.config.personaConfig)
      
      // Start the persona
      await this.personaEngine.start()
      
      this.logger.info('✅ BuildAAgent Runtime started successfully')
      
      // Send first message if this is a fresh deployment
      const isFirstRun = await this.database.isFirstRun()
      if (isFirstRun) {
        await this.personaEngine.sendFirstMessage()
      }
      
    } catch (error) {
      this.logger.error('❌ Failed to start BuildAAgent Runtime:', error)
      throw error
    }
  }

  async stop(): Promise<void> {
    this.logger.info('⏹️ Stopping BuildAAgent Runtime...')
    
    await this.personaEngine.stop()
    await this.database.close()
    
    this.logger.info('✅ BuildAAgent Runtime stopped')
  }

  // Health check endpoint
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy', details: any }> {
    try {
      const personaStatus = await this.personaEngine.getStatus()
      const dbStatus = await this.database.ping()
      const gatewayStatus = await this.gateway.healthCheck()
      
      const allHealthy = personaStatus.healthy && dbStatus && gatewayStatus.healthy
      
      return {
        status: allHealthy ? 'healthy' : 'unhealthy',
        details: {
          persona: personaStatus,
          database: dbStatus,
          gateway: gatewayStatus,
          tenant: this.config.tenantId,
          uptime: process.uptime()
        }
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error.message }
      }
    }
  }
}

// CLI entry point
if (require.main === module) {
  const config: RuntimeConfig = {
    tenantId: process.env.TENANT_ID!,
    personaConfig: process.env.PERSONA_CONFIG || 'personal-assistant',
    aiProvider: (process.env.AI_PROVIDER as any) || 'anthropic',
    aiKeyRef: process.env.AI_KEY_REF!,
    workspacePath: process.env.WORKSPACE_PATH || '/app/workspace',
    memoryPath: process.env.MEMORY_PATH || '/app/memory',
    browserPath: process.env.BROWSER_PATH || '/app/browser',
    port: parseInt(process.env.PORT || '3000'),
    logLevel: (process.env.LOG_LEVEL as any) || 'info'
  }

  const runtime = new BuildAAgentRuntime(config)

  // Graceful shutdown
  process.on('SIGTERM', () => runtime.stop())
  process.on('SIGINT', () => runtime.stop())

  runtime.start().catch((error) => {
    console.error('Fatal error starting runtime:', error)
    process.exit(1)
  })
}
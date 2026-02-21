/**
 * BuildAAgent HTTP API Server
 * 
 * REST API that serves the React Native mobile app
 * Provides chat, persona management, and health check endpoints
 */

import express from 'express'
import cors from 'cors'
import { PersonaEngine } from '../core/persona-engine'
import { SkillRegistry } from '../core/skill-registry'
import { AgentGateway, DirectGateway } from '../gateway/agent-gateway'
import { Database } from '../core/database'
import { Logger } from '../core/logger'

export interface ServerConfig {
  port: number
  logLevel: 'debug' | 'info' | 'warn' | 'error'
  aiProvider: 'anthropic' | 'openai'
  aiKeyRef: string
  workspacePath: string
  personasPath: string
  skillsPath: string
}

export class BuildAAgentServer {
  private app: express.Application
  private personaEngine: PersonaEngine
  private skillRegistry: SkillRegistry
  private gateway: AgentGateway
  private database: Database
  private logger: Logger
  private server: any

  constructor(private config: ServerConfig) {
    this.app = express()
    this.logger = new Logger(config.logLevel)
    this.database = new Database('api-server', config.workspacePath)
    this.skillRegistry = new SkillRegistry(this.logger)
    this.gateway = new DirectGateway(config.aiProvider, config.aiKeyRef)
    
    this.setupMiddleware()
    this.setupRoutes()
  }

  private setupMiddleware(): void {
    // CORS for React Native mobile app
    this.app.use(cors({
      origin: ['http://localhost:19000', 'http://localhost:19001'], // Expo dev server
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }))

    this.app.use(express.json({ limit: '10mb' }))
    this.app.use(express.urlencoded({ extended: true }))

    // Request logging
    this.app.use((req, res, next) => {
      this.logger.info(`${req.method} ${req.path}`, { 
        body: req.body,
        query: req.query 
      })
      next()
    })
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/api/health', async (req, res) => {
      try {
        const health = await this.healthCheck()
        res.json(health)
      } catch (error) {
        res.status(500).json({ 
          status: 'unhealthy', 
          error: error.message 
        })
      }
    })

    // Get available personas
    this.app.get('/api/personas', async (req, res) => {
      try {
        const personas = await this.getAvailablePersonas()
        res.json({ personas })
      } catch (error) {
        this.logger.error('Error fetching personas:', error)
        res.status(500).json({ error: 'Failed to fetch personas' })
      }
    })

    // Get specific persona details  
    this.app.get('/api/personas/:personaId', async (req, res) => {
      try {
        const { personaId } = req.params
        const persona = await this.getPersonaDetails(personaId)
        res.json({ persona })
      } catch (error) {
        this.logger.error(`Error fetching persona ${req.params.personaId}:`, error)
        res.status(404).json({ error: 'Persona not found' })
      }
    })

    // Chat endpoint - main interaction with agent
    this.app.post('/api/chat', async (req, res) => {
      try {
        const { message, persona, user_id } = req.body

        if (!message) {
          return res.status(400).json({ error: 'Message is required' })
        }

        const response = await this.processMessage(
          message, 
          persona || 'personal-assistant', 
          user_id || 'mobile_user'
        )

        res.json(response)
      } catch (error) {
        this.logger.error('Error processing chat message:', error)
        res.status(500).json({ error: 'Failed to process message' })
      }
    })

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({ error: 'Endpoint not found' })
    })

    // Error handler
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      this.logger.error('Server error:', error)
      res.status(500).json({ error: 'Internal server error' })
    })
  }

  private async processMessage(message: string, personaId: string, userId: string) {
    this.logger.info(`Processing message for persona: ${personaId}, user: ${userId}`)
    
    // Load persona if not already loaded or if switching personas
    if (!this.personaEngine || this.personaEngine.currentPersona !== personaId) {
      this.personaEngine = new PersonaEngine(
        personaId,
        this.skillRegistry,
        this.gateway,
        this.database,
        this.logger
      )
      await this.personaEngine.loadPersona(personaId)
    }

    // Process the message through the persona engine
    const response = await this.personaEngine.processMessage(message, userId)
    
    return {
      response: response.message,
      persona: personaId,
      skill_used: response.skillUsed,
      timestamp: new Date().toISOString(),
      user_id: userId
    }
  }

  private async getAvailablePersonas() {
    // Read persona files from config directory
    const fs = await import('fs/promises')
    const path = await import('path')
    
    try {
      const personaFiles = await fs.readdir(this.config.personasPath)
      const yamlFiles = personaFiles.filter(file => file.endsWith('.yaml') || file.endsWith('.yml'))
      
      const personas = []
      for (const file of yamlFiles) {
        const personaId = path.basename(file, path.extname(file))
        const personaPath = path.join(this.config.personasPath, file)
        
        try {
          const content = await fs.readFile(personaPath, 'utf8')
          const yaml = await import('yaml')
          const persona = yaml.parse(content)
          
          personas.push({
            id: personaId,
            name: persona.name,
            description: persona.description,
            version: persona.version
          })
        } catch (error) {
          this.logger.warn(`Failed to parse persona file ${file}:`, error)
        }
      }
      
      return personas
    } catch (error) {
      this.logger.error('Error reading personas directory:', error)
      return []
    }
  }

  private async getPersonaDetails(personaId: string) {
    const fs = await import('fs/promises')
    const path = await import('path')
    
    const personaPath = path.join(this.config.personasPath, `${personaId}.yaml`)
    
    try {
      const content = await fs.readFile(personaPath, 'utf8')
      const yaml = await import('yaml')
      const persona = yaml.parse(content)
      
      return {
        id: personaId,
        ...persona
      }
    } catch (error) {
      throw new Error(`Persona ${personaId} not found`)
    }
  }

  private async healthCheck() {
    const dbStatus = await this.database.ping()
    const gatewayStatus = await this.gateway.healthCheck()
    
    return {
      status: dbStatus && gatewayStatus.healthy ? 'healthy' : 'unhealthy',
      details: {
        database: dbStatus,
        gateway: gatewayStatus,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
      }
    }
  }

  async start(): Promise<void> {
    try {
      // Initialize core systems
      await this.database.init()
      await this.skillRegistry.loadSkills(this.config.skillsPath)
      
      // Start HTTP server
      this.server = this.app.listen(this.config.port, () => {
        this.logger.info(`🚀 BuildAAgent API Server running on port ${this.config.port}`)
        this.logger.info(`📱 Mobile app can connect to: http://localhost:${this.config.port}`)
        this.logger.info(`🎭 Available endpoints:`)
        this.logger.info(`   GET  /api/health - Health check`)
        this.logger.info(`   GET  /api/personas - List available personas`)
        this.logger.info(`   GET  /api/personas/:id - Get persona details`)
        this.logger.info(`   POST /api/chat - Chat with agent`)
      })
    } catch (error) {
      this.logger.error('❌ Failed to start server:', error)
      throw error
    }
  }

  async stop(): Promise<void> {
    if (this.server) {
      this.server.close()
      this.logger.info('⏹️ Server stopped')
    }
    
    if (this.database) {
      await this.database.close()
    }
  }
}
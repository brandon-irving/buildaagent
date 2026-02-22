/**
 * PersonaEngine - Core persona loading and message processing
 * 
 * Loads persona YAML configurations and processes messages according to 
 * the persona's behavior, skills, and context
 */

import { SkillRegistry, SkillExecutionResult } from './skill-registry'
import { AgentGateway } from '../gateway/agent-gateway'
import { MockDatabase as Database } from './mock-database'
import { Logger } from './logger'

export interface PersonaConfig {
  name: string
  description: string
  version: string
  skills: string[]
  behavior: {
    tone: string
    proactiveness: string
    formality: string
    emoji_usage: boolean
  }
  first_message: string
  cron_schedules?: Array<{
    name: string
    schedule: string
    task: string
  }>
}

export interface MessageResponse {
  message: string
  skillUsed?: string
  persona: string
}

export class PersonaEngine {
  private persona: PersonaConfig | null = null
  public currentPersona: string | null = null

  constructor(
    private personaId: string,
    private skillRegistry: SkillRegistry,
    private gateway: AgentGateway,
    private database: Database,
    private logger: Logger
  ) {}

  async loadPersona(personaId: string): Promise<void> {
    this.logger.info(`Loading persona: ${personaId}`)
    
    try {
      const fs = await import('fs/promises')
      const path = await import('path')
      const yaml = await import('yaml')
      
      // Try different possible paths for persona configs
      const possiblePaths = [
        path.join(process.cwd(), 'config', 'personas', `${personaId}.yaml`),
        path.join(process.cwd(), 'packages', 'buildaagent', 'config', 'personas', `${personaId}.yaml`),
        path.join(__dirname, '..', '..', 'config', 'personas', `${personaId}.yaml`)
      ]
      
      let personaContent = null
      let loadedPath = null
      
      for (const personaPath of possiblePaths) {
        try {
          personaContent = await fs.readFile(personaPath, 'utf8')
          loadedPath = personaPath
          break
        } catch (error) {
          // Try next path
          continue
        }
      }
      
      if (!personaContent) {
        throw new Error(`Persona configuration not found: ${personaId}`)
      }
      
      this.persona = yaml.parse(personaContent)
      this.currentPersona = personaId
      
      this.logger.info(`✅ Persona loaded: ${this.persona.name}`, {
        version: this.persona.version,
        skills: this.persona.skills.length,
        path: loadedPath
      })
    } catch (error) {
      this.logger.error(`Failed to load persona ${personaId}:`, error)
      throw error
    }
  }

  async processMessage(message: string, userId: string): Promise<MessageResponse> {
    if (!this.persona) {
      throw new Error('No persona loaded')
    }

    this.logger.info('Processing message', { 
      persona: this.persona.name, 
      userId,
      messageLength: message.length 
    })

    try {
      // Check if message requires skill execution
      const skillResult = await this.tryExecuteSkill(message, userId)
      
      // Build context for the LLM
      const context = this.buildPersonaContext(message, skillResult)
      
      // Generate response via AgentGateway
      const response = await this.gateway.generateResponse(context, userId)
      
      // Store conversation in database
      await this.storeConversation(message, response, userId, skillResult?.skillName)
      
      return {
        message: response,
        skillUsed: skillResult?.skillName,
        persona: this.currentPersona!
      }
    } catch (error) {
      this.logger.error('Error processing message:', error)
      
      // Return graceful error response in persona's tone
      return {
        message: this.getErrorResponse(),
        persona: this.currentPersona!
      }
    }
  }

  private async tryExecuteSkill(message: string, userId: string): Promise<SkillExecutionResult | null> {
    if (!this.persona) return null

    // Build a list of available skills with descriptions for the LLM
    const availableSkills = this.persona.skills
      .filter(name => this.skillRegistry.hasSkill(name))
      .map(name => {
        const manifest = this.skillRegistry.getSkillManifest(name)
        return `- ${name}: ${manifest?.description || 'No description'}`
      })

    if (availableSkills.length === 0) return null

    // Ask the LLM which skill (if any) to use
    const routingPrompt = `You are a skill router. Given a user message and available skills, decide which skill to use.

Available skills:
${availableSkills.join('\n')}

User message: "${message}"

Respond with ONLY the skill name (e.g. "email-manager") or "none" if no skill is needed. Do not explain.`

    try {
      const decision = await this.routeWithLLM(routingPrompt)
      const skillName = decision.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')

      this.logger.info(`Skill router decided: ${skillName}`)

      if (skillName === 'none' || !this.skillRegistry.hasSkill(skillName)) {
        return null
      }

      if (!this.persona.skills.includes(skillName)) {
        return null
      }

      return await this.skillRegistry.executeSkill(skillName, {
        query: message,
        userId
      })
    } catch (error: any) {
      this.logger.warn('Skill routing failed, proceeding without skill:', error)
      return null
    }
  }

  private buildPersonaContext(message: string, skillResult?: SkillExecutionResult | null): string {
    if (!this.persona) return message

    let context = `You are ${this.persona.name}, ${this.persona.description}.\n\n`
    
    // Add behavioral instructions
    const behavior = this.persona.behavior
    context += `Behavioral guidelines:\n`
    context += `- Tone: ${behavior.tone}\n`
    context += `- Formality: ${behavior.formality}\n`
    context += `- Use emojis: ${behavior.emoji_usage ? 'yes' : 'no'}\n`
    context += `- Proactiveness level: ${behavior.proactiveness}\n\n`
    
    // Add skill context if skill was executed
    if (skillResult) {
      context += `I just executed the '${skillResult.skillName}' skill with this result:\n`
      context += `${skillResult.result}\n\n`
      context += `Please incorporate this information naturally into your response.\n\n`
    }
    
    context += `User message: ${message}\n\n`
    context += `Respond as ${this.persona.name} would, following the behavioral guidelines above.`
    
    return context
  }

  private getErrorResponse(): string {
    if (!this.persona) {
      return "I'm sorry, I encountered an error processing your message."
    }

    const tone = this.persona.behavior.tone
    const emoji = this.persona.behavior.emoji_usage
    
    if (tone === 'friendly') {
      return emoji 
        ? "Oops! 😅 I ran into a small issue there. Could you try asking that again?"
        : "Sorry about that! I had a little hiccup processing your message. Could you try again?"
    } else if (tone === 'professional') {
      return "I apologize, but I encountered an error processing your request. Please try again."
    } else {
      return "Something went wrong there. Mind trying that again?"
    }
  }

  private async storeConversation(
    userMessage: string, 
    agentResponse: string, 
    userId: string, 
    skillUsed?: string
  ): Promise<void> {
    try {
      await this.database.storeConversation({
        userId,
        userMessage,
        agentResponse,
        persona: this.currentPersona!,
        skillUsed,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      this.logger.error('Failed to store conversation:', error)
      // Don't throw - storage failure shouldn't break the response
    }
  }

  async sendFirstMessage(): Promise<string> {
    if (!this.persona) {
      throw new Error('No persona loaded')
    }

    return this.persona.first_message
  }

  async getStatus(): Promise<{ healthy: boolean, persona?: string }> {
    return {
      healthy: this.persona !== null,
      persona: this.currentPersona || undefined
    }
  }

  /**
   * Fast LLM call for skill routing — uses haiku-level model with minimal tokens
   */
  private async routeWithLLM(prompt: string): Promise<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('No ANTHROPIC_API_KEY for routing')
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 20,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Routing LLM error: ${response.status} ${error}`)
    }

    const data = await response.json() as { content: Array<{ text: string }> }
    return data.content[0]?.text || 'none'
  }

  async stop(): Promise<void> {
    this.logger.info(`Stopping PersonaEngine for: ${this.currentPersona}`)
    this.persona = null
    this.currentPersona = null
  }
}
/**
 * SkillRegistry - Manages and executes agent skills
 * 
 * Loads skills from the skills directory and provides execution interface
 * Skills are the building blocks that give personas their capabilities
 */

import { Logger } from './logger'

export interface SkillExecutionResult {
  skillName: string
  result: string
  success: boolean
  error?: string
}

export interface SkillManifest {
  name: string
  version: string
  description: string
  capabilities: Array<{
    name: string
    description: string
    parameters: any[]
  }>
  dependencies?: Array<{
    skill: string
    version: string
  }>
}

export interface SkillExecutionParams {
  query: string
  userId: string
  [key: string]: any
}

export class SkillRegistry {
  private skills = new Map<string, SkillManifest>()
  private skillExecutors = new Map<string, Function>()

  constructor(private logger: Logger) {}

  async loadSkills(skillsPath?: string): Promise<void> {
    this.logger.info('Loading skills...')
    
    // For Phase 1, we'll register built-in skills programmatically
    // Later phases can load from filesystem
    this.registerBuiltInSkills()
    
    this.logger.info(`✅ Loaded ${this.skills.size} skills`, {
      skills: Array.from(this.skills.keys())
    })
  }

  private registerBuiltInSkills(): void {
    // Register web-search skill
    this.registerSkill({
      name: 'web-search',
      version: '1.0.0',
      description: 'Search the web for information using DuckDuckGo',
      capabilities: [
        {
          name: 'search',
          description: 'Search the web for a query',
          parameters: [
            { name: 'query', type: 'string', required: true }
          ]
        }
      ]
    }, this.executeWebSearch.bind(this))

    // Register weather-check skill  
    this.registerSkill({
      name: 'weather-check',
      version: '1.0.0',
      description: 'Get current weather information',
      capabilities: [
        {
          name: 'get_weather',
          description: 'Get weather for a location',
          parameters: [
            { name: 'location', type: 'string', required: false }
          ]
        }
      ]
    }, this.executeWeatherCheck.bind(this))

    // Placeholder skills for persona compatibility
    this.registerPlaceholderSkill('email-manager', 'Gmail integration for reading and sending emails')
    this.registerPlaceholderSkill('calendar-sync', 'Calendar integration for scheduling and reminders')
    this.registerPlaceholderSkill('file-manager', 'File organization and management')
    this.registerPlaceholderSkill('task-tracker', 'Task and todo list management')
  }

  private registerSkill(manifest: SkillManifest, executor: Function): void {
    this.skills.set(manifest.name, manifest)
    this.skillExecutors.set(manifest.name, executor)
    this.logger.debug(`Registered skill: ${manifest.name}`)
  }

  private registerPlaceholderSkill(name: string, description: string): void {
    this.registerSkill({
      name,
      version: '0.1.0',
      description,
      capabilities: [
        {
          name: 'execute',
          description: 'Execute skill functionality',
          parameters: []
        }
      ]
    }, this.executePlaceholderSkill.bind(this))
  }

  async executeSkill(skillName: string, params: SkillExecutionParams): Promise<SkillExecutionResult> {
    this.logger.info(`Executing skill: ${skillName}`, { params })

    const executor = this.skillExecutors.get(skillName)
    if (!executor) {
      return {
        skillName,
        result: `Skill '${skillName}' not found`,
        success: false,
        error: 'Skill not found'
      }
    }

    try {
      const result = await executor(params)
      return {
        skillName,
        result,
        success: true
      }
    } catch (error) {
      this.logger.error(`Skill ${skillName} execution failed:`, error)
      return {
        skillName,
        result: `Error executing ${skillName}: ${error.message}`,
        success: false,
        error: error.message
      }
    }
  }

  private async executeWebSearch(params: SkillExecutionParams): Promise<string> {
    const query = params.query
    this.logger.info(`Web search for: ${query}`)

    try {
      // Use a simple approach to simulate web search
      // In production, this would call actual search APIs
      const searchResults = await this.performWebSearch(query)
      
      return `Search results for "${query}":\n\n${searchResults}`
    } catch (error) {
      throw new Error(`Web search failed: ${error.message}`)
    }
  }

  private async performWebSearch(query: string): Promise<string> {
    // Simulate web search with some realistic responses
    // This is a placeholder for actual web search implementation
    
    const mockResults = {
      'weather': 'Current weather conditions vary by location. For accurate weather information, please specify your location.',
      'time': `The current time is ${new Date().toLocaleTimeString()}.`,
      'date': `Today is ${new Date().toLocaleDateString()}.`,
      'news': 'Latest news headlines are available from various news sources online.',
      'technology': 'Latest technology news covers AI developments, software updates, and hardware releases.',
    }

    const queryLower = query.toLowerCase()
    
    // Find matching mock result
    for (const [keyword, result] of Object.entries(mockResults)) {
      if (queryLower.includes(keyword)) {
        return result
      }
    }

    // Generic response for other queries
    return `I found several results for "${query}". Here's a summary of the information:\n\n` +
           `• Search results typically include multiple sources and perspectives\n` +
           `• Information may vary in accuracy and recency\n` +
           `• Consider checking multiple sources for important topics\n\n` +
           `For more specific results, try refining your search query.`
  }

  private async executeWeatherCheck(params: SkillExecutionParams): Promise<string> {
    const location = params.location || 'current location'
    this.logger.info(`Weather check for: ${location}`)

    // Simulate weather check
    const weatherConditions = ['sunny', 'cloudy', 'partly cloudy', 'rainy', 'overcast']
    const temperatures = [65, 72, 68, 75, 70, 63, 77]
    
    const condition = weatherConditions[Math.floor(Math.random() * weatherConditions.length)]
    const temperature = temperatures[Math.floor(Math.random() * temperatures.length)]
    
    return `Current weather for ${location}:\n` +
           `🌤️ ${condition.charAt(0).toUpperCase() + condition.slice(1)}\n` +
           `🌡️ ${temperature}°F\n` +
           `\n(Note: This is a demo response. In production, this would use real weather APIs)`
  }

  private async executePlaceholderSkill(params: SkillExecutionParams): Promise<string> {
    const skill = this.skills.get(params.skillName)
    const skillName = skill?.name || 'unknown skill'
    
    return `${skillName} functionality is coming soon! 🚧\n\n` +
           `This skill (${skillName}) is planned for future development phases. ` +
           `Currently showing placeholder response for testing purposes.`
  }

  /**
   * Register an external skill, replacing any existing registration (including placeholders).
   * Used to wire real skill implementations (like Gmail) at server startup.
   */
  registerExternalSkill(manifest: SkillManifest, executor: (params: SkillExecutionParams) => Promise<string>): void {
    this.skills.set(manifest.name, manifest)
    this.skillExecutors.set(manifest.name, executor)
    this.logger.info(`Registered external skill: ${manifest.name} v${manifest.version}`)
  }

  getAvailableSkills(): string[] {
    return Array.from(this.skills.keys())
  }

  getSkillManifest(skillName: string): SkillManifest | undefined {
    return this.skills.get(skillName)
  }

  hasSkill(skillName: string): boolean {
    return this.skills.has(skillName)
  }
}
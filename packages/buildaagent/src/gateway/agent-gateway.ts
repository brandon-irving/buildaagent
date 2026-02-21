/**
 * AgentGateway - Abstraction layer for LLM API calls
 * 
 * Provides a unified interface for different AI providers (Anthropic, OpenAI)
 * Ready for governance middleware (Ilana) integration in future phases
 */

export interface HealthCheckResult {
  healthy: boolean
  provider?: string
  error?: string
}

export interface AgentGateway {
  generateResponse(context: string, userId: string): Promise<string>
  healthCheck(): Promise<HealthCheckResult>
}

/**
 * DirectGateway - Direct API calls to AI providers
 * Uses user's own API keys for zero-cost inference
 */
export class DirectGateway implements AgentGateway {
  private apiKey: string

  constructor(
    private provider: 'anthropic' | 'openai',
    apiKeyRef: string
  ) {
    // In production, apiKeyRef would be a reference to encrypted storage
    // For Phase 1, we'll read from environment variables
    this.apiKey = this.loadApiKey(apiKeyRef)
  }

  private loadApiKey(apiKeyRef: string): string {
    // Try to load API key from environment
    const envKey = process.env[apiKeyRef]
    if (envKey) {
      return envKey
    }

    // Try direct key (for testing)
    if (apiKeyRef.startsWith('sk-') || apiKeyRef.startsWith('claude-')) {
      return apiKeyRef
    }

    // Fallback to provider-specific env vars
    if (this.provider === 'anthropic') {
      return process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || ''
    } else if (this.provider === 'openai') {
      return process.env.OPENAI_API_KEY || ''
    }

    return ''
  }

  async generateResponse(context: string, userId: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error(`No API key configured for provider: ${this.provider}`)
    }

    switch (this.provider) {
      case 'anthropic':
        return this.callAnthropicAPI(context, userId)
      case 'openai':
        return this.callOpenAIAPI(context, userId)
      default:
        throw new Error(`Unsupported provider: ${this.provider}`)
    }
  }

  private async callAnthropicAPI(context: string, userId: string): Promise<string> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: context
            }
          ]
        })
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Anthropic API error: ${response.status} ${error}`)
      }

      const data = await response.json()
      
      if (data.content && data.content.length > 0) {
        return data.content[0].text
      } else {
        throw new Error('Unexpected Anthropic API response format')
      }
    } catch (error) {
      throw new Error(`Anthropic API call failed: ${error.message}`)
    }
  }

  private async callOpenAIAPI(context: string, userId: string): Promise<string> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: context
            }
          ],
          user: userId
        })
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`OpenAI API error: ${response.status} ${error}`)
      }

      const data = await response.json()
      
      if (data.choices && data.choices.length > 0) {
        return data.choices[0].message.content
      } else {
        throw new Error('Unexpected OpenAI API response format')
      }
    } catch (error) {
      throw new Error(`OpenAI API call failed: ${error.message}`)
    }
  }

  async healthCheck(): Promise<HealthCheckResult> {
    if (!this.apiKey) {
      return {
        healthy: false,
        provider: this.provider,
        error: 'No API key configured'
      }
    }

    try {
      // Simple test call to check API connectivity
      const testContext = 'Respond with just the word "OK" to confirm the API is working.'
      await this.generateResponse(testContext, 'health_check')
      
      return {
        healthy: true,
        provider: this.provider
      }
    } catch (error) {
      return {
        healthy: false,
        provider: this.provider,
        error: error.message
      }
    }
  }
}

/**
 * IlanaGateway - Governance-enabled gateway for future integration
 * Will wrap DirectGateway with policy enforcement, auditing, and cost controls
 */
export class IlanaGateway implements AgentGateway {
  constructor(
    private directGateway: DirectGateway,
    private governanceConfig: any
  ) {
    // Placeholder for Ilana integration
  }

  async generateResponse(context: string, userId: string): Promise<string> {
    // TODO: Implement governance checks
    // - Policy enforcement
    // - Cost tracking
    // - Audit logging
    // - Content filtering
    
    // For now, pass through to DirectGateway
    return this.directGateway.generateResponse(context, userId)
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const directHealth = await this.directGateway.healthCheck()
    
    return {
      healthy: directHealth.healthy,
      provider: `${directHealth.provider} (via Ilana)`,
      error: directHealth.error
    }
  }
}
/**
 * Simple OpenClawGateway - OpenAI API Only
 * 
 * Simplified version using only the OpenAI API endpoint which we know works perfectly
 */

import { AgentGateway, HealthCheckResult } from './agent-gateway'
import { Logger } from '../core/logger'

export interface OpenClawConfig {
  gatewayUrl?: string
  agentId?: string
  model?: string
  sessionPrefix?: string
  authToken?: string
  timeout?: number
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

export class OpenClawGatewaySimple implements AgentGateway {
  private gatewayUrl: string
  private agentId: string
  private authToken?: string
  private timeout: number

  constructor(
    private config: OpenClawConfig,
    private logger: Logger
  ) {
    this.gatewayUrl = config.gatewayUrl || 'http://localhost:18789'
    this.agentId = config.agentId || 'main'
    this.authToken = config.authToken
    this.timeout = config.timeout || 45000
  }

  async generateResponse(message: string, userId: string): Promise<string> {
    this.logger.info(`Sending message to OpenClaw agent: ${this.agentId} for user: ${userId}`)

    if (!this.authToken) {
      throw new Error('Auth token required for OpenClaw OpenAI API')
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      this.logger.info('Using OpenClaw OpenAI API endpoint')
      
      const response = await fetch(`${this.gatewayUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: `openclaw:${this.agentId}`,
          messages: [{ role: 'user', content: message }],
          user: userId // For session persistence
        }),
        signal: controller.signal
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const data = await response.json() as OpenAIResponse
      
      if (data.choices && data.choices.length > 0) {
        const result = data.choices[0].message.content
        this.logger.info(`OpenClaw response received (${result.length} chars)`)
        return result
      } else {
        throw new Error('Unexpected OpenAI response format')
      }
    } catch (error: any) {
      this.logger.error(`OpenClaw OpenAI API error: ${error.message}`)
      throw new Error(`OpenClaw communication failed: ${error.message}`)
    } finally {
      clearTimeout(timeoutId)
    }
  }

  async healthCheck(): Promise<HealthCheckResult> {
    if (!this.authToken) {
      return {
        healthy: false,
        provider: 'openclaw-simple',
        error: 'No auth token'
      }
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      const response = await fetch(`${this.gatewayUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: `openclaw:${this.agentId}`,
          messages: [{ role: 'user', content: 'health check' }],
          user: 'health-check'
        }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      return {
        healthy: response.ok,
        provider: 'openclaw-openai-api'
      }
      
    } catch (error: any) {
      return {
        healthy: false,
        provider: 'openclaw-openai-api',
        error: error.message
      }
    }
  }
}